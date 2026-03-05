// --- Imports ---
import { useState, useMemo, useCallback } from "react"
import { Upload, FileText, X, CheckCircle2 } from "lucide-react"
import { faculties } from "@/lib/mock-data"

// --- Application Rounds Data ---
const rounds = [
  { value: "1", label: "รอบที่ 1 - Portfolio" },
  { value: "2", label: "รอบที่ 2 - Quota" },
  { value: "3", label: "รอบที่ 3 - Admission" },
  { value: "4", label: "รอบที่ 4 - Direct Admission" },
]

const studyPlans = ["วิทย์-คณิต", "ศิลป์–คำนวณ", "ศิลป์-ภาษา", "ศิลป์-สังคม", "อื่นๆ"]
const educationChoice = ["ม.6", "ปวช.", "ปวส.", "สอบเทียบ", "เด็กซิ่ว"]
let gpax = 0.0

// --- Helper Icon Component ---
function ChevronDownIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

// --- Main Component: Application Form ---
export default function ApplicationForm() {
  // Form States
  const [selectedRound, setSelectedRound] = useState("")
  const [selectedFaculty, setSelectedFaculty] = useState("")
  const [selectedMajor, setSelectedMajor] = useState("")
  const [studyPlan, setStudyPlan] = useState("")
  const [education, setEducation] = useState("")
  const [grade, setGrade] = useState("")
  const [studyPlanOther, setStudyPlanOther] = useState("")
  
  // File Upload States
  const [file, setFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  
  // Submission States
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Dynamically filter majors based on selected faculty
  const allMajors = useMemo(() => {
    if (!selectedFaculty) return []
    const faculty = faculties.find((f) => f.id === selectedFaculty)
    if (!faculty) return []
    return faculty.departments.flatMap((d) =>
      d.majors.map((m) => ({ id: m.id, name: m.name }))
    )
  }, [selectedFaculty])

  // --- Drag & Drop Handlers ---
  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) setFile(droppedFile)
  }, [])

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) setFile(e.target.files[0])
  }

  // --- Submission Handler ---
  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setShowSuccess(true)
    }, 1500)
  }

  const resetForm = () => {
    setSelectedRound("")
    setSelectedFaculty("")
    setSelectedMajor("")
    setStudyPlan("")
    setEducation("")
    setStudyPlanOther("")
    setFile(null)
    setShowSuccess(false)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
      <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        
        {/* --- Card Header --- */}
        <div className="flex flex-col space-y-1.5 p-6">
          <h3 className="font-[family-name:var(--font-poppins)] text-xl font-bold tracking-tight text-foreground">
            แบบฟอร์มสมัครเรียน
          </h3>
          <p className="text-sm text-muted-foreground">
            กรอกข้อมูลด้านล่างเพื่อส่งใบสมัคร TCAS ของคุณ
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            ช่องที่มีเครื่องหมาย <span className="text-red-500">*</span> จำเป็นต้องกรอก
          </p>
        </div>

        {/* --- Form Section --- */}
        <div className="p-6 pt-0">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            
            {/* Input: Admission Round */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium leading-none">
                รอบการรับสมัคร <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedRound}
                  onChange={(e) => setSelectedRound(e.target.value)}
                  className="flex h-10 w-full appearance-none items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="" disabled>เลือกรอบการรับสมัคร</option>
                  {rounds.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <ChevronDownIcon className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
              </div>
            </div>

            {/* Input: Faculty */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium leading-none">
                คณะ <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedFaculty}
                  onChange={(e) => {
                    setSelectedFaculty(e.target.value)
                    setSelectedMajor("")
                  }}
                  className="flex h-10 w-full appearance-none items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="" disabled>เลือกคณะ</option>
                  {faculties.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                <ChevronDownIcon className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
              </div>
            </div>

            {/* Input: Major */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium leading-none">
                สาขาวิชา <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedMajor}
                  onChange={(e) => setSelectedMajor(e.target.value)}
                  disabled={!selectedFaculty}
                  className="flex h-10 w-full appearance-none items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="" disabled>
                    {selectedFaculty ? "เลือกสาขาวิชา" : "กรุณาเลือกคณะก่อน"}
                  </option>
                  {allMajors.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <ChevronDownIcon className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
              </div>
            </div>

            {/* Input: Education level */}
            <div className="flex flex-col gap-2">
              <label htmlFor="education" className="text-sm font-medium leading-none">
                ระดับการศึกษา <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="education"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  className="flex h-10 w-full appearance-none items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="" disabled>เลือกระดับการศึกษา</option>
                  {educationChoice.map((plan) => (
                    <option key={plan} value={plan}>
                      {plan}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="grade" className="text-sm font-medium leading-none">
                GPAX <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="grade"
                  value={grade}
                  onChange={(e) => {
                    const raw = e.target.value
                    if (raw === "") {
                      setGrade("")
                      return
                    }
                    const num = parseFloat(raw)
                    if (Number.isNaN(num)) return
                    const clamped = Math.max(0, Math.min(4, num))
                    setGrade(clamped.toFixed(2))
                  }}
                  type="number"
                  max="4.0"
                  min="0.0"
                  step="0.01"
                  className="flex h-10 w-full appearance-none items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="studyPlan" className="text-sm font-medium leading-none">
                แผนการเรียนปัจจุบัน <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="studyPlan"
                  value={studyPlan}
                  onChange={(e) => {
                    setStudyPlan(e.target.value)
                    if (e.target.value !== "อื่นๆ") {
                      setStudyPlanOther("")
                    }
                  }}
                  className="flex h-10 w-full appearance-none items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="" disabled>เลือกแผนการเรียน</option>
                  {studyPlans.map((plan) => (
                    <option key={plan} value={plan}>
                      {plan}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
              </div>
              {studyPlan === "อื่นๆ" && (
                <input
                  type="text"
                  placeholder="ระบุแผนการเรียนของคุณ"
                  value={studyPlanOther}
                  onChange={(e) => setStudyPlanOther(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                />
              )}
            </div>

            {/* Input: Drag & Drop File Upload */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium leading-none">อัปโหลดแฟ้มสะสมผลงาน (Portfolio)</label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border bg-muted/30 hover:border-primary/40"
                }`}
              >
                {file ? (
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="ml-2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground/60" />
                    <p className="text-sm text-muted-foreground">
                      ลากและวางไฟล์ portfolio ของคุณที่นี่ หรือ{" "}
                      <label className="cursor-pointer font-medium text-primary underline-offset-4 hover:underline">
                        เลือกไฟล์
                        <input
                          type="file"
                          className="sr-only"
                          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                          onChange={handleFileChange}
                        />
                      </label>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ไฟล์ PDF, DOC หรือรูปภาพ ขนาดไม่เกิน 10 MB
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={
                loading ||
                !selectedRound ||
                !selectedFaculty ||
                !selectedMajor ||
                !education ||
                !studyPlan ||
                (studyPlan === "อื่นๆ" && !studyPlanOther)
              }
              className="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            >
              {loading ? "กำลังส่งข้อมูล..." : "ยืนยันการสมัคร"}
            </button>
          </form>
        </div>
      </div>

      {/* --- Section: Success Dialog Modal --- */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border bg-card p-6 text-card-foreground shadow-lg">
            <div className="flex flex-col items-center space-y-1.5 text-center">
              <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h2 className="font-[family-name:var(--font-poppins)] text-lg font-semibold leading-none tracking-tight">
                ส่งใบสมัครสำเร็จ
              </h2>
              <p className="text-sm text-muted-foreground">
                ระบบได้รับใบสมัครของคุณเรียบร้อยแล้ว กรุณารอรับอีเมลยืนยันพร้อมคำแนะนำเพิ่มเติม
              </p>
            </div>
            <button
              onClick={resetForm}
              className="mt-4 inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              ส่งใบสมัครอื่นเพิ่มเติม
            </button>
          </div>
        </div>
      )}
    </div>
  )
}