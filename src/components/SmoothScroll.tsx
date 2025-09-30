import { ReactLenis, useLenis } from "lenis/react";

export default function SmoothScroll() {
  // Hook gives you access to the Lenis instance
  useLenis((lenis) => {
    // This runs every scroll frame
    console.log(lenis);
  });

  // This hook gives you the instance on each scroll; we can stash it on window once.
  useLenis((lenis) => {
    const w = window as any;
    if (!w.lenis) w.lenis = lenis; // expose globally once
  });

  return (
    // The <ReactLenis root> must wrap the content you want smoothed
    <ReactLenis
      root
      options={{ duration: 1.1, smoothWheel: true, autoRaf: true }}
    >
      <div className="lenis-wrapper">
        {/* 👇 All your scrollable site content goes here */}
        <slot />
      </div>
    </ReactLenis>
  );
}
