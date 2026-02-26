// --- Imports ---
import { Link, useParams } from "react-router-dom"
import {
  ArrowLeft,
  BookOpen,
  Award,
  Users,
  ClipboardCheck,
  Building2,
  Layers,
} from "lucide-react"
import { faculties } from "@/lib/mock-data"

// --- Helper Function: Find major context from mock data ---
function findMajorContext(majorId) {
  for (const faculty of faculties) {
    for (const dept of faculty.departments) {
      const major = dept.majors.find((m) => m.id === majorId)
      if (major) {
        return { faculty, dept, major }
      }
    }
  }
  return null
}

// --- Sub-component: Admission Round Detail Card ---
function RoundCard({ round }) {
  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col space-y-1.5 p-6 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-transparent bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/80">
            รอบที่ {round.round}
          </span>
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-xs font-semibold text-primary transition-colors hover:bg-accent hover:text-accent-foreground">
            {round.roundName}
          </span>
        </div>
        <h3 className="text-base font-semibold leading-none tracking-tight text-foreground">
          {round.projectName}
        </h3>
      </div>
      <div className="p-6 pt-0">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          
          {/* Seats Info */}
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <div className="rounded-md bg-primary/10 p-2">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">จำนวนที่รับ</p>
              <p className="text-lg font-bold text-foreground">{round.seats} คน</p>
            </div>
          </div>

          {/* GPA Info */}
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <div className="rounded-md bg-primary/10 p-2">
              <Award className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">เกรดเฉลี่ยขั้นต่ำ (GPAX)</p>
              <p className="text-lg font-bold text-foreground">{round.minGPA.toFixed(2)}</p>
            </div>
          </div>

          {/* Test Required Info */}
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <div className="rounded-md bg-primary/10 p-2">
              <ClipboardCheck className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">คะแนนสอบที่ใช้</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {round.requiredTests.map((test) => (
                  <span key={test} className="inline-flex items-center rounded-full border border-transparent bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80">
                    {test}
                  </span>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// --- Main Component: Major Details Page ---
export default function MajorDetailPage() {
  const { id } = useParams() 
  const context = findMajorContext(id)

  // Fallback for invalid major ID
  if (!context) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <h2 className="text-2xl font-bold">ไม่พบข้อมูลสาขาวิชานี้</h2>
        <Link to="/admission">
          <button className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            กลับไปหน้าเกณฑ์การรับสมัคร
          </button>
        </Link>
      </div>
    )
  }

  const { faculty, dept, major } = context

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
      
      {/* --- Section: Header & Navigation --- */}
      <div className="mb-6">
        <Link to="/admission">
          <button className="mb-4 inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
            <ArrowLeft className="h-4 w-4" /> กลับหน้าค้นหาเกณฑ์
          </button>
        </Link>

        {/* Breadcrumb path */}
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5" />
            {faculty.name}
          </span>
          <span>/</span>
          <span className="flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" />
            {dept.name}
          </span>
        </div>

        {/* Major Title */}
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-[family-name:var(--font-poppins)] text-2xl font-bold text-foreground md:text-3xl text-balance">
              {major.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              เปิดรับสมัครทั้งหมด {major.rounds.length} รอบ
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8 h-[1px] w-full shrink-0 bg-border" />

      {/* --- Section: Admission Rounds List --- */}
      <h2 className="mb-4 font-[family-name:var(--font-poppins)] text-lg font-semibold text-foreground">
        รอบที่เปิดรับสมัคร
      </h2>

      <div className="flex flex-col gap-4">
        {major.rounds.map((round) => (
          <RoundCard key={`${round.round}-${round.projectName}`} round={round} />
        ))}
      </div>

      {/* --- Section: Action Button --- */}
      <div className="mt-8">
        <Link to="/apply">
          <button className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto">
            สมัครเรียนสาขานี้
          </button>
        </Link>
      </div>
    </div>
  )
}