"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { GraduationCap, Eye, EyeOff, ArrowLeft } from "lucide-react"
import { signIn } from "next-auth/react"

export default function LoginForm() {
  const router = useRouter()
  
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    userId: "",
    password: "",
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await signIn("credentials", {
        userId: form.userId,
        password: form.password,
        redirect: false,
      });

      if (res?.error) {
        alert(res.error === "No user found" || res.error === "Invalid password" ? "รหัสบัตรประชาชน หรือ รหัสผ่านไม่ถูกต้อง" : "เกิดข้อผิดพลาดในการเชื่อมต่อ");
        setLoading(false);
        return;
      }

      alert("เข้าสู่ระบบสำเร็จ!");
      
      // Force a hard navigation to reload session state or redirect
      // Since we don't know the role instantly here without decoding the JWT or fetching the session,
      // we can redirect to a standard routing interceptor (like /api/auth/session check) or just push to `/` and let the UI handle it.
      // NextAuth's useSession will update.
      window.location.href = "/";
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      
      <div className="w-full max-w-md">
        <Link href="/">
          <button className="mb-4 inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50">
             <ArrowLeft className="h-4 w-4" /> กลับหน้าหลัก
          </button>
        </Link>
      </div>

       <div className="w-full max-w-md rounded-xl border border-border bg-card text-card-foreground shadow-lg">
        
        <div className="flex flex-col items-center space-y-1.5 p-6 pb-2 text-center">
           <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </div>
          <h3 className="font-[family-name:var(--font-poppins)] text-xl font-bold leading-none tracking-tight text-foreground">
             เข้าสู่ระบบ
          </h3>
          <p className="text-sm text-muted-foreground mt-2">
             เข้าสู่ระบบด้วยรหัสบัตรประชาชน หรือรหัสเจ้าหน้าที่ ระบบจะตรวจสอบสิทธิ์ให้อัตโนมัติ
          </p>
        </div>

        <div className="p-6 pt-0">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            <div className="flex flex-col gap-2">
               <label htmlFor="userId" className="text-sm font-medium leading-none text-foreground">
                รหัสบัตรประชาชน / รหัสเจ้าหน้าที่
              </label>
               <input
                id="userId"
                placeholder="เช่น 1100800123456 หรือ S001"
                value={form.userId}
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
                 required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="flex flex-col gap-2">
               <label htmlFor="loginPassword" className="text-sm font-medium leading-none text-foreground">
                รหัสผ่าน
              </label>
              <div className="relative">
                 <input
                  id="loginPassword"
                  type={showPassword ? "text" : "password"}
                   placeholder="กรอกรหัสผ่านของคุณ"
                  value={form.password}
                   onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                 />
                <button
                   type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                   aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
               </div>
            </div>

             <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>

             <p className="text-center text-sm text-muted-foreground">
              ยังไม่มีบัญชีผู้ใช้?{" "}
               <Link
                href="/register"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                 สมัครสมาชิกที่นี่
              </Link>
            </p>
          </form>
         </div>

      </div>
    </div>
  )
}
