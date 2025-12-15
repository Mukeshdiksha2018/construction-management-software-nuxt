import { ref, computed, watch } from 'vue'

export const useDarkMode = () => {
  // Reactive state for dark mode
  const isDark = ref(false)

  // Computed property for theme class
  const themeClass = computed(() => isDark.value ? 'dark' : 'light')

  // Initialize dark mode from localStorage or system preference
  const initializeTheme = () => {
    if (process.client) {
      // Check localStorage first
      const savedTheme = localStorage.getItem('theme')
      
      if (savedTheme) {
        isDark.value = savedTheme === 'dark'
      } else {
        // Fall back to system preference
        isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
      }
      
      // Apply theme to document
      applyTheme()
    }
  }

  // Apply theme to document
  const applyTheme = () => {
    if (process.client) {
      const html = document.documentElement
      
      if (isDark.value) {
        html.classList.add('dark')
        html.classList.remove('light')
      } else {
        html.classList.add('light')
        html.classList.remove('dark')
      }
    }
  }

  // Toggle dark mode
  const toggleDarkMode = () => {
    isDark.value = !isDark.value
    applyTheme()
    
    // Save to localStorage
    if (process.client) {
      localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
    }
  }

  // Set specific theme
  const setTheme = (theme: 'light' | 'dark') => {
    isDark.value = theme === 'dark'
    applyTheme()
    
    if (process.client) {
      localStorage.setItem('theme', theme)
    }
  }

  // Watch for system theme changes
  const watchSystemTheme = () => {
    if (process.client) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      
      const handleChange = (e: MediaQueryListEvent) => {
        // Only update if no saved preference
        if (!localStorage.getItem('theme')) {
          isDark.value = e.matches
          applyTheme()
        }
      }
      
      mediaQuery.addEventListener('change', handleChange)
      
      // Return cleanup function
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }

  // Watch for changes and apply theme
  watch(isDark, () => {
    applyTheme()
  })

  return {
    isDark: readonly(isDark),
    themeClass,
    toggleDarkMode,
    setTheme,
    initializeTheme,
    watchSystemTheme
  }
}
