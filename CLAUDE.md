# Fluffwire Frontend (fluffwire-app)

Real-time chat application built with Vue 3 + TypeScript.

## Tech Stack

- **Framework**: Vue 3.5 (Composition API + `<script setup>`) with TypeScript 5.9
- **Build**: Vite 7, vue-tsc for type checking
- **Routing**: vue-router 4 (history mode)
- **State**: Pinia stores
- **Styling**: Tailwind CSS 4 + shadcn-vue (reka-ui primitives)
- **HTTP**: Axios with JWT interceptor + auto-refresh
- **Real-time**: Custom WebSocket service + event dispatcher
- **Voice**: WebRTC via Pion (backend SFU)
- **Icons**: lucide-vue-next
- **Markdown**: marked + DOMPurify
- **Desktop**: Tauri 2 (optional)

## Commands

```bash
npm run dev        # Dev server on :5173
npm run build      # Type-check + production build (vue-tsc -b && vite build)
npm run preview    # Preview production build
```

## Project Structure

```
src/
├── assets/styles/main.css    # Tailwind config, theme tokens, custom styles
├── components/
│   ├── ui/                   # shadcn-vue primitives (Dialog, Button, Input, etc.)
│   ├── chat/                 # MessageItem, MessageInput, EmojiPicker, FilePreview
│   ├── channels/             # ChannelItem, ChannelCategory, Create/Edit modals
│   ├── server/               # CreateServerModal, JoinServerModal, InviteModal, ServerSettingsModal
│   ├── sidebar/              # ServerSidebar (icon strip), ChannelSidebar (channel list + UserPanel)
│   ├── members/              # MemberSidebar, MemberList
│   ├── voice/                # VoicePanel, VoiceControls, VoicePeerTile
│   ├── friends/              # FriendList, DMList
│   ├── common/               # UserAvatar, etc.
│   └── navigation/           # MobileNav
├── composables/              # useMarkdown, useResponsive, useNotifications, useTheme
├── constants/endpoints.ts    # API route constants
├── layouts/                  # AppLayout (main), AuthLayout (login/register)
├── router/                   # Routes + auth guards
├── services/
│   ├── api.ts                # Axios instance with auth interceptor
│   ├── serverApi.ts          # Server CRUD
│   ├── messageApi.ts         # Message CRUD
│   ├── websocket.ts          # WebSocket connection manager
│   ├── wsDispatcher.ts       # WS event dispatcher (register handlers by event name)
│   └── webrtc.ts             # WebRTC service for voice
├── stores/                   # Pinia stores
│   ├── auth.ts               # User auth, tokens
│   ├── servers.ts            # Server list, CRUD
│   ├── channels.ts           # Channels + categories
│   ├── messages.ts           # Messages by channel, send/edit/delete
│   ├── members.ts            # Server members
│   ├── presence.ts           # User online/idle/dnd status
│   ├── voice.ts              # Voice channel state, peers
│   ├── friends.ts            # Friends + requests
│   ├── directMessages.ts     # DM channels
│   └── ui.ts                 # Modals, sidebar state, theme
├── types/                    # TypeScript interfaces
│   ├── user.ts               # User, UserStatus
│   ├── server.ts             # Server, ServerMember
│   ├── message.ts            # Message, Channel, Attachment, etc.
│   ├── voice.ts              # VoicePeer, VoiceSignal
│   └── websocket.ts          # WsOpCode, WsMessage
└── views/
    ├── auth/                 # LoginView, RegisterView
    └── app/                  # ChannelView, FriendsView, DMView, SettingsView, VoiceChannelView
```

## Key Patterns

### State Management
- Each domain has its own Pinia store (servers, channels, messages, etc.)
- WebSocket event handlers are registered inside stores via `wsDispatcher.register()`
- Stores are the single source of truth; components read from stores, not API responses directly

### Modals
- Controlled via `uiStore.openModal('modalName')` / `uiStore.closeModal()`
- Each modal component reads `uiStore.activeModal` to determine visibility
- Registered in `AppLayout.vue`

### API Communication
- REST via Axios (`src/services/api.ts`) — auto-attaches JWT, handles 401 refresh
- Real-time via WebSocket (`src/services/websocket.ts`) — dispatches events to stores
- File uploads via `uploadFile()` in `api.ts` (multipart form data)
- Messages without attachments go through WebSocket; messages with attachments use HTTP POST

### Routing
- `/channels/@me` — Friends/home
- `/channels/@me/:dmId` — DM conversation
- `/channels/:serverId/:channelId` — Server text channel
- `/settings` — User settings
- `/invite/:code` — Join server via invite link
- Auth guard redirects unauthenticated users to `/login`

### UI Components
- shadcn-vue components in `src/components/ui/` (Dialog, Button, Input, ScrollArea, etc.)
- Built on reka-ui primitives
- Tailwind CSS 4 with custom theme tokens (dark theme default)

### Voice
- VoicePanel is embedded in ChannelSidebar (shown when connected to voice in current server)
- WebRTC handled by `webrtc.ts` service, state in `voice.ts` store

## API Contract
See `BACKEND_REQUIREMENTS.md` for the full API specification. The backend is at `/home/cryo/fluffwire-server/`.

## Environment
- Node.js via nvm: `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"`
- Dev server: http://localhost:5173
- API base: http://localhost:3000/api (dev), proxied via nginx in prod
- Production: https://app.fluffwire.com, static build at /var/www/app/
