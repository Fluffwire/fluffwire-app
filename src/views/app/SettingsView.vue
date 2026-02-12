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
  <div class="fixed inset-0 z-50 flex bg-server-bg">
    <!-- Settings sidebar -->
    <div class="flex flex-1 justify-end bg-channel-bg">
      <div class="w-56 p-4 pt-16">
        <h3 class="mb-1 px-3 text-xs font-bold uppercase tracking-wide text-text-secondary">
          User Settings
        </h3>
        <nav class="space-y-0.5">
          <button
            @click="activeTab = 'account'"
            :class="[
              'w-full rounded px-3 py-1.5 text-left text-sm',
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
              'w-full rounded px-3 py-1.5 text-left text-sm',
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
              'w-full rounded px-3 py-1.5 text-left text-sm',
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
            class="w-full rounded px-3 py-1.5 text-left text-sm text-danger hover:bg-danger/10"
          >
            Log Out
          </button>
        </nav>
      </div>
    </div>

    <!-- Settings content -->
    <div class="flex flex-[1.5] pt-16">
      <div class="w-full max-w-2xl overflow-y-auto p-8">
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
      <div class="pt-16 pr-8">
        <button
          @click="close"
          class="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-secondary transition-colors hover:text-text-primary"
          title="Close Settings (ESC)"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <p class="mt-1 text-center text-xs text-text-secondary">ESC</p>
      </div>
    </div>
  </div>
</template>
