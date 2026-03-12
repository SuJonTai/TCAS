import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(req) {
  try {
    const data = await req.formData();
    const file = data.get('file');
    const bucket = data.get('bucket'); // 'portfolios' or 'transcripts'
    const userId = data.get('userId');

    if (!file || !bucket || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a safe, unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}_${bucket}_${Date.now()}.${fileExt}`;
    
    // Ensure directory exists
    const uploadDir = join(process.cwd(), 'public', 'uploads', bucket);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filePath = join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    // Return the public URL
    const publicUrl = `/uploads/${bucket}/${fileName}`;

    return NextResponse.json({ publicUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
