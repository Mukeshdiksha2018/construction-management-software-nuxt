<template>
  <div>
    <div class="flex justify-end items-center mb-4">
      <div class="mr-1">
        <UInput
          v-model="globalFilter"
          placeholder="Search freight..."
          icon="i-heroicons-magnifying-glass"
          variant="subtle"
          size="xs"
        />
      </div>
      <UButton
        icon="material-symbols:add-rounded"
        size="xs"
        color="primary"
        variant="solid"
        @click="openModal"
      >
        Add Freight
      </UButton>
    </div>

    <div v-if="store.loading">
      <div class="relative overflow-auto rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div class="bg-gray-50 dark:bg-gray-700">
          <div class="grid grid-cols-4 gap-4 px-2 py-2 text-sm font-bold text-gray-800 dark:text-gray-200 tracking-wider border-b border-gray-200 dark:border-gray-600">
            <div class="flex items-center gap-2"><USkeleton class="h-4 w-4 rounded" /><USkeleton class="h-4 w-24" /></div>
            <div class="col-span-2 flex items-center gap-2"><USkeleton class="h-4 w-4 rounded" /><USkeleton class="h-4 w-16" /></div>
            <div class="flex items-center justify-center"><USkeleton class="h-4 w-16" /></div>
          </div>
        </div>
        <div class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <div v-for="i in 5" :key="i" class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
            <div class="grid grid-cols-4 gap-4 px-2 py-1 text-xs text-gray-900 dark:text-gray-100 border-gray-100 dark:border-gray-700">
              <div class="flex items-center"><USkeleton class="h-4 w-32" /></div>
              <div class="col-span-2 flex items-center"><USkeleton class="h-4 w-48" /></div>
              <div class="flex items-center justify-end gap-1"><USkeleton class="h-6 w-6 rounded" /><USkeleton class="h-6 w-6 rounded" /></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="store.error">
      <p class="text-red-500">Error: {{ store.error }}</p>
    </div>

    <div v-else-if="filteredFreight.length">
      <UTable 
        ref="table"
        sticky
        v-model:pagination="pagination"
        v-model:column-pinning="columnPinning"
        :pagination-options="paginationOptions"
        :data="filteredFreight" 
        :columns="columns"
        v-model:global-filter="globalFilter"
        class="max-h-[70vh] overflow-auto"
      />
      <div v-if="shouldShowPagination" class="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600">Show:</span>
          <USelect
            v-model="pagination.pageSize"
            :items="[
              { label: '10 per page', value: 10 },
              { label: '25 per page', value: 25 },
              { label: '50 per page', value: 50 },
              { label: '100 per page', value: 100 }
            ]"
            icon="i-heroicons-list-bullet"
            size="sm"
            variant="outline"
            class="w-32"
            @change="updatePageSize"
          />
        </div>
        <UPagination 
          :default-page="(table?.tableApi?.getState().pagination.pageIndex || 0) + 1"
          :items-per-page="table?.tableApi?.getState().pagination.pageSize"
          :total="table?.tableApi?.getFilteredRowModel().rows.length"
          @update:page="(p: number) => table?.tableApi?.setPageIndex(p - 1)"
        />
        <div class="text-sm text-gray-600">
          Showing {{ (table?.tableApi?.getState().pagination.pageIndex || 0) * (table?.tableApi?.getState().pagination.pageSize || 10) + 1 }} to {{ Math.min(((table?.tableApi?.getState().pagination.pageIndex || 0) + 1) * (table?.tableApi?.getState().pagination.pageSize || 10), table?.tableApi?.getFilteredRowModel().rows.length || 0) }} of {{ table?.tableApi?.getFilteredRowModel().rows.length || 0 }} freight services
        </div>
      </div>
    </div>

    <p v-else class="text-gray-500 text-center py-12">No freight services found.</p>

    <UModal 
      v-model:open="showModal" 
      :title="editing ? 'Edit Freight' : 'Add New Freight'"
      description="Configure freight service details."
      :ui="{ content: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-1rem)] max-w-2xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] rounded-lg shadow-lg ring ring-default overflow-hidden', body: 'p-4 sm:p-6 max-h-[calc(100dvh-12rem)] overflow-y-auto' }"
      @update:open="closeModal"
    >
      <template #body>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ship Via <span class="text-red-500">*</span></label>
            <UInput v-model="form.ship_via" variant="subtle" placeholder="Enter ship via method (e.g., FedEx, UPS, DHL)" size="md" class="w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
            <UTextarea v-model="form.description" variant="subtle" placeholder="Enter description" size="md" :rows="4" class="w-full" />
          </div>
          <div>
            <label class="flex items-center gap-2 cursor-pointer">
              <UToggle v-model="form.active" color="primary" />
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
            </label>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Toggle to enable or disable this freight service</p>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="outline" @click="closeModal">Cancel</UButton>
          <UButton color="primary" @click="save" :loading="saving" :disabled="!isFormValid">{{ editing ? 'Update' : 'Save' }} Freight</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, h, resolveComponent, onMounted, useTemplateRef } from 'vue'
import { getPaginationRowModel } from '@tanstack/vue-table'
import { useFreightStore } from '@/stores/freightGlobal'
import type { TableColumn } from '@nuxt/ui'

const UButton = resolveComponent('UButton')
const UTable = resolveComponent('UTable')
const UPagination = resolveComponent('UPagination')
const UBadge = resolveComponent('UBadge')
const UTooltip = resolveComponent('UTooltip')
const UToggle = resolveComponent('UToggle')

const store = useFreightStore()
const toast = useToast()

const showModal = ref(false)
const editing = ref<any>(null)
const saving = ref(false)
const globalFilter = ref('')

const form = ref({ ship_via: '', description: '', active: true })

const pagination = ref({ pageIndex: 0, pageSize: 10 })
const columnPinning = ref({ left: [], right: ['actions'] })
const paginationOptions = ref({ getPaginationRowModel: getPaginationRowModel() })
const table = useTemplateRef<any>('table')

const filteredFreight = computed(() => {
  const list = store.getAllFreight
  if (!globalFilter.value.trim()) return list
  const search = globalFilter.value.toLowerCase().trim()
  return list.filter(item => [item.ship_via || '', item.description || '', item.active ? 'active' : 'inactive']
    .some(f => f.toLowerCase().includes(search)))
})

const shouldShowPagination = computed(() => filteredFreight.value.length > 10)
const isFormValid = computed(() => form.value.ship_via.trim() !== '')

const columns: TableColumn<any>[] = [
  { accessorKey: 'ship_via', header: 'Ship Via', enableSorting: false, meta: { style: { th: 'width: 25%; min-width: 200px;', td: 'width: 25%; min-width: 200px;' } }, cell: ({ row }: any) => h('div', { class: 'font-medium text-default' }, row.original.ship_via) },
  { accessorKey: 'description', header: 'Description', enableSorting: false, meta: { style: { th: 'width: 45%; max-width: 400px;', td: 'width: 45%; max-width: 400px;' } }, cell: ({ row }: any) => { const d = row.original.description || ''; return h('div', { class: 'text-default text-sm truncate', style: 'max-width: 380px;' }, d || '-') } },
  { accessorKey: 'active', header: 'Active', enableSorting: false, meta: { style: { th: 'width: 15%;', td: 'width: 15%;' } }, cell: ({ row }: any) => { const a = row.original.active; return h(UBadge, { color: a ? 'success' : 'neutral', variant: 'soft', size: 'sm' }, () => a ? 'Active' : 'Inactive') } },
  { accessorKey: 'actions', header: 'Actions', enableSorting: false, enableHiding: false, meta: { style: { th: 'width: 15%; min-width: 120px;', td: 'width: 15%; min-width: 120px;' } }, cell: ({ row }: any) => { const btns = [] as any[]; btns.push(h(UTooltip, { text: 'Edit Freight' }, () => [h(UButton, { icon: 'tdesign:edit-filled', size: 'xs', color: 'secondary', variant: 'soft', onClick: () => edit(row.original) })])); btns.push(h(UTooltip, { text: 'Delete Freight' }, () => [h(UButton, { icon: 'mingcute:delete-fill', size: 'xs', color: 'error', variant: 'soft', onClick: () => remove(row.original) })])); return h('div', { class: 'flex justify-end gap-1' }, btns) } },
]

const openModal = () => { editing.value = null; resetForm(); showModal.value = true }
const closeModal = () => { showModal.value = false; editing.value = null; resetForm() }
const resetForm = () => { form.value = { ship_via: '', description: '', active: true } }
const edit = (item: any) => { editing.value = item; form.value = { ship_via: item.ship_via, description: item.description || '', active: item.active }; showModal.value = true }

const save = async () => {
  if (!isFormValid.value) { toast.add({ title: 'Validation Error', description: 'Please fill in all required fields', color: 'error' }); return }
  saving.value = true
  try {
    if (editing.value) {
      await store.updateFreight(editing.value.uuid, { ship_via: form.value.ship_via, description: form.value.description || null, active: form.value.active })
      toast.add({ title: 'Success', description: 'Freight updated successfully', color: 'success' })
    } else {
      await store.createFreight({ ship_via: form.value.ship_via, description: form.value.description || null, active: form.value.active })
      toast.add({ title: 'Success', description: 'Freight added successfully', color: 'success' })
    }
    closeModal()
  } catch (e: any) {
    toast.add({ title: 'Error', description: e.message || 'Failed to save freight', color: 'error' })
  } finally {
    saving.value = false
  }
}

const remove = (item: any) => {
  // No hard constraints here (global); delete directly
  store.deleteFreight(item.uuid).then(() => {
    toast.add({ title: 'Success', description: 'Freight deleted successfully', color: 'success' })
  }).catch((e: any) => {
    toast.add({ title: 'Error', description: e.message || 'Failed to delete freight', color: 'error' })
  })
}

const updatePageSize = (newSize: any) => { if (table.value?.tableApi) table.value.tableApi.setPageSize(newSize.value || newSize) }

watch(() => store.freight, () => {}, { deep: true })

onMounted(() => { store.fetchFreight() })
</script>
