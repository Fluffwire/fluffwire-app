<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ShieldCheck } from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()

const code = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')

async function submit() {
  if (!code.value.trim()) return
  isSubmitting.value = true
  errorMessage.value = ''
  try {
    await authStore.verifyTwoFactor(code.value.trim())
    router.push('/channels/@me')
  } catch {
    errorMessage.value = authStore.error || 'Invalid verification code'
  } finally {
    isSubmitting.value = false
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') submit()
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background p-4">
    <Card class="w-full max-w-sm">
      <CardHeader class="text-center">
        <div class="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <ShieldCheck class="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <CardDescription>
          Enter the 6-digit code from your authenticator app, or use a backup code.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <Input
          v-model="code"
          placeholder="Enter code"
          class="text-center text-lg tracking-widest"
          maxlength="8"
          autofocus
          @keydown="handleKeydown"
        />
        <p v-if="errorMessage" class="text-sm text-destructive">{{ errorMessage }}</p>
        <Button class="w-full" :disabled="isSubmitting || !code.trim()" @click="submit">
          {{ isSubmitting ? 'Verifying...' : 'Verify' }}
        </Button>
        <Button variant="ghost" class="w-full" @click="router.push('/login')">
          Back to Login
        </Button>
      </CardContent>
    </Card>
  </div>
</template>
