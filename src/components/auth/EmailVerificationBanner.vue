<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { resendVerification } from '@/services/emailApi'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-vue-next'

const authStore = useAuthStore()
const loading = ref(false)
const cooldownSeconds = ref(0)
const message = ref('')

// Cooldown timer
let cooldownInterval: ReturnType<typeof setInterval> | null = null

const canResend = computed(() => cooldownSeconds.value === 0 && !loading.value)

async function handleResend() {
  if (!canResend.value) return

  loading.value = true
  message.value = ''

  try {
    await resendVerification()
    message.value = 'Verification email sent! Please check your inbox.'
    startCooldown(300) // 5 minutes
  } catch (error: any) {
    if (error.response?.status === 429) {
      const errorMsg = error.response?.data?.error || ''
      const match = errorMsg.match(/wait (\d+) seconds/)
      if (match) {
        const seconds = parseInt(match[1])
        startCooldown(seconds)
        message.value = `Please wait before requesting another email.`
      } else {
        message.value = 'Too many requests. Please try again later.'
      }
    } else {
      message.value = 'Failed to send verification email. Please try again.'
    }
  } finally {
    loading.value = false
  }
}

function startCooldown(seconds: number) {
  cooldownSeconds.value = seconds

  if (cooldownInterval) {
    clearInterval(cooldownInterval)
  }

  cooldownInterval = setInterval(() => {
    cooldownSeconds.value--
    if (cooldownSeconds.value <= 0) {
      cooldownSeconds.value = 0
      if (cooldownInterval) {
        clearInterval(cooldownInterval)
        cooldownInterval = null
      }
    }
  }, 1000)
}

function formatCooldown(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins > 0) {
    return `${mins}m ${secs}s`
  }
  return `${secs}s`
}
</script>

<template>
  <div v-if="authStore.user && !authStore.user.emailVerified" class="bg-yellow-600 text-white px-4 py-3">
    <div class="max-w-screen-xl mx-auto flex items-center justify-between gap-4 flex-wrap">
      <div class="flex items-center gap-3">
        <AlertCircle :size="20" />
        <div>
          <p class="font-medium">Email verification required</p>
          <p class="text-sm opacity-90">Please verify your email address to unlock all features.</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <p v-if="message" class="text-sm">{{ message }}</p>

        <Button
          @click="handleResend"
          :disabled="!canResend"
          variant="secondary"
          size="sm"
        >
          <span v-if="loading">Sending...</span>
          <span v-else-if="cooldownSeconds > 0">Wait {{ formatCooldown(cooldownSeconds) }}</span>
          <span v-else>Resend Email</span>
        </Button>
      </div>
    </div>
  </div>
</template>
