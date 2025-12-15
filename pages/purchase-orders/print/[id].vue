<template>
  <div class="min-h-screen bg-white text-black">
    <!-- On-screen controls (hidden in print) -->
    <div class="print:hidden w-full">
      <div class="max-w-5xl mx-auto px-4 pt-4">
        <div class="flex justify-end">
          <UButton color="primary" icon="i-heroicons-printer" @click="printPage">Print</UButton>
        </div>
      </div>
    </div>

    <div class="max-w-5xl mx-auto px-4 py-6 print:px-2 print:py-2">
      <PurchaseOrderPreview :purchase-order-uuid="purchaseOrderId" />
    </div>
  </div>
  
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import PurchaseOrderPreview from '@/components/PurchaseOrders/PurchaseOrderPreview.vue'

definePageMeta({
  layout: false // Use bare page for print cleanliness
})

const route = useRoute()

const purchaseOrderId = computed(() => route.params.id as string)

const printPage = () => {
  // Trigger print when user clicks the button to ensure content is fully rendered
  window.print()
}

</script>

<style>
/* Print optimizations */
@media print {
  html, body { 
    background: #ffffff !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  
  /* Remove page margins */
  @page {
    margin: 0.5cm;
  }
  
  /* Optimize spacing */
  * {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
}
</style>

