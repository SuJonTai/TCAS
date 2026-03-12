"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { 
  ArrowLeft, BookOpen, Users, ClipboardCheck, 
  Building2, Layers, GraduationCap, School, Calendar, Target
} from "lucide-react"

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("th-TH", { 
    day: "numeric", 
    month: "short", 
    year: "2-digit" 
  });
};

function RoundCard({ round }) {
  let reqs = []
  const rawReqs = round.edu_status_req

  if (Array.isArray(rawReqs)) {
    reqs = rawReqs
  } else if (typeof rawReqs === 'string') {
    try { reqs = JSON.parse(rawReqs) } 
    catch(e) { reqs = rawReqs.split(',').map(item => item.trim()) }
  }

  const requiredStatuses = reqs.filter(r => ["studying", "graduated"].includes(r))
  const requiredTypes = reqs.filter(r => ["high-school", "vocational", "high-vocational"].includes(r))

  const statusMap = {
    "studying": "กำลังศึกษา",
    "graduated": "สำเร็จการศึกษา"
  }
  const typeMap = {
    "high-school": "ม.ปลาย",
    "vocational": "ปวช.",
    "high-vocational": "ปวส."
  }

  const displayStatus = requiredStatuses.length > 0 
    ? requiredStatuses.map(s => statusMap[s]).join(" หรือ ") 
    : "ไม่กำหนด"

  const displayType = requiredTypes.length > 0 
    ? requiredTypes.map(t => typeMap[t]).join(", ") 
    : "ไม่กำหนด"

  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
      <div className="flex flex-col space-y-2 p-6 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
            รอบที่ {round.tcas_round}
          </span>
          <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-semibold text-foreground">
            {round.ADMISSION_PROJECTS?.project_name || "โครงการรับตรง"}
          </span>
        </div>
        
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
          <Calendar className="h-4 w-4 text-primary/70" />
          <span>
            {round.start_date && round.end_date 
              ? `${formatDate(round.start_date)} - ${formatDate(round.end_date)}`
              : "ยังไม่ประกาศวันที่รับสมัคร"}
          </span>
        </div>
      </div>

      <div className="p-6 pt-3">
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

        {round.CRITERIA_SUBJECTS && round.CRITERIA_SUBJECTS.length > 0 && (
          <div className="mt-5 border-t border-border pt-4">
             <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Target className="h-4 w-4 text-primary" />
              เกณฑ์คะแนนสอบที่ใช้พิจารณา
             </h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
               {round.CRITERIA_SUBJECTS.map((sub, idx) => (
                <div key={idx} className="flex flex-col justify-center rounded-md border border-border bg-background p-3 text-sm shadow-sm">
                   <span className="font-medium text-foreground line-clamp-1" title={sub.SUBJECTS?.subject_name}>
                    {sub.SUBJECTS?.subject_name}
                  </span>
                   <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-2">
                     <span className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider">ขั้นต่ำ</span>
                      <span className="font-medium text-foreground">{sub.min_score > 0 ? sub.min_score : "-"}</span>
                    </span>
                     <span className="flex flex-col text-right">
                       <span className="text-[10px] uppercase tracking-wider">ค่าน้ำหนัก</span>
                      <span className="font-medium text-primary">{sub.weight}%</span>
                    </span>
                   </div>
                </div>
               ))}
            </div>
           </div>
        )}

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
      try {
        const [acadRes, critRes, subRes] = await Promise.all([
          fetch('/api/academic'),
          fetch('/api/criteria'),
          fetch('/api/academic/subject')
        ]);
        
        if (acadRes.ok && critRes.ok && subRes.ok) {
          const faculties = await acadRes.json();
          const allCriteria = await critRes.json();
          const allSubjects = await subRes.json();

          // Find the specific program and its parents
          let targetProgram = null;
          let targetDept = null;
          let targetFaculty = null;

          // We accept 'id' from URL parameters. It could be string _id or numeric id depending on data source.
          for (const f of faculties) {
             for (const d of f.DEPARTMENTS) {
                const foundProg = d.PROGRAMS.find(p => String(p.id) === String(id) || String(p._id) === String(id));
                if (foundProg) {
                   targetProgram = foundProg;
                   targetDept = d;
                   targetFaculty = f;
                   break;
                }
             }
             if (targetProgram) break;
          }

          if (targetProgram) {
            // Map the criteria for this program
            const progCriteria = allCriteria.filter(c => String(c.program_id) === String(targetProgram.id) || String(c.PROGRAM?._id) === String(targetProgram._id || targetProgram.id));
            
            // Map subjects into criteria
            progCriteria.forEach(c => {
               if (c.CRITERIA_SUBJECTS && Array.isArray(c.CRITERIA_SUBJECTS)) {
                 c.CRITERIA_SUBJECTS.forEach(cs => {
                    const matchedSub = allSubjects.find(s => s.id === cs.subject_id || String(s._id) === String(cs.subject_id));
                    cs.SUBJECTS = { subject_name: matchedSub ? matchedSub.subject_name : "วิชาที่ถูกลบ" };
                 });
               }
            });
            
            progCriteria.sort((a, b) => a.tcas_round - b.tcas_round);
            
            // Structure it back to match the component's expectations
            const reconstructedData = {
               ...targetProgram,
               DEPARTMENTS: {
                  ...targetDept,
                  FACULTIES: targetFaculty
               },
               ADMISSION_CRITERIA: progCriteria
            };
            
            setData(reconstructedData);
          }
        }
      } catch (error) {
         console.error("Error fetching detail:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDetail()
  }, [id])

  if (loading) return <div className="p-12 text-center text-muted-foreground">กำลังโหลดข้อมูล...</div>
  if (!data) return <div className="p-12 text-center text-red-500">ไม่พบข้อมูลสาขาวิชานี้</div>

  const facultyName = data.DEPARTMENTS?.FACULTIES?.faculty_name
  const deptName = data.DEPARTMENTS?.dept_name

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
      <Link href="/admission" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
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
        <Link href="/apply">
           <button className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground hover:bg-primary/90 md:w-auto">
             ไปที่หน้าสมัครเรียน
          </button>
        </Link>
       </div>
    </div>
  )
}
