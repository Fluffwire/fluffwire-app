<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-vue-next'

const { register, isLoading, error } = useAuth()

const email = ref('')
const username = ref('')
const password = ref('')
const rememberMe = ref(true)

async function handleSubmit() {
  await register({
    email: email.value,
    username: username.value,
    password: password.value,
  }, rememberMe.value)
}
</script>

<template>
  <Card class="border-border/50 shadow-lg">
    <CardHeader class="text-center">
      <h1 class="text-2xl font-bold text-foreground">{{ $t('auth.createAccount') }}</h1>
    </CardHeader>

    <CardContent>
      <form @submit.prevent="handleSubmit" class="space-y-5">
        <div v-if="error" class="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {{ error }}
        </div>

        <div class="space-y-2">
          <Label for="reg-email">{{ $t('auth.email') }}</Label>
          <Input
            id="reg-email"
            v-model="email"
            type="email"
            required
            autocomplete="email"
          />
        </div>

        <div class="space-y-2">
          <Label for="reg-username">{{ $t('auth.username') }}</Label>
          <Input
            id="reg-username"
            v-model="username"
            type="text"
            required
            autocomplete="username"
          />
        </div>

        <div class="space-y-2">
          <Label for="reg-password">{{ $t('auth.password') }}</Label>
          <Input
            id="reg-password"
            v-model="password"
            type="password"
            required
            autocomplete="new-password"
          />
        </div>

        <div class="flex items-center gap-2">
          <Checkbox id="reg-remember-me" :checked="rememberMe" @update:checked="rememberMe = $event" />
          <Label for="reg-remember-me" class="cursor-pointer text-sm text-muted-foreground">{{ $t('auth.rememberMe') }}</Label>
        </div>

        <Button type="submit" :disabled="isLoading" class="w-full">
          <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
          {{ $t('auth.register') }}
        </Button>

        <p class="text-sm text-muted-foreground">
          {{ $t('auth.haveAccount') }}
          <RouterLink to="/login" class="text-primary hover:underline">
            {{ $t('auth.logIn') }}
          </RouterLink>
        </p>
      </form>
    </CardContent>
  </Card>
</template>
