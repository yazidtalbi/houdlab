"use client";

import * as React from "react";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

export type MarqueeItem = {
  rating: number;
  tags: string[];
  text: string;
  author: string;
  role: string;
  avatar?: string;
};

export type SimpleItem = {
  quote: string;
  name: string;
  role?: string;
  company?: string;
  avatar?: string;
};

export interface TestimonialsCarouselProps {
  items?: MarqueeItem[];
  testimonials?: SimpleItem[];
  className?: string;
  autoplay?: boolean;
  intervalMs?: number;
}

function Stars({ n }: { n: number }) {
  const max = 5;
  return (
    <div className="flex items-center gap-1">
      <span className="font-semibold pr-2">{n.toFixed(1)}</span>
      {Array.from({ length: max }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className={cn("h-4 w-4", i < n ? "fill-[#FABC4B]" : "fill-gray-300")}
        >
          <path d="M10 1.5 12.7 7l6 .9-4.3 4.2 1 6-5.4-2.9L4.6 18l1-6L1.3 7.9 7.3 7 10 1.5z" />
        </svg>
      ))}
    </div>
  );
}

export default function TestimonialsCarousel({
  items,
  testimonials,
  className,
  autoplay = true,
  intervalMs = 6000,
}: TestimonialsCarouselProps) {
  const [api, setApi] = React.useState<CarouselApi | null>(null);
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  const data: MarqueeItem[] = React.useMemo(() => {
    if (items?.length) return items;
    if (testimonials?.length)
      return testimonials.map((t) => ({
        rating: 5,
        tags: [],
        text: t.quote,
        author: t.name,
        role: [t.role, t.company].filter(Boolean).join(" · "),
        avatar: t.avatar,
      }));
    return [];
  }, [items, testimonials]);

  return (
    <div className={cn("relative", className)}>
      <Carousel
        setApi={setApi}
        opts={{ align: "center", loop: true }}
        plugins={
          autoplay
            ? [Autoplay({ delay: intervalMs, stopOnInteraction: true })]
            : []
        }
        className="w-full"
      >
        <CarouselContent className="-ml-2">
          {data.map((t, i) => (
            <CarouselItem key={i} className="pl-2 md:basis-full lg:basis-full">
              <article className="w-full mx-auto shrink-0 rounded-2xl border border-gray-200 bg-white/70 p-4 md:p-6 flex flex-col  min-h-[-webkit-fill-available]">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xl">
                    <Stars n={t.rating} />
                  </div>
                  <hr className="opacity-70 my-4 " />
                  <div className="flex gap-2 flex-wrap">
                    {t.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-sm px-3   rounded-full border border-gray-300 bg-white text-gray-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <p className="text-sm md:text-sm font-display tracking-normal leading-relaxed  pb-4">
                    {t.text}
                  </p>
                </div>

                <div className="mt-auto flex items-center gap-3">
                  {t.avatar ? (
                    <img
                      src={t.avatar}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-neutral-200" />
                  )}
                  <div>
                    <div className="font-medium">{t.author}</div>
                    <div className="text-xs opacity-60">{t.role}</div>
                  </div>
                </div>
              </article>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}
