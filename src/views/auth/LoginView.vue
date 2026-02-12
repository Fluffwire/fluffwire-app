<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseButton from '@/components/common/BaseButton.vue'

const { login, isLoading, error } = useAuth()

const email = ref('')
const password = ref('')

async function handleSubmit() {
  await login({ email: email.value, password: password.value })
}
</script>

<template>
  <div class="rounded-md bg-channel-bg p-8 shadow-lg">
    <div class="mb-6 text-center">
      <h1 class="text-2xl font-bold text-text-primary">Welcome back!</h1>
      <p class="mt-1 text-text-secondary">We're so excited to see you again!</p>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-5">
      <div v-if="error" class="rounded bg-danger/10 p-3 text-sm text-danger">
        {{ error }}
      </div>

      <BaseInput
        v-model="email"
        label="Email"
        type="email"
        required
        autocomplete="email"
      />

      <BaseInput
        v-model="password"
        label="Password"
        type="password"
        required
        autocomplete="current-password"
      />

      <BaseButton type="submit" :loading="isLoading" class="w-full">
        Log In
      </BaseButton>

      <p class="text-sm text-text-secondary">
        Need an account?
        <RouterLink to="/register" class="text-blurple hover:underline">
          Register
        </RouterLink>
      </p>
    </form>
  </div>
</template>
