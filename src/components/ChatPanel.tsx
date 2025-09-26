// src/components/ChatPanel.tsx
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

export default function ChatPanel() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showPrompts, setShowPrompts] = useState(true);
  const [typing, setTyping] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const creatingConv = useRef<Promise<string> | null>(null);

  // Load persisted messages & existing convId (but DO NOT create one yet)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Msg[];
        if (Array.isArray(parsed)) {
          setMessages(parsed);
          if (parsed.length > 0) setShowPrompts(false);
        }
      }
    } catch {}
    const conv = localStorage.getItem(CONV_KEY);
    if (conv) setConversationId(conv);
  }, []);

  // Save messages
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
    if (window.location.hash === "#chat-section") {
      inputRef.current?.focus();
    }
  }, []);

  // Subscribe to realtime once we actually have a conversation
  useEffect(() => {
    if (!conversationId) return;

    const ch = supabaseBrowser
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
          const role: "user" | "assistant" =
            row.role === "agent" ? "assistant" : "user";
          setMessages((prev) => [
            ...prev,
            { id: String(row.id), role, text: String(row.text), at: timeNow() },
          ]);
          if (role === "assistant") setTyping(false);
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(ch);
    };
  }, [conversationId]);

  function handleQuickPrompt(t: string) {
    setInput(t);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  // Create conversation lazily (only once)
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

    // create conv just-in-time if needed
    let convId = conversationId;
    try {
      if (!convId) convId = await ensureConversation();
    } catch (e) {
      console.error("ensureConversation failed:", e);
      return;
    }

    const userMsg: Msg = {
      id: crypto.randomUUID(),
      role: "user",
      text: trimmed,
      at: timeNow(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");

    try {
      await fetch("/api/chat/message", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          conversationId: convId,
          role: "user",
          text: trimmed,
        }),
      });
    } catch (err) {
      console.error("[ChatPanel] send failed:", err);
    }

    // Optional UX: show typing dots until agent replies
    setTyping(true);
    window.setTimeout(() => setTyping(false), 2000);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="rounded-3xl bg-[#F0F0F1] p-2 md:p-3">
      {/* Top banner (unchanged)… */}
      <div className="rounded-2xl bg-white p-5">
        <h1 className="font-display text-4xl md:text-6xl font-semibold leading-[1.1] tracking-[-0.02em]">
          ESTABLISHING <br />
          <span className="text-amber-400">BRANDS</span> &{" "}
          <span className="text-amber-400">PRODUCTS</span>
        </h1>
        <hr className="mt-5 border-neutral-200" />
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
                    Yazid from HoudLab
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

        {typing && (
          <div className="mb-4 flex items-start gap-3">
            <img
              src="/avatars/yazid.jpg"
              alt=""
              className="h-8 w-8 rounded-full object-cover ring-1 ring-neutral-200"
            />
            <div>
              <div className="mb-1 text-xs font-medium text-neutral-500">
                Yazid from HoudLab
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

      {/* Composer */}
      <form onSubmit={onSubmit} className="mt-4">
        <div className="relative flex items-center">
          <input
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
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
