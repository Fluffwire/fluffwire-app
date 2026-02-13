<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import { useResponsive } from '@/composables/useResponsive'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Hash, AtSign, Menu, Users, UserPlus, Pin, Search } from 'lucide-vue-next'

interface Props {
  channelName: string
  isDm?: boolean
}

defineProps<Props>()
const emit = defineEmits<{
  togglePins: []
  openSearch: []
}>()
const route = useRoute()
const uiStore = useUiStore()
const { isMobile, isTablet } = useResponsive()

function openInviteModal() {
  const serverId = route.params.serverId as string
  if (serverId) uiStore.openModal('invite', serverId)
}
</script>

<template>
  <div class="flex h-12 items-center justify-between border-b border-primary/20 px-4">
    <div class="flex items-center gap-2">
      <!-- Hamburger for tablet/mobile -->
      <Button
        v-if="isTablet || isMobile"
        variant="ghost"
        size="icon"
        class="h-8 w-8"
        @click="isMobile ? (uiStore.isMobileSidebarOpen = true) : (uiStore.isChannelSidebarOpen = true)"
      >
        <Menu class="h-5 w-5" />
      </Button>

      <component
        :is="isDm ? AtSign : Hash"
        class="h-5 w-5 text-primary/70"
      />
      <h3 class="font-semibold text-foreground">{{ channelName }}</h3>
    </div>

    <div class="flex items-center gap-1">
      <TooltipProvider>
        <Tooltip v-if="!isDm">
          <TooltipTrigger as-child>
            <Button
              variant="ghost"
              size="icon"
              class="h-8 w-8 text-muted-foreground hover:text-foreground"
              @click="openInviteModal"
            >
              <UserPlus class="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Invite People</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              variant="ghost"
              size="icon"
              class="h-8 w-8 text-muted-foreground hover:text-foreground"
              @click="emit('openSearch')"
            >
              <Search class="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Search</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              variant="ghost"
              size="icon"
              class="h-8 w-8 text-muted-foreground hover:text-foreground"
              @click="emit('togglePins')"
            >
              <Pin class="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Pinned Messages</TooltipContent>
        </Tooltip>
        <Tooltip v-if="!isDm">
          <TooltipTrigger as-child>
            <Button
              variant="ghost"
              size="icon"
              class="h-8 w-8"
              :class="uiStore.showMemberSidebar ? 'bg-accent text-foreground' : 'text-muted-foreground'"
              @click="uiStore.toggleMemberSidebar()"
            >
              <Users class="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle Member List</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  </div>
</template>
