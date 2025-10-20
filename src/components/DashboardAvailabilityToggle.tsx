// DashboardAvailabilityToggle.tsx
"use client";
import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabaseBrowser";
import { useAvailability } from "@/hooks/useAvailability";

export default function DashboardAvailabilityToggle({ orgSlug = "houdlab" }) {
  const { status: remoteStatus, loading } = useAvailability(orgSlug);
  const [localStatus, setLocalStatus] = useState<"available" | "unavailable">(
    (remoteStatus ?? "unavailable") as "available" | "unavailable"
  );
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (remoteStatus)
      setLocalStatus(remoteStatus as "available" | "unavailable");
  }, [remoteStatus]);

  async function updateStatus(next: "available" | "unavailable") {
    if (busy) return;
    setBusy(true);
    setErrorMsg("");
    const prev = localStatus;
    setLocalStatus(next); // optimistic

    try {
      const { error } = await supabase
        .from("availability_status")
        .upsert(
          {
            org_slug: orgSlug,
            status: next,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "org_slug" } // <-- important in prod
        )
        .select()
        .single();

      if (error) throw error;
    } catch (e: any) {
      setLocalStatus(prev);
      setErrorMsg(e?.message || String(e));
      console.error("[availability upsert]", e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="items-center justify-between">
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
      {errorMsg && (
        <div className="mt-2 text-xs text-rose-600 break-words">{errorMsg}</div>
      )}
    </div>
  );
}
