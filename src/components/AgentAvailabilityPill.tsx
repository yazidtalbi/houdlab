import { useEffect, useMemo, useState } from "react";

type Override = "available" | "unavailable" | null;

type AgentPillProps = {
  startHour?: number; // default 7
  endHour?: number; // default 18
  override?: Override;
  showInlineToggle?: boolean;
};

export default function AgentAvailabilityPill({
  startHour = 7,
  endHour = 18,
  override = null,
  showInlineToggle = false,
}: AgentPillProps) {
  const [forced, setForced] = useState<Override>(override);
  useEffect(() => setForced(override), [override]);

  const {
    isAvailable,
    hoursUntilStart,
    hoursUntilEnd,
    nextStartLabel,
    endLabel,
  } = useMemo(() => {
    const now = new Date();

    // Convert "now" to GMT+1
    const TARGET_TZ_OFFSET_MIN = 60;
    const localOffsetMin = now.getTimezoneOffset();
    const deltaMin = TARGET_TZ_OFFSET_MIN + localOffsetMin;
    const nowGMT1 = new Date(now.getTime() + deltaMin * 60 * 1000);

    const start = new Date(nowGMT1);
    start.setHours(startHour, 0, 0, 0);
    const end = new Date(nowGMT1);
    end.setHours(endHour, 0, 0, 0);

    const scheduledAvailable = nowGMT1 >= start && nowGMT1 < end;

    const toHours = (ms: number) =>
      Math.max(0, Math.round(ms / (1000 * 60 * 60)));
    const nextStart = new Date(start);
    if (nowGMT1 >= end) nextStart.setDate(nextStart.getDate() + 1);

    const hoursUntilStart = scheduledAvailable
      ? 0
      : toHours(nextStart.getTime() - nowGMT1.getTime());
    const hoursUntilEnd = scheduledAvailable
      ? toHours(end.getTime() - nowGMT1.getTime())
      : 0;

    const pad = (n: number) => String(n).padStart(2, "0");
    const nextStartLabel = `${pad(startHour)}:00 GMT+1`;
    const endLabel = `${pad(endHour)}:00 GMT+1`;

    return {
      isAvailable: scheduledAvailable,
      hoursUntilStart,
      hoursUntilEnd,
      nextStartLabel,
      endLabel,
    };
  }, [startHour, endHour]);

  const finalAvailable =
    forced === "available"
      ? true
      : forced === "unavailable"
      ? false
      : isAvailable;

  return (
    <div className="ml-auto shrink-0 md:self-center order-1 md:order-none flex flex-col items-end">
      {/* Pill label */}
      <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/70 px-3 py-1  text-[11px] text-neutral-700">
        {/* Pulse dot */}
        <span
          className={`relative inline-block h-1.5 w-1.5 rounded-full ${
            finalAvailable ? "bg-green-500" : "bg-red-500"
          }`}
        >
          <span
            className={`absolute inset-0 rounded-full ${
              finalAvailable ? "bg-green-500/60" : "bg-red-500/60"
            } animate-ping motion-reduce:animate-none`}
          />
        </span>

        {/* Status label */}
        <span className="font-medium">
          {finalAvailable
            ? ` Estimated response: 2 min`
            : `Unavailable — back at ${nextStartLabel} (~${hoursUntilStart} h)`}
        </span>

        {/* Optional testing toggles */}
        {showInlineToggle && (
          <div className="ml-2 flex items-center gap-1">
            <button
              onClick={() => setForced("available")}
              className="rounded-full border px-2 py-0.5 text-[10px] hover:bg-neutral-50"
            >
              A
            </button>
            <button
              onClick={() => setForced("unavailable")}
              className="rounded-full border px-2 py-0.5 text-[10px] hover:bg-neutral-50"
            >
              U
            </button>
            <button
              onClick={() => setForced(null)}
              className="rounded-full border px-2 py-0.5 text-[10px] hover:bg-neutral-50"
            >
              Auto
            </button>
          </div>
        )}
      </div>

      {/* Separate line beneath the pill */}
      {/* {finalAvailable && (
        <span className="mt-1 text-xs text-neutral-500">Until ${endLabel}</span>
      )} */}
    </div>
  );
}
