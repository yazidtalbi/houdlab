// src/components/ProjectShowcaseIsland.tsx
"use client";

import * as React from "react";

type Img = {
  src: string;
  alt?: string;
  className?: string;
  w?: number;
  h?: number;
  fetchPriority?: "high" | "low" | "auto";
};
type Row =
  | { variant: "regular"; image: Img }
  | { variant: "two"; left: Img; right: Img };

export default function ProjectShowcaseIsland({
  titleAr,
  subtitle,
  rows = [],
  className = "",
}: {
  titleAr?: string;
  subtitle?: string;
  rows: Row[];
  className?: string;
}) {
  const baseImg =
    "rounded-2xl border border-gray-200 bg-white/70 w-full h-auto object-cover " +
    "[content-visibility:auto] [contain-intrinsic-size:1000px_600px]";

  return (
    <section className={`max-w-6xl mx-auto ${className}`}>
      {(titleAr || subtitle) && (
        <section className="pt-26 pb-20 text-center">
          {titleAr && (
            <h2
              dir="rtl"
              lang="ar"
              className="font-[Amiri] text-3xl md:text-4xl font-medium leading-snug text-neutral-900 pb-14"
            >
              {titleAr}
            </h2>
          )}
          {subtitle && (
            <h2 className="text-2xl md:text-2xl font-normal max-w-xs mx-auto text-neutral-900 leading-snug">
              {subtitle}
            </h2>
          )}
        </section>
      )}

      <div className="flex flex-col gap-y-4">
        {rows.map((row, i) => {
          const ImgTag = ({
            img,
            sizes = "(min-width: 768px) 1100px, 100vw",
          }: {
            img: Img;
            sizes?: string;
          }) => (
            <img
              src={img.src}
              alt={img.alt ?? ""}
              loading="lazy"
              decoding="async"
              sizes={sizes}
              // If you know width/height, pass them in rows to avoid CLS:
              width={img.w}
              height={img.h}
              // Lower priority while inside modal:
              fetchPriority={img.fetchPriority ?? "low"}
              className={`${baseImg} ${img.className ?? ""}`}
            />
          );

          if (row.variant === "two") {
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" key={i}>
                <div>
                  <ImgTag
                    img={row.left}
                    sizes="(min-width: 768px) 540px, 100vw"
                  />
                </div>
                <div>
                  <ImgTag
                    img={row.right}
                    sizes="(min-width: 768px) 540px, 100vw"
                  />
                </div>
              </div>
            );
          }

          return (
            <div key={i}>
              <ImgTag img={row.image} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
