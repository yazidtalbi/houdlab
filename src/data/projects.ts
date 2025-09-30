// src/data/projects.ts
export type ProjectMeta = {
  slug: string; // URL after /projects/
  titleEn: string; // English title
  titleAr: string; // Arabic title
  cover: string; // Preview image URL
  yearStart?: number; // optional
  yearEnd?: number; // optional
};

export const projects: ProjectMeta[] = [
  {
    slug: "relocate-now",
    titleEn: "Relocate Now",
    titleAr: "ريلوكايت ناو",
    cover: "https://placehold.co/1000x600",
    yearStart: 2021,
    yearEnd: 2025,
  },
  {
    slug: "zemium",
    titleEn: "Zemium",
    titleAr: "زيميوم",
    cover:
      "https://media.istockphoto.com/id/185100762/photo/the-white-house.jpg?s=612x612&w=0&k=20&c=26cn1EMuBRUPKL1FGxMyjtVKNeEKjZhUpaCC8vGMvKE=",
    yearStart: 2021,
    yearEnd: 2025,
  },
  {
    slug: "apoxer",
    titleEn: "Apoxer",
    titleAr: "أبوكسر",
    cover: "https://placehold.co/1000x600",
    yearStart: 2021,
    yearEnd: 2025,
  },
];
