import { supabase } from "./supabase.js"

async function test() {
    const { data, error } = await supabase.from("USER").select("*").limit(1);

    if (error) {
        console.error(error)
    } else {
        console.log(data)
    }
}

test()