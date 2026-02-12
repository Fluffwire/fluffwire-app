<script setup lang="ts">
import { ref } from 'vue'
import { useFriendsStore } from '@/stores/friends'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-vue-next'

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
    <h4 class="mb-1 text-sm font-bold uppercase text-foreground">Add Friend</h4>
    <p class="mb-4 text-sm text-muted-foreground">
      You can add friends with their username.
    </p>

    <form @submit.prevent="handleSubmit" class="flex items-center gap-3 rounded-xl border border-input bg-card p-2">
      <Input
        v-model="username"
        placeholder="Enter a username"
        class="flex-1 border-0 bg-transparent focus-visible:ring-0"
      />
      <Button type="submit" :disabled="isLoading || !username.trim()" size="sm">
        <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
        Send Friend Request
      </Button>
    </form>

    <p
      v-if="message"
      :class="['mt-3 text-sm', message.type === 'success' ? 'text-online' : 'text-destructive']"
    >
      {{ message.text }}
    </p>
  </div>
</template>
