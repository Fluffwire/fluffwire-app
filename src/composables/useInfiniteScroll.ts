import { ref, onMounted, onUnmounted, type Ref } from 'vue'

export function useInfiniteScroll(
  containerRef: Ref<HTMLElement | null>,
  loadMore: () => Promise<void>,
  options: { threshold?: number; direction?: 'top' | 'bottom' } = {}
) {
  const { threshold = 100, direction = 'top' } = options
  const isLoadingMore = ref(false)

  async function handleScroll() {
    const el = containerRef.value
    if (!el || isLoadingMore.value) return

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
          // Maintain scroll position after prepending
          const newScrollHeight = el.scrollHeight
          el.scrollTop = newScrollHeight - prevScrollHeight
        }
      } finally {
        isLoadingMore.value = false
      }
    }
  }

  onMounted(() => {
    containerRef.value?.addEventListener('scroll', handleScroll, { passive: true })
  })

  onUnmounted(() => {
    containerRef.value?.removeEventListener('scroll', handleScroll)
  })

  return { isLoadingMore }
}
