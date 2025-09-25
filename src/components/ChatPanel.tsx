import { useEffect, useRef, useState } from "react";

type Msg = { id: string; role: "user" | "assistant"; text: string; at: string };

const QUICK_PROMPTS = [
  "I want a redesign for my website",
  "I need a branding for my project",
  "I need a mobile app UI",
  "I want a logo for my business",
  "I need social media visuals",
];

const STORE_KEY = "houdlab_chat_messages_v1";
const ASSISTANT_NAME = "Yazid from HoudLab"; // change to "Yazid" if you prefer

function timeNow() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPanel() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [showPrompts, setShowPrompts] = useState(true);
  const [typing, setTyping] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load persisted messages
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

  function handleQuickPrompt(t: string) {
    setInput(t);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (showPrompts) setShowPrompts(false);

    const userMsg: Msg = {
      id: crypto.randomUUID(),
      role: "user",
      text: trimmed,
      at: timeNow(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");

    // demo assistant reply
    setTyping(true);
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: "Got it! I’ll draft a quick scope. Do you have a deadline or budget range?",
          at: timeNow(),
        },
      ]);
      setTyping(false);
    }, 600);
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
                  {/* Assistant name above bubble */}
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

        {/* Typing indicator */}
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

      {/* Composer with button inside the field */}
      <form onSubmit={onSubmit} className="mt-4">
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your project.."
            className="w-full rounded-full border border-neutral-300 bg-white pl-5 pr-14 py-3 text-neutral-900 placeholder:text-neutral-400 outline-none focus:ring-0 focus:ring-neutral-200"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="absolute right-1 top-1 bottom-1 my-auto grid h-9 w-9 place-items-center rounded-full bg-neutral-900 text-white shadow-sm disabled:opacity-40 mr-1"
            aria-label="Send message"
            title="Send"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M2 21l20-9L2 3l5 8-5 10zm6.4-8.6L20 12 8.4 11.6 7 8.9l-1.7-3 3 1.7 2.7 1.4L12 12l-.9 2.9-1.7 3 1.7-3 .3-2.5z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
