<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAuth } from '@/composables/useAuth'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'

const route = useRoute()
const authStore = useAuthStore()
const { login } = useAuth()

const email = ref('')
const password = ref('')
const rememberMe = ref(true)

const sessionExpired = computed(() => route.query.reason === 'session_expired')

// Show toast when error changes
watch(() => authStore.error, (newError) => {
  if (newError) {
    toast.error(newError, {
      duration: 5000,
    })
  }
})

async function handleSubmit() {
  await login({ email: email.value, password: password.value }, rememberMe.value)
}
</script>

<template>
  <Card class="border-border/50 shadow-lg">
    <CardHeader class="text-center">
      <h1 class="text-2xl font-bold text-foreground">{{ $t('auth.welcomeBack') }}</h1>
      <p class="mt-1 text-muted-foreground">{{ $t('auth.welcomeSubtitle') }}</p>
    </CardHeader>

    <CardContent>
      <form @submit.prevent="handleSubmit" class="space-y-5">
        <div v-if="sessionExpired" class="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-400">
          {{ $t('auth.sessionExpired') }}
        </div>

        <div v-if="authStore.error" class="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {{ authStore.error }}
        </div>

        <div class="space-y-2">
          <Label for="login-email">{{ $t('auth.email') }}</Label>
          <Input
            id="login-email"
            v-model="email"
            type="email"
            required
            autocomplete="email"
          />
        </div>

        <div class="space-y-2">
          <Label for="login-password">{{ $t('auth.password') }}</Label>
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
          <Label for="remember-me" class="cursor-pointer text-sm text-muted-foreground">{{ $t('auth.rememberMe') }}</Label>
        </div>

        <Button type="submit" :disabled="authStore.isLoading" class="w-full">
          <Loader2 v-if="authStore.isLoading" class="mr-2 h-4 w-4 animate-spin" />
          {{ $t('auth.logIn') }}
        </Button>

        <p class="text-sm text-muted-foreground">
          {{ $t('auth.needAccount') }}
          <RouterLink to="/register" class="text-primary hover:underline">
            {{ $t('auth.register') }}
          </RouterLink>
        </p>
      </form>
    </CardContent>
  </Card>
</template>
