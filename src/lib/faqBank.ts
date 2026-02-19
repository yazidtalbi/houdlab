import type { FaqBank } from "@/types/chat";

export const faqBank: FaqBank = {
  pricing: {
    title: "Pricing is scoped to your goals",
    body: [
      "Most branding + website projects start at $3,500.",
      "High-converting landing pages typically start at $1,500.",
      "Web apps usually start around $6,000, depending on features.",
      "Final pricing depends on complexity, content, and timeline.",
      "Share your scope and we will send a clear estimate.",
    ],
    cta: { label: "Request an estimate", href: "mailto:hello@houdlab.com" },
  },
  services: {
    title: "What we do (and what we do not)",
    body: [
      "Brand strategy, visual identity, and design systems.",
      "UX/UI for websites, landing pages, and product interfaces.",
      "Front-end build support with a clean handoff for dev teams.",
      "We do not offer paid ads, SEO retainers, or heavy backend builds.",
    ],
  },
  timeline: {
    title: "Typical timelines",
    body: [
      "Landing pages: 2–3 weeks.",
      "Brand + website: 4–8 weeks.",
      "Web app UI: 6–10 weeks, depending on scope.",
      "Timelines shift based on feedback speed and content readiness.",
    ],
  },
  contact: {
    title: "Best ways to reach us",
    body: [
      "Email: hello@houdlab.com",
      "WhatsApp: +212 6XX XXX XXX",
      "Hours: Mon–Fri, 9:00–18:00 (GMT+1)",
    ],
    cta: { label: "Email hello@houdlab.com", href: "mailto:hello@houdlab.com" },
  },
  process: {
    title: "Our process, start to finish",
    body: [
      "Discovery call and project brief.",
      "Scope, timeline, and proposal approval.",
      "Design sprints with weekly check-ins.",
      "Build support or developer-ready handoff.",
      "QA, launch, and post-launch care.",
    ],
  },
  revisions: {
    title: "Revisions and feedback",
    body: [
      "Two rounds of revisions are included per phase.",
      "Revisions cover adjustments within the approved scope.",
      "Major direction changes are scoped and quoted separately.",
      "We guide feedback to keep momentum and quality high.",
    ],
  },
};

export default faqBank;

