<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ServerSidebar from '@/components/sidebar/ServerSidebar.vue'
import ChannelSidebar from '@/components/sidebar/ChannelSidebar.vue'
import MemberSidebar from '@/components/members/MemberSidebar.vue'
import VoicePanel from '@/components/voice/VoicePanel.vue'
import CreateServerModal from '@/components/server/CreateServerModal.vue'
import { useUiStore } from '@/stores/ui'
import { useVoiceStore } from '@/stores/voice'

const route = useRoute()
const uiStore = useUiStore()
const voiceStore = useVoiceStore()

const isServerView = computed(() => {
  return route.params.serverId && route.params.serverId !== '@me'
})

const showMemberSidebar = computed(() => {
  return isServerView.value && uiStore.showMemberSidebar
})
</script>

<template>
  <div class="flex h-full w-full overflow-hidden">
    <!-- Server sidebar (72px icon strip) -->
    <ServerSidebar />

    <!-- Channel sidebar (240px) -->
    <ChannelSidebar />

    <!-- Main content area -->
    <main class="relative flex min-w-0 flex-1 flex-col bg-chat-bg">
      <slot />

      <!-- Voice panel (sticky at bottom when in voice) -->
      <VoicePanel v-if="voiceStore.isInVoice" />
    </main>

    <!-- Member sidebar (right side, toggleable) -->
    <MemberSidebar v-if="showMemberSidebar" />

    <!-- Modals -->
    <CreateServerModal />
  </div>
</template>
