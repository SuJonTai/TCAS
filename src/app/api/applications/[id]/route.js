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

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    await connectToDatabase();
    const db = mongoose.connection.db;

    // Try to find by _id first, then fallback to other fields
    let rawApp;
    if (mongoose.Types.ObjectId.isValid(id)) {
      rawApp = await db.collection('admissionresults').findOne({ 
        _id: new mongoose.Types.ObjectId(id) 
      });
    }
    
    if (!rawApp) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const userId = rawApp.user_id?.toString();
    const criteriaId = rawApp.criteria_id?.toString();

    // Fetch all related data in parallel
    const [user, criteria, scores, criteriaSubjects] = await Promise.all([
      userId ? User.findById(userId, '-password').lean() : null,
      criteriaId ? AdmissionCriteria.findById(criteriaId).lean() : null,
      userId ? ApplicantScore.find({ user_id: userId }).lean() : [],
      criteriaId ? CriteriaSubject.find({ criteria_id: criteriaId }).lean() : [],
    ]);

    // Enrich criteria subjects with subject names
    let enrichedSubjects = [];
    if (criteriaSubjects.length > 0) {
      const subjectIds = criteriaSubjects.map(cs => cs.subject_id);
      const subjects = await Subject.find({ id: { $in: subjectIds } }).lean();
      const subjectsMap = {};
      subjects.forEach(s => { subjectsMap[s.id] = s; });
      
      enrichedSubjects = criteriaSubjects.map(cs => ({
        ...cs,
        SUBJECTS: subjectsMap[cs.subject_id] || {}
      }));
    }

    // Enrich criteria with project/program/faculty
    let project = {}, program = {}, dept = {}, faculty = {};
    if (criteria) {
      const [proj, prog] = await Promise.all([
        AdmissionProject.findOne({ id: criteria.project_id }).lean(),
        Program.findOne({ id: criteria.program_id }).lean(),
      ]);
      project = proj || {};
      program = prog || {};

      if (program.dept_id) {
        const d = await Department.findOne({ id: program.dept_id }).lean();
        dept = d || {};
        if (dept.faculty_id) {
          const f = await Faculty.findOne({ id: dept.faculty_id }).lean();
          faculty = f || {};
        }
      }
    }

    const result = {
      _id: rawApp._id,
      user_id: rawApp.user_id,
      criteria_id: rawApp.criteria_id,
      status: rawApp.status,
      gpax: rawApp.gpax,
      portfolio_url: rawApp.portfolio_url,
      transcript_url: rawApp.transcript_url,
      application_date: rawApp.application_date,
      calculated_score: rawApp.calculated_score,
      remark: rawApp.remark,
      created_at: rawApp.created_at,
      updated_at: rawApp.updated_at,
      USERS: user || {},
      APPLICANT_SCORES: scores || [],
      ADMISSION_CRITERIA: {
        ...(criteria || {}),
        CRITERIA_SUBJECTS: enrichedSubjects,
        PROJECTS: project,
        PROGRAM: { ...program, DEPT: { ...dept, FACULTY: faculty } },
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET Application error:", error);
    return NextResponse.json({ error: "Failed to fetch application", details: error.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const { status, staff_comment } = await req.json();

    if (!status) return NextResponse.json({ error: "Missing status field" }, { status: 400 });

    await connectToDatabase();

    const updatedResult = await AdmissionResult.findByIdAndUpdate(
      id,
      { status, staff_comment },
      { new: true }
    );

    if (!updatedResult) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    return NextResponse.json({ message: "Application updated successfully", data: updatedResult });
  } catch (error) {
    console.error("PUT Application error:", error);
    return NextResponse.json({ error: "Failed to update application" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    await connectToDatabase();
    
    const deletedApp = await AdmissionResult.findByIdAndDelete(id);
    if (!deletedApp) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    return NextResponse.json({ message: "Application deleted successfully" });
  } catch (error) {
    console.error("DELETE Application error:", error);
    return NextResponse.json({ error: "Failed to delete application" }, { status: 500 });
  }
}
