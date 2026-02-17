<script setup lang="ts">
import { ref, watch, nextTick, onUnmounted } from 'vue'
import { Loader2, AlertCircle } from 'lucide-vue-next'

interface Props {
  stream: MediaStream | null | undefined
  preview?: boolean
  label?: string
  autoplay?: boolean
  muted?: boolean
  objectFit?: 'contain' | 'cover'
  skipMutedCheck?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  preview: false,
  label: 'Video stream',
  autoplay: true,
  muted: false,
  objectFit: 'contain',
  skipMutedCheck: false,
})

type VideoState = 'empty' | 'loading' | 'playing' | 'error'

const videoRef = ref<HTMLVideoElement | null>(null)
const state = ref<VideoState>('empty')
const lastError = ref<Error | null>(null)
const retryCount = ref(0)
const MAX_RETRIES = 3

// Track cleanup handlers to prevent memory leaks
let trackEndedHandler: (() => void) | null = null
let trackUnmuteHandler: (() => void) | null = null

// Define helper functions BEFORE setupStream (they need to be hoisted)
async function playVideo() {
  const video = videoRef.value

  if (!video) {
    console.warn('[VideoStream] playVideo called but video element is null')
    return
  }

  // Wait for video to have data before playing
  if (video.readyState < 2) {
    await new Promise<void>((resolve) => {
      let timeoutId: number | undefined

      const onCanPlay = () => {
        video.removeEventListener('canplay', onCanPlay)
        if (timeoutId) clearTimeout(timeoutId)
        resolve()
      }
      video.addEventListener('canplay', onCanPlay, { once: true })

      // Timeout after 5 seconds if no data
      timeoutId = setTimeout(() => {
        console.error('[VideoStream] TIMEOUT: canplay event never fired after 5s - NO DATA RECEIVED!')
        resolve()
      }, 5000) as unknown as number
    })
  }

  try {
    await video.play()
    state.value = 'playing'
    retryCount.value = 0
    lastError.value = null
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error('[VideoStream] Play failed:', error)
    state.value = 'error'
    lastError.value = error
  }
}

function retryPlay() {
  if (retryCount.value >= MAX_RETRIES) {
    return
  }

  retryCount.value++

  if (props.stream) {
    setupStream(props.stream)
  }
}

function cleanup() {
  const video = videoRef.value
  if (video) {
    video.pause()
    video.srcObject = null
  }

  // Remove track event listeners
  if (props.stream) {
    const videoTrack = props.stream.getVideoTracks()[0]
    if (videoTrack) {
      if (trackEndedHandler) {
        videoTrack.removeEventListener('ended', trackEndedHandler)
        trackEndedHandler = null
      }
      if (trackUnmuteHandler) {
        videoTrack.removeEventListener('unmute', trackUnmuteHandler)
        trackUnmuteHandler = null
      }
    }
  }
}

async function setupStream(stream: MediaStream | null | undefined) {
  // Cleanup previous stream
  cleanup()

  // Handle empty stream
  if (!stream) {
    state.value = 'empty'
    return
  }

  state.value = 'loading'

  // Wait for video element to mount
  await nextTick()

  const video = videoRef.value
  if (!video) {
    console.warn('[VideoStream] Video element not mounted')
    return
  }

  // Attach stream to video element
  video.srcObject = stream

  const videoTrack = stream.getVideoTracks()[0]
  if (!videoTrack) {
    console.warn('[VideoStream] No video track in stream')
    state.value = 'error'
    lastError.value = new Error('No video track found')
    return
  }

  // Set up track ended handler
  trackEndedHandler = () => {
    cleanup()
    state.value = 'empty'
  }
  videoTrack.addEventListener('ended', trackEndedHandler)

  // If track is muted, wait for unmute before playing (unless skipMutedCheck is true)
  if (videoTrack.muted && !props.skipMutedCheck) {
    trackUnmuteHandler = async () => {
      await playVideo()
    }
    videoTrack.addEventListener('unmute', trackUnmuteHandler, { once: true })
  } else {
    // Track is ready (or we're skipping muted check), play immediately
    await playVideo()
  }
}

// Watch for stream changes
watch(() => props.stream, setupStream, { immediate: true })

// Cleanup on unmount
onUnmounted(() => {
  cleanup()
})
</script>

<template>
  <div
    :class="[
      'video-stream-container relative',
      preview ? 'h-full w-full' : 'flex items-center justify-center',
    ]"
  >
    <!-- Loading state -->
    <div
      v-if="state === 'loading'"
      class="flex items-center justify-center p-4"
    >
      <slot name="loading">
        <div class="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 class="h-8 w-8 animate-spin" />
          <span class="text-sm">Loading video...</span>
        </div>
      </slot>
    </div>

    <!-- Error state -->
    <div
      v-else-if="state === 'error'"
      class="flex items-center justify-center p-4"
    >
      <slot name="error" :error="lastError" :retry="retryPlay">
        <div class="flex flex-col items-center gap-2 text-destructive">
          <AlertCircle class="h-8 w-8" />
          <span class="text-sm">Failed to load video</span>
          <button
            v-if="retryCount < MAX_RETRIES"
            class="mt-2 rounded-md bg-destructive px-3 py-1 text-sm text-destructive-foreground hover:bg-destructive/90"
            @click="retryPlay"
          >
            Retry
          </button>
        </div>
      </slot>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="state === 'empty'"
      class="flex items-center justify-center p-4"
    >
      <slot name="empty">
        <div class="text-sm text-muted-foreground">No stream</div>
      </slot>
    </div>

    <!-- Video element (always present, hidden when not playing) -->
    <video
      ref="videoRef"
      :class="[
        state !== 'playing' && 'hidden',
        objectFit === 'contain' ? 'object-contain' : 'object-cover',
        preview ? 'h-full w-full' : 'max-h-full max-w-full',
      ]"
      :autoplay="autoplay"
      :muted="muted"
      playsinline
      :aria-label="label"
    />
  </div>
</template>
