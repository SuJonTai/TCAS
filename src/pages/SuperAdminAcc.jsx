import { useState } from "react";
import { 
  ShieldAlert, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle 
} from "lucide-react";

export default function SuperAdminStaff() {
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffSuccess, setStaffSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  const [staffForm, setStaffForm] = useState({
    citizen_id: "", 
    password: "", 
    first_name: "", 
    last_name: "",
  });

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    setStaffLoading(true);
    setErrorMessage(""); // ล้างข้อความแจ้งเตือนเก่าก่อนเริ่มใหม่
    
    try {
      // ส่งข้อมูลไปยัง Backend API แทนการต่อฐานข้อมูลตรงๆ
      const response = await fetch("http://localhost:3000/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // "x-db-type": "mssql" // Uncomment บรรทัดนี้หากต้องการบังคับให้ Backend ใช้ MSSQL
        },
        body: JSON.stringify({
          citizen_id: staffForm.citizen_id,
          password: staffForm.password, // ส่งรหัสผ่านปกติไปให้ Backend นำไป Hash ต่อ
          first_name: staffForm.first_name,
          last_name: staffForm.last_name,
          role: "staff"
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "เกิดข้อผิดพลาดในการสร้างบัญชี");
      }

      // กรณีบันทึกสำเร็จ
      setStaffSuccess(true);
      setStaffForm({ citizen_id: "", password: "", first_name: "", last_name: "" });
      setTimeout(() => setStaffSuccess(false), 3000);
      
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setStaffLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl pt-8 px-4 lg:px-8 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">จัดการบัญชีเจ้าหน้าที่</h1>
        <p className="text-muted-foreground text-sm">เพิ่มและจัดการบัญชีสำหรับเจ้าหน้าที่ตรวจสอบข้อมูลการรับสมัคร</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3 border-b pb-4">
          <div className="rounded-full bg-primary/10 p-2">
            <ShieldAlert className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">สร้างบัญชีเจ้าหน้าที่ (Staff)</h2>
          </div>
        </div>

        {/* แจ้งเตือนเมื่อสำเร็จ */}
        {staffSuccess && (
          <div className="mb-6 flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-600 border border-emerald-100 animate-in fade-in">
            <CheckCircle2 className="h-5 w-5" /> บันทึกบัญชีเจ้าหน้าที่สำเร็จ!
          </div>
        )}

        {/* แจ้งเตือนเมื่อเกิดข้อผิดพลาด */}
        {errorMessage && (
          <div className="mb-6 flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-100 animate-in fade-in">
            <AlertCircle className="h-5 w-5" /> {errorMessage}
          </div>
        )}

        <form onSubmit={handleStaffSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">รหัสประจำตัวประชาชน (Admin ID)</label>
            <input 
              type="text" 
              required 
              maxLength={13}
              placeholder="เลขประจำตัวประชาชน 13 หลัก"
              value={staffForm.citizen_id} 
              onChange={e => setStaffForm({...staffForm, citizen_id: e.target.value})} 
              className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors" 
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">ชื่อ</label>
              <input 
                type="text" 
                required 
                placeholder="ชื่อจริง"
                value={staffForm.first_name} 
                onChange={e => setStaffForm({...staffForm, first_name: e.target.value})} 
                className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors" 
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">นามสกุล</label>
              <input 
                type="text" 
                required 
                placeholder="นามสกุล"
                value={staffForm.last_name} 
                onChange={e => setStaffForm({...staffForm, last_name: e.target.value})} 
                className="h-10 w-full rounded-md border border-input bg-background px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors" 
              />
            </div>
          </div>
          
          <div>
            <label className="mb-1 block text-sm font-medium">รหัสผ่าน</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                placeholder="กำหนดรหัสผ่านสำหรับเจ้าหน้าที่"
                value={staffForm.password} 
                onChange={e => setStaffForm({...staffForm, password: e.target.value})} 
                className="h-10 w-full rounded-md border border-input bg-background pl-3 pr-10 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors" 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={staffLoading} 
            className="mt-6 w-full flex items-center justify-center h-10 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {staffLoading ? (
               <>
                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                 กำลังบันทึกข้อมูล...
               </>
            ) : "สร้างบัญชีเจ้าหน้าที่"}
          </button>
        </form>
      </div>
    </div>
  );
}