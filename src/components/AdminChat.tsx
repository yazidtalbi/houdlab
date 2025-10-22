import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "../lib/supabaseBrowser";
import DashboardAvailabilityToggle from "./DashboardAvailabilityToggle";
import LiveClock from "./LiveClock";
import { Loader } from "lucide-react";

type Conv = {
  id: string;
  created_at: string;
  origin?: string | null;
  ip?: string | null;
  user_agent?: string | null;
  last?: { text: string; created_at: string; role: string } | null;
};

type Agent = { id: string; name: string; avatar_url?: string | null };
type Msg = { id: string; role: "user" | "assistant"; text: string; at: string };

function toTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AdminPanel() {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conv | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");

  // NEW: mobile drawer state
  const [listOpen, setListOpen] = useState(false);

  // Optional: lock body scroll when drawer is open
  useEffect(() => {
    if (listOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [listOpen]);

  // URL param remembered before fetch to avoid race on hard refresh
  const [initialConvFromUrl, setInitialConvFromUrl] = useState<string | null>(
    null
  );

  // typing state (user typing indicator in admin view)
  const [userTyping, setUserTyping] = useState(false);

  // de-dupe + plumbing
  const seenIds = useRef<Set<string>>(new Set());
  const lastSeenIso = useRef<string | null>(null);
  const tempToDb = useRef<Map<string, string>>(new Map());
  const listRef = useRef<HTMLDivElement>(null);

  // typing broadcast channel refs
  const typingChanRef = useRef<ReturnType<
    typeof supabaseBrowser.channel
  > | null>(null);
  const typingExpireTimer = useRef<number | null>(null);
  const lastTypingSentAt = useRef<number>(0);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

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
      add.push({ id, role: m.role, text: m.text, at: toTime(m.created_at) });
    }
    if (add.length) {
      setMsgs((prev) => [...prev, ...add]);
      lastSeenIso.current = list[list.length - 1].created_at;
      if (list[list.length - 1].role === "user") setUserTyping(false);
      scrollToBottom();
    }
  }

  async function loadAgents() {
    try {
      const r = await fetch("/api/admin/agents");
      const j = await r.json();
      setAgents(j.agents || []);
      if (!selectedAgentId && j.agents?.length)
        setSelectedAgentId(j.agents[0].id);
    } catch (e) {
      console.warn("[admin] loadAgents error", e);
    }
  }

  async function loadConversations(q?: string, preferId?: string) {
    const r = await fetch(
      `/api/admin/conversations${q ? `?q=${encodeURIComponent(q)}` : ""}`
    );
    const j = await r.json();
    if (j.error) {
      console.error("/api/admin/conversations error:", j.error);
      setStatus(`Conversations error: ${j.error}`);
      setConvs([]);
      return;
    }
    const list: Conv[] = j.conversations || [];
    setConvs(list);

    // prefer selecting convo from URL param (works on hard refresh too)
    if (preferId) {
      const found = list.find((c) => c.id === preferId);
      if (found) {
        setSelectedConv(found);
        const sp = new URLSearchParams(window.location.search);
        sp.set("c", found.id);
        history.replaceState({}, "", `${location.pathname}?${sp.toString()}`);
        return;
      }
    }

    // default: first convo
    if (!selectedConv && list.length) {
      setSelectedConv(list[0]);
      const sp = new URLSearchParams(window.location.search);
      sp.set("c", list[0].id);
      history.replaceState({}, "", `${location.pathname}?${sp.toString()}`);
    }
  }

  useEffect(() => {
    // Capture URL param BEFORE fetching to avoid race on hard refresh
    const sp = new URLSearchParams(window.location.search);
    const id = sp.get("c") || sp.get("conversation");
    setInitialConvFromUrl(id);

    loadAgents();
    loadConversations(undefined, id || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep selection in sync when user navigates back/forward (optional)
  useEffect(() => {
    const onPop = () => {
      const sp = new URLSearchParams(window.location.search);
      const id = sp.get("c") || sp.get("conversation");
      if (!id) return;
      if (!convs.length) return;
      const found = convs.find((c) => c.id === id);
      if (found) setSelectedConv(found);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [convs]);

  // Load history for selected conversation
  async function loadHistory(convId: string) {
    setStatus("Loading history…");
    try {
      const r = await fetch(
        `/api/chat/history?conversationId=${encodeURIComponent(convId)}`
      );
      const j = await r.json();
      if (j.error) {
        setStatus(`History error: ${j.error}`);
        setMsgs([]);
        return;
      }
      const list: any[] = j.messages || [];
      const mapped = list.map((x) => ({
        id: String(x.id),
        role: (x.role === "agent" ? "assistant" : "user") as
          | "user"
          | "assistant",
        text: String(x.text),
        created_at: String(x.created_at),
      }));
      seenIds.current = new Set(mapped.map((m) => m.id));
      lastSeenIso.current = mapped.length
        ? mapped[mapped.length - 1].created_at
        : null;
      setMsgs(
        mapped.map((m) => ({
          id: m.id,
          role: m.role,
          text: m.text,
          at: toTime(m.created_at),
        }))
      );
      setStatus("");
      scrollToBottom();
    } catch (e: any) {
      setStatus(`History error: ${e?.message || e}`);
    }
  }

  useEffect(() => {
    if (selectedConv) loadHistory(selectedConv.id);
  }, [selectedConv?.id]);

  // Realtime + typing + polling (admin view)
  useEffect(() => {
    if (!selectedConv) return;
    let stop = false;
    const convId = selectedConv.id;

    // realtime new inserts
    const ch = supabaseBrowser
      .channel(`admin:${convId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${convId}`,
        },
        (payload) => {
          const row: any = payload.new;
          const dbId = String(row.id);
          if (seenIds.current.has(dbId)) return;
          for (const [, v] of tempToDb.current.entries()) {
            if (v === dbId) return;
          }
          seenIds.current.add(dbId);

          const role: "user" | "assistant" =
            row.role === "agent" ? "assistant" : "user";
          setMsgs((prev) => [
            ...prev,
            {
              id: dbId,
              role,
              text: String(row.text),
              at: toTime(String(row.created_at)),
            },
          ]);
          lastSeenIso.current = String(row.created_at);
          if (role === "user") setUserTyping(false);
          scrollToBottom();
        }
      )
      .subscribe();

    // typing broadcast (listen to user typing)
    const typingChan = supabaseBrowser.channel(`typing:${convId}`, {
      config: { broadcast: { self: false } },
    });
    typingChan
      .on("broadcast", { event: "typing" }, (payload) => {
        const p: any = payload?.payload || {};
        if (p.from === "user") {
          setUserTyping(!!p.active);
          if (typingExpireTimer.current)
            window.clearTimeout(typingExpireTimer.current);
          typingExpireTimer.current = window.setTimeout(
            () => setUserTyping(false),
            2500
          );
        }
      })
      .subscribe();
    typingChanRef.current = typingChan;

    // lightweight polling fallback
    const poll = async () => {
      if (stop) return;
      try {
        const since = lastSeenIso.current
          ? `&since=${encodeURIComponent(lastSeenIso.current)}`
          : "";
        const r = await fetch(
          `/api/chat/history?conversationId=${encodeURIComponent(
            convId
          )}${since}`
        );
        const j = await r.json();
        const list: any[] = j.messages || [];
        if (list.length) {
          appendUnique(
            list.map((m) => ({
              id: String(m.id),
              role: (m.role === "agent" ? "assistant" : "user") as
                | "user"
                | "assistant",
              text: String(m.text),
              created_at: String(m.created_at),
            }))
          );
        }
      } catch (e) {
        console.warn("[admin poll error]", e);
      }
      setTimeout(poll, 2000);
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
  }, [selectedConv?.id]);

  // emit typing as agent
  function emitTyping(active: boolean) {
    if (!typingChanRef.current) return;
    const now = Date.now();
    if (active && now - lastTypingSentAt.current < 800) return; // throttle
    lastTypingSentAt.current = now;
    typingChanRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { from: "agent", active },
    });
  }

  async function sendAgent() {
    const text = input.trim();
    if (!text || !selectedConv || !selectedAgentId) return;

    // optimistic
    const tempId = crypto.randomUUID();
    setMsgs((prev) => [
      ...prev,
      {
        id: tempId,
        role: "assistant",
        text,
        at: toTime(new Date().toISOString()),
      },
    ]);
    seenIds.current.add(tempId);
    setInput("");
    emitTyping(false);
    scrollToBottom();

    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          conversationId: selectedConv.id,
          role: "agent",
          text,
          agent_id: selectedAgentId,
        }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok || !data?.message?.id) {
        console.error("[admin send] server error:", data?.error || res.status);
        setStatus(`Send failed: ${data?.error || res.status}`);
        return;
      }
      const dbId = String(data.message.id);
      const dbAt = toTime(String(data.message.created_at));
      tempToDb.current.set(tempId, dbId);
      seenIds.current.add(dbId);
      seenIds.current.delete(tempId);
      setMsgs((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, id: dbId, at: dbAt } : m))
      );
      setStatus("");
    } catch (e: any) {
      console.error("[admin send] fetch error:", e?.message || e);
      setStatus(`Send failed: ${e?.message || e}`);
    }
  }

  const header = useMemo(
    () => (
      <div className="flex items-center gap-3 p-3 border-b bg-white sticky top-0 z-10 h-16">
        <div className=" flex gap-2 w-full">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" &&
              loadConversations(search, initialConvFromUrl || undefined)
            }
            placeholder="Search a conversation.."
            className="px-3 py-1.5 rounded border w-full"
          />
          <button
            onClick={() =>
              loadConversations(search, initialConvFromUrl || undefined)
            }
            className="px-3 py-1.5 rounded bg-black text-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              class="bi bi-search"
              viewBox="0 0 16 16"
            >
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0" />
            </svg>
          </button>
        </div>
      </div>
    ),
    [search, initialConvFromUrl]
  );

  function DoubleCheckIcon({ className = "" }: { className?: string }) {
    // Simple WhatsApp-style double check
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={`h-4 w-4 ${className}`}
      >
        <path
          d="M1.7 13.2l3.7 3.7 7.1-7.1M8.4 16l1.7 1.7 7.9-7.9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <>
      <div className="h-dvh grid grid-cols-12 overflow-hidden font-display">
        {/* Left: conversations list */}
        {/* Left: sidebar (toggle) + conversations list */}
        <div className="col-span-4 bg-white min-h-0 overflow-hidden hidden md:block">
          <div className="grid h-full grid-cols-[110px_1fr]">
            {/* Sidebar */}
            <aside className="border-r bg-white p-3 flex flex-col gap-3 ">
              <header className="self-center mt-2 ">
                <img
                  src="../hyhy.png"
                  w
                  alt="Houd Lab Logo"
                  className="h-12 w-auto transition-transform duration-300 group-hover:scale-105"
                />
              </header>

              <div className="text-sm font-semibold text-center">
                Houd Lab
                <br />
                <p className="text-[#FABC4B]  font-[Amiri] ">مقر رئيسي</p>
              </div>

              <div className="mt-auto pb-">
                <div className="mt-4">
                  <DashboardAvailabilityToggle />
                </div>
                <hr className="mt-4 mx-4" />
                <div className="mt-4">
                  {" "}
                  <LiveClock timeZone="Africa/Casablanca" />
                </div>
              </div>
            </aside>

            {/* Conversations area */}
            <section className="flex flex-col min-h-0 overflow-hidden border-r">
              {header}
              <div className="flex-1 overflow-y-auto">
                {convs.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedConv(c);
                      const sp = new URLSearchParams(window.location.search);
                      sp.set("c", c.id);
                      history.replaceState(
                        {},
                        "",
                        `${location.pathname}?${sp.toString()}`
                      );
                    }}
                    className={`w-full text-left px-3 py-3 border-b hover:bg-neutral-50 ${
                      selectedConv?.id === c.id ? "bg-neutral-100" : ""
                    }`}
                  >
                    <div className="text-xs text-neutral-500">
                      {new Date(c.created_at).toLocaleString()}
                    </div>

                    <div className="font-medium truncate flex items-center gap-1.5">
                      {/* Show double check only when last message wasn't from the agent */}
                      {c.last?.role !== "agent" && c.last?.text ? (
                        <Loader
                          size={16}
                          strokeWidth={3}
                          className="text-[#FABC4B] "
                        />
                      ) : null}

                      {/* Highlight yellow if last message was from the user */}
                      <span
                        className={`truncate font-normal ${
                          c.last?.role !== "agent"
                            ? "text-black font-medium"
                            : "text-neutral-400"
                        }`}
                      >
                        {c.last?.text || "(no messages yet)"}
                      </span>
                    </div>
                  </button>
                ))}
                {!convs.length && (
                  <div className="p-6 text-sm text-neutral-500">
                    No conversations found.
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* Right: messages + composer */}
        <div className="col-span-12 md:col-span-8 flex flex-col min-h-0 overflow-hidden">
          <div className="p-3 border-b bg-white flex items-center gap-3 shrink-0 h-16">
            {/* Mobile: open drawer button */}
            <button
              type="button"
              onClick={() => setListOpen(true)}
              className="md:hidden inline-flex items-center justify-center rounded-md border px-2.5 py-1.5"
              aria-label="Open conversations"
            >
              {/* simple hamburger */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 6h16M4 12h16M4 18h16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <div className="text-sm text-neutral-500">Conversation</div>
            <div className="font-medium truncate">
              {selectedConv?.id || "—"}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <label className="text-sm text-neutral-600">Agent</label>
              <select
                value={selectedAgentId ?? ""}
                onChange={(e) => setSelectedAgentId(e.target.value || null)}
                className="border rounded px-2 py-1"
              >
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            ref={listRef}
            className="flex-1 overflow-y-auto p-4 bg-neutral-50"
          >
            {msgs.map((m) =>
              m.role === "assistant" ? (
                <div key={m.id} className="mb-4 flex items-start gap-3">
                  <img
                    src="/avatars/yazid.jpg"
                    alt=""
                    className="h-8 w-8 rounded-full object-cover ring-1 ring-neutral-200"
                  />
                  <div>
                    <div className="mb-1 text-xs font-medium text-neutral-500">
                      Yazid from HoudLab
                    </div>
                    <div className="inline-block max-w-[68ch] rounded-2xl rounded-tl-md bg-white px-4 py-2 shadow-sm ring-1 ring-neutral-200">
                      {m.text}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">{m.at}</div>
                  </div>
                </div>
              ) : (
                <div
                  key={m.id}
                  className="mb-4 flex flex-row-reverse items-start gap-3"
                >
                  <div>
                    <div className="inline-block max-w-[68ch] rounded-2xl rounded-tr-md bg-neutral-900 text-white px-4 py-2 shadow-sm">
                      {m.text}
                    </div>
                    <div className="mt-1 text-right text-xs text-neutral-500">
                      {m.at}
                    </div>
                  </div>
                </div>
              )
            )}

            {/* User typing bubble (appears after last message) */}
            {userTyping && (
              <div className="mb-4 flex flex-row-reverse items-start gap-3">
                <div>
                  <div className="inline-block rounded-2xl rounded-tr-md bg-neutral-900 text-white px-4 py-2 shadow-sm">
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

          <div className="p-3 border-t bg-white shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendAgent();
              }}
              className="flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  // emit agent typing while there's text
                  const active = !!e.target.value.trim();
                  if (active) {
                    const now = Date.now();
                    if (now - (lastTypingSentAt.current || 0) > 800) {
                      emitTyping(true);
                    }
                  } else {
                    emitTyping(false);
                  }
                }}
                onBlur={() => emitTyping(false)}
                placeholder="Reply as selected agent…"
                className="flex-1 border rounded-full px-4 py-2"
              />
              <button
                className="px-4 py-2 rounded-full bg-black text-white"
                disabled={!input.trim() || !selectedConv || !selectedAgentId}
              >
                Send
              </button>
            </form>
            {status && (
              <div className="mt-2 text-xs text-red-600">{status}</div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {listOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Overlay */}
          <button
            className="absolute inset-0 bg-black/40"
            aria-label="Close conversations"
            onClick={() => setListOpen(false)}
          />
          {/* Panel */}
          <div
            role="dialog"
            aria-modal="true"
            className="absolute inset-y-0 left-0 w-[88%] max-w-[360px] bg-white shadow-xl ring-1 ring-black/5
                 translate-x-0 transition-transform duration-200 ease-out"
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between p-3 border-b">
              <div className="font-medium">Conversations</div>
              <button
                onClick={() => setListOpen(false)}
                className="inline-flex items-center justify-center rounded-md border px-2 py-1"
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            {/* Drawer content: reuse your header + list */}
            {/* Drawer content: SIDEBAR + SEARCH + LIST */}
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              {/* --- Sidebar chunk (from your left column), compact for mobile --- */}
              {/* --- Sidebar chunk (mobile-friendly) --- */}
              <div className="shrink-0 border-b bg-white p-4">
                <header className="flex items-center justify-between">
                  {/* Left: logo + name */}
                  <div className="flex items-center gap-2">
                    <img
                      src="../hyhy.png"
                      alt="Houd Lab Logo"
                      className="h-10 w-auto"
                    />
                    <div className="text-sm font-semibold leading-tight">
                      Houd Lab
                      <br />
                      <span className="text-[#FABC4B] font-[Amiri]">
                        مقر رئيسي
                      </span>
                    </div>
                  </div>

                  {/* Right: availability pill (flexed on same line) */}
                  <div className="flex-shrink-0">
                    <DashboardAvailabilityToggle />
                  </div>
                </header>

                {/* Hidden clock on mobile, visible md+ */}
                <div className="mt-4 hidden md:block">
                  <hr className="my-4" />
                  <LiveClock timeZone="Africa/Casablanca" />
                </div>
              </div>

              {/* --- Search bar (reuse your `header` JSX) --- */}
              <div className="shrink-0 border-b bg-white">{header}</div>

              {/* --- Conversations list (same mapping as desktop) --- */}
              <div className="flex-1 overflow-y-auto">
                {convs.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedConv(c);
                      const sp = new URLSearchParams(window.location.search);
                      sp.set("c", c.id);
                      history.replaceState(
                        {},
                        "",
                        `${location.pathname}?${sp.toString()}`
                      );
                      setListOpen(false); // CLOSE drawer after select
                    }}
                    className={`w-full text-left px-3 py-3 border-b hover:bg-neutral-50 ${
                      selectedConv?.id === c.id ? "bg-neutral-100" : ""
                    }`}
                  >
                    <div className="text-xs text-neutral-500">
                      {new Date(c.created_at).toLocaleString()}
                    </div>

                    <div className="font-medium truncate flex items-center gap-1.5">
                      {c.last?.role !== "agent" && c.last?.text ? (
                        <Loader
                          size={16}
                          strokeWidth={3}
                          className="text-[#FABC4B]"
                        />
                      ) : null}
                      <span
                        className={`truncate font-normal ${
                          c.last?.role !== "agent"
                            ? "text-black font-medium"
                            : "text-neutral-400"
                        }`}
                      >
                        {c.last?.text || "(no messages yet)"}
                      </span>
                    </div>
                  </button>
                ))}
                {!convs.length && (
                  <div className="p-6 text-sm text-neutral-500">
                    No conversations found.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
