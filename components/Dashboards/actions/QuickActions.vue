<template>
  <div class="space-y-3">
    <div class="grid grid-cols-2 gap-3">
      <UButton 
        color="blue" 
        variant="soft" 
        class="h-20 flex flex-col items-center justify-center space-y-2 hover:shadow-md transition-shadow duration-200"
        @click="createInvoice"
      >
        <UIcon name="i-heroicons-plus-circle" class="w-6 h-6 text-blue-600 dark:text-blue-400" />
        <span class="text-xs font-medium text-gray-900 dark:text-gray-100">Create Invoice</span>
      </UButton>
      
      <UButton 
        color="green" 
        variant="soft" 
        class="h-20 flex flex-col items-center justify-center space-y-2 hover:shadow-md transition-shadow duration-200"
        @click="recordPayment"
      >
        <UIcon name="i-heroicons-credit-card" class="w-6 h-6 text-green-600 dark:text-green-400" />
        <span class="text-xs font-medium text-gray-900 dark:text-gray-100">Record Payment</span>
      </UButton>
      
      <UButton 
        color="primary" 
        variant="soft" 
        class="h-20 flex flex-col items-center justify-center space-y-2 hover:shadow-md transition-shadow duration-200"
        @click="addExpense"
      >
        <UIcon name="i-heroicons-receipt-refund" class="w-6 h-6 text-brand-600 dark:text-brand-400" />
        <span class="text-xs font-medium text-gray-900 dark:text-gray-100">Add Expense</span>
      </UButton>
    </div>
    
    <div class="pt-2 space-y-2">
      <UButton 
        variant="ghost" 
        color="gray" 
        size="sm" 
        class="w-full justify-start text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
        @click="viewChartOfAccounts"
      >
        <UIcon name="i-heroicons-squares-2x2" class="w-4 h-4 mr-2 text-gray-600 dark:text-gray-400" />
        Chart of Accounts
      </UButton>
      
      <UButton 
        variant="ghost" 
        color="gray" 
        size="sm" 
        class="w-full justify-start text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
        @click="manageVendors"
      >
        <UIcon name="i-heroicons-building-office" class="w-4 h-4 mr-2 text-gray-600 dark:text-gray-400" />
        Manage Vendors
      </UButton>
      
      <UButton 
        variant="ghost" 
        color="gray" 
        size="sm" 
        class="w-full justify-start text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
        @click="reconcileAccounts"
      >
        <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 mr-2 text-gray-600 dark:text-gray-400" />
        Reconcile Accounts
      </UButton>
    </div>
  </div>
</template>

<script setup>
const createInvoice = () => {
  // Navigate to invoice creation page
}

const recordPayment = () => {
  // Navigate to payment recording page
}

const addExpense = () => {
  // Navigate to expense creation page
}



const viewChartOfAccounts = () => {
  // Navigate to chart of accounts page
  navigateTo('/corporation?tab=chart-of-accounts')
}

const manageVendors = () => {
  // Navigate to vendor management page
  navigateTo('/vendors')
}

const reconcileAccounts = () => {
  // Navigate to account reconciliation page
}
</script>
