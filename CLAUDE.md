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
npm run test       # Run tests with Vitest
npm run test:watch # Run tests in watch mode
```

## Testing Requirements ⚠️

**IMPORTANT**: All new features and bug fixes MUST include tests before being merged.

### What to Test
- **Stores**: Test all Pinia store actions, getters, and state mutations
- **Composables**: Test all exported composables with different scenarios
- **Services**: Mock HTTP calls and test error handling, success cases, and edge cases
- **Components**: Test user interactions, prop changes, and emitted events (when complex logic exists)
- **Utils/Helpers**: Test all exported utility functions

### Test Framework
- **Vitest** for unit/integration tests
- Tests located in `src/__tests__/` directory
- Use `vi.mock()` to mock external dependencies (API calls, WebSocket, etc.)
- Use `setActivePinia(createPinia())` for store tests

### Test Coverage Goals
- Critical paths: 100% (auth, payments, data loss scenarios)
- Business logic: 80%+
- UI components: Focus on logic, not every visual detail

### Writing Tests
```typescript
// Example store test structure
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

describe('myFeature', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('should handle success case', () => {
    // Arrange, Act, Assert
  })

  it('should handle error case', () => {
    // Test error scenarios
  })
})
```

### Before Committing
1. Write tests for your changes
2. Run `npm run test` to verify all tests pass
3. Ensure type checking passes: `npm run build`
4. Only then commit and push

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
See `/home/cryo/fluffwire-server/BACKEND_REQUIREMENTS.md` for the full API specification.

## Environment
- Node.js v22.22.0 via nvm (already in PATH)
- Dev server: http://localhost:5173
- API base: http://localhost:3000/api (dev), proxied via nginx in prod
- Production: https://app.fluffwire.com, static build at /var/www/app/
