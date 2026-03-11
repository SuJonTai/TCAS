import React, { useState, useEffect, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom"
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

// 👈 นำเข้า Context และ API Fetch
import { useDatabase } from "@/context/DatabaseContext"
import { apiFetch } from "@/services/apiService"

// --- Helper Component: Dynamic Status Badge ---
function StatusBadge({ status }) {
  switch (status) {
    case "approved":
      return <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700">ผ่านการคัดเลือก</span>
    case "rejected":
      return <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-red-100 text-red-700">ไม่ผ่านการคัดเลือก</span>
    default:
      return <span className="inline-flex items-center rounded-full border border-transparent bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">รอการตรวจสอบ</span>
  }
}

// --- Helper Function: Format Education Status ---
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
  const navigate = useNavigate()
  const { dbType } = useDatabase() // 👈 ดึงประเภท Database
  
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
        setLoading(true)
        // 👈 เรียก API เพื่อดึงข้อมูลรายละเอียดและคะแนนรวบยอดจาก Backend
        const data = await apiFetch(`/api/staff/applicants/${id}`, dbType)
        
        if (data && data.applicant) {
          setApplicant(data.applicant)
          setCurrentStatus(data.applicant.status || "pending")
          setScores(data.scores || [])
        }
      } catch (error) {
        console.error("Fetch Error:", error.message)
      } finally {
        setLoading(false)
      }
    }
    fetchApplicantData()
  }, [id, dbType])

  const handleUpdateStatus = async (newStatus) => {
    setSaving(true)
    try {
      // 👈 เรียก API เพื่ออัปเดตสถานะ
      await apiFetch(`/api/staff/applicants/${id}/status`, dbType, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus })
      })

      setCurrentStatus(newStatus)
      setShowResultDialog(true)
    } catch (error) {
      alert("เกิดข้อผิดพลาด: " + error.message)
    } finally {
      setSaving(false)
      setConfirmAction(null)
    }
  }

  // --- Score Calculation Logic ---
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
  if (!applicant) return <div className="p-12 text-center text-red-500 font-poppins">ไม่พบข้อมูลผู้สมัครนี้</div>

  const user = applicant.USERS || {}
  const studyPlanName = user.STUDY_PLANS?.plan_name || "-"
  const studyPlanType = user.STUDY_PLANS?.plan_group || "-"
  const criteria = applicant.ADMISSION_CRITERIA || {}
  const program = criteria.PROGRAMS || {}
  const dept = program.DEPARTMENTS || {}
  const faculty = dept.FACULTIES || {}
  const project = criteria.ADMISSION_PROJECTS || {} 

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8 font-poppins min-h-screen bg-slate-50/30">
      <Link to="/staff/results" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="h-4 w-4" /> กลับหน้ารายชื่อ
      </Link>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 shadow-inner">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 md:text-3xl">
              {user.first_name} {user.last_name}
            </h1>
            <p className="text-muted-foreground text-sm">รหัสบัตรประชาชน: {user.citizen_id || "-"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 px-4 rounded-xl shadow-sm border border-slate-100">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">สถานะ:</span>
          <StatusBadge status={currentStatus} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Academic Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-slate-800 border-b border-slate-50 pb-3">
            <GraduationCap className="h-5 w-5 text-primary" />
            <h2 className="font-bold">ข้อมูลการศึกษา</h2>
          </div>
          <dl className="space-y-4 text-sm">
            <div className="flex justify-between border-b border-slate-50 pb-2">
              <dt className="text-slate-500">สถานศึกษาเดิม</dt>
              <dd className="font-semibold text-slate-700">{user.high_school || "-"}</dd>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-2">
              <dt className="text-slate-500">ระดับชั้น/วุฒิการศึกษา</dt>
              <dd className="font-semibold text-slate-700">{user.current_level || "-"}</dd>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-2">
              <dt className="text-slate-500">สถานะการศึกษา</dt>
              <dd className="font-semibold text-slate-700">{formatEduStatus(user.edu_status)}</dd>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-2">
              <dt className="text-slate-500">ประเภทการศึกษา</dt>
              <dd className="font-semibold text-slate-700">{formatEducationType(studyPlanType)}</dd>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-2">
              <dt className="text-slate-500">แผนการเรียน</dt>
              <dd className="font-semibold text-slate-700">{studyPlanName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">GPAX (5 เทอม)</dt>
              <dd className="font-bold text-primary text-lg">{applicant.gpax ? applicant.gpax.toFixed(2) : "-"}</dd>
            </div>
          </dl>
        </div>

        {/* Application Details Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-slate-800 border-b border-slate-50 pb-3">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="font-bold">ข้อมูลการสมัคร</h2>
          </div>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-slate-500 text-xs uppercase tracking-tighter">คณะที่เลือก</dt>
              <dd className="font-semibold text-slate-700">{faculty.faculty_name || "-"}</dd>
            </div>
            <div>
              <dt className="text-slate-500 text-xs uppercase tracking-tighter">สาขาวิชา</dt>
              <dd className="font-semibold text-slate-700">{program.prog_name || "-"}</dd>
            </div>
            <div>
              <dt className="text-slate-500 text-xs uppercase tracking-tighter">โครงการ</dt>
              <dd className="font-semibold text-slate-700">{project.project_name || "-"}</dd>
            </div>
            <div className="pt-2">
              <span className="bg-primary/5 text-primary px-3 py-1 rounded-full text-xs font-bold">
                TCAS รอบที่ {criteria.tcas_round || "-"}
              </span>
            </div>
          </dl>
        </div>
      </div>

      {/* Scores & Calculation Section */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            การประมวลผลคะแนนคัดเลือก
          </h3>
          <div className="bg-primary/10 px-4 py-2 rounded-xl text-right">
            <p className="text-[10px] font-bold text-primary uppercase tracking-wider">คะแนนรวมสุทธิ</p>
            <p className="text-2xl font-black text-primary leading-none">{scoreCalculation.totalScore.toFixed(2)}</p>
          </div>
        </div>

        {scoreCalculation.details.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="p-3 font-semibold text-slate-500">วิชาที่ใช้คัดเลือก</th>
                  <th className="p-3 font-semibold text-slate-500 text-center">คะแนนดิบที่ได้</th>
                  <th className="p-3 font-semibold text-slate-500 text-center">ค่าน้ำหนัก (%)</th>
                  <th className="p-3 font-semibold text-slate-800 text-right">คะแนนที่คำนวณได้</th>
                </tr>
              </thead>
              <tbody>
                {scoreCalculation.details.map((subject) => (
                  <tr key={subject.subjectId} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-medium text-slate-700">{subject.subjectName}</td>
                    <td className="p-3 text-center">
                      <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md font-semibold">
                        {subject.rawScore.toFixed(2)}
                      </span>
                    </td>
                    <td className="p-3 text-center text-slate-500">{subject.weight}%</td>
                    <td className="p-3 text-right font-bold text-slate-800">{subject.weightedScore.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-slate-400 bg-slate-50/50 rounded-xl border border-dashed">
            ไม่มีการกำหนดเกณฑ์รายวิชาในโครงการนี้
          </div>
        )}
      </div>

      {/* Document Section */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-bold text-lg text-slate-800 flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-primary" />
          ไฟล์แนบประกอบการพิจารณา
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {applicant.portfolio_url ? (
            <a 
               // 👈 ดักลิงก์เก่าให้วิ่งไปหา Node Backend (Port 3000) แทน React Router
               href={applicant.portfolio_url.startsWith('/') ? `http://localhost:3000${applicant.portfolio_url}` : applicant.portfolio_url} 
               target="_blank" 
               rel="noreferrer" 
               className="flex items-center p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-red-50 hover:border-red-100 transition-all group"
            >
              <div className="bg-red-100 p-2 rounded-lg mr-4 group-hover:scale-110 transition-transform">
                <FileText className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700">Portfolio</p>
                <p className="text-[10px] text-slate-400">คลิกเพื่อดูเอกสาร PDF</p>
              </div>
            </a>
          ) : <div className="p-4 border border-dashed rounded-xl text-xs text-slate-400 text-center">ไม่มีไฟล์ Portfolio</div>}

          {applicant.transcript_url ? (
            <a 
               // 👈 ดักลิงก์เก่าเช่นเดียวกัน
               href={applicant.transcript_url.startsWith('/') ? `http://localhost:3000${applicant.transcript_url}` : applicant.transcript_url} 
               target="_blank" 
               rel="noreferrer" 
               className="flex items-center p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-blue-50 hover:border-blue-100 transition-all group"
            >
              <div className="bg-blue-100 p-2 rounded-lg mr-4 group-hover:scale-110 transition-transform">
                <FileCheck className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700">Transcript (ปพ.1)</p>
                <p className="text-[10px] text-slate-400">คลิกเพื่อดูใบเกรด</p>
              </div>
            </a>
          ) : <div className="p-4 border border-dashed rounded-xl text-xs text-slate-400 text-center">ไม่มีไฟล์ Transcript</div>}
        </div>
      </div>

      {/* Sticky Action Footer */}
      <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-primary/10 bg-primary/5 p-6 sm:flex-row sm:items-center sm:justify-between shadow-inner">
        <div className="text-sm">
            <p className="font-bold text-primary">การตัดสินผลการสมัคร</p>
            <p className="text-slate-500 text-xs">ข้อมูลจะถูกส่งไปยังระบบประกาศผลทันทีที่บันทึก</p>
        </div>
        <div className="flex gap-3">
            <button
              onClick={() => setConfirmAction(currentStatus === "rejected" ? "pending" : "rejected")}
              disabled={saving}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold border transition-all ${currentStatus === "rejected" ? "bg-white text-slate-600 hover:shadow-md" : "bg-white text-red-600 border-red-200 hover:bg-red-50 hover:shadow-md"}`}
            >
              {currentStatus === "rejected" ? "ยกเลิกผลการคัดออก" : "ไม่ผ่านการคัดเลือก"}
            </button>
            <button
              onClick={() => setConfirmAction(currentStatus === "approved" ? "pending" : "approved")}
              disabled={saving}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg hover:brightness-110 ${currentStatus === "approved" ? "bg-slate-400 shadow-slate-200" : "bg-emerald-600 shadow-emerald-200"}`}
            >
              {currentStatus === "approved" ? "ยกเลิกผลการคัดเลือก" : "ผ่านการคัดเลือก"}
            </button>
        </div>
      </div>

      {/* 1. Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl transform animate-in zoom-in-95 duration-200">
            <div className={`w-14 h-14 rounded-2xl mb-4 flex items-center justify-center ${confirmAction === 'approved' ? 'bg-emerald-100 text-emerald-600' : confirmAction === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                {confirmAction === 'approved' ? <CheckCircle className="w-8 h-8" /> : confirmAction === 'rejected' ? <XCircle className="w-8 h-8" /> : <User className="w-8 h-8" />}
            </div>
            <h2 className="text-xl font-black text-slate-800 mb-2">ยืนยันการดำเนินการ?</h2>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">คุณกำลังเปลี่ยนสถานะของผู้สมัครรายนี้เป็น <span className="font-bold underline italic text-slate-700">{{'approved':'ผ่านการคัดเลือก', 'rejected':'ไม่ผ่านการคัดเลือก', 'pending':'รอการตรวจสอบ'}[confirmAction]}</span></p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAction(null)} className="flex-1 py-3 border border-slate-200 rounded-2xl font-bold text-slate-400 hover:bg-slate-50 transition-colors">ยกเลิก</button>
              <button onClick={() => handleUpdateStatus(confirmAction)} className={`flex-1 py-3 text-white rounded-2xl font-bold shadow-lg transition-transform active:scale-95 ${confirmAction === 'approved' ? 'bg-emerald-600 shadow-emerald-200' : confirmAction === 'rejected' ? 'bg-red-600 shadow-red-200' : 'bg-slate-700 shadow-slate-200'}`}>
                {saving ? "กำลังบันทึก..." : "ยืนยันข้อมูล"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Success Result Popup */}
      {showResultDialog && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] p-10 max-w-xs w-full shadow-2xl text-center transform animate-in zoom-in-90 slide-in-from-bottom-10 duration-500">
            <div className="relative mx-auto w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-20"></div>
                <CheckCircle2 className="w-10 h-10 text-emerald-600 relative z-10" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">บันทึกสำเร็จ</h3>
            <p className="text-sm text-slate-500 mb-8 font-medium">ระบบได้ทำการปรับปรุงสถานะของผู้สมัครเรียบร้อยแล้ว</p>
            <button 
              onClick={() => {
                setShowResultDialog(false);
                navigate("/staff/results");
              }} 
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl shadow-slate-200 hover:bg-black transition-all"
            >
              ตกลง และกลับหน้ารวม
            </button>
          </div>
        </div>
      )}
    </div>
  )
}