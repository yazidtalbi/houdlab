// src/middleware.ts
import type { MiddlewareHandler } from "astro";

export const onRequest: MiddlewareHandler = async (ctx, next) => {
  try {
    const path = ctx.url.pathname;

    // Only guard /admin (not /admin/login)
    if (path.startsWith("/admin") && path !== "/admin/login") {
      const cookie = ctx.cookies.get("houdlab_admin");
      const expected = import.meta.env.ADMIN_PASSWORD; // provided by Vercel at build time

      // If admin password not configured in prod, don't kill the whole site.
      if (!expected) {
        console.warn("[admin] ADMIN_PASSWORD missing in env");
        return new Response("Admin is not configured", { status: 503 });
      }
      if (!cookie || cookie.value !== expected) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    return next();
  } catch (err) {
    console.error("middleware error", err);
    // Never throw; return 500 for that request only.
    return new Response("Internal error", { status: 500 });
  }
};
