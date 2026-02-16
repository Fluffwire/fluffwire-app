import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import i18n, { loadLocale } from './i18n'
import './assets/styles/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)

// Load saved locale
const savedLocale = localStorage.getItem('fluffwire-locale')
if (savedLocale && savedLocale !== 'en') {
  loadLocale(savedLocale)
}

// Initialize theme before anything renders
import { useTheme } from './composables/useTheme'
const { initTheme } = useTheme()
initTheme()

// Initialize auth state before mounting
import { useAuthStore } from './stores/auth'
const authStore = useAuthStore()
authStore.initialize().finally(() => {
  app.mount('#app')

  // Check for updates on app start (Tauri only, if auto-update enabled)
  import('./utils/platform').then(({ isTauri }) => {
    if (!isTauri) return

    const autoUpdateEnabled = localStorage.getItem('fluffwire-auto-update')
    if (autoUpdateEnabled !== 'false') { // Default to true if not set
      import('./services/updater').then(({ checkForUpdates }) => {
        checkForUpdates().catch(err => {
          console.warn('Failed to check for updates:', err)
        })
      })
    }
  })
})
