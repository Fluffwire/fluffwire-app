export const Permissions = {
  VIEW_CHANNELS: 1 << 0,
  SEND_MESSAGES: 1 << 1,
  MANAGE_MESSAGES: 1 << 2,
  MANAGE_CHANNELS: 1 << 3,
  MANAGE_SERVER: 1 << 4,
  KICK_MEMBERS: 1 << 5,
  BAN_MEMBERS: 1 << 6,
  CREATE_INVITES: 1 << 7,
  MANAGE_ROLES: 1 << 8,
  MANAGE_WEBHOOKS: 1 << 9,
  PIN_MESSAGES: 1 << 10,
  ATTACH_FILES: 1 << 11,
  ADD_REACTIONS: 1 << 12,
  MENTION_EVERYONE: 1 << 13,
  VOICE_CONNECT: 1 << 14,
  VOICE_SPEAK: 1 << 15,
  VOICE_MUTE_MEMBERS: 1 << 16,
  VOICE_DEAF_MEMBERS: 1 << 17,
  ADMIN: 1 << 18,
} as const

export type Permission = (typeof Permissions)[keyof typeof Permissions]

export function hasPermission(perms: number, perm: number): boolean {
  if (perms & Permissions.ADMIN) return true
  return (perms & perm) !== 0
}

export const PermissionLabels: Record<string, string> = {
  VIEW_CHANNELS: 'View Channels',
  SEND_MESSAGES: 'Send Messages',
  MANAGE_MESSAGES: 'Manage Messages',
  MANAGE_CHANNELS: 'Manage Channels',
  MANAGE_SERVER: 'Manage Server',
  KICK_MEMBERS: 'Kick Members',
  BAN_MEMBERS: 'Ban Members',
  CREATE_INVITES: 'Create Invites',
  MANAGE_ROLES: 'Manage Roles',
  MANAGE_WEBHOOKS: 'Manage Webhooks',
  PIN_MESSAGES: 'Pin Messages',
  ATTACH_FILES: 'Attach Files',
  ADD_REACTIONS: 'Add Reactions',
  MENTION_EVERYONE: 'Mention @everyone',
  VOICE_CONNECT: 'Voice Connect',
  VOICE_SPEAK: 'Voice Speak',
  VOICE_MUTE_MEMBERS: 'Voice Mute Members',
  VOICE_DEAF_MEMBERS: 'Voice Deafen Members',
  ADMIN: 'Administrator',
}
