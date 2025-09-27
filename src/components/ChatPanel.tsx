import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseForConversation } from "../lib/supabaseBrowser";

type Msg = { id: string; role: "user" | "assistant"; text: string; at: string };

const QUICK_PROMPTS = [
  "I want a redesign for my website",
  "I need a branding for my project",
  "I need a mobile app UI",
  "I want a logo for my business",
  "I need social media visuals",
];

const COLOR_CLASSES = [
  "bg-rose-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
];

const STORE_KEY = "houdlab_chat_messages_v1";
const CONV_KEY = "houdlab_conversation_id_v1";
const ASSISTANT_NAME = "Yazid from HoudLab";

function fmtTime(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPanel() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showPrompts, setShowPrompts] = useState(true);
  const [typing, setTyping] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const creatingConv = useRef<Promise<string> | null>(null);

  // de-dupe helpers
  const seenIds = useRef<Set<string>>(new Set());
  const tempToDb = useRef<Map<string, string>>(new Map()); // tempId -> dbId
  const lastSeenIso = useRef<string | null>(null);
  const stopPollingRef = useRef(false);

  // per-conversation client (adds x-conversation-id header for RLS)
  const sb = useMemo(
    () => (conversationId ? supabaseForConversation(conversationId) : null),
    [conversationId]
  );

  function appendUnique(
    list: Array<{
      id: string;
      role: "user" | "assistant";
      text: string;
      created_at: string;
    }>
  ) {
    if (!list.length) return;
    const add: Msg[] = [];
    for (const m of list) {
      const id = String(m.id);
      if (seenIds.current.has(id)) continue;
      seenIds.current.add(id);
      add.push({ id, role: m.role, text: m.text, at: fmtTime(m.created_at) });
    }
    if (add.length) {
      setMessages((prev) => [...prev, ...add]);
      lastSeenIso.current = list[list.length - 1].created_at;
      if (list[list.length - 1].role === "assistant") setTyping(false);
    }
  }

  // Load persisted state
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Msg[];
        if (Array.isArray(parsed) && parsed.length) {
          setMessages(parsed);
          setShowPrompts(false);
          parsed.forEach((m) => seenIds.current.add(String(m.id)));
          lastSeenIso.current = null; // history effect will reset properly
        }
      }
    } catch {}
    const conv = localStorage.getItem(CONV_KEY);
    if (conv) setConversationId(conv);
  }, []);

  // Persist messages
  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  useEffect(() => {
    if (window.location.hash === "#chat-section") inputRef.current?.focus();
  }, []);

  // Load full history (MERGE — do NOT overwrite optimistic UI)
  useEffect(() => {
    if (!sb || !conversationId) return;
    (async () => {
      const { data, error } = await sb
        .from("messages")
        .select("id, role, text, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("[ChatPanel] history error:", error.message);
        return;
      }

      const mapped =
        (data || []).map((r: any) => ({
          id: String(r.id),
          role: (r.role === "agent" ? "assistant" : "user") as
            | "user"
            | "assistant",
          text: String(r.text),
          created_at: String(r.created_at),
        })) ?? [];

      appendUnique(mapped); // ✅ merge into existing state (keeps 1st optimistic msg)

      if (mapped.length > 0) setShowPrompts(false);
    })();
  }, [sb, conversationId]);

  // Realtime (best-effort)
  useEffect(() => {
    if (!sb || !conversationId) return;

    const ch = sb
      .channel(`client:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row: any = payload.new;
          const dbId = String(row.id);

          // de-dup (ignore if already reconciled or fetched)
          if (seenIds.current.has(dbId)) return;
          for (const [, v] of tempToDb.current.entries()) {
            if (v === dbId) return;
          }

          const role: "user" | "assistant" =
            row.role === "agent" ? "assistant" : "user";
          seenIds.current.add(dbId);
          setMessages((prev) => [
            ...prev,
            {
              id: dbId,
              role,
              text: String(row.text),
              at: fmtTime(String(row.created_at)),
            },
          ]);
          lastSeenIso.current = String(row.created_at);
          if (role === "assistant") setTyping(false);
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(ch);
    };
  }, [sb, conversationId]);

  // Typing broadcast (from admin → { from: "agent", active })
  useEffect(() => {
    if (!sb || !conversationId) return;

    const typingCh = sb
      .channel(`typing:${conversationId}`, {
        config: { broadcast: { self: false } },
      })
      .on("broadcast", { event: "typing" }, (payload) => {
        const p: any = payload?.payload || {};
        if (p.from !== "agent") return;
        if (p.active) {
          setTyping(true);
          // hide after 4s of silence
          clearTimeout((typingCh as any)._hideTimer);
          (typingCh as any)._hideTimer = setTimeout(
            () => setTyping(false),
            4000
          );
        } else {
          setTyping(false);
        }
      })
      .subscribe();

    return () => {
      sb.removeChannel(typingCh);
    };
  }, [sb, conversationId]);

  // Polling fallback (fills gaps if realtime / replication lags)
  useEffect(() => {
    if (!sb || !conversationId) return;
    stopPollingRef.current = false;

    const tick = async () => {
      if (stopPollingRef.current) return;
      try {
        let q = sb
          .from("messages")
          .select("id, role, text, created_at")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (lastSeenIso.current) {
          q = q.gt("created_at", lastSeenIso.current);
        }

        const { data, error } = await q;
        if (!error && data && data.length) {
          const list = data.map((r: any) => ({
            id: String(r.id),
            role: (r.role === "agent" ? "assistant" : "user") as
              | "user"
              | "assistant",
            text: String(r.text),
            created_at: String(r.created_at),
          }));
          appendUnique(list);
        }
      } catch {
        // ignore
      } finally {
        setTimeout(tick, 1800);
      }
    };

    tick();
    return () => {
      stopPollingRef.current = true;
    };
  }, [sb, conversationId]);

  function handleQuickPrompt(t: string) {
    setInput(t);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  // Create conversation lazily (single-flight)
  async function ensureConversation(): Promise<string> {
    if (conversationId) return conversationId;
    if (!creatingConv.current) {
      creatingConv.current = (async () => {
        const res = await fetch("/api/chat/start", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ origin: window.location.pathname }),
        });
        const data = await res.json();
        if (!res.ok || !data?.conversationId) {
          creatingConv.current = null;
          throw new Error(data?.error || "Failed to start conversation");
        }
        localStorage.setItem(CONV_KEY, data.conversationId);
        setConversationId(data.conversationId);
        return data.conversationId as string;
      })();
    }
    return creatingConv.current;
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (showPrompts) setShowPrompts(false);

    // Ensure conversation exists
    let convId = conversationId;
    try {
      if (!convId) convId = await ensureConversation();
    } catch (e) {
      console.error("ensureConversation failed:", e);
      return;
    }

    // Optimistic user message
    const tempId = crypto.randomUUID();
    const optimistic: Msg = {
      id: tempId,
      role: "user",
      text: trimmed,
      at: fmtTime(),
    };
    setMessages((m) => [...m, optimistic]);
    seenIds.current.add(tempId);
    lastSeenIso.current = new Date().toISOString(); // polling only fetches newer
    setInput("");

    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          conversationId: convId,
          role: "user",
          text: trimmed,
        }),
      });
      const data = await res.json().catch(() => ({} as any));
      const dbMsg = data?.message;
      if (res.ok && dbMsg?.id) {
        const dbId = String(dbMsg.id);
        tempToDb.current.set(tempId, dbId);
        seenIds.current.add(dbId);
        seenIds.current.delete(tempId);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? { ...m, id: dbId, at: fmtTime(String(dbMsg.created_at)) }
              : m
          )
        );
      }
    } catch (err) {
      console.error("[ChatPanel] send failed:", err);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="rounded-3xl bg-[#F0F0F1] p-2 md:p-3">
      {/* Top banner */}
      <div className="rounded-2xl bg-white md:p-5 p-4">
        <h1 className="font-display text-4xl md:text-6xl font-semibold leading-[1.1] tracking-[-0.02em]">
          ESTABLISHING <br />
          <span className="text-amber-400">BRANDS</span> &{" "}
          <span className="text-amber-400">PRODUCTS</span>
        </h1>
        <hr className="md:mt-5 mt-2 border-neutral-200" />

        <div className="md:mt-5 mt-3 flex items-center gap-3">
          <div className="flex -space-x-2">
            <img
              src="/avatars/a1.png"
              className="h-10 w-10 rounded-full border border-white shadow-sm"
              alt=""
            />
            <img
              src="/avatars/a2.jpg"
              className="h-7 w-7 rounded-full border border-white shadow-sm"
              alt=""
            />
            <img
              src="/avatars/a3.jpg"
              className="h-7 w-7 rounded-full border border-white shadow-sm"
              alt=""
            />
            <img
              src="/avatars/a4.jpg"
              className="h-7 w-7 rounded-full border border-white shadow-sm"
              alt=""
            />
          </div>

          <p className="text-xs md:text-sm text-neutral-600">
            Chat with an expert right now,
            <br className="block" /> and get your project scope in minutes.
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className={`mt-4 overflow-y-auto rounded-2xl p-4
    ${
      showPrompts
        ? "min-h-[50vh] md:min-h-[33vh]"
        : "min-h-[62vh] md:min-h-[45vh]"
    }
  `}
      >
        {messages.map((m) => (
          <div key={m.id} className="mb-4">
            {m.role === "assistant" ? (
              <div className="flex items-start gap-3">
                <img
                  src="/avatars/yazid.jpg"
                  alt=""
                  className="h-8 w-8 rounded-full object-cover ring-1 ring-neutral-200"
                />
                <div>
                  <div className="mb-1.5 text-xs font-medium text-neutral-500">
                    {ASSISTANT_NAME}
                  </div>
                  <div className="inline-block max-w-[68ch] rounded-2xl rounded-tl-md bg-white px-4 py-2 shadow-sm ring-1 ring-neutral-200">
                    {m.text}
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">{m.at}</div>
                </div>
              </div>
            ) : (
              <div className="flex flex-row-reverse items-start gap-3">
                <div>
                  <div className="inline-block max-w-[68ch] rounded-2xl rounded-tr-md bg-neutral-900 text-white px-4 py-2 shadow-sm">
                    {m.text}
                  </div>
                  <div className="mt-1 text-right text-xs text-neutral-500">
                    {m.at}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator (from admin broadcast) */}
        {typing && (
          <div className="mb-4 flex items-start gap-3">
            <img
              src="/avatars/yazid.jpg"
              alt=""
              className="h-8 w-8 rounded-full object-cover ring-1 ring-neutral-200"
            />
            <div>
              <div className="mb-1 text-xs font-medium text-neutral-500">
                {ASSISTANT_NAME}
              </div>
              <div className="inline-block rounded-2xl rounded-tl-md bg-white px-4 py-2 shadow-sm ring-1 ring-neutral-200">
                <span className="inline-flex gap-1 align-middle">
                  <span className="animate-pulse">●</span>
                  <span className="animate-pulse [animation-delay:150ms]">
                    ●
                  </span>
                  <span className="animate-pulse [animation-delay:300ms]">
                    ●
                  </span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick prompts */}
      {showPrompts && (
        <div className="mt-3 px-5 pb-2">
          <div className="text-xs text-neutral-500 mb-2">
            Quick chat prompts
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((q, i) => (
              <button
                key={q}
                type="button"
                onClick={() => handleQuickPrompt(q)}
                className="group rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 hover:bg-neutral-50 active:scale-[0.99] transition hover:cursor-pointer"
              >
                <span className="inline-flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      COLOR_CLASSES[i % COLOR_CLASSES.length]
                    }`}
                    aria-hidden="true"
                  />
                  <span>{q}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Composer */}
      <form onSubmit={onSubmit} className="mt-4">
        <div className="relative flex items-center">
          <input
            id="chat-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your project.."
            className="flex-1 rounded-full border border-neutral-300 bg-white px-4 py-3 text-neutral-900 placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-neutral-200"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="absolute right-1 top-1 bottom-1 my-auto grid h-9 w-9 place-items-center rounded-full bg-neutral-900 text-white shadow-sm disabled:opacity-40 mr-1 cursor-pointer"
            aria-label="Send message"
            title="Send"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="h-6 w-6 mr-[1.25px] mt-[1.25px]"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M20.33 3.66996C20.1408 3.48213 19.9035 3.35008 19.6442 3.28833C19.3849 3.22659 19.1135 3.23753 18.86 3.31996L4.23 8.19996C3.95867 8.28593 3.71891 8.45039 3.54099 8.67255C3.36307 8.89471 3.25498 9.16462 3.23037 9.44818C3.20576 9.73174 3.26573 10.0162 3.40271 10.2657C3.5397 10.5152 3.74754 10.7185 4 10.85L10.07 13.85L13.07 19.94C13.1906 20.1783 13.3751 20.3785 13.6029 20.518C13.8307 20.6575 14.0929 20.7309 14.36 20.73H14.46C14.7461 20.7089 15.0192 20.6023 15.2439 20.4239C15.4686 20.2456 15.6345 20.0038 15.72 19.73L20.67 5.13996C20.7584 4.88789 20.7734 4.6159 20.7132 4.35565C20.653 4.09541 20.5201 3.85762 20.33 3.66996ZM4.85 9.57996L17.62 5.31996L10.53 12.41L4.85 9.57996ZM14.43 19.15L11.59 13.47L18.68 6.37996L14.43 19.15Z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
