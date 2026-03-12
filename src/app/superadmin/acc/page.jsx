"use client"

import { useState } from "react";
import { ShieldAlert, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export default function SuperAdminStaff() {
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffSuccess, setStaffSuccess] = useState(false);
  const [staffForm, setStaffForm] = useState({
     citizen_id: "", password: "", first_name: "", last_name: "",
  });

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

  return (
    <div className="mx-auto max-w-3xl pt-8 px-4 lg:px-8 pb-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
       <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">จัดการบัญชีเจ้าหน้าที่</h1>
      </div>

       <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3 border-b border-border pb-4">
           <div className="rounded-full bg-primary/10 p-2"><ShieldAlert className="h-6 w-6 text-primary" /></div>
          <div><h2 className="text-xl font-bold text-foreground">สร้างบัญชีเจ้าหน้าที่ (Staff)</h2></div>
        </div>

        {staffSuccess && (
           <div className="mb-4 flex items-center gap-2 rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" /> บันทึกบัญชีสำเร็จ!
           </div>
        )}

        <form onSubmit={handleStaffSubmit} className="space-y-4">
           <div>
             <label className="mb-1 block text-sm font-medium text-foreground">รหัสประจำตัวประชาชน (Admin ID)</label>
            <input type="text" required value={staffForm.citizen_id} onChange={e => setStaffForm({...staffForm, citizen_id: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background text-foreground px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="mb-1 block text-sm font-medium text-foreground">ชื่อ</label>
               <input type="text" required value={staffForm.first_name} onChange={e => setStaffForm({...staffForm, first_name: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background text-foreground px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
             </div>
            <div>
               <label className="mb-1 block text-sm font-medium text-foreground">นามสกุล</label>
              <input type="text" required value={staffForm.last_name} onChange={e => setStaffForm({...staffForm, last_name: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background text-foreground px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
            </div>
           </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">รหัสผ่าน</label>
             <input type="password" required value={staffForm.password} onChange={e => setStaffForm({...staffForm, password: e.target.value})} className="h-10 w-full rounded-md border border-input bg-background text-foreground px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          </div>
           <button type="submit" disabled={staffLoading} className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50">
             {staffLoading ? "กำลังบันทึก..." : "สร้างบัญชีเจ้าหน้าที่"}
          </button>
        </form>
       </div>
     </div>
  );
}
