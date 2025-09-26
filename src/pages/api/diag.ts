// src/pages/api/diag.ts
export const prerender = false;
export async function GET() {
  const body = {
    runtime: process.version,
    has: {
      PUBLIC_SUPABASE_URL: !!import.meta.env.PUBLIC_SUPABASE_URL,
      PUBLIC_SUPABASE_ANON_KEY: !!import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_URL:
        !!process.env.SUPABASE_URL || !!import.meta.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE:
        !!process.env.SUPABASE_SERVICE_ROLE ||
        !!import.meta.env.SUPABASE_SERVICE_ROLE,
      ADMIN_PASSWORD: !!import.meta.env.ADMIN_PASSWORD,
    },
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: { "content-type": "application/json" },
  });
}
