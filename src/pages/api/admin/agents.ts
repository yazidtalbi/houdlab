export const prerender = false;

import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabaseServer";
import { json } from "../../../lib/utils";

/** GET /api/admin/agents */
export const GET: APIRoute = async () => {
  const { data, error } = await supabase
    .from("agents")
    .select("id, name, avatar_url")
    .order("name");
  if (error) return json(500, { error: error.message });
  return json(200, { agents: data ?? [] });
};
