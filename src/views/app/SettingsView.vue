<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseAvatar from '@/components/common/BaseAvatar.vue'

const authStore = useAuthStore()
const router = useRouter()

const activeTab = ref('account')

function handleLogout() {
  authStore.logout()
  router.push('/login')
}

function close() {
  router.back()
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex">
    <!-- Sidebar region -->
    <div class="flex h-full w-[218px] shrink-0 justify-end overflow-y-auto bg-channel-bg">
      <div class="w-[190px] py-16 pr-2 pl-5">
        <h3 class="mb-1 px-2 text-xs font-bold uppercase tracking-wide text-text-secondary">
          User Settings
        </h3>
        <nav class="space-y-0.5">
          <button
            @click="activeTab = 'account'"
            :class="[
              'w-full rounded px-2 py-1.5 text-left text-sm',
              activeTab === 'account'
                ? 'bg-active-bg font-medium text-text-primary'
                : 'text-text-secondary hover:bg-hover-bg hover:text-text-primary'
            ]"
          >
            My Account
          </button>
          <button
            @click="activeTab = 'voice'"
            :class="[
              'w-full rounded px-2 py-1.5 text-left text-sm',
              activeTab === 'voice'
                ? 'bg-active-bg font-medium text-text-primary'
                : 'text-text-secondary hover:bg-hover-bg hover:text-text-primary'
            ]"
          >
            Voice & Audio
          </button>
          <button
            @click="activeTab = 'appearance'"
            :class="[
              'w-full rounded px-2 py-1.5 text-left text-sm',
              activeTab === 'appearance'
                ? 'bg-active-bg font-medium text-text-primary'
                : 'text-text-secondary hover:bg-hover-bg hover:text-text-primary'
            ]"
          >
            Appearance
          </button>
          <div class="my-2 border-t border-border" />
          <button
            @click="handleLogout"
            class="w-full rounded px-2 py-1.5 text-left text-sm text-danger hover:bg-danger/10"
          >
            Log Out
          </button>
        </nav>
      </div>
    </div>

    <!-- Content region -->
    <div class="flex min-w-0 flex-1 bg-chat-bg">
      <div class="h-full w-full max-w-[740px] overflow-y-auto py-16 pr-4 pl-10">
        <!-- My Account -->
        <template v-if="activeTab === 'account'">
          <h2 class="mb-6 text-xl font-bold text-text-primary">My Account</h2>
          <div class="rounded-lg bg-channel-bg p-6">
            <div class="flex items-center gap-4">
              <BaseAvatar
                :src="authStore.user?.avatar ?? null"
                :alt="authStore.user?.displayName ?? ''"
                size="lg"
              />
              <div>
                <h3 class="text-xl font-semibold text-text-primary">
                  {{ authStore.user?.displayName }}
                </h3>
                <p class="text-sm text-text-secondary">
                  {{ authStore.user?.username }}
                </p>
                <p class="text-sm text-text-secondary">
                  {{ authStore.user?.email }}
                </p>
              </div>
            </div>
          </div>
        </template>

        <!-- Voice & Audio -->
        <template v-if="activeTab === 'voice'">
          <h2 class="mb-6 text-xl font-bold text-text-primary">Voice & Audio</h2>
          <div class="rounded-lg bg-channel-bg p-6">
            <p class="text-sm text-text-secondary">Voice and audio settings will be available here.</p>
          </div>
        </template>

        <!-- Appearance -->
        <template v-if="activeTab === 'appearance'">
          <h2 class="mb-6 text-xl font-bold text-text-primary">Appearance</h2>
          <div class="rounded-lg bg-channel-bg p-6">
            <p class="text-sm text-text-secondary">Appearance settings will be available here.</p>
          </div>
        </template>
      </div>

      <!-- Close button -->
      <div class="shrink-0 py-16 pr-5">
        <button
          @click="close"
          class="flex h-9 w-9 items-center justify-center rounded-full border-2 border-border text-text-secondary transition-colors hover:text-text-primary"
          title="Close Settings (ESC)"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <p class="mt-1 text-center text-xs text-text-secondary">ESC</p>
      </div>
    </div>
  </div>
</template>
