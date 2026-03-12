import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  try {
    const { nationalId, password, firstName, lastName } = await req.json();

    if (!nationalId || !password || !firstName) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if user already exists
    const existingUser = await User.findOne({ citizen_id: nationalId });
    if (existingUser) {
      return NextResponse.json(
        { error: 'รหัสบัตรประชาชนนี้ถูกใช้งานแล้ว' },
        { status: 409 }
      );
    }

    // Hash password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    // Create new user
    const newUser = new User({
      citizen_id: nationalId,
      password: hashedPassword,
      first_name: firstName,
      last_name: lastName || '',
      role: 'student', // Default role
    });

    await newUser.save();

    return NextResponse.json(
      { message: 'สมัครสมาชิกสำเร็จ' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการสมัครสมาชิก' },
      { status: 500 }
    );
  }
}
