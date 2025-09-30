// src/components/ChatSheet.tsx
import * as React from "react";
import { MessageSquare, X } from "lucide-react";
import { Button } from "./ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "./ui/sheet";

const LAST_READ_KEY = "houdlab_chat_last_read_at_v1";
const LAST_ASSISTANT_KEY = "houdlab_chat_last_assistant_at_v1";

type ChatSheetProps = {
  children: React.ReactNode; // <ChatPanel />
  title?: string;
};

export default function ChatSheet({
  children,
  title = "Chat",
}: ChatSheetProps) {
  const [open, setOpen] = React.useState(false);
  const [hasUnread, setHasUnread] = React.useState(false);
  const scrollYRef = React.useRef(0);

  // --- helpers
  const computeUnread = React.useCallback(() => {
    try {
      const lastAssistant = localStorage.getItem(LAST_ASSISTANT_KEY);
      const lastRead = localStorage.getItem(LAST_READ_KEY);
      if (!lastAssistant) return false;
      if (!lastRead) return true;
      // compare ISO timestamps
      return new Date(lastAssistant).getTime() > new Date(lastRead).getTime();
    } catch {
      return false;
    }
  }, []);

  const markAsReadNow = React.useCallback(() => {
    try {
      localStorage.setItem(LAST_READ_KEY, new Date().toISOString());
    } catch {}
  }, []);

  // --- init + live updates
  React.useEffect(() => {
    // on mount, compute current state
    setHasUnread(computeUnread());

    // react immediately when ChatPanel dispatches an event
    const onAssistant = () => setHasUnread(computeUnread());
    window.addEventListener("houd:chat:assistant", onAssistant);

    // also listen to cross-tab/storage changes
    const onStorage = (e: StorageEvent) => {
      if (e.key === LAST_ASSISTANT_KEY || e.key === LAST_READ_KEY) {
        setHasUnread(computeUnread());
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("houd:chat:assistant", onAssistant);
      window.removeEventListener("storage", onStorage);
    };
  }, [computeUnread]);

  // --- open/close (Lenis freezing + mark as read when opening)
  React.useEffect(() => {
    const body = document.body;
    const html = document.documentElement as HTMLElement & {
      style: CSSStyleDeclaration;
    };
    const w = window as any;
    const lenis: any = w?.lenis;

    if (open) {
      // mark messages as read as soon as user opens the sheet
      markAsReadNow();
      setHasUnread(false);

      // 1) capture current scroll
      scrollYRef.current = window.scrollY || window.pageYOffset || 0;

      // 2) stop lenis without moving position
      if (lenis?.stop) lenis.stop();

      // 3) freeze the body at its current position (no jump)
      body.style.position = "fixed";
      body.style.top = `-${scrollYRef.current}px`;
      body.style.left = "0";
      body.style.right = "0";
      body.style.width = "100%";
      html.style.scrollbarGutter = "stable";
    } else {
      // 1) unfreeze body
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      (document.documentElement as any).style.scrollbarGutter = "";

      // 2) restore scroll position
      const y = scrollYRef.current;
      if (lenis?.start) {
        lenis.start();
        if (lenis?.scrollTo) lenis.scrollTo(y, { immediate: true });
        else window.scrollTo(0, y);
      } else {
        window.scrollTo(0, y);
      }
    }

    return () => {
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      (document.documentElement as any).style.scrollbarGutter = "";
      if ((window as any)?.lenis?.start) (window as any).lenis.start();
    };
  }, [open, markAsReadNow]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* Trigger (top-right) */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        {hasUnread && (
          <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
            New message
          </span>
        )}

        <SheetTrigger asChild>
          <button
            type="button"
            aria-label="Open chat"
            title="Open chat"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-black text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-black/20 !cursor-pointer"
          >
            <MessageSquare className="h-5 w-5 pointer-events-none" />
          </button>
        </SheetTrigger>
      </div>

      {/* Drawer: fixed 600px width + own scroller */}
      <SheetContent
        side="right"
        className="p-0 flex h-dvh flex-col overflow-hidden !w-[600px] !max-w-[600px]"
      >
        <SheetHeader className="border-b p-3 flex flex-row items-center gap-2">
          <SheetTitle className="text-sm font-medium">{title}</SheetTitle>
          <div className="ml-auto">
            <SheetClose asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close chat"
                title="Close chat"
                className="rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        {/* Inner scroller: isolate from Lenis */}
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          data-lenis-prevent
          data-lenis-prevent-wheel
          data-lenis-prevent-touch
        >
          {open ? children : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
