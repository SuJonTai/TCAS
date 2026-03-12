import express from 'express';
import cors from 'cors';
import sql from 'mssql';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import fs from 'fs';


// 1. ตั้งค่า Storage Engine ของ Multer ใหม่เพื่อให้รักษานามสกุลไฟล์
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // โฟลเดอร์ที่เก็บไฟล์
    },
    filename: function (req, file, cb) {
        // ดึงนามสกุลไฟล์เดิมมา (เช่น .pdf)
        const ext = path.extname(file.originalname);
        // ตั้งชื่อไฟล์ใหม่: ชื่อฟิลด์ (transcript/portfolio) + เวลาปัจจุบัน + นามสกุลเดิม
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});
const upload = multer({ storage: storage });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const app = express();
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(cors());
app.use(express.json());

const PORT = 3000;
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_KEY;

let supabase = null;

if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase client failed to initialize");
} else {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log("Successfully initialized Supabase client");
}

const connectionString = process.env.MSSQL_CONNECTION_STRING;
if (!connectionString) {
    console.error("⚠️ Warning: MSSQL_CONNECTION_STRING is missing in .env.local");
} else {
    sql.connect(connectionString)
        .then(pool => {
            if (pool.connected) console.log("Successfully connected to Local MS SQL");
        })
        .catch(err => {
            console.error("MS SQL Connection Failed:", err.message);
        });
}

console.log(`🚀 Server starting... Ready to handle requests.`);

const isSupabaseRequest = (req) => {
    return req.headers['x-db-type'] === 'supabase';
};


app.get('/api/health', (req, res) => {
    const useSupabase = isSupabaseRequest(req);
    res.json({ status: 'ok', database: useSupabase ? 'Supabase' : 'MS SQL' });
});

// --- GET All Faculties (with Departments & Programs) ---
app.get('/api/faculties', async (req, res) => {
    const useSupabase = isSupabaseRequest(req);
    try {
        if (useSupabase) {
            // Supabase: ใช้การ Select ซ้อนกัน
            const { data, error } = await supabase
                .from('FACULTIES')
                .select('id, faculty_name, DEPARTMENTS(id, dept_name, PROGRAMS(id, prog_name))')
                .order('id');
            if (error) throw error;
            return res.json(data);
        } else {
            // MS SQL Server: ดึงข้อมูลแบบ JOIN 3 ตารางแล้วนำมาจัดรูปแบบเป็น Nested JSON
            const result = await sql.query`
                SELECT 
                    f.id AS fac_id, f.faculty_name,
                    d.id AS dept_id, d.dept_name,
                    p.id AS prog_id, p.prog_name
                FROM FACULTIES f
                LEFT JOIN DEPARTMENTS d ON f.id = d.faculty_id
                LEFT JOIN PROGRAMS p ON d.id = p.dept_id
                ORDER BY f.id, d.id, p.id
            `;

            const faculties = [];
            const facMap = new Map();
            const deptMap = new Map();

            result.recordset.forEach(row => {
                // 1. ระดับคณะ (Faculty)
                if (!facMap.has(row.fac_id)) {
                    const newFac = { id: row.fac_id, faculty_name: row.faculty_name, DEPARTMENTS: [] };
                    facMap.set(row.fac_id, newFac);
                    faculties.push(newFac);
                }
                const fac = facMap.get(row.fac_id);

                // 2. ระดับภาควิชา (Department)
                if (row.dept_id && !deptMap.has(row.dept_id)) {
                    const newDept = { id: row.dept_id, dept_name: row.dept_name, PROGRAMS: [] };
                    deptMap.set(row.dept_id, newDept);
                    fac.DEPARTMENTS.push(newDept);
                }
                const dept = deptMap.get(row.dept_id);

                // 3. ระดับสาขาวิชา (Program)
                if (row.prog_id && dept) {
                    dept.PROGRAMS.push({ id: row.prog_id, prog_name: row.prog_name });
                }
            });

            return res.json(faculties);
        }
    } catch (err) {
        console.error("Faculties Fetch Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- Fetch Applicants ---
app.get('/api/applicants', async (req, res) => {
    const useSupabase = isSupabaseRequest(req);
    try {
        if (useSupabase) {
            const { data, error } = await supabase.from('APPLICATION').select('*');
            if (error) throw error;
            return res.json(data);
        } else {
            const result = await sql.query`SELECT * FROM APPLICATION`;
            return res.json(result.recordset);
        }
    } catch (err) {
        console.error("API Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// --- GET Program Detail (For Admission_detail.jsx) ---
app.get('/api/programs/:id', async (req, res) => {
    const useSupabase = isSupabaseRequest(req);
    const { id } = req.params;

    try {
        if (useSupabase) {
            // Supabase: โครงสร้างปกติ
            const { data, error } = await supabase
                .from('PROGRAMS')
                .select(`
                    id, prog_name,
                    DEPARTMENTS ( dept_name, FACULTIES ( faculty_name ) ),
                    ADMISSION_CRITERIA (
                        id, tcas_round, max_seats, min_gpax, academic_year, edu_status_req, start_date, end_date,
                        ADMISSION_PROJECTS ( project_name ),
                        CRITERIA_SUBJECTS ( min_score, weight, SUBJECTS ( subject_name ) )
                    )
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            return res.json(data);

        } else {
            // MS SQL Server: แก้ปัญหาการซ้อน JSON ด้วย LEFT JOIN และ Dot Notation
            const result = await sql.query`
                SELECT 
                    p.id, 
                    p.prog_name,
                    (
                        SELECT d.dept_name, 
                               f.faculty_name AS 'FACULTIES.faculty_name'
                        FROM DEPARTMENTS d 
                        LEFT JOIN FACULTIES f ON f.id = d.faculty_id
                        WHERE d.id = p.dept_id
                        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
                    ) AS DEPARTMENTS,
                    (
                        SELECT ac.id, ac.tcas_round, ac.max_seats, ac.min_gpax, ac.academic_year, ac.edu_status_req, ac.start_date, ac.end_date,
                            proj.project_name AS 'ADMISSION_PROJECTS.project_name',
                            (
                                SELECT cs.min_score, cs.weight,
                                       s.subject_name AS 'SUBJECTS.subject_name'
                                FROM CRITERIA_SUBJECTS cs 
                                LEFT JOIN SUBJECTS s ON s.id = cs.subject_id
                                WHERE cs.criteria_id = ac.id
                                FOR JSON PATH
                            ) AS CRITERIA_SUBJECTS
                        FROM ADMISSION_CRITERIA ac 
                        LEFT JOIN ADMISSION_PROJECTS proj ON proj.id = ac.project_id
                        WHERE ac.program_id = p.id
                        FOR JSON PATH
                    ) AS ADMISSION_CRITERIA
                FROM PROGRAMS p
                WHERE p.id = ${id}
            `;

            if (result.recordset.length === 0) return res.status(404).json({ error: "Program not found" });

            let row = result.recordset[0];
            const parsedData = {
                ...row,
                DEPARTMENTS: row.DEPARTMENTS ? JSON.parse(row.DEPARTMENTS) : null,
                ADMISSION_CRITERIA: row.ADMISSION_CRITERIA ? JSON.parse(row.ADMISSION_CRITERIA).map(crit => ({
                    ...crit,
                    edu_status_req: crit.edu_status_req ? JSON.parse(crit.edu_status_req) : []
                })) : []
            };

            return res.json(parsedData);
        }
    } catch (err) {
        console.error("Fetch Program Detail Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- Login User ---
app.post('/api/login', async (req, res) => {
    const { citizen_id, password } = req.body;
    const useSupabase = isSupabaseRequest(req);

    try {
        let user;

        if (useSupabase) {
            const { data, error } = await supabase.from('USERS').select('*').eq('citizen_id', citizen_id).single();
            if (error || !data) return res.status(401).json({ message: "ไม่พบบัญชีผู้ใช้ในระบบ" });
            user = data;
        } else {
            const result = await sql.query`SELECT * FROM USERS WHERE citizen_id = ${citizen_id}`;
            if (result.recordset.length === 0) return res.status(401).json({ message: "ไม่พบบัญชีผู้ใช้ในระบบ" });
            user = result.recordset[0];
        }

        const isPasswordValid = bcrypt.compareSync(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "รหัสผ่านไม่ถูกต้อง" });
        }

        return res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- POST Register User ---
app.post('/api/register', async (req, res) => {
    const useSupabase = isSupabaseRequest(req);
    const { citizen_id, password, first_name, last_name } = req.body;

    try {
        // 1. Securely hash the password on the server
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(password, salt);

        if (useSupabase) {
            if (!supabase) return res.status(503).json({ error: "Supabase not configured." });

            const { data, error } = await supabase.from('USERS').insert([{
                citizen_id,
                password: hashedPassword,
                first_name,
                last_name,
                role: 'student'
            }]);

            if (error) {
                // Supabase unique constraint error code
                if (error.code === '23505') {
                    return res.status(400).json({ error: "รหัสบัตรประชาชนนี้ถูกใช้งานแล้ว" });
                }
                throw error;
            }
            return res.status(201).json({ message: "Registration successful" });

        } else {
            // MS SQL Logic
            try {
                await sql.query`
                    INSERT INTO USERS (citizen_id, password, first_name, last_name, role)
                    VALUES (${citizen_id}, ${hashedPassword}, ${first_name}, ${last_name}, 'student')
                `;
                return res.status(201).json({ message: "Registration successful" });
            } catch (sqlErr) {
                // MS SQL unique constraint error number (2627 or 2601)
                if (sqlErr.number === 2627 || sqlErr.number === 2601) {
                    return res.status(400).json({ error: "รหัสบัตรประชาชนนี้ถูกใช้งานแล้ว" });
                }
                throw sqlErr;
            }
        }
    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์" });
    }
});

// --- Create Staff User (SuperAdmin) ---
app.post('/api/users', async (req, res) => {
    const { citizen_id, password, first_name, last_name, role } = req.body;
    const useSupabase = isSupabaseRequest(req);

    try {
        // 1. เข้ารหัสรหัสผ่านที่ฝั่ง Backend เพื่อความปลอดภัย
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(password, salt);

        if (useSupabase) {
            const { error } = await supabase.from('USERS').insert([{
                citizen_id,
                password: hashedPassword, // ใช้รหัสผ่านที่ถูก Hash แล้ว
                first_name,
                last_name,
                role: role || 'staff'
            }]);

            if (error) {
                if (error.code === '23505') return res.status(409).json({ message: "รหัสบัตรประชาชนนี้ถูกใช้งานแล้ว" });
                throw error;
            }
            return res.status(201).json({ message: "สร้างบัญชีสำเร็จ" });
        } else {
            try {
                // MS SQL Logic
                await sql.query`
                    INSERT INTO USERS (citizen_id, password, first_name, last_name, role)
                    VALUES (${citizen_id}, ${hashedPassword}, ${first_name}, ${last_name}, ${role || 'staff'})
                `;
                return res.status(201).json({ message: "สร้างบัญชีสำเร็จ" });
            } catch (dbErr) {
                // ดักจับ Error Code 2627 หรือ 2601 ของ MSSQL (Unique Constraint Violation)
                if (dbErr.number === 2627 || dbErr.number === 2601) {
                    return res.status(409).json({ message: "รหัสบัตรประชาชนนี้ถูกใช้งานแล้ว" });
                }
                throw dbErr;
            }
        }
    } catch (err) {
        console.error("Create User Error:", err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์" });
    }
});

// --- GET User Profile ---
app.get('/api/users/:id', async (req, res) => {
    const useSupabase = isSupabaseRequest(req);
    try {
        const userId = req.params.id;

        if (useSupabase) {
            const { data, error } = await supabase.from('USERS')
                .select('gpax_5_term, current_level, edu_status, plan_id, high_school')
                .eq('id', userId)
                .single();
            if (error) throw error;
            return res.json(data);
        } else {
            const result = await sql.query`
                SELECT gpax_5_term, current_level, edu_status, plan_id, high_school 
                FROM USERS 
                WHERE id = ${userId}
            `;
            if (result.recordset.length === 0) return res.status(404).json({ message: "User not found" });
            res.json(result.recordset[0]);
        }
    } catch (err) {
        console.error("Profile Fetch Error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// --- PUT Update User Profile ---
app.put('/api/users/:id', async (req, res) => {
    const useSupabase = isSupabaseRequest(req);
    try {
        const userId = req.params.id;
        const { high_school, edu_status, current_level, gpax_5_term, plan_id } = req.body;

        if (useSupabase) {
            const { error } = await supabase.from('USERS')
                .update({ high_school, edu_status, current_level, gpax_5_term, plan_id })
                .eq('id', userId);
            if (error) throw error;
            res.json({ message: "Profile updated successfully" });
        } else {
            await sql.query`
                UPDATE USERS 
                SET high_school = ${high_school}, 
                    edu_status = ${edu_status}, 
                    current_level = ${current_level}, 
                    gpax_5_term = ${gpax_5_term}, 
                    plan_id = ${plan_id}
                WHERE id = ${userId}
            `;
            res.json({ message: "Profile updated successfully" });
        }
    } catch (err) {
        console.error("Profile Update Error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// --- GET Top Faculties Stats ---
app.get('/api/stats/top-faculties', async (req, res) => {
    const useSupabase = isSupabaseRequest(req);
    try {
        if (useSupabase) {
            if (!supabase) {
                return res.status(503).json({
                    error: "Supabase is not configured. Please add keys to .env.local or switch frontend to MS SQL."
                });
            }

            // 1. UPDATED: Fetch via ADMISSION_CRITERIA
            const { data, error } = await supabase
                .from('APPLICATION')
                .select(`
                    id, 
                    ADMISSION_CRITERIA ( 
                        PROGRAMS ( 
                            DEPARTMENTS ( 
                                FACULTIES ( faculty_name ) 
                            ) 
                        ) 
                    )
                `);
            if (error) throw error;

            const facultyCounts = {};
            data.forEach(app => {
                // 2. UPDATED: Navigate through ADMISSION_CRITERIA to get the faculty name
                const facultyName = app.ADMISSION_CRITERIA?.PROGRAMS?.DEPARTMENTS?.FACULTIES?.faculty_name;
                if (facultyName) {
                    facultyCounts[facultyName] = (facultyCounts[facultyName] || 0) + 1;
                }
            });

            const sorted = Object.entries(facultyCounts)
                .map(([name, applicants]) => ({ name, applicants }))
                .sort((a, b) => b.applicants - a.applicants)
                .slice(0, 5);

            return res.json(sorted);
        } else {
            // 3. UPDATED MS SQL Logic: Join through ADMISSION_CRITERIA
            const result = await sql.query`
                SELECT TOP 5
                    f.faculty_name AS name,
                    COUNT(a.id) AS applicants
                FROM FACULTIES f
                JOIN DEPARTMENTS d ON f.id = d.faculty_id
                JOIN PROGRAMS p ON d.id = p.dept_id
                JOIN ADMISSION_CRITERIA c ON p.id = c.program_id
                JOIN APPLICATION a ON c.id = a.criteria_id
                GROUP BY f.faculty_name
                ORDER BY applicants DESC
            `;
            return res.json(result.recordset);
        }
    } catch (err) {
        console.error("Stats Fetch Error:", err);
        res.status(500).json({ error: err.message || "Server error" });
    }
});

// --- GET All Admissions Data (Nested) ---
app.get('/api/admissions', async (req, res) => {
    const useSupabase = isSupabaseRequest(req);
    try {
        if (useSupabase) {
            if (!supabase) return res.status(503).json({ error: "Supabase not configured." });

            // Supabase makes nesting easy via PostgREST
            const { data, error } = await supabase
                .from('FACULTIES')
                .select(`
                    id, 
                    faculty_name, 
                    DEPARTMENTS (
                        id, 
                        dept_name, 
                        PROGRAMS (
                            id, 
                            prog_name,
                            ADMISSION_CRITERIA ( id, tcas_round, start_date, end_date ) 
                        )
                    )
                `);
            if (error) throw error;
            return res.json(data);

        } else {
            // MS SQL Logic: We must query the flat data and nest it ourselves
            const result = await sql.query`
                SELECT 
                    f.id AS faculty_id, f.faculty_name,
                    d.id AS dept_id, d.dept_name,
                    p.id AS prog_id, p.prog_name,
                    c.id AS criteria_id, c.tcas_round, c.start_date, c.end_date
                FROM FACULTIES f
                LEFT JOIN DEPARTMENTS d ON f.id = d.faculty_id
                LEFT JOIN PROGRAMS p ON d.id = p.dept_id
                LEFT JOIN ADMISSION_CRITERIA c ON p.id = c.program_id
                ORDER BY f.id, d.id, p.id, c.tcas_round
            `;

            // Transform flat SQL rows into the nested JSON structure React expects
            const nestedData = [];
            const facultyMap = new Map();
            const deptMap = new Map();
            const progMap = new Map();

            result.recordset.forEach(row => {
                // 1. Map Faculties
                if (!facultyMap.has(row.faculty_id)) {
                    const newFaculty = { id: row.faculty_id, faculty_name: row.faculty_name, DEPARTMENTS: [] };
                    facultyMap.set(row.faculty_id, newFaculty);
                    nestedData.push(newFaculty);
                }
                const faculty = facultyMap.get(row.faculty_id);

                // 2. Map Departments
                if (row.dept_id && !deptMap.has(row.dept_id)) {
                    const newDept = { id: row.dept_id, dept_name: row.dept_name, PROGRAMS: [] };
                    deptMap.set(row.dept_id, newDept);
                    faculty.DEPARTMENTS.push(newDept);
                }
                const dept = deptMap.get(row.dept_id);

                // 3. Map Programs
                if (row.prog_id && !progMap.has(row.prog_id)) {
                    const newProg = { id: row.prog_id, prog_name: row.prog_name, ADMISSION_CRITERIA: [] };
                    progMap.set(row.prog_id, newProg);
                    dept.PROGRAMS.push(newProg);
                }
                const prog = progMap.get(row.prog_id);

                // 4. Map Criteria
                if (row.criteria_id && prog) {
                    prog.ADMISSION_CRITERIA.push({
                        id: row.criteria_id,
                        tcas_round: row.tcas_round,
                        start_date: row.start_date,
                        end_date: row.end_date
                    });
                }
            });

            return res.json(nestedData);
        }
    } catch (err) {
        console.error("Admissions Fetch Error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// --- GET Pre-Data for Apply Page ---
app.get('/api/apply-data/:userId', async (req, res) => {
    const useSupabase = isSupabaseRequest(req);
    const { userId } = req.params;

    try {
        if (useSupabase) {
            // 1. User
            const { data: user } = await supabase.from('USERS').select('gpax_5_term, current_level').eq('id', userId).single();
            // 2. Faculties
            const { data: faculties } = await supabase.from('FACULTIES').select(`id, faculty_name, DEPARTMENTS (id, dept_name, PROGRAMS (id, prog_name))`);
            // 3. Criteria + Projects
            const { data: criteria } = await supabase.from('ADMISSION_CRITERIA').select(`*, ADMISSION_PROJECTS (id, project_name)`);

            return res.json({ user, faculties, criteria });
        } else {
            // MS SQL Logic
            const userResult = await sql.query`SELECT gpax_5_term, current_level FROM USERS WHERE id = ${userId}`;

            // Reusing a simplified version of our nested faculties logic
            const facResult = await sql.query`
                SELECT f.id as fac_id, f.faculty_name, d.id as dept_id, d.dept_name, p.id as prog_id, p.prog_name 
                FROM FACULTIES f 
                LEFT JOIN DEPARTMENTS d ON f.id = d.faculty_id 
                LEFT JOIN PROGRAMS p ON d.id = p.dept_id
            `;

            const faculties = [];
            const facMap = new Map();
            const deptMap = new Map();

            facResult.recordset.forEach(row => {
                if (!facMap.has(row.fac_id)) {
                    const newFac = { id: row.fac_id, faculty_name: row.faculty_name, DEPARTMENTS: [] };
                    facMap.set(row.fac_id, newFac);
                    faculties.push(newFac);
                }
                const fac = facMap.get(row.fac_id);

                if (row.dept_id && !deptMap.has(row.dept_id)) {
                    const newDept = { id: row.dept_id, dept_name: row.dept_name, PROGRAMS: [] };
                    deptMap.set(row.dept_id, newDept);
                    fac.DEPARTMENTS.push(newDept);
                }
                if (row.prog_id) {
                    deptMap.get(row.dept_id).PROGRAMS.push({ id: row.prog_id, prog_name: row.prog_name });
                }
            });

            // Criteria + Projects
            const critResult = await sql.query`
                SELECT c.*, p.id as p_id, p.project_name 
                FROM ADMISSION_CRITERIA c
                LEFT JOIN ADMISSION_PROJECTS p ON c.project_id = p.id
            `;
            const criteria = critResult.recordset.map(row => ({
                ...row,
                ADMISSION_PROJECTS: row.p_id ? { id: row.p_id, project_name: row.project_name } : null
            }));

            return res.json({ user: userResult.recordset[0], faculties, criteria });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch application data" });
    }
});

// --- POST Application (Handles Files) ---
// multer.fields expects the names we appended in our FormData in React
app.post('/api/apply', upload.fields([{ name: 'transcript' }, { name: 'portfolio' }]), async (req, res) => {
    const useSupabase = isSupabaseRequest(req);
    const { user_id, criteria_id, gpax } = req.body;

    // Fallback URLs for files (since we are skipping complex MS SQL file storage)
    const transcriptUrl = req.files['transcript'] ? `http://localhost:3000/uploads/${req.files['transcript'][0].filename}` : null;
    const portfolioUrl = req.files['portfolio'] ? `http://localhost:3000/uploads/${req.files['portfolio'][0].filename}` : null;

    try {
        if (useSupabase) {
            // CHECK FOR EXISTING
            const { data: existing } = await supabase.from('APPLICATION')
                .select('id').eq('user_id', user_id).eq('criteria_id', criteria_id).maybeSingle();

            if (existing) return res.status(409).json({ error: "คุณได้ส่งใบสมัครในสาขาและโครงการนี้ไปแล้ว" });

            // Note: For a true 1:1 migration, you would read req.files here and upload 
            // the buffers directly to Supabase Storage via supabase-js. 
            // For now, we simulate success to keep things moving.

            const { error: insertErr } = await supabase.from('APPLICATION').insert([{
                user_id, criteria_id, gpax, status: 'pending', transcript_url: transcriptUrl, portfolio_url: portfolioUrl
            }]);

            if (insertErr) throw insertErr;
            return res.status(201).json({ message: "Application submitted" });

        } else {
            // MS SQL Logic
            // CHECK FOR EXISTING
            const check = await sql.query`SELECT id FROM APPLICATION WHERE user_id = ${user_id} AND criteria_id = ${criteria_id}`;
            if (check.recordset.length > 0) return res.status(409).json({ error: "คุณได้ส่งใบสมัครในสาขาและโครงการนี้ไปแล้ว" });

            await sql.query`
                INSERT INTO APPLICATION (user_id, criteria_id, gpax, status, transcript_url, portfolio_url)
                VALUES (${user_id}, ${criteria_id}, ${gpax}, 'pending', ${transcriptUrl}, ${portfolioUrl})
            `;
            return res.status(201).json({ message: "Application submitted" });
        }
    } catch (err) {
        console.error("Apply error:", err);
        // Clean up the temp files multer created
        if (req.files) {
            Object.values(req.files).flat().forEach(file => fs.unlinkSync(file.path));
        }
        res.status(500).json({ error: "Server error during application" });
    }
});

// --- เพิ่มคณะใหม่ ---
app.get('/api/faculties', async (req, res) => {
    const useSupabase = isSupabaseRequest(req);
    try {
        if (useSupabase) {
            const { data, error } = await supabase
                .from('FACULTIES')
                .select('*, DEPARTMENTS(*)'); // ดึงภาควิชามาด้วย
            if (error) throw error;
            return res.json(data);
        } else {
            // สำหรับ MS SQL ต้อง JOIN เพื่อเอาภาควิชามาด้วย
            const result = await sql.query`
                SELECT f.id as f_id, f.faculty_name, d.id as d_id, d.dept_name
                FROM FACULTIES f
                LEFT JOIN DEPARTMENTS d ON f.id = d.faculty_id
            `;

            // แปลง Flat Data เป็น Nested JSON
            const nested = [];
            const map = new Map();
            result.recordset.forEach(row => {
                if (!map.has(row.f_id)) {
                    map.set(row.f_id, { id: row.f_id, faculty_name: row.faculty_name, DEPARTMENTS: [] });
                    nested.push(map.get(row.f_id));
                }
                if (row.d_id) {
                    map.get(row.f_id).DEPARTMENTS.push({ id: row.d_id, dept_name: row.dept_name });
                }
            });
            return res.json(nested);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/faculties', async (req, res) => {
    const { faculty_name } = req.body;
    const useSupabase = isSupabaseRequest(req);
    try {
        if (useSupabase) {
            const {data, error} = await supabase.from('FACULTIES').insert([{ faculty_name }]);
            if (error) throw error;
            return res.status(201).json({ message: "เพิ่มคณะสำเร็จ" });
        } else { sql.query`INSERT INTO FACULTIES (faculty_name) VALUES (${faculty_name})`;
            return res.status(201).json({ message: "เพิ่มคณะสำเร็จ" });
        }
    }  catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);


app.post('/api/departments', async (req, res) => {
    const { faculty_id, dept_name } = req.body;
    const useSupabase = isSupabaseRequest(req);
    try {
        if (useSupabase) {
            const { data, error } = await supabase.from('DEPARTMENTS').insert([{ faculty_id, dept_name }]);
            if (error) throw error;
            return res.status(201).json({ message: "เพิ่มภาควิชาสำเร็จ" });
        } else {
            await sql.query`INSERT INTO DEPARTMENTS (faculty_id, dept_name) VALUES (${faculty_id}, ${dept_name})`;
            return res.status(201).json({ message: "เพิ่มภาควิชาสำเร็จ" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/programs', async (req, res) => {
    const { dept_id, prog_name } = req.body;
    const useSupabase = isSupabaseRequest(req);
    try {
        if (useSupabase) {
            const { data, error } = await supabase.from('PROGRAMS').insert([{ dept_id, prog_name }]);
            if (error) throw error;
            return res.status(201).json({ message: "เพิ่มสาขาวิชาสำเร็จ" });
        } else {
            await sql.query`INSERT INTO PROGRAMS (dept_id, prog_name) VALUES (${dept_id}, ${prog_name})`;
            return res.status(201).json({ message: "เพิ่มสาขาวิชาสำเร็จ" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admission-projects', async (req, res) => {
    const { project_name } = req.body;
    const useSupabase = isSupabaseRequest(req);
    try {
        if (useSupabase) {
            const { data, error } = await supabase.from('ADMISSION_PROJECTS').insert([{ project_name }]);
            if (error) throw error;
            return res.status(201).json({ message: "เพิ่มโครงการสำเร็จ" });
        } else {
            await sql.query`INSERT INTO ADMISSION_PROJECTS (project_name) VALUES (${project_name})`;
            return res.status(201).json({ message: "เพิ่มโครงการสำเร็จ" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/criteria', async (req, res) => {
    const dbType = req.headers['x-db-type'] || 'supabase';

    try {
        if (dbType === 'supabase') {
            const { data, error } = await supabase
                .from('ADMISSION_CRITERIA')
                .select(`
                    *,
                    CRITERIA_PLANS ( plan_id ),
                    CRITERIA_SUBJECTS ( subject_id, min_score, weight ),
                    PROGRAMS ( id, prog_name, DEPARTMENTS ( id, dept_name, FACULTIES ( id, faculty_name ) ) ),
                    ADMISSION_PROJECTS ( id, project_name )
                `)
                .order('id', { ascending: false });

            if (error) return res.status(500).json({ error: error.message });
            res.json(data);

        } else if (dbType === 'sqlserver') {
            const result = await sql.query`
                SELECT 
                    ac.*,
                    p.prog_name,
                    d.dept_name,
                    f.faculty_name,
                    proj.project_name,
                    (SELECT plan_id FROM CRITERIA_PLANS WHERE criteria_id = ac.id FOR JSON PATH) AS CRITERIA_PLANS,
                    (SELECT subject_id, min_score, weight FROM CRITERIA_SUBJECTS WHERE criteria_id = ac.id FOR JSON PATH) AS CRITERIA_SUBJECTS
                FROM ADMISSION_CRITERIA ac
                LEFT JOIN PROGRAMS p ON ac.program_id = p.id
                LEFT JOIN DEPARTMENTS d ON p.dept_id = d.id
                LEFT JOIN FACULTIES f ON d.faculty_id = f.id
                LEFT JOIN ADMISSION_PROJECTS proj ON ac.project_id = proj.id
                ORDER BY ac.id DESC
            `;

            const data = result.recordset.map(row => ({
                ...row,
                edu_status_req: row.edu_status_req ? JSON.parse(row.edu_status_req) : [],
                CRITERIA_PLANS: row.CRITERIA_PLANS ? JSON.parse(row.CRITERIA_PLANS) : [],
                CRITERIA_SUBJECTS: row.CRITERIA_SUBJECTS ? JSON.parse(row.CRITERIA_SUBJECTS) : []
            }));

            res.json(data);
        } else {
            res.status(400).json({ error: 'Invalid database type' });
        }
    } catch (err) {
        console.error("Fetch Criteria Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/projects', async (req, res) => {
    const useSupabase = isSupabaseRequest(req);
    try {
        if (useSupabase) {
            const { data, error } = await supabase.from('ADMISSION_PROJECTS').select('*');
            if (error) throw error;
            return res.json(data);
        } else {
            const result = await sql.query`SELECT * FROM ADMISSION_PROJECTS`;
            return res.json(result.recordset);
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/subjects', async (req, res) => {
    const useSupabase = isSupabaseRequest(req);
    try {
        if (useSupabase) {
            const { data, error } = await supabase.from('SUBJECTS').select('*');
            if (error) throw error;
            return res.json(data);
        } else {
            const result = await sql.query`SELECT * FROM SUBJECTS`;
            return res.json(result.recordset);
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/study-plans', async (req, res) => {
    const useSupabase = isSupabaseRequest(req);
    try {
        if (useSupabase) {
            const { data, error } = await supabase.from('STUDY_PLANS').select('*');
            if (error) throw error;
            return res.json(data);
        } else {
            const result = await sql.query`SELECT * FROM STUDY_PLANS`;
            return res.json(result.recordset);
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/criteria', async (req, res) => {
    const useSupabase = isSupabaseRequest(req);
    const { criteria, study_plans, subjects } = req.body;

    try {
        if (useSupabase) {
            // 1. Insert Criteria
            const { data: critData, error: critErr } = await supabase
                .from('ADMISSION_CRITERIA')
                .insert([criteria])
                .select()
                .single();
            if (critErr) throw critErr;

            const newId = critData.id;

            // 2. Insert Plans
            if (study_plans && study_plans.length > 0) {
                const plansToInsert = study_plans.map(plan_id => ({ criteria_id: newId, plan_id }));
                await supabase.from('CRITERIA_PLANS').insert(plansToInsert);
            }

            // 3. Insert Subjects
            if (subjects && subjects.length > 0) {
                const subsToInsert = subjects.map(s => ({
                    criteria_id: newId, subject_id: s.subject_id, min_score: s.min_score, weight: s.weight
                }));
                await supabase.from('CRITERIA_SUBJECTS').insert(subsToInsert);
            }

            res.status(201).json({ message: "Created successfully", id: newId });
        } else {
            // SQL Server Logic
            const eduStatusStr = JSON.stringify(criteria.edu_status_req || []);
            const result = await sql.query`
                INSERT INTO ADMISSION_CRITERIA 
                (academic_year, tcas_round, max_seats, min_gpax, edu_status_req, project_id, program_id, start_date, end_date)
                OUTPUT INSERTED.id
                VALUES 
                (${criteria.academic_year}, ${criteria.tcas_round}, ${criteria.max_seats}, ${criteria.min_gpax}, ${eduStatusStr}, ${criteria.project_id}, ${criteria.program_id}, ${criteria.start_date}, ${criteria.end_date})
            `;
            const newId = result.recordset[0].id;

            if (study_plans && study_plans.length > 0) {
                for (let plan_id of study_plans) {
                    await sql.query`INSERT INTO CRITERIA_PLANS (criteria_id, plan_id) VALUES (${newId}, ${plan_id})`;
                }
            }
            if (subjects && subjects.length > 0) {
                for (let s of subjects) {
                    await sql.query`INSERT INTO CRITERIA_SUBJECTS (criteria_id, subject_id, min_score, weight) VALUES (${newId}, ${s.subject_id}, ${s.min_score}, ${s.weight})`;
                }
            }
            res.status(201).json({ message: "Created successfully", id: newId });
        }
    } catch (err) {
        console.error("POST Criteria Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/criteria/:id', async (req, res) => {
    const useSupabase = isSupabaseRequest(req);
    const { id } = req.params;
    const { criteria, study_plans, subjects } = req.body;

    try {
        if (useSupabase) {
            const { error: critErr } = await supabase.from('ADMISSION_CRITERIA').update(criteria).eq('id', id);
            if (critErr) throw critErr;

            await supabase.from('CRITERIA_PLANS').delete().eq('criteria_id', id);
            await supabase.from('CRITERIA_SUBJECTS').delete().eq('criteria_id', id);
            if (study_plans && study_plans.length > 0) {
                const plansToInsert = study_plans.map(plan_id => ({ criteria_id: id, plan_id }));
                await supabase.from('CRITERIA_PLANS').insert(plansToInsert);
            }
            if (subjects && subjects.length > 0) {
                const subsToInsert = subjects.map(s => ({
                    criteria_id: id, subject_id: s.subject_id, min_score: s.min_score, weight: s.weight
                }));
                await supabase.from('CRITERIA_SUBJECTS').insert(subsToInsert);
            }
            res.json({ message: "Updated successfully" });
        } else {
            const eduStatusStr = JSON.stringify(criteria.edu_status_req || []);
            await sql.query`
                UPDATE ADMISSION_CRITERIA SET
                    academic_year = ${criteria.academic_year},
                    tcas_round = ${criteria.tcas_round},
                    max_seats = ${criteria.max_seats},
                    min_gpax = ${criteria.min_gpax},
                    edu_status_req = ${eduStatusStr},
                    project_id = ${criteria.project_id},
                    program_id = ${criteria.program_id},
                    start_date = ${criteria.start_date},
                    end_date = ${criteria.end_date}
                WHERE id = ${id}
            `;

            await sql.query`DELETE FROM CRITERIA_PLANS WHERE criteria_id = ${id}`;
            await sql.query`DELETE FROM CRITERIA_SUBJECTS WHERE criteria_id = ${id}`;

            if (study_plans && study_plans.length > 0) {
                for (let plan_id of study_plans) {
                    await sql.query`INSERT INTO CRITERIA_PLANS (criteria_id, plan_id) VALUES (${id}, ${plan_id})`;
                }
            }
            if (subjects && subjects.length > 0) {
                for (let s of subjects) {
                    await sql.query`INSERT INTO CRITERIA_SUBJECTS (criteria_id, subject_id, min_score, weight) VALUES (${id}, ${s.subject_id}, ${s.min_score}, ${s.weight})`;
                }
            }
            res.json({ message: "Updated successfully" });
        }
    } catch (err) {
        console.error("PUT Criteria Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/criteria/:id', async (req, res) => {
    const useSupabase = isSupabaseRequest(req);
    const { id } = req.params;

    try {
        if (useSupabase) {
            const { error } = await supabase.from('ADMISSION_CRITERIA').delete().eq('id', id);
            if (error) {
                if (error.code === '23503') return res.status(400).json({ error: "ไม่สามารถลบได้ เนื่องจากยังมีผู้สมัครที่ใช้เกณฑ์นี้" });
                throw error;
            }
            res.json({ message: "Deleted successfully" });
        } else {
            try {
                await sql.query`DELETE FROM ADMISSION_CRITERIA WHERE id = ${id}`;
                res.json({ message: "Deleted successfully" });
            } catch (dbErr) {
                // MS SQL constraint error
                if (dbErr.number === 547) return res.status(400).json({ error: "ไม่สามารถลบได้ เนื่องจากยังมีผู้สมัครที่ใช้เกณฑ์นี้" });
                throw dbErr;
            }
        }
    } catch (err) {
        console.error("DELETE Criteria Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/student/dashboard/:userId', async (req, res) => {
    const useSupabase = isSupabaseRequest(req);
    const { userId } = req.params;

    try {
        if (useSupabase) {
            const [plansRes, subjectsRes, userRes, scoresRes, appsRes] = await Promise.all([
                supabase.from("STUDY_PLANS").select("*").order('plan_name', { ascending: true }),
                supabase.from("SUBJECTS").select("*").order('id', { ascending: true }),
                supabase.from("USERS").select("edu_status, current_level, gpax_5_term, plan_id, high_school").eq("id", userId).single(),
                supabase.from("USER_SCORES").select("subject_id, score_value").eq("user_id", userId),
                supabase.from("APPLICATION").select(`
                    id, status, application_date, failReasons,
                    ADMISSION_CRITERIA (
                        tcas_round,
                        ADMISSION_PROJECTS ( project_name ),
                        PROGRAMS ( prog_name, DEPARTMENTS ( FACULTIES ( faculty_name ) ) )
                    )
                `).eq("user_id", userId).order('application_date', { ascending: false })
            ]);

            return res.json({
                plans: plansRes.data || [],
                subjects: subjectsRes.data || [],
                user: userRes.data || null,
                scores: scoresRes.data || [],
                applications: appsRes.data || []
            });
        } else {
            const plans = await sql.query`SELECT * FROM STUDY_PLANS ORDER BY plan_name ASC`;
            const subjects = await sql.query`SELECT * FROM SUBJECTS ORDER BY id ASC`;
            const user = await sql.query`SELECT edu_status, current_level, gpax_5_term, plan_id, high_school FROM USERS WHERE id = ${userId}`;
            const scores = await sql.query`SELECT subject_id, score_value FROM USER_SCORES WHERE user_id = ${userId}`;
            const appsResult = await sql.query`
                SELECT 
                    a.id, a.status, a.application_date,
                    ac.tcas_round,
                    proj.project_name,
                    p.prog_name,
                    f.faculty_name
                FROM APPLICATION a
                LEFT JOIN ADMISSION_CRITERIA ac ON a.criteria_id = ac.id
                LEFT JOIN ADMISSION_PROJECTS proj ON ac.project_id = proj.id
                LEFT JOIN PROGRAMS p ON ac.program_id = p.id
                LEFT JOIN DEPARTMENTS d ON p.dept_id = d.id
                LEFT JOIN FACULTIES f ON d.faculty_id = f.id
                WHERE a.user_id = ${userId}
                ORDER BY a.application_date DESC
            `;
            const apps = appsResult.recordset.map(row => ({
                id: row.id,
                status: row.status,
                application_date: row.application_date,
                failReasons: null,
                ADMISSION_CRITERIA: {
                    tcas_round: row.tcas_round,
                    ADMISSION_PROJECTS: { project_name: row.project_name },
                    PROGRAMS: {
                        prog_name: row.prog_name,
                        DEPARTMENTS: {
                            FACULTIES: { faculty_name: row.faculty_name }
                        }
                    }
                }
            }));
            return res.json({
                plans: plans.recordset,
                subjects: subjects.recordset,
                user: user.recordset[0] || null,
                scores: scores.recordset,
                applications: apps
            });
        }
    } catch (err) {
        console.error("Dashboard Fetch Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/student/profile/:userId', async (req, res) => {
    const useSupabase = isSupabaseRequest(req);
    const { userId } = req.params;
    const { high_school, edu_status, current_level, gpax_5_term, plan_id, other_plan, edu_type, userScores } = req.body;

    try {
        let finalPlanId = plan_id;

        if (useSupabase) {
            if (plan_id === "other" && other_plan) {
                const { data: existing } = await supabase.from("STUDY_PLANS").select("id").ilike("plan_name", other_plan).eq("plan_group", edu_type).maybeSingle();
                if (existing) {
                    finalPlanId = existing.id;
                } else {
                    const { data: inserted } = await supabase.from("STUDY_PLANS").insert([{ plan_name: other_plan, plan_group: edu_type }]).select().single();
                    finalPlanId = inserted.id;
                }
            }

            // Update user info
            await supabase.from("USERS").update({
                high_school, edu_status, current_level,
                gpax_5_term: parseFloat(gpax_5_term),
                plan_id: finalPlanId
            }).eq("id", userId);

            // Upsert scores
            const scoreUpserts = Object.keys(userScores)
                .filter(subId => userScores[subId] !== "" && userScores[subId] !== null)
                .map(subId => ({
                    user_id: userId,
                    subject_id: parseInt(subId),
                    score_value: parseFloat(userScores[subId])
                }));

            if (scoreUpserts.length > 0) {
                await supabase.from("USER_SCORES").upsert(scoreUpserts, { onConflict: 'user_id, subject_id' });
            }

            return res.json({ message: "Updated Profile", newPlanId: finalPlanId });

        } else {
            // Check custom plan for MS SQL
            if (plan_id === "other" && other_plan) {
                const existing = await sql.query`SELECT id FROM STUDY_PLANS WHERE plan_name = ${other_plan} AND plan_group = ${edu_type}`;
                if (existing.recordset.length > 0) {
                    finalPlanId = existing.recordset[0].id;
                } else {
                    const inserted = await sql.query`INSERT INTO STUDY_PLANS (plan_name, plan_group) OUTPUT INSERTED.id VALUES (${other_plan}, ${edu_type})`;
                    finalPlanId = inserted.recordset[0].id;
                }
            }

            // Update user info
            await sql.query`
                UPDATE USERS 
                SET high_school = ${high_school}, edu_status = ${edu_status}, 
                    current_level = ${current_level}, gpax_5_term = ${parseFloat(gpax_5_term)}, plan_id = ${finalPlanId}
                WHERE id = ${userId}
            `;

            // Merge / Upsert Scores in MS SQL
            const subIds = Object.keys(userScores).filter(subId => userScores[subId] !== "" && userScores[subId] !== null);
            for (const subId of subIds) {
                const val = parseFloat(userScores[subId]);
                const check = await sql.query`SELECT subject_id FROM USER_SCORES WHERE user_id = ${userId} AND subject_id = ${subId}`;

                if (check.recordset.length > 0) {
                    await sql.query`UPDATE USER_SCORES SET score_value = ${val} WHERE user_id = ${userId} AND subject_id = ${subId}`;
                } else {
                    await sql.query`INSERT INTO USER_SCORES (user_id, subject_id, score_value) VALUES (${userId}, ${subId}, ${val})`;
                }
            }

            return res.json({ message: "Updated Profile", newPlanId: finalPlanId });
        }
    } catch (err) {
        console.error("Profile Update Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/applications/:appId', async (req, res) => {
    const useSupabase = isSupabaseRequest(req);
    const { appId } = req.params;

    try {
        if (useSupabase) {
            await supabase.from("APPLICATION").delete().eq("id", appId);
        } else {
            await sql.query`DELETE FROM APPLICATION WHERE id = ${appId}`;
        }
        res.json({ message: "Deleted application" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/staff/applicants', async (req, res) => {
    const useSupabase = isSupabaseRequest(req);
    const { round, faculty_id, program_id } = req.query;

    try {
        if (useSupabase) {
            let query = supabase.from('APPLICATION').select(`
                id, status, gpax,
                USERS ( first_name, last_name, edu_status, current_level, plan_id, STUDY_PLANS ( plan_name, plan_group ), USER_SCORES ( subject_id, score_value ) ),
                ADMISSION_CRITERIA!inner (
                    tcas_round, program_id, min_gpax, edu_status_req, min_level, max_level,
                    CRITERIA_SUBJECTS ( subject_id, min_score, weight, SUBJECTS ( subject_name ) ),
                    PROGRAMS!inner ( prog_name, DEPARTMENTS!inner ( faculty_id, FACULTIES ( faculty_name ) ) )
                )
            `);

            if (round) query = query.eq('ADMISSION_CRITERIA.tcas_round', parseInt(round));
            if (program_id) query = query.eq('ADMISSION_CRITERIA.program_id', parseInt(program_id));
            if (faculty_id) query = query.eq('ADMISSION_CRITERIA.PROGRAMS.DEPARTMENTS.faculty_id', parseInt(faculty_id));

            const { data, error } = await query;
            if (error) throw error;
            
            const formattedData = data.map(app => {
                let totalScore = 0;
                const criteriaSubjects = app.ADMISSION_CRITERIA?.CRITERIA_SUBJECTS || [];
                const userScores = app.USERS?.USER_SCORES || [];
                
                criteriaSubjects.forEach(reqSub => {
                    const userSubScore = userScores.find(s => s.subject_id === reqSub.subject_id);
                    if (userSubScore) {
                        const rawScore = parseFloat(userSubScore.score_value) || 0;
                        const weight = parseFloat(reqSub.weight) || 0;
                        totalScore += (rawScore * weight) / 100;
                    }
                });
                
                return { ...app, calculatedTotalScore: totalScore };
            });

            return res.json(formattedData);

        } else {
            let sqlQuery = `
                SELECT
                    a.id, a.status, a.gpax,
                    u.first_name, u.last_name, u.edu_status, u.current_level, u.plan_id,
                    sp.plan_name, sp.plan_group,
                    ac.tcas_round, ac.program_id, ac.min_gpax, ac.edu_status_req, ac.min_level, ac.max_level,
                    p.prog_name,
                    d.faculty_id,
                    f.faculty_name,
                    (SELECT subject_id, score_value FROM USER_SCORES WHERE user_id = u.id FOR JSON PATH) AS USER_SCORES,
                    (
                        -- 🚨 2. ฝั่ง SQL Server: เพิ่ม cs.weight เข้ามาใน Select
                        SELECT cs.subject_id, cs.min_score, cs.weight,
                               s.subject_name AS 'SUBJECTS.subject_name'
                        FROM CRITERIA_SUBJECTS cs
                        LEFT JOIN SUBJECTS s ON s.id = cs.subject_id
                        WHERE cs.criteria_id = ac.id
                        FOR JSON PATH
                    ) AS CRITERIA_SUBJECTS
                FROM APPLICATION a
                LEFT JOIN USERS u ON a.user_id = u.id
                LEFT JOIN STUDY_PLANS sp ON u.plan_id = sp.id
                INNER JOIN ADMISSION_CRITERIA ac ON a.criteria_id = ac.id
                INNER JOIN PROGRAMS p ON ac.program_id = p.id
                INNER JOIN DEPARTMENTS d ON p.dept_id = d.id
                INNER JOIN FACULTIES f ON d.faculty_id = f.id
                WHERE 1=1
            `;

            if (round) sqlQuery += ` AND ac.tcas_round = ${parseInt(round)}`;
            if (program_id) sqlQuery += ` AND ac.program_id = ${parseInt(program_id)}`;
            if (faculty_id) sqlQuery += ` AND d.faculty_id = ${parseInt(faculty_id)}`;

            const result = await sql.query(sqlQuery);

            const formattedData = result.recordset.map(row => {
                const userScores = row.USER_SCORES ? JSON.parse(row.USER_SCORES) : [];
                const criteriaSubjects = row.CRITERIA_SUBJECTS ? JSON.parse(row.CRITERIA_SUBJECTS) : [];
                
                let totalScore = 0;
                criteriaSubjects.forEach(reqSub => {
                    const userSubScore = userScores.find(s => s.subject_id === reqSub.subject_id);
                    if (userSubScore) {
                        const rawScore = parseFloat(userSubScore.score_value) || 0;
                        const weight = parseFloat(reqSub.weight) || 0;
                        totalScore += (rawScore * weight) / 100;
                    }
                });

                return {
                    id: row.id,
                    status: row.status,
                    gpax: row.gpax,
                    calculatedTotalScore: totalScore, 
                    USERS: {
                        first_name: row.first_name,
                        last_name: row.last_name,
                        edu_status: row.edu_status,
                        current_level: row.current_level,
                        plan_id: row.plan_id,
                        STUDY_PLANS: { plan_name: row.plan_name, plan_group: row.plan_group },
                        USER_SCORES: userScores
                    },
                    ADMISSION_CRITERIA: {
                        tcas_round: row.tcas_round,
                        program_id: row.program_id,
                        min_gpax: row.min_gpax,
                        edu_status_req: row.edu_status_req,
                        min_level: row.min_level,
                        max_level: row.max_level,
                        CRITERIA_SUBJECTS: criteriaSubjects,
                        PROGRAMS: {
                            prog_name: row.prog_name,
                            DEPARTMENTS: {
                                faculty_id: row.faculty_id,
                                FACULTIES: { faculty_name: row.faculty_name }
                            }
                        }
                    }
                };
            });

            return res.json(formattedData);
        }
    } catch (err) {
        console.error("Staff Applicant Fetch Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/staff/applicants/:id', async (req, res) => {
    const useSupabase = isSupabaseRequest(req);
    const { id } = req.params;

    try {
        if (useSupabase) {
            const { data: applicantData, error } = await supabase
                .from('APPLICATION')
                .select(`
                    id, user_id, status, gpax, portfolio_url, transcript_url,
                    USERS ( first_name, last_name, citizen_id, edu_status, current_level, high_school, STUDY_PLANS ( plan_name, plan_group ) ),
                    ADMISSION_CRITERIA (
                        tcas_round,
                        ADMISSION_PROJECTS ( project_name ), 
                        PROGRAMS ( prog_name, DEPARTMENTS ( dept_name, FACULTIES ( faculty_name ) ) ),
                        CRITERIA_SUBJECTS ( subject_id, weight, SUBJECTS ( subject_name ) )
                    )
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            
            let scoreData = [];
            if (applicantData && applicantData.user_id) {
                const { data } = await supabase
                    .from('USER_SCORES')
                    .select('subject_id, score_value, SUBJECTS ( subject_name )')
                    .eq('user_id', applicantData.user_id);
                if (data) scoreData = data;
            }
            
            return res.json({ applicant: applicantData, scores: scoreData });

        } else {
            const appResult = await sql.query`
                SELECT
                    a.id, a.user_id, a.status, a.gpax, a.portfolio_url, a.transcript_url,
                    u.first_name, u.last_name, u.citizen_id, u.edu_status, u.current_level, u.high_school, u.plan_id,
                    sp.plan_name, sp.plan_group,
                    ac.tcas_round,
                    proj.project_name,
                    p.prog_name,
                    d.dept_name,
                    f.faculty_name,
                    (
                        SELECT cs.subject_id, cs.weight,
                               s.subject_name AS 'SUBJECTS.subject_name'
                        FROM CRITERIA_SUBJECTS cs
                        LEFT JOIN SUBJECTS s ON s.id = cs.subject_id
                        WHERE cs.criteria_id = ac.id
                        FOR JSON PATH
                    ) AS CRITERIA_SUBJECTS
                FROM APPLICATION a
                LEFT JOIN USERS u ON a.user_id = u.id
                LEFT JOIN STUDY_PLANS sp ON u.plan_id = sp.id
                LEFT JOIN ADMISSION_CRITERIA ac ON a.criteria_id = ac.id
                LEFT JOIN ADMISSION_PROJECTS proj ON ac.project_id = proj.id
                LEFT JOIN PROGRAMS p ON ac.program_id = p.id
                LEFT JOIN DEPARTMENTS d ON p.dept_id = d.id
                LEFT JOIN FACULTIES f ON d.faculty_id = f.id
                WHERE a.id = ${id}
            `;

            if (appResult.recordset.length === 0) return res.status(404).json({ error: "Applicant not found" });

            const row = appResult.recordset[0];
            const formattedApplicant = {
                id: row.id,
                user_id: row.user_id,
                status: row.status,
                gpax: row.gpax,
                portfolio_url: row.portfolio_url,
                transcript_url: row.transcript_url,
                USERS: {
                    first_name: row.first_name,
                    last_name: row.last_name,
                    citizen_id: row.citizen_id,
                    edu_status: row.edu_status,
                    current_level: row.current_level,
                    high_school: row.high_school,
                    STUDY_PLANS: { plan_name: row.plan_name, plan_group: row.plan_group }
                },
                ADMISSION_CRITERIA: {
                    tcas_round: row.tcas_round,
                    ADMISSION_PROJECTS: { project_name: row.project_name },
                    PROGRAMS: {
                        prog_name: row.prog_name,
                        DEPARTMENTS: {
                            dept_name: row.dept_name,
                            FACULTIES: { faculty_name: row.faculty_name }
                        }
                    },
                    CRITERIA_SUBJECTS: row.CRITERIA_SUBJECTS ? JSON.parse(row.CRITERIA_SUBJECTS) : []
                }
            };

            const scoresResult = await sql.query`
                SELECT us.subject_id, us.score_value, s.subject_name AS 'SUBJECTS.subject_name'
                FROM USER_SCORES us
                LEFT JOIN SUBJECTS s ON us.subject_id = s.id
                WHERE us.user_id = ${row.user_id}
                FOR JSON PATH
            `;
            
            const scores = scoresResult.recordset[0] ? Object.values(scoresResult.recordset[0])[0] : '[]';

            return res.json({ 
                applicant: formattedApplicant, 
                scores: JSON.parse(scores) 
            });
        }
    } catch (err) {
        console.error("Detail Fetch Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/staff/applicants/:id/status', async (req, res) => {
    const useSupabase = isSupabaseRequest(req);
    const { id } = req.params;
    const { status } = req.body;

    try {
        if (useSupabase) {
            const { error } = await supabase.from('APPLICATION').update({ status }).eq('id', id);
            if (error) throw error;
        } else {
            await sql.query`UPDATE APPLICATION SET status = ${status} WHERE id = ${id}`;
        }
        res.json({ message: "Status updated successfully" });
    } catch (err) {
        console.error("Status Update Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});

