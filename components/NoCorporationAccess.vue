<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
    <div class="max-w-md w-full space-y-8">
      <div class="text-center">
        <!-- Icon -->
        <div class="mx-auto h-24 w-24 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20 mb-6">
          <UIcon name="i-lucide-shield-alert" class="h-12 w-12 text-red-600 dark:text-red-400" />
        </div>

        <!-- Title -->
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          No Corporation Access
        </h1>

        <!-- Description -->
        <p class="text-lg text-gray-600 dark:text-gray-300 mb-8">
          You don't have access to any corporations at the moment. Please contact your administrator to request access to the appropriate corporation(s).
        </p>

        <!-- Action Buttons -->
        <div class="space-y-4">
          <!-- Logout Button -->
          <UButton
            color="neutral"
            size="lg"
            variant="solid"
            icon="i-lucide-log-out"
            @click="logout"
            class="w-full"
          >
            Logout
          </UButton>
        </div>

        <!-- Additional Info -->
        <div class="mt-8 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div class="flex items-start">
            <UIcon name="i-lucide-info" class="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
            <div class="text-sm text-red-800 dark:text-red-200">
              <p class="font-medium mb-1">Need Help?</p>
              <p>Your administrator can grant you access to specific corporations based on your role and responsibilities.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();

// Logout function
const logout = async () => {
  await authStore.logout();
};
</script>
