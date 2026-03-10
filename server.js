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
const useSupabase = process.env.DB_PROVIDER === 'supabase';

console.log(`🚀 Starting server in ${useSupabase ? 'Supabase' : 'MS SQL'} mode...`);

if (!useSupabase) {
    const connectionString = process.env.MSSQL_CONNECTION_STRING;
    if (!connectionString) {
        console.error("❌ Error: MSSQL_CONNECTION_STRING is missing in .env");
    } else {
        sql.connect(connectionString)
            .then(pool => {
                if (pool.connected) console.log("✅ Successfully connected to Local MS SQL (Docker)");
            })
            .catch(err => {
                console.error("❌ MS SQL Connection Failed:", err.message);
            });
    }
}

// --- API Endpoints ---

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: useSupabase ? 'Supabase' : 'MS SQL' });
});

app.get('/api/applicants', async (req, res) => {
    try {
        if (useSupabase) {
            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
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

// 🌟 Secure Login Example (Handles Hashed Passwords)
app.post('/api/login', async (req, res) => {
    const { citizen_id, password } = req.body;
    try {
        let user;

        if (useSupabase) {
            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
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

// 🌟 Register Endpoint (Hashes password on the backend)
app.post('/api/register', async (req, res) => {
    const { citizen_id, password, first_name, last_name, role } = req.body;
    
    try {
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(password, salt);
        const userRole = role || 'student';

        if (useSupabase) {
            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
            const { data, error } = await supabase.from('USERS').insert([{
                citizen_id, 
                password: hashedPassword, 
                first_name, 
                last_name, 
                role: userRole
            }]);
            
            if (error) {
                if (error.code === '23505') return res.status(409).json({ message: "รหัสบัตรประชาชนนี้ถูกใช้งานแล้ว" });
                throw error;
            }
            return res.status(201).json({ message: "สมัครสมาชิกสำเร็จ" });
            
        } else {
            try {
                await sql.query`
                    INSERT INTO USERS (citizen_id, password, first_name, last_name, role)
                    VALUES (${citizen_id}, ${hashedPassword}, ${first_name}, ${last_name}, ${userRole})
                `;
                return res.status(201).json({ message: "สมัครสมาชิกสำเร็จ" });
            } catch (dbErr) {
                if (dbErr.number === 2627) return res.status(409).json({ message: "รหัสบัตรประชาชนนี้ถูกใช้งานแล้ว" });
                throw dbErr;
            }
        }
    } catch (err) {
        console.error("Register Error:", err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์" });
    }
});

// 🌟 NEW: Create User Endpoint (Used by SuperAdmin to create Staff)
// Note: Frontend already hashes the password before sending it here!
app.post('/api/users', async (req, res) => {
    const { citizen_id, password, first_name, last_name, role } = req.body;
    
    try {
        if (useSupabase) {
            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
            const { error } = await supabase.from('USERS').insert([{
                citizen_id, 
                password, // Already hashed by frontend
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

// 🌟 GET User Profile Data
app.get('/api/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const result = await sql.query`
            SELECT gpax_5_term, current_level, edu_status, plan_id, high_school 
            FROM USERS 
            WHERE id = ${userId}
        `;
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(result.recordset[0]);
    } catch (err) {
        console.error("Profile Fetch Error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// 🌟 PUT (Update) User Profile Data
app.put('/api/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const { high_school, edu_status, current_level, gpax_5_term, plan_id } = req.body;

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
    } catch (err) {
        console.error("Profile Update Error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});