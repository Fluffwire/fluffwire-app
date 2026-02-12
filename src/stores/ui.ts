import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Toast {
  id: string
  type: 'success' | 'error' | 'info'
  message: string
  duration?: number
}

export const useUiStore = defineStore('ui', () => {
  const showMemberSidebar = ref(true)
  const activeModal = ref<string | null>(null)
  const modalData = ref<unknown>(null)
  const toasts = ref<Toast[]>([])
  const isMobileSidebarOpen = ref(false)

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

  function addToast(toast: Omit<Toast, 'id'>) {
    const id = Date.now().toString(36)
    toasts.value.push({ ...toast, id })
    setTimeout(() => {
      removeToast(id)
    }, toast.duration ?? 5000)
  }

  function removeToast(id: string) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return {
    showMemberSidebar,
    activeModal,
    modalData,
    toasts,
    isMobileSidebarOpen,
    toggleMemberSidebar,
    openModal,
    closeModal,
    addToast,
    removeToast,
  }
})
