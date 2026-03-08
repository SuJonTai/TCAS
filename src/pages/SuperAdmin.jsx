import { useState, useEffect, useMemo } from "react";
import { ShieldAlert, PlusCircle, CheckCircle2, Users, BookOpen, Building2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export default function SuperAdmin() {
  const [activeTab, setActiveTab] = useState("staff");

  // --- Database Data ---
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
    tcas_round: "1", 
    max_seats: "", 
    min_gpax: "", 
    edu_status_req: [], 
    project_id: "", 
    faculty_id: "", 
    dept_id: "", 
    program_id: "",
    start_date: "", // เพิ่มบรรทัดนี้
    end_date: "",   // เพิ่มบรรทัดนี้
  });

  // --- States for Academic Structure Forms ---
  const [academicLoading, setAcademicLoading] = useState(false);
  const [academicSuccessMessage, setAcademicSuccessMessage] = useState("");
  const [facultyForm, setFacultyForm] = useState({ faculty_name: "" });
  const [deptForm, setDeptForm] = useState({ faculty_id: "", dept_name: "" });
  const [progForm, setProgForm] = useState({ faculty_id: "", dept_id: "", prog_name: "" });
  const [projectForm, setProjectForm] = useState({ project_name: "" });

  // --- Data Fetching ---
  const fetchFaculties = async () => {
    const { data: facs } = await supabase.from('FACULTIES').select(`
      id, faculty_name, DEPARTMENTS ( id, dept_name, PROGRAMS ( id, prog_name ) )
    `);
    if (facs) setFacultiesDB(facs);
  };

  const fetchProjects = async () => {
    const { data: projs } = await supabase.from('ADMISSION_PROJECTS').select('*');
    if (projs) setProjectsDB(projs);
  };

  useEffect(() => {
    fetchFaculties();
    fetchProjects();
  }, []);

  // --- Derived States (Dropdown Filters) ---
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

  const availableDeptsForProg = useMemo(() => {
    if (!progForm.faculty_id) return [];
    const faculty = facultiesDB.find(f => f.id.toString() === progForm.faculty_id);
    return faculty ? faculty.DEPARTMENTS : [];
  }, [progForm.faculty_id, facultiesDB]);

  // --- Handlers: Staff & Criteria ---
  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    setStaffLoading(true);
    
    // Note: Move this hashing logic to a backend route for production security
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

    // --- Validation: เช็คสถานะและวุฒิ ---
    const hasStatus = criteriaForm.edu_status_req.some(req => ["studying", "graduated"].includes(req));
    const hasType = criteriaForm.edu_status_req.some(req => ["high-school", "vocational", "high-vocational"].includes(req));

    if (!hasStatus) {
      alert("กรุณาเลือกสถานะการศึกษา (กำลังศึกษา/สำเร็จการศึกษา) อย่างน้อย 1 รายการ");
      return;
    }
    if (!hasType) {
      alert("กรุณาเลือกวุฒิการศึกษา (ม.6/ปวช./ปวส.) อย่างน้อย 1 รายการ");
      return;
    }

    // --- เพิ่ม Validation: เช็ควันที่ ---
    if (new Date(criteriaForm.start_date) > new Date(criteriaForm.end_date)) {
      alert("วันที่สิ้นสุดการรับสมัคร ต้องไม่ก่อนวันที่เริ่มต้น");
      return;
    }

    setCriteriaLoading(true);
    
    const { error } = await supabase.from('ADMISSION_CRITERIA').insert([{
      academic_year: parseInt(criteriaForm.academic_year),
      tcas_round: parseInt(criteriaForm.tcas_round),
      max_seats: parseInt(criteriaForm.max_seats),
      min_gpax: parseFloat(criteriaForm.min_gpax),
      edu_status_req: criteriaForm.edu_status_req, 
      program_id: parseInt(criteriaForm.program_id),
      project_id: parseInt(criteriaForm.project_id),
      start_date: criteriaForm.start_date, // เพิ่มบรรทัดนี้
      end_date: criteriaForm.end_date      // เพิ่มบรรทัดนี้
    }]);

    setCriteriaLoading(false);
    if (error) alert("Error: " + error.message);
    else {
      setCriteriaSuccess(true);
      setCriteriaForm({ 
        ...criteriaForm, 
        max_seats: "", 
        min_gpax: "", 
        dept_id: "", 
        program_id: "",
        edu_status_req: [],
        start_date: "", // เพิ่มบรรทัดนี้
        end_date: ""    // เพิ่มบรรทัดนี้
      });
      setTimeout(() => setCriteriaSuccess(false), 3000);
    }
  };

  // --- Handlers: Academic Structure ---
  const showAcademicSuccess = (msg) => {
    setAcademicSuccessMessage(msg);
    setTimeout(() => setAcademicSuccessMessage(""), 3000);
  };

  const handleFacultySubmit = async (e) => {
    e.preventDefault();
    setAcademicLoading(true);
    const { error } = await supabase.from('FACULTIES').insert([{ faculty_name: facultyForm.faculty_name }]);
    setAcademicLoading(false);
    if (error) alert("Error: " + error.message);
    else {
      showAcademicSuccess("เพิ่มคณะสำเร็จ!");
      setFacultyForm({ faculty_name: "" });
      fetchFaculties();
    }
  };

  const handleDeptSubmit = async (e) => {
    e.preventDefault();
    setAcademicLoading(true);
    const { error } = await supabase.from('DEPARTMENTS').insert([{ 
      faculty_id: parseInt(deptForm.faculty_id), 
      dept_name: deptForm.dept_name 
    }]);
    setAcademicLoading(false);
    if (error) alert("Error: " + error.message);
    else {
      showAcademicSuccess("เพิ่มภาควิชาสำเร็จ!");
      setDeptForm({ faculty_id: "", dept_name: "" });
      fetchFaculties();
    }
  };

  const handleProgSubmit = async (e) => {
    e.preventDefault();
    setAcademicLoading(true);
    const { error } = await supabase.from('PROGRAMS').insert([{ 
      dept_id: parseInt(progForm.dept_id), 
      prog_name: progForm.prog_name 
    }]);
    setAcademicLoading(false);
    if (error) alert("Error: " + error.message);
    else {
      showAcademicSuccess("เพิ่มสาขาวิชาสำเร็จ!");
      setProgForm({ faculty_id: "", dept_id: "", prog_name: "" });
      fetchFaculties();
    }
  };

  const handleProjectSubmit = async (e) => {
    e.preventDefault();
    setAcademicLoading(true);
    const { error } = await supabase.from('ADMISSION_PROJECTS').insert([{ 
      project_name: projectForm.project_name 
    }]);
    setAcademicLoading(false);
    if (error) alert("Error: " + error.message);
    else {
      showAcademicSuccess("เพิ่มโครงการรับเข้าศึกษาสำเร็จ!");
      setProjectForm({ project_name: "" });
      fetchProjects();
    }
  };

  return (
    <div className="mx-auto max-w-3xl pt-8 px-4 lg:px-8 pb-12">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Super Admin Dashboard</h1>
        <p className="text-muted-foreground">จัดการบัญชีผู้ดูแลระบบ และตั้งค่าโครงสร้างการรับสมัคร</p>
      </div>

      {/* --- Tab Navigation --- */}
      <div className="mb-6 flex space-x-2 border-b border-border pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab("staff")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === "staff" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" /> เพิ่มบัญชีเจ้าหน้าที่
        </button>
        <button
          onClick={() => setActiveTab("criteria")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === "criteria" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen className="h-4 w-4" /> เพิ่มเกณฑ์รับสมัคร (เปิดรอบ)
        </button>
        <button
          onClick={() => setActiveTab("academic")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
            activeTab === "academic" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 className="h-4 w-4" /> โครงสร้างคณะ/สาขา
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
                <input type="text" required value={staffForm.citizen_id} onChange={e => setStaffForm({...staffForm, citizen_id: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">ชื่อ</label>
                  <input type="text" required value={staffForm.first_name} onChange={e => setStaffForm({...staffForm, first_name: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">นามสกุล</label>
                  <input type="text" required value={staffForm.last_name} onChange={e => setStaffForm({...staffForm, last_name: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">รหัสผ่าน</label>
                <input type="password" required value={staffForm.password} onChange={e => setStaffForm({...staffForm, password: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
              </div>
              <button type="submit" disabled={staffLoading} className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-all disabled:opacity-50">
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

{/* --- ส่วนที่ 1: กลุ่มสถานะการศึกษา --- */}
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
                        // เช็คและเก็บค่าที่ edu_status_req เสมอ
                        checked={criteriaForm.edu_status_req.includes(option.id)}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setCriteriaForm(prev => {
                            const currentReqs = prev.edu_status_req;
                            return { 
                              ...prev, 
                              edu_status_req: isChecked 
                                ? [...currentReqs, option.id] 
                                : currentReqs.filter(item => item !== option.id) 
                            };
                          });
                        }}
                        className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                {/* ดักแจ้งเตือนว่าเลือกกลุ่มสถานะหรือยัง */}
                {!criteriaForm.edu_status_req.some(req => ["studying", "graduated"].includes(req)) && (
                  <p className="mt-1 text-xs text-red-500">กรุณาเลือกสถานะอย่างน้อย 1 รายการ</p>
                )}
              </div>

              {/* --- ส่วนที่ 2: กลุ่มวุฒิการศึกษา --- */}
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
                        // เช็คและเก็บค่าที่ edu_status_req ตัวเดิมเหมือนกัน
                        checked={criteriaForm.edu_status_req.includes(option.id)}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setCriteriaForm(prev => {
                            const currentReqs = prev.edu_status_req;
                            return { 
                              ...prev, 
                              edu_status_req: isChecked 
                                ? [...currentReqs, option.id] 
                                : currentReqs.filter(item => item !== option.id) 
                            };
                          });
                        }}
                        className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                {/* ดักแจ้งเตือนว่าเลือกกลุ่มวุฒิหรือยัง */}
                {!criteriaForm.edu_status_req.some(req => ["high-school", "vocational", "high-vocational"].includes(req)) && (
                  <p className="mt-1 text-xs text-red-500">กรุณาเลือกวุฒิการศึกษาอย่างน้อย 1 รายการ</p>
                )}
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

              <button type="submit" disabled={criteriaLoading} className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-all disabled:opacity-50">
                {criteriaLoading ? "กำลังบันทึก..." : "เพิ่มเกณฑ์การรับสมัคร"}
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: ADD ACADEMIC STRUCTURE */}
        {activeTab === "academic" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
            <div className="mb-2 flex items-center gap-3 border-b pb-4">
              <div className="rounded-full bg-primary/10 p-2"><Building2 className="h-6 w-6 text-primary" /></div>
              <div>
                <h2 className="text-xl font-bold text-foreground">จัดการโครงสร้างการศึกษา</h2>
              </div>
            </div>

            {academicSuccessMessage && (
              <div className="flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> {academicSuccessMessage}
              </div>
            )}

            {/* 3.1 Add Faculty */}
            <section className="rounded-lg border border-border p-4 bg-muted/20">
              <h3 className="font-semibold mb-3">1. เพิ่มคณะใหม่</h3>
              <form onSubmit={handleFacultySubmit} className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium">ชื่อคณะ</label>
                  <input type="text" required value={facultyForm.faculty_name} onChange={e => setFacultyForm({...facultyForm, faculty_name: e.target.value})} placeholder="เช่น คณะวิศวกรรมศาสตร์" className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                </div>
                <button type="submit" disabled={academicLoading} className="h-10 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-all disabled:opacity-50 whitespace-nowrap">
                  เพิ่มคณะ
                </button>
              </form>
            </section>

            {/* 3.2 Add Department */}
            <section className="rounded-lg border border-border p-4 bg-muted/20">
              <h3 className="font-semibold mb-3">2. เพิ่มภาควิชา</h3>
              <form onSubmit={handleDeptSubmit} className="flex flex-col sm:flex-row items-end gap-4">
                <div className="w-full sm:w-1/3">
                  <label className="mb-1 block text-sm font-medium">เลือกคณะ</label>
                  <select required value={deptForm.faculty_id} onChange={e => setDeptForm({...deptForm, faculty_id: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                    <option value="" disabled>เลือกคณะ</option>
                    {facultiesDB.map(f => <option key={f.id} value={f.id}>{f.faculty_name}</option>)}
                  </select>
                </div>
                <div className="flex-1 w-full">
                  <label className="mb-1 block text-sm font-medium">ชื่อภาควิชา</label>
                  <input type="text" required value={deptForm.dept_name} onChange={e => setDeptForm({...deptForm, dept_name: e.target.value})} placeholder="เช่น ภาควิชาวิศวกรรมคอมพิวเตอร์" className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                </div>
                <button type="submit" disabled={academicLoading} className="h-10 w-full sm:w-auto rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-all disabled:opacity-50 whitespace-nowrap">
                  เพิ่มภาควิชา
                </button>
              </form>
            </section>

            {/* 3.3 Add Program */}
            <section className="rounded-lg border border-border p-4 bg-muted/20">
              <h3 className="font-semibold mb-3">3. เพิ่มสาขาวิชา (หลักสูตร)</h3>
              <form onSubmit={handleProgSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">เลือกคณะ</label>
                    <select required value={progForm.faculty_id} onChange={e => setProgForm({...progForm, faculty_id: e.target.value, dept_id: ""})} className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                      <option value="" disabled>เลือกคณะ</option>
                      {facultiesDB.map(f => <option key={f.id} value={f.id}>{f.faculty_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">เลือกภาควิชา</label>
                    <select required disabled={!progForm.faculty_id} value={progForm.dept_id} onChange={e => setProgForm({...progForm, dept_id: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3 disabled:opacity-50 outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                      <option value="" disabled>{progForm.faculty_id ? "เลือกภาควิชา" : "กรุณาเลือกคณะก่อน"}</option>
                      {availableDeptsForProg.map(d => <option key={d.id} value={d.id}>{d.dept_name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-end gap-4">
                  <div className="flex-1 w-full">
                    <label className="mb-1 block text-sm font-medium">ชื่อสาขาวิชา</label>
                    <input type="text" required value={progForm.prog_name} onChange={e => setProgForm({...progForm, prog_name: e.target.value})} placeholder="เช่น วศ.บ. วิศวกรรมซอฟต์แวร์ (ปกติ)" className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                  </div>
                  <button type="submit" disabled={academicLoading} className="h-10 w-full sm:w-auto rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-all disabled:opacity-50 whitespace-nowrap">
                    เพิ่มสาขาวิชา
                  </button>
                </div>
              </form>
            </section>

            {/* 3.4 Add Admission Project */}
            <section className="rounded-lg border border-border p-4 bg-muted/20">
              <h3 className="font-semibold mb-3">4. เพิ่มโครงการรับเข้าศึกษา</h3>
              <form onSubmit={handleProjectSubmit} className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium">ชื่อโครงการ</label>
                  <input type="text" required value={projectForm.project_name} onChange={e => setProjectForm({...projectForm, project_name: e.target.value})} placeholder="เช่น โครงการช้างเผือก, โครงการ Portfolio" className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                </div>
                <button type="submit" disabled={academicLoading} className="h-10 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-all disabled:opacity-50 whitespace-nowrap">
                  เพิ่มโครงการ
                </button>
              </form>
            </section>
          </div>
        )}

      </div>
    </div>
  );
}