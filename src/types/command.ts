export type CommandOptionType = 'string' | 'integer' | 'boolean' | 'user' | 'channel' | 'label'

export interface CommandOption {
  name: string
  description: string
  type: CommandOptionType
  required: boolean
  minLength?: number
  maxLength?: number
  minValue?: number
  maxValue?: number
}

export interface BotCommand {
  id: string
  botId: string
  name: string
  description: string
  options: CommandOption[]
  minTier: 'member' | 'moderator' | 'admin' | 'owner'
  createdAt: string
  updatedAt: string
  bot?: {
    id: string
    name: string
    avatar?: string
  }
}

export interface CommandInvocation {
  id: string
  commandId: string
  userId: string
  serverId: string
  channelId: string
  invokedAt: string
}
