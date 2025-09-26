import type { MiddlewareHandler } from "astro";

export const onRequest: MiddlewareHandler = async (ctx, next) => {
  const path = ctx.url.pathname;

  // Protect only /admin pages (but NOT the login page)
  if (path.startsWith("/admin") && path !== "/admin/login") {
    const cookie = ctx.cookies.get("houdlab_admin");
    const expected = import.meta.env.ADMIN_PASSWORD;

    if (!expected) {
      return new Response("ADMIN_PASSWORD not set", { status: 500 });
    }
    if (!cookie || cookie.value !== expected) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  return next();
};
