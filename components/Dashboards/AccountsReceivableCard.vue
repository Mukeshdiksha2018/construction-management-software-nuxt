<template>
  <UCard 
    :ui="{
      root: 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-lg hover:shadow-xl transition-shadow duration-300 h-20',
      header: 'p-0',
      body: 'p-0 h-full',
      footer: 'p-0'
    }"
  >
    <div class="flex items-center justify-between h-full px-4">
      <div>
        <p class="text-xs opacity-90">Accounts Receivable</p>
        <p class="text-xl font-bold">Coming Soon</p>
        <p class="text-xs opacity-90">Feature in development</p>
      </div>
      <UIcon name="i-heroicons-wrench-screwdriver" class="w-6 h-6 opacity-80" />
    </div>
  </UCard>
</template>

<script setup>
// Accounts receivable feature is not yet implemented
// This card shows a placeholder message
</script>
