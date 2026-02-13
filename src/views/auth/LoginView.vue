<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-vue-next'

const route = useRoute()
const { login, isLoading, error } = useAuth()

const email = ref('')
const password = ref('')
const rememberMe = ref(true)

const sessionExpired = computed(() => route.query.reason === 'session_expired')

async function handleSubmit() {
  await login({ email: email.value, password: password.value }, rememberMe.value)
}
</script>

<template>
  <Card class="border-border/50 shadow-lg">
    <CardHeader class="text-center">
      <h1 class="text-2xl font-bold text-foreground">Welcome back!</h1>
      <p class="mt-1 text-muted-foreground">We're so excited to see you again!</p>
    </CardHeader>

    <CardContent>
      <form @submit.prevent="handleSubmit" class="space-y-5">
        <div v-if="sessionExpired" class="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-400">
          Your session has expired. Please log in again.
        </div>

        <div v-if="error" class="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {{ error }}
        </div>

        <div class="space-y-2">
          <Label for="login-email">Email</Label>
          <Input
            id="login-email"
            v-model="email"
            type="email"
            required
            autocomplete="email"
          />
        </div>

        <div class="space-y-2">
          <Label for="login-password">Password</Label>
          <Input
            id="login-password"
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
          />
        </div>

        <div class="flex items-center gap-2">
          <Checkbox id="remember-me" :checked="rememberMe" @update:checked="rememberMe = $event" />
          <Label for="remember-me" class="cursor-pointer text-sm text-muted-foreground">Remember me</Label>
        </div>

        <Button type="submit" :disabled="isLoading" class="w-full">
          <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
          Log In
        </Button>

        <p class="text-sm text-muted-foreground">
          Need an account?
          <RouterLink to="/register" class="text-primary hover:underline">
            Register
          </RouterLink>
        </p>
      </form>
    </CardContent>
  </Card>
</template>
