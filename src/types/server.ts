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
  nickname: string | null
  roles: string[]
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
}

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
