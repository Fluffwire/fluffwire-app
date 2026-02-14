import { ref, watch, onUnmounted, type Ref } from 'vue'
import { isTauri } from '@/utils/platform'

const blobCache = new Map<string, string>()

export function useImageUrl(sourceUrl: Ref<string | null>) {
  const imageUrl = ref<string | null>(null)

  async function loadImageTauri(url: string) {
    // Return cached blob URL if available
    if (blobCache.has(url)) {
      imageUrl.value = blobCache.get(url)!
      return
    }

    try {
      // Use Tauri HTTP plugin to fetch the image
      const { fetch } = await import('@tauri-apps/plugin-http')

      const response = await fetch(url, {
        method: 'GET',
      })

      if (!response.ok) {
        console.error('[useImageUrl] Failed to load image:', url, response.status)
        imageUrl.value = null
        return
      }

      // Get response as blob
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)

      blobCache.set(url, objectUrl)
      imageUrl.value = objectUrl
    } catch (error) {
      console.error('[useImageUrl] Failed to load image:', url, error)
      imageUrl.value = null
    }
  }

  watch(
    sourceUrl,
    (url) => {
      if (!url) {
        imageUrl.value = null
        return
      }

      if (isTauri() && url.startsWith('https://')) {
        // In Tauri, fetch external images via HTTP plugin and convert to blob URLs
        loadImageTauri(url)
      } else {
        // In browser, use direct URLs (nginx CORS is configured)
        imageUrl.value = url
      }
    },
    { immediate: true }
  )

  onUnmounted(() => {
    // Don't revoke blob URLs - keep in cache for reuse
  })

  return imageUrl
}
