declare global {
  interface Window {
    __TAURI__?: unknown
    __TAURI_INTERNALS__?: unknown
  }
}

// Check dynamically at runtime instead of module load time
// Tauri v2 sets both __TAURI__ and __TAURI_INTERNALS__
export const isTauri = typeof window !== 'undefined' && (
  typeof window.__TAURI__ !== 'undefined' ||
  typeof window.__TAURI_INTERNALS__ !== 'undefined'
)

