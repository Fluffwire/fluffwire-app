import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useTheme, type ThemeName } from '@/composables/useTheme'

export const useUiStore = defineStore('ui', () => {
  const showMemberSidebar = ref(false)
  const activeModal = ref<string | null>(null)
  const modalData = ref<unknown>(null)
  const isMobileSidebarOpen = ref(false)
  const isChannelSidebarOpen = ref(false)
  const isMobileView = ref(false)
  const isTabletView = ref(false)

  const { theme, setTheme: applyTheme } = useTheme()

  function toggleMemberSidebar() {
    showMemberSidebar.value = !showMemberSidebar.value
  }

  function openModal(name: string, data?: unknown) {
    activeModal.value = name
    modalData.value = data ?? null
  }

  function closeModal() {
    activeModal.value = null
    modalData.value = null
  }

  function setTheme(name: ThemeName) {
    applyTheme(name)
  }

  return {
    showMemberSidebar,
    activeModal,
    modalData,
    isMobileSidebarOpen,
    isChannelSidebarOpen,
    isMobileView,
    isTabletView,
    theme,
    toggleMemberSidebar,
    openModal,
    closeModal,
    setTheme,
  }
})
