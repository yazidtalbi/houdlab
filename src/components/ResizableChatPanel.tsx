import { useEffect, useRef, useState } from "react";
import ChatPanel from "./ChatPanel";

const MIN_WIDTH = 280;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 320;
const STORAGE_KEY = "houdlab_chat_width";
const COLLAPSED_KEY = "houdlab_chat_collapsed";

export default function ResizableChatPanel({ leftOffset = 0 }: { leftOffset?: number }) {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 1024px)").matches
      : true
  );
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isCollapsed, setIsCollapsed] = useState(true); // Start collapsed by default
  const [isResizing, setIsResizing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showCollapsedBadge, setShowCollapsedBadge] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const handleChange = () => setIsDesktop(mq.matches);
    handleChange();
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  // Load saved width and collapsed state
  useEffect(() => {
    if (!isDesktop) return;
    if (typeof window !== "undefined" && !isInitialized) {
      const savedWidth = localStorage.getItem(STORAGE_KEY);
      const savedCollapsed = localStorage.getItem(COLLAPSED_KEY);
      
      let initialWidth = DEFAULT_WIDTH;
      if (savedWidth) {
        const parsedWidth = parseInt(savedWidth, 10);
        if (parsedWidth >= MIN_WIDTH && parsedWidth <= MAX_WIDTH) {
          initialWidth = parsedWidth;
          setWidth(parsedWidth);
        }
      }
      
      // Only use saved collapsed state if it exists, otherwise default to collapsed
      const initialCollapsed = savedCollapsed !== null ? savedCollapsed === "true" : true;
      setIsCollapsed(initialCollapsed);
      setIsInitialized(true);
      
      // Set initial margin
      const mainContent = document.getElementById("work-main-content");
      if (mainContent) {
        const base = initialCollapsed ? 0 : initialWidth;
        const offset = initialCollapsed ? 0 : leftOffset;
        mainContent.style.marginLeft = `${base + offset}px`;
      }
    }
  }, [isInitialized]);

  // Save width to localStorage
  useEffect(() => {
    if (!isDesktop) return;
    if (typeof window !== "undefined" && !isCollapsed) {
      localStorage.setItem(STORAGE_KEY, width.toString());
    }
  }, [width, isCollapsed, isDesktop]);

  // Save collapsed state
  useEffect(() => {
    if (!isDesktop) return;
    if (typeof window !== "undefined") {
      localStorage.setItem(COLLAPSED_KEY, isCollapsed.toString());
    }
  }, [isCollapsed, isDesktop]);

  // Update main content margin based on chat panel width (desktop only)
  useEffect(() => {
    if (!isDesktop) return;
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      const mainContent = document.getElementById("work-main-content");
      if (mainContent) {
        const marginLeft = isCollapsed ? 0 : width;
        const offset = isCollapsed ? 0 : leftOffset;
        mainContent.style.marginLeft = `${marginLeft + offset}px`;
        mainContent.style.transition = "margin-left 0.3s ease";
      }
    } else {
      // Reset margin on mobile
      const mainContent = document.getElementById("work-main-content");
      if (mainContent) {
        mainContent.style.marginLeft = "0px";
      }
    }
  }, [width, isCollapsed, leftOffset, isDesktop]);

  // Handle resize
  useEffect(() => {
    if (!isDesktop) return;
    if (!resizeRef.current || isCollapsed) return;

    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      // Calculate width from left edge (e.clientX is the mouse position from left)
      const newWidth = e.clientX;
      const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
      setWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    resizeRef.current.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      resizeRef.current?.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, isCollapsed, isDesktop]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  useEffect(() => {
    if (!isDesktop) return;
    const onAssistantMessage = () => {
      if (isCollapsed) setShowCollapsedBadge(true);
    };
    window.addEventListener("houd:chat:assistant", onAssistantMessage);
    return () => {
      window.removeEventListener("houd:chat:assistant", onAssistantMessage);
    };
  }, [isCollapsed, isDesktop]);

  useEffect(() => {
    if (!isCollapsed) setShowCollapsedBadge(false);
  }, [isCollapsed]);

  if (!isDesktop) return null;

  return (
    <>
      <aside
        ref={panelRef}
        className={`hidden lg:block fixed top-0 bottom-0 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/40 z-30 overflow-hidden transition-all duration-300 ${
          isCollapsed ? "w-0" : ""
        }`}
        style={{
          width: isCollapsed ? 0 : `${width}px`,
          left: `${leftOffset}px`,
        }}
        data-lenis-prevent
        data-lenis-prevent-wheel
        data-lenis-prevent-touch
      >
        <div className="h-full flex flex-col relative p-4">
          <div className="h-full overflow-y-auto">
            <ChatPanel className="flex-1 min-h-0" isWorkPage={true} onToggleCollapse={toggleCollapse} />
          </div>
        </div>
      </aside>

      {/* Resize Handle */}
      {!isCollapsed && (
        <div
          ref={resizeRef}
          className={`hidden lg:block fixed top-0 bottom-0 w-6 z-35 cursor-pointer hover:cursor-grab active:cursor-grabbing transition-colors ${
            isResizing ? "bg-neutral-400 cursor-grabbing" : "bg-transparent"
          }`}
          style={{
            left: `${leftOffset + width - 12}px`,
          }}
          data-lenis-prevent
          data-lenis-prevent-wheel
          data-lenis-prevent-touch
        >
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 hover:bg-neutral-300" />
        </div>
      )}

      {/* Collapsed Button (when collapsed) */}
      {isCollapsed && (
        <button
          onClick={toggleCollapse}
          className="hidden lg:flex fixed left-0 top-1/2 -translate-y-1/2 z-40 p-3 rounded-r-lg bg-white/90 hover:bg-white border border-l-0 border-neutral-200 shadow-sm transition-colors"
          aria-label="Expand chat"
          title="Expand chat"
        >
          {showCollapsedBadge && (
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
          )}
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
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      )}
    </>
  );
}

