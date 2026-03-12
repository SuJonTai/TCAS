import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import mongoose from 'mongoose';

// POST /api/migrate – One-time migration to populate missing fields
// Uses raw MongoDB operations to bypass Mongoose schema caching
export async function POST() {
  try {
    await connectToDatabase();
    const db = mongoose.connection.db;
    const results = { plans: 0, subjects: 0 };

    // --- Migrate Subject.subject_type ---
    const subjectsCol = db.collection('subjects');
    const subjects = await subjectsCol.find({}).toArray();
    
    for (const sub of subjects) {
      const name = sub.subject_name || '';
      let subjectType = 'A-Level'; // default
      
      if (name.startsWith('TGAT') || name.includes('TGAT')) {
        subjectType = 'TGAT';
      } else if (name.startsWith('TPAT') || name.includes('TPAT')) {
        subjectType = 'TPAT';
      }

      const result = await subjectsCol.updateOne(
        { _id: sub._id },
        { $set: { subject_type: subjectType } }
      );
      if (result.modifiedCount > 0) results.subjects++;
    }

    // --- Migrate StudyPlan.plan_group ---
    const plansCol = db.collection('studyplans');
    const plans = await plansCol.find({}).toArray();
    
    const highVocationalKeywords = ['ปวส'];
    const vocationalKeywords = ['ปวช', 'ช่าง', 'พาณิชย'];

    for (const plan of plans) {
      const name = plan.plan_name || '';
      let planGroup = 'high-school'; // default for ม.6 / กศน.

      if (highVocationalKeywords.some(kw => name.includes(kw))) {
        planGroup = 'high-vocational';
      } else if (vocationalKeywords.some(kw => name.includes(kw))) {
        planGroup = 'vocational';
      }

      const result = await plansCol.updateOne(
        { _id: plan._id },
        { $set: { plan_group: planGroup } }
      );
      if (result.modifiedCount > 0) results.plans++;
    }

    return NextResponse.json({ 
      message: 'Migration complete',
      updated: results
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: 'Migration failed: ' + error.message }, { status: 500 });
  }
}

// GET for easy verification
export async function GET() {
  try {
    await connectToDatabase();
    const db = mongoose.connection.db;
    
    const subjects = await db.collection('subjects').find({}).limit(3).toArray();
    const plans = await db.collection('studyplans').find({}).limit(3).toArray();
    
    return NextResponse.json({ sampleSubjects: subjects, samplePlans: plans });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
