import api from './api'

export async function resendVerification(): Promise<void> {
  await api.post('/auth/verify/resend')
}

export async function verifyEmail(token: string): Promise<void> {
  await api.get(`/auth/verify/${token}`)
}
