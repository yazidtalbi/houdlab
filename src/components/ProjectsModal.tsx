"use client";

import * as React from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ProjectsModalProps = {
  triggerLabel?: string;
  triggerClassName?: string;
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
  children?: React.ReactNode;
};

export default function ProjectsModal({
  triggerLabel = "Projects",
  triggerClassName,
  trigger,
  defaultOpen = false,
  children,
}: ProjectsModalProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [showToast, setShowToast] = React.useState(false);
  const toastTimerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const root = document.documentElement;
    if (open) root.classList.add("overflow-hidden");
    else root.classList.remove("overflow-hidden");
    return () => root.classList.remove("overflow-hidden");
  }, [open]);

  React.useEffect(() => {
    const handleAssistant = () => {
      if (!open) return;
      setShowToast(true);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => {
        setShowToast(false);
        toastTimerRef.current = null;
      }, 5500);
    };
    window.addEventListener("houd:chat:assistant", handleAssistant);
    return () => {
      window.removeEventListener("houd:chat:assistant", handleAssistant);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, [open]);

  const contentClassName =
    "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-6xl lg:max-w-7xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-200 bg-white p-0 shadow-2xl transition-[width,height,max-width] duration-200";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-full border border-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-900 hover:text-white",
              triggerClassName
            )}
          >
            {triggerLabel}
          </button>
        )}
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className={contentClassName}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {showToast && (
          <div className="fixed left-1/2 top-6 z-[9999] -translate-x-1/2">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-100/95 px-5 py-2.5 text-sm font-semibold text-amber-950 shadow-lg">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-200/80 text-amber-900">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5H5l2.2-2.2A8.5 8.5 0 1 1 21 11.5z" />
                </svg>
              </span>
              <span>New message from the agent</span>
            </div>
          </div>
        )}
        <div className="relative bg-white rounded-2xl">
          <DialogClose
            aria-label="Close projects"
            className="absolute right-6 top-6 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white/80 text-neutral-700 shadow-sm transition hover:bg-white"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </DialogClose>
          <div
            id="projects-modal-scroll"
            className="max-h-[85vh] overflow-y-auto overscroll-contain rounded-2xl"
          >
            {open ? children : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

