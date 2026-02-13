const REMEMBER_KEY = 'fluffwire-remember'

export function isRememberMe(): boolean {
  return localStorage.getItem(REMEMBER_KEY) !== 'false'
}

export function setRememberMe(value: boolean): void {
  localStorage.setItem(REMEMBER_KEY, String(value))
}

/**
 * Returns the correct storage backend based on the "remember me" preference.
 * When rememberMe is true (default), uses localStorage (persists across browser close).
 * When false, uses sessionStorage (cleared on browser close).
 */
export function getTokenStorage(): Storage {
  return isRememberMe() ? localStorage : sessionStorage
}
