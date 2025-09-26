export const prerender = false;

import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabaseServer";
import { notifySlack, slackBlocks } from "../../../lib/notifySlack";

export const POST: APIRoute = async ({ request }) => {
  try {
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-real-ip") ||
      "";
    const ua = request.headers.get("user-agent") || "";

    const { origin } = await request.json().catch(() => ({ origin: null }));

    // create conversation (you already had this — keep your existing fields)
    const { data, error } = await supabase
      .from("conversations")
      .insert({ origin, ip, user_agent: ua })
      .select("id, created_at")
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

    // 🔔 Slack (non-blocking)
    notifySlack(
      slackBlocks("🆕 New conversation started", {
        Conversation: data.id,
        Origin: origin || undefined,
        IP: ip || undefined,
        "User-Agent": ua || undefined,
        At: data.created_at,
      })
    );

    return new Response(JSON.stringify({ conversationId: data.id }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};
