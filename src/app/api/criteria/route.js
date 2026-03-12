import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AdmissionCriteria, { CriteriaPlan, CriteriaSubject } from '@/models/AdmissionCriteria';
import AdmissionProject from '@/models/AdmissionProject';
import Program from '@/models/Program';

export async function GET() {
  try {
    await connectToDatabase();
    
    // Fetch criteria with related plans and subjects
    const criteria = await AdmissionCriteria.find()
      .populate('CRITERIA_PLANS')
      .populate('CRITERIA_SUBJECTS')
      .sort({ id: -1 })
      .lean({ virtuals: true });

    // Fetch lookup tables for projects and programs
    const [projects, programs] = await Promise.all([
      AdmissionProject.find().lean(),
      Program.find().lean()
    ]);

    // Enrich each criteria with PROJECTS and PROGRAMS data
    const enriched = criteria.map(c => {
      const project = projects.find(p => p.id === c.project_id);
      const program = programs.find(p => p.id === c.program_id);

      return {
        ...c,
        PROJECTS: project ? { _id: project._id, id: project.id, project_name: project.project_name } : null,
        PROGRAMS: program ? { _id: program._id, id: program.id, prog_name: program.prog_name } : null,
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("GET Criteria error:", error);
    return NextResponse.json({ error: "Failed to fetch criteria" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    await connectToDatabase();

    // 1. Create the main criteria record
    const newCriteria = await AdmissionCriteria.create({
      academic_year: data.academic_year,
      tcas_round: data.tcas_round,
      max_seats: data.max_seats,
      min_gpax: data.min_gpax,
      edu_status_req: data.edu_status_req,
      program_id: data.program_id,
      project_id: data.project_id,
      start_date: data.start_date,
      end_date: data.end_date
    });

    // 2. Insert related plans
    if (data.study_plans && data.study_plans.length > 0) {
      const plansToInsert = data.study_plans.map(planId => ({
        criteria_id: newCriteria._id,
        plan_id: planId
      }));
      await CriteriaPlan.insertMany(plansToInsert);
    }

    // 3. Insert related subjects
    if (data.subjects && data.subjects.length > 0) {
      const subjectsToInsert = data.subjects.map(sub => ({
        criteria_id: newCriteria._id,
        subject_id: sub.subject_id,
        min_score: sub.min_score,
        weight: sub.weight
      }));
      await CriteriaSubject.insertMany(subjectsToInsert);
    }

    return NextResponse.json({ message: "Criteria created", id: newCriteria._id }, { status: 201 });
  } catch (error) {
    console.error("POST Criteria error:", error);
    return NextResponse.json({ error: "Failed to create criteria" }, { status: 500 });
  }
}
