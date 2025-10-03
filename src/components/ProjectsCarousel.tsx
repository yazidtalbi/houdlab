"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Autoplay from "embla-carousel-autoplay"; // ⬅️ import
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

type Project = {
  id: string | number;
  title: string;
  tag?: string;
  year?: string | number;
  image: string;
  href?: string;
};

export default function ProjectsCarousel({
  items,
  className,
  slideWidth = 888,
  gap = 24,
  loop = true,
  autoplayDelay = 8000, // default: 4s
}: {
  items: Project[];
  className?: string;
  slideWidth?: number;
  gap?: number;
  loop?: boolean;
  autoplayDelay?: number;
}) {
  const [api, setApi] = React.useState<CarouselApi | null>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);

  // track active index
  React.useEffect(() => {
    if (!api) return;
    const update = () => setActiveIndex(api.selectedScrollSnap());
    api.on("select", update);
    update();
    return () => {
      api.off("select", update);
    };
  }, [api]);

  return (
    <section
      className={cn("relative w-full pt-10 md:pt-32", className)}
      aria-label="Projects carousel"
    >
      <div className="mx-auto w-full max-w-[1800px]">
        <Carousel
          setApi={setApi}
          plugins={[
            Autoplay({ delay: autoplayDelay, stopOnInteraction: false }), // ⬅️ autoplay
          ]}
          opts={{
            align: "center",
            loop,
            containScroll: "trimSnaps",
          }}
          className="w-full"
        >
          <CarouselContent>
            {items.map((p, idx) => {
              const isActive = idx === activeIndex;
              return (
                <CarouselItem
                  key={p.id}
                  className={cn(
                    "group shrink-0",
                    "basis-[75vw] sm:basis-[65vw] md:basis-[55vw]", // ⬅️ smaller than before
                    `lg:basis-[${slideWidth - 200}px]`, // reduce desktop width
                    "mr-6"
                  )}
                  style={{ marginRight: `${gap}px` }}
                >
                  <article className="w-full">
                    <a
                      href={p.href ?? "#"}
                      className="block overflow-hidden rounded-2xl mb-5"
                    >
                      <div className="aspect-[16/9]">
                        <img
                          src={p.image}
                          alt={p.title}
                          className={cn(
                            "w-full h-full object-cover transition-all duration-500",
                            isActive ? "opacity-100" : "opacity-10"
                          )}
                          loading="lazy"
                        />
                      </div>
                    </a>

                    <div
                      className={cn(
                        "flex items-start justify-between transition-opacity duration-500",
                        isActive ? "opacity-100" : "opacity-0"
                      )}
                    >
                      <div className="pr-5">
                        <h3 className="text-[25px] leading-9 font-semibold mb-2 underline-offset-[6px] hover:underline">
                          <a href={p.href ?? "#"}>{p.title}</a>
                        </h3>
                        {p.tag && (
                          <div className="text-sm text-neutral-600">
                            <span>{p.tag}</span>
                          </div>
                        )}
                      </div>

                      {p.year && (
                        <div className="mt-1 text-sm text-neutral-600">
                          <span>{p.year}</span>
                        </div>
                      )}
                    </div>
                  </article>
                </CarouselItem>
              );
            })}
          </CarouselContent>

          {/* Custom nav */}
          <div className="mt-8 flex items-center justify-between px-1 md:px-2">
            <button
              className="inline-flex items-center gap-2 text-sm font-medium hover:opacity-80"
              onClick={() => api?.scrollPrev()}
              type="button"
            >
              <ChevronLeft className="h-5 w-5" />
              Previous
            </button>
            <button
              className="inline-flex items-center gap-2 text-sm font-medium hover:opacity-80"
              onClick={() => api?.scrollNext()}
              type="button"
            >
              NEXT
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </Carousel>
      </div>
    </section>
  );
}
