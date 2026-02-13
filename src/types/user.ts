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
  deleteScheduledAt?: string | null
}

export interface UserSettings {
  theme: 'dark' | 'light'
  inputDevice?: string
  outputDevice?: string
  inputVolume: number
  outputVolume: number
  noiseSuppression: boolean
  echoCancellation: boolean
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
