"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Search, ChevronDown, ChevronRight, Building2, Layers, BookOpen, ArrowRight } from "lucide-react"

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("th-TH", { 
    day: "numeric", 
    month: "short", 
    year: "2-digit" 
  });
};

function MajorLink({ major }) {
  // เรียงลำดับรอบจากน้อยไปมาก (รอบ 1 -> 4)
  const sortedCriteria = major.ADMISSION_CRITERIA?.sort((a, b) => a.tcas_round - b.tcas_round) || [];

  return (
    <Link
      href={`/admission/${major.id}`}
      className="group flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/30 hover:bg-primary/5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">{major.prog_name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-transparent bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80">
            {sortedCriteria.length} รอบ
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </div>
      </div>

      {sortedCriteria.length > 0 && (
        <div className="flex flex-col gap-1 pl-6 border-t border-border/50 pt-2">
          {sortedCriteria.map((criteria) => (
            <div key={criteria.id} className="text-xs text-muted-foreground flex items-center gap-2">
               <span className="font-medium text-primary/80">รอบ {criteria.tcas_round} :</span> 
              <span>
                {criteria.start_date && criteria.end_date 
                  ? `${formatDate(criteria.start_date)} - ${formatDate(criteria.end_date)}`
                  : "ยังไม่ประกาศวันที่"}
              </span>
             </div>
          ))}
        </div>
      )}
    </Link>
  )
}

function FacultyCard({ faculty }) {
  const [isOpen, setIsOpen] = useState(false)
  const [imgError, setImgError] = useState(false) 
  
  const totalRounds = faculty.DEPARTMENTS.reduce((sum, dept) => {
    return sum + dept.PROGRAMS.reduce((pSum, prog) => pSum + (prog.ADMISSION_CRITERIA?.length || 0), 0)
  }, 0)

  const publicUrl = `/logos/faculties/${faculty.id}.png`;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-muted/50"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10">
            {!imgError ? (
              <img 
                src={publicUrl} 
                alt={`${faculty.faculty_name} logo`} 
                className="h-full w-full object-contain p-1" 
                onError={() => setImgError(true)}
              />
            ) : (
              <Building2 className="h-6 w-6 text-primary" />
            )}
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-poppins)] text-lg font-semibold text-foreground">
              {faculty.faculty_name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {faculty.DEPARTMENTS.length} ภาควิชา • เปิดรับรวม {totalRounds} รอบ
            </p>
          </div>
        </div>
        <div className={`rounded-full p-2 transition-transform duration-200 ${isOpen ? "rotate-180 bg-muted" : "hover:bg-muted"}`}>
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-border bg-muted/10 p-6">
          <div className="flex flex-col gap-6">
             {faculty.DEPARTMENTS.map((dept) => (
              <div key={dept.id} className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-foreground">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-medium">{dept.dept_name}</h3>
                 </div>
                <div className="grid gap-2 pl-6 sm:grid-cols-2 lg:grid-cols-3">
                  {dept.PROGRAMS.map((major) => (
                    <MajorLink key={major.id} major={major} />
                  ))}
                 </div>
               </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdmissionPage() {
  const [search, setSearch] = useState("")
  const [facultiesDB, setFacultiesDB] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFaculties = async () => {
      try {
        const [acadRes, critRes] = await Promise.all([
          fetch('/api/academic'),
          fetch('/api/criteria')
        ]);
        
        if (acadRes.ok && critRes.ok) {
          const faculties = await acadRes.json();
          const criteria = await critRes.json();
          
          faculties.forEach(f => {
            f.DEPARTMENTS.forEach(d => {
              d.PROGRAMS.forEach(p => {
                p.ADMISSION_CRITERIA = criteria.filter(c => c.program_id === p.id);
              });
            });
          });
          
          setFacultiesDB(faculties);
        }
      } catch (error) {
        console.error("Error fetching admission data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchFaculties()
  }, [])

  const filtered = useMemo(() => {
    if (!search) return facultiesDB
    const lowerSearch = search.toLowerCase()
    return facultiesDB.filter((faculty) => {
      const matchFaculty = faculty.faculty_name.toLowerCase().includes(lowerSearch)
      const matchDept = faculty.DEPARTMENTS.some((d) => d.dept_name.toLowerCase().includes(lowerSearch))
      const matchProg = faculty.DEPARTMENTS.some((d) => 
        d.PROGRAMS.some((p) => p.prog_name.toLowerCase().includes(lowerSearch))
      )
      return matchFaculty || matchDept || matchProg
    })
  }, [search, facultiesDB])

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="font-[family-name:var(--font-poppins)] text-3xl font-bold tracking-tight text-foreground md:text-4xl">
           เกณฑ์การรับสมัคร
        </h1>
        <p className="text-muted-foreground">ค้นหาคณะ ภาควิชา และสาขาวิชาเพื่อดูเกณฑ์การรับสมัครของมหาวิทยาลัย</p>
       </div>

      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="ค้นหาคณะ, ภาควิชา, หรือสาขาวิชา..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

       <div className="flex flex-col gap-4">
        {loading ? (
          <p className="text-center text-muted-foreground">กำลังโหลดข้อมูล...</p>
        ) : filtered.length > 0 ? (
          filtered.map((faculty) => <FacultyCard key={faculty.id} faculty={faculty} />)
        ) : (
          <div className="rounded-xl border border-border bg-card p-12 text-center text-card-foreground">
            <Search className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-50" />
            <h3 className="font-semibold">ไม่พบข้อมูล</h3>
            <p className="text-sm text-muted-foreground">ลองใช้คำค้นหาอื่น</p>
          </div>
        )}
      </div>
    </div>
  )
}
