"use client";
import * as React from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";

type Story =
  | {
      id: string | number;
      type: "image";
      src: string;
      alt?: string;
      durationMs?: number;
      caption?: string;
      /** optional CTA */
      ctaLabel?: string; // e.g. "View case study"
      ctaHref?: string; // e.g. "/projects/zemium"
      onCtaClick?: () => void; // alternative to ctaHref
    }
  | {
      id: string | number;
      type: "video";
      src: string;
      poster?: string;
      durationMs?: number;
      muted?: boolean;
      caption?: string;
      /** optional CTA */
      ctaLabel?: string;
      ctaHref?: string;
      onCtaClick?: () => void;
    };

export function ProjectsStories({
  items,
  className,
  aspect = 9 / 16,
  loop = true,
  defaultDelayMs = 5000,
  fullHeight = false,

  /** 🔧 NEW: styling hooks */
  mediaClassName = "object-cover object-center",
  captionWrapClassName = "bottom-6 px-8",
  captionTextClassName = "text-lg",
}: {
  items: Story[];
  className?: string;
  aspect?: number;
  loop?: boolean;
  defaultDelayMs?: number;
  fullHeight?: boolean;

  /** 🔧 NEW: pass Tailwind here to adjust fit/position & caption */
  mediaClassName?: string;
  captionWrapClassName?: string;
  captionTextClassName?: string;
}) {
  const [api, setApi] = React.useState<CarouselApi | null>(null);
  const [index, setIndex] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(true);
  const videoRefs = React.useRef<(HTMLVideoElement | null)[]>([]);
  const progressRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const imgTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!api) return;
    const onSelect = () => setIndex(api.selectedScrollSnap());
    api.on("select", onSelect);
    setIndex(api.selectedScrollSnap());
    return () => api.off("select", onSelect);
  }, [api]);

  React.useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      if (i === index) {
        v.muted = isMuted;
        if (!isPaused) v.play().catch(() => {});
        else v.pause();
      } else {
        v.pause();
        v.currentTime = 0;
      }
    });
  }, [index, isPaused, isMuted]);

  React.useEffect(() => {
    const bars = progressRefs.current;
    const cur = items[index];
    if (!cur) return;
    bars.forEach((el, i) => {
      if (!el) return;
      el.style.transition = "none";
      if (i < index) el.style.width = "100%";
      else if (i > index) el.style.width = "0%";
    });
    const el = bars[index];
    if (!el) return;
    const duration =
      (cur as any)?.durationMs ??
      (cur.type === "video"
        ? (videoRefs.current[index]?.duration || 0) * 1000 || defaultDelayMs
        : defaultDelayMs);
    el.style.transition = "none";
    el.style.width = "0%";
    const raf = requestAnimationFrame(() => {
      el.style.transition = `width ${Math.max(300, duration) / 1000}s linear`;
      el.style.width = isPaused ? "0%" : "100%";
    });
    return () => cancelAnimationFrame(raf);
  }, [index, isPaused, items, defaultDelayMs]);

  React.useEffect(() => {
    if (!api) return;
    const cur = items[index];
    if (imgTimerRef.current) {
      clearTimeout(imgTimerRef.current);
      imgTimerRef.current = null;
    }
    if (!cur || isPaused) return;
    if (cur.type === "image") {
      const delay = cur.durationMs ?? defaultDelayMs;
      imgTimerRef.current = window.setTimeout(() => api.scrollNext(), delay);
    }
    return () => {
      if (imgTimerRef.current) clearTimeout(imgTimerRef.current);
      imgTimerRef.current = null;
    };
  }, [api, items, index, isPaused, defaultDelayMs]);

  const handleEnded = React.useCallback(() => {
    if (!api || isPaused) return;
    api.scrollNext();
  }, [api, isPaused]);

  const goPrev = () => api?.scrollPrev();
  const goNext = () => api?.scrollNext();

  return (
    <div
      className={cn(
        "relative mx-auto w-full select-none overflow-hidden rounded-2xl border border-gray-200 bg-white/70",
        fullHeight && "h-full min-h-[400px]",
        className
      )}
    >
      <Carousel
        setApi={setApi}
        opts={{ loop, align: "start" }}
        className="w-full h-full"
      >
        {/* progress bars */}
        <div className="absolute left-0 right-0 top-4 z-20 flex gap-1 px-5">
          {items.map((_, i) => (
            <div
              key={i}
              className="h-1 w-full overflow-hidden rounded-full bg-white/30 backdrop-blur-[1px]"
            >
              <div
                ref={(el) => (progressRefs.current[i] = el)}
                className="h-full w-0 rounded-full bg-white"
              />
            </div>
          ))}
        </div>

        <CarouselContent
          className={cn(
            "rounded-[22px] border border-white/10 bg-black/20 shadow-2xl"
          )}
        >
          {items.map((item, i) => (
            <CarouselItem key={item.id} className="p-0 h-120">
              <div className="relative h-full w-full overflow-hidden  ">
                {item.type === "image" ? (
                  <img
                    src={item.src}
                    alt={item.alt ?? ""}
                    className={cn(mediaClassName)}
                    draggable={false}
                  />
                ) : (
                  <video
                    ref={(el) => (videoRefs.current[i] = el)}
                    className={cn("h-full w-full", mediaClassName)}
                    src={item.src}
                    poster={item.poster}
                    playsInline
                    muted={item.muted ?? isMuted}
                    preload="metadata"
                    onEnded={handleEnded}
                    controls={false}
                  />
                )}

                {/* gradients */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent" />

                {/* caption + CTA (adjustable) */}
                {(!!item.caption ||
                  (item as any).ctaHref ||
                  (item as any).onCtaClick) && (
                  <div
                    className={cn(
                      "absolute left-0 right-0 z-40 text-left space-y-2 pointer-events-auto flex-col",
                      captionWrapClassName
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!!item.caption && (
                      <p
                        className={cn(
                          "text-white/95 font-medium text-balance",
                          captionTextClassName
                        )}
                      >
                        {item.caption}
                      </p>
                    )}

                    {(item as any).ctaHref ? (
                      <a
                        href={(item as any).ctaHref}
                        className="inline-block rounded-full bg-white/90 px-5 py-2 text-sm font-medium text-neutral-900 shadow-md backdrop-blur transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-white/60"
                      >
                        {(item as any).ctaLabel ?? "View case study"}
                      </a>
                    ) : (item as any).onCtaClick ? (
                      <button
                        onClick={(item as any).onCtaClick}
                        className="inline-block rounded-full bg-white/90 px-5 py-2 text-sm font-medium text-neutral-900 shadow-md backdrop-blur transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-white/60"
                      >
                        {(item as any).ctaLabel ?? "View case study"}
                      </button>
                    ) : null}
                  </div>
                )}

                {/* tap zones */}
                <div className="absolute inset-0 z-30 flex pointer-events-none">
                  <button
                    aria-label="Previous"
                    onClick={goPrev}
                    className="h-full w-1/3 bg-transparent pointer-events-auto"
                  />
                  <button
                    aria-label="Pause/Play"
                    onClick={() => setIsPaused((p) => !p)}
                    className="h-full w-1/3 bg-transparent pointer-events-auto"
                  />
                  <button
                    aria-label="Next"
                    onClick={goNext}
                    className="h-full w-1/3 bg-transparent pointer-events-auto"
                  />
                </div>

                {/* controls */}
                <div className="absolute right-3 top-8 z-50 flex items-center gap-1">
                  <button
                    onClick={() => setIsPaused((p) => !p)}
                    className="rounded-full bg-white/15 p-2 backdrop-blur transition hover:bg-white/25"
                    aria-label={isPaused ? "Play" : "Pause"}
                  >
                    {isPaused ? (
                      <Play className="size-4 text-white" />
                    ) : (
                      <Pause className="size-4 text-white" />
                    )}
                  </button>
                  <button
                    onClick={() => setIsMuted((m) => !m)}
                    className="rounded-full bg-white/15 p-2 backdrop-blur transition hover:bg-white/25"
                    aria-label={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? (
                      <VolumeX className="size-4 text-white" />
                    ) : (
                      <Volume2 className="size-4 text-white" />
                    )}
                  </button>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}
