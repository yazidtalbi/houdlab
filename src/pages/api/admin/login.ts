export const prerender = false;

import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const pwd = String(form.get("password") ?? "");

  if (pwd === import.meta.env.ADMIN_PASSWORD) {
    cookies.set("houdlab_admin", pwd, {
      httpOnly: true,
      sameSite: "strict",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    });
    return redirect("/admin", 302);
  }

  return new Response("Invalid password", { status: 403 });
};
