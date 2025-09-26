// src/lib/supabaseBrowser.ts
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.PUBLIC_SUPABASE_URL!;
const anon = import.meta.env.PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseBrowser = createClient(url, anon, {
  auth: { persistSession: false },
});
