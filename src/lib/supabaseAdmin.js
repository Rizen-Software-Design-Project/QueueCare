import { createClient } from "@supabase/supabase-js";

const url = process.env.SB_URL;
const key = process.env.SB_KEY;

if (!url || !key) {
  throw new Error(`Missing Supabase env vars — SB_URL: ${!!url}, SB_KEY: ${!!key}`);
}

export const supabase = createClient(url, key);