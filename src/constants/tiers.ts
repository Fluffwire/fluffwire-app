export const Tiers = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  MEMBER: 'member',
} as const

export type Tier = typeof Tiers[keyof typeof Tiers]

export function canManageServer(tier: Tier): boolean {
  return tier === 'owner' || tier === 'admin'
}

export function canManageChannels(tier: Tier): boolean {
  return tier === 'owner' || tier === 'admin'
}

export function canManageMessages(tier: Tier): boolean {
  return tier === 'owner' || tier === 'admin' || tier === 'moderator'
}

export function canKickMembers(tier: Tier): boolean {
  return tier === 'owner' || tier === 'admin' || tier === 'moderator'
}

export function canBanMembers(tier: Tier): boolean {
  return tier === 'owner' || tier === 'admin'
}

export function canManageLabels(tier: Tier): boolean {
  return tier === 'owner' || tier === 'admin'
}

export function canBypassChannelRestrictions(tier: Tier): boolean {
  return tier === 'owner' || tier === 'admin' || tier === 'moderator'
}

export function canDeleteServer(tier: Tier): boolean {
  return tier === 'owner'
}

export function canTransferOwnership(tier: Tier): boolean {
  return tier === 'owner'
}

// Translation keys for tier labels (use with $t() in components)
export const TierLabelKeys: Record<Tier, string> = {
  owner: 'members.owner',
  admin: 'members.admin',
  moderator: 'members.moderator',
  member: 'members.member',
}

export const TierColors: Record<Tier, string> = {
  owner: 'text-yellow-400',
  admin: 'text-red-400',
  moderator: 'text-blue-400',
  member: 'text-gray-400',
}
