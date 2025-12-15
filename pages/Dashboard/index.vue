<template>
  <div>
    <CorporationDashboard />
  </div>
</template>

<script setup>
import { useAuthStore } from "@/stores/auth";
import CorporationDashboard from "~/components/Dashboards/CorporationDashboard.vue"


const authStore = useAuthStore();
// Use the definePageMeta function to set the layout for this page
definePageMeta({
  layout: "main-layout",
  middleware: "auth",
});
</script>
