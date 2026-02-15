import api from './api'

export async function requestReset(email: string): Promise<void> {
  await api.post('/auth/password/reset-request', { email })
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    const response = await api.get(`/auth/password/verify/${token}`)
    return response.data.valid === true
  } catch {
    return false
  }
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await api.post('/auth/password/reset', { token, password })
}
