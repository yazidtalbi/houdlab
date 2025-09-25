import React from "react";

type Testimonial = {
  rating: number;
  tags: string[];
  text: string;
  author: string;
  role: string;
  avatar?: string;
};

const ITEMS: Testimonial[] = [
  {
    rating: 5,
    tags: ["Retail", "Ongoing"],
    text: "The client is proud of Houd Lab's work, which their customers praised. Communication was always clear and fast.",
    author: "Atif Hussain",
    role: "Co-Founder at Kinetik",
    avatar: "/avatars/atif.jpg",
  },
  {
    rating: 5,
    tags: ["SaaS"],
    text: "From scope to visuals in days. Exactly the velocity we needed.",
    author: "Sara B.",
    role: "Brand Lead",
  },
  {
    rating: 5,
    tags: ["Fintech"],
    text: "They turned vague goals into a crisp, actionable roadmap.",
    author: "Youssef L.",
    role: "PM",
  },
  // add more…
];

function Stars({ n }: { n: number }) {
  return (
    <div className="flex items-center gap-1">
      <span className="font-semibold">{n.toFixed(1)}</span>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 20 20" className="h-4 w-4 fill-current">
          <path d="M10 1.5 12.7 7l6 .9-4.3 4.2 1 6-5.4-2.9L4.6 18l1-6L1.3 7.9 7.3 7 10 1.5z" />
        </svg>
      ))}
    </div>
  );
}

export default function TestimonialsMarquee() {
  // duplicate items so the loop is seamless
  const row = [...ITEMS, ...ITEMS];

  return (
    <section
      aria-label="Client testimonials"
      className="group relative overflow-hidden"
      // subtle edge fade like your mock
      style={{
        WebkitMaskImage:
          "linear-gradient(90deg, transparent 0, black 6%, black 94%, transparent 100%)",
        maskImage:
          "linear-gradient(90deg, transparent 0, black 6%, black 94%, transparent 100%)",
      }}
    >
      {/* animation duration is adjustable via CSS var */}
      <div
        className="marquee flex gap-6"
        style={{ ["--marquee-duration" as any]: "35s" }}
      >
        {row.map((t, i) => (
          <article
            key={i}
            className="
              w-[85vw] sm:w-[60vw] md:w-[44vw] lg:w-[32vw] xl:w-[28vw]
              shrink-0 rounded-3xl border bg-white/70 backdrop-blur
              p-6 md:p-8 shadow-sm
            "
          >
            <div className="flex items-center justify-between">
              <Stars n={t.rating} />
            </div>

            <hr className="my-4 opacity-20" />

            <div className="flex gap-2 mb-4">
              {t.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-3 py-1 rounded-full border bg-white"
                >
                  {tag}
                </span>
              ))}
            </div>

            <p className="text-sm md:text-base leading-relaxed opacity-90">
              “{t.text}”
            </p>

            <div className="mt-6 flex items-center gap-3">
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
        ))}
      </div>

      {/* Component-scoped styles */}
      <style>
        {`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); } /* move left by half (because content is duplicated) */
        }
        .marquee {
          width: max-content;
          animation: marquee var(--marquee-duration, 35s) linear infinite;
        }
        /* Pause when user hovers anywhere over the strip or a card */
        .group:hover .marquee { animation-play-state: paused; }

        /* Respect reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .marquee { animation: none; transform: translateX(0); }
        }
      `}
      </style>
    </section>
  );
}
