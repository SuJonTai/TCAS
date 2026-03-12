"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Search, Shield } from "lucide-react"
import { supabase } from "@/lib/supabase"

function ChevronDownIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export default function StaffSearchForm() {
  const router = useRouter()
  
  const [selectedRound, setSelectedRound] = useState("")
  const [selectedFaculty, setSelectedFaculty] = useState("")
  const [selectedProgram, setSelectedProgram] = useState("")
  
  const [facultiesDB, setFacultiesDB] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase.from('FACULTIES').select(`
        id, faculty_name, DEPARTMENTS ( id, PROGRAMS ( id, prog_name ) )
      `)
      if (!error && data) setFacultiesDB(data)
      setLoading(false)
    }
    fetchData()
  }, [])

  const availablePrograms = useMemo(() => {
    if (!selectedFaculty) return []
    const faculty = facultiesDB.find(f => f.id.toString() === selectedFaculty)
    if (!faculty) return []
    return faculty.DEPARTMENTS.flatMap((d) => d.PROGRAMS)
  }, [selectedFaculty, facultiesDB])

  const handleSearch = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (selectedRound) params.append("round", selectedRound)
    if (selectedFaculty) params.append("faculty_id", selectedFaculty)
    if (selectedProgram) params.append("program_id", selectedProgram)

    router.push(`/staff/results?${params.toString()}`)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
      <div className="mb-8 flex flex-col gap-2">
         <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="font-[family-name:var(--font-poppins)] text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            ระบบจัดการผู้สมัคร
          </h1>
        </div>
        <p className="text-muted-foreground">ค้นหาและตรวจสอบสถานะการสมัครเข้าศึกษาต่อ (สำหรับเจ้าหน้าที่)</p>
       </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 font-[family-name:var(--font-poppins)] text-lg font-semibold text-foreground">
          ค้นหาผู้สมัคร
        </h2>

         {loading ? (
          <p className="text-sm text-muted-foreground">กำลังโหลดข้อมูล...</p>
        ) : (
          <form onSubmit={handleSearch} className="flex flex-col gap-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none text-foreground">
                   รอบการรับสมัคร
                </label>
                <div className="relative">
                  <select
                     value={selectedRound}
                    onChange={(e) => setSelectedRound(e.target.value)}
                    className="flex h-10 w-full appearance-none items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                     <option value="">ทุกรอบ</option>
                    {[1, 2, 3, 4].map(r => <option key={r} value={r}>รอบที่ {r}</option>)}
                  </select>
                  <ChevronDownIcon className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none text-foreground" />
                </div>
              </div>

               <div className="space-y-2">
                <label className="text-sm font-medium leading-none text-foreground">
                  คณะ
                </label>
                <div className="relative">
                   <select
                    value={selectedFaculty}
                    onChange={(e) => {
                      setSelectedFaculty(e.target.value)
                       setSelectedProgram("") 
                    }}
                    className="flex h-10 w-full appearance-none items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                     <option value="">ทุกคณะ</option>
                    {facultiesDB.map((f) => (
                      <option key={f.id} value={f.id}>{f.faculty_name}</option>
                    ))}
                  </select>
                  <ChevronDownIcon className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none text-foreground" />
                 </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none text-foreground">
                  สาขาวิชา
                </label>
                 <div className="relative">
                  <select
                    value={selectedProgram}
                    onChange={(e) => setSelectedProgram(e.target.value)}
                    disabled={!selectedFaculty}
                     className="flex h-10 w-full appearance-none items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">
                       {selectedFaculty ? "ทุกสาขาวิชา" : "กรุณาเลือกคณะก่อน"}
                    </option>
                    {availablePrograms.map((p) => (
                      <option key={p.id} value={p.id}>{p.prog_name}</option>
                    ))}
                   </select>
                  <ChevronDownIcon className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none text-foreground" />
                </div>
               </div>
            </div>

            <button type="submit" className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 md:w-fit">
              <Search className="h-4 w-4" />
              ค้นหาผู้สมัคร
             </button>
          </form>
        )}
      </div>
    </div>
   )
}
