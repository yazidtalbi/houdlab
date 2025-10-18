// src/components/ChatNotifications.tsx
"use client";

import * as React from "react";
import { Toaster, toast } from "@/components/ui/sonner";

const LAST_ASSISTANT_KEY = "houdlab_chat_last_assistant_at_v1";
const LAST_READ_KEY = "houdlab_chat_last_read_at_v1";

type AssistantEventDetail = {
  text?: string; // optional preview of assistant reply
  at?: string; // ISO timestamp
};

export default function ChatNotifications() {
  React.useEffect(() => {
    const onAssistant = (ev: Event) => {
      const detail = (ev as CustomEvent<AssistantEventDetail>).detail || {};
      const preview =
        (detail.text ?? "").trim().slice(0, 120) || "You’ve got a new reply.";
      const atIso = detail.at || new Date().toISOString();

      // Persist “last assistant” time for unread logic elsewhere
      try {
        localStorage.setItem(LAST_ASSISTANT_KEY, atIso);
      } catch {}

      // Fire toast
      toast("New message", {
        description: preview,
        action: {
          label: "Mark as read",
          onClick: () => {
            try {
              localStorage.setItem(LAST_READ_KEY, new Date().toISOString());
            } catch {}
          },
        },
        duration: 6000,
      });
    };

    window.addEventListener(
      "houd:chat:assistant",
      onAssistant as EventListener
    );
    return () =>
      window.removeEventListener(
        "houd:chat:assistant",
        onAssistant as EventListener
      );
  }, []);

  // If you already mount <Toaster /> globally, remove it here.
  return <Toaster richColors closeButton />;
}
