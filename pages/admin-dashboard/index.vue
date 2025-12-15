<template>
  <div class="flex items-center justify-center min-h-[calc(100vh-200px)]">
    <div class="text-center">
      <!-- Icon -->
      <div class="mx-auto h-24 w-24 flex items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/20 mb-6">
        <UIcon name="i-lucide-construction" class="h-12 w-12 text-primary-600 dark:text-primary-400" />
      </div>

      <!-- Title -->
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-4">
        Admin Dashboard
      </h1>

      <!-- Message -->
      <p class="text-lg text-gray-600 dark:text-gray-400 max-w-md">
        We're currently building this feature. Check back soon for administrative insights and system metrics.
      </p>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();

// Use the definePageMeta function to set the layout for this page
definePageMeta({
  layout: "main-layout",
  middleware: "auth",
});
</script>

