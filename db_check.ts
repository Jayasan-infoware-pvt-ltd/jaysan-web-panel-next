import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from("repairs").select("*").limit(1);
  if (data) {
    console.log("COLUMNS:", Object.keys(data[0] || {}).join(", "));
  } else {
    console.error(error);
  }
}
check();
