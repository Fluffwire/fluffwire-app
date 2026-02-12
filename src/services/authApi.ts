import api from './api'
import { API } from '@/constants/endpoints'
import type { LoginCredentials, RegisterCredentials, AuthTokens, CurrentUser } from '@/types'

export const authApi = {
  login(credentials: LoginCredentials): Promise<{ data: AuthTokens & { user: CurrentUser } }> {
    return api.post(API.AUTH.LOGIN, credentials)
  },

  register(credentials: RegisterCredentials): Promise<{ data: AuthTokens & { user: CurrentUser } }> {
    return api.post(API.AUTH.REGISTER, credentials)
  },

  logout(): Promise<void> {
    return api.post(API.AUTH.LOGOUT)
  },

  getMe(): Promise<{ data: CurrentUser }> {
    return api.get(API.AUTH.ME)
  },

  refresh(refreshToken: string): Promise<{ data: AuthTokens }> {
    return api.post(API.AUTH.REFRESH, { refreshToken })
  },
}
