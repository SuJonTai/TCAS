"use client"

import { useState, useEffect } from "react";
import { 
  Save, GraduationCap, School, BookOpen, Fingerprint, Edit3, 
  Loader2, Award, FileText, Trash2, AlertCircle, X, Calendar
} from "lucide-react";

function StatusBadge({ status }) {
  switch (status) {
    case "approved":
       return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-primary/20 text-primary">ผ่านการคัดเลือก</span>;
    case "rejected":
      return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-destructive/20 text-destructive">ไม่ผ่านการคัดเลือก</span>;
    default:
       return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-muted text-foreground">รอการตรวจสอบ</span>;
  }
}

export default function StudentScores() {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
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

   const [subjects, setSubjects] = useState([]);
  const [userScores, setUserScores] = useState({});
  const [scoreErrors, setScoreErrors] = useState({});

  const [applications, setApplications] = useState([]);
   const [appToDelete, setAppToDelete] = useState(null); 
  const [deletingApp, setDeletingApp] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch academic metadata
        const [plansRes, subjectsRes] = await Promise.all([
          fetch('/api/academic/plan'),
          fetch('/api/academic/subject')
        ]);
        
        let allPlans = [];
        if (plansRes.ok) {
          allPlans = await plansRes.json();
          setPlans(allPlans);
        }
        
        if (subjectsRes.ok) {
          const allSubjects = await subjectsRes.json();
          setSubjects(allSubjects);
        }

        // Fetch User and their Scores
        const userRes = await fetch('/api/users/me');
        if (userRes.ok) {
          const userData = await userRes.json();
          // Detect education type from the user's saved plan
          const detectedType = allPlans.find(p => String(p.id) === String(userData.plan_id))?.plan_group || "";

          setFormData({
            high_school: userData.high_school || "",
            edu_status: userData.edu_status || "",
            edu_type: detectedType,
            current_level: 12,
            gpax_5_term: userData.gpax_5_term || "",
            plan_id: userData.plan_id || "",
            other_plan: ""
          });

          // Map user scores
          if (userData.USER_SCORES && userData.USER_SCORES.length > 0) {
            const scoreMap = {};
            userData.USER_SCORES.forEach(item => { scoreMap[item.subject_id] = item.score_value; });
            setUserScores(scoreMap);
          }
          
          // Fetch their applications
          const appRes = await fetch('/api/applications');
          if (appRes.ok) {
             const allApps = await appRes.json();
             const userApps = allApps.filter(app => String(app.user_id) === String(userData._id));
             setApplications(userApps);
          }
        }
      } catch (error) {
        console.error("Error loading student details:", error);
      } finally {
        setInitialLoading(false);
      }
    };
    loadData();
  }, []);

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

    try {
      let finalPlanId = formData.plan_id;

      if (formData.plan_id === "other" && formData.other_plan.trim() !== "") {
        const newPlanName = formData.other_plan.trim();
        // Fallback: If hitting our generic creation logic isn't set up yet, we'll need to rely on the current id or leave it blank
        // For custom plans, we'll try to create it via generic plan route if it existed.
        // Assuming we didn't implement a specific POST route for plans, we will just use the string for now.
        // Or optimally we create one in `/api/academic/plan` (which right now is GET only)
      }

      const scoreUpserts = Object.keys(userScores)
        .filter(subjectId => userScores[subjectId] !== "" && userScores[subjectId] !== null)
        .map(subjectId => ({
          subject_id: subjectId,
          score_value: parseFloat(userScores[subjectId])
        }));

      const updateData = {
        high_school: formData.high_school,
        edu_status: formData.edu_status,
        current_level: 12,
        gpax_5_term: parseFloat(formData.gpax_5_term),
        plan_id: finalPlanId,
        USER_SCORES: scoreUpserts
      };

      const res = await fetch('/api/users/me', {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(updateData)
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update profile");
      }

      alert("บันทึกข้อมูลสำเร็จ! ระบบได้ปรับปรุงข้อมูลการศึกษาและคะแนนของคุณแล้ว");
    } catch (err) {
      console.error("Save Error:", err); 
      alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteApplication = async () => {
    if (!appToDelete) return;
    setDeletingApp(true);
    
    try {
      const res = await fetch(`/api/applications/${appToDelete}`, { method: 'DELETE' });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to delete application");
      }

      setApplications(prev => prev.filter(app => app._id !== appToDelete && app.id !== appToDelete));
      setAppToDelete(null); 
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
      
       <div className="bg-card rounded-2xl shadow-sm border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
             <div className="bg-orange-500/10 p-2 rounded-lg text-orange-500">
              <FileText size={24} />
            </div>
             <div>
              <h2 className="text-xl font-bold text-foreground">ประวัติการสมัครของคุณ</h2>
              <p className="text-sm text-muted-foreground">โครงการที่คุณได้ทำการยื่นสมัครไปแล้ว</p>
            </div>
          </div>
          <div className="text-sm font-semibold bg-muted px-3 py-1 rounded-full text-muted-foreground">
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
                <div key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted/50 hover:shadow-md transition-all gap-4">
                  <div className="space-y-1 flex-1">
                     <div className="flex flex-wrap items-center gap-2 mb-2">
                       <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md">
                        TCAS รอบ {criteria.tcas_round || "-"}
                      </span>
                       <StatusBadge status={app.status} />
                    </div>
                     <h3 className="font-bold text-foreground text-sm">{faculty.faculty_name || "ไม่ทราบคณะ"}</h3>
                    <p className="text-sm text-muted-foreground font-medium">{program.prog_name || "ไม่ทราบสาขา"}</p>
                     <p className="text-xs text-muted-foreground">โครงการ: {project.project_name || "-"}</p>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-2">
                      <Calendar size={12} />
                      {new Date(app.application_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                     </div>
                  </div>
                  
                  <div>
                    <button
                      type="button"
                       onClick={() => setAppToDelete(app.id)}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-destructive bg-destructive/10 hover:bg-destructive/20 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} /> ยกเลิกการสมัคร
                    </button>
                  </div>
                 </div>
               );
             })}
           </div>
        ) : (
          <div className="text-center py-10 bg-muted/50 rounded-xl border border-dashed border-border">
             <p className="text-muted-foreground text-sm">คุณยังไม่มีประวัติการสมัครในระบบ</p>
          </div>
        )}
      </div>

       <div className="bg-card rounded-2xl shadow-sm border border-border p-6 space-y-10">
         <form onSubmit={handleSaveProfile} className="space-y-10">
          
           <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                 <GraduationCap size={24} />
              </div>
               <div>
                <h2 className="text-xl font-bold text-foreground">จัดการข้อมูลการศึกษา</h2>
                 <p className="text-sm text-muted-foreground">ประเภทการศึกษาและแผนการเรียน</p>
               </div>
            </div>

            <div className="space-y-6">
               <div className="space-y-2">
                 <label className="text-sm font-semibold text-foreground flex items-center gap-2">
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
                         ? 'border-primary bg-primary/20 text-primary shadow-sm' 
                        : 'border-border bg-background text-muted-foreground hover:border-border/80'
                       }`}
                    >
                      {type.label}
                    </button>
                   ))}
                 </div>
              </div>

               <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">สถานะปัจจุบัน</label>
                <div className="grid grid-cols-2 gap-4">
                   <button
                    type="button"
                     onClick={() => setFormData({...formData, edu_status: 'studying'})}
                    className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                      formData.edu_status === 'studying' 
                       ? 'border-primary bg-primary/20 text-primary' 
                      : 'border-border bg-background text-muted-foreground hover:border-border/80'
                     }`}
                   >
                     กำลังศึกษา
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, edu_status: 'graduated'})}
                    className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                      formData.edu_status === 'graduated' 
                      ? 'border-primary bg-primary/20 text-primary' 
                       : 'border-border bg-background text-muted-foreground hover:border-border/80'
                     }`}
                  >
                     สำเร็จการศึกษาแล้ว
                  </button>
                </div>
               </div>

              <div className="space-y-2">
                <label htmlFor="schoolName" className="text-sm font-semibold text-foreground flex items-center gap-2">
                   <School size={16} /> ชื่อสถานศึกษาเดิม
                 </label>
                <input 
                  id="schoolName"
                   type="text" 
                  className="w-full p-3 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all outline-none text-foreground"
                  value={formData.high_school}
                   onChange={(e) => setFormData({...formData, high_school: e.target.value})}
                  placeholder="เช่น โรงเรียนสาธิต... หรือ วิทยาลัยเทคนิค..."
                   required
                 />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="gpax" className="text-sm font-semibold text-foreground">GPAX (5-6 เทอม)</label>
                  <input 
                     id="gpax"
                     type="number" 
                    step="0.01" min="0.00" max="4.00"
                    className="w-full p-3 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all outline-none text-foreground"
                     value={formData.gpax_5_term}
                    onChange={(e) => setFormData({...formData, gpax_5_term: e.target.value})}
                     placeholder="4.00"
                    required
                  />
                 </div>
              </div>

               <div className="space-y-4">
                 <div className="space-y-2">
                   <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <BookOpen size={16} /> แผนการเรียน / สาขาวิชา
                  </label>
                  <select 
                     className="w-full p-3 rounded-xl border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all outline-none text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
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
                   <div className="space-y-2 p-4 bg-primary/10 rounded-2xl border border-primary/20 animate-in slide-in-from-top-2 duration-300">
                    <label className="text-sm font-bold text-primary flex items-center gap-2">
                      <Edit3 size={16} /> ระบุแผนการเรียน / สาขา ของคุณ
                     </label>
                    <input 
                       type="text" 
                       className="w-full p-3 rounded-xl border border-border focus:border-primary outline-none shadow-sm bg-background text-foreground"
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

          <hr className="border-border" />

           <section>
            <div className="flex items-center gap-3 mb-6">
               <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500">
                 <Award size={24} />
               </div>
              <div>
                 <h2 className="text-xl font-bold text-foreground">ผลคะแนน TCAS</h2>
                <p className="text-sm text-muted-foreground">กรอกคะแนนเฉพาะวิชาที่คุณมีผลสอบ</p>
               </div>
            </div>

            <div className="space-y-8">
              {tgatSubjects.length > 0 && (
                <div className="space-y-3">
                   <h3 className="font-bold text-foreground bg-muted py-2 px-4 rounded-lg inline-block">TGAT</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {tgatSubjects.map(subject => (
                       <div key={subject.id} className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground truncate block" title={subject.subject_name}>
                           {subject.subject_name}
                         </label>
                        <input 
                           type="number" step="0.01" min="0" max="100"
                           className={`w-full p-2.5 rounded-xl border bg-background text-foreground outline-none text-sm transition-all border-border focus:border-primary focus:ring-2 focus:ring-primary/10`}
                          value={userScores[subject.id] || ""}
                           onChange={(e) => handleScoreChange(subject.id, e.target.value)}
                           placeholder="คะแนน"
                         />
                         {scoreErrors[subject.id] && (
                           <p className="text-[10px] text-destructive font-medium animate-in fade-in duration-200">
                             {scoreErrors[subject.id]}
                          </p>
                         )}
                       </div>
                    ))}
                  </div>
                 </div>
               )}

              {tpatSubjects.length > 0 && (
                 <div className="space-y-3">
                   <h3 className="font-bold text-foreground bg-muted py-2 px-4 rounded-lg inline-block">TPAT</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tpatSubjects.map(subject => (
                       <div key={subject.id} className="space-y-1">
                         <label className="text-xs font-semibold text-muted-foreground truncate block" title={subject.subject_name}>
                          {subject.subject_name}
                        </label>
                         <input 
                           type="number" step="0.01" min="0" max="100"
                           className={`w-full p-2.5 rounded-xl border bg-background text-foreground outline-none text-sm transition-all border-border focus:border-primary focus:ring-2 focus:ring-primary/10`}
                          value={userScores[subject.id] || ""}
                           onChange={(e) => handleScoreChange(subject.id, e.target.value)}
                          placeholder="คะแนน"
                         />
                        {scoreErrors[subject.id] && (
                          <p className="text-[10px] text-destructive font-medium animate-in fade-in duration-200">
                             {scoreErrors[subject.id]}
                           </p>
                        )}
                      </div>
                     ))}
                  </div>
                 </div>
              )}

              {alevelSubjects.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-bold text-foreground bg-muted py-2 px-4 rounded-lg inline-block">A-Level</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {alevelSubjects.map(subject => (
                      <div key={subject.id} className="space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground truncate block" title={subject.subject_name}>
                           {subject.subject_name}
                         </label>
                        <input 
                           type="number" step="0.01" min="0" max="100"
                           className={`w-full p-2.5 rounded-xl border bg-background text-foreground outline-none text-sm transition-all border-border focus:border-primary focus:ring-2 focus:ring-primary/10`}
                           value={userScores[subject.id] || ""}
                           onChange={(e) => handleScoreChange(subject.id, e.target.value)}
                          placeholder="คะแนน"
                         />
                         {scoreErrors[subject.id] && (
                           <p className="text-[10px] text-destructive font-medium animate-in fade-in duration-200">
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

           <div className="hidden">
             {loading ? "กำลังโหลดข้อมูล..." : "โหลดเสร็จสมบูรณ์"} 
          </div>

           <button 
             type="submit" 
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold hover:bg-primary/90 transition-all flex justify-center items-center gap-2 disabled:opacity-50 mt-8"
          >
             {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
             ) : (
               <><Save size={20} /> บันทึกข้อมูลและคะแนน</>
            )}
           </button>
         </form>
       </div>

      {appToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-border transform animate-in zoom-in-95 duration-200 relative">
             <button 
              onClick={() => setAppToDelete(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:bg-muted rounded-full p-1 transition-colors"
             >
               <X size={20} />
            </button>
            
             <div className="w-14 h-14 rounded-full bg-destructive/20 flex items-center justify-center text-destructive mb-4 mx-auto">
              <AlertCircle size={32} />
             </div>
            
             <h3 className="text-xl font-bold text-center text-foreground mb-2">ยืนยันการยกเลิก?</h3>
            <p className="text-sm text-center text-muted-foreground mb-6 leading-relaxed">
               คุณต้องการยกเลิกการสมัครในโครงการนี้ใช่หรือไม่? ข้อมูลการสมัครนี้จะถูกลบออกจากระบบอย่างถาวร
            </p>
            
             <div className="flex gap-3">
               <button 
                 onClick={() => setAppToDelete(null)} 
                 className="flex-1 py-3 bg-muted text-muted-foreground hover:bg-muted/80 rounded-xl font-bold transition-colors"
               >
                 ปิด
              </button>
               <button 
                 onClick={handleDeleteApplication}
                 disabled={deletingApp}
                className="flex-1 py-3 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold shadow-lg flex justify-center items-center gap-2 disabled:opacity-50"
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
