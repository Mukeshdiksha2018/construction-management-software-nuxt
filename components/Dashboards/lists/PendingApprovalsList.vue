<template>
  <div>
    <!-- Show pending items if any exist -->
    <div v-if="pendingItems.length > 0" class="space-y-1">
      <div 
        v-for="item in pendingItems" 
        :key="item.id" 
        class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
        @click="handleItemClick(item)"
      >
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-full flex items-center justify-center" :class="getStatusColor(item.status).bg">
            <UIcon :name="item.icon" class="w-5 h-5" :class="getStatusColor(item.status).icon" />
          </div>
          <div>
            <p class="font-medium text-sm text-gray-900 dark:text-gray-100">{{ item.title }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ getTypeLabel(item.type) }} • {{ item.vendor }}
            </p>
          </div>
        </div>
        <div class="text-right">
          <p class="font-semibold text-sm text-gray-900 dark:text-gray-100">{{ formatCurrency(item.amount) }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ item.daysAgo }} days ago</p>
        </div>
      </div>
      
      <div class="pt-2">
        <UButton 
          variant="ghost" 
          color="blue" 
          size="sm" 
          class="w-full"
          @click="viewAllApprovals"
        >
          View All Pending Approvals ({{ totalPending }})
        </UButton>
      </div>
    </div>

    <!-- Show empty state when no pending items -->
    <div v-else class="text-center py-8">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
        <UIcon name="i-heroicons-check-circle" class="w-8 h-8 text-green-600 dark:text-green-400" />
      </div>
      <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">All Caught Up!</h3>
      <p class="text-sm text-gray-500 dark:text-gray-400">No pending approvals at the moment.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useCurrencyFormat } from '@/composables/useCurrencyFormat'
import { useDateFormat } from '@/composables/useDateFormat'
import { useBillEntriesStore } from '@/stores/billEntries'
import { useEstimatesStore } from '@/stores/estimates'
import { usePurchaseOrdersStore } from '@/stores/purchaseOrders'
import { useChangeOrdersStore } from '@/stores/changeOrders'

const { formatCurrency } = useCurrencyFormat()
const { formatDate, getDaysAgo } = useDateFormat()
const billEntriesStore = useBillEntriesStore()
const estimatesStore = useEstimatesStore()
const purchaseOrdersStore = usePurchaseOrdersStore()
const changeOrdersStore = useChangeOrdersStore()

// Combine pending bill entries
const pendingItems = computed(() => {
  const items = []
  
  
  // Add pending bill entries (with null safety)
  if (billEntriesStore.billEntries && Array.isArray(billEntriesStore.billEntries)) {
    billEntriesStore.billEntries
      .filter(bill => bill && bill.approval_status === 'Pending')
      .forEach(bill => {
        items.push({
          id: `bill-${bill.id}`,
          title: bill.number || 'Bill Entry',
          vendor: bill.payee_name || 'N/A',
          amount: bill.amount || 0,
          status: getPriorityStatus(bill.amount || 0),
          daysAgo: getDaysAgo(bill.bill_date),
          icon: 'i-heroicons-receipt-percent',
          type: 'bill',
          originalEntry: bill
        })
      })
  }
  
  // Add pending estimates (with status === 'Ready')
  if (estimatesStore.estimates && Array.isArray(estimatesStore.estimates)) {
    estimatesStore.estimates
      .filter(estimate => estimate && estimate.status === 'Ready')
      .forEach(estimate => {
        items.push({
          id: `estimate-${estimate.uuid}`,
          title: estimate.estimate_number || 'Estimate',
          vendor: estimate.project?.project_name || 'N/A',
          amount: estimate.final_amount || 0,
          status: getPriorityStatus(estimate.final_amount || 0),
          daysAgo: getDaysAgo(estimate.estimate_date),
          icon: 'i-heroicons-calculator',
          type: 'estimate',
          originalEntry: estimate
        })
      })
  }
  
  // Add pending purchase orders (with status === 'Ready')
  if (purchaseOrdersStore.purchaseOrders && Array.isArray(purchaseOrdersStore.purchaseOrders)) {
    purchaseOrdersStore.purchaseOrders
      .filter(po => po && po.status === 'Ready')
      .forEach(po => {
        items.push({
          id: `po-${po.uuid}`,
          title: po.po_number || 'Purchase Order',
          vendor: po.vendor_name || 'N/A',
          amount: po.total_po_amount || 0,
          status: getPriorityStatus(po.total_po_amount || 0),
          daysAgo: getDaysAgo(po.entry_date),
          icon: 'i-heroicons-shopping-cart',
          type: 'purchase_order',
          originalEntry: po
        })
      })
  }
  
  // Add pending change orders (with status === 'Ready')
  if (changeOrdersStore.changeOrders && Array.isArray(changeOrdersStore.changeOrders)) {
    changeOrdersStore.changeOrders
      .filter(co => co && co.status === 'Ready')
      .forEach(co => {
        items.push({
          id: `co-${co.uuid}`,
          title: co.co_number || 'Change Order',
          vendor: co.vendor_name || 'N/A',
          amount: co.total_co_amount || 0,
          status: getPriorityStatus(co.total_co_amount || 0),
          daysAgo: getDaysAgo(co.created_date),
          icon: 'i-heroicons-document-text',
          type: 'change_order',
          originalEntry: co
        })
      })
  }
  
  // Sort by days ago (most recent first)
  return items.sort((a, b) => a.daysAgo - b.daysAgo)
})

const totalPending = computed(() => pendingItems.value.length)

// Determine priority status based on amount
const getPriorityStatus = (amount) => {
  if (amount >= 5000) return 'high'
  if (amount >= 2000) return 'medium'
  return 'low'
}

const getStatusColor = (status) => {
  const colors = {
    high: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      icon: 'text-red-600 dark:text-red-400'
    },
    medium: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      icon: 'text-yellow-600 dark:text-yellow-400'
    },
    low: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      icon: 'text-blue-600 dark:text-blue-400'
    }
  }
  return colors[status] || colors.low
}

const getTypeLabel = (type) => {
  const labels = {
    estimate: 'Estimate',
    bill: 'Bill Entry',
    purchase_order: 'Purchase Order',
    change_order: 'Change Order'
  }
  return labels[type] || type
}

const handleItemClick = (item) => {
  // Navigate based on item type
  if (item.type === 'estimate') {
    navigateTo(`/estimates/form/${item.originalEntry.uuid}`)
  } else if (item.type === 'purchase_order') {
    // Navigate to purchase orders page - the list component will handle opening the modal
    navigateTo('/projects?tab=purchase-orders')
  } else if (item.type === 'change_order') {
    // Navigate to change orders page - the list component will handle opening the modal
    navigateTo('/projects?tab=change-orders')
  } else {
    // Navigate to bill entries page
    navigateTo('/payables')
  }
}

const viewAllApprovals = () => {
  // Navigate to a combined approvals page or show all pending items
  navigateTo('/approvals')
}
</script>
