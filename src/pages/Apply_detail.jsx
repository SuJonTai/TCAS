// --- Imports ---
import { useState } from "react"
import { Link, useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  User,
  GraduationCap,
  FileText,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { mockApplicants } from "@/lib/mock-data"

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

// --- Main Component: Applicant Detail View for Staff ---
export default function ApplicantDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  // States for confirmation and result dialogs
  const [showDialog, setShowDialog] = useState(false)
  const [dialogAction, setDialogAction] = useState("approve")
  const [currentStatus, setCurrentStatus] = useState(null)
  const [showResultDialog, setShowResultDialog] = useState(false)

  // Fetch mock applicant data
  const applicant = mockApplicants.find((a) => a.id === id)

  // Fallback for invalid ID
  if (!applicant) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-foreground">ไม่พบข้อมูลผู้สมัคร</p>
          <Link to="/staff/results">
            <button className="mt-4 inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
              กลับหน้ารายชื่อ
            </button>
          </Link>
        </div>
      </div>
    )
  }

  const status = currentStatus ?? applicant.status

  // --- Handlers ---
  const handleAction = (action) => {
    setDialogAction(action)
    setShowDialog(true)
  }

  const handleConfirm = () => {
    let newStatus
    if (dialogAction === "approve") {
      newStatus = "approved"
    } else if (dialogAction === "reject") {
      newStatus = "rejected"
    } else {
      // undo actions -> back to pending
      newStatus = "pending"
    }

    // Update local state for this detail view
    setCurrentStatus(newStatus)

    // Persist change to the shared mock data used by the list view
    const idx = mockApplicants.findIndex((a) => a.id === id)
    if (idx !== -1) {
      mockApplicants[idx].status = newStatus
    }

    setShowDialog(false)
    setShowResultDialog(true)
  }

  // Data mapping for personal details
  const details = [
    { label: "ชื่อ-นามสกุล", value: applicant.name },
    { label: "รหัสบัตรประชาชน", value: applicant.nationalId },
    { label: "อายุ", value: String(applicant.age) },
    { label: "รอบการรับสมัคร", value: `รอบที่ ${applicant.round}` },
    { label: "คณะ", value: applicant.faculty },
    { label: "สาขาวิชา", value: applicant.major },
    { label: "เกรดเฉลี่ย (GPAX)", value: applicant.gpa.toFixed(2) },
  ]

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
      {/* Top Navigation */}
      <Link to="/staff/results">
        <button className="mb-4 inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
          <ArrowLeft className="h-4 w-4" /> กลับหน้ารายชื่อ
        </button>
      </Link>

      <div className="flex flex-col gap-6">
        
        {/* --- Section: Personal Information Card --- */}
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-[family-name:var(--font-poppins)] text-xl font-bold tracking-tight text-foreground">
                    {applicant.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    รหัสผู้สมัคร: {applicant.id}
                  </p>
                </div>
              </div>
              <StatusBadge status={status} />
            </div>
          </div>
          <div className="p-6 pt-0">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {details.map((d) => (
                <div key={d.label}>
                  <p className="text-xs text-muted-foreground">{d.label}</p>
                  <p className="text-sm font-medium text-foreground">{d.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* --- Section: Academic & Portfolio Card --- */}
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                ข้อมูลการศึกษา
              </h3>
            </div>
          </div>
          <div className="flex flex-col gap-4 p-6 pt-0">
            <div>
              <p className="text-xs text-muted-foreground">แผนการเรียน</p>
              <p className="text-sm font-medium text-foreground">
                {applicant.studyPlan}
              </p>
            </div>
            <div className="h-[1px] w-full shrink-0 bg-border" />
            <div>
              <p className="mb-2 text-xs text-muted-foreground">ไฟล์แฟ้มสะสมผลงาน (Portfolio)</p>
              {applicant.portfolioUrl ? (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {applicant.portfolioUrl.split("/").pop()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      เอกสาร PDF
                    </p>
                  </div>
                  <button className="inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
                    ดูไฟล์
                  </button>
                </div>
              ) : (
                <p className="text-sm italic text-muted-foreground">
                  ไม่ได้อัปโหลดแฟ้มสะสมผลงาน
                </p>
              )}
            </div>
          </div>
        </div>

        {/* --- Section: Action Buttons --- */}
        <div className="flex gap-3">
          <button
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            onClick={() => handleAction(status === "approved" ? "undoApprove" : "approve")}
            disabled={status === "rejected"}
          >
            <CheckCircle className="h-4 w-4" />
            {status === "approved" ? "ยกเลิกผลการอนุมัติ" : "ผ่าน / อนุมัติ"}
          </button>
          <button
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
            onClick={() => handleAction(status === "rejected" ? "undoReject" : "reject")}
            disabled={status === "approved"}
          >
            <XCircle className="h-4 w-4" />
            {status === "rejected" ? "ยกเลิกผลการปฏิเสธ" : "ไม่ผ่าน / ปฏิเสธ"}
          </button>
        </div>
      </div>

      {/* --- Section: Confirmation Dialog --- */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border bg-card p-6 text-card-foreground shadow-lg">
            <div className="flex flex-col items-center space-y-1.5 text-center">
              <div
                className={`mb-2 flex h-14 w-14 items-center justify-center rounded-full ${
                  dialogAction === "approve"
                    ? "bg-emerald-100"
                    : dialogAction === "reject"
                    ? "bg-red-100"
                    : "bg-secondary/40"
                }`}
              >
                {dialogAction === "approve" ? (
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                ) : dialogAction === "reject" ? (
                  <XCircle className="h-8 w-8 text-red-600" />
                ) : (
                  <CheckCircle className="h-8 w-8 text-foreground" />
                )}
              </div>
              <h2 className="font-[family-name:var(--font-poppins)] text-lg font-semibold leading-none tracking-tight text-foreground">
                ยืนยันการเปลี่ยนสถานะ
              </h2>
              <p className="text-sm text-muted-foreground">
                {dialogAction === "approve" && (
                  <>
                    คุณต้องการเปลี่ยนสถานะของผู้สมัครคนนี้เป็น{" "}
                    <span className="font-semibold">ผ่านการคัดเลือก</span> หรือไม่?
                  </>
                )}
                {dialogAction === "reject" && (
                  <>
                    คุณต้องการเปลี่ยนสถานะของผู้สมัครคนนี้เป็น{" "}
                    <span className="font-semibold">ไม่ผ่านการคัดเลือก</span> หรือไม่?
                  </>
                )}
                {(dialogAction === "undoApprove" || dialogAction === "undoReject") && (
                  <>
                    คุณต้องการยกเลิกผลการตัดสิน และเปลี่ยนสถานะกลับเป็น{" "}
                    <span className="font-semibold">รอการตรวจสอบ</span> หรือไม่?
                  </>
                )}
              </p>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleConfirm}
                className="inline-flex h-10 flex-1 items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                ยืนยัน
              </button>
              <button
                onClick={() => setShowDialog(false)}
                className="inline-flex h-10 flex-1 items-center justify-center whitespace-nowrap rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Section: Result Dialog after confirmation --- */}
      {showResultDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border bg-card p-6 text-card-foreground shadow-lg">
            <div className="flex flex-col items-center space-y-1.5 text-center">
              <div
                className={`mb-2 flex h-14 w-14 items-center justify-center rounded-full ${
                  currentStatus === "approved"
                    ? "bg-emerald-100"
                    : currentStatus === "rejected"
                    ? "bg-red-100"
                    : "bg-secondary/40"
                }`}
              >
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
                  {currentStatus === "approved"
                    ? "ผ่านการคัดเลือก"
                    : currentStatus === "rejected"
                    ? "ไม่ผ่านการคัดเลือก"
                    : "รอการตรวจสอบ"}
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