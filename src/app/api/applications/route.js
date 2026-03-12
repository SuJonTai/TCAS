import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AdmissionResult from '@/models/AdmissionResult';
import User from '@/models/User';
import AdmissionCriteria from '@/models/AdmissionCriteria';
import AdmissionProject from '@/models/AdmissionProject';
import Program from '@/models/Program';
import Department from '@/models/Department';
import Faculty from '@/models/Faculty';

export async function GET(req) {
  try {
    await connectToDatabase();

    const results = await AdmissionResult.find()
      .populate({ path: 'user_id', model: User, select: '-password' })
      .populate({ path: 'criteria_id', model: AdmissionCriteria })
      .sort({ application_date: -1 })
      .lean();

    // Enrich each result with program/faculty/project info from criteria
    const [projects, programs, departments, faculties] = await Promise.all([
      AdmissionProject.find().lean(),
      Program.find().lean(),
      Department.find().lean(),
      Faculty.find().lean(),
    ]);

    const enriched = results.map(r => {
      const criteria = r.criteria_id || {};
      const project = projects.find(p => p.id === criteria.project_id);
      const program = programs.find(p => p.id === criteria.program_id);
      const dept = program ? departments.find(d => d.id === program.dept_id) : null;
      const faculty = dept ? faculties.find(f => f.id === dept.faculty_id) : null;

      return {
        ...r,
        id: r._id,
        user_id: r.user_id?._id || r.user_id,
        USERS: r.user_id, // populated user data
        ADMISSION_CRITERIA: {
          ...criteria,
          ADMISSION_PROJECTS: project || {},
          PROGRAMS: program ? { ...program, DEPARTMENTS: dept ? { ...dept, FACULTIES: faculty || {} } : {} } : {},
        },
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("GET Applications error:", error);
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
  }
}

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const { criteria_id, gpax, portfolio_url, transcript_url } = data;

    if (!criteria_id || gpax === undefined) {
      return NextResponse.json({ error: "Missing required fields: criteria_id and gpax" }, { status: 400 });
    }

    await connectToDatabase();

    // Check if user already applied to this criteria
    const existingApp = await AdmissionResult.findOne({
      user_id: session.user.id,
      criteria_id
    });

    if (existingApp) {
      return NextResponse.json({ error: "You have already applied for this criteria." }, { status: 400 });
    }

    const newApp = await AdmissionResult.create({
      user_id: session.user.id,
      criteria_id,
      gpax,
      status: 'pending',
      portfolio_url,
      transcript_url,
      application_date: new Date()
    });

    return NextResponse.json(newApp, { status: 201 });
  } catch (error) {
    console.error("POST Application error:", error);
    return NextResponse.json({ error: "Failed to submit application" }, { status: 500 });
  }
}
