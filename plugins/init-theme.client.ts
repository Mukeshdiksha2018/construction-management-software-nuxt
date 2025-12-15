export default defineNuxtPlugin({
  name: 'init-theme',
  enforce: 'pre', // Run before other plugins
  setup() {
    if (process.server) return;

    // Define brand colors immediately before Nuxt UI loads
    const root = document.documentElement;
    
    const brandColors = {
      '--color-brand-50': '#f0f4f8',
      '--color-brand-100': '#d9e3ed',
      '--color-brand-200': '#b8c9db',
      '--color-brand-300': '#8fa5c2',
      '--color-brand-400': '#6b85a8',
      '--color-brand-500': '#5a7294',
      '--color-brand-600': '#3D5C7C',
      '--color-brand-700': '#324d6a',
      '--color-brand-800': '#2a4058',
      '--color-brand-900': '#25364a',
      '--color-brand-950': '#1a2532',
    };

    // Set brand colors immediately
    Object.entries(brandColors).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Also set primary colors to brand (for Nuxt UI)
    Object.entries(brandColors).forEach(([key, value]) => {
      const primaryKey = key.replace('--color-brand-', '--color-primary-');
      root.style.setProperty(primaryKey, value);
    });
    root.style.setProperty('--color-primary', '#3D5C7C');

    // Override indigo with brand (in case Nuxt UI tries to use indigo)
    Object.entries(brandColors).forEach(([key, value]) => {
      const indigoKey = key.replace('--color-brand-', '--color-indigo-');
      root.style.setProperty(indigoKey, value);
    });

    // Set Nuxt UI's internal color variables directly
    // These are what Nuxt UI uses for --ui-primary, --ui-secondary, etc.
    root.style.setProperty('--ui-color-primary-50', '#f0f4f8');
    root.style.setProperty('--ui-color-primary-100', '#d9e3ed');
    root.style.setProperty('--ui-color-primary-200', '#b8c9db');
    root.style.setProperty('--ui-color-primary-300', '#8fa5c2');
    root.style.setProperty('--ui-color-primary-400', '#6b85a8');
    root.style.setProperty('--ui-color-primary-500', '#5a7294');
    root.style.setProperty('--ui-color-primary-600', '#3D5C7C');
    root.style.setProperty('--ui-color-primary-700', '#324d6a');
    root.style.setProperty('--ui-color-primary-800', '#2a4058');
    root.style.setProperty('--ui-color-primary-900', '#25364a');
    root.style.setProperty('--ui-color-primary-950', '#1a2532');

    // Set the main UI variables that Nuxt UI uses
    root.style.setProperty('--ui-primary', '#3D5C7C');
    root.style.setProperty('--ui-secondary', 'var(--ui-color-secondary-500)');
    root.style.setProperty('--ui-info', 'var(--ui-color-info-500)');
    root.style.setProperty('--ui-success', 'var(--ui-color-success-500)');
    root.style.setProperty('--ui-warning', 'var(--ui-color-warning-500)');
    root.style.setProperty('--ui-error', 'var(--ui-color-error-500)');
  }
});

