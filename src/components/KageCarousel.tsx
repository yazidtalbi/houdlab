import * as React from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";

type Story =
  | {
      id: string | number;
      type: "image";
      src: string;
      alt?: string;
      durationMs?: number;
      caption?: string;
      ctaLabel?: string;
      ctaHref?: string;
    }
  | {
      id: string | number;
      type: "video";
      src: string;
      poster?: string;
      durationMs?: number;
      caption?: string;
      ctaLabel?: string;
      ctaHref?: string;
    };

type Props = {
  stories: Story[];
  defaultDurationMs?: number;
  loop?: boolean;
  className?: string;
};

export default function KageCarousel({
  stories,
  defaultDurationMs = 4500,
  loop = true,
  className,
}: Props) {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [muted, setMuted] = React.useState(true);
  const [isVisible, setIsVisible] = React.useState(true); // intersection visibility

  const prefersReducedMotion = React.useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    []
  );

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const activeVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const timerRef = React.useRef<number | null>(null);

  const go = React.useCallback(
    (dir: 1 | -1) => {
      setIndex((i) => {
        const next = i + dir;
        if (loop) return (next + stories.length) % stories.length;
        return Math.max(0, Math.min(stories.length - 1, next));
      });
    },
    [stories.length, loop]
  );

  // Pause/play based on visibility (offscreen/tab hidden)
  React.useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const io = new IntersectionObserver(
      (entries) => {
        const v = entries[0]?.isIntersecting ?? true;
        setIsVisible(v);
      },
      { rootMargin: "0px", threshold: 0.25 }
    );
    io.observe(node);

    const onVis = () => setIsVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // Hover/focus pauses
  React.useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const onEnter = () => setPaused(true);
    const onLeave = () => setPaused(false);
    node.addEventListener("mouseenter", onEnter);
    node.addEventListener("mouseleave", onLeave);
    node.addEventListener("focusin", onEnter);
    node.addEventListener("focusout", onLeave);
    return () => {
      node.removeEventListener("mouseenter", onEnter);
      node.removeEventListener("mouseleave", onLeave);
      node.removeEventListener("focusin", onEnter);
      node.removeEventListener("focusout", onLeave);
    };
  }, []);

  const current = stories[index];
  const duration = current?.durationMs ?? defaultDurationMs;

  // Autoplay only when: not paused, visible, and user doesn’t prefer reduced motion
  React.useEffect(() => {
    if (paused || !isVisible || prefersReducedMotion) return;
    timerRef.current = window.setTimeout(() => go(1), duration);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [paused, isVisible, prefersReducedMotion, duration, go, index]);

  // Ensure only the active video is playing; stop/unload others
  React.useEffect(() => {
    // pause any previous
    if (activeVideoRef.current) {
      activeVideoRef.current.pause();
      // keep data usage low if we leave the slide
      activeVideoRef.current.src = activeVideoRef.current.src; // resets buffer
    }
    activeVideoRef.current = null;
  }, [index]);

  const renderSlide = (s: Story, active: boolean) => {
    const isVideo = s.type === "video";
    return (
      <div className="absolute inset-0">
        {s.type === "image" ? (
          <img
            src={s.src}
            alt={s.alt ?? s.caption ?? "Slide"}
            className="h-full w-full object-cover will-change-transform"
            loading="lazy"
            decoding="async"
            fetchPriority={active ? ("high" as any) : ("low" as any)}
          />
        ) : (
          <video
            ref={(el) => {
              if (el && active) {
                activeVideoRef.current = el;
                // Only start playing if allowed by visibility/paused state
                if (!paused && isVisible && !prefersReducedMotion) {
                  el.muted = true; // ensure autoplay works on iOS
                  el.play().catch(() => {
                    /* ignore */
                  });
                }
              }
            }}
            src={s.src}
            poster={s.poster}
            className="h-full w-full object-cover"
            muted={muted}
            playsInline
            // Crucial: don’t pre-buffer when not active
            preload={active ? "metadata" : "none"}
            controls={false}
            // We avoid loop to prevent runaway decode when tab hidden; we “loop” by timer/go()
            onEnded={() => go(1)}
          />
        )}
        {/* gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/5" />
      </div>
    );
  };

  // Only render current (and optionally neighbors for instant switch)
  const prevIdx = (index - 1 + stories.length) % stories.length;
  const nextIdx = (index + 1) % stories.length;

  return (
    <div
      ref={containerRef}
      className={[
        // ⬇️ remove h-full; give it an aspect ratio so the inner absolute fills it
        "relative rounded-2xl overflow-hidden group w-full aspect-[16/9] md:aspect-[21/9]",
        className || "",
      ].join(" ")}
      aria-roledescription="carousel"
    >
      {/* Progress keyframes once per component */}
      <style>{`@keyframes kageProgress { from{width:0%} to{width:100%} }`}</style>

      {/* Slides layer (only 1–3 nodes total) */}
      <div className="relative h-full">
        {/* current */}
        <div key={stories[index]?.id} className="absolute inset-0">
          {renderSlide(stories[index]!, true)}
        </div>
        {/* neighbors (optional, comment out if you want minimal DOM) */}
        {stories.length > 1 && (
          <div
            key={"prev-" + stories[prevIdx].id}
            className="absolute inset-0 opacity-0 pointer-events-none"
          >
            {renderSlide(stories[prevIdx], false)}
          </div>
        )}
        {stories.length > 2 && (
          <div
            key={"next-" + stories[nextIdx].id}
            className="absolute inset-0 opacity-0 pointer-events-none"
          >
            {renderSlide(stories[nextIdx], false)}
          </div>
        )}
      </div>

      {/* top progress bars */}
      <div className="absolute left-4 right-4 top-3 z-20 flex gap-2">
        {stories.map((s, i) => {
          const state = i < index ? "done" : i === index ? "active" : "todo";
          return (
            <div
              key={s.id}
              className="h-1 grow rounded-full bg-white/30 overflow-hidden"
              aria-hidden
            >
              <div
                className={[
                  "h-full rounded-full bg-white",
                  state === "done" && "w-full",
                  state === "todo" && "w-0",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={
                  state === "active" &&
                  !paused &&
                  isVisible &&
                  !prefersReducedMotion
                    ? {
                        animation: `kageProgress ${duration}ms linear forwards`,
                      }
                    : undefined
                }
              />
            </div>
          );
        })}
      </div>

      {/* controls */}
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <button
          onClick={() => setPaused((p) => !p)}
          className="h-9 w-9 rounded-full bg-black/45 hover:bg-black/60 text-white backdrop-blur flex items-center justify-center"
          aria-label={paused ? "Play" : "Pause"}
        >
          {paused ? <Play size={18} /> : <Pause size={18} />}
        </button>
        {current?.type === "video" && (
          <button
            onClick={() => setMuted((m) => !m)}
            className="h-9 w-9 rounded-full bg-black/45 hover:bg-black/60 text-white backdrop-blur flex items-center justify-center"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        )}
      </div>

      {/* bottom-left content */}
      <div className="absolute bottom-6 left-6 z-20 space-y-3 max-w-[80%]">
        <h2 className="text-white text-xl font-semibold drop-shadow">
          {current?.caption ?? "—"}
        </h2>
        {"ctaHref" in current! && current?.ctaHref ? (
          <a
            href={(current as any).ctaHref}
            className="inline-block rounded-full bg-white/90 px-5 py-2 text-sm font-medium text-neutral-900 shadow-md backdrop-blur transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-white/60"
          >
            {"ctaLabel" in current! && (current as any).ctaLabel
              ? (current as any).ctaLabel
              : "View case study"}
          </a>
        ) : null}
      </div>

      {/* next/prev hit areas */}
      <button
        className="absolute inset-y-0 left-0 w-1/3 z-10"
        onClick={() => go(-1)}
        aria-label="Previous"
      />
      <button
        className="absolute inset-y-0 right-0 w-1/3 z-10"
        onClick={() => go(1)}
        aria-label="Next"
      />
    </div>
  );
}
