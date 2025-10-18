"use client";

import * as React from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

type IconSlide = { src: string; alt?: string };
type IconSet = IconSlide[]; // slides for a single circle

export default function TrustedByIconsGrid({
  title = "Houd Lab®",
  lines = [
    "We are a design-driven lab from 🇲🇦 Morocco.",
    "We craft interfaces, identities, & experiences ",
    "that merge clarity, emotion, and precision.",
  ],
  groups,
  sizePx = 80, // circle size
  gapPx = 24, // space between circles
  intervalMs = 7500, // autoplay speed
}: {
  title?: string;
  lines?: string[];
  groups: IconSet[];
  sizePx?: number;
  gapPx?: number;
  intervalMs?: number;
}) {
  const sets = groups?.length ? groups : demoGroups;

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 text-center">
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-neutral-900">
        {title}
      </h1>

      <div className="mt-6 text-[18px] md:text-[20px] leading-snug text-neutral-800">
        {lines.map((l, i) => (
          <p key={i}>{l}</p>
        ))}
      </div>

      <p className="mt-10 text-xs font-medium tracking-[0.25em] text-neutral-400">
        TRUSTED BY
      </p>

      {/* Grid of independent icon-carousels */}
      <div
        className="mt-5 flex flex-wrap items-center justify-center"
        style={{ gap: gapPx }}
      >
        {sets.map((slides, idx) => (
          <CircleCarousel
            key={idx}
            slides={slides}
            size={sizePx}
            intervalMs={intervalMs}
            ariaLabel={`Brand ${idx + 1}`}
          />
        ))}
      </div>

      <div className="mt-20 text-[18px] md:text-[20px] leading-snug text-neutral-400">
        hello@houdlab.com
      </div>
    </section>
  );
}

/** One circular button with its own autoplay carousel. */
function CircleCarousel({
  slides,
  size = 80, // circle diameter
  intervalMs = 2500,
  ariaLabel,
}: {
  slides: IconSlide[];
  size?: number;
  intervalMs?: number;
  ariaLabel?: string;
}) {
  const [api, setApi] = React.useState<CarouselApi | null>(null);

  const next = React.useCallback(() => {
    if (!api) return;
    if (api.canScrollNext()) api.scrollNext();
    else api.scrollTo(0);
  }, [api]);

  React.useEffect(() => {
    if (!api) return;
    const id = setInterval(() => next(), intervalMs);
    return () => clearInterval(id);
  }, [api, next, intervalMs]);

  // icon box = % of circle (keeps perfect consistency)
  const iconPx = Math.round(size * 0.6);

  return (
    <Carousel
      opts={{ loop: true, dragFree: true }}
      setApi={setApi}
      className="relative overflow-hidden rounded-full ring-1 ring-neutral-200/80 bg-white grid place-items-center"
      style={{ width: size, height: size }}
    >
      {/* Click to advance */}
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={next}
        className="absolute inset-0 z-10 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
      />

      <CarouselContent className="h-full">
        {slides.map((icon, i) => (
          <CarouselItem
            key={icon.src + i}
            className="basis-full h-full grid place-items-center"
          >
            {/* Fixed icon box for perfect uniformity */}
            <div
              className="grid place-items-center"
              style={{ width: iconPx, height: iconPx }}
            >
              <img
                src={icon.src}
                alt={icon.alt ?? "brand logo"}
                className="block w-full h-full object-contain pointer-events-none select-none"
                style={{
                  transform: `scale(${icon.scale ?? 1})`,
                }} /* tweak per logo if needed */
                loading="lazy"
                draggable={false}
              />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}

/** Demo data — replace with your own */
const demoGroups: IconSet[] = [
  [
    { src: "/logos/k.png", alt: "Paper" },
    { src: "/brands/paper-alt.svg", alt: "Paper alt" },
  ],
  [
    { src: "/logos/p.png", alt: "Abstract" },
    { src: "/brands/abstract-alt.svg", alt: "Abstract alt" },
  ],
  [
    { src: "/brands/gem.svg", alt: "Gem" },
    { src: "/brands/gem-alt.svg", alt: "Gem alt" },
  ],
  [
    { src: "/brands/mono.svg", alt: "Mono" },
    { src: "/brands/mono-alt.svg", alt: "Mono alt" },
  ],
  [
    { src: "/brands/tile.svg", alt: "Tile" },
    { src: "/brands/tile-alt.svg", alt: "Tile alt" },
  ],
];
