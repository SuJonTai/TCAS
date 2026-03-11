import { useState, useEffect, useMemo } from "react";
import { Building2, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export default function SuperAdminAcademic() {
  const [facultiesDB, setFacultiesDB] = useState([]);
  const [academicLoading, setAcademicLoading] = useState(false);
  const [academicSuccessMessage, setAcademicSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [facultyForm, setFacultyForm] = useState({ faculty_name: "" });
  const [deptForm, setDeptForm] = useState({ faculty_id: "", dept_name: "" });
  const [progForm, setProgForm] = useState({ faculty_id: "", dept_id: "", prog_name: "" });
  const [projectForm, setProjectForm] = useState({ project_name: "" });

  const fetchFaculties = async () => {
  try {
    // เพิ่ม Timestamp เพื่อป้องกัน Browser Cache (ถ้าใช้ MS SQL)
    const response = await fetch(`http://localhost:3000/api/faculties?t=${Date.now()}`);
    const data = await response.json();
    
    if (response.ok) {
      console.log("Updated Faculties Data:", data); // ตรวจสอบใน Console ว่า DEPARTMENTS มาครบไหม
      setFacultiesDB([...data]); // ใช้ Spread Operator เพื่อบังคับให้ React รู้ว่า State เปลี่ยน
    }
  } catch (error) {
    console.error("Fetch error:", error);
  }
};

  useEffect(() => {
    fetchFaculties();
  }, []);

  const availableDeptsForProg = useMemo(() => {
  if (!progForm.faculty_id) return [];
  
  const faculty = facultiesDB.find(f => Number(f.id) === Number(progForm.faculty_id));
  
  if (!faculty) return [];

  // เช็คทั้ง DEPARTMENTS และ departments
  const depts = faculty.DEPARTMENTS || faculty.departments || [];
  
  console.log("Depts found for this faculty:", depts);
  return depts;
}, [progForm.faculty_id, facultiesDB]);

  const showAcademicSuccess = (msg) => {
    setAcademicSuccessMessage(msg);
    setErrorMessage("");
    setTimeout(() => setAcademicSuccessMessage(""), 3000);
  };

  // ฟังก์ชันกลางสำหรับส่งข้อมูลไปยัง Backend
  const submitToBackend = async (endpoint, body, successMsg, resetForm) => {
    setAcademicLoading(true);
    setErrorMessage("");
    try {
      const response = await fetch(`http://localhost:3000/api/${endpoint}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-db-type": "sqlserver" // เพิ่มบรรทัดนี้ หรือดึงจาก config/state
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.message || "เกิดข้อผิดพลาด");

      showAcademicSuccess(successMsg);
      resetForm();
      fetchFaculties();
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setAcademicLoading(false);
    }
  };

  const handleFacultySubmit = (e) => {
    e.preventDefault();
    submitToBackend("faculties", facultyForm, "เพิ่มคณะสำเร็จ!", () => setFacultyForm({ faculty_name: "" }));
  };

  const handleDeptSubmit = (e) => {
    e.preventDefault();
    submitToBackend("departments", { 
      faculty_id: parseInt(deptForm.faculty_id), 
      dept_name: deptForm.dept_name 
    }, "เพิ่มภาควิชาสำเร็จ!", () => setDeptForm({ faculty_id: "", dept_name: "" }));
  };

  const handleProgSubmit = (e) => {
    e.preventDefault();
    submitToBackend("programs", { 
      dept_id: parseInt(progForm.dept_id), 
      prog_name: progForm.prog_name 
    }, "เพิ่มสาขาวิชาสำเร็จ!", () => setProgForm({ faculty_id: "", dept_id: "", prog_name: "" }));
  };

  const handleProjectSubmit = (e) => {
    e.preventDefault();
    submitToBackend("admission-projects", projectForm, "เพิ่มโครงการรับเข้าสำเร็จ!", () => setProjectForm({ project_name: "" }));
  };

  return (
    <div className="mx-auto max-w-3xl pt-8 px-4 lg:px-8 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
      <div className="mb-2 flex items-center gap-3 border-b pb-4">
        <div className="rounded-full bg-primary/10 p-2"><Building2 className="h-6 w-6 text-primary" /></div>
        <div><h2 className="text-xl font-bold text-foreground">จัดการโครงสร้างการศึกษา</h2></div>
      </div>

      {/* แจ้งเตือน Success/Error */}
      {academicSuccessMessage && (
        <div className="flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-600 border border-emerald-100">
          <CheckCircle2 className="h-4 w-4" /> {academicSuccessMessage}
        </div>
      )}
      {errorMessage && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-100">
          <AlertCircle className="h-4 w-4" /> {errorMessage}
        </div>
      )}

      {/* 1. Add Faculty */}
      <section className="rounded-lg border border-border p-5 bg-card shadow-sm">
        <h3 className="font-bold mb-4 flex items-center gap-2 text-primary">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[12px] text-white">1</span>
          เพิ่มคณะใหม่
        </h3>
        <form onSubmit={handleFacultySubmit} className="flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wider">ชื่อคณะ</label>
            <input type="text" required value={facultyForm.faculty_name} onChange={e => setFacultyForm({...facultyForm, faculty_name: e.target.value})} placeholder="เช่น คณะวิศวกรรมศาสตร์" className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
          </div>
          <button type="submit" disabled={academicLoading} className="h-10 w-full sm:w-auto rounded-md bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {academicLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "เพิ่มคณะ"}
          </button>
        </form>
      </section>

      {/* 2. Add Department */}
      <section className="rounded-lg border border-border p-5 bg-card shadow-sm">
        <h3 className="font-bold mb-4 flex items-center gap-2 text-primary">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[12px] text-white">2</span>
          เพิ่มภาควิชา
        </h3>
        <form onSubmit={handleDeptSubmit} className="flex flex-col sm:flex-row items-end gap-4">
          <div className="w-full sm:w-1/3">
            <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wider">เลือกคณะ</label>
            <select required value={deptForm.faculty_id} onChange={e => setDeptForm({...deptForm, faculty_id: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary">
              <option value="" disabled>เลือกคณะ</option>
              {facultiesDB.map(f => <option key={f.id} value={f.id}>{f.faculty_name}</option>)}
            </select>
          </div>
          <div className="flex-1 w-full">
            <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wider">ชื่อภาควิชา</label>
            <input type="text" required value={deptForm.dept_name} onChange={e => setDeptForm({...deptForm, dept_name: e.target.value})} placeholder="เช่น ภาควิชาวิศวกรรมคอมพิวเตอร์" className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>
          <button type="submit" disabled={academicLoading} className="h-10 w-full sm:w-auto rounded-md bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-all disabled:opacity-50">
            {academicLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "เพิ่มภาควิชา"}
          </button>
        </form>
      </section>

      {/* 3. Add Program */}
      <section className="rounded-lg border border-border p-5 bg-card shadow-sm">
        <h3 className="font-bold mb-4 flex items-center gap-2 text-primary">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[12px] text-white">3</span>
          เพิ่มสาขาวิชา (หลักสูตร)
        </h3>
        <form onSubmit={handleProgSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wider">เลือกคณะ</label>
              <select required value={progForm.faculty_id} onChange={e => setProgForm({...progForm, faculty_id: e.target.value, dept_id: ""})} className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                <option value="" disabled>เลือกคณะ</option>
                {facultiesDB.map(f => <option key={f.id} value={f.id}>{f.faculty_name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wider">เลือกภาควิชา</label>
              <select required disabled={!progForm.faculty_id} value={progForm.dept_id} onChange={e => setProgForm({...progForm, dept_id: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background px-3 disabled:opacity-50 outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                <option value="" disabled>{progForm.faculty_id ? "เลือกภาควิชา" : "กรุณาเลือกคณะก่อน"}</option>
                {availableDeptsForProg?.map(d => <option key={d.id} value={d.id}>{d.dept_name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-end gap-4">
            <div className="flex-1 w-full">
              <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wider">ชื่อสาขาวิชา</label>
              <input type="text" required value={progForm.prog_name} onChange={e => setProgForm({...progForm, prog_name: e.target.value})} placeholder="เช่น วศ.บ. วิศวกรรมซอฟต์แวร์ (ปกติ)" className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
            <button type="submit" disabled={academicLoading} className="h-10 w-full sm:w-auto rounded-md bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-all disabled:opacity-50">
               {academicLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "เพิ่มสาขาวิชา"}
            </button>
          </div>
        </form>
      </section>

      {/* 4. Add Admission Project */}
      <section className="rounded-lg border border-border p-5 bg-card shadow-sm">
        <h3 className="font-bold mb-4 flex items-center gap-2 text-primary">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[12px] text-white">4</span>
          เพิ่มโครงการรับเข้าศึกษา
        </h3>
        <form onSubmit={handleProjectSubmit} className="flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wider">ชื่อโครงการ</label>
            <input type="text" required value={projectForm.project_name} onChange={e => setProjectForm({...projectForm, project_name: e.target.value})} placeholder="เช่น โครงการช้างเผือก, โครงการ Portfolio" className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>
          <button type="submit" disabled={academicLoading} className="h-10 w-full sm:w-auto rounded-md bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-all disabled:opacity-50">
             {academicLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "เพิ่มโครงการ"}
          </button>
        </form>
      </section>
    </div>
  );
}