/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_SERVICE_ROLE: string;
  readonly SITE_ORIGIN: string;
  readonly SLACK_WEBHOOK_URL?: string;
  readonly RESEND_API_KEY?: string;
  readonly ALERT_TO_EMAIL?: string;
  readonly ALERT_FROM_EMAIL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
