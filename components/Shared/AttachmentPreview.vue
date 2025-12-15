<template>
  <UModal 
    v-model:open="isOpen" 
    :title="title"
    :description="description"
    :size="size"
    :ui="{ body: 'p-0 overflow-hidden' }"
  >
    <template #body>
      <div class="h-[70vh]">
        <FilePreview :attachment="attachment" />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-between flex-wrap gap-2">
        <UButton color="neutral" variant="soft" @click="close">
          Close
        </UButton>
        <div class="flex gap-2">
          <UButton 
            v-if="showEditButton"
            color="primary" 
            variant="soft"
            @click="edit"
          >
            Edit
          </UButton>
          <UButton 
            v-if="showDeleteButton"
            color="error" 
            variant="soft"
            @click="deleteItem"
          >
            Delete
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import FilePreview from './FilePreview.vue'

interface Attachment {
  id?: string
  file_name?: string
  name?: string
  file_type?: string
  type?: string
  file_size?: number
  size?: number
  file_url?: string
  url?: string
}

interface Props {
  open: boolean
  attachment: Attachment | null
  title?: string
  description?: string
  size?: string
  showEditButton?: boolean
  showDeleteButton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Attachment Preview',
  description: 'View file attachment',
  size: '7xl',
  showEditButton: false,
  showDeleteButton: false
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'edit': []
  'delete': []
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const close = () => {
  isOpen.value = false
}

const edit = () => {
  emit('edit')
  close()
}

const deleteItem = () => {
  emit('delete')
  close()
}
</script>
