export interface Bot {
  id: string
  name: string
  avatar: string | null
  description?: string
  ownerId: string
  createdAt: string
}

export interface BotWithToken extends Bot {
  token: string  // Only returned on create/regenerate
}

export interface BotMember {
  botId: string
  serverId: string
  addedBy: string | null
  addedAt: string
  bot: Bot
  status?: string  // online/offline presence status
}

export interface BotMemberDisplay {
  type: 'bot'
  userId: string  // Use botId for compatibility
  serverId: string
  bot: Bot
  addedAt: string
}

export interface CreateBotPayload {
  name: string
  description?: string
}

export interface UpdateBotPayload {
  name?: string
  description?: string
  avatar?: string
}
