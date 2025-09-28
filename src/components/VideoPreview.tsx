import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { X } from "lucide-react";

type Props = {
  src: string;
  poster?: string;
  className?: string;
};

export default function VideoPreview({ src, poster, className }: Props) {
  return (
    <Dialog>
      {/* Preview card */}
      <div
        className={
          className ??
          "order-1 lg:order-2 flex-1 min-h-0 rounded-2xl overflow-hidden bg-yellow-700/50 relative group"
        }
      >
        <video
          src={src}
          muted
          autoPlay
          loop
          playsInline
          poster={poster}
          className="w-full h-full object-cover pointer-events-none"
        />
        <DialogTrigger asChild>
          <button
            aria-label="Play video"
            className="absolute inset-0 flex items-center justify-center cursor-pointer"
          >
            <span className="flex items-center justify-center w-20 h-20 rounded-full bg-neutral-100 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:bg-[#FABC4B]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-8 h-8 text-neutral-900"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </button>
        </DialogTrigger>
      </div>

      {/* Modal */}
      <DialogContent
        className="
          border-0 p-0 bg-[#FABC4B]/90 
          w-[96vw] max-w-[1200px] 
          max-h-[90vh] 
          rounded-none sm:rounded-2xl   /* mobile: full edge, desktop: rounded */
          overflow-hidden
        "
      >
        {/* Close button */}
        <DialogClose
          className="absolute right-4 top-4 z-10 inline-flex items-center justify-center rounded-full w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-white" />
        </DialogClose>

        {/* Video */}
        <div className="relative w-full h-full bg-black">
          <video
            src={src}
            controls
            autoPlay
            muted
            playsInline
            className="w-full h-full object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
