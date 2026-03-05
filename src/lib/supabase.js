import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env?.VITE_SUPABASE_KEY || process.env.VITE_SUPABASE_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)