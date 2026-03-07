import { useState, useEffect } from "react"
import { Link, useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  User,
  GraduationCap,
  FileText,
  CheckCircle,
  XCircle,
  Award
} from "lucide-react"
import { supabase } from "@/lib/supabase"

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

export default function ApplicantDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [applicant, setApplicant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [currentStatus, setCurrentStatus] = useState("pending")
  const [showResultDialog, setShowResultDialog] = useState(false)
  const [scores, setScores] = useState([])
  const [confirmAction, setConfirmAction] = useState(null)

  // 1. Fetch the application data AND scores on load
  useEffect(() => {
    const fetchApplicantData = async () => {
      // 1A. Fetch Application
      const { data, error } = await supabase
        .from('APPLICATION')
        .select(`
          id,
          user_id, 
          status,
          gpax,
          study_plan,
          high_school,
          portfolio_url,
          USERS ( first_name, last_name, citizen_id ),
          ADMISSION_CRITERIA (
            tcas_round,
            PROGRAMS (
              prog_name,
              DEPARTMENTS (
                dept_name,
                FACULTIES ( faculty_name )
              )
            )
          )
        `)
        .eq('id', id)
        .single()

      if (!error && data) {
        setApplicant(data)
        setCurrentStatus(data.status || "pending")

        // 1B. Fetch Scores right after getting the user_id
        if (data.user_id) {
          const { data: scoreData, error: scoreError } = await supabase
            .from('USER_SCORES')
            .select(`
              score_value,
              SUBJECTS ( subject_name )
            `)
            .eq('user_id', data.user_id)

          if (!scoreError && scoreData) {
            setScores(scoreData)
          } else {
            console.error("Error fetching scores:", scoreError)
          }
        }
      }
      setLoading(false)
    }

    fetchApplicantData()
  }, [id])

  // 2. Handle updating the status in Supabase
  const handleUpdateStatus = async (newStatus) => {
    setSaving(true)
    
    const { error } = await supabase
      .from('APPLICATION')
      .update({ status: newStatus })
      .eq('id', id)

    setSaving(false)
    setConfirmAction(null) // <-- Close the confirm popup

    if (error) {
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + error.message)
    } else {
      setCurrentStatus(newStatus)
      setShowResultDialog(true) // Show success popup
    }
  }

  if (loading) return <div className="p-12 text-center text-muted-foreground">กำลังโหลดข้อมูลผู้สมัคร...</div>
  if (!applicant) return <div className="p-12 text-center text-red-500">ไม่พบข้อมูลผู้สมัครนี้</div>

  // Simplify data access
  const user = applicant.USERS || {}
  const criteria = applicant.ADMISSION_CRITERIA || {}
  const program = criteria.PROGRAMS || {}
  const dept = program.DEPARTMENTS || {}
  const faculty = dept.FACULTIES || {}

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
      <Link to="/staff/results" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> กลับหน้ารายชื่อ
      </Link>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="font-[family-name:var(--font-poppins)] text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {user.first_name} {user.last_name}
            </h1>
            <p className="text-muted-foreground">รหัสบัตรประชาชน: {user.citizen_id || "-"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">สถานะปัจจุบัน:</span>
          <StatusBadge status={currentStatus} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Academic Profile */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-foreground">
            <GraduationCap className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-[family-name:var(--font-poppins)] font-semibold">ข้อมูลการศึกษา</h2>
          </div>
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 md:grid-cols-1">
            <div>
              <dt className="text-muted-foreground">โรงเรียน/สถานศึกษาเดิม</dt>
              <dd className="font-medium text-foreground">{applicant.high_school || "-"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">แผนการเรียน</dt>
              <dd className="font-medium text-foreground">{applicant.study_plan || "-"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">เกรดเฉลี่ยสะสม (GPAX)</dt>
              <dd className="font-medium text-foreground">{applicant.gpax ? applicant.gpax.toFixed(2) : "-"}</dd>
            </div>
          </dl>
        </div>

        {/* Application Details */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-foreground">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-[family-name:var(--font-poppins)] font-semibold">ข้อมูลการสมัคร</h2>
          </div>
          <dl className="grid grid-cols-1 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">คณะ</dt>
              <dd className="font-medium text-foreground">{faculty.faculty_name || "-"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">สาขาวิชา</dt>
              <dd className="font-medium text-foreground">{program.prog_name || "-"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">รอบการรับสมัคร</dt>
              <dd className="font-medium text-foreground">รอบที่ {criteria.tcas_round || "-"}</dd>
            </div>
            
            {/* Portfolio Link */}
            {applicant.portfolio_url && (
              <div className="pt-2 mt-2 border-t border-border">
                <dt className="text-muted-foreground mb-1">ผลงาน (Portfolio)</dt>
                <dd>
                  <a 
                    href={supabase.storage.from('portfolios').getPublicUrl(applicant.portfolio_url).data.publicUrl}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    เปิดดูไฟล์ PDF
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* TCAS Scores Section */}
      <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-lg border-b pb-2 flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          คะแนนสอบ TCAS
        </h3>
        
        {scores.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {scores.map((score, index) => (
              <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-muted/50 border border-border/50">
                <span className="text-sm font-medium text-muted-foreground">
                  {score.SUBJECTS?.subject_name}
                </span>
                <span className="text-base font-bold text-foreground">
                  {Number(score.score_value).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-muted-foreground bg-muted/30 rounded-lg border border-dashed border-border">
            ผู้สมัครยังไม่ได้กรอกคะแนนสอบในระบบ
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-6 sm:flex-row sm:items-center sm:justify-end">
        <p className="text-sm text-muted-foreground sm:mr-auto">กรุณาตรวจสอบข้อมูลก่อนบันทึกสถานะ</p>
        
        {/* Reject / Undo Button */}
        {currentStatus === "rejected" ? (
          <button
            onClick={() => setConfirmAction("pending")}
            disabled={saving}
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
          >
            ยกเลิก (Undo)
          </button>
        ) : (
          <button
            onClick={() => setConfirmAction("rejected")}
            disabled={saving}
            className="inline-flex h-10 items-center justify-center rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
          >
            ไม่ผ่านการคัดเลือก
          </button>
        )}

        {/* Approve / Undo Button */}
        {currentStatus === "approved" ? (
          <button
            onClick={() => setConfirmAction("pending")}
            disabled={saving}
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
          >
            ยกเลิก (Undo)
          </button>
        ) : (
          <button
            onClick={() => setConfirmAction("approved")}
            disabled={saving}
            className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            ผ่านการคัดเลือก
          </button>
        )}
      </div>

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-lg border bg-card p-6 text-card-foreground shadow-lg animate-in zoom-in-95 duration-200">
            <h2 className="mb-2 font-[family-name:var(--font-poppins)] text-lg font-semibold leading-none tracking-tight">
              ยืนยันการดำเนินการ
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">
              {confirmAction === "pending" ? (
                "คุณแน่ใจหรือไม่ที่จะยกเลิกสถานะ และเปลี่ยนกลับเป็น รอการตรวจสอบ?"
              ) : (
                <>
                  คุณแน่ใจหรือไม่ที่จะเปลี่ยนสถานะผู้สมัครเป็น{" "}
                  <span className={`font-semibold ${confirmAction === "approved" ? "text-emerald-600" : "text-red-600"}`}>
                    {confirmAction === "approved" ? "ผ่านการคัดเลือก" : "ไม่ผ่านการคัดเลือก"}
                  </span>?
                </>
              )}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={saving}
                className="flex-1 inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
              >
                ปิด
              </button>
              <button
                onClick={() => handleUpdateStatus(confirmAction)}
                disabled={saving}
                className={`flex-1 inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                  confirmAction === "approved" 
                    ? "bg-emerald-600 hover:bg-emerald-700" 
                    : confirmAction === "rejected"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-slate-600 hover:bg-slate-700"
                }`}
              >
                {saving ? "กำลังบันทึก..." : "ยืนยัน"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Dialog */}
      {showResultDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border bg-card p-6 text-card-foreground shadow-lg">
            <div className="flex flex-col items-center space-y-1.5 text-center">
              <div className="mb-2">
                {currentStatus === "approved" ? (
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                ) : currentStatus === "rejected" ? (
                  <XCircle className="h-8 w-8 text-red-600" />
                ) : (
                  <CheckCircle className="h-8 w-8 text-foreground" />
                )}
              </div>
              <h2 className="font-[family-name:var(--font-poppins)] text-lg font-semibold leading-none tracking-tight text-foreground">
                บันทึกสถานะสำเร็จ
              </h2>
              <p className="text-sm text-muted-foreground">
                สถานะของผู้สมัครถูกบันทึกเป็น{" "}
                <span className="font-semibold">
                  {{
                    "approved": "ผ่านการคัดเลือก",
                    "rejected": "ไม่ผ่านการคัดเลือก",
                    "pending": "รอการตรวจสอบ"
                  }[currentStatus] || "รอการตรวจสอบ"}
                </span>{" "}
                เรียบร้อยแล้ว
              </p>
            </div>
            <button
              onClick={() => {
                setShowResultDialog(false)
                navigate("/staff/results")
              }}
              className="mt-4 inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              กลับหน้ารายชื่อ
            </button>
          </div>
        </div>
      )}
    </div>
  )
}