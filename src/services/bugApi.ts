import api from './api'
import type { SystemInfo } from '@/utils/systemInfo'

export interface BugReport {
  title: string
  description: string
  systemInfo: string
}

export interface BugReportResponse {
  issueUrl: string
  issueNumber: number
}

export async function reportBug(
  title: string,
  description: string,
  systemInfo: SystemInfo
): Promise<BugReportResponse> {
  const { data } = await api.post<BugReportResponse>('/bugs/report', {
    title,
    description,
    systemInfo: JSON.stringify(systemInfo, null, 2),
  })
  return data
}
