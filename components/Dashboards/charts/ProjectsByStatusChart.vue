<template>
  <div class="w-full">
    <div class="h-64">
      <canvas ref="chartRef"></canvas>
    </div>

    <!-- Custom Legend -->
    <div class="flex flex-wrap justify-center gap-4 mt-4">
      <div
        v-for="status in statusLabels"
        :key="status.key"
        class="flex items-center space-x-2"
      >
        <div
          class="w-3 h-3 rounded-full"
          :style="{ backgroundColor: status.color }"
        ></div>
        <span class="text-sm text-gray-700 dark:text-gray-300">
          {{ status.label }} ({{ status.count }})
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { Chart, registerables } from 'chart.js'
import { useProjectsStore } from '@/stores/projects'
import { useCorporationStore } from '@/stores/corporations'
import { useDarkMode } from '@/composables/useDarkMode'

Chart.register(...registerables)

const projectsStore = useProjectsStore()
const corporationStore = useCorporationStore()
const { isDark } = useDarkMode()

const chartRef = ref(null)
let chart = null

// Status colors mapping
const statusColors = {
  Pending: 'rgb(255, 205, 86)',
  "In Progress": 'rgb(34, 197, 94)',
  "On Hold": 'rgb(255, 99, 132)',
  Completed: 'rgb(61, 92, 124)' // Brand color #3D5C7C
}

// Get theme-aware colors that match the exact Tailwind classes used in other dashboard components
const themeColors = computed(() => {
  const isDarkMode = document.documentElement.classList.contains('dark')

  // Use the exact same color values as Tailwind classes used in other components
  return {
    // Primary text: matches text-gray-900 dark:text-gray-100 used in PendingApprovalsList.vue
    primaryText: isDarkMode ? '#f3f4f6' : '#111827', // gray-100 (light) : gray-900 (dark)
    // Secondary text: matches text-gray-500 dark:text-gray-400 used in PendingApprovalsList.vue
    secondaryText: isDarkMode ? '#9ca3af' : '#6b7280', // gray-400 (medium) : gray-500 (medium-dark)
    // Tooltip background - dark enough to contrast with light text
    tooltipBg: isDarkMode ? 'rgba(31, 41, 55, 0.95)' : 'rgba(17, 24, 39, 0.95)', // gray-800 : gray-900
    tooltipBorder: isDarkMode ? 'rgba(75, 85, 99, 0.4)' : 'rgba(107, 114, 128, 0.3)' // gray-600 : gray-500
  }
})

const getStatusColor = (status) => {
  return statusColors[status] || statusColors.Pending
}

const chartData = computed(() => {
  const statusCounts = projectsStore.getProjectCountByStatus() || {}

  return {
    labels: Object.keys(statusCounts),
    datasets: [
      {
        label: 'Projects by Status',
        data: Object.values(statusCounts),
        backgroundColor: Object.keys(statusCounts).map(status => getStatusColor(status)),
        hoverOffset: 4
      }
    ]
  }
})

const statusLabels = computed(() => {
  const statusCounts = projectsStore.getProjectCountByStatus() || {}

  return Object.entries(statusCounts).map(([status, count]) => ({
    key: status,
    label: status,
    count: Number(count),
    color: getStatusColor(status)
  }))
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false // Disable default legend, using custom labels instead
    },
    tooltip: {
      backgroundColor: themeColors.value.tooltipBg,
      titleColor: themeColors.value.primaryText,
      bodyColor: themeColors.value.secondaryText,
      borderColor: themeColors.value.tooltipBorder,
      borderWidth: 1,
      cornerRadius: 8,
      displayColors: true,
      callbacks: {
        label: function(context) {
          const label = context.label || ''
          const value = context.parsed || 0
          const total = context.dataset.data.reduce((a, b) => a + b, 0)
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0'
          return `${label}: ${value} (${percentage}%)`
        }
      }
    }
  }
}))

onMounted(() => {
  if (chartRef.value) {
    chart = new Chart(chartRef.value, {
      type: 'pie',
      data: chartData.value,
      options: chartOptions.value
    })
  }
})

// Watch for data changes and update chart
watch(chartData, () => {
  if (chart) {
    chart.data = chartData.value
    chart.update()
  }
}, { deep: true })

// Watch for theme changes and update chart options
watch(themeColors, () => {
  if (chart) {
    chart.options = chartOptions.value
    chart.update()
  }
}, { deep: true })

// Also watch for DOM changes that might indicate theme switching
watch(() => document.documentElement.classList.contains('dark'), () => {
  if (chart) {
    // Small delay to ensure theme transition is complete
    setTimeout(() => {
      chart.options = chartOptions.value
      chart.update()
    }, 50)
  }
})

onUnmounted(() => {
  if (chart) {
    chart.destroy()
  }
})
</script>
