import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

type Availability = {
  org_slug: string;
  status: "available" | "unavailable";
  updated_at: string;
};

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL!,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY!
);

// Working hours in GMT+1: 10 AM to 5 PM
const START_HOUR_GMT1 = 10;
const END_HOUR_GMT1 = 17;
const GMT1_OFFSET_MINUTES = 60;

function isWithinWorkingHours(): boolean {
  const now = new Date();
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const gmt1Minutes = (utcMinutes + GMT1_OFFSET_MINUTES + 1440) % 1440;
  const gmt1Hour = Math.floor(gmt1Minutes / 60);
  return gmt1Hour >= START_HOUR_GMT1 && gmt1Hour < END_HOUR_GMT1;
}

async function autoSyncAvailability(
  orgSlug: string,
  currentStatus: "available" | "unavailable"
) {
  const shouldBeAvailable = isWithinWorkingHours();
  const isAvailable = currentStatus === "available";

  if (shouldBeAvailable && !isAvailable) {
    // It's working hours but status is unavailable — auto-enable
    await fetch("/api/toggle-availability", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ org_slug: orgSlug, status: "available" }),
    });
  } else if (!shouldBeAvailable && isAvailable) {
    // It's outside working hours but status is available — auto-disable
    await fetch("/api/toggle-availability", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ org_slug: orgSlug, status: "unavailable" }),
    });
  }
}

export function useAvailability(orgSlug = "houdlab") {
  const [data, setData] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(true);
  const autoSyncedRef = useRef(false);

  // initial fetch + auto-sync
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("availability_status")
        .select("*")
        .eq("org_slug", orgSlug)
        .maybeSingle();
      if (!error && data) {
        setData(data as Availability);
        // Auto-sync once on load
        if (!autoSyncedRef.current) {
          autoSyncedRef.current = true;
          autoSyncAvailability(orgSlug, (data as Availability).status);
        }
      }
      setLoading(false);
    })();
  }, [orgSlug]);

  // realtime subscription
  useEffect(() => {
    const ch = supabase
      .channel(`availability:${orgSlug}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "availability_status",
          filter: `org_slug=eq.${orgSlug}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as Availability | undefined;
          if (row) setData(row);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [orgSlug]);

  return {
    status: data?.status ?? "unavailable",
    loading,
  };
}
