// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ["@nuxt/ui", "@pinia/nuxt", "nuxt-tiptap-editor"],
  vite: {
    plugins: [tailwindcss()],
  },
  css: ["~/assets/css/main.css"],
  ssr: false, // Disable SSR for client-side rendering
  imports: {
    dirs: ["stores"], // Ensures auto-import of stores
  },
  pinia: {
    storesDirs: ["./stores/**"],
  },
  app: {
    pageTransition: {
      name: "page",
      mode: "out-in",
      duration: 300, // 300ms delay
    },
  },
  runtimeConfig: {
    public: {
      SUPABASE_URL: process.env.NUXT_SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.NUXT_SUPABASE_ANON_KEY,
      BASE_URL:
        process.env.NUXT_BASE_URL ||
        (process.env.NETLIFY || process.env.NODE_ENV === "production"
          ? "https://brilliant-crisp-2fd6ab.netlify.app"
          : "http://localhost:3000"),
    },
    SUPABASE_SERVICE_ROLE_KEY: process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY,
  },
  ui: {
    theme: {
      colors: [
        "primary",
        "secondary",
        "info",
        "success",
        "warning",
        "error",
        "neutral",
      ],
    },
  },
  compatibilityDate: "2025-08-31",
});