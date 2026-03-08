import { useState, useEffect, useMemo } from "react";
import { Building2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function SuperAdminAcademic() {
  const [facultiesDB, setFacultiesDB] = useState([]);
  
  const [academicLoading, setAcademicLoading] = useState(false);
  const [academicSuccessMessage, setAcademicSuccessMessage] = useState("");
  const [facultyForm, setFacultyForm] = useState({ faculty_name: "" });
  const [deptForm, setDeptForm] = useState({ faculty_id: "", dept_name: "" });
  const [progForm, setProgForm] = useState({ faculty_id: "", dept_id: "", prog_name: "" });
  const [projectForm, setProjectForm] = useState({ project_name: "" });

  const fetchFaculties = async () => {
    const { data: facs } = await supabase.from('FACULTIES').select(`
      id, faculty_name, DEPARTMENTS ( id, dept_name, PROGRAMS ( id, prog_name ) )
    `);
    if (facs) setFacultiesDB(facs);
  };

  useEffect(() => { 
    fetchFaculties(); 
  }, []);

  const availableDeptsForProg = useMemo(() => {
    if (!progForm.faculty_id) return [];
    const faculty = facultiesDB.find(f => f.id.toString() === progForm.faculty_id);
    return faculty ? faculty.DEPARTMENTS : [];
  }, [progForm.faculty_id, facultiesDB]);

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
    const { error } = await supabase.from('DEPARTMENTS').insert([{ faculty_id: parseInt(deptForm.faculty_id), dept_name: deptForm.dept_name }]);
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
    const { error } = await supabase.from('PROGRAMS').insert([{ dept_id: parseInt(progForm.dept_id), prog_name: progForm.prog_name }]);
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
    const { error } = await supabase.from('ADMISSION_PROJECTS').insert([{ project_name: projectForm.project_name }]);
    setAcademicLoading(false);

    if (error) alert("Error: " + error.message);
    else { 
      showAcademicSuccess("เพิ่มโครงการรับเข้าศึกษาสำเร็จ!"); 
      setProjectForm({ project_name: "" }); 
    }
  };

  return (
    <div className="mx-auto max-w-3xl pt-8 px-4 lg:px-8 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
      <div className="mb-2 flex items-center gap-3 border-b pb-4">
        <div className="rounded-full bg-primary/10 p-2"><Building2 className="h-6 w-6 text-primary" /></div>
        <div><h2 className="text-xl font-bold text-foreground">จัดการโครงสร้างการศึกษา</h2></div>
      </div>

      {academicSuccessMessage && (
        <div className="flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-600">
          <CheckCircle2 className="h-4 w-4" /> {academicSuccessMessage}
        </div>
      )}

      {/* 3.1 Add Faculty */}
      <section className="rounded-lg border border-border p-4 bg-muted/20">
        <h3 className="font-semibold mb-3">1. เพิ่มคณะใหม่</h3>
        <form onSubmit={handleFacultySubmit} className="flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <label className="mb-1 block text-sm font-medium">ชื่อคณะ</label>
            <input type="text" required value={facultyForm.faculty_name} onChange={e => setFacultyForm({...facultyForm, faculty_name: e.target.value})} placeholder="เช่น คณะวิศวกรรมศาสตร์" className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>
          <button type="submit" disabled={academicLoading} className="h-10 w-full sm:w-auto rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-all disabled:opacity-50 whitespace-nowrap">
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
        <form onSubmit={handleProjectSubmit} className="flex flex-col sm:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <label className="mb-1 block text-sm font-medium">ชื่อโครงการ</label>
            <input type="text" required value={projectForm.project_name} onChange={e => setProjectForm({...projectForm, project_name: e.target.value})} placeholder="เช่น โครงการช้างเผือก, โครงการ Portfolio" className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>
          <button type="submit" disabled={academicLoading} className="h-10 w-full sm:w-auto rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-all disabled:opacity-50 whitespace-nowrap">
            เพิ่มโครงการ
          </button>
        </form>
      </section>
    </div>
  );
}