"use client";

import * as React from "react";

export default function BottomCommandBar({
  placeholder = "Start your project",
  onSubmit,
}: {
  placeholder?: string;
  onSubmit?: (value: string) => void;
}) {
  const [v, setV] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.trim()) return;
    onSubmit?.(v.trim());
    setV("");
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-50">
      <div
        className="mx-auto max-w-3xl px-4 pb-6 "
        role="button"
        id="floating-chat-trigger"
      >
        <form
          onSubmit={handleSubmit}
          className="rounded-full border border-neutral-200 bg-white/90 backdrop-blur shadow-sm flex items-center gap-3 px-4 py-3"
        >
          <input
            type="text"
            value={v}
            onChange={(e) => setV(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent outline-none text-[15px] placeholder:text-neutral-400"
            aria-label={placeholder}
          />
          <button
            type="submit"
            className="text-[12px] px-3 py-1.5 rounded-full border border-neutral-200 hover:bg-neutral-50"
          >
            Send
          </button>
        </form>
        <div className="pt-2 text-[11px] text-neutral-500 text-center">
          Press <kbd className="px-1 py-0.5 border rounded">A</kbd> to open
          About
        </div>
      </div>
    </div>
  );
}
