import { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { supabaseForConversation } from "../lib/supabaseBrowser";
import AgentAvailabilityPill from "./AgentAvailabilityPill";
import { useAvailability } from "@/hooks/useAvailability";
import { motion } from "framer-motion";

type Msg = { id: string; role: "user" | "assistant"; text: string; at: string };

const QUICK_PROMPTS = [
  {
    label: "Personal Website",
    value: "I need a full website redesign that feels modern and fast",
  },
  {
    label: "Landing Page",
    value: "I want a high-converting landing page for my product",
  },
  {
    label: "Web App",
    value: "I need a clean, user-friendly interface for my web app",
  },
  {
    label: "Branding",
    value: "I want a simple, modern logo and visual identity",
  },
];

const STORE_KEY = "houdlab_chat_messages_v1";
const CONV_KEY = "houdlab_conversation_id_v1";
const LAST_ASSISTANT_KEY = "houdlab_chat_last_assistant_at_v1";

const ASSISTANT_TITLE = "Yazid";
const ASSISTANT_LABELS = ["Community Manager"];

function fmtTime(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function AssistantHeader() {
  return (
    <div className="mb-1.5 flex items-center gap-1.5 text-xs pb-1">
      <span className="font-medium text-neutral-800 ">{ASSISTANT_TITLE}</span>
      <span> · </span>
      <div className="flex items-center gap-1.5">
        {ASSISTANT_LABELS.map((label) => (
          <span
            key={label}
            className="  font-normal text-gray-500   py-0.5 text-[12px]  "
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ChatPanel({ className = "" }: { className?: string }) {
  const { status } = useAvailability("houdlab");
  const isUnavailable = status === "unavailable";

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showPrompts, setShowPrompts] = useState(true);
  const [typing, setTyping] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const creatingConv = useRef<Promise<string> | null>(null);

  const seenIds = useRef<Set<string>>(new Set());
  const tempToDb = useRef<Map<string, string>>(new Map());
  const lastSeenIso = useRef<string | null>(null);
  const stopPollingRef = useRef(false);

  // Track optimistic messages to reconcile (avoid duplicates on first send)
  type Pending = {
    tempId: string;
    role: "user" | "assistant";
    text: string;
    atMs: number;
  };
  const pending = useRef<Pending[]>([]);

  // ✅ Prevent re-animations/flicker
  const animatedIds = useRef<Set<string>>(new Set());

  // Typing helpers / timers / broadcast
  const typingTimerRef = useRef<number | null>(null);
  const typingExpireTimer = useRef<number | null>(null);
  const lastTypingSentAt = useRef<number>(0);
  const typingChanRef = useRef<any>(null);

  const sb = useMemo(
    () => (conversationId ? supabaseForConversation(conversationId) : null),
    [conversationId]
  );

  function stopTypingSoon(ms = 800) {
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => setTyping(false), ms);
  }

  function emitUserTyping(active: boolean) {
    if (!typingChanRef.current) return;
    const now = Date.now();
    if (active && now - lastTypingSentAt.current < 800) return; // throttle
    lastTypingSentAt.current = now;
    typingChanRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { from: "user", active },
    });
  }

  // --- Reconciliation helpers -------------------------------------------------

  const MATCH_WINDOW_MS = 10_000; // 10s window to match optimistic -> DB row

  function findPendingMatch(role: "user" | "assistant", text: string) {
    const now = Date.now();
    // Prefer the latest pending match
    for (let i = pending.current.length - 1; i >= 0; i--) {
      const p = pending.current[i];
      if (
        p.role === role &&
        p.text === text &&
        now - p.atMs <= MATCH_WINDOW_MS
      ) {
        return { index: i, item: p };
      }
    }
    return null;
  }

  function reconcileDbRowIntoOptimistic(
    dbId: string,
    role: "user" | "assistant",
    text: string,
    created_at: string
  ) {
    const match = findPendingMatch(role, text);
    if (!match) return false;

    const { tempId } = match.item;
    // Update the optimistic message in place
    setMessages((prev) =>
      prev.map((m) =>
        m.id === tempId ? { ...m, id: dbId, at: fmtTime(created_at) } : m
      )
    );

    // Bookkeeping
    pending.current.splice(match.index, 1);
    tempToDb.current.set(tempId, dbId);
    seenIds.current.delete(tempId);
    seenIds.current.add(dbId);
    animatedIds.current.add(dbId);
    return true;
  }

  // ---------------------------------------------------------------------------

  function appendUnique(
    list: Array<{
      id: string;
      role: "user" | "assistant";
      text: string;
      created_at: string;
    }>
  ) {
    if (!list.length) return;

    // Try reconcile BEFORE append to avoid duplicates from polling
    for (const m of list) {
      const dbId = String(m.id);
      const role = m.role;
      const text = m.text;
      const created = m.created_at;

      // If we already saw it, skip
      if (seenIds.current.has(dbId)) continue;

      // Try reconciling to an optimistic message (most important for first-send)
      const reconciled = reconcileDbRowIntoOptimistic(
        dbId,
        role,
        text,
        created
      );
      if (reconciled) continue;

      // Otherwise, append as fresh
      seenIds.current.add(dbId);
      setMessages((prev) => [
        ...prev,
        { id: dbId, role, text, at: fmtTime(created) },
      ]);
      lastSeenIso.current = created;

      if (role === "assistant") {
        stopTypingSoon(1200);
        try {
          localStorage.setItem(LAST_ASSISTANT_KEY, String(created));
        } catch {}
        window.dispatchEvent(new Event("houd:chat:assistant"));
      }
    }
  }

  // Load local cache + conv id
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Msg[];
        if (Array.isArray(parsed) && parsed.length) {
          setMessages(parsed);
          setShowPrompts(false);
          parsed.forEach((m) => {
            const id = String(m.id);
            seenIds.current.add(id);
            animatedIds.current.add(id); // cached messages shouldn't animate
          });
          lastSeenIso.current = null;
        }
      }
    } catch {}
    const conv = localStorage.getItem(CONV_KEY);
    if (conv) setConversationId(conv);
  }, []);

  // Persist cache
  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  // 🔧 MOBILE/TABLET keyboard-safe layout (only below lg)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)"); // lg breakpoint
    const vv = window.visualViewport || null;

    const compute = () => {
      if (mq.matches) {
        document.documentElement.style.setProperty("--kb", "0px");
        document.documentElement.style.setProperty("--chat-mobile-pad", "0px");
        return;
      }
      const covered = vv
        ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
        : 0;
      document.documentElement.style.setProperty("--kb", `${covered}px`);
      document.documentElement.style.setProperty(
        "--chat-mobile-pad",
        `calc(110px + var(--kb, 0px))`
      );
    };

    compute();
    vv?.addEventListener("resize", compute);
    vv?.addEventListener("scroll", compute);
    mq.addEventListener("change", compute);
    window.addEventListener("orientationchange", compute);

    return () => {
      vv?.removeEventListener("resize", compute);
      vv?.removeEventListener("scroll", compute);
      mq.removeEventListener("change", compute);
      window.removeEventListener("orientationchange", compute);
      document.documentElement.style.removeProperty("--kb");
      document.documentElement.style.removeProperty("--chat-mobile-pad");
    };
  }, []);

  // Autoscroll BEFORE paint (prevents jump)
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  // Focus input if #chat-section
  useEffect(() => {
    if (window.location.hash === "#chat-section") inputRef.current?.focus();
  }, []);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
      if (typingExpireTimer.current)
        window.clearTimeout(typingExpireTimer.current);
    };
  }, []);

  // Initial history load
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

      appendUnique(mapped);
      if (mapped.length > 0) setShowPrompts(false);
      // history should NOT animate
      mapped.forEach((m) => animatedIds.current.add(String(m.id)));
    })();
  }, [sb, conversationId]);

  // Realtime inserts (reconcile vs optimistic)
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
          const role: "user" | "assistant" =
            row.role === "agent" ? "assistant" : "user";

          if (seenIds.current.has(dbId)) return;

          // Try reconcile first (handles the “first message duplicate”)
          const reconciled = reconcileDbRowIntoOptimistic(
            dbId,
            role,
            String(row.text),
            String(row.created_at)
          );
          if (reconciled) return;

          // Otherwise append fresh
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

          if (role === "assistant") {
            stopTypingSoon(1200);
            try {
              localStorage.setItem(LAST_ASSISTANT_KEY, String(row.created_at));
            } catch {}
            window.dispatchEvent(new Event("houd:chat:assistant"));
          }
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(ch);
    };
  }, [sb, conversationId]);

  // Typing broadcast: listen to AGENT typing
  useEffect(() => {
    if (!sb || !conversationId) return;

    const typingChan = sb.channel(`typing:${conversationId}`, {
      config: { broadcast: { self: false } },
    });

    typingChan
      .on("broadcast", { event: "typing" }, (payload: any) => {
        const p = payload?.payload || {};
        if (p.from === "agent") {
          if (p.active) {
            setTyping(true);
            if (typingExpireTimer.current)
              window.clearTimeout(typingExpireTimer.current);
            typingExpireTimer.current = window.setTimeout(
              () => setTyping(false),
              2500
            );
          } else {
            setTyping(false);
          }
        }
      })
      .subscribe();

    typingChanRef.current = typingChan;
    return () => {
      if (typingChanRef.current) sb.removeChannel(typingChanRef.current);
      typingChanRef.current = null;
      if (typingExpireTimer.current) {
        window.clearTimeout(typingExpireTimer.current);
        typingExpireTimer.current = null;
      }
    };
  }, [sb, conversationId]);

  // Fallback polling (also reconciles)
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
        if (lastSeenIso.current) q = q.gt("created_at", lastSeenIso.current);
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
      } finally {
        setTimeout(tick, 1800);
      }
    };
    tick();
    return () => {
      stopPollingRef.current = true;
    };
  }, [sb, conversationId]);

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

    let convId = conversationId;
    try {
      if (!convId) convId = await ensureConversation();
    } catch (e) {
      console.error("ensureConversation failed:", e);
      return;
    }

    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    setTyping(false);

    // Mark optimistic with a tmp_ id to distinguish from DB ids
    const tempId = `tmp_${crypto.randomUUID()}`;
    const nowMs = Date.now();

    const optimistic: Msg = {
      id: tempId,
      role: "user",
      text: trimmed,
      at: fmtTime(),
    };

    pending.current.push({ tempId, role: "user", text: trimmed, atMs: nowMs });
    setMessages((m) => [...m, optimistic]);
    seenIds.current.add(tempId);
    setInput("");

    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          conversationId: convId!,
          role: "user",
          text: trimmed,
        }),
      });
      const data = await res.json().catch(() => ({} as any));
      const dbMsg = data?.message;
      if (res.ok && dbMsg?.id) {
        const dbId = String(dbMsg.id);

        // If realtime already linked this, nothing to do
        if (seenIds.current.has(dbId)) {
          // Remove any leftover pending entry for this tempId
          const idx = pending.current.findIndex((p) => p.tempId === tempId);
          if (idx >= 0) pending.current.splice(idx, 1);
          seenIds.current.delete(tempId);
          tempToDb.current.set(tempId, dbId);
          return;
        }

        // Otherwise reconcile now (replace optimistic message)
        const reconciled = reconcileDbRowIntoOptimistic(
          dbId,
          "user",
          trimmed,
          String(dbMsg.created_at)
        );
        if (!reconciled) {
          // Fallback (should rarely happen): just patch the id of temp bubble
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId
                ? { ...m, id: dbId, at: fmtTime(String(dbMsg.created_at)) }
                : m
            )
          );
          seenIds.current.delete(tempId);
          seenIds.current.add(dbId);
          tempToDb.current.set(tempId, dbId);
        }
      }
    } catch (err) {
      console.error("[ChatPanel] send failed:", err);
      stopTypingSoon(0);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  const groups = useMemo(() => {
    type G = { role: "user" | "assistant"; items: Msg[] };
    const out: G[] = [];
    let prev: "user" | "assistant" | null = null;
    for (const m of messages) {
      if (m.role !== prev) {
        out.push({ role: m.role, items: [m] });
        prev = m.role;
      } else {
        out[out.length - 1].items.push(m);
      }
    }
    return out;
  }, [messages]);

  // 👇 Slightly longer, velvety reveal
  const BUBBLE_REVEAL = { duration: 0.28, ease: [0.22, 1, 0.36, 1] } as const;

  function Bubble({
    id,
    className,
    children,
  }: {
    id: string;
    className: string;
    children: React.ReactNode;
  }) {
    const firstTime = !animatedIds.current.has(id);
    if (firstTime) animatedIds.current.add(id);
    return (
      <motion.div
        initial={firstTime ? { opacity: 0, y: 8, scale: 0.985 } : false}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={BUBBLE_REVEAL}
        className={`${className} transform-gpu will-change-transform will-change-opacity antialiased`}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div
      className={`relative h-full min-h-0 flex flex-col rounded-3xl bg-gray-100 p-2 md:p-3 ${className}`}
    >
      {/* Top banner */}
      <div className="rounded-2xl bg-white md:p-5 p-4">
        <h1 className="font-display text-4xl md:text-6xl font-medium leading-[1.1] tracking-[-0.02em] pb-2 lg:pb-0">
          Establishing <br />
          <span className="text-[#FABC4B]">Brands</span> &{" "}
          <span className="text-[#FABC4B]">Products</span>
        </h1>
        <hr className="md:mt-5 mt-2  border-neutral-200" />

        {/* STACK on mobile/tablet, row on desktop */}
        <div className="md:mt-5 mt-3 flex flex-col gap-3 xl:flex-row xl:items-start lg:justify-between">
          {/* Avatars + text: also stacked on mobile/tablet */}
          <div className="flex items-center gap-3 lg:flex-row lg:items-center lg:gap-3 flex-1 min-w-0 mt-2 lg:mt-0">
            <div className="flex -space-x-3 shrink-0">
              <img
                src="/avatars/a2.png"
                alt="Assistant 1 from Houd Lab"
                className="h-10 w-10 rounded-full border-2 border-white"
              />
              <img
                src="/avatars/a3.png"
                alt="Assistant 2 from Houd Lab"
                className="h-10 w-10 rounded-full border-2 border-white"
              />
              <img
                src="/avatars/a1.png"
                alt="Assistant 3 from Houd Lab"
                className="h-10 w-10 rounded-full border-2 border-white"
              />
            </div>
            <p className="text-xs md:text-sm text-neutral-700 font-medium leading-snug">
              Chat with an expert right now,
              <br className="block md:hidden lg:block" /> and get your project
              scope in minutes.
            </p>
          </div>

          {/* Availability pill moves below on mobile/tablet */}
          <div className="self-start lg:self-auto mt-0 lg:mt-0">
            <AgentAvailabilityPill status={status} />
          </div>
        </div>
      </div>

      {/* Messages area — on mobile add dynamic bottom padding via CSS var */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto rounded-2xl p-4 pb-2 lg:pb-4"
        style={{
          paddingBottom: "var(--chat-mobile-pad, 0px)",
        }}
      >
        {groups.map((g, gi) => (
          <div key={gi} className="mb-4 last:mb-2 lg:last:mb-4">
            {g.role === "assistant" ? (
              <div className="flex items-start gap-3">
                {/* Fixed-size avatar wrapper to prevent shrinking on mobile/tablet */}
                <div className="relative size-10 flex-none shrink-0">
                  <img
                    src="/avatars/yazid.png"
                    alt="Assistant avatar"
                    className="size-10 w-10 rounded-full object-cover block"
                  />
                  {/* yellow rotated square badge */}
                  <div className="absolute -bottom-1  left-1">
                    <div className="h-2  w-2  bg-[#FABC4B] rotate-45 ring-2 ring-gray-100 rounded-[1px]" />
                  </div>
                </div>

                <div>
                  <AssistantHeader />
                  <div className="space-y-1.5">
                    {g.items.map((m) => (
                      <div key={m.id}>
                        <Bubble
                          id={m.id}
                          className="inline-block max-w-[68ch] rounded-2xl rounded-tl-md bg-white px-4 py-2 ring-1 ring-neutral-200"
                        >
                          {m.text}
                        </Bubble>
                      </div>
                    ))}
                    <div className="mt-1 text-xs text-neutral-500">
                      {g.items[g.items.length - 1].at}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-row-reverse items-start gap-3">
                <div className="space-y-1.5 text-right">
                  {g.items.map((m) => (
                    <div key={m.id}>
                      <Bubble
                        id={m.id}
                        className="inline-block max-w-[68ch] rounded-2xl rounded-tr-md bg-black text-white px-4 py-2 ml-24 text-left"
                      >
                        {m.text}
                      </Bubble>
                    </div>
                  ))}
                  <div className="mt-1 text-right text-xs text-neutral-500">
                    {g.items[g.items.length - 1].at}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {typing && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={BUBBLE_REVEAL}
            className="mb-4 flex items-start gap-3 transform-gpu will-change-transform will-change-opacity"
          >
            <img
              src="/avatars/yazid.png"
              alt=""
              className="h-8 w-8 rounded-full object-cover ring-2 ring-white"
            />
            <div className="inline-block rounded-2xl rounded-tl-md bg-white px-4 py-2 ring-1 ring-neutral-200">
              <span className="inline-flex gap-1 align-middle">
                <span className="animate-pulse text-xs">●</span>
                <span className="animate-pulse [animation-delay:150ms] text-xs">
                  ●
                </span>
                <span className="animate-pulse [animation-delay:300ms] text-xs">
                  ●
                </span>
              </span>
            </div>
          </motion.div>
        )}

        <div className="h-3" />
      </div>

      {/* Quick prompts — fixed on mobile/tablet above composer; desktop inline */}
      {showPrompts && (
        <>
          {/* mobile/tablet */}
          <div
            className="fixed inset-x-4 z-40 flex flex-wrap gap-2 px-3 py-2 lg:hidden"
            style={{
              bottom:
                "calc(82px + var(--kb, 0px) + env(safe-area-inset-bottom))",
            }}
          >
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setInput(p.value);
                  requestAnimationFrame(() => inputRef.current?.focus());
                }}
                className="group rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50 active:scale-[0.99] transition"
              >
                <span className="inline-flex items-center gap-2">
                  <span className="text-[#FABC4B]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="13"
                      height="12"
                      viewBox="0 0 13 12"
                      fill="none"
                    >
                      <path
                        d="M8.02539 2.34766L9.25 1.875L9.70117 0.671875C9.72266 0.564453 9.83008 0.5 9.9375 0.5C10.0234 0.5 10.1309 0.564453 10.1523 0.671875L10.625 1.875L11.8281 2.34766C11.9355 2.36914 12 2.47656 12 2.5625C12 2.66992 11.9355 2.77734 11.8281 2.79883L10.625 3.25L10.1523 4.47461C10.1309 4.56055 10.0234 4.625 9.9375 4.625C9.83008 4.625 9.72266 4.56055 9.70117 4.47461L9.25 3.25L8.02539 2.79883C7.91797 2.77734 7.875 2.66992 7.875 2.5625C7.875 2.47656 7.91797 2.36914 8.02539 2.34766ZM6.52148 4.53906L8.9707 5.65625C9.09961 5.7207 9.18555 5.84961 9.18555 5.97852C9.18555 6.10742 9.09961 6.23633 8.9707 6.30078L6.52148 7.41797L5.4043 9.86719C5.33984 9.99609 5.21094 10.082 5.08203 10.082C4.95312 10.082 4.82422 9.99609 4.78125 9.86719L3.64258 7.41797L1.19336 6.30078C1.06445 6.23633 1 6.10742 1 5.97852C1 5.84961 1.06445 5.7207 1.19336 5.65625L3.64258 4.53906L4.78125 2.08984C4.82422 1.96094 4.95312 1.875 5.08203 1.875C5.21094 1.875 5.33984 1.96094 5.4043 2.08984L6.52148 4.53906ZM9.70117 7.54688C9.72266 7.43945 9.83008 7.375 9.9375 7.375C10.0234 7.375 10.1309 7.43945 10.1523 7.54688L10.625 8.75L11.8281 9.22266C11.9355 9.24414 12 9.35156 12 9.4375C12 9.54492 11.9355 9.65234 11.8281 9.67383L10.625 10.125L10.1523 11.3496C10.1309 11.4355 10.0234 11.5 9.9375 11.5C9.83008 11.5 9.72266 11.4355 9.70117 11.3496L9.25 10.125L8.02539 9.67383C7.91797 9.65234 7.875 9.54492 7.875 9.4375C7.875 9.35156 7.91797 9.24414 8.02539 9.22266L9.25 8.75L9.70117 7.54688Z"
                        fill="currentColor"
                      ></path>
                    </svg>
                  </span>
                  <span className="font-semibold">{p.label}</span>
                </span>
              </button>
            ))}
          </div>

          {/* desktop — unchanged inline version */}
          <div className="hidden lg:mt-3 lg:px-5 lg:max-h-40 lg:overflow-y-auto lg:flex-shrink-0 lg:flex lg:flex-wrap lg:gap-2">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setInput(p.value);
                  requestAnimationFrame(() => inputRef.current?.focus());
                }}
                className="group rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50 active:scale-[0.99] transition"
              >
                <span className="inline-flex items-center gap-2">
                  <span className="text-[#FABC4B]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="13"
                      height="12"
                      viewBox="0 0 13 12"
                      fill="none"
                    >
                      <path
                        d="M8.02539 2.34766L9.25 1.875L9.70117 0.671875C9.72266 0.564453 9.83008 0.5 9.9375 0.5C10.0234 0.5 10.1309 0.564453 10.1523 0.671875L10.625 1.875L11.8281 2.34766C11.9355 2.36914 12 2.47656 12 2.5625C12 2.66992 11.9355 2.77734 11.8281 2.79883L10.625 3.25L10.1523 4.47461C10.1309 4.56055 10.0234 4.625 9.9375 4.625C9.83008 4.625 9.72266 4.56055 9.70117 4.47461L9.25 3.25L8.02539 2.79883C7.91797 2.77734 7.875 2.66992 7.875 2.5625C7.875 2.47656 7.91797 2.36914 8.02539 2.34766ZM6.52148 4.53906L8.9707 5.65625C9.09961 5.7207 9.18555 5.84961 9.18555 5.97852C9.18555 6.10742 9.09961 6.23633 8.9707 6.30078L6.52148 7.41797L5.4043 9.86719C5.33984 9.99609 5.21094 10.082 5.08203 10.082C4.95312 10.082 4.82422 9.99609 4.78125 9.86719L3.64258 7.41797L1.19336 6.30078C1.06445 6.23633 1 6.10742 1 5.97852C1 5.84961 1.06445 5.7207 1.19336 5.65625L3.64258 4.53906L4.78125 2.08984C4.82422 1.96094 4.95312 1.875 5.08203 1.875C5.21094 1.875 5.33984 1.96094 5.4043 2.08984L6.52148 4.53906ZM9.70117 7.54688C9.72266 7.43945 9.83008 7.375 9.9375 7.375C10.0234 7.375 10.1309 7.43945 10.1523 7.54688L10.625 8.75L11.8281 9.22266C11.9355 9.24414 12 9.35156 12 9.4375C12 9.54492 11.9355 9.65234 11.8281 9.67383L10.625 10.125L10.1523 11.3496C10.1309 11.4355 10.0234 11.5 9.9375 11.5C9.83008 11.5 9.72266 11.4355 9.70117 11.3496L9.25 10.125L8.02539 9.67383C7.91797 9.65234 7.875 9.54492 7.875 9.4375C7.875 9.35156 7.91797 9.24414 8.02539 9.22266L9.25 8.75L9.70117 7.54688Z"
                        fill="currentColor"
                      ></path>
                    </svg>
                  </span>
                  <span className="font-semibold">{p.label}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Composer — fixed on mobile/tablet, normal flow on desktop */}
      <form
        onSubmit={onSubmit}
        className="mt-4 flex-shrink-0 lg:static lg:mt-4 fixed inset-x-4 z-50 lg:bottom-auto"
        style={{
          bottom: "calc(20px + var(--kb, 0px) + env(safe-area-inset-bottom))",
        }}
      >
        <div className="relative flex items-center">
          <input
            id="chat-input"
            data-chat-input
            ref={inputRef}
            value={input}
            onChange={(e) => {
              const v = e.target.value;
              setInput(v);
              const active = !!v.trim();
              if (active) emitUserTyping(true);
              else emitUserTyping(false);
            }}
            onFocus={() => {
              setTimeout(() => {
                if (window.matchMedia("(min-width: 1024px)").matches) return;
                inputRef.current?.scrollIntoView({
                  block: "end",
                  behavior: "smooth",
                });
              }, 150);
            }}
            onBlur={() => emitUserTyping(false)}
            placeholder={
              isUnavailable
                ? "Currently unavailable to chat"
                : "Describe your project..."
            }
            disabled={isUnavailable}
            className={`w-full rounded-full border px-4 py-3 text-neutral-900 placeholder:text-neutral-400 outline-none transition
              ${
                isUnavailable
                  ? "bg-neutral-100 cursor-not-allowed border-neutral-200"
                  : "bg-white border-neutral-300 focus:ring-2 focus:ring-neutral-200"
              }`}
          />

          <button
            type="submit"
            disabled={!input.trim() || isUnavailable}
            className={`absolute right-1 top-1 bottom-1 my-auto grid h-9 w-9 place-items-center rounded-full text-white mr-1 cursor-pointer
              ${
                isUnavailable
                  ? "bg-neutral-300 cursor-not-allowed"
                  : "bg-neutral-900 hover:bg-black"
              }`}
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
