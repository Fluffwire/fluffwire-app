<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import BaseButton from '@/components/common/BaseButton.vue'
import BaseAvatar from '@/components/common/BaseAvatar.vue'

const authStore = useAuthStore()
const router = useRouter()

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="flex h-full">
    <!-- Settings sidebar -->
    <div class="w-56 shrink-0 bg-channel-bg p-4">
      <nav class="space-y-0.5">
        <button class="w-full rounded bg-active-bg px-3 py-1.5 text-left text-sm font-medium text-text-primary">
          My Account
        </button>
        <button class="w-full rounded px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-hover-bg hover:text-text-primary">
          Voice & Audio
        </button>
        <button class="w-full rounded px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-hover-bg hover:text-text-primary">
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

    <!-- Settings content -->
    <div class="flex-1 overflow-y-auto p-8">
      <div class="max-w-2xl">
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

        <!-- Close settings -->
        <div class="mt-8 flex justify-end">
          <button
            @click="router.back()"
            class="flex items-center gap-2 rounded-full border border-border p-3 text-text-secondary transition-colors hover:text-text-primary"
            title="Close Settings"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
