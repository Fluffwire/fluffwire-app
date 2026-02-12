import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/styles/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Initialize theme before anything renders
import { useTheme } from './composables/useTheme'
const { initTheme } = useTheme()
initTheme()

// Initialize auth state before mounting
import { useAuthStore } from './stores/auth'
const authStore = useAuthStore()
authStore.initialize().finally(() => {
  app.mount('#app')
})
