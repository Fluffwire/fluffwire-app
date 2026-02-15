<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { verifyEmail } from '@/services/emailApi'
import { useAuthStore } from '@/stores/auth'
import { CheckCircle, XCircle, Loader2 } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const loading = ref(true)
const success = ref(false)
const error = ref('')

onMounted(async () => {
  const token = route.params.token as string

  if (!token) {
    error.value = 'Invalid verification link'
    loading.value = false
    return
  }

  try {
    await verifyEmail(token)
    success.value = true

    // Refresh user data to update emailVerified status
    if (authStore.isAuthenticated) {
      await authStore.loadUser()
    }

    // Redirect to app after 2 seconds
    setTimeout(() => {
      router.push('/channels/@me')
    }, 2000)
  } catch (err: any) {
    if (err.response?.data?.error) {
      error.value = err.response.data.error
    } else {
      error.value = 'Failed to verify email. The link may be invalid or expired.'
    }
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-900 px-4">
    <div class="max-w-md w-full bg-gray-800 rounded-lg p-8 text-center">
      <!-- Loading State -->
      <div v-if="loading" class="flex flex-col items-center gap-4">
        <Loader2 :size="48" class="text-indigo-500 animate-spin" />
        <p class="text-gray-300">Verifying your email...</p>
      </div>

      <!-- Success State -->
      <div v-else-if="success" class="flex flex-col items-center gap-4">
        <div class="bg-green-500/20 rounded-full p-4">
          <CheckCircle :size="48" class="text-green-500" />
        </div>
        <h1 class="text-2xl font-bold text-white">Email Verified!</h1>
        <p class="text-gray-300">Your email has been successfully verified.</p>
        <p class="text-sm text-gray-400">Redirecting you to the app...</p>
      </div>

      <!-- Error State -->
      <div v-else class="flex flex-col items-center gap-4">
        <div class="bg-red-500/20 rounded-full p-4">
          <XCircle :size="48" class="text-red-500" />
        </div>
        <h1 class="text-2xl font-bold text-white">Verification Failed</h1>
        <p class="text-gray-300">{{ error }}</p>
        <router-link
          to="/login"
          class="mt-4 text-indigo-400 hover:text-indigo-300"
        >
          Return to Login
        </router-link>
      </div>
    </div>
  </div>
</template>
