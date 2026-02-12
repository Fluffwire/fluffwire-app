<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useServersStore } from '@/stores/servers'
import { useUiStore } from '@/stores/ui'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-vue-next'

const serversStore = useServersStore()
const uiStore = useUiStore()
const router = useRouter()

const inviteCode = ref('')
const isLoading = ref(false)
const error = ref('')

const isOpen = computed({
  get: () => uiStore.activeModal === 'joinServer',
  set: (v) => { if (!v) uiStore.closeModal() },
})

async function handleJoin() {
  if (!inviteCode.value.trim()) return
  isLoading.value = true
  error.value = ''
  try {
    const server = await serversStore.joinServer(inviteCode.value.trim())
    uiStore.closeModal()
    inviteCode.value = ''
    router.push(`/channels/${server.id}`)
  } catch {
    error.value = 'Invalid or expired invite code'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Join a Server</DialogTitle>
      </DialogHeader>

      <form @submit.prevent="handleJoin" class="space-y-4">
        <p class="text-sm text-muted-foreground">
          Enter an invite code to join an existing server.
        </p>

        <div v-if="error" class="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {{ error }}
        </div>

        <div class="space-y-2">
          <Label for="invite-code">Invite Code</Label>
          <Input
            id="invite-code"
            v-model="inviteCode"
            placeholder="Enter an invite code"
            required
          />
        </div>

        <DialogFooter class="gap-2">
          <Button variant="ghost" type="button" @click="uiStore.closeModal()">Cancel</Button>
          <Button type="submit" :disabled="isLoading">
            <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
            Join Server
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
