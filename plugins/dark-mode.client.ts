export default defineNuxtPlugin(() => {
  // Initialize dark mode on app startup
  const initializeDarkMode = () => {
    // Check localStorage for saved theme preference
    const savedTheme = localStorage.getItem('theme')
    
    if (savedTheme) {
      // Apply saved theme
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark')
        document.documentElement.classList.remove('light')
      } else {
        document.documentElement.classList.add('light')
        document.documentElement.classList.remove('dark')
      }
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      
      if (prefersDark) {
        document.documentElement.classList.add('dark')
        document.documentElement.classList.remove('light')
        localStorage.setItem('theme', 'dark')
      } else {
        document.documentElement.classList.add('light')
        document.documentElement.classList.remove('dark')
        localStorage.setItem('theme', 'light')
      }
    }
  }

  // Initialize on client side
  if (process.client) {
    initializeDarkMode();

    // Watch for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      // Only update if no saved preference
      if (!localStorage.getItem("theme")) {
        if (e.matches) {
          document.documentElement.classList.add("dark");
          document.documentElement.classList.remove("light");
        } else {
          document.documentElement.classList.add("light");
          document.documentElement.classList.remove("dark");
        }
      }
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    // Cleanup on page unload (plugins don't have component lifecycle)
    const cleanup = () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };

    // Add cleanup listeners
    window.addEventListener("beforeunload", cleanup);
    window.addEventListener("unload", cleanup);
  }
})
