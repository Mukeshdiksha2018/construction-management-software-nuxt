<template>
  <div>
    <!-- Status Stat Cards with Add New Button and Search Bar -->
    <div v-if="isReady && !loading" class="flex items-center gap-4 mb-4">
      <div class="flex flex-row flex-1 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
      <!-- Summary Section (Highlighted) -->
      <div
        @click="clearStatusFilter()"
        :class="[
          'flex-1 px-4 py-2 cursor-pointer transition-colors flex items-center justify-center',
          selectedStatusFilter === null 
            ? 'bg-amber-50 dark:bg-amber-900/20' 
            : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
        ]"
      >
        <div class="flex flex-col items-center text-center">
          <div class="text-sm text-gray-700 dark:text-gray-300">
            Summary ({{ allProjectsStats.count }})
          </div>
          <div class="text-base font-bold text-gray-900 dark:text-white mt-1">
            {{ formatCurrency(allProjectsStats.totalValue) }}
          </div>
        </div>
      </div>
      
      <!-- Divider -->
      <div class="w-px bg-gray-200 dark:bg-gray-700"></div>
      
      <!-- Pending Section -->
      <div
        @click="toggleStatusFilter('Pending')"
        :class="[
          'flex-1 px-4 py-2 cursor-pointer transition-colors flex items-center justify-center',
          selectedStatusFilter === 'Pending'
            ? 'bg-gray-100 dark:bg-gray-700'
            : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
        ]"
      >
        <div class="flex flex-col items-center text-center">
          <div class="text-sm text-gray-700 dark:text-gray-300">
            Pending ({{ pendingStats.count }})
          </div>
          <div class="text-base font-bold text-gray-900 dark:text-white mt-1">
            {{ formatCurrency(pendingStats.totalValue) }}
          </div>
        </div>
      </div>
      
      <!-- Divider -->
      <div class="w-px bg-gray-200 dark:bg-gray-700"></div>
      
      <!-- Bidding Section -->
      <div
        @click="toggleStatusFilter('Bidding')"
        :class="[
          'flex-1 px-4 py-2 cursor-pointer transition-colors flex items-center justify-center',
          selectedStatusFilter === 'Bidding'
            ? 'bg-gray-100 dark:bg-gray-700'
            : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
        ]"
      >
        <div class="flex flex-col items-center text-center">
          <div class="text-sm text-gray-700 dark:text-gray-300">
            Bidding ({{ biddingStats.count }})
          </div>
          <div class="text-base font-bold text-gray-900 dark:text-white mt-1">
            {{ formatCurrency(biddingStats.totalValue) }}
          </div>
        </div>
      </div>
      
      <!-- Divider -->
      <div class="w-px bg-gray-200 dark:bg-gray-700"></div>
      
      <!-- Started Section -->
      <div
        @click="toggleStatusFilter('Started')"
        :class="[
          'flex-1 px-4 py-2 cursor-pointer transition-colors flex items-center justify-center',
          selectedStatusFilter === 'Started'
            ? 'bg-gray-100 dark:bg-gray-700'
            : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
        ]"
      >
        <div class="flex flex-col items-center text-center">
          <div class="text-sm text-gray-700 dark:text-gray-300">
            Started ({{ startedStats.count }})
          </div>
          <div class="text-base font-bold text-gray-900 dark:text-white mt-1">
            {{ formatCurrency(startedStats.totalValue) }}
          </div>
        </div>
      </div>
      
      <!-- Divider -->
      <div class="w-px bg-gray-200 dark:bg-gray-700"></div>
      
      <!-- In Progress Section -->
      <div
        @click="toggleStatusFilter('In Progress')"
        :class="[
          'flex-1 px-4 py-2 cursor-pointer transition-colors flex items-center justify-center',
          selectedStatusFilter === 'In Progress'
            ? 'bg-gray-100 dark:bg-gray-700'
            : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
        ]"
      >
        <div class="flex flex-col items-center text-center">
          <div class="text-sm text-gray-700 dark:text-gray-300">
            In Progress ({{ inProgressStats.count }})
          </div>
          <div class="text-base font-bold text-gray-900 dark:text-white mt-1">
            {{ formatCurrency(inProgressStats.totalValue) }}
          </div>
        </div>
      </div>
      
      <!-- Divider -->
      <div class="w-px bg-gray-200 dark:bg-gray-700"></div>
      
      <!-- Completed Section -->
      <div
        @click="toggleStatusFilter('Completed')"
        :class="[
          'flex-1 px-4 py-2 cursor-pointer transition-colors flex items-center justify-center',
          selectedStatusFilter === 'Completed'
            ? 'bg-gray-100 dark:bg-gray-700'
            : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
        ]"
      >
        <div class="flex flex-col items-center text-center">
          <div class="text-sm text-gray-700 dark:text-gray-300">
            Completed ({{ completedStats.count }})
          </div>
          <div class="text-base font-bold text-gray-900 dark:text-white mt-1">
            {{ formatCurrency(completedStats.totalValue) }}
          </div>
        </div>
      </div>
      
      <!-- Divider -->
      <div class="w-px bg-gray-200 dark:bg-gray-700"></div>
      
      <!-- On Hold Section -->
      <div
        @click="toggleStatusFilter('On Hold')"
        :class="[
          'flex-1 px-4 py-2 cursor-pointer transition-colors flex items-center justify-center',
          selectedStatusFilter === 'On Hold'
            ? 'bg-gray-100 dark:bg-gray-700'
            : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
        ]"
      >
        <div class="flex flex-col items-center text-center">
          <div class="text-sm text-gray-700 dark:text-gray-300">
            On Hold ({{ onHoldStats.count }})
          </div>
          <div class="text-base font-bold text-gray-900 dark:text-white mt-1">
            {{ formatCurrency(onHoldStats.totalValue) }}
          </div>
        </div>
      </div>
      </div>
      
      <!-- Add New Button and Search Bar Stacked -->
      <div class="flex flex-col gap-2">
        <UButton
          v-if="hasPermission('project_create')"
          icon="i-heroicons-plus"
          color="primary"
          size="xs"
          @click="addNewProject"
        >
          Add New Project
        </UButton>
        <div class="max-w-sm">
          <UInput
            v-model="globalFilter"
            placeholder="Search projects..."
            icon="i-heroicons-magnifying-glass"
            variant="subtle"
            size="xs"
            class="w-full"
          />
        </div>
      </div>
    </div>

    <!-- Projects Table -->
    <div v-if="loading">
      <div class="relative overflow-auto rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <!-- Loading skeleton -->
        <div class="bg-gray-50 dark:bg-gray-700">
          <div class="grid grid-cols-8 gap-4 px-2 py-2 text-sm font-bold text-gray-800 dark:text-gray-200 tracking-wider border-b border-gray-200 dark:border-gray-600">
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-8" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-16" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-20" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-12" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-16" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-20" />
            </div>
            <div class="flex items-center gap-2">
              <USkeleton class="h-4 w-4 rounded" />
              <USkeleton class="h-4 w-20" />
            </div>
            <div class="flex items-center justify-center">
              <USkeleton class="h-4 w-16" />
            </div>
          </div>
        </div>
        
        <!-- Table Body -->
        <div class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          <div v-for="i in 8" :key="i" class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
            <div class="grid grid-cols-8 gap-4 px-2 py-1 text-xs text-gray-900 dark:text-gray-100 border-gray-100 dark:border-gray-700">
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-24" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-12" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-24" />
              </div>
              <div class="flex items-center">
                <USkeleton class="h-4 w-20" />
              </div>
              <div class="flex items-center justify-end gap-1">
                <USkeleton class="h-6 w-6 rounded" />
                <USkeleton class="h-6 w-6 rounded" />
                <USkeleton class="h-6 w-6 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="error">
      <UAlert
        icon="i-heroicons-exclamation-triangle"
        color="error"
        variant="soft"
        :title="error"
        :description="'Please try refreshing the page or contact support if the issue persists.'"
      />
    </div>

    <div v-else-if="projects.length && hasPermission('project_view') && isReady">
      <UTable 
        ref="table"
        sticky
        v-model:pagination="pagination"
        v-model:column-pinning="columnPinning"
        :pagination-options="paginationOptions"
        :data="filteredProjects" 
        :columns="columns"
        v-model:selected="selectedProjects"
        v-model:global-filter="globalFilter"
        :selectable="true"
        class="max-h-[70vh] overflow-auto"
      />
      
      <!-- Pagination -->
      <div v-if="shouldShowPagination(filteredProjects.length).value" class="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600">Show:</span>
          <USelect
            v-model="pagination.pageSize"
            :items="pageSizeOptions"
            icon="i-heroicons-list-bullet"
            size="sm"
            variant="outline"
            class="w-32"
            @change="updatePageSize(table)"
          />
        </div>
        
        <UPagination v-bind="getPaginationProps(table)" />
        
        <div class="text-sm text-gray-600">
          {{ getPageInfo(table, 'projects').value }}
        </div>
      </div>
    </div>

    <div v-else-if="!hasPermission('project_view') && isReady" class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <UIcon name="i-heroicons-lock-closed" class="w-12 h-12 mx-auto" />
      </div>
      <p class="text-gray-500 text-lg">Access Denied</p>
      <p class="text-gray-400 text-sm">You don't have permission to view projects</p>
    </div>

    <div v-else-if="isReady" class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <UIcon name="i-heroicons-clipboard-document-list" class="w-12 h-12 mx-auto" />
      </div>
      <p class="text-gray-500 text-lg">No projects found</p>
      <p class="text-gray-400 text-sm mb-6">Create your first project to get started</p>
      <UButton 
        v-if="hasPermission('project_create')"
        icon="i-heroicons-plus" 
        @click="addNewProject"
      >
        Add Project
      </UButton>
    </div>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal" :title="'Delete Project'" :description="''">
      <template #body>
        <div class="p-6">
          <div class="flex items-center mb-4">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-8 h-8 text-red-500 mr-3" />
            <div>
              <h3 class="text-lg font-medium text-gray-900">Delete Project</h3>
              <p class="text-sm text-gray-500">This action cannot be undone.</p>
            </div>
          </div>
          
          <div v-if="projectToDelete" class="bg-gray-50 p-4 rounded-lg mb-4">
            <p class="text-sm text-gray-700">
              <strong>Project Name:</strong> {{ projectToDelete.project_name || 'N/A' }}<br>
              <strong>Project ID:</strong> {{ projectToDelete.project_id || 'N/A' }}<br>
              <strong>Type:</strong> {{ projectToDelete.project_type || 'N/A' }}<br>
              <strong>Estimated Amount:</strong> {{ formatCurrency(projectToDelete.estimated_amount) }}<br>
              <strong>Status:</strong> {{ projectToDelete.project_status || 'N/A' }}
            </p>
          </div>
          
          <p class="text-gray-600">
            Are you sure you want to delete this project? This will permanently remove the project and all associated data.
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" variant="soft" @click="cancelDelete">
            Cancel
          </UButton>
          <UButton color="error" @click="confirmDelete">
            Delete Project
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Project Preview Modal -->
    <UModal 
      v-model:open="showPreviewModal"
      title="Project Details"
      description="View complete information about this project"
      :ui="{ 
        content: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-1rem)] max-w-3xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] rounded-lg shadow-lg ring ring-default overflow-hidden',
        body: 'p-4 sm:p-6'
      }"
    >
      <template #body>
        <div v-if="previewProject" class="space-y-4">
          <!-- Top row: Name and ID -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Project Name</label>
              <p class="text-base font-semibold text-gray-900 dark:text-gray-100">{{ previewProject.project_name }}</p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Project ID</label>
              <p class="text-base font-semibold text-gray-900 dark:text-gray-100">{{ previewProject.project_id }}</p>
            </div>
          </div>

          <!-- Types and Status -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Project Type</label>
              <p class="text-sm text-default">{{ projectTypeNameByUuid[previewProject.project_type_uuid] || previewProject.project_type_uuid || 'N/A' }}</p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Service Type</label>
              <p class="text-sm text-default">{{ serviceTypeNameByUuid[previewProject.service_type_uuid] || previewProject.service_type_uuid || 'N/A' }}</p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Status</label>
              <UBadge :color="getStatusBadgeColor(previewProject.project_status || 'Pending')" variant="soft" size="sm">
                {{ previewProject.project_status || 'Pending' }}
              </UBadge>
            </div>
          </div>

          <!-- Dates and Amount -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Start Date</label>
              <p class="text-sm text-default">{{ formatDate(previewProject.project_start_date) }}</p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Est. Completion</label>
              <p class="text-sm text-default">{{ formatDate(previewProject.project_estimated_completion_date) }}</p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Estimated Amount</label>
              <p class="text-sm font-mono">{{ formatCurrency(previewProject.estimated_amount || 0) }}</p>
            </div>
          </div>

          <!-- Area / Rooms and Options -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Area (sq ft)</label>
              <p class="text-sm text-default">{{ previewProject.area_sq_ft || '-' }}</p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">No. of Rooms</label>
              <p class="text-sm text-default">{{ previewProject.no_of_rooms || '-' }}</p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Options</label>
              <p class="text-sm text-default">{{ previewProject.only_total ? 'Only Total' : 'Detailed' }} • {{ previewProject.enable_labor ? 'Labor' : 'No Labor' }} • {{ previewProject.enable_material ? 'Material' : 'No Material' }}</p>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="outline" @click="showPreviewModal = false">Close</UButton>
          <UButton v-if="hasPermission('project_edit')" color="primary" icon="tdesign:edit-filled" @click="editProjectFromPreview">Edit Project</UButton>
        </div>
      </template>
    </UModal>

    <!-- Project Audit Log Slideover -->
    <AuditLogSlideover
      v-model:open="showProjectAuditLogModal"
      :entity-id="selectedProjectForAudit?.id || ''"
      entity-type="project"
      :corporation-uuid="corporationStore.selectedCorporation?.uuid || ''"
      :title="auditLogTitle"
      :description="auditLogDescription"
      :auto-refresh="true"
      @logs-loaded="onAuditLogsLoaded"
      @error="onAuditLogError"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, watch, onMounted, nextTick, useTemplateRef, resolveComponent } from "vue";
import { useRouter } from 'vue-router'
import { useCorporationStore } from '@/stores/corporations'
import { useProjectsStore } from '@/stores/projects'
import { useProjectAddressesStore } from '@/stores/projectAddresses'
import { useProjectTypesStore } from '@/stores/projectTypes'
import { useServiceTypesStore } from '@/stores/serviceTypes'
import { useEstimatesStore } from '@/stores/estimates'
import { useDateRangeStore } from '@/stores/dateRange'
import { useTableStandard } from '@/composables/useTableStandard'
import { useDateFormat } from '@/composables/useDateFormat'
import { useCurrencyFormat } from '@/composables/useCurrencyFormat'
import { useAuditLog } from '@/composables/useAuditLog'
import { usePermissions } from '@/composables/usePermissions'
import type { TableColumn } from '@nuxt/ui'
import AuditLogSlideover from '@/components/AuditLogs/AuditLogSlideover.vue'

// Resolve components for table columns
const UButton = resolveComponent('UButton')
const UTooltip = resolveComponent('UTooltip')

// Router
const router = useRouter()

// Stores
const corporationStore = useCorporationStore()
const projectsStore = useProjectsStore()
const projectAddressesStore = useProjectAddressesStore()
const projectTypesStore = useProjectTypesStore()
const serviceTypesStore = useServiceTypesStore()
const estimatesStore = useEstimatesStore()
const dateRangeStore = useDateRangeStore()
const { formatDate } = useDateFormat()
const { formatCurrency } = useCurrencyFormat()

// Use permissions composable
const { hasPermission, isReady } = usePermissions()

// Audit log functionality
const { 
  generateAuditLogInfo, 
  showAuditLog, 
  closeAuditLog, 
  onAuditLogsLoaded, 
  onAuditLogError, 
  onExportAuditLogs 
} = useAuditLog({
  entityType: 'project',
  corporationUuid: computed(() => corporationStore.selectedCorporation?.uuid || ''),
  formatCurrency
});

// Table functionality
const {
  pagination,
  paginationOptions,
  pageSizeOptions,
  updatePageSize,
  getPaginationProps,
  getPageInfo,
  shouldShowPagination
} = useTableStandard()

// Data state
const selectedProjects = ref<any[]>([])
const globalFilter = ref('')
const selectedStatusFilter = ref<string | null>(null)
const showPreviewModal = ref(false)
const previewProject = ref<any>(null)
const showDeleteModal = ref(false)
const projectToDelete = ref<any>(null)
const showProjectAuditLogModal = ref(false)
const selectedProjectForAudit = ref<any>(null)
const auditLogsCount = ref(0)
const projectBilledAmounts = ref<Map<string, number>>(new Map())

// Column pinning for sticky actions column
const columnPinning = ref({
  left: [],
  right: ['actions']
});

// Table ref for accessing table API
const table = useTemplateRef<any>('table');

// Use projects from store
const projects = computed(() => projectsStore.projects)
const loading = computed(() => projectsStore.loading)
// Only show error alert for fetch errors, not delete operation errors
// Delete errors are handled via toast notifications
const error = computed(() => {
  const storeError = projectsStore.error
  // Don't show error alert for delete-related errors (they're handled via toast)
  if (storeError && (storeError.includes('delete') || storeError.includes('Cannot delete'))) {
    return null
  }
  return storeError
})

// Computed
const selectedCorporationId = computed(() => corporationStore.selectedCorporationId)

// Maps for displaying names instead of UUIDs in the table
const projectTypeNameByUuid = computed<Record<string, string>>(() => {
  const list = projectTypesStore.getActiveProjectTypes || []
  const map: Record<string, string> = {}
  list.forEach((pt: any) => { 
    if (pt?.uuid) {
      map[pt.uuid] = pt.name || pt.uuid
    }
  })
  return map
})

const serviceTypeNameByUuid = computed<Record<string, string>>(() => {
  const list = serviceTypesStore.getActiveServiceTypes || []
  const map: Record<string, string> = {}
  list.forEach((st: any) => { 
    if (st?.uuid) {
      map[st.uuid] = st.name || st.uuid
    }
  })
  return map
})

// Status stats computed properties
const allProjectsStats = computed(() => {
  return {
    count: projects.value.length,
    totalValue: projects.value.reduce((sum, p) => sum + (Number(p.estimated_amount) || 0), 0)
  }
})

const pendingStats = computed(() => {
  const pendingProjects = projects.value.filter(p => (p.project_status || 'Pending') === 'Pending')
  return {
    count: pendingProjects.length,
    totalValue: pendingProjects.reduce((sum, p) => sum + (Number(p.estimated_amount) || 0), 0)
  }
})

const biddingStats = computed(() => {
  const biddingProjects = projects.value.filter(p => p.project_status === 'Bidding')
  return {
    count: biddingProjects.length,
    totalValue: biddingProjects.reduce((sum, p) => sum + (Number(p.estimated_amount) || 0), 0)
  }
})

const startedStats = computed(() => {
  const startedProjects = projects.value.filter(p => p.project_status === 'Started')
  return {
    count: startedProjects.length,
    totalValue: startedProjects.reduce((sum, p) => sum + (Number(p.estimated_amount) || 0), 0)
  }
})

const inProgressStats = computed(() => {
  const inProgressProjects = projects.value.filter(p => p.project_status === 'In Progress')
  return {
    count: inProgressProjects.length,
    totalValue: inProgressProjects.reduce((sum, p) => sum + (Number(p.estimated_amount) || 0), 0)
  }
})

const completedStats = computed(() => {
  const completedProjects = projects.value.filter(p => p.project_status === 'Completed')
  return {
    count: completedProjects.length,
    totalValue: completedProjects.reduce((sum, p) => sum + (Number(p.estimated_amount) || 0), 0)
  }
})

const onHoldStats = computed(() => {
  const onHoldProjects = projects.value.filter(p => p.project_status === 'On Hold')
  return {
    count: onHoldProjects.length,
    totalValue: onHoldProjects.reduce((sum, p) => sum + (Number(p.estimated_amount) || 0), 0)
  }
})

// Map of project UUID to latest estimate status (similar to ProjectDetailsForm.vue)
const projectEstimateStatusMap = computed(() => {
  const map = new Map<string, string>()
  // Access estimates store to ensure reactivity
  const allEstimates = estimatesStore.estimates || []
  projects.value.forEach((project: any) => {
    const projectEstimates = allEstimates.filter((e: any) => e.project_uuid === project.uuid) || []
    if (projectEstimates.length > 0) {
      // Sort by estimate_date descending to get the latest
      const sorted = [...projectEstimates].sort((a: any, b: any) => {
        const dateA = new Date(a.estimate_date || 0).getTime()
        const dateB = new Date(b.estimate_date || 0).getTime()
        return dateB - dateA
      })
      const latestEstimate = sorted[0]
      if (latestEstimate && latestEstimate.status) {
        map.set(project.uuid, latestEstimate.status)
      }
    }
  })
  return map
})

const filteredProjects = computed(() => {
  let filtered = [...projects.value]
  
  // Apply status filter if selected
  if (selectedStatusFilter.value) {
    filtered = filtered.filter(p => p.project_status === selectedStatusFilter.value)
  }
  
  return filtered
})

// Table columns configuration
const columns: TableColumn<any>[] = [
  {
    accessorKey: 'project_id',
    header: 'Project ID',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', row.original.project_id || 'N/A')
  },
  {
    accessorKey: 'project_name',
    header: 'Project Name',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => h('div', { class: 'font-medium text-default' }, row.original.project_name || 'N/A')
  },
  {
    accessorKey: 'project_type_uuid',
    header: 'Type',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => {
      const uuid = row.original.project_type_uuid
      const label = uuid ? (projectTypeNameByUuid.value[uuid] || uuid) : 'N/A'
      return h('div', label)
    }
  },
  {
    accessorKey: 'project_status',
    header: 'Status',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => {
      const status = row.original.project_status || 'Pending';
      const statusColors: Record<string, string> = {
        'Pending': 'bg-warning/10 text-warning',
        'Bidding': 'bg-info/10 text-info',
        'Started': 'bg-primary/10 text-primary',
        'In Progress': 'bg-info/10 text-info',
        'Completed': 'bg-success/10 text-success',
        'On Hold': 'bg-error/10 text-error'
      };
      const colorClass = statusColors[status] || 'bg-elevated text-default';
      
      return h('span', { 
        class: `inline-flex items-center px-2 py-1 gap-1 rounded-md text-xs font-medium ${colorClass}` 
      }, status)
    }
  },
  {
    accessorKey: 'service_type_uuid',
    header: 'Service Type',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => {
      const uuid = row.original.service_type_uuid
      const label = uuid ? (serviceTypeNameByUuid.value[uuid] || uuid) : 'N/A'
      return h('div', label)
    }
  },
  // Date columns grouped together right after Service Type
  {
    accessorKey: 'project_start_date',
    header: 'Start Date',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => {
      const date = row.original.project_start_date;
      const formatted = formatDate(date);
      return h('div', formatted || 'N/A');
    }
  },
  {
    accessorKey: 'project_estimated_completion_date',
    header: 'Est End Date',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => {
      const date = row.original.project_estimated_completion_date;
      const formatted = formatDate(date);
      return h('div', formatted || 'N/A');
    }
  },
  {
    accessorKey: 'estimated_amount',
    header: 'Estimated Amount',
    enableSorting: false,
    meta: { class: { th: 'text-right', td: 'text-right' } },
    cell: ({ row }: { row: { original: any } }) => {
      const amount = row.original.estimated_amount || 0;
      const formattedAmount = formatCurrency(amount);
      return h('div', { class: 'text-right font-mono text-sm' }, formattedAmount);
    }
  },
  {
    accessorKey: 'billed_to_date',
    header: 'Billed to Date',
    enableSorting: false,
    meta: { class: { th: 'text-right', td: 'text-right' } },
    cell: ({ row }: { row: { original: any } }) => {
      const billedAmount = projectBilledAmounts.value.get(row.original.uuid) || 0;
      const formattedAmount = formatCurrency(billedAmount);
      return h('div', { class: 'text-right font-mono text-sm text-success-600 dark:text-success-400' }, formattedAmount);
    }
  },
  {
    accessorKey: 'estimate_status',
    header: 'Estimate Status',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => {
      const status = projectEstimateStatusMap.value.get(row.original.uuid);
      if (!status) {
        return h('div', { class: 'text-gray-400 text-xs' }, 'No Estimate');
      }
      
      const statusMap: Record<string, { label: string; class: string }> = {
        'Draft': {
          label: 'Drafting…',
          class: 'bg-gray-100 text-gray-700 border border-gray-200'
        },
        'Ready': {
          label: 'Estimate ready for approval',
          class: 'bg-blue-100 text-blue-700 border border-blue-200'
        },
        'Approved': {
          label: 'Estimate approved',
          class: 'bg-green-100 text-green-700 border border-green-200'
        }
      };
      
      const { label, class: colorClass } = statusMap[status] ?? {
        label: status,
        class: 'bg-elevated text-default border border-default'
      };
      
      return h('span', { 
        class: `inline-flex items-center px-2 py-1 gap-1 rounded-md text-xs font-medium ${colorClass}` 
      }, label);
    }
  },
  {
    id: 'actions',
    header: 'Actions',
    enableSorting: false,
    meta: { class: { th: 'text-right sticky right-0 bg-transparent z-10', td: 'text-right sticky right-0 bg-transparent' } },
    cell: ({ row }: { row: { original: any } }) => {
      const buttons = [];
      
      // View button - show if user has view permission
      if (hasPermission('project_view')) {
        buttons.push(
          h(UTooltip, { text: 'View Project Details' }, () => [
            h(UButton, {
              icon: 'i-heroicons-eye-solid',
              size: 'xs',
              variant: 'soft',
              color: 'neutral',
              class: 'hover:scale-105 transition-transform',
              onClick: () => previewProjectDetails(row.original)
            }, () => '')
          ])
        );
      }
      
      // Edit button - show if user has edit permission
      if (hasPermission('project_edit')) {
        buttons.push(
          h(UTooltip, { text: 'Edit Project' }, () => [
            h(UButton, {
              icon: 'tdesign:edit-filled',
              size: 'xs',
              variant: 'soft',
              color: 'secondary',
              class: 'hover:scale-105 transition-transform',
              onClick: () => editProject(row.original)
            }, () => '')
          ])
        );
      }
      
      // Delete button - show if user has delete permission
      if (hasPermission('project_delete')) {
        buttons.push(
          h(UTooltip, { text: 'Delete Project' }, () => [
            h(UButton, {
              icon: 'mingcute:delete-fill',
              size: 'xs',
              variant: 'soft',
              color: 'error',
              class: 'hover:scale-105 transition-transform',
              onClick: () => deleteProject(row.original)
            }, () => '')
          ])
        );
      }
      
      return h('div', { class: 'flex justify-end space-x-2' }, buttons);
    }
  }
];

// Methods
const toggleStatusFilter = (status: string) => {
  if (selectedStatusFilter.value === status) {
    // If clicking the same status, clear the filter
    selectedStatusFilter.value = null
  } else {
    // Otherwise, set the new filter
    selectedStatusFilter.value = status
  }
  
  // Reset to first page when filter changes
  if (table.value?.tableApi) {
    table.value.tableApi.setPageIndex(0)
  }
}

const clearStatusFilter = () => {
  selectedStatusFilter.value = null
  
  // Reset to first page when filter is cleared
  if (table.value?.tableApi) {
    table.value.tableApi.setPageIndex(0)
  }
}

const fetchBilledAmounts = async () => {
  if (!selectedCorporationId.value) return
  
  try {
    // Use dedicated endpoint that returns pre-aggregated billed amounts per project
    // This is more efficient than fetching all invoices and filtering client-side
    const response: any = await $fetch('/api/projects/billed-amounts', {
      method: 'GET',
      query: {
        corporation_uuid: selectedCorporationId.value,
      },
    });
    
    // Convert the response object to a Map
    // Handle both { data: {...}, error: null } and direct data object
    const billedMap = new Map<string, number>();
    const dataToProcess = response?.data || response;
    
    if (dataToProcess && typeof dataToProcess === 'object' && !Array.isArray(dataToProcess)) {
      Object.entries(dataToProcess).forEach(([projectUuid, amount]) => {
        if (projectUuid && typeof amount === 'number') {
          billedMap.set(projectUuid, amount);
        }
      });
    }
    
    projectBilledAmounts.value = billedMap;
  } catch (error) {
    // Silently handle errors - billed amounts are not critical for page functionality
  }
}

const fetchProjects = async () => {
  if (!selectedCorporationId.value) {
    console.log('No corporation selected, skipping fetch')
    return
  }
  
  try {
    console.log('Fetching projects data for corporation:', selectedCorporationId.value)
    await Promise.all([
      projectsStore.fetchProjects(selectedCorporationId.value),
      projectTypesStore.fetchProjectTypes(),
      serviceTypesStore.fetchServiceTypes(),
      estimatesStore.fetchEstimates(selectedCorporationId.value),
      fetchBilledAmounts()
    ])
    console.log('Successfully fetched projects data')
  } catch (err) {
    console.error('Error fetching projects data:', err)
  }
}

const addNewProject = () => {
  if (!hasPermission('project_create')) {
    try {
      const toast = useToast();
      toast.add({
        title: "Access Denied",
        description: "You don't have permission to create projects.",
        color: "error",
        icon: "i-heroicons-x-circle",
      });
    } catch (error) {
      console.error('Error showing toast:', error);
    }
    return;
  }
  router.push('/projects/form/new')
}

const editProject = (project: any) => {
  if (!hasPermission('project_edit')) {
    try {
      const toast = useToast();
      toast.add({
        title: "Access Denied",
        description: "You don't have permission to edit projects.",
        color: "error",
        icon: "i-heroicons-x-circle",
      });
    } catch (error) {
      console.error('Error showing toast:', error);
    }
    return;
  }
  
  router.push(`/projects/form/${project.uuid}`)
}

const deleteProject = (project: any) => {
  if (!hasPermission('project_delete')) {
    const toast = useToast();
    toast.add({
      title: "Access Denied",
      description: "You don't have permission to delete projects.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
    return;
  }
  
  projectToDelete.value = project
  showDeleteModal.value = true
}

const confirmDelete = async () => {
  if (!hasPermission('project_delete')) {
    const toast = useToast();
    toast.add({
      title: "Access Denied",
      description: "You don't have permission to delete projects.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
    return;
  }

  if (!projectToDelete.value) return

  try {
    const success = await projectsStore.deleteProject(projectToDelete.value.uuid)
    
    if (success) {
      const toast = useToast();
      toast.add({
        title: "Success",
        description: "Project deleted successfully",
        color: "success",
        icon: "i-heroicons-check-circle",
      });
      
      showDeleteModal.value = false
      projectToDelete.value = null
    } else {
      // If deleteProject returns false, check the error from the store
      // The store might have caught an API error
      const storeError = projectsStore.error || 'Failed to delete project'
      handleDeleteError(storeError)
      // Clear the store error after handling it so it doesn't affect the table display
      projectsStore.error = null
    }
  } catch (error: any) {
    // Handle error from catch block (if store throws)
    handleDeleteError(error)
    // Clear the store error after handling it so it doesn't affect the table display
    projectsStore.error = null
  }
}

// Helper function to handle delete errors with proper formatting
const handleDeleteError = (error: any) => {
  console.error('Error deleting project:', error)
  
  // Extract clean error message without technical details
  const getCleanMessage = (msg: string | undefined): string => {
    if (!msg) return ''
    let clean = msg
    // Remove [METHOD] "URL": statusCode patterns like [DELETE] "/api/projects?uuid=...": 400
    clean = clean.replace(/\[.*?\]\s*"[^"]*":\s*\d{3}\s*/g, '')
    // Remove [METHOD] "URL" patterns (without status code)
    clean = clean.replace(/\[.*?\]\s*"[^"]*":\s*/g, '')
    // Remove API endpoint URLs (standalone)
    clean = clean.replace(/\/api\/[^\s"]+/g, '')
    // Remove status codes like "500" or "400" (standalone numbers, but keep them in context)
    clean = clean.replace(/\b\d{3}\b(?=\s|$)/g, '')
    // Remove common error prefixes
    clean = clean.replace(/^(FetchError|Error|Failed to load resource):\s*/i, '')
    // Remove extra whitespace and leading/trailing colons
    clean = clean.trim().replace(/\s+/g, ' ').replace(/^\s*:\s*/, '').replace(/\s*:\s*$/, '')
    return clean
  }
  
  const toast = useToast()
  
  // Handle both error objects and string messages
  let errorTitle = 'Error'
  let errorDescription = 'Failed to delete project. Please try again.'
  let statusCode: number | undefined
  
  // Check if error is an object with statusCode
  if (typeof error === 'object' && error !== null) {
    statusCode = error.statusCode
    console.error('Error details:', {
      message: error.message,
      statusCode: error.statusCode,
      statusMessage: error.statusMessage,
      url: error.url,
      data: error.data
    })
    
    // Check if it's a constraint error (project has estimates)
    if (statusCode === 400 || error.message?.includes('being used') || error.message?.includes('Cannot delete') || error.message?.includes('estimates')) {
      errorTitle = 'Cannot Delete Project'
      
      // Format the error message for better readability
      if (error.data?.estimateList && Array.isArray(error.data.estimateList)) {
        const estimateList = error.data.estimateList
        const count = error.data.count || estimateList.length
        const hasMore = error.data.hasMore || false
        
        // Create a readable list format for toast notification
        const estimatesText = estimateList.length <= 3
          ? estimateList.join(', ')
          : `${estimateList.slice(0, 3).join(', ')}${hasMore ? `, and ${count - 3} more` : `, and ${estimateList.length - 3} more`}`
        
        errorDescription = `This project is currently being used by ${count} active estimate(s): ${estimatesText}. Please delete these estimates before deleting the project.`
      } else {
        // Use statusMessage from API if available (it should be clean), otherwise use cleaned message
        if (error.statusMessage) {
          // statusMessage from API should already be clean, but clean it just in case
          errorDescription = getCleanMessage(error.statusMessage) || 'This project is currently being used by one or more estimates. Please delete these estimates before deleting the project.'
        } else if (error.message) {
          // Clean the error message to remove technical details
          errorDescription = getCleanMessage(error.message) || 'This project is currently being used by one or more estimates. Please delete these estimates before deleting the project.'
        } else {
          errorDescription = 'This project is currently being used by one or more estimates. Please delete these estimates before deleting the project.'
        }
      }
    } else if (statusCode === 404) {
      errorTitle = 'Project Not Found'
      errorDescription = 'The project you are trying to delete does not exist. It may have already been deleted.'
    } else if (statusCode === 500) {
      errorTitle = 'Server Error'
      const apiMessage = error.statusMessage || error.message
      errorDescription = apiMessage ? getCleanMessage(apiMessage) : 'An unexpected error occurred while deleting the project. Please try again later.'
    } else {
      // For any other error, use cleaned message
      const apiMessage = error.statusMessage || error.message
      errorDescription = apiMessage ? getCleanMessage(apiMessage) : 'Failed to delete project. Please try again.'
    }
  } else if (typeof error === 'string') {
    // Handle string error messages (from store.error)
    if (error.includes('being used') || error.includes('Cannot delete') || error.includes('estimates')) {
      errorTitle = 'Cannot Delete Project'
      errorDescription = getCleanMessage(error) || 'This project is currently being used by one or more estimates. Please delete these estimates before deleting the project.'
    } else {
      errorDescription = getCleanMessage(error)
    }
  }
  
  toast.add({
    title: errorTitle,
    description: errorDescription,
    color: 'error'
  })
}

const cancelDelete = () => {
  showDeleteModal.value = false
  projectToDelete.value = null
}

const previewProjectDetails = (project: any) => {
  if (!hasPermission('project_view')) {
    const toast = useToast();
    toast.add({
      title: "Access Denied",
      description: "You don't have permission to view project details.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
    return;
  }
  
  previewProject.value = project;
  showPreviewModal.value = true;
}

const editProjectFromPreview = () => {
  if (previewProject.value) {
    showPreviewModal.value = false;
    editProject(previewProject.value);
  }
}

// Audit log methods
const showProjectAuditLog = (project: any) => {
  if (!hasPermission('project_view')) {
    const toast = useToast();
    toast.add({
      title: "Access Denied",
      description: "You don't have permission to view audit logs.",
      color: "error",
      icon: "i-heroicons-x-circle",
    });
    return;
  }
  
  selectedProjectForAudit.value = project;
  showProjectAuditLogModal.value = true;
}

const closeProjectAuditLog = () => {
  showProjectAuditLogModal.value = false;
  selectedProjectForAudit.value = null;
  auditLogsCount.value = 0;
}

const auditLogTitle = computed(() => {
  if (selectedProjectForAudit.value) {
    return `Project ${selectedProjectForAudit.value.project_name || 'N/A'}`;
  }
  return 'Audit Log';
});

const auditLogDescription = computed(() => {
  if (selectedProjectForAudit.value) {
    return `Track changes for project ${selectedProjectForAudit.value.project_name || 'N/A'}`;
  }
  return 'View audit trail';
});


// Status badge helper methods
const getStatusBadgeColor = (status: string) => {
  const statusConfig = {
    'Pending': 'warning',
    'Bidding': 'info',
    'Started': 'primary',
    'In Progress': 'info',
    'Completed': 'success',
    'On Hold': 'error'
  };
  return statusConfig[status as keyof typeof statusConfig] || 'warning';
};

const getStatusIcon = (status: string) => {
  const statusConfig = {
    'Pending': 'i-heroicons-clock',
    'Bidding': 'i-heroicons-document-text',
    'Started': 'i-heroicons-play-circle',
    'In Progress': 'i-heroicons-play',
    'Completed': 'i-heroicons-check-circle',
    'On Hold': 'i-heroicons-pause'
  };
  return statusConfig[status as keyof typeof statusConfig] || 'i-heroicons-clock';
};

// Watchers to sync pagination with TanStack Table
watch(() => pagination.value.pageSize, (newSize) => {
  if (table.value?.tableApi) {
    table.value.tableApi.setPageSize(newSize);
  }
});

watch(globalFilter, () => {
  if (table.value?.tableApi) {
    table.value.tableApi.setPageIndex(0); // Reset to first page when filter changes
  }
});

// Watch for corporation changes to refetch projects
watch(selectedCorporationId, (newCorpId) => {
  if (newCorpId) {
    fetchProjects()
  }
}, { immediate: true })

onMounted(() => {
  // Add a small delay to ensure stores are properly initialized
  nextTick(() => {
    fetchProjects()
  })
})
</script>
