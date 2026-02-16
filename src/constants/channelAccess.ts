import type { ChannelAccessMode } from '@/types/message'

export const ChannelAccessModes = {
  OPEN: 'open',
  READ_ONLY: 'read_only',
  PRIVATE: 'private',
  RESTRICTED_WRITE: 'restricted_write',
} as const

export const AccessModeLabels: Record<ChannelAccessMode, string> = {
  open: 'Open',
  read_only: 'Read-only',
  private: 'Private',
  restricted_write: 'Restricted Write',
}

export const AccessModeDescriptions: Record<ChannelAccessMode, string> = {
  open: 'All members can read and write',
  read_only: 'All can read, only Owner/Admin/Moderator can write',
  private: 'Only whitelisted users/labels can access',
  restricted_write: 'All can read, only whitelisted users/labels can write',
}

export const AccessModeIcons: Record<ChannelAccessMode, string> = {
  open: 'unlock',
  read_only: 'eye',
  private: 'lock',
  restricted_write: 'shield',
}
