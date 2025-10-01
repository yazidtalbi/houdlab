import { useEffect, useRef, useState } from "react";

type Step = {
  id: number;
  tag: string;
  hl: { title: string; body: string };
  cl: { title: string; body: string };
};

const ACCENT = "#FABC4B";

const STEPS: Step[] = [
  {
    id: 1,
    tag: "Planning",
    hl: {
      title: "HoudLab",
      body: "Assemble the right team and define success metrics.",
    },
    cl: {
      title: "Client",
      body: "Share context, goals, constraints, and stakeholders.",
    },
  },
  {
    id: 2,
    tag: "Roadmap",
    hl: {
      title: "HoudLab",
      body: "Draft milestones, deliverables, estimates, and risks.",
    },
    cl: {
      title: "Client",
      body: "Review & refine the roadmap; align on priorities.",
    },
  },
  {
    id: 3,
    tag: "Dialogue",
    hl: {
      title: "HoudLab",
      body: "Run weekly check-ins, async updates, and demos.",
    },
    cl: {
      title: "Client",
      body: "Give fast feedback, unblock decisions, approve work.",
    },
  },
  {
    id: 4,
    tag: "Release",
    hl: {
      title: "HoudLab",
      body: "Ship, monitor, support, and plan next iteration.",
    },
    cl: {
      title: "Client",
      body: "Validate KPIs, rollout with your team, share learnings.",
    },
  },
];

export default function ProcessSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(1);

  // Track active panel by intersection
  useEffect(() => {
    const nodes = stepRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!nodes.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        // pick panel nearest to center
        let bestId = active;
        let best = -Infinity;
        entries.forEach((e) => {
          const r = e.target.getBoundingClientRect();
          // score = how centered it is
          const center = window.innerHeight / 2;
          const dist = Math.abs(r.top + r.height / 2 - center);
          const score = 1 / (dist + 1);
          const id = Number((e.target as HTMLElement).dataset.stepid);
          if (score > best) {
            best = score;
            bestId = id;
          }
        });
        setActive(bestId);
      },
      { threshold: [0.2, 0.5, 0.8] }
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  const jump = (id: number) => {
    const node = stepRefs.current[id - 1];
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <section className="relative bg-[#0B0D16] text-white">
      <div className="mx-auto max-w-7xl px-4 md:px-8 py-16 md:py-24 grid grid-cols-12 gap-8">
        {/* Sticky sidebar */}
        <aside className="col-span-12 md:col-span-4 lg:col-span-3">
          <div className="md:sticky md:top-24 space-y-6">
            <h2 className="text-3xl md:text-4xl font-semibold leading-tight">
              How we work—<span style={{ color: ACCENT }}>step by step</span>
            </h2>
            <p className="text-white/60 text-sm">
              A lightweight process that keeps momentum and clarity.
            </p>

            {/* Vertical progress */}
            <ol className="relative pl-6 mt-6">
              <span
                className="absolute left-[10px] top-0 h-full w-[2px] bg-white/10"
                aria-hidden
              />
              {STEPS.map((s) => {
                const isActive = s.id === active;
                return (
                  <li key={s.id} className="relative mb-5 last:mb-0">
                    <button
                      onClick={() => jump(s.id)}
                      className="group w-full text-left"
                      aria-current={isActive ? "step" : undefined}
                    >
                      <span
                        className={[
                          "absolute left-[-2px] top-[2px] h-3.5 w-3.5 rounded-full ring-2 transition",
                          isActive
                            ? "bg-[#FABC4B] ring-[#FABC4B]"
                            : "bg-white/0 ring-white/30 group-hover:ring-white/60",
                        ].join(" ")}
                        aria-hidden
                      />
                      <div className="ml-6">
                        <div className="text-xs uppercase tracking-wide text-white/50">
                          Step {String(s.id).padStart(2, "0")}
                        </div>
                        <div
                          className={
                            "font-medium " +
                            (isActive ? "text-white" : "text-white/80")
                          }
                        >
                          {s.tag}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>

        {/* Panels */}
        <div
          ref={containerRef}
          className="col-span-12 md:col-span-8 lg:col-span-9 space-y-14 md:space-y-20"
        >
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              data-stepid={s.id}
              ref={(el) => (stepRefs.current[i] = el)}
              className="rounded-[28px] border border-white/10 bg-white/0 p-4 md:p-6 lg:p-8"
            >
              {/* Header pill */}
              <div className="mb-6 flex items-center gap-3">
                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ background: "rgba(250,188,75,0.12)", color: ACCENT }}
                >
                  {s.tag}
                </span>
                <div className="h-[1px] flex-1 bg-white/10" />
              </div>

              {/* Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {/* HoudLab card */}
                <article className="rounded-2xl p-6 bg-neutral-900/60 ring-1 ring-white/10">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold tracking-wide">HoudLab</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                      Team
                    </span>
                  </div>
                  <p className="text-white/90 leading-relaxed">{s.hl.body}</p>
                </article>

                {/* Client card */}
                <article className="rounded-2xl p-6 bg-white text-neutral-900 ring-1 ring-black/5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold tracking-wide">Client</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-900/5 text-neutral-600">
                      You
                    </span>
                  </div>
                  <p className="text-neutral-800 leading-relaxed">
                    {s.cl.body}
                  </p>
                </article>
              </div>

              {/* Footnote */}
              <div className="mt-6 flex items-center justify-between text-xs text-white/50">
                <span>
                  Step {s.id} of {STEPS.length}
                </span>
                <button
                  onClick={() => jump(Math.min(s.id + 1, STEPS.length))}
                  className="inline-flex items-center gap-1.5 text-white/70 hover:text-white transition"
                >
                  Next
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M8 5l8 7-8 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
