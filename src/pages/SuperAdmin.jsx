import { useState, useEffect, useMemo } from "react";
import { ShieldAlert, PlusCircle, CheckCircle2, Users, BookOpen } from "lucide-react";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export default function SuperAdmin() {
  const [activeTab, setActiveTab] = useState("staff"); // "staff" or "criteria"

  // --- Database Data for Criteria Form ---
  const [facultiesDB, setFacultiesDB] = useState([]);
  const [projectsDB, setProjectsDB] = useState([]);

  // --- States for Staff Form ---
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffSuccess, setStaffSuccess] = useState(false);
  const [staffForm, setStaffForm] = useState({
    citizen_id: "", password: "", first_name: "", last_name: "",
  });

  // --- States for Criteria Form ---
  const [criteriaLoading, setCriteriaLoading] = useState(false);
  const [criteriaSuccess, setCriteriaSuccess] = useState(false);
  const [criteriaForm, setCriteriaForm] = useState({
    academic_year: new Date().getFullYear() + 543,
    tcas_round: "1", max_seats: "", min_gpax: "", project_id: "", faculty_id: "", program_id: "",
  });

  // Fetch initial data for Dropdowns
  useEffect(() => {
    const fetchData = async () => {
      const { data: facs } = await supabase.from('FACULTIES').select(`
        id, faculty_name, DEPARTMENTS ( id, PROGRAMS ( id, prog_name ) )
      `);
      if (facs) setFacultiesDB(facs);

      const { data: projs } = await supabase.from('ADMISSION_PROJECTS').select('*');
      if (projs) setProjectsDB(projs);
    };
    fetchData();
  }, []);

  // Filter programs dynamically
  const availablePrograms = useMemo(() => {
    if (!criteriaForm.faculty_id) return [];
    const faculty = facultiesDB.find(f => f.id.toString() === criteriaForm.faculty_id);
    if (!faculty) return [];
    return faculty.DEPARTMENTS.flatMap(d => d.PROGRAMS);
  }, [criteriaForm.faculty_id, facultiesDB]);

  // --- Handlers ---
  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    setStaffLoading(true);

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(staffForm.password, salt);

    const { error } = await supabase.from("USERS").insert([{
      citizen_id: staffForm.citizen_id,
      password: hashedPassword,
      first_name: staffForm.first_name,
      last_name: staffForm.last_name,
      role: "staff",
    }]);

    setStaffLoading(false);
    if (error) alert("เกิดข้อผิดพลาด: " + error.message);
    else {
      setStaffSuccess(true);
      setStaffForm({ citizen_id: "", password: "", first_name: "", last_name: "" });
      setTimeout(() => setStaffSuccess(false), 3000);
    }
  };

  const handleCriteriaSubmit = async (e) => {
    e.preventDefault();
    setCriteriaLoading(true);
    
    const { error } = await supabase.from('ADMISSION_CRITERIA').insert([{
      academic_year: parseInt(criteriaForm.academic_year),
      tcas_round: parseInt(criteriaForm.tcas_round),
      max_seats: parseInt(criteriaForm.max_seats),
      min_gpax: parseFloat(criteriaForm.min_gpax),
      program_id: parseInt(criteriaForm.program_id),
      project_id: parseInt(criteriaForm.project_id)
    }]);

    setCriteriaLoading(false);
    if (error) alert("Error: " + error.message);
    else {
      setCriteriaSuccess(true);
      setCriteriaForm({ ...criteriaForm, max_seats: "", min_gpax: "", program_id: "" });
      setTimeout(() => setCriteriaSuccess(false), 3000);
    }
  };

  return (
    <div className="mx-auto max-w-3xl pt-8 px-4 lg:px-8">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Super Admin Dashboard</h1>
        <p className="text-muted-foreground">จัดการบัญชีผู้ดูแลระบบ และตั้งค่าเกณฑ์การรับสมัคร</p>
      </div>

      {/* --- Tab Navigation --- */}
      <div className="mb-6 flex space-x-2 border-b border-border pb-px">
        <button
          onClick={() => setActiveTab("staff")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "staff" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" /> เพิ่มบัญชีเจ้าหน้าที่
        </button>
        <button
          onClick={() => setActiveTab("criteria")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "criteria" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen className="h-4 w-4" /> เพิ่มเกณฑ์รับสมัคร (เปิดรอบ)
        </button>
      </div>

      {/* --- Form Container --- */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        
        {/* TAB 1: ADD STAFF */}
        {activeTab === "staff" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-6 flex items-center gap-3 border-b pb-4">
              <div className="rounded-full bg-primary/10 p-2"><ShieldAlert className="h-6 w-6 text-primary" /></div>
              <div>
                <h2 className="text-xl font-bold text-foreground">สร้างบัญชีเจ้าหน้าที่ (Staff)</h2>
              </div>
            </div>

            {staffSuccess && (
              <div className="mb-4 flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> บันทึกบัญชีสำเร็จ!
              </div>
            )}

            <form onSubmit={handleStaffSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">รหัสประจำตัวประชาชน (Admin ID)</label>
                <input type="text" required value={staffForm.citizen_id} onChange={e => setStaffForm({...staffForm, citizen_id: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">ชื่อ</label>
                  <input type="text" required value={staffForm.first_name} onChange={e => setStaffForm({...staffForm, first_name: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">นามสกุล</label>
                  <input type="text" required value={staffForm.last_name} onChange={e => setStaffForm({...staffForm, last_name: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">รหัสผ่าน</label>
                <input type="password" required value={staffForm.password} onChange={e => setStaffForm({...staffForm, password: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3" />
              </div>
              <button type="submit" disabled={staffLoading} className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                {staffLoading ? "กำลังบันทึก..." : "สร้างบัญชีเจ้าหน้าที่"}
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: ADD CRITERIA */}
        {activeTab === "criteria" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="mb-6 flex items-center gap-3 border-b pb-4">
              <div className="rounded-full bg-primary/10 p-2"><PlusCircle className="h-6 w-6 text-primary" /></div>
              <div>
                <h2 className="text-xl font-bold text-foreground">เปิดรอบรับสมัครใหม่</h2>
              </div>
            </div>

            {criteriaSuccess && (
              <div className="mb-4 flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> บันทึกเกณฑ์รับสมัครสำเร็จ!
              </div>
            )}

            <form onSubmit={handleCriteriaSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">ปีการศึกษา</label>
                  <input type="number" required value={criteriaForm.academic_year} onChange={e => setCriteriaForm({...criteriaForm, academic_year: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">รอบ TCAS (1-4)</label>
                  <select required value={criteriaForm.tcas_round} onChange={e => setCriteriaForm({...criteriaForm, tcas_round: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3">
                    {[1,2,3,4].map(r => <option key={r} value={r}>รอบที่ {r}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">จำนวนรับ (ที่นั่ง)</label>
                  <input type="number" required min="1" value={criteriaForm.max_seats} onChange={e => setCriteriaForm({...criteriaForm, max_seats: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">GPAX ขั้นต่ำ</label>
                  <input type="number" step="0.01" min="0" max="4" required value={criteriaForm.min_gpax} onChange={e => setCriteriaForm({...criteriaForm, min_gpax: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">โครงการรับเข้าศึกษา</label>
                <select required value={criteriaForm.project_id} onChange={e => setCriteriaForm({...criteriaForm, project_id: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3">
                  <option value="" disabled>เลือกโครงการ</option>
                  {projectsDB.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">คณะ</label>
                <select required value={criteriaForm.faculty_id} onChange={e => setCriteriaForm({...criteriaForm, faculty_id: e.target.value, program_id: ""})} className="h-10 w-full rounded-md border border-input bg-background px-3">
                  <option value="" disabled>เลือกคณะ</option>
                  {facultiesDB.map(f => <option key={f.id} value={f.id}>{f.faculty_name}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">สาขาวิชา</label>
                <select required disabled={!criteriaForm.faculty_id} value={criteriaForm.program_id} onChange={e => setCriteriaForm({...criteriaForm, program_id: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3 disabled:opacity-50">
                  <option value="" disabled>{criteriaForm.faculty_id ? "เลือกสาขาวิชา" : "กรุณาเลือกคณะก่อน"}</option>
                  {availablePrograms.map(p => <option key={p.id} value={p.id}>{p.prog_name}</option>)}
                </select>
              </div>

              <button type="submit" disabled={criteriaLoading} className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                {criteriaLoading ? "กำลังบันทึก..." : "เพิ่มเกณฑ์การรับสมัคร"}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}