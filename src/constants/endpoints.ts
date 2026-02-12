export const API = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
  },
  USERS: {
    BASE: '/users',
    BY_ID: (id: string) => `/users/${id}`,
    SETTINGS: '/users/@me/settings',
  },
  SERVERS: {
    BASE: '/servers',
    BY_ID: (id: string) => `/servers/${id}`,
    MEMBERS: (id: string) => `/servers/${id}/members`,
    INVITES: (id: string) => `/servers/${id}/invites`,
    JOIN: '/servers/join',
  },
  CHANNELS: {
    BY_SERVER: (serverId: string) => `/servers/${serverId}/channels`,
    BY_ID: (channelId: string) => `/channels/${channelId}`,
    MESSAGES: (channelId: string) => `/channels/${channelId}/messages`,
    MESSAGE_BY_ID: (channelId: string, messageId: string) =>
      `/channels/${channelId}/messages/${messageId}`,
    TYPING: (channelId: string) => `/channels/${channelId}/typing`,
  },
  FRIENDS: {
    BASE: '/friends',
    REQUESTS: '/friends/requests',
    BY_ID: (id: string) => `/friends/${id}`,
    ACCEPT: (id: string) => `/friends/requests/${id}/accept`,
    REJECT: (id: string) => `/friends/requests/${id}/reject`,
  },
  DM: {
    BASE: '/dm',
    BY_ID: (id: string) => `/dm/${id}`,
    MESSAGES: (id: string) => `/dm/${id}/messages`,
  },
} as const
