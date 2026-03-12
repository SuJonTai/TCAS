import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AdmissionResult from '@/models/AdmissionResult';
import User from '@/models/User';
import ApplicantInfo from '@/models/ApplicantInfo';
import AdmissionCriteria from '@/models/AdmissionCriteria';

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    await connectToDatabase();

    const application = await AdmissionResult.findById(id)
      .populate('USERS')
      .populate('APPLICANT_INFO')
      .populate('APPLICANT_SCORES')
      .populate({
        path: 'ADMISSION_CRITERIA',
        populate: [
          { path: 'PROJECTS' },
          { path: 'FACULTY' },
          { path: 'DEPT' },
          { path: 'PROGRAM' },
          { path: 'CRITERIA_SUBJECTS', populate: { path: 'SUBJECTS' } }
        ]
      })
      .lean({ virtuals: true });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    return NextResponse.json(application);
  } catch (error) {
    console.error("GET Application error:", error);
    return NextResponse.json({ error: "Failed to fetch application" }, { status: 500 });
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
