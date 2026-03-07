import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { GraduationCap, Menu, X, User } from "lucide-react"
import { cn } from "@/lib/utils"

const navLinks = [
  { href: "/", label: "หน้าหลัก" },
  { href: "/admission", label: "เกณฑ์รับสมัคร" },
  { href: "/student/scores", label: "คะแนนของฉัน" },
  { href: "/apply", label: "สมัครเรียน" },
  { href: "/staff", label: "สำหรับเจ้าหน้าที่" },
  { href: "/login", label: "เข้าสู่ระบบ" },
  { href: "/staff/super-admin", label: "Super Admin" },
]

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const pathname = location.pathname
  const [mobileOpen, setMobileOpen] = useState(false)
  
  // Read from localStorage
  const isLogin = typeof window !== "undefined" ? localStorage.getItem("isLogin") === "true" : false;
  const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
  const firstName = typeof window !== "undefined" ? localStorage.getItem("first_name") : null;

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("isLogin", "false")
      localStorage.removeItem("role")
      localStorage.removeItem("first_name")
      localStorage.removeItem("user_id")
    }
    navigate("/")
  }

  // --- Link Protection / Redirection Logic ---
  const targetHref = href => {
    const needsLogin = ["/apply", "/staff", "/student/scores", "/staff/super-admin"].includes(href);
    
    // Redirect guests to login
    if (!isLogin && needsLogin) return "/login"

    // Prevent staff from accessing applicant pages
    if (isLogin && role === "staff" && ["/apply", "/student/scores"].includes(href)) return "/staff"

    // Prevent applicants from accessing staff pages
    if (isLogin && (role === "applicant" || role === "student") && href.startsWith("/staff")) return "/apply"

    return href
  }

  // --- Visibility Logic ---
  // Filter out links the user shouldn't even see based on their role
  const visibleLinks = navLinks.filter(link => {
    const isApply = link.href === "/apply";
    const isStudentScore = link.href === "/student/scores";
    const isStaffLink = link.href.startsWith("/staff"); // Catches both /staff and /staff/super-admin

    // 1. Hide Applicant-only links from Staff
    if (isLogin && role === "staff" && (isApply || isStudentScore)) return false;
    
    // 2. Hide Staff-only links from Applicants/Students
    if (isLogin && (role === "applicant" || role === "student") && isStaffLink) return false;
    
    // 3. Hide restricted links from Guests (Allow them to see /apply and /staff so they are prompted to login)
    if (!isLogin && (isStudentScore || link.href === "/staff/super-admin")) return false;

    return true;
  });

  // --- Render Helpers ---
  const renderUserProfile = (isMobile = false) => (
    <div className={cn(
      "flex",
      isMobile ? "mt-2 flex-col gap-1 border-t border-border pt-2" : "ml-2 items-center gap-3 border-l border-border pl-4"
    )}>
      <div className={cn("flex items-center gap-2 font-medium text-foreground", isMobile ? "px-3.5 py-2.5 text-sm" : "text-sm")}>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
          <User className="h-4 w-4 text-primary" />
        </div>
        <span>{firstName || "ผู้ใช้งาน"}</span>
      </div>
      <button
        onClick={() => {
          handleLogout()
          if (isMobile) setMobileOpen(false)
        }}
        className={cn(
          "rounded-lg font-medium text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600",
          isMobile ? "px-3.5 py-2.5 text-left text-sm" : "px-3.5 py-2 text-sm"
        )}
      >
        ออกจากระบบ
      </button>
    </div>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
        <Link to="/" className="flex items-center gap-2 text-foreground transition-opacity hover:opacity-80">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-[family-name:var(--font-poppins)] text-lg font-semibold tracking-tight">
            TCAS KMUTNB
          </span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden items-center gap-1 md:flex">
          {visibleLinks.map((link) => {
            if (isLogin && link.href === "/login") {
              return <div key={link.href}>{renderUserProfile(false)}</div>
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
            {visibleLinks.map((link) => {
              if (isLogin && link.href === "/login") {
                return <div key={link.href}>{renderUserProfile(true)}</div>
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