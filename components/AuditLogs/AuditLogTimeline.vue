<template>
  <div class="audit-log-timeline">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-6">
      <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-gray-400" />
      <span class="ml-2 text-sm text-gray-500">Loading audit logs...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-6">
      <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6 text-red-500 mx-auto mb-2" />
      <p class="text-sm text-red-600">{{ error }}</p>
      <UButton 
        color="primary" 
        variant="soft" 
        size="sm" 
        @click="refreshLogs"
        class="mt-2"
      >
        Try Again
      </UButton>
    </div>

    <!-- Empty State -->
    <div v-else-if="timelineItems.length === 0" class="text-center py-6">
      <UIcon name="i-heroicons-clock" class="w-8 h-8 text-gray-300 mx-auto mb-3" />
      <p class="text-sm text-gray-500">No audit logs found</p>
      <p class="text-xs text-gray-400">Activity will appear here as changes are made</p>
    </div>

    <!-- NuxtUI Timeline with custom description slots -->
    <div v-else>
      <UTimeline 
        :items="timelineItems" 
        size="xs"
        color="neutral"
        class="w-full"
      >
        <template #description="{ item }">
          <!-- Changes Section -->
          <div v-if="item.descriptionData.hasChanges && item.descriptionData.changedFields.length > 0" class="inline-block">
            <!-- Changed Container Box -->
            <div class="inline-flex items-center gap-2 px-2 py-1 bg-gray-100 border border-gray-200 rounded-md">
              <!-- Changed Label -->
              <span class="text-xs font-medium text-gray-700">Changed:</span>
              
              <!-- Field Badges Container -->
              <div class="flex flex-wrap gap-1">
                <UBadge 
                  v-for="field in item.descriptionData.changedFields.slice(0, 5)" 
                  :key="field"
                  color="neutral" 
                  variant="outline" 
                  size="xs"
                >
                  {{ formatFieldName(field) }}
                </UBadge>
                <UBadge 
                  v-if="item.descriptionData.totalFields > 5"
                  color="neutral" 
                  variant="soft" 
                  size="xs"
                >
                  +{{ item.descriptionData.totalFields - 5 }} more
                </UBadge>
              </div>
            </div>
          </div>
        </template>
      </UTimeline>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useAuditLogsStore } from '@/stores/auditLogs'
import { useCurrencyFormat } from '@/composables/useCurrencyFormat'
import { useDateFormat } from '@/composables/useDateFormat'

interface Props {
  entityId: string
  entityType?: string
  corporationUuid?: string
  autoRefresh?: boolean
  refreshInterval?: number
  timelineColor?: string
  timelineSize?: string
  orientation?: 'vertical' | 'horizontal'
}

const props = withDefaults(defineProps<Props>(), {
  entityType: 'bill_entry',
  corporationUuid: '',
  autoRefresh: false,
  refreshInterval: 30000, // 30 seconds
  timelineColor: 'primary',
  timelineSize: 'md',
  orientation: 'vertical'
})

const emit = defineEmits<{
  'logs-loaded': [logs: any[]]
  'error': [error: string]
}>()

const auditLogsStore = useAuditLogsStore()
const { formatCurrency } = useCurrencyFormat()
const { formatDate } = useDateFormat()

const rawTimelineItems = ref<any[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const refreshTimer = ref<NodeJS.Timeout | null>(null)

// Transform audit logs to UTimeline format
const timelineItems = computed(() => {
  return rawTimelineItems.value.map(item => ({
    date: item.date,
    title: `${getActionTitle(item.action)} by ${item.userInfo?.name || 'Unknown User'}`,
    description: getDescriptionText(item),
    descriptionData: buildDescription(item), // Store the structured data separately
    icon: item.userInfo?.imageUrl ? undefined : getActionIcon(item.action),
    avatar: item.userInfo?.imageUrl ? {
      src: item.userInfo.imageUrl,
      alt: item.userInfo.name || 'User'
    } : undefined,
    color: getActionColor(item.action),
    userInfo: item.userInfo
  }))
})

// Computed properties
const auditLogs = computed(() => auditLogsStore.auditLogs)
const isLoading = computed(() => auditLogsStore.loading)
const hasError = computed(() => auditLogsStore.error)

// Methods
const loadAuditLogs = async () => {
  if (!props.entityId || !props.corporationUuid) return

  loading.value = true
  error.value = null

  try {
    let logs: any[] = []
    
    if (props.entityType === 'bill_entry') {
      logs = await auditLogsStore.getBillEntryAuditTimeline(props.entityId, props.corporationUuid)
    } else if (props.entityType === 'project') {
      // Debug: Check if method exists
      
      if (typeof auditLogsStore.getProjectAuditTimeline === 'function') {
        logs = await auditLogsStore.getProjectAuditTimeline(props.entityId, props.corporationUuid)
      } else {
        console.error('getProjectAuditTimeline method not found, falling back to fetchAuditLogs')
        logs = await auditLogsStore.fetchAuditLogs('project', props.entityId, props.corporationUuid)
      }
    } else {
      // Fallback to generic fetch for other entity types
      logs = await auditLogsStore.fetchAuditLogs(props.entityType, props.entityId, props.corporationUuid)
    }
    
    rawTimelineItems.value = logs
    emit('logs-loaded', logs)
  } catch (err: any) {
    const errorMessage = err.message || 'Failed to load audit logs'
    error.value = errorMessage
    emit('error', errorMessage)
  } finally {
    loading.value = false
  }
}

const refreshLogs = () => {
  loadAuditLogs()
}

const formatFieldName = (fieldName: string): string => {
  // Convert snake_case to Title Case
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const formatFieldValue = (fieldName: string, value: any): string => {
  if (value === null || value === undefined) return 'N/A'
  
  // Format specific field types
  if (fieldName === 'amount' || fieldName.includes('amount')) {
    return formatCurrency(parseFloat(value) || 0)
  }
  
  if (fieldName.includes('date')) {
    return formatDate(value)
  }
  
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  
  return String(value)
}

const getActionTitle = (action: string): string => {
  const actionTitles: Record<string, string> = {
    created: "Created",
    updated: "Updated",
    deleted: "Deleted",
    approved: "Approved",
    rejected: "Rejected",
    submitted: "Submitted",
    voided: "Voided",
    payment_processed: "Payment Processed",
    attachment_added: "Attachment Added",
    attachment_removed: "Attachment Removed",
  }
  return actionTitles[action] || "Action Performed"
}

const getActionIcon = (action: string): string => {
  const actionIcons: Record<string, string> = {
    created: "i-heroicons-plus-circle",
    updated: "i-heroicons-pencil-square",
    deleted: "i-heroicons-trash",
    approved: "i-heroicons-check-circle",
    rejected: "i-heroicons-x-circle",
    submitted: "i-heroicons-paper-airplane",
    voided: "i-heroicons-no-symbol",
    payment_processed: "i-heroicons-credit-card",
    attachment_added: "i-heroicons-paper-clip",
    attachment_removed: "i-heroicons-minus-circle",
  }
  return actionIcons[action] || "i-heroicons-information-circle"
}

const getActionDotClass = (action: string): string => {
  const actionClasses: Record<string, string> = {
    created: "bg-green-500 text-white",
    updated: "bg-blue-500 text-white",
    deleted: "bg-red-500 text-white",
    approved: "bg-green-500 text-white",
    rejected: "bg-red-500 text-white",
    submitted: "bg-blue-500 text-white",
    voided: "bg-yellow-500 text-white",
    payment_processed: "bg-green-500 text-white",
    attachment_added: "bg-blue-500 text-white",
    attachment_removed: "bg-yellow-500 text-white",
  }
  return actionClasses[action] || "bg-gray-500 text-white"
}

const getActionColor = (action: string): string => {
  const actionColors: Record<string, string> = {
    created: "green",
    updated: "blue",
    deleted: "red",
    approved: "green",
    rejected: "red",
    submitted: "blue",
    voided: "yellow",
    payment_processed: "green",
    attachment_added: "blue",
    attachment_removed: "yellow",
  }
  return actionColors[action] || "gray"
}

const buildDescription = (item: any): any => {
  // Return object with structured data for better rendering
  return {
    hasChanges: item.metadata?.changedFields?.length > 0,
    changedFields: item.metadata?.changedFields || [],
    totalFields: item.metadata?.changedFields?.length || 0
  }
}

// Helper function to get the description text for the timeline
const getDescriptionText = (item: any): string => {
  // Return empty string if no changes, otherwise return a placeholder
  if (!item.metadata?.changedFields?.length) {
    return ''
  }
  return 'Changes made' // This won't be displayed due to custom slot
}

// Remove problematic watchers that cause infinite loops
// The component will load data on mount and when explicitly refreshed

// Auto-refresh functionality
const startAutoRefresh = () => {
  if (props.autoRefresh && props.refreshInterval > 0) {
    refreshTimer.value = setInterval(() => {
      loadAuditLogs()
    }, props.refreshInterval)
  }
}

const stopAutoRefresh = () => {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value)
    refreshTimer.value = null
  }
}

// Lifecycle
onMounted(() => {
  if (props.entityId && props.corporationUuid) {
    loadAuditLogs()
  }
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})

// Expose methods for parent components
defineExpose({
  refreshLogs,
  loadAuditLogs
})
</script>

<style scoped>
.audit-log-timeline {
  width: 100%;
}
</style>
