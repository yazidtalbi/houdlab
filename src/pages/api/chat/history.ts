export const prerender = false;

import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabaseServer";
import { json, assertCors } from "../../../lib/utils";

/**
 * GET /api/chat/history?conversationId=UUID&since=ISO(optional)
 * Returns messages for a conversation (newest last).
 * Maps DB role "agent" -> UI role "assistant".
 */
export const GET: APIRoute = async ({ request, url }) => {
  try {
    assertCors(request);

    const conversationId = url.searchParams.get("conversationId");
    if (!conversationId) return json(400, { error: "Missing conversationId" });

    const since = url.searchParams.get("since"); // optional ISO timestamp

    let q = supabase
      .from("messages")
      .select("id, conversation_id, created_at, role, text")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (since) q = q.gte("created_at", since);

    const { data, error } = await q;
    if (error) throw error;

    const items = (data || []).map((m: any) => ({
      id: String(m.id),
      role: m.role === "agent" ? "assistant" : m.role,
      text: m.text,
      created_at: m.created_at as string,
    }));

    return json(200, { messages: items });
  } catch (err: any) {
    return json(err.status || 500, { error: err.message || "Server error" });
  }
};
