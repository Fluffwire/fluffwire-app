import { ref, onBeforeUnmount } from 'vue'

export function useIdleDetection(timeoutMs = 5 * 60 * 1000) {
  const isIdle = ref(false)
  let timer: ReturnType<typeof setTimeout> | null = null

  function resetTimer() {
    if (isIdle.value) isIdle.value = false
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      isIdle.value = true
    }, timeoutMs)
  }

  function handleVisibility() {
    if (document.hidden) {
      // Start idle countdown immediately when tab is hidden
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        isIdle.value = true
      }, timeoutMs)
    } else {
      resetTimer()
    }
  }

  const events = ['mousemove', 'keydown', 'click', 'scroll'] as const
  events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }))
  document.addEventListener('visibilitychange', handleVisibility)
  resetTimer()

  onBeforeUnmount(() => {
    events.forEach((e) => window.removeEventListener(e, resetTimer))
    document.removeEventListener('visibilitychange', handleVisibility)
    if (timer) clearTimeout(timer)
  })

  return { isIdle }
}
