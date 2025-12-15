<template>
  <UCard 
    :ui="{
      root: 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg hover:shadow-xl transition-shadow duration-300 h-20',
      header: 'p-0',
      body: 'p-0 h-full',
      footer: 'p-0'
    }"
  >
    <div class="flex items-center justify-between h-full px-4">
      <div>
        <p class="text-xs opacity-90">Accounts Payable</p>
        <p class="text-xl font-bold">
          <USkeleton v-if="loading" class="h-6 w-20" />
          <span v-else>{{ formatCurrency(billsTotalAmount) }}</span>
        </p>
        <p class="text-xs opacity-90">
          <USkeleton v-if="loading" class="h-3 w-24 mt-1" />
          <span v-else>{{ changeText }}</span>
        </p>
      </div>
      <UIcon name="i-heroicons-arrow-trending-down" class="w-6 h-6 opacity-80" />
    </div>
  </UCard>
</template>

<script setup>
import { computed, toRef } from 'vue'
import { useBillEntriesData } from '@/composables/useBillEntriesData'

const props = defineProps({
  corporationUuid: {
    type: String,
    default: null
  }
})

const { loading, billsTotalAmount, formatCurrency } = useBillEntriesData(toRef(props, 'corporationUuid'))

// Calculate change percentage (placeholder logic - you can implement actual comparison)
const changeText = computed(() => {
  // For now, showing a static change. You can implement actual comparison logic here
  return '-5.2% vs last month'
})
</script>
