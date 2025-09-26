import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "../lib/supabaseBrowser";

type Msg = { id: string; role: "user" | "assistant"; text: string; at: string };

const QUICK_PROMPTS = [
  "I want a redesign for my website",
  "I need a branding for my project",
  "I need a mobile app UI",
  "I want a logo for my business",
  "I need social media visuals",
];

const STORE_KEY = "houdlab_chat_messages_v1";
const CONV_KEY = "houdlab_conversation_id_v1";
const ASSISTANT_NAME = "Yazid from HoudLab";

function timeNow() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function toTime(iso: string | null | undefined) {
  if (!iso) return timeNow();
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPanel() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showPrompts, setShowPrompts] = useState(true);
  const [peerTyping, setPeerTyping] = useState(false); // ← agent typing

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const seenIds = useRef<Set<string>>(new Set());
  const lastSeenIso = useRef<string | null>(null);

  // typing channel refs
  const typingChanRef = useRef<ReturnType<
    typeof supabaseBrowser.channel
  > | null>(null);
  const typingExpireTimer = useRef<number | null>(null);
  const lastTypingSentAt = useRef<number>(0);

  function appendUnique(
    list: Array<{
      id: string;
      role: "user" | "assistant";
      text: string;
      created_at?: string;
    }>
  ) {
    const add: Msg[] = [];
    for (const m of list) {
      const id = String(m.id);
      if (seenIds.current.has(id)) continue;
      seenIds.current.add(id);
      add.push({ id, role: m.role, text: m.text, at: toTime(m.created_at) });
    }
    if (add.length) setMessages((prev) => [...prev, ...add]);
  }

  // Load persisted + start conversation if needed
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Msg[];
        if (Array.isArray(parsed)) {
          setMessages(parsed);
          parsed.forEach((m) => seenIds.current.add(String(m.id)));
          if (parsed.length > 0) setShowPrompts(false);
        }
      }
      const conv = localStorage.getItem(CONV_KEY);
      if (conv) setConversationId(conv);
      else {
        fetch("/api/chat/start", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ origin: window.location.pathname }),
        })
          .then((r) => r.json())
          .then((res) => {
            if (res?.conversationId) {
              localStorage.setItem(CONV_KEY, res.conversationId);
              setConversationId(res.conversationId);
            }
          })
          .catch((e) => console.error("chat/start", e));
      }
    } catch {}
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
  }, [messages, peerTyping]);

  useEffect(() => {
    if (window.location.hash === "#chat-section") inputRef.current?.focus();
  }, []);

  // History + Realtime + Polling + Typing channel
  useEffect(() => {
    if (!conversationId) return;
    let stop = false;

    // initial sync
    (async () => {
      try {
        const res = await fetch(
          `/api/chat/history?conversationId=${encodeURIComponent(
            conversationId
          )}`
        );
        if (res.ok) {
          const data = await res.json();
          const list: any[] = data?.messages || [];
          if (list.length) {
            lastSeenIso.current = list[list.length - 1].created_at;
            appendUnique(
              list.map((m) => ({
                id: String(m.id),
                role: m.role as "user" | "assistant",
                text: m.text as string,
                created_at: m.created_at as string,
              }))
            );
          }
        }
      } catch {}
    })();

    // realtime messages
    const ch = supabaseBrowser
      .channel(`messages:${conversationId}`)
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
          if (row.role === "user") return;
          const id = String(row.id);
          if (seenIds.current.has(id)) return;
          seenIds.current.add(id);
          setMessages((prev) => [
            ...prev,
            {
              id,
              role: "assistant",
              text: row.text as string,
              at: toTime(row.created_at),
            },
          ]);
          lastSeenIso.current = row.created_at as string;
          // clear typing when an agent message arrives
          setPeerTyping(false);
        }
      )
      .subscribe();

    // typing channel (broadcast, ephemeral)
    const typingChan = supabaseBrowser.channel(`typing:${conversationId}`, {
      config: { broadcast: { self: false } },
    });
    typingChan
      .on("broadcast", { event: "typing" }, (payload) => {
        const p: any = payload.payload || {};
        if (p.from === "agent") {
          setPeerTyping(!!p.active);
          if (typingExpireTimer.current)
            window.clearTimeout(typingExpireTimer.current);
          typingExpireTimer.current = window.setTimeout(
            () => setPeerTyping(false),
            2500
          );
        }
      })
      .subscribe();
    typingChanRef.current = typingChan;

    // polling fallback
    const poll = async () => {
      if (stop) return;
      try {
        const since = lastSeenIso.current
          ? `&since=${encodeURIComponent(lastSeenIso.current)}`
          : "";
        const res = await fetch(
          `/api/chat/history?conversationId=${encodeURIComponent(
            conversationId
          )}${since}`
        );
        const data = await res.json();
        const list: any[] = data?.messages || [];
        if (list.length) {
          lastSeenIso.current = list[list.length - 1].created_at;
          appendUnique(
            list.map((m) => ({
              id: String(m.id),
              role: m.role as "user" | "assistant",
              text: String(m.text),
              created_at: String(m.created_at),
            }))
          );
        }
      } catch {}
      setTimeout(poll, 3000);
    };
    poll();

    return () => {
      stop = true;
      supabaseBrowser.removeChannel(ch);
      if (typingChanRef.current)
        supabaseBrowser.removeChannel(typingChanRef.current);
      if (typingExpireTimer.current)
        window.clearTimeout(typingExpireTimer.current);
    };
  }, [conversationId]);

  function handleQuickPrompt(t: string) {
    setInput(t);
    requestAnimationFrame(() => inputRef.current?.focus());
    emitTyping(true);
  }

  // ---- typing emitter (user) ----
  function emitTyping(active: boolean) {
    if (!typingChanRef.current) return;
    const now = Date.now();
    // throttle to ~1 event / 800ms
    if (active && now - lastTypingSentAt.current < 800) return;
    lastTypingSentAt.current = now;
    typingChanRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { from: "user", active },
    });
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || !conversationId) return;

    if (showPrompts) setShowPrompts(false);

    // optimistic user bubble with temp id
    const tempId = crypto.randomUUID();
    seenIds.current.add(tempId);
    setMessages((m) => [
      ...m,
      { id: tempId, role: "user", text: trimmed, at: timeNow() },
    ]);
    setInput("");
    emitTyping(false);

    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId, role: "user", text: trimmed }),
      });
      const data = await res.json().catch(() => null);
      const saved = data?.message;
      if (saved?.id) {
        const dbId = String(saved.id);
        seenIds.current.add(dbId);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? { ...m, id: dbId, at: toTime(saved.created_at) }
              : m
          )
        );
        seenIds.current.delete(tempId);
      }
    } catch (err) {
      console.error("[send] failed", err);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="rounded-3xl bg-[#F0F0F1] p-2 md:p-3">
      {/* Top banner */}
      <div className="rounded-2xl bg-white p-5">
        <h1 className="font-display text-4xl md:text-6xl font-semibold leading-[1.1] tracking-[-0.02em]">
          ESTABLISHING <br />
          <span className="text-amber-400">BRANDS</span> &{" "}
          <span className="text-amber-400">PRODUCTS</span>
        </h1>
        <hr className="mt-5 border-neutral-200" />
        <div className="mt-4 flex items-center gap-3">
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
          <p className="text-sm text-neutral-600">
            Chat with an expert right now,
            <br className="hidden sm:block" /> and get your project scope in
            minutes.
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="mt-4 h-[340px] md:h-[400px] overflow-y-auto rounded-2xl p-4"
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

        {/* Live typing indicator from AGENT */}
        {peerTyping && (
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
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleQuickPrompt(q)}
                className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 hover:bg-neutral-50 active:scale-[0.99] transition"
              >
                {q}
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
            onChange={(e) => {
              setInput(e.target.value);
              emitTyping(!!e.target.value.trim());
            }}
            onBlur={() => emitTyping(false)}
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
            >
              <path d="M20.33 3.67c-.19-.19-.43-.32-.69-.38a1.3 1.3 0 0 0-.78.03L4.23 8.2a1.32 1.32 0 0 0-.69.47c-.18.22-.29.49-.31.78a1.3 1.3 0 0 0 .13.81c.13.25.34.45.58.57l6.08 3 3 6.09c.12.24.31.44.54.57.23.13.5.2.77.2h.1c.29-.02.57-.13.8-.31.23-.18.39-.43.48-.71l4.95-14.59c.09-.25.1-.52.04-.78a1.3 1.3 0 0 0-.38-.69ZM4.85 9.58l12.77-4.26-7.09 7.09-5.68-2.83Zm9.58 9.57-2.84-5.68 7.09-7.09-4.25 12.77Z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
