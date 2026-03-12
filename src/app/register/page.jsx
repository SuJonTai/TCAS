"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { GraduationCap, Eye, EyeOff, ArrowLeft } from "lucide-react"

export default function RegisterForm() {
  const router = useRouter()

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nationalId: "",
    password: "",
    fullName: "",
    age: "",
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const nameParts = form.fullName.trim().split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nationalId: form.nationalId,
          password: form.password,
          firstName,
          lastName,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        alert(data.error || "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
        return;
      }

      alert("สมัครสมาชิกสำเร็จ! คุณสามารถเข้าสู่ระบบได้แล้ว")
      router.push("/login")
    } catch (error) {
      console.error("Registration Error:", error);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">

      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> กลับหน้าหลัก
        </Link>
      </div>

      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-lg">

        <div className="flex flex-col items-center px-6 pt-6 pb-2 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </div>
          <h2 className="font-[family-name:var(--font-poppins)] text-xl font-bold text-foreground">
            สร้างบัญชีผู้ใช้
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            กรุณาสมัครสมาชิกเพื่อเข้าใช้ระบบรับสมัคร TCAS
          </p>
        </div>

        <div className="px-6 pb-6 pt-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            <div className="flex flex-col gap-2">
              <label htmlFor="nationalId" className="text-sm font-medium text-foreground">
                รหัสประจำตัวประชาชน
              </label>
              <input
                id="nationalId"
                placeholder="เช่น 1100800123456"
                maxLength={13}
                value={form.nationalId}
                onChange={(e) =>
                  setForm({ ...form, nationalId: e.target.value.replace(/\D/g, "") })
                }
                required
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                รหัสผ่าน
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="ตั้งรหัสผ่านของคุณ"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  required
                  className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 pr-10 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
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

            <div className="flex flex-col gap-2">
              <label htmlFor="fullName" className="text-sm font-medium text-foreground">
                ชื่อ-นามสกุล
              </label>
              <input
                id="fullName"
                placeholder="เช่น สมชาย ใจดี"
                value={form.fullName}
                onChange={(e) =>
                  setForm({ ...form, fullName: e.target.value })
                }
                required
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="age" className="text-sm font-medium text-foreground">
                อายุ
              </label>
              <input
                id="age"
                type="number"
                placeholder="เช่น 18"
                min={15}
                max={60}
                value={form.age}
                onChange={(e) =>
                  setForm({ ...form, age: e.target.value })
                }
                required
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            >
              {loading ? "กำลังสมัครสมาชิก..." : "ยืนยันการสมัครสมาชิก"}
            </button>

            <p className="text-center text-sm text-muted-foreground">
              มีบัญชีผู้ใช้อยู่แล้ว?{" "}
              <Link
                href="/login"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                เข้าสู่ระบบ
              </Link>
            </p>
          </form>
        </div>

      </div>
    </div>
  )
}
