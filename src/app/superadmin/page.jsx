"use client"

import React, { useState, useEffect } from "react"
import { Loader2, LayoutDashboard } from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from "recharts"

const COLORS = ['#EF4444', '#22C55E', '#EAB308'];

export default function SuperAdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch('/api/dashboard')
        if (!res.ok) throw new Error("Failed to fetch dashboard")
        const json = await res.json()
        setData(json)
      } catch (err) {
        console.error("Dashboard fetch error:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-lg text-muted-foreground">กำลังโหลดข้อมูล Dashboard...</span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        ไม่สามารถโหลดข้อมูลได้
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pt-8 pb-12 lg:px-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-full bg-primary/10 p-2.5">
          <LayoutDashboard className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Admin Dashboard</h1>
      </div>

      {/* Total Applicants Card */}
      <div className="mb-6">
        <div className="inline-block rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Total Applicants</p>
          <p className="text-4xl font-bold text-primary font-[family-name:var(--font-poppins)]">
            {data.totalApplicants}
          </p>
        </div>
      </div>

      {/* Row 1: Top Faculties + Status Distribution */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Faculties Bar Chart */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-foreground">Top Faculties</h2>
          {data.topFaculties.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.topFaculties}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--foreground)',
                  }}
                />
                <Bar dataKey="applicants" fill="#111111" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground border-2 border-dashed rounded-lg">
              ยังไม่มีข้อมูล
            </div>
          )}
        </div>

        {/* Applicant Status Distribution Pie Chart */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-foreground">Applicant Status Distribution</h2>
          {data.statusDistribution.some(s => s.value > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.statusDistribution}
                  cx="50%"
                  cy="45%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ value }) => value}
                  labelLine
                >
                  {data.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  formatter={(value, entry) => (
                    <span style={{ color: entry.color }}>{value}</span>
                  )}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--foreground)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground border-2 border-dashed rounded-lg">
              ยังไม่มีข้อมูล
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Applicants Trend + Applicants by School */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Applicants Trend Line Chart */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-foreground">Applicants Trend</h2>
          {data.applicantsTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.applicantsTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={50}
                />
                <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--foreground)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground border-2 border-dashed rounded-lg">
              ยังไม่มีข้อมูล
            </div>
          )}
        </div>

        {/* Applicants by School Bar Chart */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-foreground">Applicants by School</h2>
          {data.applicantsBySchool.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.applicantsBySchool}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--foreground)',
                  }}
                />
                <Bar dataKey="applicants" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground border-2 border-dashed rounded-lg">
              ยังไม่มีข้อมูล
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
