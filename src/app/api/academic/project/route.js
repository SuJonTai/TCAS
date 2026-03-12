import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AdmissionProject from '@/models/AdmissionProject';

export async function GET() {
  try {
    await connectToDatabase();
    const projects = await AdmissionProject.find().sort("id").lean();
    return NextResponse.json(projects);
  } catch (error) {
    console.error("GET Projects error:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { project_name } = await req.json();
    if (!project_name) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    await connectToDatabase();
    
    const maxProg = await AdmissionProject.findOne().sort("-id");
    const newId = maxProg && maxProg.id ? maxProg.id + 1 : 1;

    const newProject = await AdmissionProject.create({
      id: newId,
      project_name
    });

    return NextResponse.json(newProject, { status: 201 });
  } catch (error) {
    console.error("POST Project error:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
