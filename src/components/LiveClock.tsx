import { useEffect, useState } from "react";

export default function LiveClock({
  timeZone = "Africa/Casablanca", // Tetouan timezone = GMT+1
  showSeconds = true,
}: {
  timeZone?: string;
  showSeconds?: boolean;
}) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        hour: "2-digit",
        minute: "2-digit",
        second: showSeconds ? "2-digit" : undefined,
        hour12: false, // ✅ 24-hour mode, removes AM/PM
        timeZone,
      };
      setTime(new Intl.DateTimeFormat("en-GB", options).format(now));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timeZone, showSeconds]);

  return (
    <div className="text-md text-center text-gray-700 font-semibold uppercase mb-4">
      <p>{time}</p>
      <p className="text-xs text-neutral-400">Tetouan</p>
    </div>
  );
}
