import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Save, GraduationCap, School, BookOpen, Fingerprint, Edit3, 
  Loader2, Award, FileText, Trash2, AlertCircle, X, Calendar
} from "lucide-react";

// --- Helper Component: Dynamic Status Badge ---
function StatusBadge({ status }) {
  switch (status) {
    case "approved":
      return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700">ผ่านการคัดเลือก</span>;
    case "rejected":
      return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-100 text-red-700">ไม่ผ่านการคัดเลือก</span>;
    default:
      return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-600">รอการตรวจสอบ</span>;
  }
}

export default function StudentScores() {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Education State
  const [plans, setPlans] = useState([]); 
  const [filteredPlans, setFilteredPlans] = useState([]); 
  const [formData, setFormData] = useState({
    high_school: "",
    edu_status: "",      
    edu_type: "",        
    current_level: "", 
    gpax_5_term: "",
    plan_id: "",         
    other_plan: ""       
  });

  // TCAS Scores State
  const [subjects, setSubjects] = useState([]);
  const [userScores, setUserScores] = useState({});
  const [scoreErrors, setScoreErrors] = useState({});

  // --- NEW: Applications State ---
  const [applications, setApplications] = useState([]);
  const [appToDelete, setAppToDelete] = useState(null); // เก็บ ID ของการสมัครที่ต้องการลบ
  const [deletingApp, setDeletingApp] = useState(false);

  // 1. Initial Load
  useEffect(() => {
    const loadData = async () => {
      const userId = localStorage.getItem("user_id");
      
      // Fetch Plans & Subjects
      const { data: allPlans } = await supabase.from("STUDY_PLANS").select("*").order('plan_name', { ascending: true });
      if (allPlans) setPlans(allPlans);

      const { data: allSubjects } = await supabase.from("SUBJECTS").select("*").order('id', { ascending: true });
      if (allSubjects) setSubjects(allSubjects);

      if (userId) {
        // Fetch User Education Data
        const { data: userData } = await supabase
          .from("USERS")
          .select("edu_status, current_level, gpax_5_term, plan_id")
          .eq("id", userId)
          .single();
        
        if (userData) {
          const userPlan = allPlans?.find(p => p.id === userData.plan_id);
          const detectedType = userPlan ? userPlan.plan_group : "";

          setFormData({
            high_school: localStorage.getItem("user_high_school") || "",
            edu_status: userData.edu_status || "",
            edu_type: detectedType,
            current_level: 12,
            gpax_5_term: userData.gpax_5_term || "",
            plan_id: userData.plan_id || "",
            other_plan: ""
          });
        }

        // Fetch User's Existing Scores
        const { data: scoresData } = await supabase
          .from("USER_SCORES")
          .select("subject_id, score_value")
          .eq("user_id", userId);
        
        if (scoresData) {
          const scoreMap = {};
          scoresData.forEach(item => { scoreMap[item.subject_id] = item.score_value; });
          setUserScores(scoreMap);
        }

        // --- NEW: Fetch Sent Applications ---
        const { data: appData } = await supabase
          .from("APPLICATION")
          .select(`
            id,
            status,
            application_date,
            ADMISSION_CRITERIA (
              tcas_round,
              ADMISSION_PROJECTS ( project_name ),
              PROGRAMS (
                prog_name,
                DEPARTMENTS (
                  FACULTIES ( faculty_name )
                )
              )
            )
          `)
          .eq("user_id", userId)
          .order('application_date', { ascending: false });

        if (appData) setApplications(appData);
      }
      setInitialLoading(false);
    };
    loadData();
  }, []);

  // 2. Filter plans dropdown
  useEffect(() => {
    if (formData.edu_type) {
      setFilteredPlans(plans.filter(p => p.plan_group === formData.edu_type));
    } else {
      setFilteredPlans([]);
    }
  }, [formData.edu_type, plans]);

  const handleEduTypeChange = (type) => {
    setFormData(prev => ({ ...prev, edu_type: type, plan_id: "", other_plan: "" }));
  };

  // Restrict scores
  const handleScoreChange = (subjectId, value) => {
    let finalValue = value;
    let newErrors = { ...scoreErrors };
    
    if (value !== "") {
      const numValue = parseFloat(value);
      if (numValue < 0) {
        finalValue = "0";
        newErrors[subjectId] = "คะแนนไม่สามารถติดลบได้";
      } else if (numValue > 100) {
        finalValue = "100";
        newErrors[subjectId] = "คะแนนเต็มคือ 100";
      } else {
        delete newErrors[subjectId];
      }
    } else {
      delete newErrors[subjectId];
    }

    setScoreErrors(newErrors);
    setUserScores(prev => ({ ...prev, [subjectId]: finalValue }));

    if (newErrors[subjectId]) {
      setTimeout(() => {
        setScoreErrors(prev => {
          const updated = { ...prev };
          delete updated[subjectId];
          return updated;
        });
      }, 3000);
    }
  };

  // 3. Save Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!formData.edu_type) {
      alert("กรุณาเลือก 'ประเภทการศึกษา' (ม.6, ปวช., ปวส.) ให้เรียบร้อยก่อนครับ");
      return;
    }
    
    if (!formData.edu_status) {
      alert("กรุณาเลือก 'สถานะปัจจุบัน' (กำลังศึกษา, สำเร็จการศึกษา) ให้เรียบร้อยก่อนครับ");
      return;
    }

    setLoading(true);
    const userId = localStorage.getItem("user_id");

    try {
      localStorage.setItem("user_high_school", formData.high_school);
      let finalPlanId = formData.plan_id;

      if (formData.plan_id === "other" && formData.other_plan.trim() !== "") {
        const newPlanName = formData.other_plan.trim();
        const { data: existingPlan } = await supabase
          .from("STUDY_PLANS")
          .select("id")
          .ilike("plan_name", newPlanName)
          .eq("plan_group", formData.edu_type)
          .maybeSingle();

        if (existingPlan) {
          finalPlanId = existingPlan.id;
        } else {
          const { data: insertedPlan, error: insertError } = await supabase
            .from("STUDY_PLANS")
            .insert([{ plan_name: newPlanName, plan_group: formData.edu_type }])
            .select()
            .single();

          if (insertError) throw insertError;
          finalPlanId = insertedPlan.id;
          setPlans(prev => [...prev, insertedPlan]);
        }
        setFormData(prev => ({ ...prev, plan_id: finalPlanId, other_plan: "" }));
      }

      const updateData = {
        edu_status: formData.edu_status,
        current_level: 12,
        gpax_5_term: parseFloat(formData.gpax_5_term),
        plan_id: finalPlanId
      };

      const { error: userError } = await supabase.from("USERS").update(updateData).eq("id", userId);
      if (userError) throw userError;

      const scoreUpserts = Object.keys(userScores)
        .filter(subjectId => userScores[subjectId] !== "" && userScores[subjectId] !== null)
        .map(subjectId => ({
          user_id: userId,
          subject_id: subjectId,
          score_value: parseFloat(userScores[subjectId])
        }));

      if (scoreUpserts.length > 0) {
        const { error: scoreError } = await supabase
          .from("USER_SCORES")
          .upsert(scoreUpserts, { onConflict: 'user_id, subject_id' });
        
        if (scoreError) throw scoreError;
      }

      alert("บันทึกข้อมูลสำเร็จ! ระบบได้ปรับปรุงข้อมูลการศึกษาและคะแนนของคุณแล้ว");
    } catch (err) {
      console.error("Supabase Error Object:", err); // เพิ่มบรรทัดนี้
      alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- NEW: Delete Application Logic ---
  const handleDeleteApplication = async () => {
    if (!appToDelete) return;
    setDeletingApp(true);
    
    try {
      const { error } = await supabase
        .from("APPLICATION")
        .delete()
        .eq("id", appToDelete);

      if (error) throw error;

      // Update state to remove deleted app
      setApplications(prev => prev.filter(app => app.id !== appToDelete));
      setAppToDelete(null); // Close modal
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการยกเลิกการสมัคร: " + err.message);
    } finally {
      setDeletingApp(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-2" />
        <p>กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  const tgatSubjects = subjects.filter(s => s.subject_type === 'TGAT');
  const tpatSubjects = subjects.filter(s => s.subject_type === 'TPAT');
  const alevelSubjects = subjects.filter(s => s.subject_type === 'A-Level');

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 font-poppins mt-10">
      
      {/* --- NEW: Sent Applications Section --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500/10 p-2 rounded-lg text-orange-500">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">ประวัติการสมัครของคุณ</h2>
              <p className="text-sm text-gray-500">โครงการที่คุณได้ทำการยื่นสมัครไปแล้ว</p>
            </div>
          </div>
          <div className="text-sm font-semibold bg-gray-50 px-3 py-1 rounded-full text-gray-500">
            ทั้งหมด {applications.length} รายการ
          </div>
        </div>

        {applications.length > 0 ? (
          <div className="grid gap-4">
            {applications.map((app) => {
              const criteria = app.ADMISSION_CRITERIA || {};
              const program = criteria.PROGRAMS || {};
              const dept = program.DEPARTMENTS || {};
              const faculty = dept.FACULTIES || {};
              const project = criteria.ADMISSION_PROJECTS || {};

              return (
                <div key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-md transition-all gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                        TCAS รอบ {criteria.tcas_round || "-"}
                      </span>
                      <StatusBadge status={app.status} />
                    </div>
                    <h3 className="font-bold text-gray-800 text-sm">{faculty.faculty_name || "ไม่ทราบคณะ"}</h3>
                    <p className="text-sm text-gray-600 font-medium">{program.prog_name || "ไม่ทราบสาขา"}</p>
                    <p className="text-xs text-gray-400">โครงการ: {project.project_name || "-"}</p>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-2">
                      <Calendar size={12} />
                      {new Date(app.application_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                  
                  <div>
                    <button
                      type="button"
                      onClick={() => setAppToDelete(app.id)}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} /> ยกเลิกการสมัคร
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <p className="text-gray-400 text-sm">คุณยังไม่มีประวัติการสมัครในระบบ</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-10">
        <form onSubmit={handleSaveProfile} className="space-y-10">
          
          {/* ================= EDUCATION SECTION ================= */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <GraduationCap size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">จัดการข้อมูลการศึกษา</h2>
                <p className="text-sm text-gray-500">ประเภทการศึกษาและแผนการเรียน</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Fingerprint size={16} /> ประเภทการศึกษา
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'high-school', label: 'ม.6 / กศน.' },
                    { id: 'vocational', label: 'ปวช.' },
                    { id: 'high-vocational', label: 'ปวส.' }
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => handleEduTypeChange(type.id)}
                      className={`p-3 rounded-xl border-2 transition-all text-xs font-bold flex flex-col items-center gap-1 ${
                        formData.edu_type === type.id 
                        ? 'border-primary bg-primary/5 text-primary shadow-sm' 
                        : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">สถานะปัจจุบัน</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, edu_status: 'studying'})}
                    className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                      formData.edu_status === 'studying' 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'
                    }`}
                  >
                    กำลังศึกษา
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, edu_status: 'graduated'})}
                    className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                      formData.edu_status === 'graduated' 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'
                    }`}
                  >
                    สำเร็จการศึกษาแล้ว
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <School size={16} /> ชื่อสถานศึกษาเดิม
                </label>
                <input 
                  type="text" 
                  className="w-full p-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all outline-none"
                  value={formData.high_school}
                  onChange={(e) => setFormData({...formData, high_school: e.target.value})}
                  placeholder="เช่น โรงเรียนสาธิต... หรือ วิทยาลัยเทคนิค..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">GPAX (5-6 เทอม)</label>
                  <input 
                    type="number" 
                    step="0.01" min="0.00" max="4.00"
                    className="w-full p-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all outline-none"
                    value={formData.gpax_5_term}
                    onChange={(e) => setFormData({...formData, gpax_5_term: e.target.value})}
                    placeholder="4.00"
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <BookOpen size={16} /> แผนการเรียน / สาขาวิชา
                  </label>
                  <select 
                    className="w-full p-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all outline-none bg-white disabled:bg-gray-50 disabled:cursor-not-allowed"
                    value={formData.plan_id}
                    onChange={(e) => setFormData({...formData, plan_id: e.target.value})}
                    disabled={!formData.edu_type}
                    required
                  >
                    <option value="">{formData.edu_type ? "เลือกแผนการเรียน" : "กรุณาเลือกประเภทการศึกษาก่อน"}</option>
                    {filteredPlans.map(plan => (
                      <option key={plan.id} value={plan.id}>{plan.plan_name}</option>
                    ))}
                    <option value="other" className="font-bold text-primary">อื่นๆ (ระบุเอง)</option>
                  </select>
                </div>

                {formData.plan_id === "other" && (
                  <div className="space-y-2 p-4 bg-primary/5 rounded-2xl border border-primary/10 animate-in slide-in-from-top-2 duration-300">
                    <label className="text-sm font-bold text-primary flex items-center gap-2">
                      <Edit3 size={16} /> ระบุแผนการเรียน / สาขา ของคุณ
                    </label>
                    <input 
                      type="text" 
                      className="w-full p-3 rounded-xl border-2 border-white focus:border-primary outline-none shadow-sm bg-white"
                      value={formData.other_plan}
                      onChange={(e) => setFormData({...formData, other_plan: e.target.value})}
                      placeholder="เช่น ภาษาเยอรมัน, ช่างอากาศยาน ฯลฯ"
                      required={formData.plan_id === "other"}
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* ================= SCORES SECTION ================= */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500">
                <Award size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">ผลคะแนน TCAS</h2>
                <p className="text-sm text-gray-500">กรอกคะแนนเฉพาะวิชาที่คุณมีผลสอบ</p>
              </div>
            </div>

            <div className="space-y-8">
              {/* TGAT */}
              {tgatSubjects.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-bold text-gray-700 bg-gray-50 py-2 px-4 rounded-lg inline-block">TGAT</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tgatSubjects.map(subject => (
                      <div key={subject.id} className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600 truncate block" title={subject.subject_name}>
                          {subject.subject_name}
                        </label>
                        <input 
                          type="number" step="0.01" min="0" max="100"
                          className={`w-full p-2.5 rounded-xl border outline-none text-sm transition-all ${
                            scoreErrors[subject.id] 
                              ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-500/10' 
                              : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10'
                          }`}
                          value={userScores[subject.id] || ""}
                          onChange={(e) => handleScoreChange(subject.id, e.target.value)}
                          placeholder="คะแนน"
                        />
                        {scoreErrors[subject.id] && (
                          <p className="text-[10px] text-red-500 font-medium animate-in fade-in duration-200">
                            {scoreErrors[subject.id]}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TPAT */}
              {tpatSubjects.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-bold text-gray-700 bg-gray-50 py-2 px-4 rounded-lg inline-block">TPAT</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tpatSubjects.map(subject => (
                      <div key={subject.id} className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600 truncate block" title={subject.subject_name}>
                          {subject.subject_name}
                        </label>
                        <input 
                          type="number" step="0.01" min="0" max="100"
                          className={`w-full p-2.5 rounded-xl border outline-none text-sm transition-all ${
                            scoreErrors[subject.id] 
                              ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-500/10' 
                              : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10'
                          }`}
                          value={userScores[subject.id] || ""}
                          onChange={(e) => handleScoreChange(subject.id, e.target.value)}
                          placeholder="คะแนน"
                        />
                        {scoreErrors[subject.id] && (
                          <p className="text-[10px] text-red-500 font-medium animate-in fade-in duration-200">
                            {scoreErrors[subject.id]}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* A-Level */}
              {alevelSubjects.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-bold text-gray-700 bg-gray-50 py-2 px-4 rounded-lg inline-block">A-Level</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {alevelSubjects.map(subject => (
                      <div key={subject.id} className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600 truncate block" title={subject.subject_name}>
                          {subject.subject_name}
                        </label>
                        <input 
                          type="number" step="0.01" min="0" max="100"
                          className={`w-full p-2.5 rounded-xl border outline-none text-sm transition-all ${
                            scoreErrors[subject.id] 
                              ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-500/10' 
                              : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10'
                          }`}
                          value={userScores[subject.id] || ""}
                          onChange={(e) => handleScoreChange(subject.id, e.target.value)}
                          placeholder="คะแนน"
                        />
                        {scoreErrors[subject.id] && (
                          <p className="text-[10px] text-red-500 font-medium animate-in fade-in duration-200">
                            {scoreErrors[subject.id]}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-white py-4 rounded-xl font-bold hover:shadow-lg transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-wait mt-8"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <><Save size={20} /> บันทึกข้อมูลและคะแนน</>
            )}
          </button>
        </form>
      </div>

      {/* --- Delete Confirmation Popup --- */}
      {appToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl transform animate-in zoom-in-95 duration-200 relative">
            <button 
              onClick={() => setAppToDelete(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full p-1 transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-red-500 mb-4 mx-auto">
              <AlertCircle size={32} />
            </div>
            
            <h3 className="text-xl font-bold text-center text-gray-800 mb-2">ยืนยันการยกเลิก?</h3>
            <p className="text-sm text-center text-gray-500 mb-6 leading-relaxed">
              คุณต้องการยกเลิกการสมัครในโครงการนี้ใช่หรือไม่? ข้อมูลการสมัครนี้จะถูกลบออกจากระบบอย่างถาวร
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setAppToDelete(null)} 
                className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                ปิด
              </button>
              <button 
                onClick={handleDeleteApplication}
                disabled={deletingApp}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200 flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {deletingApp ? <Loader2 className="h-5 w-5 animate-spin" /> : "ยืนยันการลบ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}