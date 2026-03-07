import { useState, useEffect } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { ArrowLeft, Filter, FileDown, Users, Loader2 } from "lucide-react"
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
  const [exporting, setExporting] = useState(false) // State for PDF export
  
  // Extract search parameters from URL
  const roundFilter = searchParams.get("round")
  const facultyFilter = searchParams.get("faculty_id")
  const programFilter = searchParams.get("program_id")

  useEffect(() => {
    const fetchApplicants = async () => {
      setLoading(true)

      let query = supabase.from('APPLICATION').select(`
        id,
        status,
        gpax,
        USERS ( first_name, last_name ),
        ADMISSION_CRITERIA!inner (
          tcas_round,
          program_id,
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
        const formattedData = data.map(app => ({
          id: app.id,
          name: `${app.USERS?.first_name || 'ไม่ระบุ'} ${app.USERS?.last_name || ''}`,
          faculty: app.ADMISSION_CRITERIA?.PROGRAMS?.DEPARTMENTS?.FACULTIES?.faculty_name || 'ไม่ระบุ',
          major: app.ADMISSION_CRITERIA?.PROGRAMS?.prog_name || 'ไม่ระบุ',
          round: app.ADMISSION_CRITERIA?.tcas_round || '-',
          gpa: app.gpax || 0.00,
          status: app.status
        }))
        setApplicants(formattedData)
      } else {
        console.error("Error fetching applications:", error)
      }
      
      setLoading(false)
    }

    fetchApplicants()
  }, [roundFilter, facultyFilter, programFilter])

  const exportToPDF = async () => {
    setExporting(true)
    const element = document.getElementById('pdf-content') 
    
    if (element) {
      try {
        // 1. Prepare element for capture (Fix width/scroll issues)
        const originalStyle = element.style.overflow
        element.style.overflow = 'visible'

        const dataUrl = await toPng(element, { 
          quality: 1,
          pixelRatio: 3, 
          backgroundColor: '#ffffff',
          filter: (node) => !(node.tagName === 'LINK' && node.href?.includes('fonts.googleapis.com'))
        })
        
        element.style.overflow = originalStyle

        // 2. Setup PDF (A4 Landscape)
        const pdf = new jsPDF('l', 'mm', 'a4') 
        const pageWidth = pdf.internal.pageSize.getWidth()
        const pageHeight = pdf.internal.pageSize.getHeight()

        // 3. ADJUST SIZE HERE
        const margin = 15; // 15mm margin on sides
        const availableWidth = pageWidth - (margin * 2)
        
        const imgProps = pdf.getImageProperties(dataUrl)
        const displayWidth = availableWidth; 
        const displayHeight = (imgProps.height * displayWidth) / imgProps.width

        // 4. Center horizontally and vertically (optional)
        const xPos = margin;
        const yPos = 20; // 20mm from top to leave room for a header/title

        // 5. Add to PDF
        pdf.addImage(dataUrl, 'PNG', xPos, yPos, displayWidth, displayHeight)
        
        // Optional: Add a footer or page number
        pdf.setFontSize(10)
        pdf.text(`รายงานรายชื่อผู้สมัคร - วันที่ออกเอกสาร: ${new Date().toLocaleDateString('th-TH')}`, margin, pageHeight - 10)

        pdf.save(`applicant_list_${new Date().getTime()}.pdf`)
      } catch (err) {
        console.error("PDF Error:", err)
        alert("เกิดข้อผิดพลาดในการปรับขนาดรูปภาพ PDF")
      }
    }
    setExporting(false)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
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
        
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium text-muted-foreground shadow-sm">
            <Filter className="mr-2 h-4 w-4" />
            ตัวกรองที่เลือก: {roundFilter ? `รอบ ${roundFilter}` : "ทุกรอบ"}
          </div>
          
          {/* UPDATED: Export to PDF Button */}
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

      {/* WRAPPER FOR PDF EXPORT - We added id="pdf-content" here */}
      <div id="pdf-content" className="rounded-xl border border-border bg-card shadow-sm bg-white p-4">
        {/* Added a hidden title that only looks good when exported to PDF */}
        <div className="mb-4 text-center font-bold text-lg hidden print:block">
          รายชื่อผู้สมัคร TCAS - มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/50 text-muted-foreground">
              <tr>
                <th className="h-12 px-4 align-middle font-medium">ลำดับ</th>
                <th className="h-12 px-4 align-middle font-medium">ชื่อ-นามสกุล</th>
                <th className="h-12 px-4 align-middle font-medium">คณะ</th>
                <th className="h-12 px-4 align-middle font-medium">สาขาวิชา</th>
                <th className="h-12 px-4 align-middle font-medium text-center">รอบที่</th>
                <th className="h-12 px-4 align-middle font-medium text-center">GPAX</th>
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
                    <td className="p-4 align-middle text-sm text-muted-foreground">{a.faculty}</td>
                    <td className="p-4 align-middle text-sm text-muted-foreground">{a.major}</td>
                    <td className="p-4 align-middle text-center text-sm">{a.round}</td>
                    <td className="p-4 align-middle text-center text-sm font-medium">{a.gpa.toFixed(2)}</td>
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