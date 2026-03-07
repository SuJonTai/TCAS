// --- Imports ---
import { useState, useEffect, useMemo, useCallback } from "react";
import { Upload, FileText, X, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

// --- Application Rounds Data ---
const rounds = [
  { value: "1", label: "รอบที่ 1 - Portfolio" },
  { value: "2", label: "รอบที่ 2 - Quota" },
  { value: "3", label: "รอบที่ 3 - Admission" },
  { value: "4", label: "รอบที่ 4 - Direct Admission" },
];

const studyPlans = ["วิทย์-คณิต", "ศิลป์–คำนวณ", "ศิลป์-ภาษา", "ศิลป์-สังคม", "อื่นๆ"];

// --- Helper Icon Component ---
function ChevronDownIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

// --- Main Component: Application Form ---
export default function ApplicationForm() {
  // Database States
  const [facultiesDB, setFacultiesDB] = useState([]);
  const [criteriaDB, setCriteriaDB] = useState([]); 
  
  // Form States
  const [selectedRound, setSelectedRound] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedProgram, setSelectedProgram] = useState(""); 
  const [schoolName, setSchoolName] = useState(""); // Changed from education
  const [studyPlan, setStudyPlan] = useState("");
  const [grade, setGrade] = useState("");
  const [studyPlanOther, setStudyPlanOther] = useState("");
  
  // File Upload States
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Submission States
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // --- 1. Fetch Data from Supabase (Faculties & Criteria) ---
  useEffect(() => {
    const fetchData = async () => {
      // Fetch Faculties, Departments, and Programs
      const { data: facData } = await supabase
        .from('FACULTIES')
        .select(`
          id, 
          faculty_name, 
          DEPARTMENTS (
            id, 
            dept_name, 
            PROGRAMS (id, prog_name)
          )
        `);
      
      if (facData) setFacultiesDB(facData);

      // Fetch active criteria to map rounds to programs
      const { data: critData } = await supabase
        .from('ADMISSION_CRITERIA')
        .select('id, tcas_round, program_id, min_gpax');
      
      if (critData) setCriteriaDB(critData);
    };
    fetchData();
  }, []);

  // --- 2. Cascade Logic (Round -> Faculty -> Program) ---
  
  // Get all valid program IDs for the selected round
  const validProgramIds = useMemo(() => {
    if (!selectedRound) return [];
    return criteriaDB
      .filter((c) => c.tcas_round.toString() === selectedRound)
      .map((c) => c.program_id);
  }, [selectedRound, criteriaDB]);

  // Filter faculties that actually have open programs for the selected round
  const availableFaculties = useMemo(() => {
    if (!selectedRound || validProgramIds.length === 0) return [];
    return facultiesDB.filter((faculty) => {
      return faculty.DEPARTMENTS?.some((dept) =>
        dept.PROGRAMS?.some((prog) => validProgramIds.includes(prog.id))
      );
    });
  }, [facultiesDB, validProgramIds, selectedRound]);

  // Filter programs belonging to the selected faculty AND open in the selected round
  const availablePrograms = useMemo(() => {
    if (!selectedFaculty || !selectedRound) return [];
    
    const faculty = facultiesDB.find((f) => f.id.toString() === selectedFaculty);
    if (!faculty || !faculty.DEPARTMENTS) return [];
    
    const allFacultyPrograms = faculty.DEPARTMENTS.flatMap((d) =>
      d.PROGRAMS.map((p) => ({ id: p.id, name: p.prog_name }))
    );

    return allFacultyPrograms.filter((p) => validProgramIds.includes(p.id));
  }, [selectedFaculty, facultiesDB, validProgramIds, selectedRound]);

  // Handle resets when parent dropdowns change
  const handleRoundChange = (e) => {
    setSelectedRound(e.target.value);
    setSelectedFaculty(""); 
    setSelectedProgram(""); 
  };

  const handleFacultyChange = (e) => {
    setSelectedFaculty(e.target.value);
    setSelectedProgram(""); 
  };

  // --- Drag & Drop Handlers ---
  const handleDragOver = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
  }, []);
  const handleFileChange = (e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); };

  // --- 3. Submission Handler ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const userId = localStorage.getItem("user_id"); 
      if (!userId) throw new Error("ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่");

      // Find the specific Criteria ID directly from state
      const matchingCriteria = criteriaDB.find(
        (c) => c.tcas_round.toString() === selectedRound && c.program_id.toString() === selectedProgram
      );

      if (!matchingCriteria) {
        throw new Error("ยังไม่เปิดรับสมัครในรอบและสาขานี้ (ไม่พบ Criteria)");
      }

      // Check GPAX against minimum required GPAX before uploading
      if (matchingCriteria.min_gpax && parseFloat(grade) < matchingCriteria.min_gpax) {
        throw new Error(`เกรดของคุณไม่ถึงเกณฑ์ขั้นต่ำ (เกณฑ์: ${matchingCriteria.min_gpax})`);
      }

      let savedFilePath = null;

      if (file) {
        const fileExtension = file.name.split('.').pop();
        const fileName = `${userId}_${Date.now()}.${fileExtension}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('portfolios') 
          .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (uploadError) throw new Error("อัปโหลดไฟล์ไม่สำเร็จ: " + uploadError.message);
        savedFilePath = uploadData.path;
      }

      const finalStudyPlan = studyPlan === "อื่นๆ" ? studyPlanOther : studyPlan;

      // Insert Application
      const { error: insertError } = await supabase
        .from('APPLICATION')
        .insert([{
          user_id: parseInt(userId),
          criteria_id: matchingCriteria.id,
          study_plan: finalStudyPlan,
          high_school: schoolName, // Updated to use schoolName state
          gpax: parseFloat(grade),
          status: 'pending', 
          portfolio_url: savedFilePath
        }]);

      if (insertError) throw insertError;
      setShowSuccess(true);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedRound(""); setSelectedFaculty(""); setSelectedProgram("");
    setStudyPlan(""); setSchoolName(""); setGrade(""); setStudyPlanOther("");
    setFile(null); setShowSuccess(false); setErrorMessage("");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
      <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        
        <div className="flex flex-col space-y-1.5 p-6">
          <h3 className="font-[family-name:var(--font-poppins)] text-xl font-bold tracking-tight text-foreground">
            แบบฟอร์มสมัครเรียน
          </h3>
          <p className="text-sm text-muted-foreground">
            กรอกข้อมูลด้านล่างเพื่อส่งใบสมัคร TCAS ของคุณ
          </p>
        </div>

        <div className="p-6 pt-0">
          {errorMessage && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-200">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            
            {/* 1. TCAS Round */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium leading-none">รอบการรับสมัคร <span className="text-red-500">*</span></label>
              <div className="relative">
                <select value={selectedRound} onChange={handleRoundChange} className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                  <option value="" disabled>1. เลือกรอบการรับสมัคร</option>
                  {rounds.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <ChevronDownIcon className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
              </div>
            </div>

            {/* 2. Faculty */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium leading-none">คณะ <span className="text-red-500">*</span></label>
              <div className="relative">
                <select value={selectedFaculty} onChange={handleFacultyChange} disabled={!selectedRound} className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50" required>
                  <option value="" disabled>{selectedRound ? (availableFaculties.length > 0 ? "2. เลือกคณะ" : "ไม่มีคณะที่เปิดรับในรอบนี้") : "กรุณาเลือกรอบการรับสมัครก่อน"}</option>
                  {availableFaculties.map((f) => <option key={f.id} value={f.id}>{f.faculty_name}</option>)}
                </select>
                <ChevronDownIcon className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
              </div>
            </div>

            {/* 3. Program */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium leading-none">สาขาวิชา <span className="text-red-500">*</span></label>
              <div className="relative">
                <select value={selectedProgram} onChange={(e) => setSelectedProgram(e.target.value)} disabled={!selectedFaculty} className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50" required>
                  <option value="" disabled>{selectedFaculty ? (availablePrograms.length > 0 ? "3. เลือกสาขาวิชา" : "ไม่มีสาขาที่เปิดรับในรอบนี้") : "กรุณาเลือกคณะก่อน"}</option>
                  {availablePrograms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <ChevronDownIcon className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
              </div>
            </div>

            {/* School Name */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium leading-none">ชื่อโรงเรียน <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                placeholder="ระบุชื่อโรงเรียนของคุณ" 
                value={schoolName} 
                onChange={(e) => setSchoolName(e.target.value)} 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                required 
              />
            </div>

            {/* GPAX */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium leading-none">GPAX <span className="text-red-500">*</span></label>
              <input value={grade} onChange={(e) => { const num = parseFloat(e.target.value); if (e.target.value === "") setGrade(""); else if (!Number.isNaN(num)) setGrade(Math.max(0, Math.min(4, num)).toFixed(2)); }} type="number" max="4.0" min="0.0" step="0.01" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required />
            </div>

            {/* Study Plan */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium leading-none">แผนการเรียนปัจจุบัน <span className="text-red-500">*</span></label>
              <div className="relative">
                <select value={studyPlan} onChange={(e) => { setStudyPlan(e.target.value); if (e.target.value !== "อื่นๆ") setStudyPlanOther(""); }} className="flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                  <option value="" disabled>เลือกแผนการเรียน</option>
                  {studyPlans.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
                </select>
                <ChevronDownIcon className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
              </div>
              {studyPlan === "อื่นๆ" && (
                <input type="text" placeholder="ระบุแผนการเรียนของคุณ" value={studyPlanOther} onChange={(e) => setStudyPlanOther(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2" required />
              )}
            </div>

            {/* File Upload */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium leading-none">อัปโหลดแฟ้มสะสมผลงาน (Portfolio)</label>
              <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:border-primary/40"}`}>
                {file ? (
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div><p className="text-sm font-medium text-foreground">{file.name}</p></div>
                    <button type="button" onClick={() => setFile(null)} className="ml-2 rounded-full p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground/60" />
                    <p className="text-sm text-muted-foreground">ลากและวางไฟล์ portfolio ของคุณที่นี่ หรือ <label className="cursor-pointer font-medium text-primary hover:underline">เลือกไฟล์<input type="file" accept="application/pdf" className="sr-only" onChange={handleFileChange} /></label></p>
                  </>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button type="submit" disabled={loading || !selectedRound || !selectedFaculty || !selectedProgram || !schoolName || !studyPlan || !grade} className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {loading ? "กำลังส่งข้อมูล..." : "ยืนยันการสมัคร"}
            </button>
          </form>
        </div>
      </div>

      {/* Success Dialog Modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border bg-card p-6 text-card-foreground shadow-lg">
            <div className="flex flex-col items-center space-y-1.5 text-center">
              <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-lg font-semibold">ส่งใบสมัครสำเร็จ</h2>
              <p className="text-sm text-muted-foreground">ระบบได้รับใบสมัครของคุณเรียบร้อยแล้ว</p>
            </div>
            <button onClick={resetForm} className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">กลับไปหน้าฟอร์ม</button>
          </div>
        </div>
      )}
    </div>
  );
}