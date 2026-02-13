<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useDirectMessagesStore } from '@/stores/directMessages'
import { useUiStore } from '@/stores/ui'
import { useResponsive } from '@/composables/useResponsive'
import ChatArea from '@/components/chat/ChatArea.vue'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-vue-next'

const route = useRoute()
const dmStore = useDirectMessagesStore()
const uiStore = useUiStore()
const { isMobile, isTablet } = useResponsive()

const dmId = computed(() => route.params.dmId as string)

watch(dmId, (id) => {
  dmStore.currentDmId = id
}, { immediate: true })

const dm = computed(() => dmStore.currentDm)
</script>

<template>
  <ChatArea
    v-if="dm"
    :channel-id="dm.id"
    :channel-name="dm.recipient.displayName"
    :is-dm="true"
  />
  <div v-else class="flex h-full flex-col">
    <div v-if="isTablet || isMobile" class="flex h-12 items-center border-b border-primary/20 px-4">
      <Button
        variant="ghost"
        size="icon"
        class="h-8 w-8"
        @click="isMobile ? (uiStore.isMobileSidebarOpen = true) : (uiStore.isChannelSidebarOpen = true)"
      >
        <Menu class="h-5 w-5" />
      </Button>
    </div>
    <div class="flex flex-1 items-center justify-center text-muted-foreground">
      Select a conversation
    </div>
  </div>
</template>
