<script setup lang="ts">
import { computed } from 'vue'
import type { User } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { usePresenceStore } from '@/stores/presence'
import { useFriendsStore } from '@/stores/friends'
import { useDirectMessagesStore } from '@/stores/directMessages'
import { useRouter } from 'vue-router'
import UserAvatar from './UserAvatar.vue'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { MessageSquare, UserPlus } from 'lucide-vue-next'

interface Props {
  user: {
    id: string
    username: string
    displayName: string
    avatar?: string | null
    bio?: string
  }
  side?: 'top' | 'bottom' | 'left' | 'right'
}

const props = withDefaults(defineProps<Props>(), { side: 'right' })

const authStore = useAuthStore()
const presenceStore = usePresenceStore()
const friendsStore = useFriendsStore()
const dmStore = useDirectMessagesStore()
const router = useRouter()

const status = computed(() => presenceStore.getStatus(props.user.id))
const isOwnProfile = computed(() => props.user.id === authStore.user?.id)
const isFriend = computed(() => friendsStore.friends.some((f) => f.user.id === props.user.id))

const statusLabel = computed(() => {
  switch (status.value) {
    case 'online': return 'Online'
    case 'idle': return 'Idle'
    case 'dnd': return 'Do Not Disturb'
    default: return 'Offline'
  }
})

const statusColor = computed(() => {
  switch (status.value) {
    case 'online': return 'bg-emerald-500'
    case 'idle': return 'bg-yellow-500'
    case 'dnd': return 'bg-red-500'
    default: return 'bg-gray-500'
  }
})

const joinedDate = computed(() => {
  const user = props.user as User
  if (!user.createdAt) return ''
  return new Date(user.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
})

async function sendMessage() {
  const dm = await dmStore.openDM(props.user.id)
  router.push(`/channels/@me/${dm.id}`)
}

async function addFriend() {
  await friendsStore.sendRequest(props.user.username)
}
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <slot />
    </PopoverTrigger>
    <PopoverContent :side="side" class="w-72 p-0" :side-offset="8">
      <!-- Banner -->
      <div class="h-16 rounded-t-lg bg-gradient-to-r from-primary/40 to-primary/20" />

      <div class="-mt-8 px-4 pb-4">
        <!-- Avatar -->
        <UserAvatar
          :src="user.avatar ?? null"
          :alt="user.displayName"
          size="lg"
          :status="status"
          class="ring-4 ring-popover"
        />

        <!-- Name + Status -->
        <div class="mt-2">
          <div class="text-base font-semibold text-foreground">{{ user.displayName }}</div>
          <div class="text-xs text-muted-foreground">{{ user.username }}</div>
        </div>

        <!-- Status badge -->
        <div class="mt-2 flex items-center gap-1.5">
          <span :class="['h-2 w-2 rounded-full shrink-0', statusColor]" />
          <span class="text-xs text-muted-foreground">{{ statusLabel }}</span>
        </div>

        <Separator class="my-3" />

        <!-- Bio -->
        <div v-if="user.bio" class="mb-3">
          <div class="text-[11px] font-semibold uppercase text-muted-foreground">About Me</div>
          <div class="mt-1 text-sm text-foreground whitespace-pre-wrap">{{ user.bio }}</div>
        </div>

        <!-- Member since -->
        <div v-if="joinedDate">
          <div class="text-[11px] font-semibold uppercase text-muted-foreground">Member Since</div>
          <div class="mt-0.5 text-xs text-muted-foreground">{{ joinedDate }}</div>
        </div>

        <!-- Actions -->
        <div v-if="!isOwnProfile" class="mt-3 flex gap-2">
          <Button size="sm" variant="secondary" class="flex-1 gap-1.5" @click="sendMessage">
            <MessageSquare class="h-3.5 w-3.5" />
            Message
          </Button>
          <Button v-if="!isFriend" size="sm" variant="outline" class="flex-1 gap-1.5" @click="addFriend">
            <UserPlus class="h-3.5 w-3.5" />
            Add Friend
          </Button>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
