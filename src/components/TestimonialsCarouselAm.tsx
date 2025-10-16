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
  durationMs?: number; // optional per-slide autoplay duration
};

type Props = {
  items: Testimonial[];
  className?: string;
  loop?: boolean;
  defaultDurationMs?: number; // 4500ms default
  heightClass?: string; // e.g. "h-[300px]"
};

export default function TestimonialsCarousel({
  items,
  className,
  loop = true,
  defaultDurationMs = 4500,
  heightClass = "max-h-[240px] min-h-[200px]",
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

  // sync selected index
  React.useEffect(() => {
    if (!embla) return;
    const onSelect = () => setIndex(embla.selectedScrollSnap());
    embla.on("select", onSelect);
    onSelect();
    return () => embla.off("select", onSelect);
  }, [embla]);

  // autoplay
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

  return (
    <div ref={containerRef} className={["relative", className || ""].join(" ")}>
      <div
        className={["overflow-hidden", heightClass].join(" ")}
        ref={viewportRef}
      >
        <div className="flex h-full">
          {items.map((t, i) => (
            <div key={i} className="min-w-0 shrink-0 grow-0 basis-full h-full">
              <TestimonialCard
                className="h-full overflow-hidden" /* <-- important */
                rating={t.rating}
                scoreLabel={t.scoreLabel}
                quote={t.quote}
                author={t.author}
              />
            </div>
          ))}
        </div>
      </div>

      {/* controls/dots should not affect height */}
      <button className="absolute left-2 top-1/2 -translate-y-1/2 ..." />
      <button className="absolute right-2 top-1/2 -translate-y-1/2 ..." />
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2" />
    </div>
  );
}
