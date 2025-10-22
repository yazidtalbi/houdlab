import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

type Status = "available" | "unavailable";

export const POST: APIRoute = async ({ request }) => {
  // Read env safely in Astro server code
  const SUPABASE_URL =
    import.meta.env.PUBLIC_SUPABASE_URL ?? process.env.PUBLIC_SUPABASE_URL;
  const SERVICE_ROLE =
    import.meta.env.SUPABASE_SERVICE_ROLE ?? process.env.SUPABASE_SERVICE_ROLE;

  // Fail fast if misconfigured
  if (!SUPABASE_URL) {
    return new Response(
      JSON.stringify({ ok: false, error: "PUBLIC_SUPABASE_URL is missing" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
  if (!SERVICE_ROLE) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "SUPABASE_SERVICE_ROLE is missing",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body = (await request.json()) as
      | { org_slug: string; status: Status }
      | { is_available: boolean };

    const status: Status =
      "status" in body
        ? body.status === "available"
          ? "available"
          : "unavailable"
        : body.is_available
        ? "available"
        : "unavailable";

    const orgSlug = "org_slug" in body ? body.org_slug?.trim() : undefined;

    const db = createClient(SUPABASE_URL, SERVICE_ROLE);

    const payload = orgSlug
      ? { org_slug: orgSlug, status, updated_at: new Date().toISOString() }
      : { id: 1, status, updated_at: new Date().toISOString() }; // adapt if your schema uses is_available boolean

    const { error } = await db
      .from("availability_status")
      .upsert(payload, { onConflict: orgSlug ? "org_slug" : "id" });

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ok: false, error: e?.message || String(e) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
