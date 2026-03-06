import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export default function AddStaff() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    citizen_id: "",
    password: "",
    first_name: "",
    last_name: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 1. Hash the password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(form.password, salt);

    // 2. Insert into Supabase with 'staff' role
    const { error } = await supabase.from("USERS").insert([
      {
        citizen_id: form.citizen_id,
        password: hashedPassword,
        first_name: form.first_name,
        last_name: form.last_name,
        role: "staff", // Force the staff role here
      },
    ]);

    setLoading(false);

    if (error) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    } else {
      setSuccess(true);
      setForm({ citizen_id: "", password: "", first_name: "", last_name: "" });
      setTimeout(() => setSuccess(false), 3000); // Hide success message after 3s
    }
  };

  return (
    <div className="mx-auto max-w-md pt-12">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3 border-b pb-4">
          <div className="rounded-full bg-primary/10 p-2">
            <ShieldAlert className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">เพิ่มบัญชีเจ้าหน้าที่</h1>
            <p className="text-sm text-muted-foreground">สำหรับผู้ดูแลระบบเท่านั้น</p>
          </div>
        </div>

        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>สร้างบัญชีเจ้าหน้าที่สำเร็จ!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">รหัสประจำตัวประชาชน (Admin ID)</label>
            <input
              type="text"
              required
              value={form.citizen_id}
              onChange={(e) => setForm({ ...form, citizen_id: e.target.value })}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">ชื่อ</label>
              <input
                type="text"
                required
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">นามสกุล</label>
              <input
                type="text"
                required
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">รหัสผ่าน</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "กำลังบันทึก..." : "สร้างบัญชี"}
          </button>
        </form>
      </div>
    </div>
  );
}