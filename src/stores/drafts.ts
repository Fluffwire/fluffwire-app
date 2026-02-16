import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_PREFIX = 'fluffwire-draft:'
const MAX_DRAFT_LENGTH = 10000 // 10KB limit per draft

export const useDraftsStore = defineStore('drafts', () => {
  // In-memory cache of drafts (channelId → draft text)
  const drafts = ref(new Map<string, string>())

  // Get draft for channel
  function getDraft(channelId: string): string {
    // Check memory first
    if (drafts.value.has(channelId)) {
      return drafts.value.get(channelId) ?? ''
    }

    // Check localStorage
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${channelId}`)
    if (stored) {
      drafts.value.set(channelId, stored)
      return stored
    }

    return ''
  }

  // Set draft for channel
  function setDraft(channelId: string, text: string) {
    if (text.length > MAX_DRAFT_LENGTH) {
      console.warn('Draft too long, truncating')
      text = text.substring(0, MAX_DRAFT_LENGTH)
    }

    if (text.trim() === '') {
      clearDraft(channelId)
      return
    }

    drafts.value.set(channelId, text)
    localStorage.setItem(`${STORAGE_PREFIX}${channelId}`, text)
  }

  // Clear draft for channel
  function clearDraft(channelId: string) {
    drafts.value.delete(channelId)
    localStorage.removeItem(`${STORAGE_PREFIX}${channelId}`)
  }

  // Clear all drafts for deleted channel (called from CHANNEL_DELETE handler)
  function clearDraftsForChannel(channelId: string) {
    clearDraft(channelId)
  }

  return {
    getDraft,
    setDraft,
    clearDraft,
    clearDraftsForChannel,
  }
})
