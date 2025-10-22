// src/components/DashboardAvailabilityToggle.tsx
"use client";
import { useState, useEffect } from "react";
import { useAvailability } from "@/hooks/useAvailability";

type Status = "available" | "unavailable";

export default function DashboardAvailabilityToggle({ orgSlug = "houdlab" }) {
  const { status: remoteStatus, loading } = useAvailability(orgSlug);
  const [localStatus, setLocalStatus] = useState<Status>(
    (remoteStatus ?? "unavailable") as Status
  );
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (remoteStatus) setLocalStatus(remoteStatus as Status);
  }, [remoteStatus]);

  async function updateStatus(next: Status) {
    if (busy) return;
    setBusy(true);
    setErrorMsg("");
    const prev = localStatus;

    // optimistic UI
    setLocalStatus(next);

    try {
      // RECOMMENDED payload (org_slug + status)
      const res = await fetch("/api/toggle-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_slug: orgSlug, status: next }),
      });

      const data = await res.json();
      if (!res.ok || data?.error) {
        throw new Error(data?.error || "Request failed");
      }
    } catch (e: any) {
      // rollback
      setLocalStatus(prev);
      setErrorMsg(e?.message || String(e));
      console.error("[availability upsert]", e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
      <div className="flex flex-row md:flex-col gap-2 font-[Amiri] font-bold">
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
