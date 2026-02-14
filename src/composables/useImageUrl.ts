import { ref, watch, type Ref } from 'vue'
import { isTauri } from '@/utils/platform'

export function useImageUrl(sourceUrl: Ref<string | null>) {
  const imageUrl = ref<string | null>(null)

  watch(
    sourceUrl,
    (url) => {
      // In Tauri, CORS is not enforced, so we can use images directly
      // No need for blob URL conversion
      if (isTauri) {
        imageUrl.value = url
      } else {
        // In browser, also use direct URLs since nginx CORS is configured
        imageUrl.value = url
      }
    },
    { immediate: true }
  )

  return imageUrl
}
