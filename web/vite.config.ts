import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages: /agenteur/ (default). Dominio proprio: BASE_PATH=/
const base = process.env.BASE_PATH ?? "/agenteur/";

export default defineConfig({
  base,
  plugins: [
    svelte(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icona.svg"],
      workbox: { globPatterns: ["**/*.{js,css,html,svg,png,json,ico,woff2}"] },
      manifest: {
        name: "Agenteur",
        short_name: "Agenteur",
        lang: "it",
        display: "standalone",
        start_url: base,
        scope: base,
        background_color: "#FEF7FF",
        theme_color: "#FEF7FF",
        icons: [
          { src: "icona-192.png", sizes: "192x192", type: "image/png" },
          { src: "icona-512.png", sizes: "512x512", type: "image/png" },
          { src: "icona-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
