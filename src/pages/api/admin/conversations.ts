export const prerender = false;

import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabaseServer";

function json(status: number, data: any) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const q = url.searchParams.get("q")?.trim();

    const { data: convs, error } = await supabase
      .from("conversations")
      .select("id, created_at, origin, user_agent, ip")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;
    if (!convs?.length) return json(200, { conversations: [] });

    const ids = convs.map((c: any) => c.id);
    const { data: msgs, error: mErr } = await supabase
      .from("messages")
      .select("conversation_id, created_at, role, text")
      .in("conversation_id", ids)
      .order("created_at", { ascending: false });

    if (mErr) throw mErr;

    const lastByConv: Record<
      string,
      { text: string; created_at: string; role: string }
    > = {};
    for (const m of (msgs ?? []) as any[]) {
      if (!lastByConv[m.conversation_id]) {
        lastByConv[m.conversation_id] = {
          text: m.text,
          created_at: m.created_at,
          role: m.role,
        };
      }
    }

    let items = convs.map((c: any) => ({
      id: c.id,
      created_at: c.created_at,
      origin: c.origin,
      ip: c.ip,
      user_agent: c.user_agent,
      last: lastByConv[c.id] || null,
    }));

    if (q) {
      const needle = q.toLowerCase();
      items = items.filter(
        (x) =>
          x.id.toLowerCase().includes(needle) ||
          (x.origin || "").toLowerCase().includes(needle) ||
          (x.ip || "").toLowerCase().includes(needle) ||
          (x.user_agent || "").toLowerCase().includes(needle) ||
          (x.last?.text || "").toLowerCase().includes(needle)
      );
    }

    return json(200, { conversations: items });
  } catch (e: any) {
    return json(500, { error: e?.message || "Server error" });
  }
};
