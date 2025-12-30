export default defineNuxtPlugin({
  name: 'init-theme',
  enforce: 'pre', // Run before other plugins
  setup() {
    if (process.server) return;

    // Set primary colors to use indigo theme
    const root = document.documentElement;

    // Map primary colors to standard indigo colors
    root.style.setProperty('--color-primary-50', '#eef2ff');
    root.style.setProperty('--color-primary-100', '#e0e7ff');
    root.style.setProperty('--color-primary-200', '#c7d2fe');
    root.style.setProperty('--color-primary-300', '#a5b4fc');
    root.style.setProperty('--color-primary-400', '#818cf8');
    root.style.setProperty('--color-primary-500', '#6366f1');
    root.style.setProperty('--color-primary-600', '#4f46e5');
    root.style.setProperty('--color-primary-700', '#4338ca');
    root.style.setProperty('--color-primary-800', '#3730a3');
    root.style.setProperty('--color-primary-900', '#312e81');
    root.style.setProperty('--color-primary-950', '#1e1b4b');
    root.style.setProperty('--color-primary', '#4f46e5');

    // Set Nuxt UI's internal color variables to use indigo
    root.style.setProperty('--ui-color-primary-50', '#eef2ff');
    root.style.setProperty('--ui-color-primary-100', '#e0e7ff');
    root.style.setProperty('--ui-color-primary-200', '#c7d2fe');
    root.style.setProperty('--ui-color-primary-300', '#a5b4fc');
    root.style.setProperty('--ui-color-primary-400', '#818cf8');
    root.style.setProperty('--ui-color-primary-500', '#6366f1');
    root.style.setProperty('--ui-color-primary-600', '#4f46e5');
    root.style.setProperty('--ui-color-primary-700', '#4338ca');
    root.style.setProperty('--ui-color-primary-800', '#3730a3');
    root.style.setProperty('--ui-color-primary-900', '#312e81');
    root.style.setProperty('--ui-color-primary-950', '#1e1b4b');

    // Set the main UI variables that Nuxt UI uses
    root.style.setProperty('--ui-primary', '#4f46e5');
    root.style.setProperty('--ui-secondary', 'var(--ui-color-secondary-500)');
    root.style.setProperty('--ui-info', 'var(--ui-color-info-500)');
    root.style.setProperty('--ui-success', 'var(--ui-color-success-500)');
    root.style.setProperty('--ui-warning', 'var(--ui-color-warning-500)');
    root.style.setProperty('--ui-error', 'var(--ui-color-error-500)');
  }
});

