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
  [{ src: "/logos/k.png" }, { src: "/logos/p.png" }],
  [{ src: "/logos/p.png" }, { src: "/logos/k.png" }],
  [{ src: "/brands/gem.svg" }, { src: "/brands/gem-2.svg" }],
  [{ src: "/brands/mono.svg" }, { src: "/brands/mono-2.svg" }],
  [{ src: "/brands/tile.svg" }, { src: "/brands/tile-2.svg" }],
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
          <Button className="bg-white   outline-hidden border border-black text-black hover:text-neutral-600 hover:border-neutral-500 hover:bg-neutral-50 fixed rounded-full text-lg font-medium px-6 py-1   transition-all duration-200">
            About
          </Button>
        )}
      </DialogTrigger>

      <DialogContent /* shadcn portals to <body>, avoids z-index/overflow issues */
        className="sm:max-w-[720px]"
      >
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
        )}

        {/* Body */}
        <div className="space-y-3">
          {children ?? <IntroTrustedSection client:load groups={groups} />}
        </div>

        {/* Footer */}
        {/* <DialogFooter className="mt-4">
          {footer ?? (
            <>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={() => setOpen(false)}>Confirm</Button>
            </>
          )}
        </DialogFooter> */}
      </DialogContent>
    </Dialog>
  );
}
