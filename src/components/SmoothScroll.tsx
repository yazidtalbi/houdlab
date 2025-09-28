import { ReactLenis, useLenis } from "lenis/react";

export default function SmoothScroll() {
  // Hook gives you access to the Lenis instance
  useLenis((lenis) => {
    // This runs every scroll frame
    console.log(lenis);
  });

  return (
    // The <ReactLenis root> must wrap the content you want smoothed
    <ReactLenis root options={{ duration: 1.1, smoothWheel: true }}>
      <div className="lenis-wrapper">
        {/* 👇 All your scrollable site content goes here */}
        <slot />
      </div>
    </ReactLenis>
  );
}
