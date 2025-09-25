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

  useEffect(() => {
    if (window.location.hash === "#chat-section") {
      inputRef.current?.focus();
    }
  }, []);

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
              <path
                xmlns="http://www.w3.org/2000/svg"
                d="M20.33 3.66996C20.1408 3.48213 19.9035 3.35008 19.6442 3.28833C19.3849 3.22659 19.1135 3.23753 18.86 3.31996L4.23 8.19996C3.95867 8.28593 3.71891 8.45039 3.54099 8.67255C3.36307 8.89471 3.25498 9.16462 3.23037 9.44818C3.20576 9.73174 3.26573 10.0162 3.40271 10.2657C3.5397 10.5152 3.74754 10.7185 4 10.85L10.07 13.85L13.07 19.94C13.1906 20.1783 13.3751 20.3785 13.6029 20.518C13.8307 20.6575 14.0929 20.7309 14.36 20.73H14.46C14.7461 20.7089 15.0192 20.6023 15.2439 20.4239C15.4686 20.2456 15.6345 20.0038 15.72 19.73L20.67 5.13996C20.7584 4.88789 20.7734 4.6159 20.7132 4.35565C20.653 4.09541 20.5201 3.85762 20.33 3.66996ZM4.85 9.57996L17.62 5.31996L10.53 12.41L4.85 9.57996ZM14.43 19.15L11.59 13.47L18.68 6.37996L14.43 19.15Z"
                fill="#FFFFFF"
              />{" "}
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
