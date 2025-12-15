<template>
  <div class="h-[88vh] flex flex-col">
    <!-- Header with Back Button and Title -->
    <div class="flex items-center justify-between w-full mb-2 px-4 py-2 bg-default border-b border-default">
      <div class="flex items-center gap-3">
        <UButton 
          color="neutral" 
          variant="solid" 
          icon="i-heroicons-arrow-left-solid" 
          @click="goBack"
        >
          Back
        </UButton>
        <div>
          <h1 class="text-xl font-semibold text-default">
            {{ isEditMode ? 'Edit Project' : 'Add New Project' }}
          </h1>
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <UButton
          v-if="isEditMode && hasPermission('project_estimates_view') && hasProjectEstimates"
          color="neutral"
          variant="solid"
          icon="tdesign:edit-filled"
          @click="goToViewEstimate"
        >
          Edit Estimate
        </UButton>
        <UButton
          v-else-if="isEditMode && form.id && hasPermission('project_estimates_create')"
          color="secondary"
          variant="solid"
          icon="i-heroicons-calculator"
          @click="goToCreateEstimate"
        >
          Create Estimate
        </UButton>
        <UButton 
          v-if="isEditMode ? hasPermission('project_edit') : hasPermission('project_create')"
          color="primary" 
          @click="submitProject"
          :loading="isSubmitting"
        >
          {{ isEditMode ? "Update" : "Create" }} Project
        </UButton>
      </div>
    </div>

    <!-- Form Content -->
    <div class="flex-1 overflow-hidden">
      <ProjectDetailsForm
        :key="form.id || 'new'"
        v-model:form="form"
        :editing-project="isEditMode"
        :file-upload-error="fileUploadError"
        :latest-estimate="latestEstimate"
        :loading="loading"
        :has-project-estimates="hasProjectEstimates"
        @update:form="handleFormUpdate"
        @save-temp-addresses="handleSaveTempAddresses"
      />
    </div>

    <!-- Estimate Preview Modal -->
    <UModal 
      v-model:open="showEstimatePreviewModal"
      title="Project Estimate"
      description="Preview of the latest estimate for this project"
      fullscreen
      :ui="{ 
        body: 'p-4 sm:p-6'
      }"
    >
      <template #body>
        <EstimatePreview v-if="previewEstimate" :estimate="previewEstimate" />
        <div v-else class="text-sm text-muted">No estimate to preview.</div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="outline" @click="showEstimatePreviewModal = false">Close</UButton>
          <UButton v-if="previewEstimate && hasPermission('project_estimates_edit')" color="primary" icon="tdesign:edit-filled" @click="goToEditEstimate">Edit Estimate</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRoute, useRouter } from 'vue-router';
import { useCorporationStore } from '@/stores/corporations'
import { useProjectsStore } from '@/stores/projects'
import { useProjectAddressesStore } from '@/stores/projectAddresses'
import { useProjectTypesStore } from '@/stores/projectTypes'
import { useServiceTypesStore } from '@/stores/serviceTypes'
import { usePermissions } from '@/composables/usePermissions'
import { useEstimatesStore } from '@/stores/estimates'
import { useDateFormat } from '@/composables/useDateFormat'
import { useCurrencyFormat } from '@/composables/useCurrencyFormat'
import EstimatePreview from '@/components/Projects/EstimatePreview.vue'
import ProjectDetailsForm from '@/components/Projects/ProjectDetailsForm.vue'

definePageMeta({
  layout: "main-layout",
  middleware: "auth",
});

// Route and router
const route = useRoute()
const router = useRouter()

// Stores
const corporationStore = useCorporationStore()
const projectsStore = useProjectsStore()
const projectAddressesStore = useProjectAddressesStore()
const projectTypesStore = useProjectTypesStore()
const serviceTypesStore = useServiceTypesStore()

// Permissions
const { hasPermission } = usePermissions()
const estimatesStore = useEstimatesStore()
const { formatDate } = useDateFormat()
const { formatCurrency } = useCurrencyFormat()

// State
const isSubmitting = ref(false)
const fileUploadError = ref<string | null>(null)
const loading = ref(false)

// Computed properties
const isEditMode = computed(() => route.params.id !== 'new')
const projectEstimates = computed(() => {
  if (!form.value.id) return [] as any[]
  return estimatesStore.getEstimatesByProject(form.value.id) || []
})

const hasProjectEstimates = computed(() => (projectEstimates.value?.length || 0) > 0)

const latestEstimate = computed(() => {
  const list = [...projectEstimates.value]
  list.sort((a: any, b: any) => new Date(b.estimate_date).getTime() - new Date(a.estimate_date).getTime())
  return list[0]
})

const showEstimatePreviewModal = ref(false)
const previewEstimate = ref<any>(null)

const openEstimatePreview = () => {
  if (!hasProjectEstimates.value) return
  previewEstimate.value = latestEstimate.value
  showEstimatePreviewModal.value = true
}

const goToViewEstimate = () => {
  if (!hasProjectEstimates.value || !latestEstimate.value?.uuid) return
  const query: Record<string, string> = {}
  if (form.value.id) {
    query.fromProjectId = form.value.id
  }
  router.push({ path: `/estimates/form/${latestEstimate.value.uuid}`, query })
}

const goToEditEstimate = () => {
  if (previewEstimate.value?.uuid) {
    showEstimatePreviewModal.value = false
    const query: Record<string, string> = {}
    if (form.value.id) {
      query.fromProjectId = form.value.id
    }
    router.push({ path: `/estimates/form/${previewEstimate.value.uuid}`, query })
  }
}

const goToCreateEstimate = () => {
  if (!form.value.id) {
    const toast = useToast()
    toast.add({
      title: "Project not saved",
      description: "Save the project before creating an estimate.",
      color: "warning",
      icon: "i-heroicons-exclamation-triangle"
    })
    return
  }

  if (!hasPermission('project_estimates_create')) {
    const toast = useToast()
    toast.add({
      title: "Access Denied",
      description: "You don't have permission to create estimates.",
      color: "error",
      icon: "i-heroicons-x-circle"
    })
    return
  }

  router.push({
    path: '/estimates/form/new',
    query: {
      projectUuid: form.value.id,
      fromProjectId: form.value.id
    }
  })
}
const projectId = computed(() => route.params.id as string)
const selectedCorporationId = computed(() => corporationStore.selectedCorporationId)

// Note: Project ID generation is now handled by ProjectDetailsForm component
// It automatically generates PRO-<n> based on existing projects for the corporation

// Form state - shared with the store
const form = ref({
  id: "" as string | undefined,
  corporation_uuid: selectedCorporationId.value || "",
  project_name: "",
  project_id: "",
  project_type_uuid: "",
  service_type_uuid: "",
  estimated_amount: "",
  project_description: "",
  area_sq_ft: "",
  no_of_rooms: "",
  contingency_percentage: "",
  project_status: "Pending",
  project_start_date: "",
  project_estimated_completion_date: "",
  only_total: false,
  enable_labor: false,
  enable_material: false,
  attachments: [] as any[],
  tempAddresses: [] as any[],
  // Address fields
  address_type: "",
  contact_person: "",
  email: "",
  phone: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  state: "",
  zip_code: "",
  country: ""
})

// Methods
const goBack = () => {
  projectsStore.clearCurrentProject() // Clear memory before navigating away
  router.push('/projects')
}

const resetForm = () => {
  form.value = {
    id: undefined,
    corporation_uuid: selectedCorporationId.value || "",
    project_name: "",
    project_id: "",
    project_type_uuid: "",
    service_type_uuid: "",
    estimated_amount: "",
    project_description: "",
    area_sq_ft: "",
    no_of_rooms: "",
    contingency_percentage: "",
    project_status: "Pending",
    project_start_date: "",
    project_estimated_completion_date: "",
    only_total: false,
    enable_labor: false,
    enable_material: false,
    attachments: [],
    tempAddresses: [],
    // Address fields
    address_type: "",
    contact_person: "",
    email: "",
    phone: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    zip_code: "",
    country: ""
  }
  fileUploadError.value = null
}

const loadProjectData = async () => {
  if (!isEditMode.value || !projectId.value) {
    resetForm()
    projectsStore.clearCurrentProject()
    loading.value = false
    return
  }

  loading.value = true
  try {
    // HYBRID APPROACH: Load full project from IndexedDB into currentProject
    const loaded = await projectsStore.loadCurrentProject(
      projectId.value,
      selectedCorporationId.value || ""
    )
    
    if (!loaded || !projectsStore.currentProject) {
      throw new Error('Project not found')
    }

    const projectToEdit = projectsStore.currentProject

    // Fetch existing project documents
    let existingAttachments: any[] = []
    try {
      const response = await $fetch('/api/projects/documents', {
        method: 'GET',
        params: {
          project_uuid: projectToEdit.uuid
        }
      })

      if (response && 'data' in response && Array.isArray(response.data) && response.data.length > 0) {
        existingAttachments = response.data.map((doc: any) => ({
          uuid: doc.uuid,
          name: doc.document_name,
          type: doc.mime_type,
          size: doc.file_size,
          url: doc.file_url,
          file_url: doc.file_url,
          isUploaded: true,
          documentType: doc.document_type,
          description: doc.description,
          tags: doc.tags || [],
          is_primary: doc.is_primary || false
        }))
      }
    } catch (error) {
      console.error('Error loading existing project documents:', error)
    }

    // Fetch existing project addresses
    try {
      await projectAddressesStore.fetchAddresses(projectToEdit.uuid)
    } catch (error) {
      console.error('Error loading existing project addresses:', error)
    }

    // Load estimates for this project so latestEstimate computed property works correctly
    // Use fetchEstimates to be consistent with ProjectDetails.vue and avoid store conflicts
    if (selectedCorporationId.value) {
      try {
        await estimatesStore.fetchEstimates(selectedCorporationId.value)
      } catch (error) {
        console.error('Error loading estimates:', error)
        // Don't fail the whole load if estimates fail
      }
    }

    // Populate form with project data
    form.value = {
      id: projectToEdit.uuid,
      corporation_uuid: projectToEdit.corporation_uuid || selectedCorporationId.value || "",
      project_name: projectToEdit.project_name || "",
      project_id: projectToEdit.project_id || "",
      project_type_uuid: projectToEdit.project_type_uuid || "",
      service_type_uuid: projectToEdit.service_type_uuid || "",
      estimated_amount: String(projectToEdit.estimated_amount || ""),
      project_description: projectToEdit.project_description || "",
      area_sq_ft: String(projectToEdit.area_sq_ft || ""),
      no_of_rooms: String(projectToEdit.no_of_rooms || ""),
      contingency_percentage: String(projectToEdit.contingency_percentage || ""),
      project_status: projectToEdit.project_status || "Pending",
      project_start_date: projectToEdit.project_start_date || "",
      project_estimated_completion_date: projectToEdit.project_estimated_completion_date || "",
      only_total: projectToEdit.only_total || false,
      enable_labor: projectToEdit.enable_labor || false,
      enable_material: projectToEdit.enable_material || false,
      attachments: existingAttachments,
      tempAddresses: [],
      // Address fields (not used in edit mode, but required for form type)
      address_type: "",
      contact_person: "",
      email: "",
      phone: "",
      address_line_1: "",
      address_line_2: "",
      city: "",
      state: "",
      zip_code: "",
      country: ""
    }

    fileUploadError.value = null
  } catch (error) {
    console.error('Error loading project data:', error)
    const toast = useToast()
    toast.add({
      title: "Error",
      description: "Failed to load project data",
      color: "error",
      icon: "i-heroicons-x-circle",
    })
    goBack()
  } finally {
    loading.value = false
  }
}

const handleFormUpdate = (value: any) => {
  console.log('[Parent handleFormUpdate] Received form update:', {
    project_type_uuid: value?.project_type_uuid,
    service_type_uuid: value?.service_type_uuid,
    fullValue: value
  });
  form.value = value;
  console.log('[Parent handleFormUpdate] After update, form.value.project_type_uuid:', form.value.project_type_uuid);
}

const handleSaveTempAddresses = async (projectUuid: string, tempAddresses: any[]) => {
  console.log('Saving temporary addresses for project:', projectUuid, tempAddresses)
}

const uploadProjectDocuments = async (projectUuid: string) => {
  if (!form.value.attachments || form.value.attachments.length === 0) {
    return
  }

  const filesToUpload = form.value.attachments
    .filter((attachment: any) => !attachment.isUploaded && attachment.fileData)
    .map((attachment: any) => ({
      name: attachment.name,
      type: attachment.type,
      size: attachment.size,
      fileData: attachment.fileData,
      description: attachment.description || null,
      tags: attachment.tags || [],
      is_primary: attachment.is_primary || false
    }))

  if (filesToUpload.length === 0) {
    return
  }

  try {
    const response = await $fetch('/api/projects/upload-files', {
      method: 'POST',
      body: {
        projectUuid: projectUuid,
        files: filesToUpload
      }
    })

    if ('success' in response && response.success && 'uploadedFiles' in response) {
      console.log('Documents uploaded successfully:', response.uploadedFiles)
      
      const updatedAttachments = form.value.attachments.map((attachment: any) => {
        if (!attachment.isUploaded && attachment.fileData) {
          const uploadedDoc = response.uploadedFiles.find((doc: any) => 
            doc.document_name === attachment.name
          )
          if (uploadedDoc) {
            return {
              ...attachment,
              isUploaded: true,
              uuid: uploadedDoc.uuid,
              file_url: uploadedDoc.file_url
            }
          }
        }
        return attachment
      })
      
      form.value.attachments = updatedAttachments
    }

    if ('errors' in response && response.errors && response.errors.length > 0) {
      console.warn('Some files failed to upload:', response.errors)
    }
  } catch (error) {
    console.error('Error uploading documents:', error)
    throw error
  }
}

const submitProject = async () => {
  if (isSubmitting.value) return
  
  console.log('[submitProject] Starting submission, current form values:', {
    project_type_uuid: form.value.project_type_uuid,
    service_type_uuid: form.value.service_type_uuid,
    project_name: form.value.project_name,
    project_id: form.value.project_id
  });
  
  isSubmitting.value = true
  
  try {
    // corporation_uuid is now managed directly in the form via CorporationSelect
    // No need to set it from selectedCorporationId anymore
    
    console.log('[submitProject] Form values:', {
      project_type_uuid: form.value.project_type_uuid,
      service_type_uuid: form.value.service_type_uuid
    });
    
    // Validation: required fields
    console.log('[Validation] Checking required fields:', {
      corporation_uuid: form.value.corporation_uuid,
      project_name: form.value.project_name,
      project_id: form.value.project_id,
      project_type_uuid: form.value.project_type_uuid,
      project_type_uuid_type: typeof form.value.project_type_uuid,
      project_type_uuid_truthy: !!form.value.project_type_uuid,
      service_type_uuid: form.value.service_type_uuid,
      service_type_uuid_type: typeof form.value.service_type_uuid,
      service_type_uuid_truthy: !!form.value.service_type_uuid
    });
    
    const requiredErrors: string[] = []
    if (!form.value.corporation_uuid) requiredErrors.push('Corporation is required')
    if (!form.value.project_name?.trim()) requiredErrors.push('Project Name is required')
    if (!form.value.project_id?.trim()) requiredErrors.push('Project ID is required')
    // Check project_type_uuid - handle empty string, null, undefined
    const projectTypeUuid = form.value.project_type_uuid
    const hasProjectType = projectTypeUuid && typeof projectTypeUuid === 'string' && projectTypeUuid.trim().length > 0
    
    if (!hasProjectType) {
      console.log('[Validation] Project Type is required - FAILED:', {
        value: projectTypeUuid,
        type: typeof projectTypeUuid,
        isFalsy: !projectTypeUuid,
        length: projectTypeUuid?.length,
        trimmedLength: typeof projectTypeUuid === 'string' ? projectTypeUuid.trim().length : 0
      });
      requiredErrors.push('Project Type is required')
    } else {
      console.log('[Validation] Project Type validation PASSED:', {
        value: projectTypeUuid,
        type: typeof projectTypeUuid,
        length: projectTypeUuid?.length,
        trimmedLength: projectTypeUuid.trim().length
      });
    }
    // Check service_type_uuid - handle empty string, null, undefined
    const serviceTypeUuid = form.value.service_type_uuid
    const hasServiceType = serviceTypeUuid && typeof serviceTypeUuid === 'string' && serviceTypeUuid.trim().length > 0
    
    if (!hasServiceType) {
      console.log('[Validation] Service Type is required - FAILED:', {
        value: serviceTypeUuid,
        type: typeof serviceTypeUuid,
        isFalsy: !serviceTypeUuid,
        length: serviceTypeUuid?.length,
        trimmedLength: typeof serviceTypeUuid === 'string' ? serviceTypeUuid.trim().length : 0
      });
      requiredErrors.push('Service Type is required')
    } else {
      console.log('[Validation] Service Type validation PASSED:', {
        value: serviceTypeUuid,
        type: typeof serviceTypeUuid,
        length: serviceTypeUuid?.length,
        trimmedLength: serviceTypeUuid.trim().length
      });
    }
    
    console.log('[Validation] Required errors:', requiredErrors);
    
    // Either Area or Number of Rooms must be provided (> 0)
    const hasArea = !!form.value.area_sq_ft && Number(form.value.area_sq_ft) > 0
    const hasRooms = !!form.value.no_of_rooms && Number(form.value.no_of_rooms) > 0
    if (!hasArea && !hasRooms) requiredErrors.push('Provide Area (sq ft) or Number of Rooms')
    
    if (requiredErrors.length > 0) {
      const toast = useToast()
      toast.add({
        title: 'Missing required information',
        description: requiredErrors[0],
        color: 'error',
        icon: 'i-heroicons-x-circle'
      })
      return
    }
    
    // Validation: require at least one address and one primary selected
    if (isEditMode.value) {
      try {
        await projectAddressesStore.fetchAddresses(projectId.value)
      } catch (e) {
        // ignore fetch error; we'll validate with what we have
      }
      const savedAddresses: any[] = projectAddressesStore.getAddresses(projectId.value) || []
      const hasAny = savedAddresses.length > 0
      const hasPrimary = savedAddresses.some((a: any) => !!a.is_primary)
      if (!hasAny || !hasPrimary) {
        const toast = useToast()
        toast.add({
          title: 'Addresses required',
          description: !hasAny ? 'Add at least one address to the project.' : 'Select a Primary address before saving.',
          color: 'error',
          icon: 'i-heroicons-x-circle'
        })
        return
      }
    } else {
      const tempAddresses: any[] = form.value.tempAddresses || []
      const hasAny = tempAddresses.length > 0
      const hasPrimary = tempAddresses.some((a: any) => !!a.is_primary)
      if (!hasAny || !hasPrimary) {
        const toast = useToast()
        toast.add({
          title: 'Addresses required',
          description: !hasAny ? 'Add at least one address to the project.' : 'Select a Primary address before saving.',
          color: 'error',
          icon: 'i-heroicons-x-circle'
        })
        return
      }
    }
    
    // Prepare project data
    const projectData = {
      ...form.value,
      project_start_date: form.value.project_start_date || new Date().toISOString().split('T')[0],
      attachments: [] // Will be populated after document upload
    } as any
    
    delete projectData.attachments
    
    let response
    if (isEditMode.value) {
      response = await projectsStore.updateProject({
        uuid: projectId.value,
        ...projectData
      })
    } else {
      response = await projectsStore.createProject(projectData)
    }
    
    if (response) {
      const createdUuid = response.uuid || projectId.value

      // If creating a new project and there are temp addresses, save them now
      if (!isEditMode.value && createdUuid && Array.isArray(form.value.tempAddresses) && form.value.tempAddresses.length > 0) {
        try {
          for (const tempAddress of form.value.tempAddresses) {
            await projectAddressesStore.createAddress({
              project_uuid: createdUuid,
              address_type: tempAddress.address_type,
              contact_person: tempAddress.contact_person,
              email: tempAddress.email,
              phone: tempAddress.phone,
              address_line_1: tempAddress.address_line_1,
              address_line_2: tempAddress.address_line_2,
              city: tempAddress.city,
              state: tempAddress.state,
              zip_code: tempAddress.zip_code,
              country: tempAddress.country,
              is_primary: !!tempAddress.is_primary
            })
          }
          await projectAddressesStore.fetchAddresses(createdUuid)
          form.value.tempAddresses = []
        } catch (addrErr) {
          console.error('Error saving addresses for new project:', addrErr)
          const toast = useToast()
          toast.add({
            title: 'Warning',
            description: 'Project created but failed to save some addresses',
            color: 'warning',
            icon: 'i-heroicons-exclamation-triangle'
          })
        }
      }

      // Handle file uploads if there are any attachments
      if (form.value.attachments && form.value.attachments.length > 0) {
        try {
          await uploadProjectDocuments(response.uuid || projectId.value)
        } catch (uploadError) {
          console.error('Error uploading documents:', uploadError)
          const toast = useToast()
          toast.add({
            title: "Warning",
            description: "Project saved but some files failed to upload",
            color: "warning",
            icon: "i-heroicons-exclamation-triangle",
          })
        }
      }
      
      const toast = useToast()
      toast.add({
        title: "Success",
        description: isEditMode.value ? "Project updated successfully" : "Project created successfully",
        color: "success",
        icon: "i-heroicons-check-circle",
      })
      
      // Clear currentProject and navigate back to projects list
      projectsStore.clearCurrentProject()
      router.push('/projects')
    }
  } catch (error) {
    console.error('Error submitting project:', error)
    const toast = useToast()
    toast.add({
      title: "Error",
      description: "Failed to save project",
      color: "error",
      icon: "i-heroicons-x-circle",
    })
  } finally {
    isSubmitting.value = false
  }
}

// Fetch required data on mount
const fetchRequiredData = async () => {
  try {
    // Fetch corporation-scoped lists only when a corporation is selected
    if (selectedCorporationId.value) {
      await Promise.all([
        projectsStore.fetchProjectsMetadata(selectedCorporationId.value), // Use metadata-only fetch
        projectTypesStore.fetchProjectTypes(),
        serviceTypesStore.fetchServiceTypes()
      ])
    }

    // Always attempt to load the project data for the current route
    // loadProjectData manages its own loading state and loads estimates when in edit mode
    await loadProjectData()
    // For new projects, ensure estimates are loaded so View Estimate button works
    // For edit mode, estimates are already loaded in loadProjectData()
    if (selectedCorporationId.value && !isEditMode.value) {
      try {
        await estimatesStore.fetchEstimates(selectedCorporationId.value)
      } catch (error) {
        console.error('Error loading estimates:', error)
        // Don't fail if estimates fail
      }
    }
  } catch (err) {
    console.error('Error fetching required data:', err)
    loading.value = false
  }
}

// Watch for corporation changes
watch(selectedCorporationId, () => {
  // Re-fetch lists and project data when the corporation changes
  fetchRequiredData()
}, { immediate: true })

// Watch for route changes
watch(() => route.params.id, () => {
  loadProjectData()
})

onMounted(() => {
  fetchRequiredData()
})

// Clear currentProject when leaving the page to free up memory
onUnmounted(() => {
  projectsStore.clearCurrentProject()
})
</script>
