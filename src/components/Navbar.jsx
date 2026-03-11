import { useState, useEffect, useRef } from "react" // 👈 1. เพิ่ม useEffect และ useRef
import { Link, useLocation, useNavigate } from "react-router-dom"
import { GraduationCap, Menu, X, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { DatabaseToggle } from "./DatabaseToggle"
import { useDatabase } from "@/context/DatabaseContext" // 👈 2. นำเข้า useDatabase

const navLinks = [
  { href: "/", label: "หน้าหลัก" },
  { href: "/admission", label: "เกณฑ์รับสมัคร" },
  { href: "/student/details", label: "ข้อมูลผู้สมัคร" },
  { href: "/apply", label: "สมัครเรียน" },
  { href: "/staff", label: "สำหรับเจ้าหน้าที่" },
  { href: "/login", label: "เข้าสู่ระบบ" },
  { href: "/staff/super-admin/accounts", label: "จัดการบัญชี" },
  { href: "/staff/super-admin/criteria", label: "จัดการเกณฑ์" },
  { href: "/staff/super-admin/academic", label: "จัดการข้อมูลการศึกษา" }
]

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const pathname = location.pathname
  const [mobileOpen, setMobileOpen] = useState(false)
  
  const { dbType } = useDatabase() // 👈 3. ดึงค่า dbType ปัจจุบัน
  const isFirstRender = useRef(true) // 👈 4. ใช้ useRef เพื่อเช็คว่าเป็นการโหลดหน้าเว็บครั้งแรกหรือไม่

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

  // 🚨 5. เพิ่ม useEffect เพื่อคอยฟังการเปลี่ยนแปลงของ dbType 🚨
  useEffect(() => {
    // ข้ามการทำงานในจังหวะโหลดหน้าเว็บครั้งแรก
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    // ถ้ามีการกดสลับ Database (dbType เปลี่ยน) และมีคนล็อกอินอยู่ ให้ Logout ทันที
    if (isLogin) {
      handleLogout();
      alert("สลับฐานข้อมูลเรียบร้อย ");
    }
  }, [dbType]); // Trigger เมื่อ dbType มีการเปลี่ยนแปลง

  // --- Link Protection / Redirection Logic ---
  const targetHref = href => {
    const needsLogin = ["/apply", "/staff", "/student/details", "/staff/super-admin/academic", "/staff/super-admin/accounts", "/staff/super-admin/criteria"].includes(href);
    
    // Redirect guests to login
    if (!isLogin && needsLogin) return "/login"

    // Prevent staff from accessing applicant pages
    if (isLogin && role === "staff" && ["/apply", "/student/details"].includes(href)) return "/staff"

    // Prevent applicants from accessing staff pages
    if (isLogin && (role === "applicant" || role === "student") && href.startsWith("/staff")) return "/apply"

    return href
  }

  // --- Visibility Logic ---
  const visibleLinks = navLinks.filter(link => {
    const isApply = link.href === "/apply";
    const isStudentScore = link.href === "/student/details";
    const isStaffLink = link.href.startsWith("/staff"); 

    if (isLogin && role === "staff" && (isApply || isStudentScore)) return false;
    if (isLogin && (role === "applicant" || role === "student") && isStaffLink) return false;
    if (!isLogin && (isStudentScore || link.href.startsWith("/staff"))) return false;

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
          
          {/* === ADDED DATABASE TOGGLE HERE === */}
          <div className="mr-2 flex items-center pr-2 border-r border-border">
            <DatabaseToggle />
          </div>

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
            
            {/* === ADDED DATABASE TOGGLE HERE === */}
            <div className="mb-2 border-b border-border pb-3 px-3.5 pt-1">
              <DatabaseToggle />
            </div>

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