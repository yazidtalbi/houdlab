type Json = Record<string, unknown>;

export function json(
  status: number,
  body: Json,
  headers: Record<string, string> = {}
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

export function assertCors(req: Request) {
  const allowed = import.meta.env.SITE_ORIGIN;
  if (!allowed) return;
  const origin = req.headers.get("origin") || "";
  const referer = req.headers.get("referer") || "";
  const ok = origin.startsWith(allowed) || referer.startsWith(allowed);
  if (!ok) throw Object.assign(new Error("Forbidden"), { status: 403 });
}

export function getIp(req: Request): string | undefined {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
}

export function clampMessage(text: string) {
  const t = (text ?? "").trim();
  if (!t) throw Object.assign(new Error("Empty message"), { status: 400 });
  if (t.length > 4000)
    throw Object.assign(new Error("Message too long"), { status: 413 });
  return t;
}

// Slack webhook (optional)
export async function notifySlack(payload: {
  conversationId: string;
  text: string;
  ip?: string;
}) {
  const url = import.meta.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text: `💬 New message\n• conv: ${payload.conversationId}\n• ip: ${
        payload.ip ?? "unknown"
      }\n\n${payload.text}`,
    }),
  });
  if (!res.ok) console.error("[Slack] failed", await res.text());
}

// simple per-conversation rate limit
export async function enforceRateLimit(params: {
  supabase: any;
  conversationId: string;
  windowSeconds: number;
  max: number;
}) {
  const since = new Date(
    Date.now() - params.windowSeconds * 1000
  ).toISOString();
  const { count, error } = await params.supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("conversation_id", params.conversationId)
    .eq("role", "user")
    .gte("created_at", since);
  if (error)
    throw Object.assign(new Error("Rate check failed"), { status: 500 });
  if ((count ?? 0) >= params.max)
    throw Object.assign(new Error("Too many messages"), { status: 429 });
}
