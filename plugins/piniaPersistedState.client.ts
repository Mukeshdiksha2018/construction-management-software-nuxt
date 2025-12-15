import { defineNuxtPlugin } from "#app";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import type { Pinia } from "pinia";

export default defineNuxtPlugin((nuxtApp) => {
  const pinia = nuxtApp.$pinia as Pinia;

  // Add persisted state plugin
  pinia.use(piniaPluginPersistedstate);

  // Ensure DevTools can see the stores
  if (process.dev) {
    // Make sure stores are accessible for DevTools
    pinia._s.forEach((store) => {
      console.log(`📦 Pinia store registered: ${store.$id}`);
    });
  }
});
