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

  // pause model
  const [userPaused, setUserPaused] = React.useState(false);
  const [autoPaused, setAutoPaused] = React.useState(false);
  const [suppressHoverPause, setSuppressHoverPause] = React.useState(false);
  const paused = userPaused || autoPaused;

  const [muted, setMuted] = React.useState(true);
  const [isVisible, setIsVisible] = React.useState(true);

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

  // visibility auto pause
  React.useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const io = new IntersectionObserver(
      (entries) => {
        const v = entries[0]?.isIntersecting ?? true;
        setIsVisible(v);
        setAutoPaused(v ? false : true);
      },
      { rootMargin: "0px", threshold: 0.25 }
    );
    io.observe(node);

    const onVis = () => setAutoPaused(document.hidden);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // hover pause (respects suppressHoverPause)
  React.useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const onEnter = () => {
      if (!suppressHoverPause) setAutoPaused(true);
    };
    const onLeave = () => {
      setAutoPaused(false);
      setSuppressHoverPause(false);
    };
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
  }, [suppressHoverPause]);

  const current = stories[index];
  const duration = current?.durationMs ?? defaultDurationMs;

  // autoplay
  React.useEffect(() => {
    if (paused || !isVisible || prefersReducedMotion) return;
    timerRef.current = window.setTimeout(() => go(1), duration);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [paused, isVisible, prefersReducedMotion, duration, go, index]);

  // reset video
  React.useEffect(() => {
    if (activeVideoRef.current) {
      activeVideoRef.current.pause();
      activeVideoRef.current.src = activeVideoRef.current.src;
    }
    activeVideoRef.current = null;
  }, [index]);

  // play/pause click
  const handlePlayPause = React.useCallback(() => {
    if (autoPaused) {
      setSuppressHoverPause(true);
      setAutoPaused(false);
      setUserPaused(false);
    } else {
      setUserPaused((p) => !p);
    }
  }, [autoPaused]);

  const renderSlide = (s: Story, active: boolean, slideIndex: number) => {
    const shouldRun = active && !paused && isVisible && !prefersReducedMotion;
    const isSecond = slideIndex === 1;

    return (
      <div
        className={[
          "absolute inset-0",
          isSecond ? "overflow-visible" : "overflow-hidden",
        ].join(" ")}
      >
        {s.type === "image" ? (
          <img
            src={s.src}
            alt={s.alt ?? s.caption ?? "Slide"}
            className={[
              "h-full w-full object-cover",
              isSecond ? "overflow-visible" : "overflow-hidden",
            ].join(" ")}
            style={
              active
                ? {
                    animationName: isSecond ? "kagePan" : "kageZoom",
                    animationDuration: `${duration}ms`,
                    animationTimingFunction: "linear",
                    animationFillMode: "forwards",
                    animationPlayState: shouldRun ? "running" : "paused",
                    transformOrigin: "center center",
                  }
                : undefined
            }
          />
        ) : null}
      </div>
    );
  };

  const prevIdx = (index - 1 + stories.length) % stories.length;
  const nextIdx = (index + 1) % stories.length;

  return (
    <div
      ref={containerRef}
      className={[
        "relative w-full aspect-[16/9] md:aspect-[21/9] overflow-hidden rounded-2xl border border-neutral-200 bg-white",
        className || "",
      ].join(" ")}
      aria-roledescription="carousel"
      aria-live="polite"
      style={{ ["--brand-amber" as any]: "#FABC4B" } as React.CSSProperties}
    >
      <style>{`
        @keyframes kageProgress { from{width:0%} to{width:100%} }

        @keyframes kageZoom {
          from { transform: scale(1); }
          to   { transform: scale(1.1); }
        }

        @keyframes kagePan {
          from { transform: scale(1.05) translateX(35%); }
          to   { transform: scale(1.05) translateX(-35%); }
        }
      `}</style>

      {/* slides */}
      <div className="relative h-full">
        <div key={stories[index]?.id} className="absolute inset-0">
          {renderSlide(stories[index]!, true, index)}
        </div>
        {stories.length > 1 && (
          <div
            key={"prev-" + stories[prevIdx].id}
            className="absolute inset-0 opacity-0 pointer-events-none"
          >
            {renderSlide(stories[prevIdx], false, prevIdx)}
          </div>
        )}
        {stories.length > 2 && (
          <div
            key={"next-" + stories[nextIdx].id}
            className="absolute inset-0 opacity-0 pointer-events-none"
          >
            {renderSlide(stories[nextIdx], false, nextIdx)}
          </div>
        )}
      </div>

      {/* progress bars */}
      <div className="absolute left-4 right-4 top-3 z-30 flex gap-2">
        {stories.map((s, i) => {
          const state = i < index ? "done" : i === index ? "active" : "todo";
          return (
            <div
              key={s.id}
              className="h-1 grow rounded-full bg-neutral-200/80 overflow-hidden"
              aria-hidden
            >
              <div
                className={[
                  "h-full rounded-full bg-gray-400/80",
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

      {/* brand badge */}
      <div className="absolute left-4 top-7 z-30 flex items-center gap-3 select-none">
        <div className="h-9 w-9 flex items-center justify-center bg-white rounded-full">
          <img
            src="/hyhy.png"
            alt="Houd Lab Logo"
            className="h-9 w-9 rounded-full object-contain p-1 border border-gray-200"
          />
        </div>
        <div className="flex gap-2">
          <div className="text-md font-medium text-neutral-800">houdlab</div>
          <div className="text-md text-neutral-400">1h</div>
        </div>
      </div>

      {/* controls — now z-50 so always on top */}
      <div className="absolute right-4 top-7 z-50 flex items-center gap-2">
        <button
          onClick={handlePlayPause}
          className="h-9 w-9 rounded-full bg-black/45 hover:bg-black/60 text-white backdrop-blur flex items-center justify-center pointer-events-auto"
          aria-label={paused ? "Play" : "Pause"}
          title={paused ? "Play" : "Pause"}
        >
          {paused ? <Play size={18} /> : <Pause size={18} />}
        </button>

        {current?.type === "video" && (
          <button
            onClick={() => setMuted((m) => !m)}
            className="h-9 w-9 rounded-full bg-black/45 hover:bg-black/60 text-white backdrop-blur flex items-center justify-center pointer-events-auto"
            aria-label={muted ? "Unmute" : "Mute"}
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        )}
      </div>

      {/* bottom caption + CTA */}
      <div className="absolute bottom-6 left-6 right-6 z-30">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-neutral-800 text-md font-medium truncate">
            {current?.caption ?? "—"}
          </h2>
          {"ctaHref" in current! && (current as any)?.ctaHref ? (
            <a
              href={(current as any).ctaHref}
              className="shrink-0 inline-flex items-center rounded-full bg-[var(--brand-amber)]/90 px-5 py-2 text-sm font-semibold text-neutral-900 transition hover:brightness-95"
            >
              {(current as any).ctaLabel ?? "Discover"}
            </a>
          ) : null}
        </div>
      </div>

      {/* hit areas — leave gap at top so controls clickable */}
      <button
        className="absolute top-24 bottom-0 left-0 w-1/3 z-20"
        onClick={() => go(-1)}
        aria-label="Previous slide"
      />
      <button
        className="absolute top-24 bottom-0 right-0 w-1/3 z-20"
        onClick={() => go(1)}
        aria-label="Next slide"
      />
    </div>
  );
}
