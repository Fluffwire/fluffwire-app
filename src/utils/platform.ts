declare global {
  interface Window {
    __TAURI__?: unknown
    __TAURI_INTERNALS__?: unknown
  }
}

// Check dynamically at runtime - MUST be a function to avoid module load time evaluation
// Tauri v2 sets both __TAURI__ and __TAURI_INTERNALS__
export function isTauri(): boolean {
  return typeof window !== 'undefined' && (
    typeof window.__TAURI__ !== 'undefined' ||
    typeof window.__TAURI_INTERNALS__ !== 'undefined'
  )
}

