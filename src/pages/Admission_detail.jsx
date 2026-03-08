import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { 
  ArrowLeft, BookOpen, Users, ClipboardCheck, 
  Building2, Layers, GraduationCap, School // <-- เพิ่มไอคอนใหม่
} from "lucide-react"
import { supabase } from "@/lib/supabase"

function RoundCard({ round }) {
  // --- จัดการข้อมูล Array ของสถานะและวุฒิ (แบบปลอดภัย) ---
  let reqs = []
  const rawReqs = round.edu_status_req

  if (Array.isArray(rawReqs)) {
    reqs = rawReqs
  } else if (typeof rawReqs === 'string') {
    try { reqs = JSON.parse(rawReqs) } 
    catch(e) { reqs = rawReqs.split(',').map(item => item.trim()) }
  }

  // แยกกลุ่มข้อมูลแบบเดียวกับที่ใช้ตรวจสิทธิ
  const requiredStatuses = reqs.filter(r => ["studying", "graduated"].includes(r))
  const requiredTypes = reqs.filter(r => ["high-school", "vocational", "high-vocational"].includes(r))

  // แปลงค่าภาษาอังกฤษเป็นภาษาไทย
  const statusMap = {
    "studying": "กำลังศึกษา",
    "graduated": "สำเร็จการศึกษา"
  }
  const typeMap = {
    "high-school": "ม.ปลาย",
    "vocational": "ปวช.",
    "high-vocational": "ปวส."
  }

  // สร้างข้อความเพื่อนำไปแสดงผล
  const displayStatus = requiredStatuses.length > 0 
    ? requiredStatuses.map(s => statusMap[s]).join(" หรือ ") 
    : "ไม่กำหนด"

  const displayType = requiredTypes.length > 0 
    ? requiredTypes.map(t => typeMap[t]).join(", ") 
    : "ไม่กำหนด"

  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col space-y-1.5 p-6 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
            รอบที่ {round.tcas_round}
          </span>
          <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-semibold text-foreground">
            {round.ADMISSION_PROJECTS?.project_name || "โครงการรับตรง"}
          </span>
        </div>
      </div>
      <div className="p-6 pt-3">
        {/* ปรับ Grid เป็น 2 คอลัมน์ (แสดง 4 กล่องเรียงกันสวยๆ) */}
        <div className="grid gap-4 sm:grid-cols-2">
          
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">จำนวนรับ</p>
              <p className="font-medium text-foreground">{round.max_seats} ที่นั่ง</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">GPAX ขั้นต่ำ</p>
              <p className="font-medium text-foreground">{round.min_gpax ? round.min_gpax.toFixed(2) : "ไม่กำหนด"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <GraduationCap className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">สถานะผู้สมัคร</p>
              <p className="font-medium text-foreground text-sm leading-tight">{displayStatus}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <School className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">วุฒิที่รับสมัคร</p>
              <p className="font-medium text-foreground text-sm leading-tight">{displayType}</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default function AdmissionDetailPage() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDetail = async () => {
      const { data: progData, error } = await supabase
        .from('PROGRAMS')
        .select(`
          id,
          prog_name,
          DEPARTMENTS (
            dept_name,
            FACULTIES ( faculty_name )
          ),
          ADMISSION_CRITERIA (
            id,
            tcas_round,
            max_seats,
            min_gpax,
            academic_year,
            edu_status_req,
            ADMISSION_PROJECTS ( project_name )
          )
        `)
        .eq('id', id)
        .single()
      
      if (!error && progData) setData(progData)
      setLoading(false)
    }
    fetchDetail()
  }, [id])

  if (loading) return <div className="p-12 text-center text-muted-foreground">กำลังโหลดข้อมูล...</div>
  if (!data) return <div className="p-12 text-center text-red-500">ไม่พบข้อมูลสาขาวิชานี้</div>

  const facultyName = data.DEPARTMENTS?.FACULTIES?.faculty_name
  const deptName = data.DEPARTMENTS?.dept_name

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
      <Link to="/admission" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> กลับหน้ารวมเกณฑ์รับสมัคร
      </Link>

      <div className="mb-8 flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Building2 className="h-4 w-4" /> {facultyName}</span>
          <span className="text-border">/</span>
          <span className="flex items-center gap-1"><Layers className="h-4 w-4" /> {deptName}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5"><BookOpen className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="font-[family-name:var(--font-poppins)] text-2xl font-bold text-foreground md:text-3xl">
              {data.prog_name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              เปิดรับสมัครทั้งหมด {data.ADMISSION_CRITERIA?.length || 0} รอบ
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8 h-[1px] w-full bg-border" />

      <h2 className="mb-4 font-[family-name:var(--font-poppins)] text-lg font-semibold text-foreground">
        รอบที่เปิดรับสมัคร
      </h2>

      <div className="flex flex-col gap-4">
        {data.ADMISSION_CRITERIA?.length > 0 ? (
          data.ADMISSION_CRITERIA.map((round) => <RoundCard key={round.id} round={round} />)
        ) : (
          <p className="text-muted-foreground text-sm">ยังไม่มีการกำหนดเกณฑ์รับสมัครสำหรับสาขาวิชานี้</p>
        )}
      </div>

      <div className="mt-8">
        <Link to="/apply">
          <button className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90 md:w-auto">
            ไปที่หน้าสมัครเรียน
          </button>
        </Link>
      </div>
    </div>
  )
}