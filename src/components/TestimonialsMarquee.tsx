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
    rating: 4.5,
    tags: ["Retail", "Ongoing"],
    text: "The client is proud of Houd Lab's work, which their customers praised. Communication was always clear and fast.The client is proud of Houd Lab's work, which their customers praised. Communication was always clear and fast.The client is proud of Houd Lab's work, which their customers praised. Communication was always clear and fast.",
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
  const max = 5;
  return (
    <div className="flex items-center gap-1">
      <span className="font-semibold pr-2">{n.toFixed(1)}</span>
      {Array.from({ length: max }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className={`h-4 w-4 ${i < n ? "fill-[#FABC4B]" : "fill-gray-300"}`}
        >
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
      className="relative overflow-hidden"
      style={{
        WebkitMaskImage:
          "linear-gradient(90deg, transparent 0, black 6%, black 94%, transparent 100%)",
        maskImage:
          "linear-gradient(90deg, transparent 0, black 6%, black 94%, transparent 100%)",
      }}
    >
      <div
        className="marquee flex gap-6 will-change-transform"
        style={{ ["--marquee-duration" as any]: "35s" }}
      >
        {row.map((t, i) => (
          <article
            key={i}
            className="
              w-[85vw] sm:w-[60vw] md:w-[44vw] lg:w-[32vw] xl:w-[28vw]
              shrink-0 rounded-3xl border border-gray-300 bg-white/70
              p-6 md:p-8 flex flex-col
            "
          >
            {/* Top section */}
            <div className="flex-1">
              <div className="flex items-center justify-between text-xl">
                <Stars n={t.rating} />
              </div>

              <hr className="my-4 opacity-20" />

              <div className="flex gap-2 my-4 mt-6">
                {t.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-sm px-3 py-1 rounded-full border border-gray-300 bg-white text-gray-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <p className="text-sm md:text-base font-medium leading-relaxed mt-4">
                {t.text}
              </p>
            </div>

            {/* Bottom section: avatar + role */}
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

      <style>
        {`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .marquee {
          width: max-content;
          animation: marquee var(--marquee-duration, 35s) linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee { animation: none; transform: translateX(0); }
        }
      `}
      </style>
    </section>
  );
}
