import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUiStore } from '@/stores/ui'

vi.mock('@/composables/useTheme', () => ({
  useTheme: () => ({
    theme: { value: 'dark' },
    setTheme: vi.fn(),
  }),
}))

describe('ui store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('starts with no active modal', () => {
    const store = useUiStore()
    expect(store.activeModal).toBeNull()
    expect(store.modalData).toBeNull()
  })

  it('openModal sets activeModal and data', () => {
    const store = useUiStore()
    store.openModal('createServer', { prefill: 'My Server' })
    expect(store.activeModal).toBe('createServer')
    expect(store.modalData).toEqual({ prefill: 'My Server' })
  })

  it('openModal with no data sets modalData to null', () => {
    const store = useUiStore()
    store.openModal('joinServer')
    expect(store.activeModal).toBe('joinServer')
    expect(store.modalData).toBeNull()
  })

  it('closeModal clears activeModal and data', () => {
    const store = useUiStore()
    store.openModal('createServer', { foo: 'bar' })
    store.closeModal()
    expect(store.activeModal).toBeNull()
    expect(store.modalData).toBeNull()
  })

  it('toggleMemberSidebar flips visibility', () => {
    const store = useUiStore()
    const initial = store.showMemberSidebar
    store.toggleMemberSidebar()
    expect(store.showMemberSidebar).toBe(!initial)
    store.toggleMemberSidebar()
    expect(store.showMemberSidebar).toBe(initial)
  })

  it('opening a second modal replaces the first', () => {
    const store = useUiStore()
    store.openModal('modalA')
    store.openModal('modalB', { x: 1 })
    expect(store.activeModal).toBe('modalB')
    expect(store.modalData).toEqual({ x: 1 })
  })
})
