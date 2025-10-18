import { useEffect, useState } from "react";
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

export function useAvailability(orgSlug = "houdlab") {
  const [data, setData] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(true);

  // initial fetch
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("availability_status")
        .select("*")
        .eq("org_slug", orgSlug)
        .maybeSingle();
      if (!error && data) setData(data as Availability);
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
