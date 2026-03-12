import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Department from '@/models/Department';

export async function POST(req) {
  try {
    const { faculty_id, dept_name } = await req.json();
    if (!faculty_id || !dept_name) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    await connectToDatabase();
    
    const maxDept = await Department.findOne().sort("-id");
    const newId = maxDept && maxDept.id ? maxDept.id + 1 : 1;

    const newDept = await Department.create({
      id: newId,
      faculty_id,
      dept_name
    });

    return NextResponse.json(newDept, { status: 201 });
  } catch (error) {
    console.error("POST Department error:", error);
    return NextResponse.json({ error: "Failed to create department" }, { status: 500 });
  }
}
