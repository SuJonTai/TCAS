import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { citizen_id, password, first_name, last_name } = await req.json();

    if (!citizen_id || !password || !first_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectToDatabase();

    // Check if user already exists
    const existingUser = await User.findOne({ citizen_id });
    if (existingUser) {
      return NextResponse.json({ error: 'Staff account already exists' }, { status: 409 });
    }

    // Hash password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    // Create staff user
    const newStaff = new User({
      citizen_id,
      password: hashedPassword,
      first_name,
      last_name: last_name || '',
      role: 'staff',
    });

    await newStaff.save();

    return NextResponse.json({ message: 'Staff created successfully', id: newStaff._id }, { status: 201 });
  } catch (error) {
    console.error('Staff creation error:', error);
    return NextResponse.json({ error: 'Failed to create staff account' }, { status: 500 });
  }
}
