// --- Imports ---
import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import {
  Search,
  ChevronDown,
  ChevronRight,
  Building2,
  Layers,
  BookOpen,
  ArrowLeft,
  ArrowRight,
} from "lucide-react"
import { faculties } from "@/lib/mock-data"

// --- Sub-component: Major Item Link ---
// Renders individual major links inside the department accordion
function MajorLink({ major }) {
  return (
    <Link
      to={`/admission/${major.id}`}
      className="group flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/30 hover:bg-primary/5"
    >
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">{major.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full border border-transparent bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80">
          {major.rounds.length} รอบ
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
    </Link>
  )
}

// --- Sub-component: Department Accordion ---
// Collapsible section for departments within a faculty
function DepartmentAccordion({ dept }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-lg border border-border bg-muted/30">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50"
      >
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{dept.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-transparent bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80">
            {dept.majors.length} สาขาวิชา
          </span>
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>
      {/* Expanded Content */}
      {open && (
        <div className="flex flex-col gap-2 border-t border-border px-4 py-3">
          {dept.majors.map((major) => (
            <MajorLink key={major.id} major={major} />
          ))}
        </div>
      )}
    </div>
  )
}

// --- Sub-component: Faculty Card ---
// Main card displaying faculty info and containing departments
function FacultyCard({ faculty }) {
  const [open, setOpen] = useState(false)
  const totalMajors = faculty.departments.reduce(
    (acc, d) => acc + d.majors.length,
    0
  )

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-muted/30"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-[family-name:var(--font-poppins)] text-base font-semibold text-foreground">
              {faculty.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {faculty.departments.length} ภาควิชา, {totalMajors} สาขาวิชา
            </p>
          </div>
        </div>
        {open ? (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
      {/* Expanded Content */}
      {open && (
        <div className="flex flex-col gap-3 border-t border-border p-6 pt-4">
          {faculty.departments.map((dept) => (
            <DepartmentAccordion key={dept.id} dept={dept} />
          ))}
        </div>
      )}
    </div>
  )
}

// --- Main Component: Admission Criteria Page ---
export default function AdmissionPage() {
  const [search, setSearch] = useState("")

  // Deep search filter logic for faculties, departments, and majors
  const filtered = useMemo(() => {
    if (!search.trim()) return faculties
    const q = search.toLowerCase()
    return faculties
      .map((faculty) => {
        const matchedDepts = faculty.departments
          .map((dept) => {
            const matchedMajors = dept.majors.filter((m) =>
              m.name.toLowerCase().includes(q)
            )
            if (
              dept.name.toLowerCase().includes(q) ||
              matchedMajors.length > 0
            ) {
              return {
                ...dept,
                majors:
                  matchedMajors.length > 0 ? matchedMajors : dept.majors,
              }
            }
            return null
          })
          .filter(Boolean)

        if (
          faculty.name.toLowerCase().includes(q) ||
          matchedDepts.length > 0
        ) {
          return {
            ...faculty,
            departments:
              matchedDepts.length > 0 ? matchedDepts : faculty.departments,
          }
        }
        return null
      })
      .filter(Boolean)
  }, [search])

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
      {/* Header Section */}
      <div className="mb-6">
        <Link to="/">
          <button className="mb-4 inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
            <ArrowLeft className="h-4 w-4" /> กลับหน้าหลัก
          </button>
        </Link>
        <h1 className="mb-2 font-[family-name:var(--font-poppins)] text-2xl font-bold text-foreground md:text-3xl">
          เกณฑ์การรับสมัคร
        </h1>
        <p className="text-muted-foreground">
          ค้นหาคณะ ภาควิชา และสาขาวิชาเพื่อดูเกณฑ์การรับสมัครของมหาวิทยาลัย
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="ค้นหาคณะ, ภาควิชา, หรือสาขาวิชา..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background py-2 pl-10 pr-3 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Results Section */}
      <div className="flex flex-col gap-4">
        {filtered.length > 0 ? (
          filtered.map((faculty) => (
            <FacultyCard key={faculty.id} faculty={faculty} />
          ))
        ) : (
          <div className="rounded-xl border border-border bg-card p-12 text-center text-card-foreground">
            <Search className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium text-foreground">ไม่พบข้อมูล</p>
            <p className="text-sm text-muted-foreground">
              ลองค้นหาด้วยคำอื่นอีกครั้ง
            </p>
          </div>
        )}
      </div>
    </div>
  )
}