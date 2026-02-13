import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import type { LoginCredentials, RegisterCredentials } from '@/types'

export function useAuth() {
  const authStore = useAuthStore()
  const router = useRouter()

  async function login(credentials: LoginCredentials, rememberMe = true) {
    try {
      await authStore.login(credentials, rememberMe)
      const redirect = router.currentRoute.value.query.redirect as string
      router.push(redirect || '/channels/@me')
    } catch {
      // Store already sets error.value
    }
  }

  async function register(credentials: RegisterCredentials, rememberMe = true) {
    try {
      await authStore.register(credentials, rememberMe)
      router.push('/channels/@me')
    } catch {
      // Store already sets error.value
    }
  }

  function logout() {
    authStore.logout()
    router.push('/login')
  }

  return {
    user: authStore.user,
    isAuthenticated: authStore.isAuthenticated,
    isLoading: authStore.isLoading,
    error: authStore.error,
    login,
    register,
    logout,
  }
}
