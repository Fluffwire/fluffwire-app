<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ServerSidebar from '@/components/sidebar/ServerSidebar.vue'
import ChannelSidebar from '@/components/sidebar/ChannelSidebar.vue'
import MemberSidebar from '@/components/members/MemberSidebar.vue'
import VoicePanel from '@/components/voice/VoicePanel.vue'
import CreateServerModal from '@/components/server/CreateServerModal.vue'
import JoinServerModal from '@/components/server/JoinServerModal.vue'
import InviteModal from '@/components/server/InviteModal.vue'
import CreateChannelModal from '@/components/channels/CreateChannelModal.vue'
import EditChannelModal from '@/components/channels/EditChannelModal.vue'
import CreateCategoryModal from '@/components/channels/CreateCategoryModal.vue'
import EditCategoryModal from '@/components/channels/EditCategoryModal.vue'
import MobileNav from '@/components/navigation/MobileNav.vue'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useUiStore } from '@/stores/ui'
import { useVoiceStore } from '@/stores/voice'
import { useResponsive } from '@/composables/useResponsive'

const route = useRoute()
const uiStore = useUiStore()
const voiceStore = useVoiceStore()
const { isMobile, isTablet, isDesktop } = useResponsive()

const isSettings = computed(() => route.path === '/settings')

const isServerView = computed(() => {
  return route.params.serverId && route.params.serverId !== '@me'
})

const showMemberSidebar = computed(() => {
  return isServerView.value && uiStore.showMemberSidebar && !isSettings.value
})

const showChannelSidebar = computed(() => !isSettings.value)
</script>

<template>
  <div class="flex h-full w-full overflow-hidden">
    <!-- Server sidebar — hidden on mobile -->
    <ServerSidebar v-if="!isMobile" />

    <!-- Desktop: inline channel sidebar -->
    <ChannelSidebar v-if="isDesktop && showChannelSidebar" />

    <!-- Tablet: channel sidebar as Sheet -->
    <Sheet v-if="isTablet" v-model:open="uiStore.isChannelSidebarOpen">
      <SheetContent side="left" class="w-60 p-0">
        <ChannelSidebar is-sheet />
      </SheetContent>
    </Sheet>

    <!-- Mobile: server picker Sheet -->
    <Sheet v-if="isMobile" v-model:open="uiStore.isMobileSidebarOpen">
      <SheetContent side="left" class="w-[72px] p-0">
        <ServerSidebar is-sheet />
      </SheetContent>
    </Sheet>

    <!-- Mobile: channel sidebar Sheet -->
    <Sheet v-if="isMobile" v-model:open="uiStore.isChannelSidebarOpen">
      <SheetContent side="left" class="w-60 p-0">
        <ChannelSidebar is-sheet />
      </SheetContent>
    </Sheet>

    <!-- Main content area -->
    <main
      :class="[
        'relative flex min-w-0 flex-1 flex-col bg-background',
        isMobile ? 'pb-14' : '',
      ]"
    >
      <slot />

      <!-- Voice panel (sticky at bottom when in voice) -->
      <VoicePanel v-if="voiceStore.isInVoice" />
    </main>

    <!-- Desktop: inline member sidebar -->
    <MemberSidebar v-if="isDesktop && showMemberSidebar" />

    <!-- Tablet/Mobile: member sidebar as Sheet -->
    <Sheet v-if="(isTablet || isMobile) && isServerView && !isSettings" v-model:open="uiStore.showMemberSidebar">
      <SheetContent side="right" class="w-60 p-0">
        <MemberSidebar is-sheet />
      </SheetContent>
    </Sheet>

    <!-- Mobile bottom nav -->
    <MobileNav v-if="isMobile" />

    <!-- Modals -->
    <CreateServerModal />
    <JoinServerModal />
    <InviteModal />
    <CreateChannelModal />
    <EditChannelModal />
    <CreateCategoryModal />
    <EditCategoryModal />
  </div>
</template>
