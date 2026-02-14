<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ServerSidebar from '@/components/sidebar/ServerSidebar.vue'
import ChannelSidebar from '@/components/sidebar/ChannelSidebar.vue'
import MemberSidebar from '@/components/members/MemberSidebar.vue'
import CreateServerModal from '@/components/server/CreateServerModal.vue'
import JoinServerModal from '@/components/server/JoinServerModal.vue'
import InviteModal from '@/components/server/InviteModal.vue'
import ServerSettingsModal from '@/components/server/ServerSettingsModal.vue'
import CreateChannelModal from '@/components/channels/CreateChannelModal.vue'
import EditChannelModal from '@/components/channels/EditChannelModal.vue'
import CreateCategoryModal from '@/components/channels/CreateCategoryModal.vue'
import EditCategoryModal from '@/components/channels/EditCategoryModal.vue'
import OfflineBanner from '@/components/common/OfflineBanner.vue'
import VoiceInviteToast from '@/components/voice/VoiceInviteToast.vue'
import DebugPanel from '@/components/common/DebugPanel.vue'
import { Button } from '@/components/ui/button'
import { Bug } from 'lucide-vue-next'
import { isTauri } from '@/utils/debug'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { usePresenceStore } from '@/stores/presence'
import { useVoiceStore } from '@/stores/voice'
import { useResponsive } from '@/composables/useResponsive'
import { useNotifications } from '@/composables/useNotifications'
import { useIdleDetection } from '@/composables/useIdleDetection'
import { useSwipePanel } from '@/composables/useSwipePanel'
import { wsService } from '@/services/websocket'
import { authApi } from '@/services/authApi'
import { getTokenStorage } from '@/services/tokenStorage'

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()
const authStore = useAuthStore()
const presenceStore = usePresenceStore()
const voiceStore = useVoiceStore()
const { isMobile, isTablet, isDesktop } = useResponsive()

useNotifications()

// Touch swipe to open panels on mobile
useSwipePanel()

// Hide member sidebar by default on mobile/tablet (but keep visible on desktop)
watch([isMobile, isTablet], ([mobile, tablet]) => {
  if (mobile || tablet) {
    uiStore.showMemberSidebar = false
  }
}, { immediate: true })

// Idle detection — auto-set idle after 5 minutes of inactivity
const { isIdle } = useIdleDetection(5 * 60 * 1000)

watch(isIdle, (idle) => {
  if (idle) {
    presenceStore.setAutoIdle()
  } else {
    presenceStore.restoreFromIdle()
  }
})

// Connection state tracking for offline banner
const wsConnected = ref(true)
const bannerDismissed = ref(false)

const unsubConnection = wsService.addConnectionListener((connected) => {
  wsConnected.value = connected
})

const unsubAuthFailure = wsService.addAuthFailureListener(async () => {
  const storage = getTokenStorage()
  const refreshToken = storage.getItem('refreshToken')
  if (refreshToken) {
    try {
      const { data } = await authApi.refresh(refreshToken)
      storage.setItem('accessToken', data.accessToken)
      storage.setItem('refreshToken', data.refreshToken)
      authStore.accessToken = data.accessToken
      wsService.connect(data.accessToken)
    } catch {
      authStore.logout()
      router.push({ path: '/login', query: { reason: 'session_expired' } })
    }
  } else {
    authStore.logout()
    router.push({ path: '/login', query: { reason: 'session_expired' } })
  }
})

onBeforeUnmount(() => {
  unsubConnection()
  unsubAuthFailure()
})

watch(wsConnected, (connected) => {
  if (connected) {
    bannerDismissed.value = false
  }
})

// Close mobile sidebar when modal opens to prevent z-index conflicts
watch(() => uiStore.activeModal, (modal) => {
  if (modal && isMobile.value) {
    uiStore.isMobileSidebarOpen = false
  }
})

const showOfflineBanner = computed(() => !wsConnected.value && !bannerDismissed.value)

const isSettings = computed(() => route.path === '/settings')

// Debug panel
const showDebugPanel = ref(false)

onMounted(() => {
  // Auto-show debug panel in Tauri
  if (isTauri) {
    showDebugPanel.value = true
  }

  // Toggle debug panel with Ctrl+Shift+D
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault()
      showDebugPanel.value = !showDebugPanel.value
    }
  })
})

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
    <!-- Offline banner -->
    <OfflineBanner v-if="showOfflineBanner" @dismiss="bannerDismissed = true" />

    <!-- Voice invite toasts -->
    <div v-if="voiceStore.activeInvites.length" class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <VoiceInviteToast
        v-for="invite in voiceStore.activeInvites"
        :key="`${invite.inviterId}-${invite.channelId}`"
        :invite="invite"
      />
    </div>

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

    <!-- Mobile: combined sidebar Sheet -->
    <Sheet v-if="isMobile" v-model:open="uiStore.isMobileSidebarOpen">
      <SheetContent side="left" class="w-[300px] h-full p-0 flex flex-row overflow-hidden">
        <ServerSidebar class="w-[60px] shrink-0" is-sheet />
        <ChannelSidebar class="flex-1" is-sheet />
      </SheetContent>
    </Sheet>

    <!-- Main content area -->
    <main class="relative flex min-w-0 flex-1 flex-col bg-background">
      <slot />
    </main>

    <!-- Desktop: inline member sidebar -->
    <MemberSidebar v-if="isDesktop && showMemberSidebar" />

    <!-- Tablet/Mobile: member sidebar as Sheet -->
    <Sheet v-if="(isTablet || isMobile) && isServerView && !isSettings" v-model:open="uiStore.showMemberSidebar">
      <SheetContent side="right" class="w-60 p-0">
        <MemberSidebar is-sheet />
      </SheetContent>
    </Sheet>

    <!-- Modals -->
    <CreateServerModal />
    <JoinServerModal />
    <InviteModal />
    <ServerSettingsModal />
    <CreateChannelModal />
    <EditChannelModal />
    <CreateCategoryModal />
    <EditCategoryModal />

    <!-- Debug panel toggle button (only in Tauri or when enabled) -->
    <Button
      v-if="isTauri || showDebugPanel"
      variant="outline"
      size="icon"
      class="fixed bottom-4 left-4 z-[9998] h-12 w-12 rounded-full border-2 border-primary shadow-lg"
      @click="showDebugPanel = !showDebugPanel"
    >
      <Bug class="h-6 w-6" />
    </Button>

    <!-- Debug panel -->
    <DebugPanel v-if="showDebugPanel" @close="showDebugPanel = false" />
  </div>
</template>
