import { describe, it, expect, beforeEach } from 'vitest'
import { isRememberMe, setRememberMe, getTokenStorage } from '@/services/tokenStorage'

describe('tokenStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('isRememberMe returns true when not set (default)', () => {
    expect(isRememberMe()).toBe(true)
  })

  it('isRememberMe returns false after setRememberMe(false)', () => {
    setRememberMe(false)
    expect(isRememberMe()).toBe(false)
  })

  it('isRememberMe returns true after setRememberMe(true)', () => {
    setRememberMe(false)
    setRememberMe(true)
    expect(isRememberMe()).toBe(true)
  })

  it('setRememberMe persists to localStorage', () => {
    setRememberMe(false)
    expect(localStorage.setItem).toHaveBeenCalledWith('fluffwire-remember', 'false')
  })

  it('getTokenStorage returns localStorage when rememberMe is true', () => {
    setRememberMe(true)
    const storage = getTokenStorage()
    expect(storage).toBe(localStorage)
  })

  it('getTokenStorage returns sessionStorage when rememberMe is false', () => {
    setRememberMe(false)
    const storage = getTokenStorage()
    expect(storage).toBe(sessionStorage)
  })
})
