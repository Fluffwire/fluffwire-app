import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import type { LoginCredentials, RegisterCredentials } from '@/types'

export function useAuth() {
  const authStore = useAuthStore()
  const router = useRouter()

  async function login(credentials: LoginCredentials) {
    await authStore.login(credentials)
    const redirect = router.currentRoute.value.query.redirect as string
    router.push(redirect || '/channels/@me')
  }

  async function register(credentials: RegisterCredentials) {
    await authStore.register(credentials)
    router.push('/channels/@me')
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
