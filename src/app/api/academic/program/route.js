import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Program from '@/models/Program';

export async function POST(req) {
  try {
    const { dept_id, prog_name } = await req.json();
    if (!dept_id || !prog_name) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    await connectToDatabase();
    
    const maxProg = await Program.findOne().sort("-id");
    const newId = maxProg && maxProg.id ? maxProg.id + 1 : 1;

    const newProg = await Program.create({
      id: newId,
      dept_id,
      prog_name
    });

    return NextResponse.json(newProg, { status: 201 });
  } catch (error) {
    console.error("POST Program error:", error);
    return NextResponse.json({ error: "Failed to create program" }, { status: 500 });
  }
}
