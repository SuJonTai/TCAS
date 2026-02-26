// --- Imports ---
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Search, Shield } from "lucide-react"
import { faculties } from "@/lib/mock-data"

// --- Application Rounds Data (Thai) ---
const rounds = [
  { value: "1", label: "รอบที่ 1 - Portfolio" },
  { value: "2", label: "รอบที่ 2 - Quota" },
  { value: "3", label: "รอบที่ 3 - Admission" },
  { value: "4", label: "รอบที่ 4 - Direct Admission" },
]

// --- Helper Icon Component ---
function ChevronDownIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

// --- Main Component: Staff Search Dashboard ---
export default function StaffSearchForm() {
  const navigate = useNavigate()
  
  // Search Filters State
  const [selectedRound, setSelectedRound] = useState("")
  const [selectedFaculty, setSelectedFaculty] = useState("")
  const [selectedMajor, setSelectedMajor] = useState("")

  // Dynamically load majors based on selected faculty
  const allMajors = selectedFaculty
    ? (faculties.find((f) => f.id === selectedFaculty)?.departments ?? []).flatMap(
        (d) => d.majors.map((m) => ({ id: m.id, name: m.name }))
      )
    : []

  // --- Handlers ---
  const handleSearch = (e) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (selectedRound) params.set("round", selectedRound)
    if (selectedFaculty) params.set("faculty", selectedFaculty)
    if (selectedMajor) params.set("major", selectedMajor)
    
    // Redirect to results page with query params
    navigate(`/staff/results?${params.toString()}`)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 lg:px-8">
      
      {/* --- Section: Search Card --- */}
      <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        
        {/* Card Header */}
        <div className="flex flex-col space-y-1.5 p-6">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="font-[family-name:var(--font-poppins)] text-xl font-bold leading-none tracking-tight text-foreground">
              ค้นหาผู้สมัคร TCAS
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            ใช้ตัวกรองด้านล่างเพื่อค้นหาผู้สมัครตามรอบ คณะ และสาขาวิชา
          </p>
        </div>

        {/* Card Body & Form */}
        <div className="p-6 pt-0">
          <form onSubmit={handleSearch} className="flex flex-col gap-5">
            
            {/* Filters Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              
              {/* Filter: Round */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  รอบการรับสมัคร
                </label>
                <div className="relative">
                  <select
                    value={selectedRound}
                    onChange={(e) => setSelectedRound(e.target.value)}
                    className="flex h-10 w-full appearance-none items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">ทุกรอบการรับสมัคร</option>
                    {rounds.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <ChevronDownIcon className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
                </div>
              </div>

              {/* Filter: Faculty */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  คณะ
                </label>
                <div className="relative">
                  <select
                    value={selectedFaculty}
                    onChange={(e) => {
                      setSelectedFaculty(e.target.value)
                      setSelectedMajor("")
                    }}
                    className="flex h-10 w-full appearance-none items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">ทุกคณะ</option>
                    {faculties.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                  <ChevronDownIcon className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
                </div>
              </div>

              {/* Filter: Major */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  สาขาวิชา
                </label>
                <div className="relative">
                  <select
                    value={selectedMajor}
                    onChange={(e) => setSelectedMajor(e.target.value)}
                    disabled={!selectedFaculty}
                    className="flex h-10 w-full appearance-none items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">
                      {selectedFaculty ? "ทุกสาขาวิชา" : "กรุณาเลือกคณะก่อน"}
                    </option>
                    {allMajors.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <ChevronDownIcon className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button type="submit" className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 md:w-fit">
              <Search className="h-4 w-4" />
              ค้นหาผู้สมัคร
            </button>
            
          </form>
        </div>
      </div>
    </div>
  )
}