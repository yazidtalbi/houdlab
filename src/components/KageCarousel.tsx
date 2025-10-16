import * as React from "react";
import useEmblaCarousel from "embla-carousel-react";
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
  defaultDurationMs?: number; // 4500 by default
  loop?: boolean; // true by default
  className?: string;
};

export default function KageCarousel({
  stories,
  defaultDurationMs = 4500,
  loop = true,
  className,
}: Props) {
  const [viewportRef] = useEmblaCarousel({
    loop,
    align: "start",
    watchDrag: true,
  });
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [muted, setMuted] = React.useState(true);

  const timerRef = React.useRef<number | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

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

  // autoplay
  React.useEffect(() => {
    if (paused) return;
    const duration = stories[index]?.durationMs ?? defaultDurationMs;
    timerRef.current = window.setTimeout(() => go(1), duration);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [index, stories, defaultDurationMs, go, paused]);

  // pause when hovered/focused
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
  const isVideo = current?.type === "video";
  const duration = current?.durationMs ?? defaultDurationMs;

  return (
    <div
      ref={containerRef}
      className={[
        "relative rounded-2xl overflow-hidden group h-full min-h-0",

        className || "",
      ].join(" ")}
    >
      {/* keyframes for progress bars */}
      <style>{`
        @keyframes kageProgress { from { width: 0% } to { width: 100% } }
      `}</style>

      {/* Slides */}
      <div className="h-full" ref={viewportRef as any}>
        <div
          className="flex h-full transition-transform duration-500 will-change-transform"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {stories.map((s) => (
            <div
              key={s.id}
              className="min-w-0 shrink-0 grow-0 basis-full h-full"
            >
              <div className="relative h-full">
                {s.type === "image" ? (
                  <img
                    src={s.src}
                    alt={s.alt ?? s.caption ?? "Slide"}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                ) : (
                  <video
                    src={s.src}
                    poster={s.poster}
                    className="absolute inset-0 h-full w-full object-cover"
                    muted={muted}
                    playsInline
                    autoPlay
                    loop
                  />
                )}
                {/* gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/5" />
              </div>
            </div>
          ))}
        </div>
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
                  state === "active"
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

      {/* controls (top-right) */}
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <button
          onClick={() => setPaused((p) => !p)}
          className="h-9 w-9 rounded-full bg-black/45 hover:bg-black/60 text-white backdrop-blur flex items-center justify-center"
          aria-label={paused ? "Play" : "Pause"}
        >
          {paused ? <Play size={18} /> : <Pause size={18} />}
        </button>
        {isVideo && (
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
            href={current!.ctaHref}
            className="inline-block rounded-full bg-white/90 px-5 py-2 text-sm font-medium text-neutral-900 shadow-md backdrop-blur transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-white/60"
          >
            {"ctaLabel" in current! && current?.ctaLabel
              ? current!.ctaLabel
              : "View case study"}
          </a>
        ) : null}
      </div>

      {/* next/prev hit areas (invisible, big for UX) */}
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
