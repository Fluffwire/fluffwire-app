import type { Router } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

export function setupGuards(router: Router): void {
  router.beforeEach((to, _from, next) => {
    const authStore = useAuthStore()
    const requiresAuth = to.meta.requiresAuth !== false

    if (requiresAuth && !authStore.isAuthenticated) {
      next({ name: 'Login', query: { redirect: to.fullPath } })
    } else if (
      (to.name === 'Login' || to.name === 'Register') &&
      authStore.isAuthenticated
    ) {
      next({ name: 'Home' })
    } else {
      next()
    }
  })
}
