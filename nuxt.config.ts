// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";
import "@dotenvx/dotenvx/config";

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
    head: {
      link: [
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap",
        },
      ],
    },
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