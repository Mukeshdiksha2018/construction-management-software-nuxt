<template>
  <div class="space-y-6">
    <ClientOnly>
      <VendorManagement />
      <template #fallback>
        <div class="flex items-center justify-center h-64">
          <div class="text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p class="text-gray-600">Loading vendors...</p>
          </div>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import VendorManagement from '@/components/PurchaseOrders/VendorManagement.vue'

definePageMeta({
  layout: "main-layout",
  middleware: "auth",
});

// Set page title
useHead({
  title: 'Vendors - Nimble Property Management'
})
</script>

