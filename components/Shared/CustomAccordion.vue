<template>
  <div class="w-full">
    <div
      v-for="(item, index) in items"
      :key="item.key || index"
      class="border-b border-gray-100 dark:border-gray-700 last:border-b-0"
    >
      <!-- Accordion Header/Trigger -->
      <button
        :id="`accordion-trigger-${item.key || index}`"
        :aria-expanded="openItems.includes(item.key || index)"
        :aria-controls="`accordion-content-${item.key || index}`"
        class="w-full flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none"
        @click="toggleItem(item.key || index)"
      >
        <!-- Custom trigger content slot -->
        <div class="flex-1">
          <slot name="trigger" :item="item" :index="index" :isOpen="openItems.includes(item.key || index)">
            <!-- Default trigger content -->
            <div class="flex items-center gap-2">
              <span class="font-medium text-gray-900 dark:text-gray-100">
                {{ item.label }}
              </span>
            </div>
          </slot>
        </div>
        
      </button>

      <!-- Accordion Content -->
      <div
        v-show="openItems.includes(item.key || index)"
        :id="`accordion-content-${item.key || index}`"
        class="overflow-hidden transition-all duration-200"
        :class="{
          'max-h-0 opacity-0': !openItems.includes(item.key || index),
          'max-h-screen opacity-100': openItems.includes(item.key || index)
        }"
      >
        <div>
          <slot name="content" :item="item" :index="index" :isOpen="openItems.includes(item.key || index)">
            <!-- Default content -->
            <div class="text-sm text-gray-600 dark:text-gray-400">
              {{ item.content }}
            </div>
          </slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

interface AccordionItem {
  key?: string | number
  label?: string
  content?: string
  disabled?: boolean
  [key: string]: any
}

interface Props {
  items: AccordionItem[]
  type?: 'single' | 'multiple'
  collapsible?: boolean
  defaultOpen?: (string | number)[]
  trailingIcon?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'single',
  collapsible: true,
  defaultOpen: () => [],
  trailingIcon: 'i-heroicons-chevron-down'
})

const emit = defineEmits<{
  'update:modelValue': [value: (string | number)[]]
  'item-toggle': [item: AccordionItem, isOpen: boolean]
}>()

const openItems = ref<(string | number)[]>([])

// Initialize with default open items
onMounted(() => {
  if (props.defaultOpen.length > 0) {
    openItems.value = [...props.defaultOpen]
  }
})

const toggleItem = (itemKey: string | number) => {
  const item = props.items.find(i => (i.key || props.items.indexOf(i)) === itemKey)
  
  if (item?.disabled) return

  const isCurrentlyOpen = openItems.value.includes(itemKey)
  
  if (props.type === 'single') {
    if (isCurrentlyOpen && props.collapsible) {
      openItems.value = []
    } else {
      openItems.value = [itemKey]
    }
  } else {
    if (isCurrentlyOpen) {
      openItems.value = openItems.value.filter(key => key !== itemKey)
    } else {
      openItems.value = [...openItems.value, itemKey]
    }
  }

  emit('update:modelValue', openItems.value)
  emit('item-toggle', item!, !isCurrentlyOpen)
}

// Watch for external changes to openItems
watch(() => props.defaultOpen, (newDefaultOpen) => {
  if (newDefaultOpen.length > 0) {
    openItems.value = [...newDefaultOpen]
  }
}, { deep: true })
</script>
