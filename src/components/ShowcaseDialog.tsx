"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { X } from "lucide-react";

export default function ShowcaseDialog({
  triggerLabel = "In Depth",
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

  // ShowcaseDialog.tsx (inside component)
  const [mountHeavy, setMountHeavy] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setMountHeavy(false);
      return;
    }
    const id = requestAnimationFrame(() => {
      // prefer idle if available
      // @ts-ignore
      (window.requestIdleCallback ?? setTimeout)(() => setMountHeavy(true), 16);
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  // ShowcaseDialog.tsx (replace your return with this structure)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className={triggerClassName}>
          {triggerLabel}
        </button>
      </DialogTrigger>

      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-[998] bg-white/50" />

        <DialogContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="
          fixed inset-0 z-[999] !left-0 !top-0 !translate-x-0 !translate-y-0 !max-w-none
          overflow-y-auto overscroll-contain bg-transparent shadow-none outline-none
          flex items-start justify-center p-4 sm:p-6 md:p-10
          [contain:layout_paint_style]            /* isolate heavy paints */
          [content-visibility:auto] [contain-intrinsic-size:1px_1200px] /* skip work until visible */
        "
        >
          <div className="relative w-full max-w-[1100px] rounded-2xl bg-white shadow-2xl my-10 mt-20 will-change-transform">
            <button
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="absolute -top-20 left-1/2 -translate-x-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/20 backdrop-blur-md text-white shadow-md hover:bg-white/30 focus:outline-none"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Mount heavy children only after open to avoid blocking the open transition */}
            <div className="px-6 sm:px-8 py-12">{open ? children : null}</div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
