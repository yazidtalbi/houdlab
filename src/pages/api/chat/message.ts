export const prerender = false;

import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabaseServer";
import { notifySlack, slackBlocks } from "../../../lib/notifySlack";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { conversationId, role, text, agent_id } = await request.json();

    if (!conversationId || !role || !text) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    // ✅ Insert into Supabase
    const row: any = {
      conversation_id: conversationId,
      role, // "user" | "agent"
      text,
      agent_id: role === "agent" ? agent_id ?? null : null,
    };

    const { data, error } = await supabase
      .from("messages")
      .insert(row)
      .select("id, conversation_id, role, text, created_at")
      .single();

    if (error || !data) {
      return new Response(
        JSON.stringify({ error: error?.message || "insert failed" }),
        {
          status: 500,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // ✅ Slack only for USER messages
    if (role === "user") {
      const preview = text.length > 240 ? text.slice(0, 240) + "…" : text;
      notifySlack(
        slackBlocks("💬 New user message", {
          Conversation: conversationId,
          Preview: preview,
          At: data.created_at,
        })
      );
    }

    return new Response(JSON.stringify({ message: data }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    console.error("[/api/chat/message] error", e);
    return new Response(JSON.stringify({ error: e?.message || "error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};
