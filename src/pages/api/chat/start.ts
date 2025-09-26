export const prerender = false;

import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabaseServer";
import { json, assertCors, getIp } from "../../../lib/utils";

export const POST: APIRoute = async ({ request }) => {
  try {
    assertCors(request);
    const ip = getIp(request);
    const ua = request.headers.get("user-agent") || undefined;
    const { origin } = await request.json().catch(() => ({} as any));

    const { data, error } = await supabase
      .from("conversations")
      .insert({ origin, ip, user_agent: ua })
      .select("id")
      .single();

    if (error) throw error;
    return json(200, { conversationId: data.id });
  } catch (err: any) {
    return json(err.status || 500, { error: err.message || "Server error" });
  }
};
