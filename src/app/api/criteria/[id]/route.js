import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AdmissionCriteria, { CriteriaPlan, CriteriaSubject } from '@/models/AdmissionCriteria';

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const data = await req.json();
    await connectToDatabase();

    const existingCriteria = await AdmissionCriteria.findById(id);
    if (!existingCriteria) return NextResponse.json({ error: "Criteria not found" }, { status: 404 });

    // 1. Update main record
    await AdmissionCriteria.findByIdAndUpdate(id, {
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

    // 2. Clear old relations and recreate
    await CriteriaPlan.deleteMany({ criteria_id: id });
    await CriteriaSubject.deleteMany({ criteria_id: id });

    // 3. Insert new relations
    if (data.study_plans && data.study_plans.length > 0) {
      const plansToInsert = data.study_plans.map(planId => ({
        criteria_id: id,
        plan_id: planId
      }));
      await CriteriaPlan.insertMany(plansToInsert);
    }

    if (data.subjects && data.subjects.length > 0) {
      const subjectsToInsert = data.subjects.map(sub => ({
        criteria_id: id,
        subject_id: sub.subject_id,
        min_score: sub.min_score,
        weight: sub.weight
      }));
      await CriteriaSubject.insertMany(subjectsToInsert);
    }

    return NextResponse.json({ message: "Criteria updated" });
  } catch (error) {
    console.error("PUT Criteria error:", error);
    return NextResponse.json({ error: "Failed to update criteria" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    await connectToDatabase();

    // Check if any applicants are using this criteria (if Applicant/Result models were made)
    // For now, we allow deletion and cascade manually
    
    await AdmissionCriteria.findByIdAndDelete(id);
    await CriteriaPlan.deleteMany({ criteria_id: id });
    await CriteriaSubject.deleteMany({ criteria_id: id });

    return NextResponse.json({ message: "Criteria deleted successfully" });
  } catch (error) {
    console.error("DELETE Criteria error:", error);
    return NextResponse.json({ error: "Failed to delete criteria" }, { status: 500 });
  }
}
