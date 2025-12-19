<template>
  <div class="space-y-2">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <UButton
          color="neutral"
          variant="solid"
          icon="i-heroicons-arrow-left"
          @click="goBack"
        >
          Back
        </UButton>
        
        <h1 class="text-xl font-bold text-gray-900 dark:text-white">
          {{ editingEstimate ? 'Edit Estimate' : 'Create New Estimate' }}
        </h1>
      </div>
      
      <!-- Project Summary Stats (centered) -->
      <div v-if="!loading && selectedProject" class="flex-1 flex justify-center">
        <UCard variant="soft" class="w-auto min-w-[400px]" :ui="{ body: 'px-1 sm:py-1 py-1' }">
          <div class="flex items-center gap-3 px-1">
            <!-- Number of Rooms -->
            <div class="flex items-center gap-1">
              <span class="text-[10px] font-medium text-muted">Rooms:</span>
              <span class="text-xs font-bold text-brand-600 dark:text-brand-400">
                {{ selectedProject.no_of_rooms || 'N/A' }}
              </span>
            </div>
            
            <!-- Total Estimate Amount -->
            <div class="flex items-center gap-1 border-x border-default/30 px-2">
              <span class="text-[10px] font-medium text-muted">Total:</span>
              <span class="text-xs font-bold text-primary-600 dark:text-primary-400">
                {{ formatCurrencyInline(form.total_amount) }}
              </span>
            </div>
            
            <!-- Per Room Estimate -->
            <div class="flex items-center gap-1">
              <span class="text-[10px] font-medium text-muted">Per Room:</span>
              <span class="text-xs font-bold text-success-600 dark:text-success-400">
                {{ formatCurrencyInline(perRoomEstimate) }}
              </span>
            </div>
          </div>
        </UCard>
      </div>
      
      <div class="flex items-center gap-3">
        <UButton
          v-if="editingEstimate && form.uuid && hasPermission('project_estimates_view')"
          icon="i-heroicons-shield-check-solid"
          color="info"
          variant="outline"
          size="sm"
          @click="showAuditLogModal = true"
        >
          View Audit Log
        </UButton>
        
        <UButton
          v-if="editingEstimate && hasPermission('project_estimates_view')"
          color="neutral"
          variant="outline"
          icon="i-heroicons-printer"
          @click="handlePrintEstimate"
        >
          Print
        </UButton>

        <template v-if="showApprovalButtons">
          <UButton
            data-testid="btn-reject-draft"
            color="error"
            variant="soft"
            icon="i-heroicons-arrow-uturn-left"
            :disabled="saving"
            :loading="saving"
            @click="handleRejectToDraft"
          >
            Reject
          </UButton>
          <UButton
            data-testid="btn-approve"
            color="primary"
            variant="solid"
            icon="i-heroicons-check"
            :disabled="saving"
            :loading="saving"
            @click="handleApprove"
          >
            Approve
          </UButton>
        </template>

        <template v-else-if="showAnySaveButtons">
          <UTooltip
            v-if="editingEstimate && form.status === 'Approved' && hasApprovedPurchaseOrders"
            text="This estimate cannot be unapproved because there are approved purchase orders for this project."
          >
            <UButton
              v-if="showSaveDraftButton"
              data-testid="btn-save-draft"
              :color="saveDraftButtonColor"
              :variant="saveDraftButtonVariant"
              :icon="saveDraftButtonIcon"
              :disabled="isSaveDraftButtonDisabled"
              :loading="saving"
              @click="handleSaveAsDraft"
            >
              {{ saveDraftButtonLabel }}
            </UButton>
          </UTooltip>
          <UButton
            v-else-if="showSaveDraftButton"
            data-testid="btn-save-draft"
            :color="saveDraftButtonColor"
            :variant="saveDraftButtonVariant"
            :icon="saveDraftButtonIcon"
            :disabled="isSaveDraftButtonDisabled"
            :loading="saving"
            @click="handleSaveAsDraft"
          >
            {{ saveDraftButtonLabel }}
          </UButton>
          <UButton
            v-if="showMarkReadyButton"
            data-testid="btn-ready"
            color="primary"
            variant="solid"
            icon="i-heroicons-paper-airplane"
            :disabled="!isFormValid || saving"
            :loading="saving"
            @click="handleMarkReady"
          >
            Send for Approval
          </UButton>
        </template>
      </div>
    </div>

    <!-- Form Content -->
    <div v-if="error" class="text-center py-12">
      <UAlert
        icon="i-heroicons-exclamation-triangle"
        color="error"
        variant="soft"
        :title="error"
        :description="'Please try refreshing the page or contact support if the issue persists.'"
      />
    </div>

    <EstimateForm
      v-else
      :form="form"
      :editing-estimate="editingEstimate"
      :loading="loading"
      @update:form="updateForm"
      @validation-change="onValidationChange"
    />

    <!-- Audit Log Modal -->
    <UModal 
      v-model:open="showAuditLogModal" 
      title="Estimate Audit Log"
      :description="`View the complete audit trail for ${form.estimate_number || 'this estimate'}`"
      size="2xl"
      :ui="{ body: 'p-6' }"
    >
      <template #body>
        <div class="space-y-4">
          <!-- Estimate Info Header -->
          <div v-if="form.estimate_number" class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  Estimate #{{ form.estimate_number }}
                </h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  Project: {{ form.project?.project_name || form.project_uuid || 'N/A' }}
                </p>
              </div>
              <UBadge 
                :color="getStatusBadgeColor(form.status)" 
                variant="soft"
                size="lg"
              >
                {{ form.status || 'Draft' }}
              </UBadge>
            </div>
          </div>

          <!-- Audit Timeline -->
          <EstimateAuditTimeline 
            :audit-log="form.audit_log || []"
            :estimate-uuid="form.uuid || ''"
            @logs-loaded="onAuditLogsLoaded"
            @error="onAuditLogError"
          />
        </div>
      </template>

      <template #footer>
        <div class="flex justify-between items-center">
          <div class="text-sm text-gray-500">
            <span v-if="auditLogsCount > 0">{{ auditLogsCount }} audit entries</span>
            <span v-else>No audit entries</span>
          </div>
          <div class="flex gap-2">
            <UButton 
              color="neutral" 
              variant="solid" 
              @click="showAuditLogModal = false"
            >
              Close
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useCorporationStore } from '@/stores/corporations'
import { useEstimatesStore } from '@/stores/estimates'
import { useEstimateCreationStore } from '@/stores/estimateCreation'
import { dbHelpers } from '@/utils/indexedDb'
import { useProjectsStore } from '@/stores/projects'
import { usePurchaseOrdersStore } from '@/stores/purchaseOrders'
import { usePermissions } from '@/composables/usePermissions'
import EstimateForm from '@/components/Projects/EstimateForm.vue'
import { useUTCDateFormat } from '@/composables/useUTCDateFormat'
import { useEstimatePrint } from '@/composables/useEstimatePrint'
import { useAuthStore } from '@/stores/auth'
import EstimateAuditTimeline from '@/components/Projects/EstimateAuditTimeline.vue'
import { useCurrencyFormat } from '@/composables/useCurrencyFormat'

definePageMeta({
  layout: "main-layout",
  middleware: "auth",
});

// Router and route
const router = useRouter()
const route = useRoute()

// Stores
const corporationStore = useCorporationStore()
const estimatesStore = useEstimatesStore()
const projectsStore = useProjectsStore()
const purchaseOrdersStore = usePurchaseOrdersStore()

// Permissions
const { hasPermission, isReady } = usePermissions()
const { toUTCString, fromUTCString, getCurrentLocal } = useUTCDateFormat()
const { openEstimatePrint } = useEstimatePrint()
const { formatCurrency } = useCurrencyFormat()

function formatCurrencyInline(value: any) {
  const num = parseFloat(value)
  const safe = Number.isFinite(num) ? num : 0
  return formatCurrency(safe)
}

// Stores
const authStore = useAuthStore()
const estimateCreationStore = useEstimateCreationStore()

// State
const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
const isFormValid = ref(false)
const showAuditLogModal = ref(false)
const auditLogsCount = ref(0)

// Form data
// Generate next estimate number with pattern ES-<n>, starting at 1
const generateEstimateNumber = () => {
  // Do not override if already set (e.g., editing)
  if (form.value.estimate_number && String(form.value.estimate_number).trim() !== '') {
    return form.value.estimate_number;
  }
  
  // Get corporation UUID - prioritize estimateCreationStore for new estimates
  const corporationId = estimateCreationStore.selectedCorporationUuid || 
                        corporationStore.selectedCorporation?.uuid || 
                        corporationStore.selectedCorporationId ||
                        form.value.corporation_uuid;
  
  if (!corporationId) {
    // If no corporation selected yet, generate a temporary number
    // It will be regenerated when corporation is selected
    return `ES-1`;
  }

  // Ensure estimates are available in store
  const existing = (estimatesStore.estimates || []).filter(
    (est: any) => est.corporation_uuid === corporationId
  );
  
  let maxNum = 0;
  for (const est of existing) {
    const num = parseInt(String(est.estimate_number || '').replace(/^ES-/i, ''), 10);
    if (!isNaN(num)) maxNum = Math.max(maxNum, num);
  }
  const next = maxNum + 1;
  return `ES-${next}`;
}

const form = ref<any>({
  estimate_number: '', // Will be generated when corporation is available
  project_uuid: '',
  corporation_uuid: '',
  estimate_date: '',
  valid_until: '',
  status: 'Draft',
  total_amount: 0,
  tax_amount: 0,
  discount_amount: 0,
  final_amount: 0,
  notes: '',
  line_items: [],
  attachments: [],
  removed_cost_code_uuids: []
})

// Computed
const estimateId = computed(() => route.params.id as string)
const editingEstimate = computed(() => estimateId.value !== 'new')
const fromProjectId = computed(() => {
  const value = route.query?.fromProjectId
  return typeof value === 'string' && value.length > 0 ? value : undefined
})
const projectUuidFromQuery = computed(() => {
  const value = route.query?.projectUuid
  return typeof value === 'string' && value.length > 0 ? value : undefined
})

const canCreate = computed(() => hasPermission('project_estimates_create'))
const canEdit = computed(() => hasPermission('project_estimates_edit'))
const canApprove = computed(() => hasPermission('project_estimates_approve'))

const canSave = computed(() => editingEstimate.value ? canEdit.value : canCreate.value)
const showApprovalButtons = computed(() => editingEstimate.value && form.value.status === 'Ready' && canApprove.value)

// Get selected project details
const selectedProject = computed(() => {
  if (!form.value.project_uuid) return null;
  
  // First try to get from currentProject if it matches (has full data including no_of_rooms)
  if (projectsStore.currentProject?.uuid === form.value.project_uuid) {
    return projectsStore.currentProject;
  }
  
  // Otherwise find from projects list (metadata might not have no_of_rooms)
  const project = projectsStore.projects.find((p: any) => p.uuid === form.value.project_uuid);
  return project || null;
});

// Calculate per room estimate
const perRoomEstimate = computed(() => {
  const total = parseFloat(form.value.total_amount) || 0;
  const rooms = selectedProject.value?.no_of_rooms;
  
  if (!rooms || rooms === 0) return 0;
  return total / rooms;
});

// Check if there are approved purchase orders for this project
const hasApprovedPurchaseOrders = computed(() => {
  if (!form.value.project_uuid) return false
  const corporationUuid = corporationStore.selectedCorporation?.uuid || form.value.corporation_uuid
  if (!corporationUuid) return false
  
  const approvedPOs = purchaseOrdersStore.purchaseOrders.filter(
    (po) => po.project_uuid === form.value.project_uuid && po.status === 'Approved' && po.is_active !== false
  )
  return approvedPOs.length > 0
})

const showSaveDraftButton = computed(() => {
  if (!canSave.value) {
    return false
  }
  if (editingEstimate.value && form.value.status === 'Approved') {
    return canApprove.value
  }
  return true
})
const showMarkReadyButton = computed(() => {
  if (!canSave.value) {
    return false
  }
  if (editingEstimate.value && form.value.status === 'Approved') {
    return false
  }
  return form.value.status !== 'Ready'
})
const showAnySaveButtons = computed(() => !showApprovalButtons.value && (showSaveDraftButton.value || showMarkReadyButton.value))
const saveDraftButtonLabel = computed(() => {
  if (editingEstimate.value && form.value.status === 'Approved') {
    // If there are approved purchase orders, show "Locked"
    if (hasApprovedPurchaseOrders.value) {
      return 'Locked'
    }
    // If no approved purchase orders, show "Reject"
    return 'Reject'
  }
  return 'Save'
})
const saveDraftButtonIcon = computed(() => {
  if (editingEstimate.value && form.value.status === 'Approved') {
    // If there are approved purchase orders, show lock icon
    if (hasApprovedPurchaseOrders.value) {
      return 'i-heroicons-lock-closed'
    }
    // If no approved purchase orders, show reject icon
    return 'i-heroicons-arrow-uturn-left'
  }
  return 'i-heroicons-document'
})
const saveDraftButtonColor = computed(() => {
  if (editingEstimate.value && form.value.status === 'Approved') {
    // If there are approved purchase orders, show warning color for locked state
    if (hasApprovedPurchaseOrders.value) {
      return 'warning'
    }
    // If no approved purchase orders, show error color for reject action
    return 'error'
  }
  return 'warning'
})
const saveDraftButtonVariant = computed((): 'solid' => {
  return 'solid'
})
const isSaveDraftButtonDisabled = computed(() => {
  // Always disabled if form is invalid or saving
  if (!isFormValid.value || saving.value) return true
  // If estimate is approved and there are approved purchase orders, disable the button
  if (editingEstimate.value && form.value.status === 'Approved' && hasApprovedPurchaseOrders.value) {
    return true
  }
  return false
})

const submitWithStatus = async (status: 'Draft' | 'Ready' | 'Approved') => {
  if (saving.value) return
  form.value.status = status
  await saveEstimate()
}

const handleSaveAsDraft = async () => {
  // Check if trying to unapprove an approved estimate
  if (editingEstimate.value && form.value.status === 'Approved') {
    // Ensure purchase orders are loaded before checking
    const projectUuid = form.value.project_uuid
    const corporationUuid = corporationStore.selectedCorporation?.uuid || form.value.corporation_uuid
    
    if (projectUuid && corporationUuid) {
      // Ensure purchase orders are loaded
      await purchaseOrdersStore.fetchPurchaseOrders(corporationUuid)
      
      // Check for approved purchase orders for this project
      const approvedPOs = purchaseOrdersStore.purchaseOrders.filter(
        (po) => po.project_uuid === projectUuid && po.status === 'Approved' && po.is_active !== false
      )
      
      // This should not happen if button is properly disabled, but add safety check
      if (approvedPOs.length > 0) {
        const toast = useToast()
        toast.add({
          title: 'Cannot Unapprove Estimate',
          description: 'An approved purchase order exists for this project. The estimate cannot be unapproved.',
          color: 'error',
          icon: 'i-heroicons-x-circle'
        })
        return
      }
    }
  }
  
  await submitWithStatus('Draft')
}
const handleMarkReady = () => submitWithStatus('Ready')
const handleApprove = async () => {
  await submitWithStatus('Approved')
  await updateProjectEstimatedAmount()
}
const handleRejectToDraft = () => submitWithStatus('Draft')

// Methods
const updateForm = (updatedForm: any) => {
  form.value = { ...updatedForm }
}

const onValidationChange = (isValid: boolean) => {
  isFormValid.value = isValid
}

const goBack = () => {
  if (fromProjectId.value) {
    router.push(`/projects/form/${fromProjectId.value}`)
    return
  }
  router.push('/projects?tab=estimates')
}

const loadEstimate = async () => {
  if (!editingEstimate.value) {
    // For new estimates, use estimateCreationStore.selectedCorporationUuid if available
    // (set when user selects corporation in EstimateForm), otherwise fallback to TopBar's selection
    form.value.corporation_uuid = estimateCreationStore.selectedCorporationUuid || corporationStore.selectedCorporation?.uuid || ''
    
    // Generate estimate number after corporation is set
    // This ensures we can filter existing estimates by corporation
    if (!form.value.estimate_number) {
      form.value.estimate_number = generateEstimateNumber()
    }
    
    // Use local YYYY-MM-DD for UI; convert to UTC on save
    form.value.estimate_date = getCurrentLocal()

    if (projectUuidFromQuery.value) {
      form.value.project_uuid = projectUuidFromQuery.value
      // Use the same corporation logic for loading project
      const corpUuid = estimateCreationStore.selectedCorporationUuid || corporationStore.selectedCorporation?.uuid
      if (corpUuid) {
        projectsStore.loadCurrentProject(projectUuidFromQuery.value, corpUuid).catch(() => {})
      }
    }
    return
  }

  loading.value = true
  error.value = null

  try {
    // Prefer IndexedDB for full estimate details
    const corpId = corporationStore.selectedCorporation?.uuid || form.value.corporation_uuid
    let estimate: any = null
    if (corpId) {
      estimate = await dbHelpers.getEstimateByUuid(corpId, estimateId.value)
    }
    // Fallback to store (in case of direct navigation without prior sync)
    if (!estimate) {
      estimate = estimatesStore.getEstimateByUuid(estimateId.value)
    }

    // If we still don't have line items (or estimate missing), fetch detail from API once
    if (!estimate || !Array.isArray(estimate.line_items) || estimate.line_items.length === 0) {
      try {
        const response: any = await $fetch(`/api/estimates/${estimateId.value}`, { method: 'GET' })
        if (response?.data) {
          estimate = response.data
          // Update IndexedDB with the detailed record
          const resolvedCorpId = estimate.corporation_uuid || corpId || corporationStore.selectedCorporation?.uuid
          if (resolvedCorpId) {
            await dbHelpers.updateEstimate(resolvedCorpId, estimate)
          }
        }
      } catch (e) {
        // ignore; we'll use whatever we have
      }
    }

    if (estimate) {
      form.value = {
        uuid: estimate.uuid || '',
        estimate_number: estimate.estimate_number || '',
        project_uuid: estimate.project_uuid || '',
        corporation_uuid: estimate.corporation_uuid || corpId || '',
        // Convert UTC ISO -> local YYYY-MM-DD for form fields
        estimate_date: fromUTCString(estimate.estimate_date || ''),
        valid_until: fromUTCString(estimate.valid_until || ''),
        status: estimate.status || 'Draft',
        total_amount: estimate.total_amount || 0,
        tax_amount: estimate.tax_amount || 0,
        discount_amount: estimate.discount_amount || 0,
        final_amount: estimate.final_amount || 0,
        notes: estimate.notes || '',
        line_items: Array.isArray(estimate.line_items) ? estimate.line_items : [],
        attachments: Array.isArray(estimate.attachments) ? estimate.attachments : [],
        removed_cost_code_uuids: Array.isArray(estimate.removed_cost_code_uuids) ? estimate.removed_cost_code_uuids : [],
        audit_log: Array.isArray(estimate.audit_log) ? estimate.audit_log : [],
        project: estimate.project || null
      }
    } else {
      throw new Error('Estimate not found')
    }
  } catch (err: any) {
    console.error('Error loading estimate:', err)
    error.value = err.message || 'Failed to load estimate'
  } finally {
    loading.value = false
  }
}

const saveEstimate = async () => {
  if (!isFormValid.value) {
    const toast = useToast()
    toast.add({
      title: 'Validation Error',
      description: 'Please fill in all required fields',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    })
    return
  }

  saving.value = true

      try {
    // Determine the correct corporation_uuid to use
    // For new estimates: use estimateCreationStore.selectedCorporationUuid (from form selector)
    // For editing: use form.value.corporation_uuid (from loaded estimate)
    // Fallback to TopBar's selected corporation only if neither is available
    let corporationUuid: string | undefined
    if (editingEstimate.value) {
      // When editing, use the estimate's corporation_uuid
      corporationUuid = form.value.corporation_uuid || corporationStore.selectedCorporation?.uuid
    } else {
      // When creating new, prioritize estimateCreationStore (form's corporation selector)
      corporationUuid = estimateCreationStore.selectedCorporationUuid || form.value.corporation_uuid || corporationStore.selectedCorporation?.uuid
    }

    if (!corporationUuid) {
      throw new Error('Corporation is required to save estimate')
    }

    const payload = {
      ...form.value,
      corporation_uuid: corporationUuid,
      // Convert local form dates to UTC ISO before save
      estimate_date: toUTCString(form.value.estimate_date) as any,
      status: form.value.status as 'Draft' | 'Ready' | 'Approved'
    }

    let success = false

    if (editingEstimate.value) {
      success = await estimatesStore.updateEstimate({
        uuid: estimateId.value,
        ...payload
      })
    } else {
      success = await estimatesStore.createEstimate(payload)
    }

    if (success) {
      const toast = useToast()
      toast.add({
        title: 'Success',
        description: editingEstimate.value ? 'Estimate updated successfully' : 'Estimate created successfully',
        color: 'success',
        icon: 'i-heroicons-check-circle'
      })

      // Refresh estimates for the corporation that the estimate was saved to
      // This ensures the estimate appears in the list even if a different corporation is selected in TopBar
      await estimatesStore.refreshEstimatesFromAPI(corporationUuid)

      // If the saved estimate's corporation matches the currently selected corporation in TopBar,
      // also refresh the local store to show it immediately
      if (corporationStore.selectedCorporationId === corporationUuid) {
        await estimatesStore.fetchEstimates(corporationUuid)
      }

      // Clear estimate creation store after successful save
      if (!editingEstimate.value) {
        estimateCreationStore.clearStore()
      }

      // Navigate back to the estimates list after successful save/update
      router.push('/projects?tab=estimates')
    } else {
      throw new Error('Failed to save estimate')
    }
  } catch (err: any) {
    console.error('Error saving estimate:', err)
    const toast = useToast()
    toast.add({
      title: 'Error',
      description: err.message || 'Failed to save estimate',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    })
  } finally {
    saving.value = false
  }
}

const updateProjectEstimatedAmount = async () => {
  const projectUuid = form.value.project_uuid
  if (!projectUuid) return

  const estimatedAmount = Number(form.value.final_amount) || 0

  try {
    const updated = await projectsStore.updateProject({
      uuid: projectUuid,
      estimated_amount: estimatedAmount
    })

    if (!updated) {
      const toast = useToast()
      toast.add({
        title: 'Warning',
        description: 'Project total could not be updated.',
        color: 'warning',
        icon: 'i-heroicons-exclamation-triangle'
      })
    }
  } catch (err: any) {
    console.error('Error updating project estimated amount:', err)
    const toast = useToast()
    toast.add({
      title: 'Error',
      description: err?.message || 'Failed to update project total.',
      color: 'error',
      icon: 'i-heroicons-x-circle'
    })
  }
}

// Print handler
const handlePrintEstimate = () => {
  if (!editingEstimate.value) return
  if (!hasPermission('project_estimates_view')) {
    const toast = useToast()
    toast.add({
      title: 'Access Denied',
      description: "You don't have permission to view estimates.",
      color: 'error',
      icon: 'i-heroicons-x-circle'
    })
    return
  }
  openEstimatePrint(estimateId.value)
}

// Audit log handlers
const onAuditLogsLoaded = (logs: any[]) => {
  auditLogsCount.value = logs.length
}

const onAuditLogError = (error: string) => {
  console.error('Audit log error:', error)
  const toast = useToast()
  toast.add({
    title: 'Error',
    description: error || 'Failed to load audit log',
    color: 'error',
    icon: 'i-heroicons-x-circle'
  })
}

const getStatusBadgeColor = (status: string): 'neutral' | 'warning' | 'info' | 'success' | 'error' => {
  const statusColors: Record<string, 'neutral' | 'warning' | 'info' | 'success' | 'error'> = {
    Draft: 'neutral',
    Pending: 'warning',
    Ready: 'info',
    Approved: 'success',
    Rejected: 'error',
    Expired: 'neutral'
  }
  const color = statusColors[status]
  return color || 'neutral'
}

// Watch for corporation changes
// Only update form's corporation_uuid if estimateCreationStore doesn't have a value
// This allows the form's corporation selector to take precedence
watch(() => corporationStore.selectedCorporationId, (newCorpId) => {
  if (newCorpId && !editingEstimate.value) {
    // Only set if estimateCreationStore doesn't have a corporation selected
    // This allows the form's corporation selector to take precedence
    if (!estimateCreationStore.selectedCorporationUuid) {
      form.value.corporation_uuid = newCorpId
      // Regenerate estimate number when corporation changes
      if (!form.value.estimate_number || form.value.estimate_number === 'ES-1') {
        form.value.estimate_number = generateEstimateNumber()
      }
    }
  }
}, { immediate: true })

// Watch for corporation changes in estimateCreationStore (form's corporation selector)
watch(() => estimateCreationStore.selectedCorporationUuid, (newCorpUuid) => {
  if (newCorpUuid && !editingEstimate.value) {
    form.value.corporation_uuid = newCorpUuid
    // Regenerate estimate number when corporation changes in the form
    if (!form.value.estimate_number || form.value.estimate_number === 'ES-1') {
      form.value.estimate_number = generateEstimateNumber()
    }
  }
}, { immediate: true })

// Watch for project changes to fetch purchase orders and load full project data
watch(() => form.value.project_uuid, async (projectUuid) => {
  if (projectUuid) {
    // Determine the correct corporation UUID to use
    // For new estimates: prioritize estimateCreationStore (form's corporation selector)
    // For editing: use form's corporation_uuid or TopBar's selection
    const corporationUuid = editingEstimate.value
      ? (corporationStore.selectedCorporation?.uuid || form.value.corporation_uuid)
      : (estimateCreationStore.selectedCorporationUuid || form.value.corporation_uuid || corporationStore.selectedCorporation?.uuid)
    
    if (corporationUuid) {
      // Load full project data for stats (includes no_of_rooms)
      if (projectsStore.currentProject?.uuid !== projectUuid) {
        await projectsStore.loadCurrentProject(projectUuid, corporationUuid)
      }
      
      // Fetch purchase orders to check for approved ones
      if (editingEstimate.value && form.value.status === 'Approved') {
        await purchaseOrdersStore.fetchPurchaseOrders(corporationUuid)
      }
    }
  }
}, { immediate: true })

// Load data on mount
onMounted(async () => {
  // Wait for permissions to be ready
  await nextTick()
  
  if (isReady.value) {
    // Check permissions
    if (editingEstimate.value && !hasPermission('project_estimates_edit')) {
      const toast = useToast()
      toast.add({
        title: 'Access Denied',
        description: 'You don\'t have permission to edit estimates',
        color: 'error',
        icon: 'i-heroicons-x-circle'
      })
      router.push('/projects?tab=estimates')
      return
    }
    
    if (!editingEstimate.value && !hasPermission('project_estimates_create')) {
      const toast = useToast()
      toast.add({
        title: 'Access Denied',
        description: 'You don\'t have permission to create estimates',
        color: 'error',
        icon: 'i-heroicons-x-circle'
      })
      router.push('/projects?tab=estimates')
      return
    }
    
    await loadEstimate()
  }
})
</script>
