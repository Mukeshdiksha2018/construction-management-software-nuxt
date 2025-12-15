<template>
  <UCard
    :ui="{
      root: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-xl transition-shadow duration-300 h-16',
      header: 'p-0',
      body: 'p-0 h-full',
      footer: 'p-0'
    }"
  >
    <div class="flex items-center justify-between h-full px-3">
      <div>
        <p class="text-xs opacity-90">Pending Invoices</p>
        <p class="text-xl font-bold">
          <USkeleton v-if="loading" class="h-6 w-10" />
          <span v-else>{{ pendingBillsCount }}</span>
        </p>
      </div>
      <UIcon name="i-heroicons-document-text" class="w-6 h-6 opacity-80" />
    </div>
  </UCard>
</template>

<script setup>
import { toRef } from 'vue'
import { useBillEntriesData } from '@/composables/useBillEntriesData'

const props = defineProps({
  corporationUuid: {
    type: String,
    default: null
  }
})

const { loading, pendingBillsCount, pendingBillsTotal, formatCurrency } = useBillEntriesData(toRef(props, 'corporationUuid'))
</script>
