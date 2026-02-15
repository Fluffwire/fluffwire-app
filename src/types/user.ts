export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline'

export interface User {
  id: string
  username: string
  displayName: string
  avatar: string | null
  bio?: string
  status: UserStatus
  customStatus?: string
  createdAt: string
}

export interface CurrentUser extends User {
  email: string
  emailVerified: boolean
  deleteScheduledAt?: string | null
  totpEnabled: boolean
}

export interface SessionInfo {
  id: string
  userAgent: string
  ipAddress: string
  createdAt: string
  lastUsedAt: string
  isCurrent: boolean
}

export interface TotpSetup {
  secret: string
  qrUri: string
  backupCodes: string[]
}

export interface UserSettings {
  theme: 'dark' | 'light'
  inputDevice?: string
  outputDevice?: string
  inputVolume: number
  outputVolume: number
  noiseSuppression: boolean
  echoCancellation: boolean
  serverOrder: string[]
  userStatus: string
  voiceMode: 'voice-activity' | 'push-to-talk'
  vadThreshold: number
  pttKey: string
  notificationSound: boolean
  notificationDesktop: boolean
  showOnlineStatus: boolean
  allowFriendRequests: boolean
  allowDMsFromServerMembers: boolean
  autoStartEnabled?: boolean // Desktop only - start app on system startup
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  username: string
  password: string
}
