<template>
  <div>
    <NoCorporationAccess />
  </div>
</template>

<script setup>
// Set page meta
definePageMeta({
  title: "No Corporation Access",
  layout: "default",
  middleware: ["auth"] // Ensure user is authenticated
});
</script>
