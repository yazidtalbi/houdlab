"use client";

import * as React from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import IntroTrustedSection from "@/components/IntroTrustedSection";

const groups = [
  [
    { src: "/logos/1.png" },
    { src: "/logos/2.png" },
    { src: "/logos/3.png" },
    { src: "/logos/4.png" },
    { src: "/logos/5.png" },
    { src: "/logos/6.png" },
  ],
];

type KageModalProps = {
  /** Optional label for the trigger button */
  triggerLabel?: string;
  /** Optional: start open (useful for testing) */
  defaultOpen?: boolean;
  /** Optional title/description if you don’t want to inline children */
  title?: string;
  description?: string;
  /** Optional: render custom footer actions */
  footer?: React.ReactNode;
  /** Optional: custom trigger (overrides triggerLabel) */
  trigger?: React.ReactNode;
  /** Modal body (inside Content) */
  children?: React.ReactNode;
};

export default function KageModal({
  triggerLabel = "Open modal",
  defaultOpen = false,
  title,
  description,
  footer,
  trigger,
  children,
}: KageModalProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            className="
    h-9 px-4 text-sm md:h-10 md:px-6 md:text-base
    bg-white border border-black text-black rounded-full
    transition-colors
    md:static md:inset-auto 
   hover:bg-black hover:text-white cursor-pointer
  "
          >
            About
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-[720px] p-0 overflow-hidden" // removed padding here
      >
        {(title || description) && (
          <DialogHeader className="p-0">
            {" "}
            {/* remove header padding too */}
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
        )}

        {/* Body */}
        <div className="max-h-[600px] overflow-auto p-4">
          {children ?? <IntroTrustedSection client:load groups={groups} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
