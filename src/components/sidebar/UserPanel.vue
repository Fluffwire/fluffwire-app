<script setup lang="ts">
import { computed, ref, onBeforeUnmount } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { usePresenceStore } from '@/stores/presence'
import { useRouter } from 'vue-router'
import { wsService } from '@/services/websocket'
import UserAvatar from '@/components/common/UserAvatar.vue'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Settings, Check, Circle, MinusCircle, EyeOff } from 'lucide-vue-next'
import type { UserStatus } from '@/types'

const authStore = useAuthStore()
const presenceStore = usePresenceStore()
const router = useRouter()

const wsConnected = ref(wsService.isConnected)
const unsubConnection = wsService.addConnectionListener((connected) => {
  wsConnected.value = connected
})
onBeforeUnmount(() => unsubConnection())

const myStatus = computed(() =>
  authStore.user ? presenceStore.getStatus(authStore.user.id) : 'offline'
)

const statusOptions: { value: UserStatus; label: string; color: string; icon: typeof Circle }[] = [
  { value: 'online', label: 'Online', color: 'bg-emerald-500', icon: Circle },
  { value: 'dnd', label: 'Do Not Disturb', color: 'bg-red-500', icon: MinusCircle },
  { value: 'offline', label: 'Invisible', color: 'bg-gray-500', icon: EyeOff },
]

const displayStatus = computed(() => {
  if (!wsConnected.value) return 'idle' as UserStatus
  return myStatus.value
})

const statusLabel = computed(() => {
  if (!wsConnected.value) return 'Disconnected'
  const opt = statusOptions.find((o) => o.value === myStatus.value)
  return opt?.label ?? 'Online'
})

function setStatus(status: UserStatus) {
  presenceStore.setOwnStatus(status)
}
</script>

<template>
  <div class="flex items-center gap-2 border-t border-border/50 bg-card/50 px-2 py-1.5 backdrop-blur-sm">
    <Popover>
      <PopoverTrigger as-child :disabled="!wsConnected">
        <button
          :class="[
            'flex items-center gap-2 min-w-0 flex-1 rounded-md px-1 py-0.5 transition-colors',
            wsConnected ? 'hover:bg-accent/50' : 'cursor-default opacity-75',
          ]"
        >
          <UserAvatar
            :src="authStore.user?.avatar ?? null"
            :alt="authStore.user?.displayName ?? ''"
            size="sm"
            :status="displayStatus"
          />
          <div class="min-w-0 flex-1 text-left">
            <div class="truncate text-sm font-medium text-foreground">
              {{ authStore.user?.displayName }}
            </div>
            <div :class="['truncate text-xs', !wsConnected ? 'text-amber-400' : 'text-muted-foreground']">
              {{ statusLabel }}
            </div>
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent v-if="wsConnected" side="top" align="start" class="w-56 p-1">
        <div class="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Set Status</div>
        <button
          v-for="opt in statusOptions"
          :key="opt.value"
          @click="setStatus(opt.value)"
          class="flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors"
        >
          <span :class="['h-2.5 w-2.5 rounded-full shrink-0', opt.color]" />
          <span class="flex-1">{{ opt.label }}</span>
          <Check v-if="myStatus === opt.value" class="h-4 w-4 text-primary shrink-0" />
        </button>
      </PopoverContent>
    </Popover>

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
