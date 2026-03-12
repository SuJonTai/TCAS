import { useState, useEffect, useMemo } from "react";
import { PlusCircle, CheckCircle2, Trash2, Pencil, X } from "lucide-react";
// นำเข้า Context และ API Helper
import { useDatabase } from "@/context/DatabaseContext";
import { apiFetch } from "@/services/apiService";

export default function SuperAdminCriteria() {
  const { dbType } = useDatabase(); // ดึงประเภท DB ปัจจุบัน (supabase หรือ sqlserver)

  const [facultiesDB, setFacultiesDB] = useState([]);
  const [projectsDB, setProjectsDB] = useState([]);
  const [subjectsDB, setSubjectsDB] = useState([]);
  const [plansDB, setPlansDB] = useState([]);
  const [criteriaList, setCriteriaList] = useState([]); 

  const [criteriaLoading, setCriteriaLoading] = useState(false);
  const [criteriaSuccess, setCriteriaSuccess] = useState(false);
  
  const [editingId, setEditingId] = useState(null); 

  const initialFormState = {
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
  };

  const [criteriaForm, setCriteriaForm] = useState(initialFormState);

  // เปลี่ยนมาใช้ API Fetch ผ่าน Backend แทน Supabase โดยตรง
  const fetchData = async () => {
    try {
      const [facs, projs, subs, plans, crits] = await Promise.all([
        apiFetch('/api/faculties'),
        apiFetch('/api/projects'),
        apiFetch('/api/subjects'),
        apiFetch('/api/study-plans'),
        apiFetch('/api/criteria')
      ]);
      
      if (facs) setFacultiesDB(facs);
      if (projs) setProjectsDB(projs);
      if (subs) setSubjectsDB(subs);
      if (plans) setPlansDB(plans);
      if (crits) setCriteriaList(crits);
    } catch (error) {
      console.error("Error fetching criteria data:", error);
    }
  };

  useEffect(() => {
    fetchData();
    // โหลดข้อมูลใหม่ทุกครั้งที่มีการเปลี่ยน dbType
  }, []);

  const availableDeptsForCriteria = useMemo(() => {
    if (!criteriaForm.faculty_id) return [];
    const faculty = facultiesDB.find(f => f.id.toString() === criteriaForm.faculty_id);
    return faculty ? (faculty.DEPARTMENTS || []) : [];
  }, [criteriaForm.faculty_id, facultiesDB]);

  const availableProgramsForCriteria = useMemo(() => {
    if (!criteriaForm.dept_id) return [];
    const dept = availableDeptsForCriteria.find(d => d.id.toString() === criteriaForm.dept_id);
    return dept ? (dept.PROGRAMS || []) : [];
  }, [criteriaForm.dept_id, availableDeptsForCriteria]);

  const handleEdit = (criteria) => {
    let fId = "", dId = "";
    for (const f of facultiesDB) {
      for (const d of (f.DEPARTMENTS || [])) {
        if ((d.PROGRAMS || []).some(p => p.id === criteria.program_id)) {
          fId = f.id.toString();
          dId = d.id.toString();
          break;
        }
      }
    }

    let parsedEduStatus = [];
    if (Array.isArray(criteria.edu_status_req)) {
      parsedEduStatus = criteria.edu_status_req;
    } else if (typeof criteria.edu_status_req === 'string') {
      try {
        parsedEduStatus = JSON.parse(criteria.edu_status_req);
      } catch (e) {
        parsedEduStatus = criteria.edu_status_req.replace(/^\{|\}$/g, '').split(',').filter(Boolean);
      }
    }

    setEditingId(criteria.id);
    setCriteriaForm({
      academic_year: criteria.academic_year,
      tcas_round: criteria.tcas_round,
      max_seats: criteria.max_seats,
      min_gpax: criteria.min_gpax,
      edu_status_req: parsedEduStatus,
      project_id: criteria.project_id?.toString() || "",
      faculty_id: fId,
      dept_id: dId,
      program_id: criteria.program_id?.toString() || "",
      start_date: criteria.start_date ? criteria.start_date.split('T')[0] : "",
      end_date: criteria.end_date ? criteria.end_date.split('T')[0] : "",
      study_plans: criteria.CRITERIA_PLANS?.map(p => p.plan_id) || [],
      subjects: criteria.CRITERIA_SUBJECTS || []
    });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (window.confirm("คุณแน่ใจหรือไม่ที่จะลบเกณฑ์การรับสมัครนี้? ข้อมูลนี้จะไม่สามารถกู้คืนได้")) {
      try {
        await apiFetch(`/api/criteria/${id}`,{ method: 'DELETE' });
        alert("ลบข้อมูลสำเร็จ");
        fetchData(); 
        if (editingId === id) cancelEdit(); 
      } catch (error) {
        alert("เกิดข้อผิดพลาดในการลบ: " + error.message);
      }
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setCriteriaForm(initialFormState);
  };

  const handleCriteriaSubmit = async (e) => {
    e.preventDefault();

    const isDuplicate = criteriaList.some(crit => {
      if (editingId && crit.id === editingId) return false;
      return (
        crit.project_id?.toString() === criteriaForm.project_id &&
        crit.program_id?.toString() === criteriaForm.program_id &&
        crit.academic_year?.toString() === criteriaForm.academic_year?.toString() &&
        crit.tcas_round?.toString() === criteriaForm.tcas_round?.toString()
      );
    });

    if (isDuplicate) {
      return alert("ไม่สามารถเพิ่มได้: มีโครงการและสาขาวิชานี้อยู่ในระบบแล้ว (สำหรับปีการศึกษาและรอบนี้)");
    }

    const safeEduStatusReq = criteriaForm.edu_status_req || [];
    const hasStatus = safeEduStatusReq.some(req => ["studying", "graduated"].includes(req));
    const hasType = safeEduStatusReq.some(req => ["high-school", "vocational", "high-vocational"].includes(req));

    if (!hasStatus) return alert("กรุณาเลือกสถานะการศึกษาอย่างน้อย 1 รายการ");
    if (!hasType) return alert("กรุณาเลือกวุฒิการศึกษาอย่างน้อย 1 รายการ");
    if (criteriaForm.study_plans.length === 0) return alert("กรุณาเลือกแผนการเรียนอย่างน้อย 1 แผน");
    if (new Date(criteriaForm.start_date) > new Date(criteriaForm.end_date)) return alert("วันที่สิ้นสุดการรับสมัคร ต้องไม่ก่อนวันที่เริ่มต้น");

    let totalWeight = 0;
    for (const sub of criteriaForm.subjects) {
      if (!sub.subject_id) return alert("กรุณาเลือกวิชาให้ครบถ้วน");
      const minScore = parseFloat(sub.min_score) || 0;
      const weight = parseFloat(sub.weight) || 0;
      if (minScore > 100) return alert("คะแนนขั้นต่ำต้องไม่เกิน 100");
      if (weight > 100) return alert("ค่าน้ำหนักต้องไม่เกิน 100%");
      if (weight < 0 || minScore < 0) return alert("คะแนนและค่าน้ำหนักห้ามติดลบ");
      totalWeight += weight;
    }

    if (criteriaForm.subjects.length > 0 && totalWeight !== 100) {
      return alert(`ผลรวมค่าน้ำหนักต้องเท่ากับ 100% (ปัจจุบัน: ${totalWeight}%)`);
    }

    setCriteriaLoading(true);

    const payload = {
      academic_year: parseInt(criteriaForm.academic_year),
      tcas_round: parseInt(criteriaForm.tcas_round),
      max_seats: parseInt(criteriaForm.max_seats),
      min_gpax: parseFloat(criteriaForm.min_gpax),
      edu_status_req: criteriaForm.edu_status_req, 
      program_id: parseInt(criteriaForm.program_id),
      project_id: parseInt(criteriaForm.project_id),
      start_date: criteriaForm.start_date, 
      end_date: criteriaForm.end_date 
    };

    try {
      // แพ็คข้อมูลทั้งหมดส่งให้ Backend จัดการ Transaction ทั้ง Criteria, Plans และ Subjects
      const bodyData = {
        criteria: payload,
        study_plans: criteriaForm.study_plans,
        subjects: criteriaForm.subjects
      };

      if (editingId) {
        await apiFetch(`/api/criteria/${editingId}`,{
          method: 'PUT',
          body: JSON.stringify(bodyData)
        });
      } else {
        await apiFetch('/api/criteria',{
          method: 'POST',
          body: JSON.stringify(bodyData)
        });
      }

      setCriteriaSuccess(true);
      setEditingId(null);
      setCriteriaForm(initialFormState);
      fetchData(); 
    } catch (error) {
      alert("Error saving criteria: " + error.message);
    } finally {
      setCriteriaLoading(false);
      setTimeout(() => setCriteriaSuccess(false), 3000);
    }
  };

  const addSubjectRow = () => {
    setCriteriaForm(prev => ({ ...prev, subjects: [...prev.subjects, { subject_id: "", min_score: "", weight: "" }] }));
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
    <div className="mx-auto max-w-4xl pt-8 px-4 lg:px-8 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">จัดการเกณฑ์การรับสมัคร</h1>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm mb-8">
        <div className="mb-6 flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className={`rounded-full p-2 ${editingId ? 'bg-amber-100' : 'bg-primary/10'}`}>
              {editingId ? <Pencil className="h-6 w-6 text-amber-600" /> : <PlusCircle className="h-6 w-6 text-primary" />}
            </div>
            <h2 className="text-xl font-bold text-foreground">
              {editingId ? "แก้ไขเกณฑ์รับสมัคร" : "เปิดรอบรับสมัครใหม่"}
            </h2>
          </div>
          {editingId && (
            <button onClick={cancelEdit} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" /> ยกเลิกการแก้ไข
            </button>
          )}
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
                    checked={(criteriaForm.edu_status_req || []).includes(option.id)}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      setCriteriaForm(prev => {
                        const currentReqs = prev.edu_status_req || [];
                        return { ...prev, edu_status_req: isChecked ? [...currentReqs, option.id] : currentReqs.filter(item => item !== option.id) };
                      });
                    }}
                    className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                  />
                  {option.label}
                </label>
              ))}
            </div>
            {!(criteriaForm.edu_status_req || []).some(req => ["studying", "graduated"].includes(req)) && (
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
                    checked={(criteriaForm.edu_status_req || []).includes(option.id)}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      setCriteriaForm(prev => {
                        const currentReqs = prev.edu_status_req || [];
                        return { ...prev, edu_status_req: isChecked ? [...currentReqs, option.id] : currentReqs.filter(item => item !== option.id) };
                      });
                    }}
                    className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                  />
                  {option.label}
                </label>
              ))}
            </div>
            {!(criteriaForm.edu_status_req || []).some(req => ["high-school", "vocational", "high-vocational"].includes(req)) && (
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
                      <input type="number" step="0.01" min="0" max="100" placeholder="ขั้นต่ำ (ถ้ามี)" value={sub.min_score} onChange={(e) => updateSubjectRow(index, "min_score", e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
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

          <button type="submit" disabled={criteriaLoading} className={`mt-6 w-full rounded-md px-4 py-2 text-sm font-medium text-white transition-all disabled:opacity-50 ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-primary hover:bg-primary/90'}`}>
            {criteriaLoading ? "กำลังบันทึก..." : editingId ? "บันทึกการแก้ไข" : "เพิ่มเกณฑ์การรับสมัคร"}
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-bold text-foreground mb-4">เกณฑ์การรับสมัครปัจจุบัน</h2>
        {criteriaList.length === 0 ? (
          <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลเกณฑ์รับสมัคร</p>
        ) : (
          <div className="space-y-3">
            {criteriaList.map((crit) => (
              <div key={crit.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between border border-border rounded-lg p-4 bg-background">
                <div className="mb-3 sm:mb-0">
                  <h3 className="font-semibold text-foreground">
                    รอบที่ {crit.tcas_round} ปี {crit.academic_year} (รับ {crit.max_seats} คน)
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    GPAX ขั้นต่ำ: {crit.min_gpax} | เปิดรับสมัคร: {new Date(crit.start_date).toLocaleDateString('th-TH')} - {new Date(crit.end_date).toLocaleDateString('th-TH')}
                  </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => handleEdit(crit)} 
                    className="flex-1 sm:flex-none flex justify-center items-center gap-1 rounded bg-amber-100 text-amber-700 px-3 py-1.5 text-sm font-medium hover:bg-amber-200 transition-colors"
                  >
                    <Pencil className="h-4 w-4" /> แก้ไข
                  </button>
                  <button 
                    onClick={() => handleDelete(crit.id)} 
                    className="flex-1 sm:flex-none flex justify-center items-center gap-1 rounded bg-red-100 text-red-700 px-3 py-1.5 text-sm font-medium hover:bg-red-200 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" /> ลบ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}