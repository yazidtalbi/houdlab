import * as React from "react";

type Props = {
  rating?: number; // 0–5
  scoreLabel?: string; // "5.0"
  quote: string | string[]; // one or multiple lines
  author: {
    name: string;
    title?: string;
    company?: string;
    avatarUrl?: string;
  };
  className?: string;
};

export default function TestimonialCard({
  rating = 5,
  scoreLabel = rating.toFixed(1),
  quote,
  author,
  className,
}: Props) {
  const lines = Array.isArray(quote) ? quote : [quote];

  return (
    <div
      className={[
        "w-full h-full rounded-2xl", // 👈 added w-full
        "border border-gray-200 bg-white/70",
        "p-4 md:p-6 flex flex-col",
        className || "",
      ].join(" ")}
      role="figure"
      aria-label={`Testimonial by ${author.name}`}
    >
      {/* header: score + stars */}
      <div className="flex items-center gap-4">
        <span className="text-xl font-semibold text-neutral-900">
          {scoreLabel}
        </span>
        <Stars rating={rating} />
      </div>

      {/* hairline */}
      <hr className="my-6 border-t border-black/10" />

      {/* quote */}
      <blockquote className="text-neutral-800/90  grow text-sm md:text-sm font-display tracking-normal leading-relaxed">
        {lines.map((l, i) => (
          <p key={i} className={i ? "mt-1.5" : undefined}>
            {l}
          </p>
        ))}
      </blockquote>

      {/* author */}
      <figcaption className="mt-5 flex items-center gap-3">
        <img
          src={
            author.avatarUrl ??
            "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=facearea&facepad=2&h=200"
          }
          alt=""
          className="h-10 w-10 rounded-full object-cover ring-2 ring-white/70"
          loading="lazy"
        />
        <div>
          <div className="font-semibold text-neutral-900">{author.name}</div>
          <div className="text-sm text-neutral-700/70">
            {[author.title, author.company].filter(Boolean).join(" · ")}
          </div>
        </div>
      </figcaption>
    </div>
  );
}

function Stars({ rating = 5 }: { rating?: number }) {
  const full = Math.round(rating); // simple whole-star fill for this style
  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={`${full} out of 5 stars`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className={`h-4 w-4 ${i < full ? "fill-[#FABC4B]" : "fill-white"}  `}
          aria-hidden="true"
        >
          <path d="M10 1.5l2.61 5.29 5.85.85-4.23 4.12 1 5.82L10 14.98 4.77 17.6l1-5.82-4.23-4.12 5.85-.85L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}
