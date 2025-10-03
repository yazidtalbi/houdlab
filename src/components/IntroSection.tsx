"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SplitType from "split-type";
import Lenis from "@studio-freight/lenis";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const people = [
  { src: "/avatars/a1.png", className: "top-0 left-1/4" },
  { src: "/avatars/a2.png", className: "top-12 right-20" },
  { src: "/avatars/a3.png", className: "bottom-20 left-12" },
  { src: "/avatars/yazid.jpg", className: "bottom-0 right-1/4" },
];

export default function IntroHero() {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // --- Smooth scroll (safe if you don't already init Lenis globally) ---
    // If you already have a global Lenis, remove this block.
    const lenis = new Lenis({ normalizeWheel: true });
    const onLenisScroll = () => ScrollTrigger.update();
    lenis.on("scroll", onLenisScroll);

    const raf = (time: number) => {
      lenis.raf(time);
      rafId.current = requestAnimationFrame(raf);
    };
    rafId.current = requestAnimationFrame(raf);

    // --- Reveal text setup (GSAP + SplitType) ---
    const splits: SplitType[] = [];
    const ctx = gsap.context(() => {
      const targets =
        sectionRef.current?.querySelectorAll(".reveal-type") ?? [];

      targets.forEach((el) => {
        const bg = (el as HTMLElement).dataset.bgColor ?? "#d4d4d4"; // light grey
        const fg = (el as HTMLElement).dataset.fgColor ?? "#111111"; // near-black

        const split = new SplitType(el as HTMLElement, {
          types: "words, chars",
          wordClass: "rt-word",
          charClass: "rt-char",
        });
        splits.push(split);

        gsap.fromTo(
          split.chars,
          { color: bg },
          {
            color: fg,
            duration: 0.3,
            stagger: 0.02,
            ease: "none",
            scrollTrigger: {
              trigger: el as Element,
              start: "top 80%",
              end: "top 20%",
              scrub: true,
              markers: false,
              toggleActions: "play play reverse reverse",
            },
          }
        );
      });
    }, sectionRef);

    return () => {
      ctx.revert();
      splits.forEach((s) => s.revert());
      if (rafId.current) cancelAnimationFrame(rafId.current);
      lenis.off("scroll", onLenisScroll);
      // @ts-ignore
      if (lenis.destroy) lenis.destroy();
      ScrollTrigger.killAll(false);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden py-32 text-center"
    >
      {/* Headline with reveal effect */}
      <h2
        className="reveal-type mx-auto max-w-xl text-2xl font-medium leading-relaxed text-neutral-800 md:max-w-4xl md:text-4xl md:leading-snug reveal-type text-balance"
        data-bg-color="#d4d4d4" // starting color (light grey)
        data-fg-color="#111111" // filled color (near black)
      >
        Over the past 12 years, we’ve perfected our Design & Development game
        and are eager to help passionate Founders perfect theirs. Success is a
        team play, right? Let’s aim for the top together!
      </h2>
    </section>
  );
}
