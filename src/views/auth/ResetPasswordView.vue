<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { verifyToken, resetPassword } from '@/services/passwordResetApi'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, CheckCircle, XCircle, Loader2 } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const token = ref('')
const password = ref('')
const confirmPassword = ref('')

const loading = ref(true)
const submitting = ref(false)
const tokenValid = ref(false)
const success = ref(false)
const error = ref('')

onMounted(async () => {
  token.value = route.params.token as string

  if (!token.value) {
    error.value = 'Invalid reset link'
    loading.value = false
    return
  }

  // Verify token is valid
  const valid = await verifyToken(token.value)
  tokenValid.value = valid

  if (!valid) {
    error.value = 'This reset link is invalid or has expired.'
  }

  loading.value = false
})

async function handleSubmit() {
  error.value = ''

  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters'
    return
  }

  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }

  submitting.value = true

  try {
    await resetPassword(token.value, password.value)
    success.value = true

    // Redirect to login after 2 seconds
    setTimeout(() => {
      router.push('/login')
    }, 2000)
  } catch (err: any) {
    if (err.response?.data?.error) {
      error.value = err.response.data.error
    } else {
      error.value = 'Failed to reset password. Please try again.'
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Card class="border-border/50 shadow-lg">
    <CardHeader class="text-center">
      <div v-if="!loading && !success && tokenValid" class="inline-block bg-primary/20 rounded-full p-3 mb-4">
        <Lock :size="32" class="text-primary" />
      </div>
      <h1 v-if="!loading && !success && tokenValid" class="text-2xl font-bold text-foreground">Reset Password</h1>
      <p v-if="!loading && !success && tokenValid" class="mt-2 text-muted-foreground">
        Enter your new password below.
      </p>
    </CardHeader>

    <CardContent>
      <!-- Loading State -->
      <div v-if="loading" class="flex flex-col items-center gap-4 py-8">
        <Loader2 :size="48" class="text-primary animate-spin" />
        <p class="text-muted-foreground">Verifying reset link...</p>
      </div>

      <!-- Success State -->
      <div v-else-if="success" class="text-center space-y-4 py-8">
        <div class="bg-green-500/20 rounded-full p-4 inline-block">
          <CheckCircle :size="48" class="text-green-500" />
        </div>
        <h2 class="text-2xl font-bold text-foreground">Password Reset!</h2>
        <p class="text-muted-foreground">Your password has been successfully reset.</p>
        <p class="text-sm text-muted-foreground">Redirecting you to login...</p>
      </div>

      <!-- Invalid Token -->
      <div v-else-if="!tokenValid" class="text-center space-y-4 py-8">
        <div class="bg-destructive/20 rounded-full p-4 inline-block">
          <XCircle :size="48" class="text-destructive" />
        </div>
        <h2 class="text-2xl font-bold text-foreground">Invalid Link</h2>
        <p class="text-muted-foreground">{{ error }}</p>
        <router-link
          to="/forgot-password"
          class="text-primary hover:underline inline-block"
        >
          Request a New Link
        </router-link>
      </div>

      <!-- Reset Form -->
      <form v-else @submit.prevent="handleSubmit" class="space-y-5">
        <div class="space-y-2">
          <Label for="password">New Password</Label>
          <Input
            id="password"
            v-model="password"
            type="password"
            placeholder="••••••••"
            required
            :disabled="submitting"
          />
          <p class="text-xs text-muted-foreground">Must be at least 8 characters</p>
        </div>

        <div class="space-y-2">
          <Label for="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            placeholder="••••••••"
            required
            :disabled="submitting"
          />
        </div>

        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

        <Button
          type="submit"
          class="w-full"
          :disabled="submitting"
        >
          <span v-if="submitting">Resetting...</span>
          <span v-else>Reset Password</span>
        </Button>

        <p class="text-sm text-center text-muted-foreground">
          <router-link
            to="/login"
            class="text-primary hover:underline"
          >
            Back to Login
          </router-link>
        </p>
      </form>
    </CardContent>
  </Card>
</template>
