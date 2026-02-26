// --- Imports ---
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { GraduationCap, Eye, EyeOff, ArrowLeft } from "lucide-react"

// --- Main Component: Login Form ---
export default function LoginForm() {
  const navigate = useNavigate()
  
  // Form and UI States
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    userId: "",
    password: "",
  })

  // --- Handlers ---
  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)

    // Mock API call delay
    setTimeout(() => {
      setLoading(false)
      // Basic mock check for staff vs student
      if (form.userId.toUpperCase().startsWith("S")) {
        alert("ยินดีต้อนรับกลับ, เจ้าหน้าที่!")
        navigate("/staff")
      } else {
        alert("ยินดีต้อนรับกลับ! กำลังนำคุณไปยังหน้าสมัครเรียน")
        navigate("/apply")
      }
    }, 1000)
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      
      {/* --- Section: Top Navigation --- */}
      <div className="w-full max-w-md">
        <Link to="/">
          <button className="mb-4 inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50">
            <ArrowLeft className="h-4 w-4" /> กลับหน้าหลัก
          </button>
        </Link>
      </div>

      {/* --- Section: Login Card --- */}
      <div className="w-full max-w-md rounded-xl border border-border bg-card text-card-foreground shadow-lg">
        
        {/* Card Header */}
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

        {/* Card Body & Form */}
        <div className="p-6 pt-0">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {/* Input: User ID */}
            <div className="flex flex-col gap-2">
              <label htmlFor="userId" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                รหัสบัตรประชาชน / รหัสเจ้าหน้าที่
              </label>
              <input
                id="userId"
                placeholder="เช่น 1100800123456 หรือ S001"
                value={form.userId}
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Input: Password */}
            <div className="flex flex-col gap-2">
              <label htmlFor="loginPassword" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>

            {/* Link to Register */}
            <p className="text-center text-sm text-muted-foreground">
              ยังไม่มีบัญชีผู้ใช้?{" "}
              <Link
                to="/register"
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