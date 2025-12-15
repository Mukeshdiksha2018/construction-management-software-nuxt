<template>
  <transition name="fade">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
    >
      <div class="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200">
          <slot name="header" />
        </div>

        <!-- Body -->
        <div class="px-6 py-4 max-h-[70vh] overflow-y-auto">
          <slot name="body" />
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-gray-200 text-right">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
defineProps({
  modelValue: Boolean,
});
defineEmits(["update:modelValue"]);
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
