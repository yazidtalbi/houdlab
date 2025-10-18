export const prerender = false;

import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabaseServer";

export const GET: APIRoute = async () => {
  const { data, error } = await supabase
    .from("agents")
    .select("id, name, avatar_url")
    .order("name");

  if (error) {
    console.error("[/api/admin/agents]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ agents: data ?? [] }, { status: 200 });
};
