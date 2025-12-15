<template>
  <div class="dashboard-container">

    <!-- Primary Stats Cards (Always at Top) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6 max-w-4xl">
      <!-- Active Vendors Card -->
      <UCard
        :ui="{
          root: 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg hover:shadow-xl transition-shadow duration-300 h-16',
          header: 'p-0',
          body: 'p-0 h-full',
          footer: 'p-0'
        }"
      >
      <div class="flex items-center justify-between h-full px-3">
        <div>
          <p class="text-xs opacity-90">Active Vendors</p>
          <p class="text-xl font-bold">
            <USkeleton v-if="vendorShowSkeleton" class="h-6 w-10" />
            <span v-else>{{ vendorCountDisplay }}</span>
          </p>
        </div>
        <UIcon name="i-heroicons-building-storefront" class="w-6 h-6 opacity-80" />
      </div>
      </UCard>

      <PendingProjectsCard />
      <PendingInvoicesCard :corporation-uuid="selectedCorporationId ?? undefined" />
    </div>

    <!-- Responsive Dashboard Grid - Masonry Style Layout -->
    <div class="dashboard-grid">
      <!-- Projects by Status -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-document-text" class="w-5 h-5 text-blue-500" />
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Projects by Status</h3>
          </div>
        </template>
        <ProjectsByStatusChart />
      </UCard>

      <!-- Pending Approvals -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-clock" class="w-5 h-5 text-orange-500" />
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Pending Approvals</h3>
            </div>
            <UBadge color="warning" variant="soft" size="sm">{{ totalPendingApprovals }}</UBadge>
          </div>
        </template>
        <PendingApprovalsList />
      </UCard>

      <!-- Other Tools & Information Section -->
      <!-- Quick Actions -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-bolt" class="w-5 h-5 text-primary-500" />
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
          </div>
        </template>
        <QuickActions />
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useCorporationStore } from '@/stores/corporations'
import { useBillEntriesStore } from '@/stores/billEntries'
import { useEstimatesStore } from '@/stores/estimates'
import { usePurchaseOrdersStore } from '@/stores/purchaseOrders'
import { useChangeOrdersStore } from '@/stores/changeOrders'
import { useVendorStore } from '@/stores/vendors'
import ProjectsByStatusChart from './charts/ProjectsByStatusChart.vue'
import PendingApprovalsList from './lists/PendingApprovalsList.vue'
import QuickActions from './actions/QuickActions.vue'
import PendingProjectsCard from './PendingProjectsCard.vue'
import PendingInvoicesCard from './PendingInvoicesCard.vue'

const corporationStore = useCorporationStore()
const billEntriesStore = useBillEntriesStore()
const estimatesStore = useEstimatesStore()
const purchaseOrdersStore = usePurchaseOrdersStore()
const changeOrdersStore = useChangeOrdersStore()
const vendorStore = useVendorStore()
const selectedCorporationId = computed(() => corporationStore.selectedCorporationId)

// Calculate total pending approvals
const totalPendingApprovals = computed(() => {
  let count = 0

  // Count pending bill entries
  if (billEntriesStore.billEntries && Array.isArray(billEntriesStore.billEntries)) {
    count += billEntriesStore.billEntries.filter(bill =>
      bill && bill.approval_status === 'Pending'
    ).length
  }

  // Count pending estimates (status === 'Ready')
  if (estimatesStore.estimates && Array.isArray(estimatesStore.estimates)) {
    count += estimatesStore.estimates.filter(estimate =>
      estimate && estimate.status === 'Ready'
    ).length
  }

  // Count pending purchase orders (status === 'Ready')
  if (purchaseOrdersStore.purchaseOrders && Array.isArray(purchaseOrdersStore.purchaseOrders)) {
    count += purchaseOrdersStore.purchaseOrders.filter(po =>
      po && po.status === 'Ready'
    ).length
  }

  // Count pending change orders (status === 'Ready')
  if (changeOrdersStore.changeOrders && Array.isArray(changeOrdersStore.changeOrders)) {
    count += changeOrdersStore.changeOrders.filter(co =>
      co && co.status === 'Ready'
    ).length
  }

  return count
})

// Vendor count calculations
const hasCorporationSelected = computed(() => !!corporationStore.selectedCorporationId)
const isVendorLoading = computed(() => vendorStore.loading && hasCorporationSelected.value)

const vendorCount = computed(() => {
  if (!hasCorporationSelected.value) {
    return 0
  }
  if (!vendorStore.vendors) {
    return -1 // Special value to indicate undefined data
  }
  return vendorStore.vendors.filter(vendor => vendor && vendor.is_active).length
})

const vendorCountDisplay = computed(() => {
  if (!hasCorporationSelected.value) {
    return '--'
  }
  if (vendorCount.value === -1) {
    return '--'
  }
  return vendorCount.value.toLocaleString()
})

const vendorShowSkeleton = computed(() => isVendorLoading.value)

// Ensure vendors are loaded when corporation changes
const ensureVendorsLoaded = async (corporationId: string | null) => {
  if (!corporationId) {
    return
  }

  try {
    await vendorStore.fetchVendors(corporationId)
  } catch (error) {
    console.error('Failed to load vendors:', error)
  }
}

onMounted(() => {
  ensureVendorsLoaded(corporationStore.selectedCorporationId)
})

watch(
  () => corporationStore.selectedCorporationId,
  (newCorporationId, oldCorporationId) => {
    if (newCorporationId && newCorporationId !== oldCorporationId) {
      ensureVendorsLoaded(newCorporationId)
    }
  }
)

</script>

<style scoped>
.dashboard-grid {
  columns: 1;
  gap: 1.5rem;
}

/* Responsive Masonry Layout - Mobile First */
@media (min-width: 640px) {
  .dashboard-grid {
    columns: 2;
  }
}

@media (min-width: 1024px) {
  .dashboard-grid {
    columns: 3;
  }
}

@media (min-width: 1536px) {
  .dashboard-grid {
    columns: 4;
  }
}

/* Dashboard Cards */
.dashboard-grid > * {
  break-inside: avoid;
  margin-bottom: 1.5rem;
}

/* Featured Card - Dark theme like Cloudflare */
.dashboard-featured {
  background-color: rgb(15 23 42);
  color: white;
  border-color: rgb(51 65 85);
}

.dashboard-featured :deep(.card-header) {
  border-color: rgb(51 65 85);
}

.dashboard-featured h3 {
  color: white;
}

/* Enhanced Card Styling */
.dashboard-grid :deep(.card) {
  background-color: white;
  border: 1px solid rgb(229 231 235);
  border-radius: 0.5rem;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}

.dashboard-grid :deep(.card:hover) {
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  border-color: rgb(209 213 219);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .dashboard-grid :deep(.card) {
    background-color: rgb(31 41 55);
    border-color: rgb(55 65 81);
  }
  
  .dashboard-grid :deep(.card:hover) {
    border-color: rgb(75 85 99);
  }
}

/* Mobile-specific adjustments */
@media (max-width: 639px) {
  .dashboard-container {
    padding: 1rem 0.5rem;
  }
  
  .dashboard-grid {
    gap: 1rem;
  }
  
  .dashboard-grid > * {
    margin-bottom: 1rem;
  }
}

/* Chart container improvements */
.dashboard-grid :deep(.chart-container) {
  width: 100%;
  height: 100%;
}

/* Loading states */
.dashboard-grid :deep(.loading) {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  background-color: rgb(229 231 235);
  border-radius: 0.25rem;
}

@media (prefers-color-scheme: dark) {
  .dashboard-grid :deep(.loading) {
    background-color: rgb(55 65 81);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .5;
  }
}

/* Coming Soon Widget Styling */
.coming-soon-widget {
  opacity: 0.8;
  border-style: dashed;
  border-color: rgb(209 213 219);
}

.coming-soon-widget:hover {
  opacity: 1;
  border-color: rgb(156 163 175);
}

@media (prefers-color-scheme: dark) {
  .coming-soon-widget {
    border-color: rgb(75 85 99);
  }
  
  .coming-soon-widget:hover {
    border-color: rgb(107 114 128);
  }
}
</style>