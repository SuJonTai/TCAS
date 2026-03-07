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
  
  const [selectedRound, setSelectedRound] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [selectedProgram, setSelectedProgram] = useState(""); 
  const [schoolName, setSchoolName] = useState("");
  
  // File States
  const [portfolioFile, setPortfolioFile] = useState(null);
  const [transcriptFile, setTranscriptFile] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const userId = localStorage.getItem("user_id");
      const savedSchool = localStorage.getItem("user_high_school");
      if (savedSchool) setSchoolName(savedSchool);

      if (!userId) return;

      const { data: userData } = await supabase
        .from('USERS')
        .select('gpax_5_term, current_level')
        .eq('id', userId)
        .single();
      if (userData) setUserProfile(userData);

      const { data: facData } = await supabase.from('FACULTIES').select(`id, faculty_name, DEPARTMENTS (id, dept_name, PROGRAMS (id, prog_name))`);
      const { data: critData } = await supabase.from('ADMISSION_CRITERIA').select('*');
      
      setFacultiesDB(facData || []);
      setCriteriaDB(critData || []);
    };
    fetchData();
  }, []);

  const validProgramIds = useMemo(() => {
    if (!selectedRound) return [];
    return criteriaDB.filter(c => c.tcas_round.toString() === selectedRound).map(c => c.program_id);
  }, [selectedRound, criteriaDB]);

  const availableFaculties = useMemo(() => {
    if (!selectedRound) return [];
    return facultiesDB.filter(f => f.DEPARTMENTS?.some(d => d.PROGRAMS?.some(p => validProgramIds.includes(p.id))));
  }, [facultiesDB, validProgramIds, selectedRound]);

  const availablePrograms = useMemo(() => {
    if (!selectedFaculty || !selectedRound) return [];
    const faculty = facultiesDB.find(f => f.id.toString() === selectedFaculty);
    return faculty?.DEPARTMENTS?.flatMap(d => d.PROGRAMS.map(p => ({ id: p.id, name: p.prog_name }))).filter(p => validProgramIds.includes(p.id)) || [];
  }, [selectedFaculty, facultiesDB, validProgramIds, selectedRound]);

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
      if (!userProfile?.gpax_5_term) throw new Error("กรุณาระบุ GPAX ในหน้าข้อมูลการศึกษาก่อนสมัคร");
      if (!transcriptFile) throw new Error("กรุณาอัปโหลดไฟล์ระเบียนแสดงผลการเรียน (Transcript)");

      const matchingCriteria = criteriaDB.find(
        (c) => c.tcas_round.toString() === selectedRound && c.program_id.toString() === selectedProgram
      );

      if (userProfile.gpax_5_term < matchingCriteria.min_gpax) {
        throw new Error(`เกรดของคุณ (${userProfile.gpax_5_term}) ไม่ถึงเกณฑ์ขั้นต่ำของสาขานี้ (${matchingCriteria.min_gpax})`);
      }

      // Upload both files
      const [portfolioUrl, transcriptUrl] = await Promise.all([
        uploadFile(portfolioFile, 'portfolios'),
        uploadFile(transcriptFile, 'transcripts')
      ]);

      const { error: insertError } = await supabase
        .from('APPLICATION')
        .insert([{
          user_id: parseInt(userId),
          criteria_id: matchingCriteria.id,
          high_school: schoolName,
          gpax: userProfile.gpax_5_term,
          status: 'pending',
          portfolio_url: portfolioUrl,
          transcript_url: transcriptUrl // Ensure this column exists in your APPLICATION table
        }]);

      if (insertError) throw insertError;
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
          <div>
            <label className="block text-sm font-semibold mb-1">โรงเรียนที่จบการศึกษา</label>
            <div className="relative">
              <School className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                className="w-full pl-10 p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="ระบุชื่อโรงเรียน"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">รอบที่สมัคร</label>
              <select value={selectedRound} onChange={(e) => setSelectedRound(e.target.value)} className="w-full p-2 border rounded-lg outline-none" required>
                <option value="">เลือก...</option>
                {rounds.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">คณะ</label>
              <select value={selectedFaculty} onChange={(e) => setSelectedFaculty(e.target.value)} className="w-full p-2 border rounded-lg outline-none" disabled={!selectedRound} required>
                <option value="">เลือก...</option>
                {availableFaculties.map(f => <option key={f.id} value={f.id}>{f.faculty_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">สาขา</label>
              <select value={selectedProgram} onChange={(e) => setSelectedProgram(e.target.value)} className="w-full p-2 border rounded-lg outline-none" disabled={!selectedFaculty} required>
                <option value="">เลือก...</option>
                {availablePrograms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
                  <p className="text-xs text-gray-500">
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
                  <p className="text-xs text-gray-500">
                    {portfolioFile ? portfolioFile.name : "เลือกไฟล์แฟ้มสะสมผลงาน (ถ้ามี)"}
                  </p>
                </label>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full py-4 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
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
            <button onClick={() => window.location.href = '/'} className="w-full py-2 bg-primary text-white rounded-lg font-semibold">ปิดหน้าต่างนี้</button>
          </div>
        </div>
      )}
    </div>
  );
}