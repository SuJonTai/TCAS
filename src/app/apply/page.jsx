"use client"

import { useState, useEffect, useMemo } from "react";
import { CheckCircle2, AlertCircle, FileText, School, Upload, FileCheck } from "lucide-react";

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
      setLoading(true);
      try {
        const [userRes, facRes, critRes] = await Promise.all([
          fetch('/api/users/me'),
          fetch('/api/academic'),
          fetch('/api/criteria')
        ]);

        if (userRes.ok) {
           const userData = await userRes.json();
           setUserProfile(userData);
        }

        if (facRes.ok) {
           const facData = await facRes.json();
           setFacultiesDB(facData || []);
        }

        if (critRes.ok) {
           const critData = await critRes.json();
           setCriteriaDB(critData || []);
        }

      } catch (error) {
        console.error("Error fetching data:", error);
        setErrorMessage("เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณารีเฟรชหน้าเว็บ");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const availableADMISSION_Projects = useMemo(() => {
    if (!selectedRound || !criteriaDB.length) return [];
    
    const criteriaForRound = criteriaDB.filter(c => c.tcas_round?.toString() === selectedRound);
    
    const projectMap = new Map();
    criteriaForRound.forEach(c => {
      const projId = c.project_id;
      if (projId && !projectMap.has(String(projId))) {
        projectMap.set(String(projId), {
          id: String(projId),
          name: c.PROJECTS?.project_name || `โครงการ ${projId}`
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
      .map(c => String(c.program_id));
  }, [selectedRound, selectedProject, criteriaDB]);

  const availableFaculties = useMemo(() => {
    if (!validProgramIds.length) return [];
    return facultiesDB.filter(f => 
      f.DEPARTMENTS?.some(d => 
        d.PROGRAMS?.some(p => validProgramIds.includes(String(p.id)))
      )
    );
  }, [facultiesDB, validProgramIds]);

  const availablePrograms = useMemo(() => {
    if (!selectedFaculty || !validProgramIds.length) return [];
    const faculty = facultiesDB.find(f => (f._id || f.id).toString() === selectedFaculty);
    
    return faculty?.DEPARTMENTS?.flatMap(d => 
      d.PROGRAMS.map(p => ({ id: String(p.id), name: p.prog_name }))
    ).filter(p => validProgramIds.includes(p.id)) || [];
  }, [selectedFaculty, facultiesDB, validProgramIds]);

  const uploadFile = async (file, bucket) => {
    if (!file) return "";
    const userId = localStorage.getItem("user_id");
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", bucket);
    formData.append("userId", userId);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
       const err = await res.json();
       throw new Error(err.error || "Failed to upload file");
    }

    const { publicUrl } = await res.json();
    return publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      if (!userProfile?.gpax_5_term) throw new Error("กรุณาระบุ GPAX ในหน้าข้อมูลการศึกษาก่อนสมัคร");
      if (!transcriptFile) throw new Error("กรุณาอัปโหลดไฟล์ระเบียนแสดงผลการเรียน (Transcript)");

      const matchingCriteria = criteriaDB.find(
        (c) => c.tcas_round?.toString() === selectedRound && 
               c.program_id?.toString() === selectedProgram &&
               c.project_id?.toString() === selectedProject
      );

      if (!matchingCriteria) throw new Error("ไม่พบเกณฑ์การรับสมัครที่ตรงกับข้อมูลที่เลือก");

      const [portfolioUrl, transcriptUrl] = await Promise.all([
        uploadFile(portfolioFile, 'portfolios'),
        uploadFile(transcriptFile, 'transcripts')
      ]);

      const submitRes = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          criteria_id: matchingCriteria._id || matchingCriteria.id,
          gpax: userProfile.gpax_5_term,
          portfolio_url: portfolioUrl,
          transcript_url: transcriptUrl 
        })
      });

      if (!submitRes.ok) {
        const err = await submitRes.json();
         throw new Error(err.error || "Failed to submit application");
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
      <div className="rounded-xl border bg-card shadow-sm p-6">
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
                 className="w-full p-2 border rounded-lg outline-none text-sm bg-background text-foreground" 
                 required
              >
                <option value="">เลือกรอบ...</option>
                {rounds.map(r => <option key={`round-${r.value}`} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">โครงการ</label>
              <select 
                value={selectedProject} 
                onChange={(e) => {
                   setSelectedProject(e.target.value);
                  setSelectedFaculty(""); 
                  setSelectedProgram("");
                }} 
                className="w-full p-2 border rounded-lg outline-none text-sm bg-background text-foreground disabled:opacity-50"
                 disabled={!selectedRound}
                required
              >
                 <option value="">เลือกโครงการ...</option>
                {availableADMISSION_Projects.map((proj) => (
                  <option key={`proj-${proj.id}`} value={proj.id}>{proj.name}</option>
                ))}
              </select>
             </div>

            <div>
              <label className="block text-sm font-semibold mb-1">คณะ</label>
              <select 
                value={selectedFaculty} 
                onChange={(e) => {
                   setSelectedFaculty(e.target.value);
                  setSelectedProgram(""); 
                 }} 
                className="w-full p-2 border rounded-lg outline-none text-sm bg-background text-foreground disabled:opacity-50" 
                disabled={!selectedProject} 
                required
              >
                <option value="">เลือกคณะ...</option>
                {availableFaculties.map(f => <option key={`fac-${f.id}`} value={f.id}>{f.faculty_name}</option>)}
              </select>
            </div>

            <div>
               <label className="block text-sm font-semibold mb-1">สาขา</label>
              <select 
                value={selectedProgram} 
                 onChange={(e) => setSelectedProgram(e.target.value)} 
                className="w-full p-2 border rounded-lg outline-none text-sm bg-background text-foreground disabled:opacity-50" 
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

          <hr className="border-border" />

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                <FileCheck size={16} className="text-primary" /> ปพ.1 / Transcript (PDF) <span className="text-red-500">*</span>
              </label>
               <div className="border-2 border-dashed border-border rounded-xl p-4 hover:border-primary/50 transition-colors text-center">
                <input 
                  type="file" 
                  accept=".pdf" 
                  onChange={(e) => setTranscriptFile(e.target.files[0])} 
                  className="hidden" 
                  id="transcript-upload"
                  required
                />
                 <label htmlFor="transcript-upload" className="cursor-pointer space-y-2 block">
                  <Upload className="mx-auto text-muted-foreground" size={24} />
                  <p className="text-xs text-muted-foreground truncate px-2">
                    {transcriptFile ? transcriptFile.name : "เลือกไฟล์ใบแสดงผลการเรียน"}
                  </p>
                </label>
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-sm font-semibold flex items-center gap-2">
                 <Upload size={16} className="text-primary" /> Portfolio (PDF)
              </label>
              <div className="border-2 border-dashed border-border rounded-xl p-4 hover:border-primary/50 transition-colors text-center">
                <input 
                   type="file" 
                  accept=".pdf" 
                  onChange={(e) => setPortfolioFile(e.target.files[0])} 
                  className="hidden" 
                   id="portfolio-upload"
                />
                 <label htmlFor="portfolio-upload" className="cursor-pointer space-y-2 block">
                  <Upload className="mx-auto text-muted-foreground" size={24} />
                  <p className="text-xs text-muted-foreground truncate px-2">
                    {portfolioFile ? portfolioFile.name : "เลือกไฟล์แฟ้มสะสมผลงาน (ถ้ามี)"}
                  </p>
                </label>
              </div>
             </div>
          </div>

          <button type="submit" disabled={loading} className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-70 disabled:cursor-not-allowed">
            {loading ? "กำลังอัปโหลดและบันทึกข้อมูล..." : "ยืนยันการสมัคร"}
           </button>
        </form>
      </div>

       {showSuccess && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center p-4 z-50">
          <div className="bg-card p-8 rounded-2xl max-w-xs w-full text-center shadow-2xl">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary mb-4" />
             <h3 className="text-xl font-bold text-foreground">สำเร็จ!</h3>
             <p className="text-muted-foreground mt-2 mb-6">บันทึกใบสมัครของคุณเข้าสู่ระบบแล้ว</p>
            <button onClick={() => window.location.href = '/'} className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors">ปิดหน้าต่างนี้</button>
          </div>
         </div>
      )}
    </div>
  );
}
