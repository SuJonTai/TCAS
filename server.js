import express from 'express';
import cors from 'cors';
import sql from 'mssql';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

// ==========================================
// 1. INITIALIZE DATABASE CONNECTIONS
// ==========================================

// --- Supabase Setup ---
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;

if (!supabaseUrl || !supabaseKey) {
    console.error("⚠️ Warning: Missing Supabase URL or Key in .env.local. Supabase endpoints will fail.");
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
            const result = await sql.query`SELECT * FROM FACULTIES`;
            return res.json(result.recordset);
        }
    } catch (err) {
        console.error("Faculties Fetch Error:", err.message);
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
        if (useSupabase) {
            const { error } = await supabase.from('USERS').insert([{
                citizen_id, password, first_name, last_name, role: role || 'staff'
            }]);

            if (error) {
                if (error.code === '23505') return res.status(409).json({ message: "รหัสบัตรประชาชนนี้ถูกใช้งานแล้ว" });
                throw error;
            }
            return res.status(201).json({ message: "สร้างบัญชีสำเร็จ" });
        } else {
            try {
                await sql.query`
                    INSERT INTO USERS (citizen_id, password, first_name, last_name, role)
                    VALUES (${citizen_id}, ${password}, ${first_name}, ${last_name}, ${role || 'staff'})
                `;
                return res.status(201).json({ message: "สร้างบัญชีสำเร็จ" });
            } catch (dbErr) {
                if (dbErr.number === 2627) return res.status(409).json({ message: "รหัสบัตรประชาชนนี้ถูกใช้งานแล้ว" });
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

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});

