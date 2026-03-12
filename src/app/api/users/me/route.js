import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import ApplicantScore from '@/models/ApplicantScore';

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    // Fetch user (without password)
    const user = await User.findById(session.user.id)
      .select('-password')
      .lean({ virtuals: true });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch scores for this user separately
    const scores = await ApplicantScore.find({ user_id: session.user.id }).lean();
    user.USER_SCORES = scores || [];

    return NextResponse.json(user);
  } catch (error) {
    console.error("GET /api/users/me error:", error);
    return NextResponse.json({ error: "Failed to fetch user profile" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    await connectToDatabase();
    
    // Update basic info
    const allowedUpdates = {
      first_name: data.first_name,
      last_name: data.last_name,
      citizen_id: data.citizen_id,
      edu_status: data.edu_status,
      current_level: data.current_level,
      high_school: data.high_school,
      plan_id: data.plan_id,
      gpax_5_term: data.gpax_5_term,
    };
    
    // Remove undefined AND null fields to avoid overwriting with null
    Object.keys(allowedUpdates).forEach(key => {
      if (allowedUpdates[key] === undefined) delete allowedUpdates[key];
    });

    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      { $set: allowedUpdates },
      { new: true }
    ).select('-password');

    // Update Scores if provided
    if (data.USER_SCORES && Array.isArray(data.USER_SCORES)) {
       // First remove old scores
       await ApplicantScore.deleteMany({ user_id: session.user.id });
       
       // Insert new ones (filter out any NaN values)
       const scoresToInsert = data.USER_SCORES
         .map(score => ({
           user_id: session.user.id,
           subject_id: parseInt(score.subject_id),
           score_value: parseFloat(score.score_value)
         }))
         .filter(s => !isNaN(s.subject_id) && !isNaN(s.score_value));
       
       if (scoresToInsert.length > 0) {
         await ApplicantScore.insertMany(scoresToInsert);
       }
    }

    return NextResponse.json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    console.error("PUT /api/users/me error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
