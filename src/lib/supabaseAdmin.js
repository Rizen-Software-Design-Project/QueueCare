import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  // eslint-disable-next-line no-undef
  process.env.SB_URL,
  // eslint-disable-next-line no-undef
  process.env.SB_KEY  // secret service role key — never expose to frontend
);