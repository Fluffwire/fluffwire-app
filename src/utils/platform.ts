declare global {
  interface Window {
    __TAURI__?: unknown
  }
}

export const isTauri = !!window.__TAURI__

