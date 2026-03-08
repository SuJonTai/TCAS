import { useState, useEffect } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { ArrowLeft, Filter, FileDown, Users, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { jsPDF } from "jspdf"
import { toPng } from "html-to-image"

// --- Helper Component: Dynamic Status Badge ---
function StatusBadge({ status }) {
  switch (status) {
    case "approved":
      return <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors bg-emerald-100 text-emerald-700 hover:bg-emerald-100">ผ่านการคัดเลือก</span>
    case "rejected":
      return <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors bg-red-100 text-red-700 hover:bg-red-100">ไม่ผ่านการคัดเลือก</span>
    default:
      return <span className="inline-flex items-center rounded-full border border-transparent bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80">รอการตรวจสอบ</span>
  }
}

// --- Main Component: Applicant Results Table ---
export default function ApplicantListTable() {
  const [searchParams] = useSearchParams()
  const [applicants, setApplicants] = useState([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  
  // UPDATED: Comprehensive Qualifications Filter
  const [qualFilter, setQualFilter] = useState("all") // "all", "pass", "fail"
  
  const roundFilter = searchParams.get("round")
  const facultyFilter = searchParams.get("faculty_id")
  const programFilter = searchParams.get("program_id")

  useEffect(() => {
    const fetchApplicants = async () => {
      setLoading(true)

      // UPDATED: Added edu_status_req, min_level, max_level, and user's current level/status
      let query = supabase.from('APPLICATION').select(`
        id,
        status,
        gpax,
        USERS ( first_name, last_name, edu_status, current_level ),
        ADMISSION_CRITERIA!inner (
          tcas_round,
          program_id,
          min_gpax,
          edu_status_req,
          min_level,
          max_level,
          PROGRAMS!inner (
            prog_name,
            DEPARTMENTS!inner (
              faculty_id,
              FACULTIES ( faculty_name )
            )
          )
        )
      `)

      if (roundFilter) query = query.eq('ADMISSION_CRITERIA.tcas_round', parseInt(roundFilter))
      if (programFilter) query = query.eq('ADMISSION_CRITERIA.program_id', parseInt(programFilter))
      if (facultyFilter) query = query.eq('ADMISSION_CRITERIA.PROGRAMS.DEPARTMENTS.faculty_id', parseInt(facultyFilter))

      const { data, error } = await query

      if (!error && data) {
        let formattedData = data.map(app => {
          const criteria = app.ADMISSION_CRITERIA || {}
          const user = app.USERS || {}
          
          // Qualification Checks
          const passGpax = (app.gpax || 0) >= (criteria.min_gpax || 0)
          
          // Check education status (Assuming 'all' means both studying and graduated are accepted)
          // Adjust this logic depending on how you save your exact enum values!
          const passStatus = !criteria.edu_status_req || 
                             criteria.edu_status_req === 'all' || 
                             user.edu_status === criteria.edu_status_req

          // Check level boundaries
          const userLevel = user.current_level || 0
          const minLevel = criteria.min_level || 0
          const maxLevel = criteria.max_level || 99
          const passLevel = userLevel >= minLevel && userLevel <= maxLevel

          const passAll = passGpax && passStatus && passLevel

          // Create an array of fail reasons for the UI
          const failReasons = []
          if (!passGpax) failReasons.push("GPAX ไม่ถึงเกณฑ์")
          if (!passStatus) failReasons.push("สถานะการศึกษาไม่ตรง")
          if (!passLevel) failReasons.push("ระดับชั้นไม่ตรงเกณฑ์")

          return {
            id: app.id,
            name: `${user.first_name || 'ไม่ระบุ'} ${user.last_name || ''}`,
            faculty: criteria.PROGRAMS?.DEPARTMENTS?.FACULTIES?.faculty_name || 'ไม่ระบุ',
            major: criteria.PROGRAMS?.prog_name || 'ไม่ระบุ',
            round: criteria.tcas_round || '-',
            gpa: app.gpax || 0.00,
            minGpa: criteria.min_gpax || 0.00,
            passAll,
            failReasons,
            status: app.status
          }
        })

        // Filter based on the comprehensive qualification state
        if (qualFilter === "pass") {
          formattedData = formattedData.filter(a => a.passAll)
        } else if (qualFilter === "fail") {
          formattedData = formattedData.filter(a => !a.passAll)
        }

        setApplicants(formattedData)
      } else {
        console.error("Error fetching applications:", error)
      }
      
      setLoading(false)
    }

    fetchApplicants()
  }, [roundFilter, facultyFilter, programFilter, qualFilter])

  const exportToPDF = async () => {
    // ... [PDF export logic remains exactly the same as previous] ...
    setExporting(true)
    const element = document.getElementById('pdf-content') 
    
    if (element) {
      try {
        const originalStyle = element.style.overflow
        element.style.overflow = 'visible'

        const dataUrl = await toPng(element, { 
          quality: 1,
          pixelRatio: 3, 
          backgroundColor: '#ffffff',
          filter: (node) => !(node.tagName === 'LINK' && node.href?.includes('fonts.googleapis.com'))
        })
        
        element.style.overflow = originalStyle

        const pdf = new jsPDF('l', 'mm', 'a4') 
        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()

        const margin = 15; 
        const availableWidth = pageWidth - (margin * 2)
        
        const imgProps = pdf.getImageProperties(dataUrl)
        const displayWidth = availableWidth; 
        const displayHeight = (imgProps.height * displayWidth) / imgProps.width

        pdf.addImage(dataUrl, 'PNG', margin, 20, displayWidth, displayHeight)
        pdf.setFontSize(10)
        pdf.text(`รายงานรายชื่อผู้สมัคร - วันที่ออกเอกสาร: ${new Date().toLocaleDateString('th-TH')}`, margin, pageHeight - 10)
        pdf.save(`applicant_list_${new Date().getTime()}.pdf`)
      } catch (err) {
        console.error("PDF Error:", err)
        alert("เกิดข้อผิดพลาดในการสร้าง PDF")
      }
    }
    setExporting(false)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <Link
            to="/staff"
            className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับไปหน้าค้นหา
          </Link>
          <h1 className="font-[family-name:var(--font-poppins)] text-2xl font-bold tracking-tight text-foreground">
            รายชื่อผู้สมัคร
          </h1>
          <p className="text-sm text-muted-foreground">
            พบผู้สมัครทั้งหมด <span className="font-semibold text-foreground">{applicants.length}</span> คน
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium text-muted-foreground shadow-sm">
            <Filter className="mr-2 h-4 w-4" />
            ตัวกรองที่เลือก: {roundFilter ? `รอบ ${roundFilter}` : "ทุกรอบ"}
          </div>

          <select
            value={qualFilter}
            onChange={(e) => setQualFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm font-medium text-muted-foreground shadow-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          >
            <option value="all">คุณสมบัติ: ทั้งหมด</option>
            <option value="pass">ผ่านเกณฑ์ทั้งหมด</option>
            <option value="fail">ไม่ผ่านเกณฑ์</option>
          </select>
          
          <button 
            onClick={exportToPDF}
            disabled={exporting || loading || applicants.length === 0}
            className="inline-flex h-9 items-center justify-center rounded-md bg-secondary px-3 text-sm font-medium text-secondary-foreground shadow-sm hover:bg-secondary/80 disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            {exporting ? "กำลังสร้าง PDF..." : "ส่งออก (PDF)"}
          </button>
        </div>
      </div>

      <div id="pdf-content" className="rounded-xl border border-border bg-card shadow-sm bg-white p-4">
        <div className="mb-4 text-center font-bold text-lg hidden print:block">
          รายชื่อผู้สมัคร TCAS - มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/50 text-muted-foreground">
              <tr>
                <th className="h-12 px-4 align-middle font-medium">ลำดับ</th>
                <th className="h-12 px-4 align-middle font-medium">ชื่อ-นามสกุล</th>
                <th className="h-12 px-4 align-middle font-medium">สาขาวิชา</th>
                <th className="h-12 px-4 align-middle font-medium text-center">รอบที่</th>
                <th className="h-12 px-4 align-middle font-medium text-center">GPAX (เกณฑ์)</th>
                <th className="h-12 px-4 align-middle font-medium text-center">การประเมินคุณสมบัติ</th>
                <th className="h-12 px-4 align-middle font-medium text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-muted-foreground">กำลังโหลดข้อมูล...</td>
                </tr>
              ) : applicants.length > 0 ? (
                applicants.map((a, i) => (
                  <tr key={a.id} className="border-b transition-colors hover:bg-muted/30">
                    <td className="p-4 align-middle text-muted-foreground">{i + 1}</td>
                    <td className="p-4 align-middle">
                      <Link
                        to={`/staff/applicant/${a.id}`}
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {a.name}
                      </Link>
                    </td>
                    <td className="p-4 align-middle">
                      <p className="text-sm font-medium text-foreground">{a.major}</p>
                      <p className="text-xs text-muted-foreground">{a.faculty}</p>
                    </td>
                    <td className="p-4 align-middle text-center text-sm">{a.round}</td>
                    <td className="p-4 align-middle text-center text-sm">
                      <span className={`font-medium ${a.gpa < a.minGpa ? 'text-red-500' : 'text-emerald-600'}`}>
                        {a.gpa.toFixed(2)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">({a.minGpa.toFixed(2)})</span>
                    </td>
                    <td className="p-4 align-middle text-center">
                      {a.passAll ? (
                        <div className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-medium">
                          <CheckCircle2 size={14} /> ผ่านทุกเกณฑ์
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <div className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-md text-xs font-medium">
                            <XCircle size={14} /> ไม่ผ่านเกณฑ์
                          </div>
                          <span className="text-[10px] text-muted-foreground max-w-[120px] text-center leading-tight">
                            {a.failReasons.join(", ")}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 align-middle text-center"><StatusBadge status={a.status} /></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="p-8 align-middle text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-8 w-8 text-muted-foreground/50" />
                      <p>ไม่พบผู้สมัครที่ตรงกับเงื่อนไขการค้นหา</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}