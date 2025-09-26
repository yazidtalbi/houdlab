import { createClient } from "@supabase/supabase-js";

// IMPORTANT: must be PUBLIC_ so they’re available in the browser
const URL = import.meta.env.PUBLIC_SUPABASE_URL!;
const ANON = import.meta.env.PUBLIC_SUPABASE_ANON_KEY!;

// Global anon client (used by Admin or anything that doesn't need RLS headers)
export const supabaseBrowser = createClient(URL, ANON, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { params: { eventsPerSecond: 5 } },
});

// Per-conversation client (adds RLS header so messages SELECT/subscribe works)
export function supabaseForConversation(conversationId: string) {
  return createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-conversation-id": conversationId } },
    realtime: { params: { eventsPerSecond: 5 } },
  });
}
