import { useState, useEffect, useMemo } from "react";
import { PlusCircle, CheckCircle2, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function SuperAdminCriteria() {
  const [facultiesDB, setFacultiesDB] = useState([]);
  const [projectsDB, setProjectsDB] = useState([]);
  const [subjectsDB, setSubjectsDB] = useState([]);
  const [plansDB, setPlansDB] = useState([]);

  const [criteriaLoading, setCriteriaLoading] = useState(false);
  const [criteriaSuccess, setCriteriaSuccess] = useState(false);
  const [criteriaForm, setCriteriaForm] = useState({
    academic_year: new Date().getFullYear() + 543,
    tcas_round: "1", 
    max_seats: "", 
    min_gpax: "", 
    edu_status_req: [], 
    project_id: "", 
    faculty_id: "", 
    dept_id: "", 
    program_id: "",
    start_date: "", 
    end_date: "",
    study_plans: [],
    subjects: []
  });

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: facs }, { data: projs }, { data: subs }, { data: plans }] = await Promise.all([
        supabase.from('FACULTIES').select('id, faculty_name, DEPARTMENTS ( id, dept_name, PROGRAMS ( id, prog_name ) )'),
        supabase.from('ADMISSION_PROJECTS').select('*'),
        supabase.from('SUBJECTS').select('*'),
        supabase.from('STUDY_PLANS').select('*')
      ]);
      if (facs) setFacultiesDB(facs);
      if (projs) setProjectsDB(projs);
      if (subs) setSubjectsDB(subs);
      if (plans) setPlansDB(plans);
    };
    fetchData();
  }, []);

  const availableDeptsForCriteria = useMemo(() => {
    if (!criteriaForm.faculty_id) return [];
    const faculty = facultiesDB.find(f => f.id.toString() === criteriaForm.faculty_id);
    return faculty ? faculty.DEPARTMENTS : [];
  }, [criteriaForm.faculty_id, facultiesDB]);

  const availableProgramsForCriteria = useMemo(() => {
    if (!criteriaForm.dept_id) return [];
    const dept = availableDeptsForCriteria.find(d => d.id.toString() === criteriaForm.dept_id);
    return dept ? dept.PROGRAMS : [];
  }, [criteriaForm.dept_id, availableDeptsForCriteria]);

  const handleCriteriaSubmit = async (e) => {
    e.preventDefault();

    const hasStatus = criteriaForm.edu_status_req.some(req => ["studying", "graduated"].includes(req));
    const hasType = criteriaForm.edu_status_req.some(req => ["high-school", "vocational", "high-vocational"].includes(req));

    if (!hasStatus) return alert("กรุณาเลือกสถานะการศึกษาอย่างน้อย 1 รายการ");
    if (!hasType) return alert("กรุณาเลือกวุฒิการศึกษาอย่างน้อย 1 รายการ");
    if (criteriaForm.study_plans.length === 0) return alert("กรุณาเลือกแผนการเรียนอย่างน้อย 1 แผน");
    if (new Date(criteriaForm.start_date) > new Date(criteriaForm.end_date)) return alert("วันที่สิ้นสุดการรับสมัคร ต้องไม่ก่อนวันที่เริ่มต้น");

    for (const sub of criteriaForm.subjects) {
      if (!sub.subject_id) return alert("กรุณาเลือกวิชาให้ครบถ้วน");
    }

    setCriteriaLoading(true);
    
    const { data: criteriaData, error: criteriaError } = await supabase.from('ADMISSION_CRITERIA').insert([{
      academic_year: parseInt(criteriaForm.academic_year),
      tcas_round: parseInt(criteriaForm.tcas_round),
      max_seats: parseInt(criteriaForm.max_seats),
      min_gpax: parseFloat(criteriaForm.min_gpax),
      edu_status_req: criteriaForm.edu_status_req, 
      program_id: parseInt(criteriaForm.program_id),
      project_id: parseInt(criteriaForm.project_id),
      start_date: criteriaForm.start_date, 
      end_date: criteriaForm.end_date 
    }]).select();

    if (criteriaError) {
      setCriteriaLoading(false);
      return alert("Error Criteria: " + criteriaError.message);
    }

    const newCriteriaId = criteriaData[0].id;

    if (criteriaForm.study_plans.length > 0) {
      const plansToInsert = criteriaForm.study_plans.map(planId => ({
        criteria_id: newCriteriaId,
        plan_id: parseInt(planId)
      }));
      await supabase.from('CRITERIA_PLANS').insert(plansToInsert);
    }

    if (criteriaForm.subjects.length > 0) {
      const subjectsToInsert = criteriaForm.subjects.map(sub => ({
        criteria_id: newCriteriaId,
        subject_id: parseInt(sub.subject_id), 
        min_score: parseFloat(sub.min_score) || 0,
        weight: parseFloat(sub.weight) || 0
      }));
      await supabase.from('CRITERIA_SUBJECTS').insert(subjectsToInsert);
    }

    setCriteriaLoading(false);
    setCriteriaSuccess(true);
    setCriteriaForm({ 
      ...criteriaForm, max_seats: "", min_gpax: "", dept_id: "", program_id: "", edu_status_req: [],
      start_date: "", end_date: "", study_plans: [], subjects: []
    });
    setTimeout(() => setCriteriaSuccess(false), 3000);
  };

  const addSubjectRow = () => {
    setCriteriaForm(prev => ({
      ...prev,
      subjects: [...prev.subjects, { subject_id: "", min_score: "", weight: "" }]
    }));
  };

  const updateSubjectRow = (index, field, value) => {
    setCriteriaForm(prev => {
      const newSubjects = [...prev.subjects];
      newSubjects[index][field] = value;
      return { ...prev, subjects: newSubjects };
    });
  };

  const removeSubjectRow = (index) => {
    setCriteriaForm(prev => {
      const newSubjects = [...prev.subjects];
      newSubjects.splice(index, 1);
      return { ...prev, subjects: newSubjects };
    });
  };

  return (
    <div className="mx-auto max-w-3xl pt-8 px-4 lg:px-8 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">จัดการเกณฑ์การรับสมัคร</h1>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3 border-b pb-4">
          <div className="rounded-full bg-primary/10 p-2"><PlusCircle className="h-6 w-6 text-primary" /></div>
          <div><h2 className="text-xl font-bold text-foreground">เปิดรอบรับสมัครใหม่</h2></div>
        </div>

        {criteriaSuccess && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" /> บันทึกเกณฑ์รับสมัครสำเร็จเรียบร้อย!
          </div>
        )}

        <form onSubmit={handleCriteriaSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">ปีการศึกษา</label>
              <input type="number" required value={criteriaForm.academic_year} onChange={e => setCriteriaForm({...criteriaForm, academic_year: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">รอบ TCAS (1-4)</label>
              <select required value={criteriaForm.tcas_round} onChange={e => setCriteriaForm({...criteriaForm, tcas_round: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                {[1,2,3,4].map(r => <option key={r} value={r}>รอบที่ {r}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">จำนวนรับ (ที่นั่ง)</label>
              <input type="number" required min="1" value={criteriaForm.max_seats} onChange={e => setCriteriaForm({...criteriaForm, max_seats: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">GPAX ขั้นต่ำ</label>
              <input type="number" step="0.01" min="0" max="4" required value={criteriaForm.min_gpax} onChange={e => setCriteriaForm({...criteriaForm, min_gpax: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">วันที่เริ่มต้นรับสมัคร <span className="text-red-500">*</span></label>
              <input type="date" required value={criteriaForm.start_date} onChange={e => setCriteriaForm({...criteriaForm, start_date: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">วันที่สิ้นสุดรับสมัคร <span className="text-red-500">*</span></label>
              <input type="date" required value={criteriaForm.end_date} onChange={e => setCriteriaForm({...criteriaForm, end_date: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <label className="mb-2 block text-sm font-medium">แผนการเรียนที่รับสมัคร <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-md border border-input bg-background p-4">
              {plansDB.length === 0 ? (
                <div className="col-span-full text-sm text-muted-foreground py-2">กำลังโหลดแผนการเรียน...</div>
              ) : (
                plansDB.map((plan) => (
                  <label key={plan.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 p-1 rounded transition-colors">
                    <input
                      type="checkbox"
                      checked={criteriaForm.study_plans.includes(plan.id)}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setCriteriaForm(prev => {
                          const currentPlans = prev.study_plans;
                          return { ...prev, study_plans: isChecked ? [...currentPlans, plan.id] : currentPlans.filter(item => item !== plan.id) };
                        });
                      }}
                      className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                    />
                    {plan.plan_name}
                  </label>
                ))
              )}
            </div>
            {criteriaForm.study_plans.length === 0 && (
              <p className="mt-1 text-xs text-red-500">กรุณาเลือกแผนการเรียนอย่างน้อย 1 แผน</p>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <label className="mb-2 block text-sm font-medium">สถานะการศึกษา <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-md border border-input bg-background p-4">
              {[
                { id: "studying", label: "กำลังศึกษาอยู่" },
                { id: "graduated", label: "สำเร็จการศึกษาแล้ว" },
              ].map((option) => (
                <label key={option.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 p-1 rounded transition-colors">
                  <input
                    type="checkbox"
                    checked={criteriaForm.edu_status_req.includes(option.id)}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      setCriteriaForm(prev => {
                        const currentReqs = prev.edu_status_req;
                        return { ...prev, edu_status_req: isChecked ? [...currentReqs, option.id] : currentReqs.filter(item => item !== option.id) };
                      });
                    }}
                    className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                  />
                  {option.label}
                </label>
              ))}
            </div>
            {!criteriaForm.edu_status_req.some(req => ["studying", "graduated"].includes(req)) && (
              <p className="mt-1 text-xs text-red-500">กรุณาเลือกสถานะอย่างน้อย 1 รายการ</p>
            )}
          </div>

          <div className="pt-2">
            <label className="mb-2 block text-sm font-medium">วุฒิการศึกษาที่รองรับ <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-md border border-input bg-background p-4">
              {[
                { id: "high-school", label: "มัธยมศึกษาตอนปลาย (ม.6)" },
                { id: "vocational", label: "ประกาศนียบัตรวิชาชีพ (ปวช.)" },
                { id: "high-vocational", label: "ประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.)" },
              ].map((option) => (
                <label key={option.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 p-1 rounded transition-colors">
                  <input
                    type="checkbox"
                    checked={criteriaForm.edu_status_req.includes(option.id)}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      setCriteriaForm(prev => {
                        const currentReqs = prev.edu_status_req;
                        return { ...prev, edu_status_req: isChecked ? [...currentReqs, option.id] : currentReqs.filter(item => item !== option.id) };
                      });
                    }}
                    className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                  />
                  {option.label}
                </label>
              ))}
            </div>
            {!criteriaForm.edu_status_req.some(req => ["high-school", "vocational", "high-vocational"].includes(req)) && (
              <p className="mt-1 text-xs text-red-500">กรุณาเลือกวุฒิการศึกษาอย่างน้อย 1 รายการ</p>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-medium">เกณฑ์คะแนนที่ใช้พิจารณา (TCAS Subjects)</label>
              <button type="button" onClick={addSubjectRow} className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 font-medium">
                <PlusCircle className="h-4 w-4" /> เพิ่มรายวิชา
              </button>
            </div>

            <div className="space-y-2">
              {criteriaForm.subjects.length === 0 ? (
                 <div className="text-sm text-muted-foreground p-4 text-center border border-dashed rounded-md bg-muted/10">
                   ไม่มีการระบุคะแนนสอบ (พิจารณาจากแฟ้มสะสมผลงาน / GPAX เท่านั้น)
                 </div>
              ) : (
                criteriaForm.subjects.map((sub, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center bg-muted/10 p-2 rounded-md border border-border">
                    <div className="flex-1 w-full">
                      <select required value={sub.subject_id} onChange={(e) => updateSubjectRow(index, "subject_id", e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                        <option value="" disabled>เลือกวิชา...</option>
                        {subjectsDB.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                      </select>
                    </div>
                    <div className="w-full sm:w-32">
                      <input type="number" step="0.01" min="0" placeholder="ขั้นต่ำ (ถ้ามี)" value={sub.min_score} onChange={(e) => updateSubjectRow(index, "min_score", e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                    </div>
                    <div className="w-full sm:w-32 flex items-center gap-2">
                      <input type="number" step="0.01" min="0" max="100" placeholder="ค่าน้ำหนัก %" value={sub.weight} onChange={(e) => updateSubjectRow(index, "weight", e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                      <button type="button" onClick={() => removeSubjectRow(index)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <label className="mb-1 block text-sm font-medium">โครงการรับเข้าศึกษา</label>
            <select required value={criteriaForm.project_id} onChange={e => setCriteriaForm({...criteriaForm, project_id: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary">
              <option value="" disabled>เลือกโครงการ</option>
              {projectsDB.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">คณะ</label>
              <select required value={criteriaForm.faculty_id} onChange={e => setCriteriaForm({...criteriaForm, faculty_id: e.target.value, dept_id: "", program_id: ""})} className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                <option value="" disabled>เลือกคณะ</option>
                {facultiesDB.map(f => <option key={f.id} value={f.id}>{f.faculty_name}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">ภาควิชา</label>
              <select required disabled={!criteriaForm.faculty_id} value={criteriaForm.dept_id} onChange={e => setCriteriaForm({...criteriaForm, dept_id: e.target.value, program_id: ""})} className="h-10 w-full rounded-md border border-input bg-background px-3 disabled:opacity-50 outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                <option value="" disabled>{criteriaForm.faculty_id ? "เลือกภาควิชา" : "กรุณาเลือกคณะก่อน"}</option>
                {availableDeptsForCriteria.map(d => <option key={d.id} value={d.id}>{d.dept_name}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">สาขาวิชา</label>
              <select required disabled={!criteriaForm.dept_id} value={criteriaForm.program_id} onChange={e => setCriteriaForm({...criteriaForm, program_id: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3 disabled:opacity-50 outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                <option value="" disabled>{criteriaForm.dept_id ? "เลือกสาขาวิชา" : "กรุณาเลือกภาควิชาก่อน"}</option>
                {availableProgramsForCriteria.map(p => <option key={p.id} value={p.id}>{p.prog_name}</option>)}
              </select>
            </div>
          </div>

          <button type="submit" disabled={criteriaLoading} className="mt-6 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-all disabled:opacity-50">
            {criteriaLoading ? "กำลังบันทึก..." : "เพิ่มเกณฑ์การรับสมัคร"}
          </button>
        </form>
      </div>
    </div>
  );
}