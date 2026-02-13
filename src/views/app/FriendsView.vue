<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFriendsStore } from '@/stores/friends'
import { useUiStore } from '@/stores/ui'
import { useResponsive } from '@/composables/useResponsive'
import FriendsList from '@/components/friends/FriendsList.vue'
import AddFriendForm from '@/components/friends/AddFriendForm.vue'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, Menu } from 'lucide-vue-next'

const { t } = useI18n()
const friendsStore = useFriendsStore()
const uiStore = useUiStore()
const { isMobile, isTablet } = useResponsive()

const activeTab = ref('online')

onMounted(() => {
  friendsStore.fetchFriends()
  friendsStore.fetchRequests()
})

const pendingCount = computed(() => friendsStore.pendingRequests.length)
</script>

<template>
  <div class="flex h-full flex-col">
    <!-- Header -->
    <div class="flex h-12 items-center gap-2 border-b border-primary/20 px-4">
      <Button
        v-if="isTablet || isMobile"
        variant="ghost"
        size="icon"
        class="h-8 w-8"
        @click="isMobile ? (uiStore.isMobileSidebarOpen = true) : (uiStore.isChannelSidebarOpen = true)"
      >
        <Menu class="h-5 w-5" />
      </Button>
      <Users class="h-5 w-5 text-muted-foreground" />
      <h3 class="font-semibold text-foreground">{{ $t('friends.friends') }}</h3>
    </div>

    <!-- Tabs -->
    <Tabs v-model="activeTab" class="flex flex-1 flex-col">
      <div class="border-b border-border/50 px-4 pt-2">
        <TabsList class="bg-transparent">
          <TabsTrigger value="online">{{ $t('friends.online') }}</TabsTrigger>
          <TabsTrigger value="all">{{ $t('friends.all') }}</TabsTrigger>
          <TabsTrigger value="pending" class="gap-1.5">
            {{ $t('friends.pending') }}
            <Badge v-if="pendingCount > 0" variant="destructive" class="ml-1 h-4 min-w-[16px] px-1 text-[10px]">
              {{ pendingCount }}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="add" class="text-primary data-[state=active]:text-primary">
            {{ $t('friends.addFriend') }}
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="online" class="flex-1 overflow-y-auto p-4 mt-0">
        <FriendsList tab="online" />
      </TabsContent>

      <TabsContent value="all" class="flex-1 overflow-y-auto p-4 mt-0">
        <FriendsList tab="all" />
      </TabsContent>

      <TabsContent value="pending" class="flex-1 overflow-y-auto p-4 mt-0">
        <FriendsList tab="pending" />
      </TabsContent>

      <TabsContent value="add" class="flex-1 overflow-y-auto p-4 mt-0">
        <AddFriendForm />
      </TabsContent>
    </Tabs>
  </div>
</template>
