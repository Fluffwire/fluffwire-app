<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-vue-next'

interface Props {
  images: { url: string; filename: string }[]
  initialIndex?: number
}

const props = withDefaults(defineProps<Props>(), {
  initialIndex: 0
})

const open = defineModel<boolean>('open', { default: false })
const currentIndex = ref(props.initialIndex)

const currentImage = computed(() => props.images[currentIndex.value])
const hasPrevious = computed(() => currentIndex.value > 0)
const hasNext = computed(() => currentIndex.value < props.images.length - 1)

function previous() {
  if (hasPrevious.value) currentIndex.value--
}

function next() {
  if (hasNext.value) currentIndex.value++
}

function handleKeydown(e: KeyboardEvent) {
  if (!open.value) return
  if (e.key === 'ArrowLeft') previous()
  if (e.key === 'ArrowRight') next()
  if (e.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

watch(() => props.initialIndex, (val) => {
  currentIndex.value = val
})
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 border-none bg-black/95 shadow-none">
      <!-- Close button -->
      <button
        @click="open = false"
        class="absolute top-4 right-4 z-50 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
      >
        <X class="h-5 w-5" />
      </button>

      <!-- Image counter (if multiple) -->
      <div
        v-if="images.length > 1"
        class="absolute top-4 left-4 z-50 rounded-full bg-black/50 px-3 py-1 text-sm text-white"
      >
        {{ currentIndex + 1 }} / {{ images.length }}
      </div>

      <!-- Navigation arrows -->
      <button
        v-if="hasPrevious"
        @click="previous"
        class="absolute left-4 top-1/2 z-50 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
      >
        <ChevronLeft class="h-6 w-6" />
      </button>
      <button
        v-if="hasNext"
        @click="next"
        class="absolute right-4 top-1/2 z-50 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
      >
        <ChevronRight class="h-6 w-6" />
      </button>

      <!-- Image - centered -->
      <div v-if="currentImage" class="absolute inset-0 flex items-center justify-center">
        <img
          :src="currentImage.url"
          :alt="currentImage.filename"
          class="max-h-[90vh] max-w-[90vw] object-contain"
        />
      </div>

      <!-- Bottom toolbar -->
      <div v-if="currentImage" class="absolute bottom-4 left-1/2 z-50 flex -translate-x-1/2 gap-2 rounded-full bg-black/50 px-4 py-2">
        <a
          :href="currentImage.url"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-2 text-sm text-white hover:text-white/80 transition-colors"
        >
          <ExternalLink class="h-4 w-4" />
          Open in new tab
        </a>
      </div>
    </DialogContent>
  </Dialog>
</template>
