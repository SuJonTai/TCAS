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

const upload = multer({ dest: 'uploads/' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });
console.log("DEBUG: SUPABASE_URL from env:", process.env.SUPABASE_URL);
console.log("DEBUG: VITE_SUPABASE_URL from env:", process.env.VITE_SUPABASE_URL);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

// ==========================================
// 1. INITIALIZE DATABASE CONNECTIONS
// ==========================================

// --- Supabase Setup ---
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_KEY;

let supabase = null;

if (!supabaseUrl || !supabaseKey) {
    console.error("⚠️ Warning: Missing Supabase Configuration");
    if(!supabaseUrl) console.error("- Missing: SUPABASE_URL");
    if(!supabaseKey) console.error("- Missing: SUPABASE_KEY (Anon Key)");
} else {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log("✅ Successfully initialized Supabase client");
}

// --- MS SQL Setup ---
const connectionString = process.env.MSSQL_CONNECTION_STRING;
if (!connectionString) {
    console.error("⚠️ Warning: MSSQL_CONNECTION_STRING is missing in .env.local");
} else {
    sql.connect(connectionString)
        .then(pool => {
            if (pool.connected) console.log("✅ Successfully connected to Local MS SQL");
        })
        .catch(err => {
            console.error("❌ MS SQL Connection Failed:", err.message);
        });
}

console.log(`🚀 Server starting... Ready to handle requests.`);

// ==========================================
// 2. HELPER FUNCTION: DETECT DB TYPE
// ==========================================
const isSupabaseRequest = (req) => {
    return req.headers['x-db-type'] === 'supabase';
};

// ==========================================
// 3. API ENDPOINTS
// ==========================================

app.get('/api/health', (req, res) => {
    const useSupabase = isSupabaseRequest(req);
    res.json({ status: 'ok', database: useSupabase ? 'Supabase' : 'MS SQL' });
});

// --- Fetch Faculties ---
app.get('/api/faculties', async (req, res) => {
    const useSupabase = isSupabaseRequest(req);
    try {
        if (useSupabase) {
            const { data, error } = await supabase
                .from('FACULTIES')
                .select('*, DEPARTMENTS(*, PROGRAMS(*))');
            if (error) throw error;
            return res.json(data);
        } else {
            // Adjust SQL query if you need to JOIN Departments and Programs
            const result = await sql.query`
                SELECT 
                    f.id, 
                    f.faculty_name,
                    (
                        SELECT d.id, d.dept_name, d.faculty_id
                        FROM DEPARTMENTS d
                        WHERE d.faculty_id = f.id
                        FOR JSON PATH
                    ) AS DEPARTMENTS
                FROM FACULTIES f
            `;
            const data = result.recordset.map(row => ({
                ...row,
                DEPARTMENTS: row.DEPARTMENTS ? JSON.parse(row.DEPARTMENTS) : []
            }));

            res.json(data);
        }
    } catch (err) {
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
    let transcriptUrl = '/local-files/transcript.pdf';
    let portfolioUrl = req.files['portfolio'] ? '/local-files/portfolio.pdf' : null;

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

// --- เพิ่มภาควิชาใหม่ (แก้ปัญหา 404 ของคุณ) ---
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

// --- เพิ่มสาขาวิชาใหม่ ---
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

// --- เพิ่มโครงการรับเข้าใหม่ ---
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

// --- ดึงเกณฑ์การรับสมัครทั้งหมด (พ่วงข้อมูลที่เกี่ยวข้อง) ---
app.get('/api/admissions', async (req, res) => {
    try {
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
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ดึงข้อมูลวิชาและแผนการเรียน ---
app.get('/api/subjects', async (req, res) => {
    try {
        const result = await sql.query`SELECT * FROM SUBJECTS`;
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/study-plans', async (req, res) => {
    try {
        const result = await sql.query`SELECT * FROM STUDY_PLANS`;
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});

