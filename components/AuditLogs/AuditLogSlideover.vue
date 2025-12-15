<template>
  <USlideover 
    v-model:open="isOpen"
    side="right"
    size="xl"
    :title="title"
    :description="description"
    :ui="{ body: 'p-0' }"
  >
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">{{ title }}</h3>
          <p class="text-sm text-gray-600">{{ description }}</p>
        </div>
        <div class="flex items-center gap-2">
          <UBadge v-if="logsCount > 0" color="neutral" variant="soft">
            {{ logsCount }} entries
          </UBadge>
          <UButton
            icon="i-heroicons-x-mark"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="close"
          />
        </div>
      </div>
    </template>

    <template #body>
      <div class="h-full">
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
  </USlideover>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AuditLogTimeline from './AuditLogTimeline.vue'

interface Props {
  open: boolean
  entityId: string
  entityType: 'bill_entry' | 'project' | 'estimate'
  corporationUuid: string
  title: string
  description?: string
  autoRefresh?: boolean
  refreshInterval?: number
  timelineColor?: string
  timelineSize?: string
}

const props = withDefaults(defineProps<Props>(), {
  description: '',
  autoRefresh: true,
  refreshInterval: 30000,
  timelineColor: 'primary',
  timelineSize: 'md'
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'logs-loaded': [logs: any[]]
  'error': [error: string]
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const logsCount = ref(0)

const close = () => {
  isOpen.value = false
  logsCount.value = 0
}

const onLogsLoaded = (logs: any[]) => {
  logsCount.value = logs.length
  emit('logs-loaded', logs)
}

const onError = (error: string) => {
  emit('error', error)
}
</script>
