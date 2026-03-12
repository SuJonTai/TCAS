import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import AdmissionResult from '@/models/AdmissionResult';
import User from '@/models/User';
import ApplicantInfo from '@/models/ApplicantInfo';
import AdmissionCriteria from '@/models/AdmissionCriteria';

export async function GET(req) {
  try {
    await connectToDatabase();

    // To mirror the complex Supabase join in StaffResults and ApplyDetail:
    // SELECT *, 
    // USERS ( citizen_id, first_name, last_name ), 
    // APPLICANT_INFO ( high_school, study_plan, gpax, edu_status ), 
    // ADMISSION_CRITERIA ( *, ADMISSION_PROJECTS (*), FACULTIES (*), DEPARTMENTS (*), PROGRAMS (*) ), 
    // APPLICANT_SCORES ( * )
    
    // In Mongoose, this requires multiple populate calls
    const results = await AdmissionResult.find()
      .populate('USERS')
      .populate('APPLICANT_INFO')
      .populate('APPLICANT_SCORES')
      .populate({
        path: 'ADMISSION_CRITERIA',
        populate: [
          { path: 'PROJECTS' },
          { path: 'FACULTY' },
          { path: 'DEPT' },
          { path: 'PROGRAM' }
        ]
      })
      .sort({ application_date: -1 })
      .lean({ virtuals: true });

    return NextResponse.json(results);
  } catch (error) {
    console.error("GET Applications error:", error);
    return NextResponse.json({ error: "Failed to fetch applications" }, { status: 500 });
  }
}

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const { criteria_id, gpax, portfolio_url, transcript_url } = data;

    if (!criteria_id || gpax === undefined) {
      return NextResponse.json({ error: "Missing required fields: criteria_id and gpax" }, { status: 400 });
    }

    await connectToDatabase();

    // Check if user already applied to this criteria
    const existingApp = await AdmissionResult.findOne({
      user_id: session.user.id,
      criteria_id
    });

    if (existingApp) {
      return NextResponse.json({ error: "You have already applied for this criteria." }, { status: 400 });
    }

    const newApp = await AdmissionResult.create({
      user_id: session.user.id,
      criteria_id,
      gpax,
      status: 'pending',
      portfolio_url,
      transcript_url,
      application_date: new Date()
    });

    return NextResponse.json(newApp, { status: 201 });
  } catch (error) {
    console.error("POST Application error:", error);
    return NextResponse.json({ error: "Failed to submit application" }, { status: 500 });
  }
}
