<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Reports</h1>
      <div class="h-1 w-16 bg-gradient-to-r from-brand-500 to-brand-600 dark:from-brand-400 dark:to-brand-500 mt-2 rounded"></div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <!-- Detailed Budget Report -->
      <UCard 
        class="hover:shadow-xl transition-all duration-300 cursor-pointer group border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500"
        :ui="{ body: 'p-5' }"
        @click="navigateToDetailedBudgetReport"
      >
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
            <UIcon name="i-heroicons-calculator-solid" class="w-6 h-6 text-white" />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
              Detailed Budget Report
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Comprehensive budget analysis</p>
          </div>
        </div>
      </UCard>

      <!-- Purchase Order Details with Invoice Summary -->
      <UCard 
        class="hover:shadow-xl transition-all duration-300 cursor-pointer group border border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500"
        :ui="{ body: 'p-5' }"
        @click="router.push('/reports/purchase-order-details-invoice-summary')"
      >
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
            <UIcon name="i-heroicons-document-text-solid" class="w-6 h-6 text-white" />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              Purchase Order Details with Invoice Summary
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">PO and invoice details</p>
          </div>
        </div>
      </UCard>

      <!-- Purchase Order Breakout -->
      <UCard 
        class="hover:shadow-xl transition-all duration-300 cursor-pointer group border border-gray-200 dark:border-gray-700 hover:border-amber-400 dark:hover:border-amber-500"
        :ui="{ body: 'p-5' }"
        @click="router.push('/reports/purchase-order-breakout')"
      >
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
            <UIcon name="i-heroicons-list-bullet-solid" class="w-6 h-6 text-white" />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              Purchase Order Breakout
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Detailed PO breakdown</p>
          </div>
        </div>
      </UCard>

      <!-- Vendor Accounts Payable Summary -->
      <UCard 
        class="hover:shadow-xl transition-all duration-300 cursor-pointer group border border-gray-200 dark:border-gray-700 hover:border-brand-400 dark:hover:border-brand-500"
        :ui="{ body: 'p-5' }"
        @click="router.push('/reports/vendor-accounts-payable-summary')"
      >
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 dark:from-brand-600 dark:to-brand-700 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
            <UIcon name="i-heroicons-credit-card-solid" class="w-6 h-6 text-white" />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
              Vendor Accounts Payable Summary
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Vendor payment overview</p>
          </div>
        </div>
      </UCard>

      <!-- Stock Report -->
      <UCard 
        class="hover:shadow-xl transition-all duration-300 cursor-pointer group border border-gray-200 dark:border-gray-700 hover:border-teal-400 dark:hover:border-teal-500"
        :ui="{ body: 'p-5' }"
        @click="router.push('/reports/stock-report')"
      >
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 dark:from-teal-600 dark:to-teal-700 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
            <UIcon name="i-heroicons-cube-solid" class="w-6 h-6 text-white" />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
              Stock Report
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Inventory status overview</p>
          </div>
        </div>
      </UCard>

      <!-- PO Wise Stock Report -->
      <UCard 
        class="hover:shadow-xl transition-all duration-300 cursor-pointer group border border-gray-200 dark:border-gray-700 hover:border-rose-400 dark:hover:border-rose-500"
        :ui="{ body: 'p-5' }"
        @click="router.push('/reports/po-wise-stock-report')"
      >
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 dark:from-rose-600 dark:to-rose-700 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
            <UIcon name="i-heroicons-archive-box-solid" class="w-6 h-6 text-white" />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
              PO Wise Stock Report
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Stock by purchase order</p>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()

// Navigation handler for Detailed Budget Report
const navigateToDetailedBudgetReport = async () => {
  console.log('[Reports] Navigating to detailed budget report')
  const path = '/reports/detailed-budget-report'
  
  try {
    // Try navigateTo first (Nuxt's recommended way)
    const result = await navigateTo(path)
    if (result === false) {
      // Navigation was prevented, try router.push
      console.log('[Reports] navigateTo returned false, trying router.push')
      await router.push(path)
    }
  } catch (error: any) {
    console.error('[Reports] navigateTo failed, trying router.push:', error)
    // Fallback to router.push
    try {
      await router.push(path)
    } catch (err: any) {
      console.error('[Reports] router.push also failed:', err)
    }
  }
}

// Navigation handler using Nuxt's navigateTo
const navigateToReport = async (path: string) => {
  console.log('[Reports] Navigating to:', path)
  try {
    await navigateTo(path)
    console.log('[Reports] Navigation successful')
  } catch (error) {
    console.error('[Reports] Navigation error:', error)
    // Fallback to router.push if navigateTo fails
    router.push(path).catch((err) => {
      console.error('[Reports] Router.push also failed:', err)
    })
  }
}

// Set page title
useHead({
  title: 'Reports - Property Management'
})

definePageMeta({
  layout: "main-layout",
  middleware: "auth",
});
</script>
