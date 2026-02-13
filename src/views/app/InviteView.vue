<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useServersStore } from '@/stores/servers'
import { useChannelsStore } from '@/stores/channels'
import { Loader2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

const route = useRoute()
const router = useRouter()
const serversStore = useServersStore()
const channelsStore = useChannelsStore()

const isLoading = ref(true)
const error = ref('')

onMounted(async () => {
  const code = route.params.code as string
  if (!code) {
    error.value = 'No invite code provided'
    isLoading.value = false
    return
  }
  try {
    const server = await serversStore.joinServer(code)
    await channelsStore.fetchChannels(server.id)
    const firstChannel = channelsStore.textChannels[0]
    router.replace(`/channels/${server.id}/${firstChannel?.id ?? ''}`)
  } catch {
    error.value = 'Invalid or expired invite code'
    isLoading.value = false
  }
})
</script>

<template>
  <div class="flex h-screen items-center justify-center bg-background">
    <div v-if="isLoading" class="flex flex-col items-center gap-3">
      <Loader2 class="h-8 w-8 animate-spin text-primary" />
      <p class="text-muted-foreground">Joining server...</p>
    </div>
    <div v-else class="flex flex-col items-center gap-4 text-center">
      <p class="text-lg font-semibold text-destructive">{{ error }}</p>
      <Button @click="router.push('/channels/@me')">Go Home</Button>
    </div>
  </div>
</template>
