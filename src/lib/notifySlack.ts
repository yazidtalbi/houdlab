// Minimal Slack notifier. Safe no-op if env missing.
export async function notifySlack(payload: any) {
  const url = import.meta.env.SLACK_WEBHOOK_URL;
  if (!url) return;

  // Fire-and-forget; no throwing on errors
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // ignore
  }
}

// Convenience builders
export function slackText(text: string) {
  return { text }; // classic mode
}

export function slackBlocks(
  title: string,
  lines: Record<string, string | undefined>
) {
  const fields = Object.entries(lines)
    .filter(([, v]) => v)
    .map(([k, v]) => ({ type: "mrkdwn", text: `*${k}:*\n${v}` }));
  return {
    text: title,
    blocks: [
      { type: "header", text: { type: "plain_text", text: title } },
      { type: "section", fields },
    ],
  };
}
