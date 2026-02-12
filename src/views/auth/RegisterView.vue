<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import BaseInput from '@/components/common/BaseInput.vue'
import BaseButton from '@/components/common/BaseButton.vue'

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
  <div class="rounded-md bg-channel-bg p-8 shadow-lg">
    <div class="mb-6 text-center">
      <h1 class="text-2xl font-bold text-text-primary">Create an account</h1>
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
        v-model="username"
        label="Username"
        type="text"
        required
        autocomplete="username"
      />

      <BaseInput
        v-model="password"
        label="Password"
        type="password"
        required
        autocomplete="new-password"
      />

      <BaseButton type="submit" :loading="isLoading" class="w-full">
        Register
      </BaseButton>

      <p class="text-sm text-text-secondary">
        Already have an account?
        <RouterLink to="/login" class="text-blurple hover:underline">
          Log In
        </RouterLink>
      </p>
    </form>
  </div>
</template>
