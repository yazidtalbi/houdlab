const OFFLINE_LABEL = "Offline — FAQs available";
const OFFLINE_TIME = "Until 8 AM (GMT+1)";

export default function AgentAvailabilityPill({
  status = "unavailable",
  isWorkPage = false,
}: {
  status?: "available" | "unavailable";
  isWorkPage?: boolean;
}) {
  const isAvailable = status === "available";

  return (
    <div
      className={
        isWorkPage
          ? "flex flex-col items-start"
          : "ml-auto shrink-0 md:self-center order-1 md:order-none flex flex-col items-end"
      }
    >
      {/* Pill label */}
      <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/70 px-3 py-1.5 text-[11px] text-neutral-700">
        {/* Pulse dot */}
        <span
          className={`relative inline-block h-1.5 w-1.5 rounded-full ${
            isAvailable ? "bg-green-500" : "bg-red-500"
          }`}
        >
          <span
            className={`absolute inset-0 rounded-full ${
              isAvailable ? "bg-green-500/60" : "bg-red-500/60"
            } animate-ping motion-reduce:animate-none`}
          />
        </span>

        {/* Label */}
        <span className="font-medium text-xs">
          {isAvailable ? "Estimated response: 2 min" : OFFLINE_LABEL}
        </span>
      </div>

      {!isAvailable && (
        <span
          className={`mt-1 text-[10px] text-neutral-500 ${
            isWorkPage ? "text-left" : "text-right"
          }`}
        >
          {OFFLINE_TIME}
        </span>
      )}
    </div>
  );
}
