<template>
  <div>
    <ReportsAPAgingReport />
  </div>
</template>

<script setup lang="ts">
// Set page title
useHead({
  title: 'AP Aging Report - Property Management'
})

definePageMeta({
  layout: "main-layout",
  middleware: "auth",
});
</script>
