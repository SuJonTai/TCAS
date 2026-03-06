import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { PlusCircle, CheckCircle2 } from "lucide-react";

export default function AddCriteria() {
  const [facultiesDB, setFacultiesDB] = useState([]);
  const [projectsDB, setProjectsDB] = useState([]);
  
  const [form, setForm] = useState({
    academic_year: new Date().getFullYear() + 543, // Default to Thai year approx
    tcas_round: "1",
    max_seats: "",
    min_gpax: "",
    project_id: "",
    faculty_id: "",
    program_id: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch Faculties and Programs
      const { data: facs } = await supabase.from('FACULTIES').select(`
        id, faculty_name, DEPARTMENTS ( id, PROGRAMS ( id, prog_name ) )
      `);
      if (facs) setFacultiesDB(facs);

      // Fetch Projects
      const { data: projs } = await supabase.from('ADMISSION_PROJECTS').select('*');
      if (projs) setProjectsDB(projs);
    };
    fetchData();
  }, []);

  // Filter programs based on selected faculty
  const availablePrograms = useMemo(() => {
    if (!form.faculty_id) return [];
    const faculty = facultiesDB.find(f => f.id.toString() === form.faculty_id);
    if (!faculty) return [];
    return faculty.DEPARTMENTS.flatMap(d => d.PROGRAMS);
  }, [form.faculty_id, facultiesDB]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.from('ADMISSION_CRITERIA').insert([{
      academic_year: parseInt(form.academic_year),
      tcas_round: parseInt(form.tcas_round),
      max_seats: parseInt(form.max_seats),
      min_gpax: parseFloat(form.min_gpax),
      program_id: parseInt(form.program_id),
      project_id: parseInt(form.project_id)
    }]);

    setLoading(false);
    if (error) {
      alert("Error adding criteria: " + error.message);
    } else {
      setSuccess(true);
      setForm({ ...form, max_seats: "", min_gpax: "", program_id: "" });
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  return (
    <div className="mx-auto max-w-2xl pt-8 px-4">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3 border-b pb-4">
          <div className="rounded-full bg-primary/10 p-2">
            <PlusCircle className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">เพิ่มเกณฑ์รับสมัคร (เปิดรอบใหม่)</h1>
            <p className="text-sm text-muted-foreground">สำหรับเจ้าหน้าที่เท่านั้น</p>
          </div>
        </div>

        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>บันทึกเกณฑ์รับสมัครสำเร็จ!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">ปีการศึกษา</label>
              <input type="number" required value={form.academic_year} onChange={e => setForm({...form, academic_year: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">รอบ TCAS (1-4)</label>
              <select required value={form.tcas_round} onChange={e => setForm({...form, tcas_round: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3">
                {[1,2,3,4].map(r => <option key={r} value={r}>รอบที่ {r}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">จำนวนรับ (ที่นั่ง)</label>
              <input type="number" required min="1" value={form.max_seats} onChange={e => setForm({...form, max_seats: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">GPAX ขั้นต่ำ</label>
              <input type="number" step="0.01" min="0" max="4" required value={form.min_gpax} onChange={e => setForm({...form, min_gpax: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">โครงการรับเข้าศึกษา</label>
            <select required value={form.project_id} onChange={e => setForm({...form, project_id: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3">
              <option value="" disabled>เลือกโครงการ</option>
              {projectsDB.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">คณะ</label>
            <select required value={form.faculty_id} onChange={e => setForm({...form, faculty_id: e.target.value, program_id: ""})} className="h-10 w-full rounded-md border border-input bg-background px-3">
              <option value="" disabled>เลือกคณะ</option>
              {facultiesDB.map(f => <option key={f.id} value={f.id}>{f.faculty_name}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">สาขาวิชา</label>
            <select required disabled={!form.faculty_id} value={form.program_id} onChange={e => setForm({...form, program_id: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3 disabled:opacity-50">
              <option value="" disabled>{form.faculty_id ? "เลือกสาขาวิชา" : "กรุณาเลือกคณะก่อน"}</option>
              {availablePrograms.map(p => <option key={p.id} value={p.id}>{p.prog_name}</option>)}
            </select>
          </div>

          <button type="submit" disabled={loading} className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            {loading ? "กำลังบันทึก..." : "เพิ่มเกณฑ์การรับสมัคร"}
          </button>
        </form>
      </div>
    </div>
  );
}