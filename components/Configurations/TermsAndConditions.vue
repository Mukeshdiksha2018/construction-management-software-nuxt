<template>
  <div class="space-y-6">
    <!-- Search and Add Button -->
    <div class="flex justify-between items-center gap-4">
      <UInput
        v-model="searchFilter"
        placeholder="Search terms and conditions..."
        icon="i-heroicons-magnifying-glass"
        class="flex-1 max-w-md"
      />
      <UButton
        icon="i-heroicons-plus"
        color="primary"
        @click="openAddModal"
      >
        Add Terms and Conditions
      </UButton>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <div class="text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p class="text-gray-600">Loading terms and conditions...</p>
      </div>
    </div>

    <!-- Error State -->
    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      :title="error"
    />

    <!-- Empty State -->
    <div v-else-if="filteredTermsAndConditions.length === 0" class="text-center py-12">
      <UIcon name="i-heroicons-document-text" class="w-16 h-16 mx-auto mb-4 text-gray-400" />
      <p class="text-gray-600 font-medium mb-2">
        {{ searchFilter ? 'No terms and conditions found' : 'No terms and conditions yet' }}
      </p>
      <p class="text-sm text-gray-500 mb-4">
        {{ searchFilter ? 'Try adjusting your search' : 'Get started by adding your first terms and conditions' }}
      </p>
      <UButton
        v-if="!searchFilter"
        icon="i-heroicons-plus"
        color="primary"
        @click="openAddModal"
      >
        Add Terms and Conditions
      </UButton>
    </div>

    <!-- Table -->
    <UTable
      v-else
      :data="filteredTermsAndConditions"
      :columns="columns"
      class="w-full"
    />

    <!-- Add/Edit Modal with Full-Screen Rich Text Editor -->
    <UModal 
      v-model:open="showModal" 
      :title="isEditing ? 'Edit Terms and Conditions' : 'Add Terms and Conditions'"
      description="Configure terms and conditions details for your organization."
      :ui="{ 
        content: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-[95vw] h-[calc(100vh-2rem)] max-h-[95vh] rounded-lg shadow-lg ring ring-default overflow-hidden flex flex-col',
        body: 'flex-1 flex flex-col overflow-y-auto p-0',
        header: 'p-4 sm:p-6 border-b border-default flex-shrink-0',
        footer: 'p-4 sm:p-6 border-t border-default flex-shrink-0'
      }"
      @update:open="closeModal"
    >
      <template #body>
        <div class="flex flex-col">
          <!-- Form Fields (Name and Status) -->
          <div class="p-4 sm:p-6 border-b border-default space-y-4 flex-shrink-0">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name <span class="text-red-500">*</span>
                </label>
                <UInput
                  v-model="formState.name"
                  placeholder="e.g., Standard Terms, Payment Terms"
                  variant="subtle"
                  size="sm"
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status <span class="text-red-500">*</span>
                </label>
                <USelect
                  v-model="formState.isActive"
                  :items="statusOptions"
                  placeholder="Select status"
                  variant="subtle"
                  size="sm"
                  class="w-full"
                />
              </div>
            </div>
          </div>

          <!-- Rich Text Editor (Full Screen) -->
          <div class="flex flex-col flex-shrink-0">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 px-4 sm:px-6 pt-4 pb-2">
              Content <span class="text-red-500">*</span>
            </label>
            <div class="px-4 sm:px-6 pb-4">
              <ClientOnly>
                <div class="w-full border border-default rounded-md flex flex-col bg-white dark:bg-gray-900">
                  <!-- Toolbar -->
                  <div v-if="unref(editor)" class="border-b border-default p-2 flex flex-wrap gap-1 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
                    <!-- Headings -->
                    <USelect
                      :model-value="getHeadingLevel()"
                      :options="headingOptions"
                      size="xs"
                      variant="ghost"
                      class="w-32"
                      @update:model-value="(value: number | string) => setHeading(value)"
                    >
                      <template #option="{ option }">
                        <div class="flex items-center gap-2">
                          <UIcon :name="option.icon" class="w-4 h-4" />
                          <span>{{ option.label }}</span>
                        </div>
                      </template>
                    </USelect>
                    <UButton
                      icon="i-lucide-list"
                      size="xs"
                      variant="ghost"
                      color="neutral"
                      :ui="{ rounded: 'rounded-md' }"
                      :class="{ 'bg-gray-200 dark:bg-gray-700': unref(editor)?.isActive('bulletList') }"
                      @click="unref(editor)?.chain().focus().toggleBulletList().run()"
                    />
                    <UButton
                      icon="i-lucide-list-ordered"
                      size="xs"
                      variant="ghost"
                      color="neutral"
                      :ui="{ rounded: 'rounded-md' }"
                      :class="{ 'bg-gray-200 dark:bg-gray-700': unref(editor)?.isActive('orderedList') }"
                      @click="unref(editor)?.chain().focus().toggleOrderedList().run()"
                    />
                    <div class="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                    <UButton
                      icon="i-lucide-bold"
                      size="xs"
                      variant="ghost"
                      color="neutral"
                      :ui="{ rounded: 'rounded-md' }"
                      :class="{ 'bg-gray-200 dark:bg-gray-700': unref(editor)?.isActive('bold') }"
                      @click="unref(editor)?.chain().focus().toggleBold().run()"
                    />
                    <UButton
                      icon="i-lucide-italic"
                      size="xs"
                      variant="ghost"
                      color="neutral"
                      :ui="{ rounded: 'rounded-md' }"
                      :class="{ 'bg-gray-200 dark:bg-gray-700': unref(editor)?.isActive('italic') }"
                      @click="unref(editor)?.chain().focus().toggleItalic().run()"
                    />
                    <UButton
                      icon="i-lucide-strikethrough"
                      size="xs"
                      variant="ghost"
                      color="neutral"
                      :ui="{ rounded: 'rounded-md' }"
                      :class="{ 'bg-gray-200 dark:bg-gray-700': unref(editor)?.isActive('strike') }"
                      @click="unref(editor)?.chain().focus().toggleStrike().run()"
                    />
                    <UButton
                      icon="i-lucide-code"
                      size="xs"
                      variant="ghost"
                      color="neutral"
                      :ui="{ rounded: 'rounded-md' }"
                      :class="{ 'bg-gray-200 dark:bg-gray-700': unref(editor)?.isActive('code') }"
                      @click="unref(editor)?.chain().focus().toggleCode().run()"
                    />
                    <div class="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                    <UButton
                      icon="i-lucide-text-quote"
                      size="xs"
                      variant="ghost"
                      color="neutral"
                      :ui="{ rounded: 'rounded-md' }"
                      :class="{ 'bg-gray-200 dark:bg-gray-700': unref(editor)?.isActive('blockquote') }"
                      @click="unref(editor)?.chain().focus().toggleBlockquote().run()"
                    />
                    <UButton
                      icon="i-lucide-square-code"
                      size="xs"
                      variant="ghost"
                      color="neutral"
                      :ui="{ rounded: 'rounded-md' }"
                      :class="{ 'bg-gray-200 dark:bg-gray-700': unref(editor)?.isActive('codeBlock') }"
                      @click="unref(editor)?.chain().focus().toggleCodeBlock().run()"
                    />
                  </div>
                  <!-- Editor Content -->
                  <div class="p-4 sm:p-6">
                    <TiptapEditorContent 
                      v-if="unref(editor)" 
                      :editor="unref(editor)" 
                      class="prose prose-sm dark:prose-invert max-w-none focus:outline-none" 
                    />
                    <div v-else class="flex items-center justify-center py-12 text-gray-500">
                      <div class="text-center">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p>Loading editor...</p>
                      </div>
                    </div>
                  </div>
                </div>
                <template #fallback>
                  <div class="flex items-center justify-center py-12 border border-default rounded-md">
                    <div class="text-center">
                      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p class="text-gray-600">Loading editor...</p>
                    </div>
                  </div>
                </template>
              </ClientOnly>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="outline" @click="closeModal">
            Cancel
          </UButton>
          <UButton 
            color="primary" 
            @click="handleSubmit"
            :loading="submitting"
            :disabled="!formState.name.trim() || !formState.content.trim()"
          >
            {{ isEditing ? 'Update' : 'Save' }} Terms and Conditions
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal" title="Delete Terms and Conditions">
      <template #body>
        <p class="text-gray-700 dark:text-gray-300">
          Are you sure you want to delete <strong>{{ selectedTermsAndCondition?.name }}</strong>? This action cannot be undone.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="outline" @click="showDeleteModal = false">
            Cancel
          </UButton>
          <UButton 
            color="error" 
            @click="handleDelete"
            :loading="deleting"
          >
            Delete
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Preview Modal -->
    <UModal 
      v-model:open="showPreviewModal"
      title="Terms and Conditions Details"
      description="View complete information about this terms and conditions"
      :ui="{ 
        content: 'max-w-4xl',
        body: 'max-h-[70vh] overflow-y-auto'
      }"
    >
      <template #body>
        <div v-if="previewTermsAndCondition" class="space-y-6">
          <!-- Name and Status -->
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Name
            </label>
            <div class="flex items-center gap-2">
              <p class="text-base font-semibold text-gray-900 dark:text-gray-100">
                {{ previewTermsAndCondition.name }}
              </p>
              <UBadge
                :color="previewTermsAndCondition.isActive ? 'success' : 'neutral'"
                variant="soft"
                size="sm"
              >
                {{ previewTermsAndCondition.isActive ? 'Active' : 'Inactive' }}
              </UBadge>
            </div>
          </div>

          <!-- Content -->
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Content
            </label>
            <div 
              class="prose prose-sm dark:prose-invert max-w-none p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              v-html="previewTermsAndCondition.content"
            />
          </div>

          <!-- Metadata -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Additional Information
            </label>
            <div class="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <div v-if="previewTermsAndCondition.created_at" class="flex items-center gap-2">
                <UIcon name="i-heroicons-calendar" class="w-3 h-3" />
                <span>Created: {{ new Date(previewTermsAndCondition.created_at).toLocaleString() }}</span>
              </div>
              <div v-if="previewTermsAndCondition.updated_at" class="flex items-center gap-2">
                <UIcon name="i-heroicons-clock" class="w-3 h-3" />
                <span>Updated: {{ new Date(previewTermsAndCondition.updated_at).toLocaleString() }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
      
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="outline" @click="showPreviewModal = false">
            Close
          </UButton>
          <UButton 
            color="primary" 
            icon="tdesign:edit-filled"
            @click="() => { showPreviewModal = false; if (previewTermsAndCondition) openEditModal(previewTermsAndCondition); }"
          >
            Edit Terms and Conditions
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, h, onMounted, resolveComponent, watch, onBeforeUnmount, nextTick, unref } from 'vue'
import { useCorporationStore } from '@/stores/corporations'
import { useTermsAndConditionsStore, type TermsAndCondition } from '@/stores/termsAndConditions'
import type { TableColumn } from '@nuxt/ui'

const UButton = resolveComponent('UButton')
const UBadge = resolveComponent('UBadge')
const UTooltip = resolveComponent('UTooltip')
const UIcon = resolveComponent('UIcon')
const USelect = resolveComponent('USelect')

// Reactive state
const submitting = ref(false)
const deleting = ref(false)
const showModal = ref(false)
const showDeleteModal = ref(false)
const showPreviewModal = ref(false)
const isEditing = ref(false)
const selectedTermsAndCondition = ref<TermsAndCondition | null>(null)
const previewTermsAndCondition = ref<TermsAndCondition | null>(null)
const searchFilter = ref('')

// Stores
const termsAndConditionsStore = useTermsAndConditionsStore()
const corporationStore = useCorporationStore()

// Status options for the select dropdown
const statusOptions = ['Active', 'Inactive']

// Form state
const formState = reactive({
  name: '',
  content: '',
  isActive: 'Active' as 'Active' | 'Inactive' | '',
  corporation_uuid: ''
})

// TipTap Editor instance - must be created directly in setup, not in a function
// This ensures lifecycle hooks are called in the correct context
const editor = useEditor({
  content: '',
  extensions: [TiptapStarterKit],
  editorProps: {
    attributes: {
      class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none',
    },
  },
  onUpdate: ({ editor }) => {
    formState.content = editor.getHTML()
  },
})

// Heading options
const headingOptions = [
  { value: 'paragraph', label: 'Paragraph', icon: 'i-lucide-type' },
  { value: 1, label: 'Heading 1', icon: 'i-lucide-heading-1' },
  { value: 2, label: 'Heading 2', icon: 'i-lucide-heading-2' },
  { value: 3, label: 'Heading 3', icon: 'i-lucide-heading-3' },
  { value: 4, label: 'Heading 4', icon: 'i-lucide-heading-4' },
]

// Get current heading level
const getHeadingLevel = () => {
  const editorInstance = unref(editor)
  if (!editorInstance || typeof editorInstance.isActive !== 'function') {
    return 'paragraph'
  }
  
  try {
    if (editorInstance.isActive('heading', { level: 1 })) return 1
    if (editorInstance.isActive('heading', { level: 2 })) return 2
    if (editorInstance.isActive('heading', { level: 3 })) return 3
    if (editorInstance.isActive('heading', { level: 4 })) return 4
  } catch (error) {
    return 'paragraph'
  }
  
  return 'paragraph'
}

// Set heading level
const setHeading = (value: number | string) => {
  const editorInstance = unref(editor)
  if (!editorInstance || typeof editorInstance.chain !== 'function') return
  
  try {
    if (value === 'paragraph') {
      editorInstance.chain().focus().setParagraph().run()
    } else if (typeof value === 'number') {
      editorInstance.chain().focus().toggleHeading({ level: value as 1 | 2 | 3 | 4 }).run()
    }
  } catch (error) {
    console.warn('Error setting heading:', error)
  }
}

// Watch formState.content to update editor when loading existing data
watch(() => formState.content, (newContent) => {
  const editorInstance = unref(editor)
  if (editorInstance && typeof editorInstance.getHTML === 'function') {
    const currentContent = editorInstance.getHTML()
    if (currentContent !== newContent) {
      editorInstance.commands.setContent(newContent || '')
    }
  }
}, { immediate: false })

// Watch showModal to update editor content when modal opens
watch(showModal, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      // Update editor content if formState has content
      const editorInstance = unref(editor)
      if (editorInstance && formState.content) {
        editorInstance.commands.setContent(formState.content)
      } else if (editorInstance) {
        // Clear editor if no content
        editorInstance.commands.setContent('')
      }
    })
  }
})

// Cleanup editor on unmount
onBeforeUnmount(() => {
  const editorInstance = unref(editor)
  if (editorInstance && typeof editorInstance.destroy === 'function') {
    try {
      editorInstance.destroy()
    } catch (e) {
      // Ignore destroy errors
    }
  }
})

// Table columns configuration
const columns: TableColumn<any>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => {
      const tc = row.original as TermsAndCondition;
      return h('span', { class: 'font-medium' }, tc.name);
    }
  },
  {
    accessorKey: 'content',
    header: 'Content Preview',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => {
      const tc = row.original as TermsAndCondition;
      const preview = tc.content ? (tc.content.replace(/<[^>]*>/g, '').substring(0, 100) + '...') : 'No content';
      return h('span', { 
        class: 'text-gray-600 dark:text-gray-400 text-sm' 
      }, preview);
    }
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    enableSorting: false,
    meta: { class: { th: 'text-left', td: 'text-left' } },
    cell: ({ row }: { row: { original: any } }) => {
      const tc = row.original as TermsAndCondition;
      return h(UBadge, {
        color: tc.isActive ? 'success' : 'neutral',
        variant: 'soft',
        size: 'sm'
      }, () => tc.isActive ? 'Active' : 'Inactive');
    }
  },
  {
    accessorKey: 'actions',
    header: 'Actions',
    enableSorting: false,
    meta: { class: { th: 'text-right sticky right-0 z-10 w-32', td: 'text-right sticky right-0 w-32' } },
    cell: ({ row }: { row: { original: any } }) => {
      const tc = row.original as TermsAndCondition;
      return h('div', { class: 'flex justify-end gap-1' }, [
        h(UTooltip, { text: 'View Details' }, () => [
          h(UButton, {
            icon: 'i-heroicons-eye-solid',
            size: 'xs',
            color: 'neutral',
            variant: 'soft',
            onClick: () => viewTermsAndCondition(tc)
          })
        ]),
        h(UTooltip, { text: 'Edit Terms and Conditions' }, () => [
          h(UButton, {
            icon: 'tdesign:edit-filled',
            size: 'xs',
            color: 'secondary',
            variant: 'soft',
            onClick: () => openEditModal(tc)
          })
        ]),
        h(UTooltip, { text: 'Delete Terms and Conditions' }, () => [
          h(UButton, {
            icon: 'mingcute:delete-fill',
            size: 'xs',
            color: 'error',
            variant: 'soft',
            onClick: () => confirmDelete(tc)
          })
        ])
      ]);
    }
  }
]

// Computed properties from store
const termsAndConditions = computed(() => {
  // Access the store's termsAndConditions and convert to plain array for reactivity
  const storeData = termsAndConditionsStore.termsAndConditions
  // Convert readonly ref to plain array to ensure reactivity
  return Array.isArray(storeData) ? [...storeData] : []
})
const loading = computed(() => termsAndConditionsStore.loading)
const error = computed(() => termsAndConditionsStore.error)

// Computed property for filtered terms and conditions
const filteredTermsAndConditions = computed(() => {
  const data = termsAndConditions.value
  
  if (!data || !Array.isArray(data) || data.length === 0) {
    return []
  }
  
  if (!searchFilter.value.trim()) {
    return data
  }

  const searchTerm = searchFilter.value.toLowerCase().trim()
  
  return data.filter(tc => {
    const searchableFields = [
      tc.name || '',
      tc.content ? tc.content.replace(/<[^>]*>/g, '') : '',
      tc.isActive ? 'active' : 'inactive'
    ]

    return searchableFields.some(field => 
      field.toLowerCase().includes(searchTerm)
    )
  })
})

// Methods
const openAddModal = () => {
  isEditing.value = false
  selectedTermsAndCondition.value = null
  resetForm()
  formState.corporation_uuid = corporationStore.selectedCorporation?.uuid || ''
  showModal.value = true
}

const openEditModal = (tc: TermsAndCondition) => {
  isEditing.value = true
  selectedTermsAndCondition.value = tc
  formState.name = tc.name
  formState.content = tc.content || ''
  formState.isActive = tc.isActive ? 'Active' : 'Inactive'
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  resetForm()
}

const resetForm = () => {
  formState.name = ''
  formState.content = ''
  formState.isActive = 'Active'
  formState.corporation_uuid = ''
}

const handleSubmit = async () => {
  submitting.value = true
  
  try {
    const formData = {
      name: formState.name,
      content: formState.content,
      isActive: formState.isActive === 'Active'
    }
    
    let result = null;
    if (isEditing.value && selectedTermsAndCondition.value && selectedTermsAndCondition.value.id !== undefined) {
      result = await termsAndConditionsStore.updateTermsAndCondition(
        String(selectedTermsAndCondition.value.id),
        formData
      )
    } else {
      result = await termsAndConditionsStore.createTermsAndCondition(formData)
    }
    
    if (result) {
      showModal.value = false
      resetForm()
      await termsAndConditionsStore.fetchTermsAndConditions(true) // Force refresh after save
    }
  } catch (error: any) {
    console.error('Error saving terms and conditions:', error)
  } finally {
    submitting.value = false
  }
}

const viewTermsAndCondition = (tc: TermsAndCondition) => {
  previewTermsAndCondition.value = tc
  showPreviewModal.value = true
}

const confirmDelete = (tc: TermsAndCondition) => {
  selectedTermsAndCondition.value = tc
  showDeleteModal.value = true
}

const handleDelete = async () => {
  if (!selectedTermsAndCondition.value || selectedTermsAndCondition.value.id === undefined) return
  
  deleting.value = true
  try {
    await termsAndConditionsStore.deleteTermsAndCondition(String(selectedTermsAndCondition.value.id))
    showDeleteModal.value = false
    selectedTermsAndCondition.value = null
    await termsAndConditionsStore.fetchTermsAndConditions(true) // Force refresh after delete
  } catch (error: any) {
    console.error('Error deleting terms and conditions:', error)
  } finally {
    deleting.value = false
  }
}

// Load data on mount - force refresh to ensure we get latest data
onMounted(async () => {
  await termsAndConditionsStore.fetchTermsAndConditions(true) // Force refresh
  formState.corporation_uuid = corporationStore.selectedCorporation?.uuid || ''
})
</script>
