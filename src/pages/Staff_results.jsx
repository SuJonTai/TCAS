import { useState, useEffect, useMemo } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { ArrowLeft, Filter, FileDown, Users, Loader2, CheckCircle2, XCircle, Trash2 } from "lucide-react"
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
  const [rawData, setRawData] = useState([]) // เก็บข้อมูลดิบทั้งหมดจาก DB
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  
  const [qualFilter, setQualFilter] = useState("all") // "all", "pass", "fail"
  
  const roundFilter = searchParams.get("round")
  const facultyFilter = searchParams.get("faculty_id")
  const programFilter = searchParams.get("program_id")

  const fetchApplicants = async () => {
    setLoading(true)

    // ดึงข้อมูล (หากตาราง CRITERIA_SUBJECTS มี column weight ให้เพิ่ม weight ลงไปใน Select ด้วย)
    let query = supabase.from('APPLICATION').select(`
      id,
      status,
      gpax,
      USERS ( 
        first_name, 
        last_name, 
        edu_status, 
        current_level,
        plan_id,
        STUDY_PLANS ( plan_name, plan_group ),
        USER_SCORES ( subject_id, score_value )
      ),
      ADMISSION_CRITERIA!inner (
        tcas_round,
        program_id,
        min_gpax,
        edu_status_req,
        min_level,
        max_level,
        CRITERIA_SUBJECTS ( subject_id, min_score, SUBJECTS ( subject_name ) ),
        PROGRAMS!inner (
          prog_name,
          DEPARTMENTS!inner (
            faculty_id,
            FACULTIES ( faculty_name )
          )
        )
      )
    `)

    if (roundFilter) query = query.eq('ADMISSION_CRITERIA.tcas_round', parseInt(roundFilter, 10))
    if (programFilter) query = query.eq('ADMISSION_CRITERIA.program_id', parseInt(programFilter, 10))
    if (facultyFilter) query = query.eq('ADMISSION_CRITERIA.PROGRAMS.DEPARTMENTS.faculty_id', parseInt(facultyFilter, 10))

    const { data, error } = await query

    if (!error && data) {
      let formattedData = data.map(app => {
        const criteria = app.ADMISSION_CRITERIA || {}
        const user = app.USERS || {}
        const userScores = user.USER_SCORES || []
        const requiredSubjects = criteria.CRITERIA_SUBJECTS || []
        
        const failReasons = []

        // 1. ตรวจสอบ GPAX
        const passGpax = (app.gpax || 0) >= (criteria.min_gpax || 0)
        if (!passGpax) failReasons.push("GPAX ไม่ถึงเกณฑ์")
        
        // 2. ตรวจสอบสถานะ วุฒิ และ "แผนการเรียน"
        let rawReqs = criteria.edu_status_req;
        let reqs = [];
        if (Array.isArray(rawReqs)) {
          reqs = rawReqs; 
        } else if (typeof rawReqs === 'string') {
          try { reqs = JSON.parse(rawReqs); } 
          catch (e) { reqs = rawReqs.split(',').map(item => item.trim()); }
        }
        if (!Array.isArray(reqs)) reqs = rawReqs ? [rawReqs] : [];

        const validStatuses = ["studying", "graduated"];
        const validTypes = ["high-school", "vocational", "high-vocational"];

        const requiredStatuses = reqs.filter(r => validStatuses.includes(r));
        const requiredTypes = reqs.filter(r => validTypes.includes(r));
        
        let rawUserEdu = user.edu_status;
        let userEduData = [];
        if (Array.isArray(rawUserEdu)) {
          userEduData = rawUserEdu;
        } else if (typeof rawUserEdu === 'string') {
          try { userEduData = JSON.parse(rawUserEdu); } 
          catch (e) { userEduData = rawUserEdu.split(',').map(item => item.trim()); }
        }
        if (!Array.isArray(userEduData)) userEduData = rawUserEdu ? [rawUserEdu] : [];

        const planName = user.STUDY_PLANS?.plan_name || "";
        const dbPlanGroup = user.STUDY_PLANS?.plan_group || ""; 
        let inferredPlanGroup = "";

        if (planName.includes("ปวช") || planName.includes("เตรียมวิศว")) {
          inferredPlanGroup = "vocational";
        } else if (planName.includes("ปวส")) {
          inferredPlanGroup = "high-vocational";
        } else if (planName) {
          inferredPlanGroup = "high-school"; 
        }

        const passEduStatus = requiredStatuses.length === 0 || requiredStatuses.some(status => userEduData.includes(status));
        const passEduType = requiredTypes.length === 0 || 
                            requiredTypes.includes(dbPlanGroup) || 
                            requiredTypes.includes(inferredPlanGroup);

        if (!passEduStatus) failReasons.push("สถานะการศึกษาไม่ตรงเกณฑ์");
        if (!passEduType) failReasons.push(`วุฒิการศึกษาไม่ตรงเกณฑ์`);

        // 3. ตรวจสอบระดับชั้น
        const userLevel = user.current_level || 0
        const minLevel = criteria.min_level || 0
        const maxLevel = criteria.max_level || 99
        const passLevel = userLevel >= minLevel && userLevel <= maxLevel
        if (!passLevel) failReasons.push("ระดับชั้นไม่ตรงเกณฑ์")

        // 4. ตรวจสอบคะแนน TCAS และ คำนวณคะแนนรวม
        let passScores = true
        let totalScore = 0 // ตัวแปรเก็บคะแนนรวม
        
        requiredSubjects.forEach(reqSub => {
          const userSubScore = userScores.find(s => s.subject_id === reqSub.subject_id)
          
          if (!userSubScore || userSubScore.score_value == null) {
            passScores = false
            failReasons.push(`ไม่ได้กรอกคะแนน ${reqSub.SUBJECTS?.subject_name || 'วิชา'}`)
          } else {
            const scoreValue = parseFloat(userSubScore.score_value) || 0;
            
            // ตรวจสอบขั้นต่ำ
            if (scoreValue < reqSub.min_score) {
              passScores = false
              failReasons.push(`คะแนน ${reqSub.SUBJECTS?.subject_name || 'วิชา'} ไม่ถึงขั้นต่ำ (${reqSub.min_score})`)
            }
            
            // 🚨 คำนวณคะแนนรวม 🚨 
            // หาก Apply_detail.jsx มีการคูณค่าน้ำหนัก (weight) ให้แก้ไขบรรทัดล่างนี้ 
            // เช่น: const weight = reqSub.weight || 100; totalScore += scoreValue * (weight / 100);
            totalScore += scoreValue; 
          }
        })

        const passAll = passGpax && passEduStatus && passEduType && passLevel && passScores

        return {
          id: app.id,
          name: `${user.first_name || 'ไม่ระบุ'} ${user.last_name || ''}`,
          faculty: criteria.PROGRAMS?.DEPARTMENTS?.FACULTIES?.faculty_name || 'ไม่ระบุ',
          major: criteria.PROGRAMS?.prog_name || 'ไม่ระบุ',
          round: criteria.tcas_round || '-',
          gpa: app.gpax || 0.00,
          minGpa: criteria.min_gpax || 0.00,
          totalScore: totalScore, // ส่งคะแนนรวมออกไปเพื่อนำไป sort
          passAll,
          failReasons,
          status: app.status
        }
      })

      setRawData(formattedData)
    } else {
      console.error("Error fetching applications:", error)
    }
    
    setLoading(false)
  }

  useEffect(() => {
    fetchApplicants()
  }, [roundFilter, facultyFilter, programFilter])

  // --- กรองและจัดเรียงข้อมูลบน Client-side ---
  const applicants = useMemo(() => {
    let result = rawData
    
    // กรองตามคุณสมบัติ
    if (qualFilter === "pass") result = rawData.filter(a => a.passAll)
    if (qualFilter === "fail") result = rawData.filter(a => !a.passAll)
    
    // เรียงลำดับ (Sorting)
    return result.sort((a, b) => {
      // 1. เรียงตามคะแนนรวม (มากไปน้อย)
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore
      }
      // 2. ถ้าคะแนนรวมเท่ากัน เรียงตาม GPAX (มากไปน้อย)
      return b.gpa - a.gpa
    })
  }, [rawData, qualFilter])

  const handleDeleteApplication = async (id, name) => {
    const isConfirmed = window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบใบสมัครของ "${name}"?\nการดำเนินการนี้ไม่สามารถย้อนกลับได้`)
    if (isConfirmed) {
      try {
        const { error } = await supabase.from('APPLICATION').delete().eq('id', id)
        if (error) throw error
        alert("ลบข้อมูลใบสมัครเรียบร้อยแล้ว")
        fetchApplicants()
      } catch (err) {
        console.error("Error deleting application:", err)
        alert("เกิดข้อผิดพลาดในการลบข้อมูล: " + err.message)
      }
    }
  }

  const exportToPDF = async () => {
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
          filter: (node) => !(node.tagName === 'LINK' && node.href?.includes('fonts.googleapis.com')) && !node.classList?.contains('no-export')
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
                <th className="h-12 px-4 align-middle font-medium text-center">คะแนนรวม</th>
                <th className="h-12 px-4 align-middle font-medium text-center">การประเมินคุณสมบัติ</th>
                <th className="h-12 px-4 align-middle font-medium text-center">สถานะ</th>
                <th className="h-12 px-4 align-middle font-medium text-center no-export">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-muted-foreground">กำลังโหลดข้อมูล...</td>
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
                    <td className="p-4 align-middle text-center font-semibold text-primary">
                      {a.totalScore > 0 ? a.totalScore.toFixed(2) : '-'}
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
                    <td className="p-4 align-middle text-center no-export">
                      <button 
                        onClick={() => handleDeleteApplication(a.id, a.name)}
                        className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="ลบใบสมัคร"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="p-8 align-middle text-center text-muted-foreground">
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