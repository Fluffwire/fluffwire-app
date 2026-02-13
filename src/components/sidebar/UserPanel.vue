<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { usePresenceStore } from '@/stores/presence'
import { useRouter } from 'vue-router'
import UserAvatar from '@/components/common/UserAvatar.vue'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Settings } from 'lucide-vue-next'

const authStore = useAuthStore()
const presenceStore = usePresenceStore()
const router = useRouter()

const myStatus = computed(() =>
  authStore.user ? presenceStore.getStatus(authStore.user.id) : 'offline'
)
</script>

<template>
  <div class="flex items-center gap-2 border-t border-border/50 bg-card/50 px-2 py-1.5 backdrop-blur-sm">
    <UserAvatar
      :src="authStore.user?.avatar ?? null"
      :alt="authStore.user?.displayName ?? ''"
      size="sm"
      :status="myStatus"
    />

    <div class="min-w-0 flex-1">
      <div class="truncate text-sm font-medium text-foreground">
        {{ authStore.user?.displayName }}
      </div>
      <div class="truncate text-xs text-muted-foreground">
        {{ myStatus === 'offline' ? 'Offline' : myStatus === 'dnd' ? 'Do Not Disturb' : myStatus === 'idle' ? 'Idle' : 'Online' }}
      </div>
    </div>

    <TooltipProvider>
      <div class="flex gap-0.5">
        <Tooltip>
          <TooltipTrigger as-child>
            <button
              @click="router.push('/settings')"
              class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Settings class="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Settings</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  </div>
</template>
