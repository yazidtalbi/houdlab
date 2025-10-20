// testimonialsMobile.tsx
// NOTE: Slides previously used right margins (mr-4) which, when combined with
// full-width slides inside a horizontal flex container, created horizontal
// overflow in some parent layouts (notably modals). We use internal padding
// (px-4) with box-border so each slide remains exactly 100% width and no
// cumulative overflow occurs.
import * as React from "react";
import useEmblaCarousel from "embla-carousel-react";
import TestimonialCard from "./TestimonialsCard";

export type Testimonial = {
  rating?: number;
  scoreLabel?: string;
  quote: string | string[];
  author: {
    name: string;
    title?: string;
    company?: string;
    avatarUrl?: string;
  };
  durationMs?: number;
};

type Props = {
  items: Testimonial[];
  className?: string;
  loop?: boolean;
  defaultDurationMs?: number;
  /** Use ONLY min-h utilities if you want a floor.
   *  e.g. "min-h-[200px] sm:min-h-[220px]" */
  heightClass?: string;
};

export default function TestimonialsCarouselAmMobile({
  items,
  className,
  loop = true,
  defaultDurationMs = 4500,
  heightClass = "",
}: Props) {
  // Mobile/tablet carousel — align to start, trim snaps so slides don't overscroll whitespace
  const [viewportRef, embla] = useEmblaCarousel({
    loop,
    align: "start",
    containScroll: "trimSnaps",
    dragFree: false,
  });

  const [index, setIndex] = React.useState(0);
  const autoplayRef = React.useRef<number | null>(null);
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  const scrollTo = React.useCallback(
    (i: number) => embla?.scrollTo(i),
    [embla]
  );

  // Update selected index
  React.useEffect(() => {
    if (!embla) return;
    const onSelect = () => setIndex(embla.selectedScrollSnap());
    embla.on("select", onSelect);
    onSelect();
    return () => embla.off("select", onSelect);
  }, [embla]);

  // Autoplay helpers
  const stopAutoplay = React.useCallback(() => {
    if (autoplayRef.current) window.clearTimeout(autoplayRef.current);
    autoplayRef.current = null;
  }, []);

  const startAutoplay = React.useCallback(() => {
    if (!embla) return;
    const i = embla.selectedScrollSnap();
    const duration = items[i]?.durationMs ?? defaultDurationMs;
    stopAutoplay();
    autoplayRef.current = window.setTimeout(() => {
      embla.canScrollNext() ? embla.scrollNext() : embla.scrollTo(0);
    }, duration);
  }, [embla, items, defaultDurationMs, stopAutoplay]);

  // Start/cleanup autoplay when index changes
  React.useEffect(() => {
    if (!embla) return;
    startAutoplay();
    return stopAutoplay;
  }, [embla, index, startAutoplay, stopAutoplay]);

  // Pause autoplay when the carousel is off-screen (IntersectionObserver)
  React.useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries[0]?.isIntersecting;
        if (visible) startAutoplay();
        else stopAutoplay();
      },
      { threshold: 0.25 }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [startAutoplay, stopAutoplay]);

  // Pause while the user is touching/dragging; resume after
  React.useEffect(() => {
    const vp = viewportRef.current as unknown as HTMLElement | null;
    if (!vp) return;

    const onDown = () => stopAutoplay();
    const onUp = () => startAutoplay();

    vp.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });

    return () => {
      vp.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [viewportRef, startAutoplay, stopAutoplay]);

  // Re-init on resize (mobile/tablet rotations)
  React.useEffect(() => {
    if (!embla) return;
    const handler = () => embla.reInit();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [embla]);

  return (
    <div
      ref={rootRef}
      className={[
        // rely on the parent “mother” container for horizontal padding
        // keep buttons/dots from affecting natural height
        "relative w-full",
        className || "",
      ].join(" ")}
      aria-roledescription="carousel"
      style={{
        width: "100%",
        maxWidth: "100%",
      }}
    >
      <div
        ref={viewportRef}
        className={["overflow-hidden", heightClass].join(" ")}
      >
        <div className="flex items-stretch">
          {items.map((t, i) => (
            <div
              key={i}
              // full-width slides; small gutter via px for mobile/tablet
              // use internal padding (box-border) instead of mr so slides remain exactly 100% wide
              className="w-full shrink-0 grow-0 basis-full mr-0"
            >
              <TestimonialCard
                className="overflow-hidden mr-4"
                rating={t.rating}
                scoreLabel={t.scoreLabel}
                quote={t.quote}
                author={t.author}
              />
            </div>
          ))}
        </div>
      </div>

      {/* dots — inline, safe-hit area for touch */}
      <div className="mt-4 ml-2 sm:mt-4 flex w-full items-start justify-start gap-2">
        {items.map((_, i) => {
          const active = i === index;
          return (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={[
                "h-2 w-2 rounded-full transition",
                active
                  ? "scale-110 bg-black"
                  : "bg-neutral-300 hover:bg-neutral-400",
              ].join(" ")}
            />
          );
        })}
      </div>
    </div>
  );
}
