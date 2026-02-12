import { ref, onUnmounted } from 'vue'

export interface ContextMenuItem {
  label: string
  icon?: string
  action: () => void
  danger?: boolean
  separator?: boolean
}

export function useContextMenu() {
  const isOpen = ref(false)
  const position = ref({ x: 0, y: 0 })
  const items = ref<ContextMenuItem[]>([])

  function open(event: MouseEvent, menuItems: ContextMenuItem[]) {
    event.preventDefault()
    position.value = { x: event.clientX, y: event.clientY }
    items.value = menuItems
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
    items.value = []
  }

  function handleClickOutside() {
    close()
  }

  document.addEventListener('click', handleClickOutside)
  onUnmounted(() => document.removeEventListener('click', handleClickOutside))

  return {
    isOpen,
    position,
    items,
    open,
    close,
  }
}
