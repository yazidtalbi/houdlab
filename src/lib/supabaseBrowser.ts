import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.PUBLIC_SUPABASE_URL!;
const anon = import.meta.env.PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !anon) {
  // Helps catch missing envs in Vite/Astro
  // eslint-disable-next-line no-console
  console.error(
    "[supabaseBrowser] Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY"
  );
}

/**
 * Global browser client (no special headers).
 * Used by the ADMIN dashboard (channels, etc).
 */
export const supabaseBrowser = createClient(url, anon, {
  auth: { persistSession: false },
});

/**
 * Per-conversation client that passes the conversation header
 * required by your RLS policy for the PUBLIC chat.
 *
 * Add (or ensure) this policy exists in Supabase:
 *
 *   create policy "read messages by conv header"
 *   on public.messages for select
 *   to anon
 *   using ( request.header('x-conversation-id')::uuid = conversation_id );
 *
 * And keep:  alter table public.messages replica identity full;
 */
export function supabaseForConversation(conversationId: string) {
  return createClient(url, anon, {
    global: { headers: { "x-conversation-id": conversationId } },
    auth: { persistSession: false },
  });
}
