import { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { supabaseForConversation } from "../lib/supabaseBrowser";
import AgentAvailabilityPill from "./AgentAvailabilityPill";
import { useAvailability } from "@/hooks/useAvailability";
import { motion } from "framer-motion";
import faqBank from "@/lib/faqBank";
import type { ChatMessage } from "@/types/chat";

const PRIMARY_CHIPS = [
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

const SECONDARY_CHIPS = [
  { id: "pricing", label: "Pricing" },
  { id: "services", label: "Services" },
  { id: "timeline", label: "Timeline" },
  { id: "contact", label: "Contact" },
  { id: "process", label: "Process" },
  { id: "revisions", label: "Revisions" },
];

const SECONDARY_ICONS: Record<string, JSX.Element> = {
  pricing: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="13"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M8.2 2.2h-4A1.2 1.2 0 0 0 3 3.4v4l5.2 5.2a1.2 1.2 0 0 0 1.7 0l3.9-3.9a1.2 1.2 0 0 0 0-1.7L8.2 2.2Z"
        stroke="currentColor"
        stroke-width="1.3"
        stroke-linejoin="round"
      />
      <circle cx="5.3" cy="5.3" r="1" fill="currentColor" />
    </svg>
  ),
  services: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="13"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M9.8 2.5a3.3 3.3 0 0 0-3.7 4.7L2 11.3V14h2.7l4.1-4.1A3.3 3.3 0 0 0 13.5 6l-2.3 2.3-2-2 2.6-3.8Z"
        stroke="currentColor"
        stroke-width="1.3"
        stroke-linejoin="round"
      />
    </svg>
  ),
  timeline: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="13"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
    >
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.3" />
      <path
        d="M8 4.8v3.6l2.4 1.5"
        stroke="currentColor"
        stroke-width="1.3"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  ),
  contact: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="13"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
    >
      <rect
        x="2.2"
        y="3.5"
        width="11.6"
        height="9"
        rx="1.3"
        stroke="currentColor"
        stroke-width="1.3"
      />
      <path
        d="m3 4.5 5 3.8 5-3.8"
        stroke="currentColor"
        stroke-width="1.3"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  ),
  process: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="13"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
    >
      <circle cx="3.5" cy="4" r="1.4" fill="currentColor" />
      <circle cx="12.5" cy="12" r="1.4" fill="currentColor" />
      <path
        d="M4.8 4.7h3.6a2.4 2.4 0 0 1 2.4 2.4v1.5a2.4 2.4 0 0 1-2.4 2.4H7.2"
        stroke="currentColor"
        stroke-width="1.3"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  ),
  revisions: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="13"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M12.3 6.2A4.6 4.6 0 0 0 4.2 5.1"
        stroke="currentColor"
        stroke-width="1.3"
        stroke-linecap="round"
      />
      <path
        d="M4.1 2.9v2.7h2.7"
        stroke="currentColor"
        stroke-width="1.3"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M3.7 9.8a4.6 4.6 0 0 0 8.1 1.1"
        stroke="currentColor"
        stroke-width="1.3"
        stroke-linecap="round"
      />
      <path
        d="M11.9 13.1v-2.7H9.2"
        stroke="currentColor"
        stroke-width="1.3"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  ),
};

function SecondaryIcon({ id }: { id: string }) {
  return (
    <span className="text-[#FABC4B]">
      {SECONDARY_ICONS[id] ?? SECONDARY_ICONS.process}
    </span>
  );
}

const STORE_KEY = "houdlab_chat_messages_v1";
const CONV_KEY = "houdlab_conversation_id_v1";
const LAST_ASSISTANT_KEY = "houdlab_chat_last_assistant_at_v1";

const ASSISTANT_TITLE = "Yazid";
const ASSISTANT_LABELS = ["Community Manager"];

const OFFLINE_AUTOREPLY =
  "Thanks — we received this. A Houdlab specialist will reply as soon as possible.";

type LocalMessage = ChatMessage & { at?: string; isAuto?: boolean };

const AUTO_RESPONSE_CUTOFF_HOUR_GMT1 = 18;
const GMT1_OFFSET_MINUTES = 60;

function fmtTime(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isAfterGmt1Cutoff(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  const utcMinutes = d.getUTCHours() * 60 + d.getUTCMinutes();
  const gmt1Minutes = (utcMinutes + GMT1_OFFSET_MINUTES + 1440) % 1440;
  return gmt1Minutes >= AUTO_RESPONSE_CUTOFF_HOUR_GMT1 * 60;
}

function normalizeStoredMessages(raw: unknown): LocalMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((m) => {
      if (!m || typeof m !== "object") return null;
      const id = "id" in m ? String((m as any).id) : null;
      if (!id) return null;
      const role = (m as any).role === "assistant" ? "assistant" : "user";
      const kind = (m as any).kind === "faq" ? "faq" : "text";
      const createdAt =
        typeof (m as any).createdAt === "string"
          ? (m as any).createdAt
          : new Date().toISOString();
      const at = typeof (m as any).at === "string" ? (m as any).at : undefined;
      if (kind === "faq") {
        const faqId =
          typeof (m as any).faqId === "string" ? (m as any).faqId : "";
        if (!faqId) return null;
        return {
          id,
          role: "assistant",
          kind: "faq",
          faqId,
          createdAt,
          isAuto: typeof (m as any).isAuto === "boolean" ? (m as any).isAuto : true,
          ...(at ? { at } : {}),
        };
      }
      const text = typeof (m as any).text === "string" ? (m as any).text : "";
      return {
        id,
        role,
        kind: "text",
        text,
        createdAt,
        isAuto: typeof (m as any).isAuto === "boolean" ? (m as any).isAuto : false,
        ...(at ? { at } : {}),
      };
    })
    .filter(Boolean) as LocalMessage[];
}

function AssistantHeader({ showNew = false }: { showNew?: boolean }) {
  return (
    <div className="mb-1.5 flex flex-col">
      {showNew && (
        <div className="text-[11px] font-semibold text-[#FABC4B] leading-none mb-1">
          Oldnew message
        </div>
      )}

      <div className="flex items-center gap-1.5 text-xs pb-1">
        <span className="font-medium text-neutral-800 ">{ASSISTANT_TITLE}</span>
        <span> · </span>
        <div className="flex items-center gap-1.5">
          {ASSISTANT_LABELS.map((label) => (
            <span
              key={label}
              className="font-normal text-gray-500 py-0.5 text-[12px]"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ChatPanel({ 
  className = "",
  isWorkPage = false,
  onToggleCollapse
}: { 
  className?: string;
  isWorkPage?: boolean;
  onToggleCollapse?: () => void;
}) {
  // --- Title badge ---
  const originalTitleRef = useRef<string>(""); // ✅ single declaration
  const titleTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof document !== "undefined") {
      originalTitleRef.current = document.title;
    }
  }, []);

  function flashTitleBadge() {
    if (typeof document === "undefined") return; // SSR guard

    if (titleTimerRef.current) window.clearTimeout(titleTimerRef.current);

    if (!document.title.startsWith("(1) ")) {
      document.title = "(1) " + document.title;
    }

    titleTimerRef.current = window.setTimeout(() => {
      if (typeof document !== "undefined") {
        document.title =
          originalTitleRef.current || document.title.replace(/^\(1\)\s*/, "");
      }
      titleTimerRef.current = null;
    }, 7000);
  }

  useEffect(() => {
    return () => {
      if (titleTimerRef.current) window.clearTimeout(titleTimerRef.current);
      if (typeof document !== "undefined") {
        document.title =
          originalTitleRef.current || document.title.replace(/^\(1\)\s*/, "");
      }
    };
  }, []);

  // --- Notification sound ---
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // preload once
  useEffect(() => {
    audioRef.current = new Audio("/sounds/new-message.mp3"); // make sure this path exists
    audioRef.current.preload = "auto";
    audioRef.current.volume = 0.6;
  }, []);

  // unlock audio on first user interaction (mobile Safari needs this)
  useEffect(() => {
    const unlock = async () => {
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio("/sounds/new-message.mp3");
          audioRef.current.preload = "auto";
          audioRef.current.volume = 0.6;
        }
        // attempt a short play, then immediately pause to “prime” it
        await audioRef.current.play();
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {
        // ignore; some browsers still reject until next gesture
      } finally {
        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("keydown", unlock);
        window.removeEventListener("touchend", unlock);
      }
    };

    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("touchend", unlock, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchend", unlock);
    };
  }, []);

  // ✅ inside the component
  const [showNewBadge, setShowNewBadge] = useState(false);
  const newBadgeTimer = useRef<number | null>(null);
  const historyLoadedRef = useRef(false);

  function playNotification() {
    const a = audioRef.current;
    if (!a) return;
    try {
      a.currentTime = 0; // restart from beginning
      const p = a.play();
      if (p && p.catch)
        p.catch(() => {
          /* play blocked or user muted */
        });
    } catch {
      /* noop */
    }
  }

  function pingNewBadge() {
    setShowNewBadge(true);
    playNotification();
    flashTitleBadge(); // 👈 add this line
    if (newBadgeTimer.current) window.clearTimeout(newBadgeTimer.current);
    newBadgeTimer.current = window.setTimeout(() => {
      setShowNewBadge(false);
      newBadgeTimer.current = null;
    }, 10000);
  }

  // ✅ inside the component
  useEffect(() => {
    return () => {
      if (newBadgeTimer.current) window.clearTimeout(newBadgeTimer.current);
    };
  }, []);

  const { status } = useAvailability("houdlab");
  const isUnavailable = status === "unavailable";

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showPrompts, setShowPrompts] = useState(true);
  const [typing, setTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

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

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // find the latest assistant message id
  const lastAssistantId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i].id;
    }
    return null;
  }, [messages]);

  function stopTypingSoon(ms = 4800) {
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
        m.id === tempId ? { ...m, id: dbId, createdAt: created_at } : m
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
        {
          id: dbId,
          role,
          kind: "text",
          text,
          isAuto: false,
          createdAt: created,
        },
      ]);
      lastSeenIso.current = created;

      if (role === "assistant") {
        stopTypingSoon(5200);
        try {
          localStorage.setItem(LAST_ASSISTANT_KEY, String(created));
        } catch {}
        window.dispatchEvent(new Event("houd:chat:assistant"));

        // ✅ Show transient badge for truly new assistant messages
        if (historyLoadedRef.current) pingNewBadge();
      }
    }
  }

  // Load local cache + conv id
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = normalizeStoredMessages(JSON.parse(raw));
        if (parsed.length) {
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

    historyLoadedRef.current = false;

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
      mapped.forEach((m) => animatedIds.current.add(String(m.id)));

      // ✅ mark history loaded
      historyLoadedRef.current = true;
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
              kind: "text",
              text: String(row.text),
              isAuto: false,
              createdAt: String(row.created_at),
            },
          ]);
          lastSeenIso.current = String(row.created_at);

          if (role === "assistant") {
            stopTypingSoon(5200);
            try {
              localStorage.setItem(LAST_ASSISTANT_KEY, String(row.created_at));
            } catch {}
            window.dispatchEvent(new Event("houd:chat:assistant"));

            // ✅ Only badge after history is loaded (avoids flashing on initial load)
            if (historyLoadedRef.current) pingNewBadge();
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
              6500
            );
          } else {
            stopTypingSoon(4800);
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

    if (!isOnline) {
      const nowIso = new Date().toISOString();
      const tempId = `tmp_${crypto.randomUUID()}`;
      const optimistic: LocalMessage = {
        id: tempId,
        role: "user",
        kind: "text",
        text: trimmed,
        createdAt: nowIso,
      };
      setMessages((m) => [...m, optimistic]);
      seenIds.current.add(tempId);
      setInput("");

      setMessages((m) => [
        ...m,
        {
          id: `tmp_${crypto.randomUUID()}`,
          role: "assistant",
          kind: "text",
          text: OFFLINE_AUTOREPLY,
          isAuto: true,
          createdAt: new Date().toISOString(),
        },
      ]);
      return;
    }

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

    const optimistic: LocalMessage = {
      id: tempId,
      role: "user",
      kind: "text",
      text: trimmed,
      createdAt: new Date().toISOString(),
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
                ? { ...m, id: dbId, createdAt: String(dbMsg.created_at) }
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

  function handleSecondaryChipClick(chipId: string, label: string) {
    const entry = faqBank[chipId];
    if (!entry) return;
    if (showPrompts) setShowPrompts(false);
    const nowIso = new Date().toISOString();
    const userMessage: LocalMessage = {
      id: `tmp_${crypto.randomUUID()}`,
      role: "user",
      kind: "text",
      text: label,
      createdAt: nowIso,
    };
    const faqMessage: LocalMessage = {
      id: `tmp_${crypto.randomUUID()}`,
      role: "assistant",
      kind: "faq",
      faqId: chipId,
      isAuto: true,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage, faqMessage]);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  const groups = useMemo(() => {
    type G = { role: "user" | "assistant"; items: LocalMessage[] };
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
      className={`relative h-full min-h-0 flex flex-col rounded-3xl bg-gray-100 ${isWorkPage ? "p-4" : "p-2 md:p-3"} ${className}`}
    >
      {/* Header with avatar (for work page) */}
      {isWorkPage && (
        <div className="rounded-2xl bg-white md:p-4 p-3 mb-2 border-b border-neutral-200 relative">
          <div className="flex items-start gap-3">
            <img
              src="/avatars/yazid.png"
              alt="Yazid"
              className={`h-10 w-10 rounded-full object-cover ${isUnavailable ? "grayscale" : ""}`}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-neutral-900">{ASSISTANT_TITLE}</span>
                <span className="text-neutral-400">·</span>
                <span className="text-sm text-neutral-600">{ASSISTANT_LABELS[0]}</span>
              </div>
              <div className="mt-2 flex items-start justify-start">
                <AgentAvailabilityPill status={status} isWorkPage={true} />
              </div>
            </div>
          </div>
          {/* Collapse button on the right */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="absolute top-4 right-4 z-40 p-2 rounded-full bg-white hover:bg-neutral-50 border border-neutral-200 transition-colors"
              aria-label="Collapse chat"
              title="Collapse chat"
            >
              <svg
                className="w-4 h-4 text-neutral-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Top banner - hidden on work page */}
      {!isWorkPage && (
        <div className="shrink-0 rounded-2xl bg-white px-4 py-3 md:px-5 md:py-3.5">
          <h1 className="font-display text-[2rem] md:text-[2.75rem] font-medium leading-[1.05] tracking-[-0.02em]">
            Establishing <br />
            <span className="text-[#FABC4B]">Brands</span> &{" "}
            <span className="text-[#FABC4B]">Products</span>
          </h1>
          <hr className="mt-3 border-neutral-200" />

          {/* STACK on mobile/tablet, row on desktop */}
          <div className="mt-3 flex flex-col gap-2 xl:flex-row xl:items-center lg:justify-between">
            {/* Avatars + text: also stacked on mobile/tablet */}
            <div className="flex items-center gap-3 lg:flex-row lg:items-center lg:gap-3 flex-1 min-w-0">
              <div className="flex -space-x-3 shrink-0">
                <img
                  src="/avatars/a2.png"
                  alt="Assistant 1 from Houd Lab"
                  className="h-8 w-8 md:h-9 md:w-9 rounded-full border-2 border-white"
                />
                <img
                  src="/avatars/a3.png"
                  alt="Assistant 2 from Houd Lab"
                  className="h-8 w-8 md:h-9 md:w-9 rounded-full border-2 border-white"
                />
                <img
                  src="/avatars/a1.png"
                  alt="Assistant 3 from Houd Lab"
                  className="h-8 w-8 md:h-9 md:w-9 rounded-full border-2 border-white"
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
      )}

      {/* Messages area — on mobile add dynamic bottom padding via CSS var */}
      <div
        ref={scrollRef}
        data-lenis-prevent
        data-lenis-prevent-wheel
        data-lenis-prevent-touch
        className="flex-1 min-h-0 overflow-y-auto rounded-2xl p-4 pb-2 lg:pb-4"
        style={{
          paddingBottom: "var(--chat-mobile-pad, 0px)",
        }}
      >
        {groups.map((g, gi) => (
          <div key={gi} className="mb-4 last:mb-2 lg:last:mb-4">
            {g.role === "assistant" ? (
              <div className="flex items-start gap-2">
                {/* Fixed-size avatar wrapper - smaller on work page */}
                {(() => {
                  const lastItem = g.items[g.items.length - 1];
                  const afterCutoff = isAfterGmt1Cutoff(lastItem?.createdAt);
                  const hasHuman = g.items.some((m) => !m.isAuto);
                  const showAvatar = !afterCutoff || hasHuman;
                  return (
                    showAvatar && (
                    <div
                      className={`relative flex-none shrink-0 ${isWorkPage ? "size-8" : "size-10"}`}
                    >
                      <img
                        src="/avatars/yazid.png"
                        alt="Assistant avatar"
                        className={`${isWorkPage ? "h-8 w-8" : "size-10 w-10"} rounded-full object-cover block`}
                      />
                      {/* yellow rotated square badge */}
                      <div className="absolute -bottom-1 left-1">
                        <div
                          className={`${isWorkPage ? "h-1.5 w-1.5" : "h-2 w-2"} bg-[#FABC4B] rotate-45 ring-2 ring-gray-100 rounded-[1px]`}
                        />
                      </div>
                    </div>
                    )
                  );
                })()}

                <div>
                  {!isWorkPage && <AssistantHeader />}
                  <div className="space-y-1.5">
                    {g.items.map((m) => {
                      const entry = m.kind === "faq" ? faqBank[m.faqId] : null;
                      return (
                        <div key={m.id}>
                          {/* show the badge only for the most recent assistant message */}
                        {showNewBadge && lastAssistantId === m.id && (
                          <div className="mb-2 text-[11px] font-semibold text-neutral-500 text-center">
                            ----- New message -----
                          </div>
                        )}

                          {m.kind === "faq" && entry ? (
                            <Bubble
                              id={m.id}
                              className={`inline-block max-w-[68ch] rounded-2xl rounded-tl-md px-4 py-3 ring-1 ${
                                m.isAuto
                                  ? "bg-amber-50 ring-amber-200"
                                  : "bg-white ring-neutral-200"
                              }`}
                            >
                              <div className="text-sm font-semibold text-neutral-900">
                                {entry.title}
                              </div>
                              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-700">
                                {entry.body.map((item) => (
                                  <li key={item}>{item}</li>
                                ))}
                              </ul>
                              {entry.cta && (
                                <a
                                  href={entry.cta.href}
                                  className="mt-3 inline-flex items-center justify-center rounded-full border border-neutral-900 px-3 py-1.5 text-xs font-semibold text-neutral-900 transition hover:bg-neutral-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
                                >
                                  {entry.cta.label}
                                </a>
                              )}
                            </Bubble>
                          ) : (
                            <Bubble
                              id={m.id}
                              className={`inline-block max-w-[68ch] rounded-2xl rounded-tl-md px-4 py-2 ring-1 ${
                                m.isAuto
                                  ? "bg-amber-50 ring-amber-200"
                                  : "bg-white ring-neutral-200"
                              }`}
                            >
                              {m.kind === "text" ? m.text : null}
                            </Bubble>
                          )}
                        </div>
                      );
                    })}
                    <div className="mt-1 text-xs text-neutral-500">
                      {(() => {
                        const lastItem = g.items[g.items.length - 1];
                        const afterCutoff = isAfterGmt1Cutoff(lastItem?.createdAt);
                        const autoOnly = g.items.every((m) => m.isAuto);
                        const showAutoLabel = afterCutoff && (autoOnly || isUnavailable);
                        return (
                          <>
                            {showAutoLabel ? "Automatic response at " : ""}
                            {lastItem?.at ?? fmtTime(lastItem?.createdAt)}
                          </>
                        );
                      })()}
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
                        {m.kind === "text" ? m.text : null}
                      </Bubble>
                    </div>
                  ))}
                  <div className="mt-1 text-right text-xs text-neutral-500">
                    {g.items[g.items.length - 1].at ??
                      fmtTime(g.items[g.items.length - 1].createdAt)}
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
            className="mb-4 flex items-start gap-2 transform-gpu will-change-transform will-change-opacity"
          >
            {!isUnavailable && (
              <img
                src="/avatars/yazid.png"
                alt=""
                className={`${isWorkPage ? "h-8 w-8" : "h-8 w-8"} rounded-full object-cover ring-2 ring-white`}
              />
            )}
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
      <>
        {/* mobile/tablet */}
        <div
          className={`lg:hidden flex flex-wrap gap-2 ${
            isWorkPage
              ? "fixed inset-x-4 z-40 px-3 py-2"
              : "mt-3 px-2 py-1"
          }`}
          style={
            isWorkPage
              ? {
                  bottom:
                    "calc(82px + var(--kb, 0px) + env(safe-area-inset-bottom))",
                }
              : undefined
          }
        >
          {showPrompts && !isUnavailable &&
            PRIMARY_CHIPS.map((p) => (
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
          {isUnavailable && (
            <>
              <div className="w-full text-[10px] font-semibold text-neutral-400">
                FAQ shortcuts
              </div>
              {SECONDARY_CHIPS.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => handleSecondaryChipClick(chip.id, chip.label)}
                  className="group rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-600 hover:bg-white active:scale-[0.99] transition"
                >
                  <span className="inline-flex items-center gap-2">
                    <SecondaryIcon id={chip.id} />
                    <span className="font-semibold">{chip.label}</span>
                  </span>
                </button>
              ))}
            </>
          )}
        </div>

        {/* desktop — unchanged inline version */}
        <div className="hidden lg:mt-3 lg:px-5 lg:max-h-40 lg:overflow-y-auto lg:flex-shrink-0 lg:flex lg:flex-wrap lg:gap-2">
          {showPrompts && !isUnavailable &&
            PRIMARY_CHIPS.map((p) => (
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
          {isUnavailable && (
            <>
              <div className="w-full text-[10px] font-semibold text-neutral-400">
                FAQ shortcuts
              </div>
              {SECONDARY_CHIPS.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => handleSecondaryChipClick(chip.id, chip.label)}
                  className="group rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-600 hover:bg-white active:scale-[0.99] transition"
                >
                  <span className="inline-flex items-center gap-2">
                    <SecondaryIcon id={chip.id} />
                    <span className="font-semibold">{chip.label}</span>
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      </>

      {/* Composer — fixed on mobile/tablet, normal flow on desktop */}
      <form
        onSubmit={onSubmit}
        className="mt-4 flex-shrink-0 lg:static lg:mt-4 fixed inset-x-4 z-50 lg:bottom-auto"
        style={{
          bottom: "calc(20px + var(--kb, 0px) + env(safe-area-inset-bottom))",
        }}
      >
        {!isOnline && (
          <div className="mb-2 text-[11px] font-semibold text-amber-600">
            Offline mode
          </div>
        )}
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
