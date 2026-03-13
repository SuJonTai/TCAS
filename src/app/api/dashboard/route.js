import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import mongoose from 'mongoose';
import AdmissionResult from '@/models/AdmissionResult';
import User from '@/models/User';
import Program from '@/models/Program';
import Department from '@/models/Department';
import Faculty from '@/models/Faculty';

export async function GET() {
  try {
    await connectToDatabase();
    const db = mongoose.connection.db;

    // Fetch all data in parallel
    const [rawApps, allUsers, allPrograms, allDepts, allFaculties] = await Promise.all([
      db.collection('admissionresults').find({}).toArray(),
      User.find({}, 'high_school').lean(),
      Program.find().lean(),
      Department.find().lean(),
      Faculty.find().lean(),
    ]);

    // --- Total Applicants ---
    const totalApplicants = rawApps.length;

    // --- Status Distribution ---
    const statusCounts = { pending: 0, approved: 0, rejected: 0 };
    rawApps.forEach(app => {
      const s = app.status || 'pending';
      if (statusCounts[s] !== undefined) statusCounts[s]++;
    });

    const statusDistribution = [
      { name: 'PENDING', value: statusCounts.pending, color: '#EAB308' },
      { name: 'PASSED', value: statusCounts.approved, color: '#22C55E' },
      { name: 'FAILED', value: statusCounts.rejected, color: '#EF4444' },
    ];

    // --- Top Faculties ---
    // Build lookup maps: criteria -> program -> dept -> faculty
    const criteriaCache = {};
    const allCriteria = await db.collection('admissioncriterias').find({}).toArray();
    const programsById = {};
    allPrograms.forEach(p => { programsById[p.id] = p; });
    const deptsById = {};
    allDepts.forEach(d => { deptsById[d.id] = d; });
    const facultiesById = {};
    allFaculties.forEach(f => { facultiesById[f.id] = f; });

    allCriteria.forEach(c => {
      const program = programsById[c.program_id] || {};
      const dept = deptsById[program.dept_id] || {};
      const faculty = facultiesById[dept.faculty_id] || {};
      criteriaCache[c._id.toString()] = faculty.faculty_name || 'Unknown';
    });

    const facultyCounts = {};
    rawApps.forEach(app => {
      const cid = app.criteria_id?.toString();
      const fname = criteriaCache[cid] || 'Unknown';
      if (fname !== 'Unknown') {
        facultyCounts[fname] = (facultyCounts[fname] || 0) + 1;
      }
    });

    const topFaculties = Object.entries(facultyCounts)
      .map(([name, applicants]) => ({ name, applicants }))
      .sort((a, b) => b.applicants - a.applicants)
      .slice(0, 5);

    // --- Applicants Trend (by date) ---
    const dateCounts = {};
    rawApps.forEach(app => {
      const d = app.application_date || app.created_at;
      if (d) {
        const dateStr = new Date(d).toISOString().split('T')[0];
        dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
      }
    });

    const applicantsTrend = Object.entries(dateCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // --- Applicants by School ---
    // Get user IDs that have applications
    const applicantUserIds = new Set(rawApps.map(app => app.user_id?.toString()));
    const schoolCounts = {};
    allUsers.forEach(u => {
      if (applicantUserIds.has(u._id.toString()) && u.high_school) {
        schoolCounts[u.high_school] = (schoolCounts[u.high_school] || 0) + 1;
      }
    });

    const applicantsBySchool = Object.entries(schoolCounts)
      .map(([name, applicants]) => ({ name, applicants }))
      .sort((a, b) => b.applicants - a.applicants)
      .slice(0, 10);

    return NextResponse.json({
      totalApplicants,
      statusDistribution,
      topFaculties,
      applicantsTrend,
      applicantsBySchool,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
