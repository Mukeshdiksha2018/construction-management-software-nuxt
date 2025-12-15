/**
 * Simple IndexedDB initialization plugin
 * Dexie.js is installed and ready to use when needed
 */
export default defineNuxtPlugin(() => {
  if (process.client) {
    console.log('✅ Dexie.js is installed and available for IndexedDB operations')
  }
})
