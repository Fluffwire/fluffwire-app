<script setup lang="ts">
import { ref } from 'vue'
import { useFriendsStore } from '@/stores/friends'
import BaseButton from '@/components/common/BaseButton.vue'

const friendsStore = useFriendsStore()
const username = ref('')
const message = ref<{ type: 'success' | 'error'; text: string } | null>(null)
const isLoading = ref(false)

async function handleSubmit() {
  if (!username.value.trim()) return
  isLoading.value = true
  message.value = null
  try {
    await friendsStore.sendRequest(username.value.trim())
    message.value = { type: 'success', text: `Friend request sent to ${username.value}!` }
    username.value = ''
  } catch {
    message.value = { type: 'error', text: 'Could not send friend request. Check the username.' }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div>
    <h4 class="mb-1 text-sm font-bold uppercase text-text-primary">Add Friend</h4>
    <p class="mb-4 text-sm text-text-secondary">
      You can add friends with their username.
    </p>

    <form @submit.prevent="handleSubmit" class="flex items-center gap-3 rounded-lg bg-input-bg p-2">
      <input
        v-model="username"
        placeholder="Enter a username"
        class="flex-1 bg-transparent px-2 py-1.5 text-sm text-text-primary placeholder-text-muted outline-none"
      />
      <BaseButton type="submit" :loading="isLoading" :disabled="!username.trim()" size="sm">
        Send Friend Request
      </BaseButton>
    </form>

    <p
      v-if="message"
      :class="['mt-3 text-sm', message.type === 'success' ? 'text-success' : 'text-danger']"
    >
      {{ message.text }}
    </p>
  </div>
</template>
