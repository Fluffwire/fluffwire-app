<script setup lang="ts">
import { ref } from 'vue'
import { requestReset } from '@/services/passwordResetApi'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, CheckCircle } from 'lucide-vue-next'

const email = ref('')
const loading = ref(false)
const submitted = ref(false)
const error = ref('')

async function handleSubmit() {
  if (!email.value) {
    error.value = 'Please enter your email address'
    return
  }

  loading.value = true
  error.value = ''

  try {
    await requestReset(email.value)
    submitted.value = true
  } catch (err: any) {
    // Even on error, show success (to prevent email enumeration)
    submitted.value = true
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Card class="border-border/50 shadow-lg">
    <CardHeader class="text-center">
      <div class="inline-block bg-primary/20 rounded-full p-3 mb-4">
        <Mail :size="32" class="text-primary" />
      </div>
      <h1 class="text-2xl font-bold text-foreground">Forgot Password?</h1>
      <p class="mt-2 text-muted-foreground">
        Enter your email and we'll send you a link to reset your password.
      </p>
    </CardHeader>

    <CardContent>
      <!-- Success Message -->
      <div v-if="submitted" class="text-center space-y-4">
        <div class="bg-green-500/20 rounded-full p-4 inline-block">
          <CheckCircle :size="48" class="text-green-500" />
        </div>
        <h2 class="text-xl font-semibold text-foreground">Check Your Email</h2>
        <p class="text-muted-foreground">
          If an account exists with that email, we've sent a password reset link.
        </p>
        <router-link
          to="/login"
          class="text-primary hover:underline inline-block"
        >
          Return to Login
        </router-link>
      </div>

      <!-- Form -->
      <form v-else @submit.prevent="handleSubmit" class="space-y-5">
        <div class="space-y-2">
          <Label for="email">Email Address</Label>
          <Input
            id="email"
            v-model="email"
            type="email"
            placeholder="you@example.com"
            required
            :disabled="loading"
          />
        </div>

        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

        <Button
          type="submit"
          class="w-full"
          :disabled="loading"
        >
          <span v-if="loading">Sending...</span>
          <span v-else>Send Reset Link</span>
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
