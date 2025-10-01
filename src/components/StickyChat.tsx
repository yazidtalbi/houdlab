import { useEffect, useLayoutEffect, useRef, useState } from "react";

type StickyChatProps = {
  /** Which element inside the chat marks “the bottom”? */
  inputSelector?: string; // default: [data-chat-input]
  /** Gap from viewport bottom when pinned */
  offsetBottom?: number; // px
  /** Max height for the pinned chat so it can scroll internally */
  pinnedMaxHeight?: number; // px
  children: React.ReactNode;
};

export default function StickyChat({
  inputSelector = "[data-chat-input]",
  offsetBottom = 16,
  pinnedMaxHeight = 560,
  children,
}: StickyChatProps) {
  const hostRef = useRef<HTMLDivElement>(null); // spacer wrapper
  const chatRef = useRef<HTMLDivElement>(null); // the thing we move/fix
  const [pinned, setPinned] = useState(false);
  const [fixedStyle, setFixedStyle] = useState<React.CSSProperties>({});

  // keep fixed width/left in sync
  const recalcFixedBox = () => {
    const el = chatRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setFixedStyle((s) => ({
      ...s,
      left: `${r.left}px`,
      width: `${r.width}px`,
    }));
  };

  useEffect(() => {
    if (!pinned) return;
    const onResize = () => recalcFixedBox();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pinned]);

  useLayoutEffect(() => {
    const el = chatRef.current!;
    const host = hostRef.current!;
    if (!el || !host) return;

    const inputEl = el.querySelector(inputSelector) as HTMLElement | null;
    if (!inputEl) return;

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // If the input is NOT fully visible, we pin.
        const fullyVisible =
          entry.isIntersecting && entry.intersectionRatio === 1;
        if (!fullyVisible && !pinned) {
          // Enter pinned
          const rect = el.getBoundingClientRect();
          setPinned(true);
          setFixedStyle({
            position: "fixed",
            bottom: `${offsetBottom}px`,
            left: `${rect.left}px`,
            width: `${rect.width}px`,
            zIndex: 40,
            maxHeight: `${pinnedMaxHeight}px`,
          });
          // Reserve space to prevent layout jump
          host.style.height = `${rect.height}px`;
        } else if (fullyVisible && pinned) {
          // Leave pinned
          setPinned(false);
          setFixedStyle({});
          host.style.height = "";
        }
      },
      {
        root: null,
        // We require the input to be fully inside the viewport, minus the offsetBottom.
        // The rootMargin pulls the "bottom boundary" up by offsetBottom.
        rootMargin: `0px 0px -${offsetBottom}px 0px`,
        threshold: 1, // fully visible
      }
    );

    io.observe(inputEl);
    return () => io.disconnect();
  }, [pinned, inputSelector, offsetBottom, pinnedMaxHeight]);

  return (
    <div ref={hostRef} className="relative">
      <div
        ref={chatRef}
        style={pinned ? fixedStyle : undefined}
        className={
          pinned ? "rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.08)]" : ""
        }
      >
        <div
          className={pinned ? "overflow-y-auto" : ""}
          style={pinned ? { maxHeight: fixedStyle.maxHeight } : undefined}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
