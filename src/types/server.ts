export interface Server {
  id: string
  name: string
  icon: string | null
  ownerId: string
  memberCount: number
  createdAt: string
}

export interface ServerMember {
  userId: string
  serverId: string
  tier: 'owner' | 'admin' | 'moderator' | 'member'
  nickname: string | null
  labels: string[]
  joinedAt: string
}

export interface CreateServerPayload {
  name: string
  icon?: string
}

export interface JoinServerPayload {
  inviteCode: string
}

export interface ServerInvite {
  code: string
  serverId: string
  creatorId: string
  expiresAt: string | null
  maxUses: number | null
  uses: number
  createdAt?: string
  creatorName?: string
}

export interface Label {
  id: string
  serverId: string
  name: string
  color?: string
  position: number
  isEveryone: boolean
  createdBy?: string
  createdAt: string
}

// Keep Role as an alias for backward compatibility during transition
export type Role = Label

export interface Webhook {
  id: string
  serverId: string
  channelId: string
  name: string
  token: string
  avatar: string | null
  createdBy: string
  createdAt: string
}
