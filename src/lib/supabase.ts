import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jqfwqoubxwtqhhwvigki.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_GZhI290R0hVKnCH4PTMyJw_C0CJ9RbU";

export const supabase = createClient(supabaseUrl, supabaseKey);
