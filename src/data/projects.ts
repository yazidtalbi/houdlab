// src/data/projects.ts
export type Project = {
  slug: string;
  title: string;
  subtitle: string;
  cover: string;
  tags: string[]; // e.g., ["Web Design", "Branding"]
  year?: number;
};

export const ALL_TAGS = [
  "Illustrations",
  "3D",
  "Product Design",
  "Rebranding",
  "Support",
  "Development",
  "Graphic Design",
  "Motion Design",
  "Branding",
  "Web Design",
];

export const projects: Project[] = [
  {
    slug: "abuk",
    title: "Abuk",
    subtitle: "Ukrainian audiobooks platform",
    cover: "https://placehold.co/1200x800?text=Abuk",
    tags: ["Product Design", "Development", "Web Design"],
    year: 2024,
  },
  {
    slug: "relocate-now",
    title: "Relocate Now",
    subtitle: "Healthcare education and innovation company",
    cover: "https://placehold.co/1200x800?text=Relocate Now",
    tags: ["Branding", "Web Design"],
    year: 2024,
  },
  {
    slug: "zemium",
    title: "Zemium",
    subtitle: "Empowering communities through education",
    cover: "https://placehold.co/1200x800?text=Zemium",
    tags: ["Illustrations", "Branding"],
    year: 2023,
  },
  {
    slug: "manatee-energy",
    title: "Manatee Energy",
    subtitle: "Heat pump installation company",
    cover: "https://placehold.co/1200x800?text=Manatee+Energy",
    tags: ["Product Design", "Web Design", "Development"],
    year: 2025,
  },
  {
    slug: "fireside",
    title: "Fireside",
    subtitle: "Dentistry community",
    cover: "https://placehold.co/1200x800?text=Fireside",
    tags: ["Branding", "Motion Design", "Web Design"],
    year: 2022,
  },
  {
    slug: "flashlights",
    title: "Flashlights",
    subtitle: "Interactive history section for an advocacy project",
    cover: "https://placehold.co/1200x800?text=Flashlights",
    tags: ["Graphic Design", "Development"],
    year: 2023,
  },
];
