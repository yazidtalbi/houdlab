import { useRef, useEffect } from "react";

export default function VideoReel() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const play = () => v.play().catch(() => {});
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) play();
    });
    play();
    return () => document.removeEventListener("visibilitychange", play as any);
  }, []);

  return (
    <video
      ref={ref}
      className="w-full rounded-3xl shadow-lg sticky top-6"
      src="/reels/houdlab-demo.webm"
      poster="/reels/poster.jpg"
      muted
      loop
      playsInline
      preload="metadata"
    />
  );
}
