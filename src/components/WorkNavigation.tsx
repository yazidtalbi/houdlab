import { useEffect, useState } from "react";

interface Project {
  id: string;
  titleAr: string;
  titleEn: string;
}

const projects: Project[] = [
  { id: "afus", titleAr: "أفوس", titleEn: "Afus" },
  { id: "zemium", titleAr: "زيــميوم", titleEn: "Zemium" },
  { id: "allied", titleAr: "ألايــد", titleEn: "Allied" },
  { id: "casablanca", titleAr: "فندق كازابلانكا", titleEn: "Casablanca Hotel" },
  { id: "vf", titleAr: "فيزيت فوتبول", titleEn: "Visit Football" },
  { id: "selenitis", titleAr: "ســيلينيتيس", titleEn: "Selenitis" },
  { id: "folklore", titleAr: "فــولكلور ٢٤", titleEn: "Folklore 24" },
  { id: "pve", titleAr: "بي في إنيرجي", titleEn: "PV Energy" },
  { id: "knockout", titleAr: "نـوك آوت", titleEn: "Knockout" },
  { id: "masterpiece", titleAr: "ماستر بيـس", titleEn: "The Mxsterpiece" },
];

export default function WorkNavigation({
  scrollContainerId,
  updateHash = true,
  headerOffset = 100,
}: {
  scrollContainerId?: string;
  updateHash?: boolean;
  headerOffset?: number;
}) {
  const [activeId, setActiveId] = useState<string>("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    const container = scrollContainerId
      ? document.getElementById(scrollContainerId)
      : null;
    const scrollTarget: HTMLElement | Window = container ?? window;
    const sections = container
      ? Array.from(container.querySelectorAll("section[id]"))
      : Array.from(document.querySelectorAll("section[id]"));

    const updateActiveSection = () => {
      const scrollPosition = container
        ? container.scrollTop + container.clientHeight * 0.4
        : window.scrollY + window.innerHeight * 0.4;

      let currentSection = "";
      sections.forEach((section) => {
        const element = section as HTMLElement;
        const top = element.offsetTop;
        const bottom = top + element.offsetHeight;

        if (scrollPosition >= top && scrollPosition < bottom) {
          currentSection = element.id;
        }
      });

      if (currentSection) {
        setActiveId(currentSection);
      } else if (sections.length > 0) {
        // Fallback to first section if none found
        const firstSection = sections[0] as HTMLElement;
        if (firstSection && scrollPosition < firstSection.offsetTop) {
          setActiveId(firstSection.id);
        }
      }
    };

    // Set initial active section from hash or scroll position
    if (updateHash) {
      const hash = window.location.hash.slice(1);
      if (hash) {
        setActiveId(hash);
      } else {
        updateActiveSection();
      }
    } else {
      updateActiveSection();
    }

    // Update on scroll
    const handleScroll = () => {
      updateActiveSection();
    };

    scrollTarget.addEventListener("scroll", handleScroll, { passive: true });
    const handleHashChange = () => {
      const newHash = window.location.hash.slice(1);
      if (newHash) setActiveId(newHash);
    };
    if (updateHash) {
      window.addEventListener("hashchange", handleHashChange);
    }

    // Also use IntersectionObserver as a backup
    const options = {
      root: container ?? null,
      rootMargin: "0px 0px -60% 0px",
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute("id");
          if (id) {
            setActiveId(id);
          }
        }
      });
    }, options);

    sections.forEach((section) => observer.observe(section));

    return () => {
      scrollTarget.removeEventListener("scroll", handleScroll);
      if (updateHash) {
        window.removeEventListener("hashchange", handleHashChange);
      }
      sections.forEach((section) => observer.unobserve(section));
    };
  }, [scrollContainerId, updateHash]);

  const handleClick = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const container = scrollContainerId
        ? document.getElementById(scrollContainerId)
        : null;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = container
        ? elementPosition + container.scrollTop - headerOffset
        : elementPosition + window.pageYOffset - headerOffset;

      if (container) {
        container.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        });
      } else {
        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        });
      }

      if (updateHash) {
        // Update URL without triggering scroll
        window.history.replaceState(null, "", `#${id}`);
      }
      setActiveId(id);
    }
  };

  return (
    <nav
      className="fixed right-6 md:right-8 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-1 items-end hidden md:flex"
      aria-label="Project navigation"
    >
      {projects.map((project) => {
        const isActive = activeId === project.id;
        const isHovered = hoveredId === project.id;

        return (
          <div
            key={project.id}
            className="relative flex items-center gap-4 group"
            onMouseEnter={() => setHoveredId(project.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* Project name label - appears on hover */}
            <div
              className={`absolute right-10 whitespace-nowrap transition-all duration-300 ease-out ${
                isHovered
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 translate-x-2 pointer-events-none"
              }`}
            >
              <span className="text-sm text-neutral-700 dark:text-neutral-300 font-medium bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm px-2 py-1 rounded">
                {project.titleEn}
              </span>
            </div>

            {/* Navigation line - horizontal with rounded ends */}
            <a
              href={`#${project.id}`}
              onClick={(e) => handleClick(project.id, e)}
              className="flex items-center justify-end py-2 -my-1"
              aria-label={`Navigate to ${project.titleEn}`}
              title={project.titleEn}
            >
              <span
                className={`block transition-all duration-300 rounded-full ${
                  isActive
                    ? "w-8 h-0.5 bg-neutral-900 dark:bg-white shadow-[0_0_6px_rgba(255,255,255,0.4)]"
                    : "w-6 h-0.5 bg-neutral-300 dark:bg-neutral-700 hover:bg-neutral-400 dark:hover:bg-neutral-600"
                }`}
              />
            </a>
          </div>
        );
      })}
    </nav>
  );
}

