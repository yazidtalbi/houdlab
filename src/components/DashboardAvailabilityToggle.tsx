"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useAvailability } from "@/hooks/useAvailability";

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL!,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY!
);

export default function DashboardAvailabilityToggle({ orgSlug = "houdlab" }) {
  const { status: remoteStatus, loading } = useAvailability(orgSlug);

  // 🔹 Local optimistic mirror of the status
  const [localStatus, setLocalStatus] = useState<"available" | "unavailable">(
    remoteStatus ?? "unavailable"
  );
  const [busy, setBusy] = useState(false);

  // Keep local mirror in sync when remote status changes (e.g., from Realtime)
  useEffect(() => {
    if (remoteStatus) setLocalStatus(remoteStatus);
  }, [remoteStatus]);

  async function updateStatus(next: "available" | "unavailable") {
    if (busy) return;
    setBusy(true);

    const prev = localStatus;

    // 🔹 Optimistic update
    setLocalStatus(next);

    try {
      const { error } = await supabase
        .from("availability_status")
        .upsert({
          org_slug: orgSlug,
          status: next,
          updated_at: new Date().toISOString(),
        })
        // 🔹 get the row back immediately so UI is correct even if Realtime lags
        .select()
        .single();

      if (error) throw error;
      // Realtime (if enabled) will still come in and keep everything aligned
    } catch (e) {
      // Roll back optimistic update on error
      setLocalStatus(prev);
      console.error("Failed to update availability:", e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className=" items-center justify-between">
      <div className="flex flex-col gap-2 font-[Amiri] font-bold">
        <button
          onClick={() => updateStatus("available")}
          disabled={busy || loading}
          className={`rounded-full px-3 py-1 text-sm border ${
            localStatus === "available"
              ? "bg-[#fccf7a] text-black border-[#fccf7a]"
              : "hover:bg-neutral-50"
          }`}
        >
          كاين
        </button>
        <button
          onClick={() => updateStatus("unavailable")}
          disabled={busy || loading}
          className={`rounded-full px-3 py-1 text-sm border ${
            localStatus === "unavailable"
              ? "bg-rose-400 text-white border-rose-400"
              : "hover:bg-neutral-50"
          }`}
        >
          ممسالِش
        </button>
      </div>
    </div>
  );
}
