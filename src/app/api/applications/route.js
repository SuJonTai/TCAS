import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import mongoose from 'mongoose';
import AdmissionResult from '@/models/AdmissionResult';
import User from '@/models/User';
import AdmissionCriteria, { CriteriaSubject } from '@/models/AdmissionCriteria';
import AdmissionProject from '@/models/AdmissionProject';
import Program from '@/models/Program';
import Department from '@/models/Department';
import Faculty from '@/models/Faculty';
import Subject from '@/models/Subject';
import ApplicantScore from '@/models/ApplicantScore';

export async function GET(req) {
  try {
    await connectToDatabase();
    const db = mongoose.connection.db;

    // Use raw MongoDB to avoid Mongoose type-casting issues
    const rawApps = await db.collection('admissionresults')
      .find({})
      .sort({ application_date: -1 })
      .toArray();

    // Fetch all lookup tables in parallel
    const [allUsers, allCriteria, allProjects, allPrograms, allDepts, allFaculties, allScores, allCriteriaSubjects, allSubjects] = await Promise.all([
      User.find({}, '-password').lean(),
      AdmissionCriteria.find().lean(),
      AdmissionProject.find().lean(),
      Program.find().lean(),
      Department.find().lean(),
      Faculty.find().lean(),
      ApplicantScore.find().lean(),
      CriteriaSubject.find().lean(),
      Subject.find().lean(),
    ]);

    // Build lookup maps
    const usersById = {};
    allUsers.forEach(u => { usersById[u._id.toString()] = u; });

    const criteriaById = {};
    allCriteria.forEach(c => { criteriaById[c._id.toString()] = c; });

    const projectsById = {};
    allProjects.forEach(p => { projectsById[p.id] = p; });

    const programsById = {};
    allPrograms.forEach(p => { programsById[p.id] = p; });

    const deptsById = {};
    allDepts.forEach(d => { deptsById[d.id] = d; });

    const facultiesById = {};
    allFaculties.forEach(f => { facultiesById[f.id] = f; });

    const subjectsById = {};
    allSubjects.forEach(s => { subjectsById[s.id] = s; });

    // Group scores and criteria-subjects by their foreign keys
    const scoresByUserId = {};
    allScores.forEach(s => {
      const uid = s.user_id.toString();
      if (!scoresByUserId[uid]) scoresByUserId[uid] = [];
      scoresByUserId[uid].push(s);
    });

    const criteriaSubjectsByCritId = {};
    allCriteriaSubjects.forEach(cs => {
      const cid = cs.criteria_id.toString();
      if (!criteriaSubjectsByCritId[cid]) criteriaSubjectsByCritId[cid] = [];
      // Enrich with subject info
      const subjectInfo = subjectsById[cs.subject_id] || {};
      criteriaSubjectsByCritId[cid].push({ ...cs, SUBJECTS: subjectInfo });
    });

    // Enrich each application
    const enriched = rawApps.map(app => {
      const userId = app.user_id?.toString();
      const criteriaId = app.criteria_id?.toString();
      
      const user = usersById[userId] || {};
      const criteria = criteriaById[criteriaId] || {};
      const scores = scoresByUserId[userId] || [];

      // Enrich criteria with project/program/faculty info
      const project = projectsById[criteria.project_id] || {};
      const program = programsById[criteria.program_id] || {};
      const dept = deptsById[program.dept_id] || {};
      const faculty = facultiesById[dept.faculty_id] || {};

      const criteriaSubjects = criteriaSubjectsByCritId[criteriaId] || [];

      return {
        _id: app._id,
        user_id: app.user_id,
        criteria_id: app.criteria_id,
        status: app.status,
        gpax: app.gpax,
        portfolio_url: app.portfolio_url,
        transcript_url: app.transcript_url,
        application_date: app.application_date,
        calculated_score: app.calculated_score,
        remark: app.remark,
        created_at: app.created_at,
        updated_at: app.updated_at,
        USERS: user,
        APPLICANT_SCORES: scores,
        ADMISSION_CRITERIA: {
          ...criteria,
          CRITERIA_SUBJECTS: criteriaSubjects,
          PROJECTS: project,
          PROGRAM: { ...program, DEPT: { ...dept, FACULTY: faculty } },
        },
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("GET Applications error:", error);
    return NextResponse.json({ error: "Failed to fetch applications", details: error.message }, { status: 500 });
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
