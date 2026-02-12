import { ref, onMounted, onUnmounted, nextTick, type Ref } from 'vue'

export function useInfiniteScroll(
  containerRef: Ref<HTMLElement | null>,
  loadMore: () => Promise<void>,
  options: { threshold?: number; direction?: 'top' | 'bottom' } = {}
) {
  const { threshold = 100, direction = 'top' } = options
  const isLoadingMore = ref(false)
  let scrollTimeout: number | null = null

  async function handleScroll() {
    const el = containerRef.value
    if (!el || isLoadingMore.value) return

    // Debounce scroll events
    if (scrollTimeout !== null) {
      clearTimeout(scrollTimeout)
    }

    scrollTimeout = window.setTimeout(async () => {
      const shouldLoad =
        direction === 'top'
          ? el.scrollTop < threshold
          : el.scrollHeight - el.scrollTop - el.clientHeight < threshold

      if (shouldLoad) {
        isLoadingMore.value = true
        const prevScrollHeight = el.scrollHeight
        try {
          await loadMore()
          if (direction === 'top') {
            // Wait for DOM to update before adjusting scroll position
            await nextTick()
            const newScrollHeight = el.scrollHeight
            el.scrollTop = newScrollHeight - prevScrollHeight
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
