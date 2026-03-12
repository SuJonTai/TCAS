import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Faculty from '@/models/Faculty';
import Department from '@/models/Department';
import Program from '@/models/Program';

export async function GET() {
  try {
    await connectToDatabase();

    // Fetch all records
    const faculties = await Faculty.find().lean();
    const departments = await Department.find().lean();
    const programs = await Program.find().lean();

    // Assemble the nested structure
    // Expected output: { id, faculty_name, DEPARTMENTS: [ { id, dept_name, PROGRAMS: [ { id, prog_name } ] } ] }
    
    const structuredFaculties = faculties.map(fac => {
      const facDepts = departments
        .filter(d => d.faculty_id === fac.id)
        .map(dept => {
          const deptProgs = programs
            .filter(p => p.dept_id === dept.id)
            .map(prog => ({
              id: prog.id,
              prog_name: prog.prog_name
            }));
          
          return {
            id: dept.id,
            dept_name: dept.dept_name,
            PROGRAMS: deptProgs
          };
        });

      return {
        id: fac.id,
        faculty_name: fac.faculty_name,
        DEPARTMENTS: facDepts
      };
    });

    return NextResponse.json(structuredFaculties);
  } catch (error) {
    console.error("Error fetching academic structure:", error);
    return NextResponse.json({ error: "Failed to fetch academic structure" }, { status: 500 });
  }
}
