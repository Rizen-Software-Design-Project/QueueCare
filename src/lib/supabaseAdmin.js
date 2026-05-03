import { createClient } from "@supabase/supabase-js";

const url = process.env.SB_URL;
const key = process.env.SB_KEY;

export const supabase = createClient(url, key);