import React from "react"
import { Link } from "react-router-dom"
import {
  CalendarDays,
  BookOpen,
  UserPlus,
  LogIn,
  TrendingUp,
  Users,
  FileCheck,
  GraduationCap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// --- Mock Data ---
const topFaculties = [
  { name: "วิศวกรรมศาสตร์", applicants: 4520 },
  { name: "วิทยาศาสตร์ประยุกต์", applicants: 1840 },
  { name: "ครุศาสตร์อุตสาหกรรม", applicants: 950 },
  { name: "เทคโนโลยีสารสนเทศ", applicants: 420 },
  { name: "สถาปัตยกรรมและการออกแบบ", applicants: 290 },
]

function AnnouncementBanner() {
  return (
    <div className="bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground">
      <CalendarDays className="mb-0.5 mr-1.5 inline-block h-4 w-4" />
      TCAS รอบ 1 Portfolio: เปิดรับสมัครตั้งแต่วันที่{" "}
      <span className="font-semibold">1 - 15 ตุลาคม 2026</span>
    </div>
  )
}

function HeroSection() {
  const isLogin = typeof window !== "undefined" ? localStorage.getItem("isLogin") : false;
  return (
    <section className="px-4 py-16 lg:py-24">
      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <GraduationCap className="h-4 w-4" />
          ปีการศึกษา 2026
        </div>
        <h1 className="mb-4 font-[family-name:var(--font-poppins)] text-4xl font-bold leading-tight tracking-tight text-foreground text-balance md:text-5xl lg:text-6xl">
          ยินดีต้อนรับสู่{" "}
          <span className="text-primary">TCAS KMUTNB</span>{" "}
          Hub
        </h1>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/admission">
            <Button size="lg" variant="outline" className="gap-2">
              <BookOpen className="h-4 w-4" />
              รายละเอียดรับสมัคร
            </Button>
          </Link>
          <Link to={isLogin ? "/apply" : "/login"}>
            <Button size="lg" className="gap-2">
              <UserPlus className="h-4 w-4" />
              สมัครเรียน
            </Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="ghost" className="gap-2">
              <LogIn className="h-4 w-4" />
              เข้าสู่ระบบ
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}

function StatsCards() {
  const stats = [
    { label: "ผู้สมัครทั้งหมด", value: "8,020", icon: Users, change: "+12% จากปีที่แล้ว" },
    { label: "หลักสูตรที่เปิดรับ", value: "64", icon: BookOpen, change: "ครอบคลุม 4 คณะ" },
    { label: "ผู้มีสิทธิ์เข้าศึกษา", value: "3,241", icon: FileCheck, change: "อัตราการรับ 40.4%" },
    { label: "รอบการรับสมัคร", value: "4", icon: CalendarDays, change: "รอบที่ 1 เปิดรับอยู่" },
  ]

  return (
    <section className="mx-auto max-w-7xl px-4 pb-12 lg:px-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
            <CardContent className="flex items-start gap-4 p-5">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="font-[family-name:var(--font-poppins)] text-2xl font-bold text-foreground">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{stat.change}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}

function TopFacultiesChart() {
  const max = Math.max(...topFaculties.map((f) => f.applicants))

  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 lg:px-8">
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle className="font-[family-name:var(--font-poppins)] text-lg font-semibold text-foreground">
              5 อันดับคณะที่มีผู้สมัครสูงสุด
            </CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            จำนวนผู้สมัครในรอบปีการศึกษา 2026
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-4">
            {topFaculties.map((faculty, i) => (
              <div key={faculty.name} className="flex items-center gap-4">
                <span className="w-6 text-right text-sm font-semibold text-muted-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {faculty.name}
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-foreground">
                      {faculty.applicants.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700"
                      style={{
                        width: `${(faculty.applicants / max) * 100}%`,
                        opacity: 1 - i * 0.15,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

// --- Main Home Component ---
export default function Home() {
  return (
    <div className="min-h-screen bg-background font-sans">
      <AnnouncementBanner />
      <HeroSection />
      <StatsCards />
      <TopFacultiesChart />
    </div>
  )
}