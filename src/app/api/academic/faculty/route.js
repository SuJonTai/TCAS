import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Faculty from '@/models/Faculty';

export async function POST(req) {
  try {
    const { faculty_name } = await req.json();
    if (!faculty_name) return NextResponse.json({ error: "faculty_name is required" }, { status: 400 });

    await connectToDatabase();
    
    // Auto increment ID logic simulation for migration compatibility
    const maxFac = await Faculty.findOne().sort("-id");
    const newId = maxFac && maxFac.id ? maxFac.id + 1 : 1;

    const newFaculty = await Faculty.create({
      id: newId,
      faculty_name
    });

    return NextResponse.json(newFaculty, { status: 201 });
  } catch (error) {
    console.error("POST Faculty error:", error);
    return NextResponse.json({ error: "Failed to create faculty" }, { status: 500 });
  }
}
