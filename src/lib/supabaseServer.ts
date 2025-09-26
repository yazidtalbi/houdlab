// src/lib/supabaseServer.ts
import { createClient } from "@supabase/supabase-js";

function must(name: string, v?: string) {
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const url = process.env.SUPABASE_URL ?? import.meta.env.SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE ?? import.meta.env.SUPABASE_SERVICE_ROLE;

export const supabase = createClient(
  must("SUPABASE_URL", url),
  must("SUPABASE_SERVICE_ROLE", serviceKey),
  { auth: { persistSession: false, autoRefreshToken: false } }
);
