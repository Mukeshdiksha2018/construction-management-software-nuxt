<template>
  <div class="change-order-audit-timeline">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-6">
      <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-gray-400" />
      <span class="ml-2 text-sm text-gray-500">Loading audit timeline...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-6">
      <UIcon name="i-heroicons-exclamation-triangle" class="w-6 h-6 text-red-500 mx-auto mb-2" />
      <p class="text-sm text-red-600">{{ error }}</p>
      <UButton 
        color="primary" 
        variant="soft" 
        size="sm" 
        @click="loadTimeline"
        class="mt-2"
      >
        Try Again
      </UButton>
    </div>

    <!-- Empty State -->
    <div v-else-if="timelineItems.length === 0" class="text-center py-6">
      <UIcon name="i-heroicons-clock" class="w-8 h-8 text-gray-300 mx-auto mb-3" />
      <p class="text-sm text-gray-500">No audit history found</p>
      <p class="text-xs text-gray-400">Activity will appear here as changes are made</p>
    </div>

    <!-- Timeline -->
    <div v-else>
      <UTimeline 
        color="neutral"
        :items="timelineItems" 
        class="w-full"
      >
        <template #title="{ item }">
          <div class="flex flex-col gap-1">
            <span class="text-primary font-medium text-sm">{{ item.userName }}</span>
            <span class="font-medium text-sm">{{ item.title }}</span>
          </div>
        </template>
      </UTimeline>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useUserProfilesStore } from '@/stores/userProfiles'

interface Props {
  auditLog?: any[]
  changeOrderUuid?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

const props = withDefaults(defineProps<Props>(), {
  auditLog: () => [],
  changeOrderUuid: '',
  autoRefresh: false,
  refreshInterval: 30000, // 30 seconds
})

const emit = defineEmits<{
  'logs-loaded': [logs: any[]]
  'error': [error: string]
}>()

const loading = ref(false)
const error = ref<string | null>(null)
const rawTimelineItems = ref<any[]>([])
const userProfilesStore = useUserProfilesStore()

// Transform audit logs to UTimeline format
const timelineItems = computed(() => {
  return rawTimelineItems.value.map(item => ({
    date: item.date,
    title: item.title,
    description: item.description,
    icon: item.icon,
    avatar: item.avatar,
    userName: item.userInfo?.name || item.user || 'Unknown User'
  }))
})

// Methods
const loadTimeline = async () => {
  loading.value = true
  error.value = null

  try {
    // Ensure user profiles are loaded
    if (userProfilesStore.users.length === 0) {
      await userProfilesStore.fetchUsers()
    }

    // Process audit log from props
    const logs = Array.isArray(props.auditLog) ? props.auditLog : []
    
    // Remove duplicates before processing
    const uniqueLogs = logs.filter((log, index, self) => {
      return index === self.findIndex((l) => 
        l.timestamp === log.timestamp && 
        l.action === log.action && 
        l.description === log.description &&
        l.user_uuid === log.user_uuid
      )
    })
    
    const timelineItems: any[] = []

    for (const log of uniqueLogs) {
      // Look up user in userProfiles store by UUID
      const user = log.user_uuid 
        ? userProfilesStore.users.find((u) => u.id === log.user_uuid)
        : null

      // Get user name from profile (firstName + lastName) or fallback to email or log data
      let userName = "System"
      let userImageUrl = null
      
      if (user) {
        const fullName = `${user.firstName} ${user.lastName}`.trim()
        userName = fullName || user.email || log.user_name || "Unknown User"
        userImageUrl = user.imageUrl || log.user_image_url || null
      } else if (log.user_name) {
        userName = log.user_name
        userImageUrl = log.user_image_url || null
      }

      const userInfo = {
        name: userName,
        imageUrl: userImageUrl,
        id: log.user_uuid || null,
        initials: userName
          ? userName
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)
          : "S",
      }

      timelineItems.push({
        id: log.timestamp || Date.now(),
        date: new Date(log.timestamp).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        title: getActionTitle(log.action),
        description: log.description || getActionDescription(log),
        icon: userInfo.imageUrl ? undefined : getActionIcon(log.action),
        avatar: userInfo.imageUrl ? {
          src: userInfo.imageUrl,
          alt: userInfo.name || 'User'
        } : undefined,
        user: userInfo.name,
        userInfo: userInfo,
        timestamp: log.timestamp,
        action: log.action,
      })
    }

    // Sort timeline items by timestamp (most recent first)
    rawTimelineItems.value = timelineItems.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    
    emit('logs-loaded', rawTimelineItems.value)
  } catch (err: any) {
    const errorMessage = err.message || 'Failed to load audit timeline'
    error.value = errorMessage
    emit('error', errorMessage)
  } finally {
    loading.value = false
  }
}

const getActionTitle = (action: string): string => {
  const actionTitles: Record<string, string> = {
    created: "Created",
    updated: "Updated",
    marked_ready: "Marked Ready",
    approved: "Approved",
    rejected: "Rejected",
    deleted: "Deleted",
  }
  return actionTitles[action] || action.charAt(0).toUpperCase() + action.slice(1)
}

const getActionIcon = (action: string): string => {
  const actionIcons: Record<string, string> = {
    created: "i-heroicons-plus-circle",
    updated: "i-heroicons-pencil-square",
    marked_ready: "i-heroicons-bolt",
    approved: "i-heroicons-check-circle",
    rejected: "i-heroicons-x-circle",
    deleted: "i-heroicons-trash",
  }
  return actionIcons[action] || "i-heroicons-information-circle"
}


const getActionDescription = (log: any): string => {
  if (log.description) return log.description
  
  const actionDescriptions: Record<string, string> = {
    created: 'Change order was created',
    updated: 'Change order was updated',
    marked_ready: 'Change order was marked as ready',
    approved: 'Change order was approved',
    rejected: 'Change order was rejected',
    deleted: 'Change order was deleted',
  }
  
  return actionDescriptions[log.action] || 'Change order was modified'
}

// Watch for audit log changes
watch(() => props.auditLog, () => {
  loadTimeline()
}, { immediate: true, deep: true })

onMounted(() => {
  loadTimeline()
})
</script>

<style scoped>
.change-order-audit-timeline {
  width: 100%;
}
</style>

