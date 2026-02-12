<script setup lang="ts">
interface Props {
  title: string
  show: boolean
}

defineProps<Props>()
const emit = defineEmits<{ close: [] }>()

function handleOverlayClick(e: MouseEvent) {
  if (e.target === e.currentTarget) emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
        @click="handleOverlayClick"
      >
        <div class="w-full max-w-md rounded-lg bg-channel-bg shadow-xl">
          <div class="flex items-center justify-between border-b border-border p-4">
            <h2 class="text-xl font-bold text-text-primary">{{ title }}</h2>
            <button
              @click="$emit('close')"
              class="text-text-secondary hover:text-text-primary"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="p-4">
            <slot />
          </div>
          <div v-if="$slots.footer" class="rounded-b-lg bg-server-bg p-4">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.15s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
