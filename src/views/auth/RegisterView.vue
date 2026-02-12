<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-vue-next'

const { register, isLoading, error } = useAuth()

const email = ref('')
const username = ref('')
const password = ref('')

async function handleSubmit() {
  await register({
    email: email.value,
    username: username.value,
    password: password.value,
  })
}
</script>

<template>
  <Card class="border-border/50 shadow-lg">
    <CardHeader class="text-center">
      <h1 class="text-2xl font-bold text-foreground">Create an account</h1>
    </CardHeader>

    <CardContent>
      <form @submit.prevent="handleSubmit" class="space-y-5">
        <div v-if="error" class="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {{ error }}
        </div>

        <div class="space-y-2">
          <Label for="reg-email">Email</Label>
          <Input
            id="reg-email"
            v-model="email"
            type="email"
            required
            autocomplete="email"
          />
        </div>

        <div class="space-y-2">
          <Label for="reg-username">Username</Label>
          <Input
            id="reg-username"
            v-model="username"
            type="text"
            required
            autocomplete="username"
          />
        </div>

        <div class="space-y-2">
          <Label for="reg-password">Password</Label>
          <Input
            id="reg-password"
            v-model="password"
            type="password"
            required
            autocomplete="new-password"
          />
        </div>

        <Button type="submit" :disabled="isLoading" class="w-full">
          <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
          Register
        </Button>

        <p class="text-sm text-muted-foreground">
          Already have an account?
          <RouterLink to="/login" class="text-primary hover:underline">
            Log In
          </RouterLink>
        </p>
      </form>
    </CardContent>
  </Card>
</template>
