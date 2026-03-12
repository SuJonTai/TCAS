"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  User,
  GraduationCap,
  FileText,
  CheckCircle,
  XCircle,
  Award,
  FileCheck,
  CheckCircle2,
  Calculator
} from "lucide-react"

function StatusBadge({ status }) {
  switch (status) {
    case "approved":
      return <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-primary/20 text-primary">ผ่านการคัดเลือก</span>
    case "rejected":
      return <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-destructive/20 text-destructive">ไม่ผ่านการคัดเลือก</span>
    default:
      return <span className="inline-flex items-center rounded-full border border-transparent bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">รอการตรวจสอบ</span>
  }
}

function formatEduStatus(status) {
  if (status === "studying") return "กำลังศึกษา"
  if (status === "graduated") return "สำเร็จการศึกษา"
  return status || "-"
}

function formatEducationType(type) {
  switch (type) {
    case "high-school": return "ม.6"
    case "vocational": return "ปวช."
    case "high-vocational": return "ปวส."
    default: return type || "-"
  }
}

export default function ApplicantDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  
  const [applicant, setApplicant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [currentStatus, setCurrentStatus] = useState("pending")
   const [showResultDialog, setShowResultDialog] = useState(false)
  const [scores, setScores] = useState([])
  const [confirmAction, setConfirmAction] = useState(null)

  useEffect(() => {
    const fetchApplicantData = async () => {
      try {
        const res = await fetch(`/api/applications/${id}`)
        if (!res.ok) throw new Error("Failed to fetch applicant")
        const data = await res.json()
        
        if (data) {
          setApplicant(data)
          setCurrentStatus(data.status || "pending")
          
          if (data.user_id) {
             const { data: scoreData } = await supabase
              .from('USER_SCORES')
              .select(`subject_id, score_value, SUBJECTS ( subject_name )`)
              .eq('user_id', data.user_id)
            if (scoreData) setScores(scoreData)
          }
        }
      } catch (error) {
        console.error("Fetch Error:", error.message)
      } finally {
        setLoading(false)
      }
    }
    fetchApplicantData()
  }, [id])

  const handleUpdateStatus = async (newStatus) => {
    setSaving(true)
    
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || "Failed to update status")
      }
      
      setCurrentStatus(newStatus)
      setShowResultDialog(true)
    } catch (error) {
      alert("เกิดข้อผิดพลาด: " + error.message)
    } finally {
      setSaving(false)
      setConfirmAction(null)
    }
  }

  const scoreCalculation = useMemo(() => {
    if (!applicant) return { details: [], totalScore: 0 }
    
    const criteriaSubjects = applicant.ADMISSION_CRITERIA?.CRITERIA_SUBJECTS || []
    let totalScore = 0
    
    const details = criteriaSubjects.map(reqSub => {
      const userScoreObj = scores.find(s => s.subject_id === reqSub.subject_id)
      const rawScore = userScoreObj ? Number(userScoreObj.score_value) : 0
      
      const weight = Number(reqSub.weight || 0)
      const weightedScore = (rawScore * weight) / 100
      
      totalScore += weightedScore

      return {
        subjectId: reqSub.subject_id,
        subjectName: reqSub.SUBJECTS?.subject_name || "ไม่ทราบชื่อวิชา",
        rawScore,
        weight,
        weightedScore
      }
    })

    return { details, totalScore }
  }, [applicant, scores])

  if (loading) return <div className="p-12 text-center text-muted-foreground italic font-poppins">กำลังโหลดข้อมูลผู้สมัคร...</div>
  if (!applicant) return <div className="p-12 text-center text-destructive font-poppins">ไม่พบข้อมูลผู้สมัครนี้</div>

  const user = applicant.USERS || {}
  const appInfo = applicant.APPLICANT_INFO || {}
  const criteria = applicant.ADMISSION_CRITERIA || {}
  
  const studyPlanName = appInfo.study_plan || "-"
  const studyPlanType = "-" // Will need to define or extract this similarly if needed
  
  const program = criteria.PROGRAM || {}
  const faculty = criteria.FACULTY || {}
  const project = criteria.PROJECTS || {}

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8 font-poppins min-h-screen">
      <Link href="/staff/results" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="h-4 w-4" /> กลับหน้ารายชื่อ
      </Link>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 shadow-inner">
             <User className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {user.first_name} {user.last_name}
            </h1>
            <p className="text-muted-foreground text-sm">รหัสบัตรประชาชน: {user.citizen_id || "-"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-card p-2 px-4 rounded-xl shadow-sm border border-border">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">สถานะ:</span>
          <StatusBadge status={currentStatus} />
        </div>
      </div>

       <div className="grid gap-6 md:grid-cols-2">
         {/* Academic Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-foreground border-b border-border pb-3">
             <GraduationCap className="h-5 w-5 text-primary" />
            <h2 className="font-bold">ข้อมูลการศึกษา</h2>
          </div>
          <dl className="space-y-4 text-sm">
             <div className="flex justify-between border-b border-border/50 pb-2">
              <dt className="text-muted-foreground">สถานศึกษาเดิม</dt>
              <dd className="font-semibold text-foreground">{user.high_school || "-"}</dd>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-2">
              <dt className="text-muted-foreground">ระดับชั้น/วุฒิการศึกษา</dt>
              <dd className="font-semibold text-foreground">{user.current_level || "-"}</dd>
             </div>
            <div className="flex justify-between border-b border-border/50 pb-2">
              <dt className="text-muted-foreground">สถานะการศึกษา</dt>
              <dd className="font-semibold text-foreground">{formatEduStatus(user.edu_status)}</dd>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-2">
              <dt className="text-muted-foreground">ประเภทการศึกษา</dt>
              <dd className="font-semibold text-foreground">{formatEducationType(studyPlanType)}</dd>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-2">
              <dt className="text-muted-foreground">แผนการเรียน</dt>
               <dd className="font-semibold text-foreground">{studyPlanName}</dd>
            </div>
             <div className="flex justify-between">
              <dt className="text-muted-foreground">GPAX (5 เทอม)</dt>
              <dd className="font-bold text-primary text-lg">{applicant.gpax ? applicant.gpax.toFixed(2) : "-"}</dd>
            </div>
          </dl>
        </div>

        {/* Application Details Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-foreground border-b border-border pb-3">
             <FileText className="h-5 w-5 text-primary" />
            <h2 className="font-bold">ข้อมูลการสมัคร</h2>
          </div>
           <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground text-xs uppercase tracking-tighter">คณะที่เลือก</dt>
               <dd className="font-semibold text-foreground">{faculty.faculty_name || "-"}</dd>
             </div>
            <div>
               <dt className="text-muted-foreground text-xs uppercase tracking-tighter">สาขาวิชา</dt>
               <dd className="font-semibold text-foreground">{program.prog_name || "-"}</dd>
            </div>
            <div>
               <dt className="text-muted-foreground text-xs uppercase tracking-tighter">โครงการ</dt>
               <dd className="font-semibold text-foreground">{project.project_name || "-"}</dd>
            </div>
            <div className="pt-2">
              <span className="bg-primary/5 text-primary border border-primary/20 px-3 py-1 rounded-full text-xs font-bold">
                TCAS รอบที่ {criteria.tcas_round || "-"}
              </span>
            </div>
           </dl>
        </div>
      </div>

       <div className="mt-6 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-6 p-6 pb-0">
          <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            การประมวลผลคะแนนคัดเลือก
          </h3>
          <div className="bg-primary/10 px-4 py-2 rounded-xl text-right">
             <p className="text-[10px] font-bold text-primary uppercase tracking-wider">คะแนนรวมสุทธิ</p>
            <p className="text-2xl font-black text-primary leading-none">{scoreCalculation.totalScore.toFixed(2)}</p>
          </div>
         </div>

        {scoreCalculation.details.length > 0 ? (
          <div className="overflow-x-auto p-6 pt-0">
             <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                   <th className="p-3 font-semibold text-muted-foreground">วิชาที่ใช้คัดเลือก</th>
                  <th className="p-3 font-semibold text-muted-foreground text-center">คะแนนดิบที่ได้</th>
                   <th className="p-3 font-semibold text-muted-foreground text-center">ค่าน้ำหนัก (%)</th>
                  <th className="p-3 font-semibold text-foreground text-right">คะแนนที่คำนวณได้</th>
                </tr>
              </thead>
              <tbody>
                {scoreCalculation.details.map((subject) => (
                   <tr key={subject.subjectId} className="border-b border-border hover:bg-muted/50 transition-colors">
                     <td className="p-3 font-medium text-foreground">{subject.subjectName}</td>
                     <td className="p-3 text-center">
                      <span className="bg-muted text-foreground px-2 py-1 rounded-md font-semibold">
                         {subject.rawScore.toFixed(2)}
                       </span>
                    </td>
                    <td className="p-3 text-center text-muted-foreground">{subject.weight}%</td>
                    <td className="p-3 text-right font-bold text-foreground">{subject.weightedScore.toFixed(2)}</td>
                  </tr>
                 ))}
               </tbody>
            </table>
           </div>
        ) : (
          <div className="text-center p-8 m-6 mt-0 text-sm text-muted-foreground bg-muted/50 rounded-xl border border-dashed border-border">
            ไม่มีการกำหนดเกณฑ์รายวิชาในโครงการนี้
           </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 font-bold text-lg text-foreground flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-primary" />
          ไฟล์แนบประกอบการพิจารณา
         </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
           {applicant.portfolio_url ? (
            <a href={applicant.portfolio_url} target="_blank" rel="noreferrer" className="flex items-center p-4 rounded-xl border border-border bg-muted/30 hover:bg-primary/5 hover:border-primary/20 transition-all group">
               <div className="bg-primary/10 p-2 rounded-lg mr-4 group-hover:scale-110 transition-transform">
                <FileText className="h-6 w-6 text-primary" />
              </div>
               <div>
                <p className="text-sm font-bold text-foreground">Portfolio</p>
                <p className="text-[10px] text-muted-foreground">คลิกเพื่อดูเอกสาร PDF</p>
              </div>
            </a>
          ) : <div className="p-4 border border-dashed border-border rounded-xl text-xs text-muted-foreground text-center">ไม่มีไฟล์ Portfolio</div>}

          {applicant.transcript_url ? (
            <a href={applicant.transcript_url} target="_blank" rel="noreferrer" className="flex items-center p-4 rounded-xl border border-border bg-muted/30 hover:bg-primary/5 hover:border-primary/20 transition-all group">
               <div className="bg-primary/10 p-2 rounded-lg mr-4 group-hover:scale-110 transition-transform">
                <FileCheck className="h-6 w-6 text-primary" />
               </div>
              <div>
                <p className="text-sm font-bold text-foreground">Transcript (ปพ.1)</p>
                <p className="text-[10px] text-muted-foreground">คลิกเพื่อดูใบเกรด</p>
              </div>
            </a>
           ) : <div className="p-4 border border-dashed border-border rounded-xl text-xs text-muted-foreground text-center">ไม่มีไฟล์ Transcript</div>}
         </div>
      </div>

       <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between shadow-sm">
        <div className="text-sm">
            <p className="font-bold text-foreground">การตัดสินผลการสมัคร</p>
            <p className="text-muted-foreground text-xs">ข้อมูลจะถูกส่งไปยังระบบประกาศผลทันทีที่บันทึก</p>
        </div>
        <div className="flex gap-3">
            <button
               onClick={() => setConfirmAction(currentStatus === "rejected" ? "pending" : "rejected")}
              disabled={saving}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold border transition-all ${currentStatus === "rejected" ? "bg-background text-foreground hover:bg-muted" : "bg-background text-destructive border-destructive/20 hover:bg-destructive/10"}`}
             >
               {currentStatus === "rejected" ? "ยกเลิกผลการคัดออก" : "ไม่ผ่านการคัดเลือก"}
            </button>
             <button
              onClick={() => setConfirmAction(currentStatus === "approved" ? "pending" : "approved")}
              disabled={saving}
               className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold text-primary-foreground transition-all shadow-lg ${currentStatus === "approved" ? "bg-muted-foreground" : "bg-primary hover:bg-primary/90"}`}
            >
              {currentStatus === "approved" ? "ยกเลิกผลการคัดเลือก" : "ผ่านการคัดเลือก"}
            </button>
        </div>
       </div>

       {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-border transform animate-in zoom-in-95 duration-200">
            <div className={`w-14 h-14 rounded-2xl mb-4 flex items-center justify-center ${confirmAction === 'approved' ? 'bg-primary/20 text-primary' : confirmAction === 'rejected' ? 'bg-destructive/20 text-destructive' : 'bg-muted text-foreground'}`}>
                 {confirmAction === 'approved' ? <CheckCircle className="w-8 h-8" /> : confirmAction === 'rejected' ? <XCircle className="w-8 h-8" /> : <User className="w-8 h-8" />}
             </div>
             <h2 className="text-xl font-black text-foreground mb-2">ยืนยันการดำเนินการ?</h2>
             <p className="text-sm text-muted-foreground mb-8 leading-relaxed">คุณกำลังเปลี่ยนสถานะของผู้สมัครรายนี้เป็น <span className="font-bold underline italic text-foreground">{{'approved':'ผ่านการคัดเลือก', 'rejected':'ไม่ผ่านการคัดเลือก', 'pending':'รอการตรวจสอบ'}[confirmAction]}</span></p>
            <div className="flex gap-3">
               <button onClick={() => setConfirmAction(null)} className="flex-1 py-3 border border-border rounded-2xl font-bold text-muted-foreground hover:bg-muted transition-colors">ยกเลิก</button>
               <button onClick={() => handleUpdateStatus(confirmAction)} className={`flex-1 py-3 text-primary-foreground rounded-2xl font-bold transition-transform active:scale-95 ${confirmAction === 'approved' ? 'bg-primary' : confirmAction === 'rejected' ? 'bg-destructive' : 'bg-muted-foreground'}`}>
                {saving ? "กำลังบันทึก..." : "ยืนยันข้อมูล"}
              </button>
             </div>
          </div>
         </div>
      )}

      {showResultDialog && (
         <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
           <div className="bg-card rounded-[2rem] p-10 max-w-xs w-full shadow-2xl border border-border text-center transform animate-in zoom-in-90 slide-in-from-bottom-10 duration-500">
            <div className="relative mx-auto w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6">
                <div className="absolute inset-0 rounded-full bg-primary/40 animate-ping opacity-20"></div>
                 <CheckCircle2 className="w-10 h-10 text-primary relative z-10" />
            </div>
            <h3 className="text-2xl font-black text-foreground mb-2">บันทึกสำเร็จ</h3>
            <p className="text-sm text-muted-foreground mb-8 font-medium">ระบบได้ทำการปรับปรุงสถานะของผู้สมัครเรียบร้อยแล้ว</p>
             <button 
              onClick={() => {
                setShowResultDialog(false);
                 router.push("/staff/results");
              }} 
              className="w-full py-4 bg-foreground text-background rounded-2xl font-bold hover:opacity-90 transition-all"
             >
               ตกลง และกลับหน้ารวม
            </button>
          </div>
        </div>
       )}
    </div>
  )
}
