import { ref, onMounted, onUnmounted, readonly } from 'vue'
import { useUiStore } from '@/stores/ui'

const isMobile = ref(false)
const isTablet = ref(false)
const isDesktop = ref(true)

let initialized = false

export function useResponsive() {
  const uiStore = useUiStore()

  function update() {
    const w = window.innerWidth
    const wasMobile = isMobile.value
    const wasTablet = isTablet.value

    isMobile.value = w < 768
    isTablet.value = w >= 768 && w < 1024
    isDesktop.value = w >= 1024

    uiStore.isMobileView = isMobile.value
    uiStore.isTabletView = isTablet.value

    // Auto-close sidebars when transitioning to smaller breakpoints
    if (isMobile.value && !wasMobile) {
      uiStore.isChannelSidebarOpen = false
      uiStore.isMobileSidebarOpen = false
    }
    if (isTablet.value && !wasTablet) {
      uiStore.isChannelSidebarOpen = false
    }
  }

  onMounted(() => {
    if (!initialized) {
      update()
      initialized = true
    }
    window.addEventListener('resize', update)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', update)
  })

  return {
    isMobile: readonly(isMobile),
    isTablet: readonly(isTablet),
    isDesktop: readonly(isDesktop),
  }
}
