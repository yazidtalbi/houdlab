// src/pages/api/chat/start.ts
export const prerender = false;
import type { APIContext } from "astro";
import { supabase } from "../../../lib/supabaseServer";

export async function POST({ request }: APIContext) {
  const { origin } = await request.json().catch(() => ({ origin: "" }));
  const ip =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("cf-connecting-ip") ||
    "";
  const ua = request.headers.get("user-agent") || "";

  const { data, error } = await supabase
    .from("conversations")
    .insert({ origin, ip, user_agent: ua }) // add any fields you track
    .select("id")
    .single();

  if (error || !data)
    return new Response(
      JSON.stringify({ error: error?.message || "insert failed" }),
      { status: 500 }
    );

  // 🔔 Slack ping
  const webhook = import.meta.env.SLACK_WEBHOOK_URL;
  if (webhook) {
    const url = `${import.meta.env.SITE_ORIGIN || ""}/admin?c=${data.id}`;
    const text = `🆕 New conversation started\n• id: *${data.id}*\n• origin: ${
      origin || "/"
    }\n${url}`;
    fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    }).catch(() => {});
  }

  return new Response(JSON.stringify({ conversationId: data.id }), {
    headers: { "content-type": "application/json" },
  });
}
