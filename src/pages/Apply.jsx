import { useState, useEffect, useMemo } from "react";
import { CheckCircle2, AlertCircle, FileText, School, Upload, FileCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

const rounds = [
  { value: "1", label: "รอบที่ 1 - Portfolio" },
  { value: "2", label: "รอบที่ 2 - Quota" },
  { value: "3", label: "รอบที่ 3 - Admission" },
  { value: "4", label: "รอบที่ 4 - Direct Admission" },
];

export default function Apply() {
  const [facultiesDB, setFacultiesDB] = useState([]);
  const [criteriaDB, setCriteriaDB] = useState([]); 
  const [userProfile, setUserProfile] = useState(null);
  
  // --- Form States ---
  const [selectedRound, setSelectedRound] = useState("");
  const [selectedProject, setSelectedProject] = useState(""); // Stores project_id
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedProgram, setSelectedProgram] = useState(""); 
  
  // --- File States ---
  const [portfolioFile, setPortfolioFile] = useState(null);
  const [transcriptFile, setTranscriptFile] = useState(null);
  
  // --- UI States ---
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const userId = localStorage.getItem("user_id");

      if (!userId) return;

      try {
        // 1. Fetch User Profile
        const { data: userData } = await supabase
          .from('USERS')
          .select('gpax_5_term, current_level')
          .eq('id', userId)
          .single();
        if (userData) setUserProfile(userData);

        // 2. Fetch Faculties & Programs (Fixed: No trailing comma)
        const { data: facData, error: facError } = await supabase
          .from('FACULTIES')
          .select(`id, faculty_name, DEPARTMENTS (id, dept_name, PROGRAMS (id, prog_name))`);
        if (facError) throw facError;
        setFacultiesDB(facData || []);

        // 3. Fetch Criteria & Join with ADMISSION_Projects (Updated to ADMISSION_CRITERIA & project_id)
        // NOTE: Make sure 'ADMISSION_PROJECTS' matches your exact table name in Supabase!
        const { data: critData, error: critError } = await supabase
          .from('ADMISSION_CRITERIA')
          .select(`
            *,
            ADMISSION_PROJECTS (id, project_name)
          `);
        if (critError) throw critError;
        setCriteriaDB(critData || []);

      } catch (error) {
        console.error("Error fetching data:", error);
        setErrorMessage("เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณารีเฟรชหน้าเว็บ");
      }
    };
    fetchData();
  }, []);

  // ==========================================
  // CASCADING DROPDOWN LOGIC
  // ==========================================

  // 1. ADMISSION_Projects available for the selected Round
  const availableADMISSION_Projects = useMemo(() => {
    if (!selectedRound || !criteriaDB.length) return [];
    
    // Filter criteria for this round
    const criteriaForRound = criteriaDB.filter(c => c.tcas_round?.toString() === selectedRound);
    
    // Extract unique ADMISSION_projects using a Map to avoid duplicates
    const projectMap = new Map();
    criteriaForRound.forEach(c => {
      if (c.project_id && !projectMap.has(c.project_id)) {
        projectMap.set(c.project_id, {
          id: c.project_id,
          // Fallback to ID if the join fails or name is missing
          name: c.ADMISSION_PROJECTS?.project_name || `โครงการ ${c.project_id}`
        });
      }
    });
    
    return Array.from(projectMap.values());
  }, [selectedRound, criteriaDB]);

  // Helper: Get valid Program IDs based on Round AND Project
  const validProgramIds = useMemo(() => {
    if (!selectedRound || !selectedProject) return [];
    return criteriaDB
      .filter(c => 
        c.tcas_round?.toString() === selectedRound && 
        c.project_id?.toString() === selectedProject
      )
      .map(c => c.program_id);
  }, [selectedRound, selectedProject, criteriaDB]);

  // 2. Faculties available based on valid Programs
  const availableFaculties = useMemo(() => {
    if (!validProgramIds.length) return [];
    return facultiesDB.filter(f => 
      f.DEPARTMENTS?.some(d => 
        d.PROGRAMS?.some(p => validProgramIds.includes(p.id))
      )
    );
  }, [facultiesDB, validProgramIds]);

  // 3. Programs available based on Selected Faculty + valid Programs
  const availablePrograms = useMemo(() => {
    if (!selectedFaculty || !validProgramIds.length) return [];
    const faculty = facultiesDB.find(f => f.id.toString() === selectedFaculty);
    
    return faculty?.DEPARTMENTS?.flatMap(d => 
      d.PROGRAMS.map(p => ({ id: p.id, name: p.prog_name }))
    ).filter(p => validProgramIds.includes(p.id)) || [];
  }, [selectedFaculty, facultiesDB, validProgramIds]);


  // ==========================================
  // SUBMISSION LOGIC
  // ==========================================

  const uploadFile = async (file, bucket) => {
    if (!file) return "";
    const userId = localStorage.getItem("user_id");
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}_${bucket}_${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage.from(bucket).upload(fileName, file);
    if (error) throw error;
    
    return supabase.storage.from(bucket).getPublicUrl(data.path).data.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const userId = localStorage.getItem("user_id");
      if (!userId) throw new Error("ไม่พบข้อมูลผู้ใช้งาน กรุณาล็อกอินใหม่");
      if (!userProfile?.gpax_5_term) throw new Error("กรุณาระบุ GPAX ในหน้าข้อมูลการศึกษาก่อนสมัคร");
      if (!transcriptFile) throw new Error("กรุณาอัปโหลดไฟล์ Transcript (PDF)");

      // 1. Identify the exact Criteria
      const matchingCriteria = criteriaDB.find(
        (c) => c.tcas_round?.toString() === selectedRound && 
               c.program_id?.toString() === selectedProgram &&
               c.project_id?.toString() === selectedProject
      );

      if (!matchingCriteria) throw new Error("ไม่พบเกณฑ์การรับสมัครที่เลือก");

      // 2. PRE-CHECK: Prevent 409 Conflict before it happens
      const { data: existingApp, error: checkError } = await supabase
        .from('APPLICATION')
        .select('id')
        .eq('user_id', parseInt(userId))
        .eq('criteria_id', matchingCriteria.id)
        .maybeSingle(); // Returns null if no record exists

      if (checkError) throw checkError;
      if (existingApp) {
        throw new Error("คุณได้ส่งใบสมัครในสาขาและโครงการนี้ไปแล้ว");
      }

      // 3. Upload Files (Only if the application is new)
      const [portfolioUrl, transcriptUrl] = await Promise.all([
        uploadFile(portfolioFile, 'portfolios'),
        uploadFile(transcriptFile, 'transcripts')
      ]);

      // 4. Final Insert
      const { error: insertError } = await supabase
        .from('APPLICATION')
        .insert([{
          user_id: parseInt(userId),
          criteria_id: matchingCriteria.id,
          gpax: userProfile.gpax_5_term,
          status: 'pending',
          portfolio_url: portfolioUrl,
          transcript_url: transcriptUrl 
        }]);

      // Final catch for race conditions (Postgres Error 23505 = Unique Violation)
      if (insertError) {
        if (insertError.code === '23505') throw new Error("คุณได้สมัครสาขานี้ไปแล้ว");
        throw insertError;
      }

      setShowSuccess(true);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="rounded-xl border bg-white shadow-sm p-6">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <FileText className="text-primary" /> ส่งใบสมัครใหม่
        </h2>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle size={16} /> {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 font-poppins">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. ROUND */}
            <div>
              <label className="block text-sm font-semibold mb-1">รอบที่สมัคร</label>
              <select 
                value={selectedRound} 
                onChange={(e) => {
                  setSelectedRound(e.target.value);
                  setSelectedProject(""); // Clear downstream
                  setSelectedFaculty("");
                  setSelectedProgram("");
                }} 
                className="w-full p-2 border rounded-lg outline-none text-sm" 
                required
              >
                <option value="">เลือกรอบ...</option>
                {rounds.map(r => <option key={`round-${r.value}`} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            {/* 2. PROJECT */}
            <div>
              <label className="block text-sm font-semibold mb-1">โครงการ</label>
              <select 
                value={selectedProject} 
                onChange={(e) => {
                  setSelectedProject(e.target.value);
                  setSelectedFaculty(""); // Clear downstream
                  setSelectedProgram("");
                }} 
                className="w-full p-2 border rounded-lg outline-none text-sm disabled:bg-gray-50"
                disabled={!selectedRound}
                required
              >
                <option value="">เลือกโครงการ...</option>
                {availableADMISSION_Projects.map((proj) => (
                  <option key={`proj-${proj.id}`} value={proj.id}>{proj.name}</option>
                ))}
              </select>
            </div>

            {/* 3. FACULTY */}
            <div>
              <label className="block text-sm font-semibold mb-1">คณะ</label>
              <select 
                value={selectedFaculty} 
                onChange={(e) => {
                  setSelectedFaculty(e.target.value);
                  setSelectedProgram(""); // Clear downstream
                }} 
                className="w-full p-2 border rounded-lg outline-none text-sm disabled:bg-gray-50" 
                disabled={!selectedProject} 
                required
              >
                <option value="">เลือกคณะ...</option>
                {availableFaculties.map(f => <option key={`fac-${f.id}`} value={f.id}>{f.faculty_name}</option>)}
              </select>
            </div>

            {/* 4. PROGRAM */}
            <div>
              <label className="block text-sm font-semibold mb-1">สาขา</label>
              <select 
                value={selectedProgram} 
                onChange={(e) => setSelectedProgram(e.target.value)} 
                className="w-full p-2 border rounded-lg outline-none text-sm disabled:bg-gray-50" 
                disabled={!selectedFaculty} 
                required
              >
                <option value="">เลือกสาขา...</option>
                {availablePrograms.map((p) => (
                  <option key={`prog-${p.id}`} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            
          </div>

          <hr className="border-gray-100" />

          {/* File Upload Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                <FileCheck size={16} className="text-primary" /> ปพ.1 / Transcript (PDF) <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-primary/50 transition-colors text-center">
                <input 
                  type="file" 
                  accept=".pdf" 
                  onChange={(e) => setTranscriptFile(e.target.files[0])} 
                  className="hidden" 
                  id="transcript-upload"
                  required
                />
                <label htmlFor="transcript-upload" className="cursor-pointer space-y-2 block">
                  <Upload className="mx-auto text-gray-400" size={24} />
                  <p className="text-xs text-gray-500 truncate px-2">
                    {transcriptFile ? transcriptFile.name : "เลือกไฟล์ใบแสดงผลการเรียน"}
                  </p>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                <Upload size={16} className="text-primary" /> Portfolio (PDF)
              </label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-primary/50 transition-colors text-center">
                <input 
                  type="file" 
                  accept=".pdf" 
                  onChange={(e) => setPortfolioFile(e.target.files[0])} 
                  className="hidden" 
                  id="portfolio-upload"
                />
                <label htmlFor="portfolio-upload" className="cursor-pointer space-y-2 block">
                  <Upload className="mx-auto text-gray-400" size={24} />
                  <p className="text-xs text-gray-500 truncate px-2">
                    {portfolioFile ? portfolioFile.name : "เลือกไฟล์แฟ้มสะสมผลงาน (ถ้ามี)"}
                  </p>
                </label>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full py-4 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-70 disabled:cursor-not-allowed">
            {loading ? "กำลังอัปโหลดและบันทึกข้อมูล..." : "ยืนยันการสมัคร"}
          </button>
        </form>
      </div>

      {showSuccess && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-2xl max-w-xs w-full text-center shadow-2xl">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-xl font-bold text-gray-900">สำเร็จ!</h3>
            <p className="text-gray-500 mt-2 mb-6">บันทึกใบสมัครของคุณเข้าสู่ระบบแล้ว</p>
            <button onClick={() => window.location.href = '/'} className="w-full py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors">ปิดหน้าต่างนี้</button>
          </div>
        </div>
      )}
    </div>
  );
}