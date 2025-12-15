<template>
  <UModal 
    v-model:open="isOpen" 
    :title="modalTitle"
    :description="modalDescription"
    size="2xl"
    :ui="{ body: 'p-6' }"
  >
    <template #body>
      <div class="space-y-4">
        <!-- Bill Info Header -->
        <div v-if="billInfo" class="bg-gray-50 rounded-lg p-4 mb-6">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-gray-900">{{ billInfo.title }}</h3>
              <p class="text-sm text-gray-600">{{ billInfo.subtitle }}</p>
            </div>
            <UBadge 
              :color="billInfo.statusColor" 
              variant="soft"
              size="lg"
            >
              {{ billInfo.status }}
            </UBadge>
          </div>
        </div>

        <!-- Audit Timeline -->
        <AuditLogTimeline 
          :entity-id="entityId"
          :entity-type="entityType"
          :corporation-uuid="corporationUuid"
          :auto-refresh="autoRefresh"
          :refresh-interval="refreshInterval"
          :timeline-color="timelineColor"
          :timeline-size="timelineSize"
          @logs-loaded="onLogsLoaded"
          @error="onError"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-between items-center">
        <div class="text-sm text-gray-500">
          <span v-if="logsCount > 0">{{ logsCount }} audit entries</span>
          <span v-else>No audit entries</span>
        </div>
        <div class="flex gap-2">
          <UButton 
            color="neutral" 
            variant="solid" 
            @click="closeModal"
          >
            Close
          </UButton>
          <UButton 
            color="primary" 
            variant="soft" 
            icon="i-heroicons-arrow-down-tray"
            @click="exportLogs"
            :disabled="logsCount === 0"
          >
            Export
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import AuditLogTimeline from './AuditLogTimeline.vue'

interface Props {
  open: boolean
  entityId: string
  entityType?: string
  corporationUuid?: string
  billInfo?: {
    title: string
    subtitle: string
    status: string
    statusColor: string
  }
  autoRefresh?: boolean
  refreshInterval?: number
  timelineColor?: string
  timelineSize?: string
}

const props = withDefaults(defineProps<Props>(), {
  entityType: 'bill_entry',
  corporationUuid: '',
  autoRefresh: true,
  refreshInterval: 30000,
  timelineColor: 'primary',
  timelineSize: 'md'
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'logs-loaded': [logs: any[]]
  'error': [error: string]
  'export': [logs: any[]]
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const logsCount = ref(0)

// Computed properties
const modalTitle = computed(() => {
  if (props.billInfo) {
    return `Audit Log - ${props.billInfo.title}`
  }
  return 'Audit Log'
})

const modalDescription = computed(() => {
  if (props.billInfo) {
    return `View the complete audit trail for ${props.billInfo.subtitle}`
  }
  return 'View the complete audit trail for this item'
})

// Methods
const closeModal = () => {
  isOpen.value = false
}

const onLogsLoaded = (logs: any[]) => {
  logsCount.value = logs.length
  emit('logs-loaded', logs)
}

const onError = (error: string) => {
  emit('error', error)
}

const exportLogs = () => {
  // This would typically export the logs to a file
  // For now, we'll just emit an event
  emit('export', [])
  
  // You could implement actual export functionality here
}

// Watch for modal open/close
watch(() => props.open, (newValue) => {
  if (newValue) {
    logsCount.value = 0
  }
})
</script>
