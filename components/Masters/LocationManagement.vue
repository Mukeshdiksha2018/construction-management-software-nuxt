<template>
  <div>
    <div class="flex justify-end items-center mb-4">
      <div class="mr-1">
        <UInput v-model="globalFilter" placeholder="Search locations..." icon="i-heroicons-magnifying-glass" variant="subtle" size="xs" />
      </div>
      <UButton icon="material-symbols:add-rounded" size="xs" color="primary" variant="solid" @click="openModal">Add Location</UButton>
    </div>

    <div v-if="store.loading">
      <USkeleton class="h-10 w-full" />
    </div>
    <div v-else-if="store.error" class="text-red-500">{{ store.error }}</div>
    <div v-else-if="filtered.length">
      <UTable
        :data="filtered"
        :columns="columns"
        v-model:global-filter="globalFilter"
        class="max-h-[70vh] overflow-auto"
      />
    </div>
    <p v-else class="text-gray-500 text-center py-12">No location found.</p>

    <UModal v-model:open="showModal" :title="editing ? 'Edit Location' : 'Add New Location'" :ui="{ content: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-1rem)] max-w-3xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] rounded-lg shadow-lg ring ring-default overflow-hidden', body: 'p-4 sm:p-6 max-h-[calc(100dvh-12rem)] overflow-y-auto' }" @update:open="closeModal">
      <template #body>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1">Location Name <span class="text-red-500">*</span></label>
            <UInput v-model="form.location_name" variant="subtle" placeholder="e.g., Main Warehouse" size="md" class="w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Location Code</label>
            <UInput v-model="form.location_code" variant="subtle" placeholder="e.g., WH-01" size="md" class="w-full" />
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-medium mb-1">Description</label>
            <UTextarea v-model="form.description" variant="subtle" placeholder="Optional description" size="md" class="w-full" />
          </div>

          <!-- Address -->
          <div class="md:col-span-2">
            <label class="block text-sm font-medium mb-1">Street Address <span class="text-red-500">*</span></label>
            <UInput v-model="form.address_line1" variant="subtle" placeholder="Street Address" size="md" class="w-full" />
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-medium mb-1">Address Line 2</label>
            <UInput v-model="form.address_line2" variant="subtle" placeholder="Apt, suite, etc. (optional)" size="md" class="w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">City <span class="text-red-500">*</span></label>
            <UInput v-model="form.city" variant="subtle" placeholder="City" size="md" class="w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">State <span class="text-red-500">*</span></label>
            <UInput v-model="form.state" variant="subtle" placeholder="State" size="md" class="w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">ZIP <span class="text-red-500">*</span></label>
            <UInput v-model="form.zip" variant="subtle" placeholder="ZIP" size="md" class="w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Country <span class="text-red-500">*</span></label>
            <UInput v-model="form.country" variant="subtle" placeholder="Country" size="md" class="w-full" />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Phone</label>
            <UInput v-model="form.phone" variant="subtle" placeholder="Phone" size="md" class="w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Email</label>
            <UInput v-model="form.email" type="email" variant="subtle" placeholder="Email" size="md" class="w-full" />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1">Active</label>
            <UToggle v-model="form.active" />
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="outline" @click="closeModal">Cancel</UButton>
          <UButton color="primary" :loading="saving" :disabled="!isValid" @click="saveLocation">{{ editing ? 'Update' : 'Save' }} Location</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, resolveComponent, onMounted } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { useLocationsStore } from '@/stores/locations'

const UButton = resolveComponent('UButton')
const UTable = resolveComponent('UTable')
const UBadge = resolveComponent('UBadge')
const UTooltip = resolveComponent('UTooltip')

const store = useLocationsStore()
const toast = useToast()

const showModal = ref(false)
const editing = ref<any>(null)
const saving = ref(false)
const globalFilter = ref('')

const form = ref({
  location_name: '',
  location_code: '',
  description: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  zip: '',
  country: '',
  phone: '',
  email: '',
  active: true,
})

const isValid = computed(() => {
  return form.value.location_name.trim() && form.value.address_line1.trim() && form.value.city.trim() && form.value.state.trim() && form.value.zip.trim() && form.value.country.trim()
})

const filtered = computed(() => {
  const term = globalFilter.value.toLowerCase().trim()
  const data = store.getAll || []
  if (!term) return data
  return data.filter((r: any) => [
    r.location_name, r.location_code, r.city, r.state, r.country, r.zip
  ].some((f: string) => (f || '').toLowerCase().includes(term)))
})

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'location_name', header: 'Name', enableSorting: false,
    cell: ({ row }: any) => h('div', { class: 'font-medium text-default' }, row.original.location_name)
  },
  { accessorKey: 'location_code', header: 'Code', enableSorting: false },
  { accessorKey: 'city', header: 'City', enableSorting: false },
  { accessorKey: 'state', header: 'State', enableSorting: false },
  { accessorKey: 'country', header: 'Country', enableSorting: false },
  {
    accessorKey: 'active', header: 'Status', enableSorting: false,
    cell: ({ row }: any) => h(UBadge, { color: row.original.active ? 'success' : 'neutral', variant: 'soft', size: 'sm' }, () => row.original.active ? 'Active' : 'Inactive')
  },
  {
    accessorKey: 'actions', header: 'Actions', enableSorting: false, enableHiding: false,
    cell: ({ row }: any) => h('div', { class: 'flex justify-end gap-1' }, [
      h(UTooltip, { text: 'Edit' }, () => [
        h(UButton, { icon: 'tdesign:edit-filled', size: 'xs', color: 'secondary', variant: 'soft', onClick: () => edit(row.original) })
      ]),
      h(UTooltip, { text: 'Delete' }, () => [
        h(UButton, { icon: 'mingcute:delete-fill', size: 'xs', color: 'error', variant: 'soft', onClick: () => remove(row.original) })
      ])
    ])
  }
]

function resetForm() {
  form.value = { location_name: '', location_code: '', description: '', address_line1: '', address_line2: '', city: '', state: '', zip: '', country: '', phone: '', email: '', active: true }
}

function openModal() {
  editing.value = null
  resetForm()
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editing.value = null
  resetForm()
}

function edit(row: any) {
  editing.value = row
  form.value = { ...row }
  showModal.value = true
}

async function saveLocation() {
  if (!isValid.value) {
    toast.add({ title: 'Validation Error', description: 'Fill all required fields', color: 'error' })
    return
  }
  saving.value = true
  try {
    if (editing.value) {
      await store.updateLocation(editing.value.uuid, { ...form.value })
      toast.add({ title: 'Success', description: 'Location updated', color: 'success' })
    } else {
      await store.createLocation({ ...form.value })
      toast.add({ title: 'Success', description: 'Location added', color: 'success' })
    }
    closeModal()
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.message || 'Failed to save location', color: 'error' })
  } finally {
    saving.value = false
  }
}

async function remove(row: any) {
  try {
    await store.deleteLocation(row.uuid)
    toast.add({ title: 'Deleted', description: 'Location deleted', color: 'success' })
  } catch (e: any) {
    toast.add({ title: 'Error', description: e?.message || 'Failed to delete location', color: 'error' })
  }
}

onMounted(async () => {
  await store.fetchLocations(false)
})
</script>


