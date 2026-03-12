import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import StudyPlan from '@/models/StudyPlan';

export async function GET() {
  try {
    await connectToDatabase();
    const plans = await StudyPlan.find().sort("id").lean();
    return NextResponse.json(plans);
  } catch (error) {
    console.error("GET StudyPlans error:", error);
    return NextResponse.json({ error: "Failed to fetch study plans" }, { status: 500 });
  }
}
