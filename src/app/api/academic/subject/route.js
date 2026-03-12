import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Subject from '@/models/Subject';

export async function GET() {
  try {
    await connectToDatabase();
    const subjects = await Subject.find().sort("id").lean();
    return NextResponse.json(subjects);
  } catch (error) {
    console.error("GET Subjects error:", error);
    return NextResponse.json({ error: "Failed to fetch subjects" }, { status: 500 });
  }
}
