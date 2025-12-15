<template>
  <UCard
    :ui="{
      root: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg hover:shadow-xl transition-shadow duration-300 h-16',
      header: 'p-0',
      body: 'p-0 h-full',
      footer: 'p-0'
    }"
  >
    <div class="flex items-center justify-between h-full px-3">
      <div>
        <p class="text-xs opacity-90">Pending Projects</p>
        <p class="text-xl font-bold">
          <USkeleton v-if="showSkeleton" class="h-6 w-10" />
          <span v-else>{{ pendingProjectsDisplay }}</span>
        </p>
      </div>
      <UIcon name="i-heroicons-clipboard-document-list" class="w-6 h-6 opacity-80" />
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useProjectsStore } from '@/stores/projects'
import { useCorporationStore } from '@/stores/corporations'

const projectsStore = useProjectsStore()
const corporationStore = useCorporationStore()

const hasCorporationSelected = computed(() => !!corporationStore.selectedCorporationId)
const isLoading = computed(() => projectsStore.loading && hasCorporationSelected.value)

const pendingProjectsCount = computed(() => {
  if (!hasCorporationSelected.value) {
    return 0
  }

  if (!projectsStore.projects) {
    return -1 // Special value to indicate undefined data
  }

  return projectsStore.projects.filter(
    (project) => project && project.project_status === 'Pending'
  ).length
})

const pendingProjectsDisplay = computed(() => {
  if (!hasCorporationSelected.value) {
    return '--'
  }

  if (pendingProjectsCount.value === -1) {
    return '--'
  }

  return pendingProjectsCount.value.toLocaleString()
})

const showSkeleton = computed(() => isLoading.value)

const ensureProjectsLoaded = async (corporationId: string | null) => {
  if (!corporationId) {
    return
  }

  try {
    await projectsStore.fetchProjectsMetadata(corporationId)
  } catch (error) {
    console.error('Failed to load projects metadata:', error)
  }
}

onMounted(() => {
  ensureProjectsLoaded(corporationStore.selectedCorporationId)
})

watch(
  () => corporationStore.selectedCorporationId,
  (newCorporationId, oldCorporationId) => {
    if (newCorporationId && newCorporationId !== oldCorporationId) {
      ensureProjectsLoaded(newCorporationId)
    }
  }
)
</script>

