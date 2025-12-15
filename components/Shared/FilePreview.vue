<template>
  <div class="h-full flex flex-col">
    <!-- No Attachments Message -->
    <div v-if="!attachment" class="flex-1 flex flex-col items-center justify-center text-muted p-6">
      <UIcon name="i-heroicons-document" class="w-16 h-16 text-muted mb-4" />
      <p class="text-sm font-medium text-muted">No attachment available</p>
      <p class="text-xs text-muted">No file to preview</p>
    </div>

    <div v-else class="h-full flex flex-col">
      <!-- File Header -->
      <div class="flex items-center justify-between p-3 bg-elevated border-b border-default flex-shrink-0">
        <div class="flex items-center space-x-2 min-w-0 flex-1">
          <UIcon :name="getFileIcon(attachment.file_type || attachment.type || '')" class="w-4 h-4 text-muted flex-shrink-0" />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-default truncate">{{ attachment.file_name || attachment.name }}</p>
            <p class="text-xs text-muted">{{ formatFileSize(attachment.file_size || attachment.size || 0) }}</p>
          </div>
        </div>
        <UButton
          icon="i-heroicons-arrow-down-tray"
          size="sm"
          variant="soft"
          color="neutral"
          class="flex-shrink-0 ml-2"
          @click="downloadFile(attachment)"
        >
          Download
        </UButton>
      </div>

      <!-- PDF Preview - Full Height with internal scrolling -->
      <div v-if="isPdfFile(attachment.file_type || attachment.type || '')" class="flex-1 overflow-hidden relative">
        <div v-if="!getFilePreviewUrl(attachment)" class="flex-1 flex flex-col items-center justify-center text-muted p-6">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-16 h-16 text-muted mb-4" />
          <p class="text-sm text-center text-muted">File preview not available</p>
          <p class="text-xs text-muted text-center">The file URL is invalid or missing</p>
        </div>
        <iframe 
          v-else
          :src="getFilePreviewUrl(attachment) + '#toolbar=0&navpanes=0&scrollbar=1&zoom=fit&view=FitH'" 
          class="w-full h-full border-0 object-contain" 
          frameborder="0"
          style="min-height: 100%; min-width: 100%;"
          @load="onIframeLoad"
          @error="onIframeError"
        />
      </div>

      <!-- Image Preview -->
      <div v-else-if="isImageFile(attachment.file_type || attachment.type || '')" class="flex-1 overflow-hidden relative">
        <div v-if="!getFilePreviewUrl(attachment)" class="flex-1 flex flex-col items-center justify-center text-muted p-6">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-16 h-16 text-muted mb-4" />
          <p class="text-sm text-center text-muted">Image preview not available</p>
          <p class="text-xs text-muted text-center">The image URL is invalid or missing</p>
        </div>
        <div v-else class="h-full w-full flex items-center justify-center p-2">
          <img 
            :src="getFilePreviewUrl(attachment)" 
            :alt="attachment.file_name || attachment.name"
            class="max-w-full max-h-full object-contain rounded shadow-sm"
            @load="onIframeLoad"
            @error="onIframeError"
          />
        </div>
      </div>

      <!-- Non-PDF/Image Preview -->
      <div v-else class="flex-1 flex flex-col items-center justify-center text-muted p-6">
        <UIcon name="i-heroicons-document" class="w-16 h-16 text-muted mb-4" />
        <p class="text-sm text-center text-muted">Preview not available for this file type</p>
        <UButton 
          color="primary" 
          variant="soft" 
          size="sm"
          @click="downloadFile(attachment)"
          class="mt-2"
        >
          Download File
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFilePreview } from '@/composables/useFilePreview'

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
  attachment: Attachment | null
}

const props = defineProps<Props>()

// File preview functionality
const {
  isPdfFile,
  isImageFile,
  getFileIcon,
  formatFileSize,
  getFilePreviewUrl,
  downloadFile,
  onIframeLoad,
  onIframeError
} = useFilePreview({
  allowedTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  maxSize: 10 * 1024 * 1024 // 10MB
})
</script>
