<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
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

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="flex h-full">
    <!-- Settings nav sidebar -->
    <aside class="flex h-full w-60 shrink-0 flex-col bg-channel-bg">
      <div class="flex h-12 items-center border-b border-border/50 px-4 shadow-sm">
        <h2 class="font-semibold text-text-primary">Settings</h2>
      </div>
      <nav class="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
        <h3 class="mb-1 px-2 text-xs font-bold uppercase tracking-wide text-text-secondary">
          User Settings
        </h3>
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
    </aside>

    <!-- Settings content -->
    <div class="flex flex-1 overflow-y-auto p-8">
      <div class="w-full max-w-2xl">
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
      <div class="ml-4 shrink-0">
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
