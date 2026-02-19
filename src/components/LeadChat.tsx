import { useEffect, useMemo, useRef, useState } from "react";
import faqBank from "@/lib/faqBank";
import type { ChatMessage } from "@/types/chat";

type Chip = { id: string; label: string };

const PRIMARY_CHIPS: Chip[] = [
  { id: "personal-website", label: "Personal Website" },
  { id: "landing-page", label: "Landing Page" },
  { id: "web-app", label: "Web App" },
  { id: "branding", label: "Branding" },
];

const SECONDARY_CHIPS: Chip[] = [
  { id: "pricing", label: "Pricing" },
  { id: "services", label: "Services" },
  { id: "timeline", label: "Timeline" },
  { id: "contact", label: "Contact" },
  { id: "process", label: "Process" },
  { id: "revisions", label: "Revisions" },
];

const OFFLINE_AUTOREPLY =
  "Thanks — we received this. A Houdlab specialist will reply as soon as possible.";

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LeadChat({ className = "" }: { className?: string }) {
  const [selectedPrimary, setSelectedPrimary] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const grouped = useMemo(() => {
    type Group = { role: "user" | "assistant"; items: ChatMessage[] };
    const out: Group[] = [];
    let lastRole: Group["role"] | null = null;
    messages.forEach((msg) => {
      if (msg.role !== lastRole) {
        out.push({ role: msg.role, items: [msg] });
        lastRole = msg.role;
      } else {
        out[out.length - 1].items.push(msg);
      }
    });
    return out;
  }, [messages]);

  const appendMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  const handleSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    appendMessage({
      id: createId(),
      role: "user",
      kind: "text",
      text: trimmed,
      createdAt: now,
    });
    setInput("");

    if (!isOnline) {
      appendMessage({
        id: createId(),
        role: "assistant",
        kind: "text",
        text: OFFLINE_AUTOREPLY,
        createdAt: new Date().toISOString(),
      });
    }
  };

  const handleSecondaryClick = (chip: Chip) => {
    const entry = faqBank[chip.id];
    if (!entry) return;
    const now = new Date().toISOString();
    appendMessage({
      id: createId(),
      role: "user",
      kind: "text",
      text: chip.label,
      createdAt: now,
    });
    appendMessage({
      id: createId(),
      role: "assistant",
      kind: "faq",
      faqId: chip.id,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div
      className={`flex h-full min-h-[520px] flex-col rounded-3xl bg-white/90 p-4 shadow-sm ring-1 ring-neutral-200 ${className}`}
    >
      <div className="mb-4">
        <div className="text-sm font-medium text-neutral-800">Start here</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRIMARY_CHIPS.map((chip) => {
            const isActive = chip.id === selectedPrimary;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => {
                  setSelectedPrimary(chip.id);
                  setInput(chip.label);
                  requestAnimationFrame(() => inputRef.current?.focus());
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 ${
                  isActive
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
        <div className="mt-3 text-xs font-medium text-neutral-500">
          FAQ shortcuts
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {SECONDARY_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => handleSecondaryClick(chip)}
              className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto rounded-2xl bg-neutral-50/60 p-4"
      >
        {grouped.map((group, index) => (
          <div key={`${group.role}-${index}`} className="space-y-2">
            {group.items.map((message) => {
              if (message.role === "assistant" && message.kind === "faq") {
                const entry = faqBank[message.faqId];
                return (
                  <div
                    key={message.id}
                    className="max-w-[560px] rounded-2xl rounded-tl-md border border-neutral-200 bg-white p-4 shadow-sm"
                  >
                    <div className="text-sm font-semibold text-neutral-900">
                      {entry?.title}
                    </div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-700">
                      {entry?.body.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    {entry?.cta && (
                      <a
                        href={entry.cta.href}
                        className="mt-3 inline-flex items-center justify-center rounded-full border border-neutral-900 px-3 py-1.5 text-xs font-semibold text-neutral-900 transition hover:bg-neutral-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
                      >
                        {entry.cta.label}
                      </a>
                    )}
                  </div>
                );
              }

              const isUser = message.role === "user";
              return (
                <div
                  key={message.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[60ch] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                      isUser
                        ? "rounded-tr-md bg-neutral-900 text-white"
                        : "rounded-tl-md bg-white text-neutral-800 ring-1 ring-neutral-200"
                    }`}
                  >
                    {message.kind === "text" ? message.text : null}
                  </div>
                </div>
              );
            })}
            <div
              className={`text-[11px] text-neutral-500 ${
                group.role === "user" ? "text-right" : "text-left"
              }`}
            >
              {formatTime(group.items[group.items.length - 1].createdAt)}
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-4 text-sm text-neutral-500">
            Ask a question or use a FAQ shortcut to get an instant answer.
          </div>
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSend(input);
        }}
        className="mt-4"
      >
        <div className="mb-2 flex items-center gap-2 text-xs text-neutral-500">
          <span
            className={`inline-flex h-2 w-2 rounded-full ${
              isOnline ? "bg-emerald-500" : "bg-amber-500"
            }`}
            aria-hidden="true"
          />
          <span>{isOnline ? "Online" : "Offline mode"}</span>
        </div>
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Describe your project..."
            className="w-full rounded-full border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="absolute right-1 top-1 bottom-1 inline-flex items-center justify-center rounded-full bg-neutral-900 px-4 text-xs font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

