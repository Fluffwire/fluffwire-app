import { onMounted, onUnmounted } from 'vue'
import { useUiStore } from '@/stores/ui'
import { useResponsive } from '@/composables/useResponsive'

const EDGE_THRESHOLD = 10
const SWIPE_MIN = 60

export function useSwipePanel() {
  const uiStore = useUiStore()
  const { isMobile } = useResponsive()
  let startX = 0
  let startY = 0
  let startTime = 0

  function onTouchStart(e: TouchEvent) {
    const touch = e.touches[0]
    if (!touch) return
    startX = touch.clientX
    startY = touch.clientY
    startTime = Date.now()
  }

  function onTouchEnd(e: TouchEvent) {
    if (!isMobile.value) return
    const touch = e.changedTouches[0]
    if (!touch) return

    const endX = touch.clientX
    const endY = touch.clientY
    const dx = endX - startX
    const dy = endY - startY
    const endTime = Date.now()

    // Must be more horizontal than vertical
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dy) > Math.abs(dx)) return

    const screenWidth = window.innerWidth
    const velocity = Math.abs(dx) / (endTime - startTime)

    // Right swipe from left edge → open left panel
    if (dx > 0 && startX < EDGE_THRESHOLD) {
      uiStore.isMobileSidebarOpen = true
    }

    // Left swipe from right edge → open member sidebar (requires velocity)
    if (dx < 0 && startX > screenWidth - EDGE_THRESHOLD && velocity > 0.5) {
      uiStore.showMemberSidebar = true
    }
  }

  onMounted(() => {
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
  })

  onUnmounted(() => {
    document.removeEventListener('touchstart', onTouchStart)
    document.removeEventListener('touchend', onTouchEnd)
  })
}
