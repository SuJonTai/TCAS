import { useState, useEffect, useMemo } from "react";
import { CheckCircle2, AlertCircle, FileText, School, Upload, FileCheck } from "lucide-react";

// 1. 👈 นำ useDatabase กลับมาใช้
import { useDatabase } from "@/context/DatabaseContext"; 
import { fetchApplyPreData, submitApplication } from "@/services/apiService"; 

const rounds = [
  { value: "1", label: "รอบที่ 1 - Portfolio" },
  { value: "2", label: "รอบที่ 2 - Quota" },
  { value: "3", label: "รอบที่ 3 - Admission" },
  { value: "4", label: "รอบที่ 4 - Direct Admission" },
];

export default function Apply() {
  const { dbType } = useDatabase(); // 2. 👈 ดึง dbType ปัจจุบัน
  const [facultiesDB, setFacultiesDB] = useState([]);
  const [criteriaDB, setCriteriaDB] = useState([]); 
  const [userProfile, setUserProfile] = useState(null);
  
  // --- Form States ---
  const [selectedRound, setSelectedRound] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
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
        // 3. 👈 ใช้ dbType แทนการ Hardcode
        const data = await fetchApplyPreData(dbType, userId);
        
        setUserProfile(data.user || null);
        setFacultiesDB(data.faculties || []);
        setCriteriaDB(data.criteria || []);

      } catch (error) {
        console.error("Error fetching data:", error);
        setErrorMessage("เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณารีเฟรชหน้าเว็บ");
      }
    };
    fetchData();
  }, [dbType]); // 👈 เพิ่ม dbType กลับเข้า dependency array

  // ==========================================
  // CASCADING DROPDOWN LOGIC
  // ==========================================
  const availableADMISSION_Projects = useMemo(() => {
    if (!selectedRound || !criteriaDB.length) return [];
    const criteriaForRound = criteriaDB.filter(c => c.tcas_round?.toString() === selectedRound);
    
    const projectMap = new Map();
    criteriaForRound.forEach(c => {
      if (c.project_id && !projectMap.has(c.project_id)) {
        projectMap.set(c.project_id, {
          id: c.project_id,
          name: c.ADMISSION_PROJECTS?.project_name || `โครงการ ${c.project_id}`
        });
      }
    });
    return Array.from(projectMap.values());
  }, [selectedRound, criteriaDB]);

  const validProgramIds = useMemo(() => {
    if (!selectedRound || !selectedProject) return [];
    return criteriaDB
      .filter(c => 
        c.tcas_round?.toString() === selectedRound && 
        c.project_id?.toString() === selectedProject
      )
      .map(c => c.program_id);
  }, [selectedRound, selectedProject, criteriaDB]);

  const availableFaculties = useMemo(() => {
    if (!validProgramIds.length) return [];
    return facultiesDB.filter(f => 
      f.DEPARTMENTS?.some(d => 
        d.PROGRAMS?.some(p => validProgramIds.includes(p.id))
      )
    );
  }, [facultiesDB, validProgramIds]);

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
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const userId = localStorage.getItem("user_id");
      if (!userId) throw new Error("ไม่พบข้อมูลผู้ใช้งาน กรุณาล็อกอินใหม่");
      if (!userProfile?.gpax_5_term) throw new Error("กรุณาระบุ GPAX ในหน้าข้อมูลการศึกษาก่อนสมัคร");
      if (!transcriptFile) throw new Error("กรุณาอัปโหลดไฟล์ Transcript (PDF)");

      const matchingCriteria = criteriaDB.find(
        (c) => c.tcas_round?.toString() === selectedRound && 
               c.program_id?.toString() === selectedProgram &&
               c.project_id?.toString() === selectedProject
      );

      if (!matchingCriteria) throw new Error("ไม่พบเกณฑ์การรับสมัครที่เลือก");

      const formData = new FormData();
      formData.append("user_id", userId);
      formData.append("criteria_id", matchingCriteria.id);
      formData.append("gpax", userProfile.gpax_5_term);
      formData.append("transcript", transcriptFile); 
      if (portfolioFile) {
        formData.append("portfolio", portfolioFile); 
      }

      // 4. 👈 เปลี่ยนกลับมาใช้ dbType การรับไฟล์ FormData ใช้งานกับ SQL Server ได้ปกติครับ!
      await submitApplication(dbType, formData);

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
                  setSelectedProject(""); 
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
                  setSelectedFaculty(""); 
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
                  setSelectedProgram(""); 
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