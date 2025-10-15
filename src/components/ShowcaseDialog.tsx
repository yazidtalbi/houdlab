"use client";

import * as React from "react";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function ShowcaseDialog({
  triggerLabel = "View Case Study",
  triggerClassName = "inline-flex items-center rounded-full bg-black text-white px-5 py-2 text-sm font-medium hover:bg-neutral-800",
  children,
}: {
  triggerLabel?: string;
  triggerClassName?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  // Freeze background (Lenis) while open
  React.useEffect(() => {
    const lenis: any = (window as any).__lenis || (window as any).lenis;
    const html = document.documentElement;
    if (open) {
      lenis?.stop?.();
      html.classList.add("overflow-hidden");
    } else {
      lenis?.start?.();
      html.classList.remove("overflow-hidden");
    }
    return () => {
      lenis?.start?.();
      html.classList.remove("overflow-hidden");
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* ✅ Trigger lives INSIDE <Dialog> and only renders when closed */}
      {!open && (
        <DialogTrigger asChild>
          <button type="button" className={triggerClassName}>
            {triggerLabel}
          </button>
        </DialogTrigger>
      )}

      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-[998] bg-white/40 backdrop-blur-[1px]" />
        <DialogContent
          data-lenis-prevent
          data-lenis-prevent-wheel
          data-lenis-prevent-touch
          className="
            fixed inset-0 z-[999]
            !left-0 !top-0 !translate-x-0 !translate-y-0 !max-w-none
            overflow-y-auto overscroll-contain
            bg-transparent shadow-none outline-none
            flex items-start justify-center
            p-4 sm:p-6 md:p-10
          "
        >
          <div className="relative w-full max-w-[1100px] rounded-2xl bg-white shadow-2xl my-10">
            {/* ← Go back (closes modal). No other buttons/headers inside. */}
            <div className="absolute right-6 top-6 sm:right-8 sm:top-8 z-10 ">
              <button
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-neutral-500 hover:text-neutral-800 transition"
              >
                ← Go back
              </button>
            </div>

            <div className="px-6 sm:px-8 py-12">{children}</div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
