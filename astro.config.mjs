// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";

import tailwindcss from "@tailwindcss/vite";
import vercel from "@astrojs/vercel/serverless"; // or '@astrojs/vercel/edge'

// https://astro.build/config
export default defineConfig({
  output: "server", // IMPORTANT: SSR build
  adapter: vercel(),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
