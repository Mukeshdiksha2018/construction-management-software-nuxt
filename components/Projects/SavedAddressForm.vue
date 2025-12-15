<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <UFormGroup label="Corporation" name="corporation_uuid" class="w-full">
        <UInput :model-value="selectedCorporationName" disabled class="w-full" />
      </UFormGroup>

      <UFormGroup label="Project" name="project_uuid" help="Select a project to attach this address to" class="w-full">
        <USelect
          v-model="localForm.project_uuid"
          :items="projectOptions"
          option-attribute="label"
          value-attribute="value"
          placeholder="Select project"
          class="w-full"
        />
      </UFormGroup>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <UFormGroup label="Contact Person" name="contact_person" class="w-full">
        <UInput v-model="localForm.contact_person" placeholder="Full name" class="w-full" />
      </UFormGroup>

      <UFormGroup label="Email" name="email" class="w-full">
        <UInput v-model="localForm.email" type="email" placeholder="name@example.com" class="w-full" />
      </UFormGroup>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <UFormGroup label="Phone" name="phone" class="w-full">
        <UInput v-model="localForm.phone" placeholder="(xxx) xxx-xxxx" class="w-full" />
      </UFormGroup>

      <UFormGroup label="Address Type" name="address_type" class="w-full">
        <USelect
          v-model="localForm.address_type"
          :items="addressTypeOptions"
          placeholder="Select type"
          class="w-full"
        />
      </UFormGroup>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <UFormGroup label="Address Line 1" name="address_line_1" class="w-full">
        <UInput v-model="localForm.address_line_1" placeholder="Street address" class="w-full" />
      </UFormGroup>

      <UFormGroup label="Address Line 2" name="address_line_2" class="w-full">
        <UInput v-model="localForm.address_line_2" placeholder="Apartment, suite, etc." class="w-full" />
      </UFormGroup>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <UFormGroup label="City" name="city" class="w-full">
        <UInput v-model="localForm.city" class="w-full" />
      </UFormGroup>

      <UFormGroup label="State" name="state" class="w-full">
        <UInput v-model="localForm.state" class="w-full" />
      </UFormGroup>

      <UFormGroup label="ZIP Code" name="zip_code" class="w-full">
        <UInput v-model="localForm.zip_code" class="w-full" />
      </UFormGroup>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <UFormGroup label="Country" name="country" class="w-full">
        <UInput v-model="localForm.country" class="w-full" />
      </UFormGroup>
    </div>
  </div>
  
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useCorporationStore } from '@/stores/corporations'
import { useProjectsStore } from '@/stores/projects'

interface AddressForm {
  id?: string
  corporation_uuid: string
  project_uuid: string
  address_type: string
  contact_person: string
  email: string
  phone: string
  address_line_1: string
  address_line_2: string
  city: string
  state: string
  zip_code: string
  country: string
}

const props = defineProps<{
  form: AddressForm
}>()

const emit = defineEmits<{
  (e: 'update:form', value: AddressForm): void
}>()

const corporationStore = useCorporationStore()
const projectsStore = useProjectsStore()

const localForm = ref<AddressForm>({
  id: props.form.id,
  corporation_uuid: props.form.corporation_uuid || '',
  project_uuid: props.form.project_uuid || '',
  address_type: props.form.address_type || '',
  contact_person: props.form.contact_person || '',
  email: props.form.email || '',
  phone: props.form.phone || '',
  address_line_1: props.form.address_line_1 || '',
  address_line_2: props.form.address_line_2 || '',
  city: props.form.city || '',
  state: props.form.state || '',
  zip_code: props.form.zip_code || '',
  country: props.form.country || ''
})

watch(localForm, (val) => emit('update:form', val), { deep: true })

const selectedCorporationName = computed(() => {
  const id = corporationStore.selectedCorporationId
  const all = corporationStore.corporations
  const corp = all.find((c: any) => c.id === id || c.uuid === id)
  return corp?.name || corp?.corporation_name || '—'
})

const projectOptions = computed(() => {
  return (projectsStore.projects || []).map((p: any) => ({
    label: p.project_name || p.project_id || 'Unnamed Project',
    value: p.uuid
  }))
})

const addressTypeOptions = [
  { label: 'Site', value: 'site' },
  { label: 'Billing', value: 'billing' },
  { label: 'Shipping', value: 'shipping' }
]

onMounted(async () => {
  if (!projectsStore.projects?.length && corporationStore.selectedCorporationId) {
    await projectsStore.fetchProjects(corporationStore.selectedCorporationId)
  }
  // ensure corporation is set in form
  if (corporationStore.selectedCorporationId && !localForm.value.corporation_uuid) {
    localForm.value.corporation_uuid = corporationStore.selectedCorporationId
  }
})
</script>


