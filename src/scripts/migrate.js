import { createClient } from '@supabase/supabase-js';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Faculty from '../models/Faculty.js';
import Department from '../models/Department.js';
import Program from '../models/Program.js';
import Subject from '../models/Subject.js';
import StudyPlan from '../models/StudyPlan.js';
import AdmissionProject from '../models/AdmissionProject.js';
import AdmissionCriteria from '../models/AdmissionCriteria.js';
import { CriteriaPlan, CriteriaSubject } from '../models/AdmissionCriteria.js';

// Setup env variables if running via node --env-file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY;
const mongoUri = process.env.MONGODB_URI;

if (!supabaseUrl || !supabaseKey || !mongoUri) {
  console.error("Missing environment variables. Make sure to run with node --env-file=.env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB.");

  try {
    // 1. Migrate Users
    console.log("Migrating USERS...");
    const { data: usersData, error: usersErr } = await supabase.from('USERS').select('*');
    if (usersErr) throw usersErr;
    await User.deleteMany({}); // Warning: clear for dev/migration purposes
    
    const usersToInsert = usersData.map(u => ({
      citizen_id: u.citizen_id,
      password: u.password, // This is already bcrypt hashed in Supabase for the staff, or plain text? 
      // Supabase's auth.users manages real passwords but the previous project kept passwords directly in the 'USERS' table hashed.
      first_name: u.first_name,
      last_name: u.last_name || '',
      role: u.role || 'student'
    }));
    await User.insertMany(usersToInsert);
    console.log(`Migrated ${usersToInsert.length} Users`);

    // 2. Migrate Faculties
    console.log("Migrating FACULTIES...");
    const { data: facs, error: facsErr } = await supabase.from('FACULTIES').select('*');
    if (facsErr) throw facsErr;
    await Faculty.deleteMany({});
    await Faculty.insertMany(facs);
    console.log(`Migrated ${facs.length} Faculties`);

    // 3. Migrate Departments
    console.log("Migrating DEPARTMENTS...");
    const { data: depts, error: deptsErr } = await supabase.from('DEPARTMENTS').select('*');
    if (deptsErr) throw deptsErr;
    await Department.deleteMany({});
    await Department.insertMany(depts);
    console.log(`Migrated ${depts.length} Departments`);

    // 4. Migrate Programs
    console.log("Migrating PROGRAMS...");
    const { data: progs, error: progsErr } = await supabase.from('PROGRAMS').select('*');
    if (progsErr) throw progsErr;
    await Program.deleteMany({});
    await Program.insertMany(progs);
    console.log(`Migrated ${progs.length} Programs`);

    // 5. Migrate Subjects
    console.log("Migrating SUBJECTS...");
    const { data: subs, error: subsErr } = await supabase.from('SUBJECTS').select('*');
    if (subsErr) throw subsErr;
    await Subject.deleteMany({});
    await Subject.insertMany(subs);
    console.log(`Migrated ${subs.length} Subjects`);

    // 6. Migrate Study Plans
    console.log("Migrating STUDY_PLANS...");
    const { data: plans, error: plansErr } = await supabase.from('STUDY_PLANS').select('*');
    if (plansErr) throw plansErr;
    await StudyPlan.deleteMany({});
    await StudyPlan.insertMany(plans);
    console.log(`Migrated ${plans.length} Study Plans`);

    // 7. Migrate Admission Projects
    console.log("Migrating ADMISSION_PROJECTS...");
    const { data: projects, error: projectsErr } = await supabase.from('ADMISSION_PROJECTS').select('*');
    if (projectsErr) throw projectsErr;
    await AdmissionProject.deleteMany({});
    await AdmissionProject.insertMany(projects);
    console.log(`Migrated ${projects.length} Admission Projects`);

    // 8. Migrate Admission Criteria
    console.log("Migrating ADMISSION_CRITERIA...");
    const { data: crits, error: critsErr } = await supabase.from('ADMISSION_CRITERIA').select(`
      *,
      CRITERIA_PLANS ( plan_id ),
      CRITERIA_SUBJECTS ( subject_id, min_score, weight )
    `);
    if (critsErr) throw critsErr;

    await AdmissionCriteria.deleteMany({});
    await CriteriaPlan.deleteMany({});
    await CriteriaSubject.deleteMany({});

    for (const crit of crits) {
      let parsedEduStatus = [];
      if (Array.isArray(crit.edu_status_req)) {
        parsedEduStatus = crit.edu_status_req;
      } else if (typeof crit.edu_status_req === 'string') {
        try {
          parsedEduStatus = JSON.parse(crit.edu_status_req);
        } catch (e) {
          parsedEduStatus = crit.edu_status_req.replace(/^\{|\}$/g, '').split(',').filter(Boolean);
        }
      }

      const newCrit = await AdmissionCriteria.create({
        academic_year: crit.academic_year,
        tcas_round: crit.tcas_round,
        max_seats: crit.max_seats,
        min_gpax: crit.min_gpax,
        edu_status_req: parsedEduStatus,
        program_id: crit.program_id,
        project_id: crit.project_id,
        start_date: crit.start_date,
        end_date: crit.end_date
      });

      // Insert related plans
      if (crit.CRITERIA_PLANS && crit.CRITERIA_PLANS.length > 0) {
        const plansToInsert = crit.CRITERIA_PLANS.map(p => ({
          criteria_id: newCrit._id,
          plan_id: p.plan_id
        }));
        await CriteriaPlan.insertMany(plansToInsert);
      }

      // Insert related subjects
      if (crit.CRITERIA_SUBJECTS && crit.CRITERIA_SUBJECTS.length > 0) {
        const subjectsToInsert = crit.CRITERIA_SUBJECTS.map(s => ({
          criteria_id: newCrit._id,
          subject_id: s.subject_id,
          min_score: s.min_score,
          weight: s.weight
        }));
        await CriteriaSubject.insertMany(subjectsToInsert);
      }
    }
    console.log(`Migrated ${crits.length} Admission Criteria configurations`);

    console.log("\nMigration completed successfully ✅");

  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    mongoose.disconnect();
  }
}

migrate();
