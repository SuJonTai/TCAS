// --- Imports ---
import { useState, useMemo } from "react"
import { Link, useLocation } from "react-router-dom"
import {
  ArrowLeft,
  Filter,
  FileDown,
  Users,
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

// --- Main Component: Applicant Results Table ---
export default function ApplicantListTable() {
  const location = useLocation()
  
  // Extract search parameters from URL
  const searchParams = new URLSearchParams(location.search)
  const roundFilter = searchParams.get("round")
  const [filtered, setFiltered] = useState(false)

  // Filter applicant data based on URL params and local state
  const applicants = useMemo(() => {
    let list = mockApplicants
    if (roundFilter) {
      list = list.filter((a) => String(a.round) === roundFilter)
    }
    if (filtered) {
      list = list.filter((a) => a.gpa >= 2.75)
    }
    return list
  }, [roundFilter, filtered])

  // Mock export function
  const handleExportPDF = () => {
    alert("กำลังส่งออกไฟล์ PDF กรุณาตรวจสอบในโฟลเดอร์ดาวน์โหลดของคุณ")
  }

  return (
    <div className="flex flex-col gap-6 mx-auto max-w-7xl px-4 py-8 lg:px-8">
      
      {/* --- Section: Header --- */}
      <div>
        <Link to="/staff">
          <button className="mb-4 inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
            <ArrowLeft className="h-4 w-4" /> กลับหน้าค้นหา
          </button>
        </Link>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h1 className="font-[family-name:var(--font-poppins)] text-2xl font-bold text-foreground">
            ผลการค้นหาผู้สมัคร
          </h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {roundFilter
            ? `แสดงผู้สมัครสำหรับรอบที่ ${roundFilter}`
            : "แสดงผู้สมัครทั้งหมด"}{" "}
          ({applicants.length} รายการ)
        </p>
      </div>

      {/* --- Section: Filter & Actions --- */}
      <div className="flex flex-wrap gap-2">
        <button
          className={`inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors ${
            filtered
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
          }`}
          onClick={() => setFiltered(!filtered)}
        >
          <Filter className="h-4 w-4" />
          {filtered ? "แสดงทั้งหมด" : "กรอง: เกรดเฉลี่ยขั้นต่ำ 2.75"}
        </button>
        <button
          className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          onClick={handleExportPDF}
        >
          <FileDown className="h-4 w-4" />
          ส่งออกเป็น PDF
        </button>
      </div>

      {/* --- Section: Data Table --- */}
      <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6 pb-2">
          <h3 className="font-semibold leading-none tracking-tight text-foreground">
            รายชื่อผู้สมัคร
          </h3>
        </div>
        <div className="p-0">
          <div className="w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-12">#</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">ชื่อ-นามสกุล</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">คณะ</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">สาขาวิชา</th>
                  <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-center">รอบ</th>
                  <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-center">GPA</th>
                  <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {applicants.length > 0 ? (
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
                      <td className="p-4 align-middle text-center">{StatusBadge({ status: a.status })}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-4 py-8 align-middle text-center text-muted-foreground">
                      ไม่พบผู้สมัครที่ตรงกับเงื่อนไขการค้นหา
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}