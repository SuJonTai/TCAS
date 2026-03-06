import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { GraduationCap, Menu, X, User } from "lucide-react" // Added User icon
import { cn } from "@/lib/utils"

const navLinks = [
  { href: "/", label: "หน้าหลัก" },
  { href: "/admission", label: "เกณฑ์รับสมัคร" },
  { href: "/apply", label: "สมัครเรียน" },
  { href: "/staff", label: "สำหรับเจ้าหน้าที่" },
  { href: "/login", label: "เข้าสู่ระบบ" },
]

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const pathname = location.pathname
  const [mobileOpen, setMobileOpen] = useState(false)
  
  // Read from localStorage
  const isLogin = typeof window !== "undefined" ? localStorage.getItem("isLogin") === "true" : false;
  const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
  const firstName = typeof window !== "undefined" ? localStorage.getItem("first_name") : null; // Get user's first name

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("isLogin", "false")
      localStorage.removeItem("role")
      localStorage.removeItem("first_name") // Clear name on logout
      localStorage.removeItem("user_id")
    }
    navigate("/")
  }

  const targetHref = href => {
    const needsApplicant = href === "/apply";
    const needsStaff = href === "/staff";

    if (!isLogin && (needsApplicant || needsStaff)) return "/login"

    // Staff should not go to applicant apply page
    if (isLogin && needsApplicant && role === "staff") return "/staff"

    // Applicant should not go to staff pages
    if (isLogin && needsStaff && role === "applicant" || role === "student") return "/apply"

    return href
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
        <Link
          to="/"
          className="flex items-center gap-2 text-foreground transition-opacity hover:opacity-80"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-[family-name:var(--font-poppins)] text-lg font-semibold tracking-tight">
            TCAS KMUTNB
          </span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const isApply = link.href === "/apply";
            const isStaffLink = link.href === "/staff";
            const isLoginLink = link.href === "/login";

            if (isLogin && role === "staff" && isApply) return null;
            if (isLogin && (role === "applicant" || role === "student") && isStaffLink) return null;

            // When logged in, show User Name and Logout Button
            if (isLogin && isLoginLink) {
              return (
                <div key={link.href} className="ml-2 flex items-center gap-3 border-l border-border pl-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <span>{firstName || "ผู้ใช้งาน"}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    ออกจากระบบ
                  </button>
                </div>
              )
            }

            return (
              <Link
                key={link.href} 
                to={targetHref(link.href)}
                className={cn(
                  "rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </div>

        {/* Mobile toggle */}
        <button
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border bg-card px-4 pb-4 pt-2 md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => {
              const isApply = link.href === "/apply";
              const isStaffLink = link.href === "/staff";
              const isLoginLink = link.href === "/login";

              if (isLogin && role === "staff" && isApply) return null;
              if (isLogin && (role === "applicant" || role === "student") && isStaffLink) return null;

              if (isLogin && isLoginLink) {
                return (
                  <div key={link.href} className="mt-2 flex flex-col gap-1 border-t border-border pt-2">
                    <div className="flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-foreground">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <span>{firstName || "ผู้ใช้งาน"}</span>
                    </div>
                    <button
                      onClick={() => {
                        handleLogout()
                        setMobileOpen(false)
                      }}
                      className="rounded-lg px-3.5 py-2.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      ออกจากระบบ
                    </button>
                  </div>
                )
              }

              return (
                <Link
                  key={link.href}
                  to={targetHref(link.href)}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors",
                    pathname === link.href
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </header>
  )
}