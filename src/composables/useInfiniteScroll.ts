import { ref, onMounted, onUnmounted, nextTick, type Ref } from 'vue'

export function useInfiniteScroll(
  containerRef: Ref<HTMLElement | null>,
  loadMore: () => Promise<void>,
  options: { threshold?: number; direction?: 'top' | 'bottom'; enabled?: Ref<boolean> } = {}
) {
  const { threshold = 100, direction = 'top', enabled } = options
  const isLoadingMore = ref(false)
  let scrollTimeout: number | null = null

  async function handleScroll() {
    const el = containerRef.value
    if (!el || isLoadingMore.value) return
    if (enabled && !enabled.value) return

    // Debounce scroll events
    if (scrollTimeout !== null) {
      clearTimeout(scrollTimeout)
    }

    scrollTimeout = window.setTimeout(async () => {
      const el2 = containerRef.value
      if (!el2 || isLoadingMore.value) return
      if (enabled && !enabled.value) return

      const shouldLoad =
        direction === 'top'
          ? el2.scrollTop < threshold
          : el2.scrollHeight - el2.scrollTop - el2.clientHeight < threshold

      if (shouldLoad) {
        isLoadingMore.value = true
        const prevScrollHeight = el2.scrollHeight
        try {
          await loadMore()
          if (direction === 'top') {
            // Wait for DOM to update before adjusting scroll position
            await nextTick()
            const newScrollHeight = el2.scrollHeight
            // Add the height delta to current scrollTop to maintain visual position
            // (user may have scrolled during the async load)
            el2.scrollTop += (newScrollHeight - prevScrollHeight)
          }
        } finally {
          isLoadingMore.value = false
        }
      }
    }, 50) // 50ms debounce
  }

  onMounted(() => {
    containerRef.value?.addEventListener('scroll', handleScroll, { passive: true })
  })

  onUnmounted(() => {
    containerRef.value?.removeEventListener('scroll', handleScroll)
  })

  return { isLoadingMore }
}
