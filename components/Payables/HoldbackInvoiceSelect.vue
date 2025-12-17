<template>
  <div>
    <!-- Modal with table -->
    <UModal
      v-model:open="showModal"
      title="Select Invoice for Holdback Invoice"
      :ui="{
        content: 'max-w-6xl'
      }"
    >
      <template #body>
        <div class="space-y-4">
          <!-- Search -->
          <div>
            <UInput
              v-model="searchFilter"
              placeholder="Search by invoice number, PO/CO number..."
              icon="i-heroicons-magnifying-glass"
              variant="subtle"
              size="sm"
              class="w-full"
            />
          </div>

          <!-- Loading state -->
          <div v-if="loading" class="text-center py-12">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p class="mt-2 text-sm text-gray-500">Loading vendor invoices...</p>
          </div>

          <!-- Table -->
          <div v-else-if="filteredOptions.length > 0">
            <UTable
              :data="filteredOptions"
              :columns="tableColumns"
              class="w-full"
            />
          </div>

          <!-- Empty state -->
          <div v-else class="text-center py-12">
            <UIcon name="i-heroicons-document-text" class="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p class="text-gray-500 text-lg">No invoices found</p>
            <p class="text-gray-400 text-sm mt-2">
              No vendor invoices against purchase orders or change orders available for this vendor and project
            </p>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, h, resolveComponent } from 'vue'
import { useCurrencyFormat } from '@/composables/useCurrencyFormat'
import { useDateFormat } from '@/composables/useDateFormat'
import type { TableColumn } from '@nuxt/ui'

// Props
interface Props {
  modelValue?: boolean
  projectUuid?: string
  corporationUuid?: string
  vendorUuid?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'select': [invoice: any]
}>()

// Composables
const { formatCurrency } = useCurrencyFormat()
const { formatDate } = useDateFormat()

// Resolve components for table columns
const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')

// Local state
const showModal = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})
const searchFilter = ref('')
const vendorInvoices = ref<any[]>([])
const loading = ref(false)

// Helper function to calculate holdback amount from invoice
const calculateHoldbackAmount = (invoice: any): number => {
  const invoiceAmount = typeof invoice.amount === 'number' ? invoice.amount : (parseFloat(String(invoice.amount || '0')) || 0)
  const holdbackPercentage = typeof invoice.holdback === 'number' ? invoice.holdback : (parseFloat(String(invoice.holdback || '0')) || 0)
  if (holdbackPercentage > 0 && invoiceAmount > 0) {
    return (invoiceAmount * holdbackPercentage) / 100
  }
  return 0
}

// Fetch vendor invoices directly from API (scoped to form's corporation)
const fetchVendorInvoices = async (corporationUuid: string) => {
  if (!corporationUuid) {
    vendorInvoices.value = []
    return
  }
  
  loading.value = true
  try {
    const response = await $fetch<{ data: any[] }>(`/api/vendor-invoices?corporation_uuid=${corporationUuid}`)
    const invoices = Array.isArray(response?.data) ? response.data : []
    vendorInvoices.value = invoices
  } catch (error) {
    console.error('[HoldbackInvoiceSelect] Error fetching vendor invoices:', error)
    vendorInvoices.value = []
  } finally {
    loading.value = false
  }
}

// Vendor invoices options computed property
const invoiceOptions = computed(() => {
  if (!props.projectUuid || !props.corporationUuid || !props.vendorUuid) {
    return [];
  }
  
  // Filter vendor invoices: AGAINST_PO or AGAINST_CO, matching corporation, project, and vendor
  const filteredInvoices = vendorInvoices.value.filter(invoice => {
    const matchesCorporation = invoice.corporation_uuid === props.corporationUuid
    const matchesProject = invoice.project_uuid === props.projectUuid
    const matchesVendor = invoice.vendor_uuid === props.vendorUuid
    const isAgainstPOOrCO = invoice.invoice_type === 'AGAINST_PO' || invoice.invoice_type === 'AGAINST_CO'
    const isActive = invoice.is_active !== false
    
    return matchesCorporation && matchesProject && matchesVendor && isAgainstPOOrCO && isActive
  })
  
  return filteredInvoices.map(invoice => {
    const invoiceNumber = invoice.number || 'Unnamed Invoice'
    const invoiceAmount = typeof invoice.amount === 'number' ? invoice.amount : (parseFloat(String(invoice.amount || '0')) || 0)
    const holdbackPercentage = typeof invoice.holdback === 'number' ? invoice.holdback : (parseFloat(String(invoice.holdback || '0')) || 0)
    const holdbackAmount = calculateHoldbackAmount(invoice)
    
    // Get PO/CO number based on invoice type
    const poCoNumber = invoice.invoice_type === 'AGAINST_PO' 
      ? (invoice.po_number || 'N/A')
      : (invoice.co_number || 'N/A')
    
    // Format date
    const billDate = invoice.bill_date || ''
    const formattedDate = formatDate(billDate)
    
    return {
      label: invoiceNumber,
      value: invoice.uuid,
      invoice: invoice,
      invoiceNumber: invoiceNumber,
      poCoNumber: poCoNumber,
      formattedDate: formattedDate || 'N/A',
      invoiceAmount: invoiceAmount,
      formattedInvoiceAmount: formatCurrency(invoiceAmount),
      holdbackPercentage: holdbackPercentage,
      holdbackAmount: holdbackAmount,
      formattedHoldbackAmount: formatCurrency(holdbackAmount),
      type: invoice.invoice_type === 'AGAINST_PO' ? 'PO' : 'CO',
      type_label: invoice.invoice_type === 'AGAINST_PO' ? 'PO' : 'CO',
      type_color: invoice.invoice_type === 'AGAINST_PO' ? 'primary' : 'secondary',
      searchText: `${invoiceNumber} ${poCoNumber} ${invoice.uuid || ''}`.toLowerCase()
    }
  }).sort((a, b) => {
    // Sort by invoice number
    const aNum = a.invoiceNumber || ''
    const bNum = b.invoiceNumber || ''
    return aNum.localeCompare(bNum)
  })
})

// Filtered options based on search
const filteredOptions = computed(() => {
  if (!searchFilter.value.trim()) {
    return invoiceOptions.value
  }
  
  const searchTerm = searchFilter.value.toLowerCase().trim()
  return invoiceOptions.value.filter(option => {
    return option.searchText.includes(searchTerm) ||
           option.invoiceNumber.toLowerCase().includes(searchTerm) ||
           option.poCoNumber.toLowerCase().includes(searchTerm)
  })
})

// Table columns configuration
const tableColumns = computed<TableColumn<any>[]>(() => {
  return [
    {
      accessorKey: 'invoiceNumber',
      header: 'Invoice Number',
      enableSorting: false,
      cell: ({ row }: any) => {
        const option = row.original
        return h('div', { class: 'flex items-center gap-2 flex-wrap' }, [
          h('span', { class: 'font-medium text-sm' }, option.invoiceNumber),
          h(UBadge as any, {
            color: option.type_color,
            variant: 'soft',
            size: 'xs'
          }, () => option.type_label)
        ])
      }
    },
    {
      accessorKey: 'poCoNumber',
      header: 'PO/CO Number',
      enableSorting: false,
      cell: ({ row }: any) => h('div', { class: 'text-sm font-medium' }, row.original.poCoNumber)
    },
    {
      accessorKey: 'formattedDate',
      header: 'Invoice Date',
      enableSorting: false,
      cell: ({ row }: any) => h('div', { class: 'text-sm' }, row.original.formattedDate)
    },
    {
      accessorKey: 'formattedInvoiceAmount',
      header: 'Invoice Amount',
      enableSorting: false,
      cell: ({ row }: any) => h('div', { class: 'text-sm font-semibold text-primary-600 dark:text-primary-400' }, row.original.formattedInvoiceAmount)
    },
    {
      accessorKey: 'holdbackPercentage',
      header: '% Holdback',
      enableSorting: false,
      cell: ({ row }: any) => h('div', { class: 'text-sm font-medium' }, `${row.original.holdbackPercentage || 0}%`)
    },
    {
      accessorKey: 'formattedHoldbackAmount',
      header: 'Holdback Amount',
      enableSorting: false,
      cell: ({ row }: any) => h('div', { class: 'text-sm font-semibold text-primary-600 dark:text-primary-400' }, row.original.formattedHoldbackAmount)
    },
    {
      accessorKey: 'action',
      header: 'Action',
      enableSorting: false,
      cell: ({ row }: any) => {
        const option = row.original
        return h('div', { class: 'flex justify-center' }, [
          h(UButton as any, {
            color: 'primary',
            size: 'sm',
            onClick: () => selectHoldbackInvoice(option)
          }, () => 'Create Holdback Invoice')
        ])
      }
    }
  ]
})

// Methods
const selectHoldbackInvoice = (option: any) => {
  emit('select', option.invoice)
  showModal.value = false
}

// Watch for modal opening to fetch vendor invoices
watch(showModal, async (isOpen) => {
  if (isOpen && props.projectUuid && props.corporationUuid && props.vendorUuid) {
    searchFilter.value = ''
    
    // Fetch vendor invoices directly from API for the form's corporation
    if (props.corporationUuid) {
      await fetchVendorInvoices(props.corporationUuid)
    }
  }
})

// Watch for corporation changes and fetch data
watch(() => props.corporationUuid, async (newCorpUuid, oldCorpUuid) => {
  // Only fetch if corporation changed and we have a valid UUID
  if (newCorpUuid && newCorpUuid !== oldCorpUuid) {
    await fetchVendorInvoices(newCorpUuid)
  } else if (!newCorpUuid) {
    // Clear invoices if corporation is cleared
    vendorInvoices.value = []
  }
}, { immediate: false })
</script>

