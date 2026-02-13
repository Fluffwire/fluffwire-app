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
    PROFILE: '/users/@me',
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
    ACK: (channelId: string) => `/channels/${channelId}/ack`,
    REORDER: (serverId: string) => `/servers/${serverId}/channels/reorder`,
    PIN: (channelId: string, messageId: string) => `/channels/${channelId}/messages/${messageId}/pin`,
    PINS: (channelId: string) => `/channels/${channelId}/pins`,
    SEARCH: (channelId: string) => `/channels/${channelId}/messages/search`,
  },
  CATEGORIES: {
    BY_SERVER: (serverId: string) => `/servers/${serverId}/categories`,
    BY_ID: (serverId: string, categoryId: string) => `/servers/${serverId}/categories/${categoryId}`,
    REORDER: (serverId: string) => `/servers/${serverId}/categories/reorder`,
  },
  FRIENDS: {
    BASE: '/friends',
    REQUESTS: '/friends/requests',
    BY_ID: (id: string) => `/friends/${id}`,
    ACCEPT: (id: string) => `/friends/requests/${id}/accept`,
    REJECT: (id: string) => `/friends/requests/${id}/reject`,
  },
  UPLOAD: '/upload',
  DM: {
    BASE: '/dm',
    BY_ID: (id: string) => `/dm/${id}`,
    MESSAGES: (id: string) => `/dm/${id}/messages`,
  },
} as const
