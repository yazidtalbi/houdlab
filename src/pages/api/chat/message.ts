// src/pages/api/chat/message.ts
export const prerender = false;

import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabaseServer";

type Body = {
  conversationId: string;
  role: "user" | "agent";
  text: string;
  agent_id?: string;
};

function bad(status: number, msg: string) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as Body;
    if (!body?.conversationId || !body?.role || !body?.text) {
      return bad(400, "Missing required fields");
    }

    const text = String(body.text).trim().slice(0, 2000);
    if (!text) return bad(400, "Empty message");

    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "";
    const ua = request.headers.get("user-agent") || "";

    const { data: msg, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: body.conversationId,
        role: body.role,
        text,
        ip,
        user_agent: ua,
        agent_id: body.agent_id || null,
      })
      .select("id, conversation_id, created_at, role, text, agent_id")
      .single();

    if (error) throw error;

    // --- Optional: Slack notification for new USER messages ---
    if (body.role === "user" && process.env.SLACK_WEBHOOK_URL) {
      try {
        await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            text: `💬 New user message in conversation ${body.conversationId}\n\n${text}`,
          }),
        });
      } catch (e) {
        console.error("[Slack webhook failed]", e);
      }
    }

    return new Response(JSON.stringify({ message: msg }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return bad(500, e.message || "Server error");
  }
};
