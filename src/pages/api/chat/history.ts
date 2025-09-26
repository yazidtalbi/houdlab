export const prerender = false;

import type { APIContext } from "astro";
import { supabase } from "../../../lib/supabaseServer";

// simple UUID check (keeps logs cleaner)
const UUID_RE = /^[0-9a-fA-F-]{36}$/;

export async function GET(ctx: APIContext) {
  try {
    const url = new URL(ctx.request.url);
    const conversationId = url.searchParams.get("conversationId") || "";
    const since = url.searchParams.get("since"); // optional ISO

    if (!UUID_RE.test(conversationId)) {
      return json({ error: "Invalid conversationId" }, 400);
    }

    // ✅ Admin gate: this route is for the admin panel only
    const adminCookie = ctx.cookies.get("houdlab_admin")?.value;
    const expected = import.meta.env.ADMIN_PASSWORD;
    if (!expected) {
      return json({ error: "ADMIN_PASSWORD not configured" }, 500);
    }
    if (adminCookie !== expected) {
      return json({ error: "Forbidden" }, 403);
    }

    // ✅ Use SERVICE ROLE on the server – bypasses RLS safely
    let query = supabase
      .from("messages")
      .select("id, role, text, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (since) {
      query = query.gt("created_at", since);
    }

    const { data, error } = await query;
    if (error) return json({ error: error.message }, 500);

    return json({ messages: data ?? [] });
  } catch (e: any) {
    return json({ error: e?.message || "Server error" }, 500);
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
