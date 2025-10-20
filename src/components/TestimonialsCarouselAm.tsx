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
   *  e.g. "min-h-[200px] md:min-h-[220px]" */
  heightClass?: string;
};

export default function TestimonialsCarouselAm({
  items,
  className,
  loop = true,
  defaultDurationMs = 8500,
  // ❗ default: no max height; allow growth
  heightClass = "",
}: Props) {
  const [viewportRef, embla] = useEmblaCarousel({ loop, align: "start" });
  const [index, setIndex] = React.useState(0);
  const autoplayRef = React.useRef<number | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const scrollTo = React.useCallback(
    (i: number) => embla?.scrollTo(i),
    [embla]
  );
  const next = React.useCallback(() => embla?.scrollNext(), [embla]);
  const prev = React.useCallback(() => embla?.scrollPrev(), [embla]);

  React.useEffect(() => {
    if (!embla) return;
    const onSelect = () => setIndex(embla.selectedScrollSnap());
    embla.on("select", onSelect);
    onSelect();
    return () => embla.off("select", onSelect);
  }, [embla]);

  const startAutoplay = React.useCallback(() => {
    if (!embla) return;
    const i = embla.selectedScrollSnap();
    const duration = items[i]?.durationMs ?? defaultDurationMs;
    autoplayRef.current = window.setTimeout(() => {
      embla.canScrollNext() ? embla.scrollNext() : embla.scrollTo(0);
    }, duration);
  }, [embla, items, defaultDurationMs]);

  const stopAutoplay = React.useCallback(() => {
    if (autoplayRef.current) window.clearTimeout(autoplayRef.current);
    autoplayRef.current = null;
  }, []);

  React.useEffect(() => {
    if (!embla) return;
    startAutoplay();
    return stopAutoplay;
  }, [embla, index, startAutoplay, stopAutoplay]);

  // pause on hover/focus
  React.useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    node.addEventListener("mouseenter", stopAutoplay);
    node.addEventListener("mouseleave", startAutoplay);
    node.addEventListener("focusin", stopAutoplay);
    node.addEventListener("focusout", startAutoplay);
    return () => {
      node.removeEventListener("mouseenter", stopAutoplay);
      node.removeEventListener("mouseleave", startAutoplay);
      node.removeEventListener("focusin", stopAutoplay);
      node.removeEventListener("focusout", startAutoplay);
    };
  }, [startAutoplay, stopAutoplay]);

  // ✅ Re-init on resize so Embla recalculates slide heights
  React.useEffect(() => {
    if (!embla) return;
    const handler = () => embla.reInit();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [embla]);

  return (
    <div ref={containerRef} className={["relative", className || ""].join(" ")}>
      <div
        ref={viewportRef}
        className={["overflow-hidden", heightClass].join(" ")} // no max-h here
      >
        {/* ❗ remove h-full so height is content-driven */}
        <div className="flex items-stretch">
          {items.map((t, i) => (
            <div
              key={i}
              className="min-w-xl lg:min-w-0 shrink-0 grow-0 basis-full px-0  mr-4"
            >
              <TestimonialCard
                // no h-full; let the card define its natural height
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

      {/* controls/dots (positioned absolutely; don't affect height) */}
      {/* <button className="absolute left-2 top-1/2 -translate-y-1/2 ..." />
      <button className="absolute right-2 top-1/2 -translate-y-1/2 ..." />
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2" /> */}
    </div>
  );
}
