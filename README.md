# Fluffwire

<div align="center">

<img src="public/logo-512.png" alt="Fluffwire Logo" width="128" height="128" />

**Modern, open-source real-time communication platform**

How the world communicates.

[![Vue](https://img.shields.io/badge/Vue-3.5-4FC08D?style=flat&logo=vue.js)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2.10-24C8DB?style=flat&logo=tauri)](https://tauri.app/)
[![License](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![GitHub Release](https://img.shields.io/github/v/release/Fluffwire/fluffwire-app)](https://github.com/Fluffwire/fluffwire-app/releases)

[🌐 Web App](https://app.fluffwire.com) • [📥 Download Desktop](https://github.com/Fluffwire/fluffwire-app/releases) • [🔧 Backend](https://github.com/Fluffwire/fluffwire-server) • [🐛 Report Bug](https://github.com/Fluffwire/fluffwire-app/issues)

</div>

---

## 📖 About

Fluffwire is a **free and open-source** real-time communication platform. Connect with friends, communities, and teams through text, voice, and video. Built with modern web technologies and available as both a web app and native desktop application.

### Why Fluffwire?

- 🔓 **Open Source** - Fully transparent, auditable code under AGPL-3.0
- 🚀 **Modern Stack** - Built with Vue 3, TypeScript, and Tauri for performance
- 🎨 **Beautiful UI** - Clean, intuitive interface with dark theme
- 🔒 **Privacy-Focused** - Self-hostable, you control your data
- 🌍 **Cross-Platform** - Web, Windows, macOS, and Linux support
- ⚡ **Real-Time** - WebSocket-powered instant messaging and presence
- 🎙️ **Voice Channels** - WebRTC-based voice chat with low latency

---

## ✨ Features

### 💬 Communication
- **Real-time Messaging** - Instant text chat with WebSocket
- **Voice Channels** - High-quality voice chat with WebRTC
- **Direct Messages** - Private 1-on-1 conversations
- **Message Formatting** - Full markdown support with code blocks, lists, and more
- **Emoji Reactions** - React to messages with emojis
- **File Attachments** - Share images, documents, and media
- **Message Editing & Deletion** - Edit or delete your messages
- **Typing Indicators** - See when someone is typing
- **Message History** - Paginated message loading

### 🏰 Server & Channel Management
- **Servers (Guilds)** - Create and manage community servers
- **Text Channels** - Organize conversations by topic
- **Voice Channels** - Dedicated voice chat rooms
- **Channel Categories** - Group related channels together
- **Drag & Drop Reordering** - Customize channel and server order
- **Server Invites** - Share invite links with expiration options
- **Member Management** - Kick, ban, and manage permissions

### 🛡️ Permissions & Roles
- **Label-Based System** - Flexible permission management with labels
- **5 Permission Tiers** - Owner, Admin, Moderator, Member, Viewer
- **Granular Control** - Fine-tune what each role can do
- **Member Labels** - Assign multiple labels to users

### 👥 Social Features
- **Friends System** - Add and manage friends
- **Friend Requests** - Send, accept, or decline friend requests
- **Presence System** - Real-time online/idle/dnd/offline status
- **Custom Status** - Set custom status messages
- **User Profiles** - Avatars, display names, and bios

### 🎨 Customization
- **Themes** - Dark theme by default (light theme in progress)
- **User Settings** - Personalize notifications, privacy, and more
- **Server Icons** - Custom server avatars
- **User Avatars** - Upload your own profile picture
- **Cross-Device Sync** - Settings synchronized across devices

### 🖥️ Desktop App
- **Native Experience** - Built with Tauri 2 for native performance
- **System Tray** - Minimize to tray, quick access
- **Auto-Start** - Launch on system startup (optional)
- **Desktop Notifications** - Native OS notifications
- **Auto-Updates** - Automatic update checking and installation
- **Keyboard Shortcuts** - Optimized for desktop workflows

### 🔒 Privacy & Security
- **End-to-End Encryption** - Voice channels encrypted with WebRTC
- **JWT Authentication** - Secure token-based authentication
- **Bcrypt Passwords** - Industry-standard password hashing
- **Self-Hostable** - Run your own instance
- **Privacy Controls** - Control who can DM you and see your status

---

## 🛠️ Tech Stack

### Core Framework
- **[Vue 3.5](https://vuejs.org/)** - Progressive JavaScript framework with Composition API
- **[TypeScript 5.9](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Vite 7](https://vite.dev/)** - Lightning-fast build tool
- **[Pinia 3](https://pinia.vuejs.org/)** - State management
- **[Vue Router 4](https://router.vuejs.org/)** - Client-side routing

### UI & Styling
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Utility-first CSS framework
- **[shadcn-vue](https://www.shadcn-vue.com/)** - Beautiful UI components
- **[Reka UI](https://reka-ui.com/)** - Accessible component primitives
- **[Lucide Icons](https://lucide.dev/)** - Beautiful, consistent icons
- **[Class Variance Authority](https://cva.style/)** - Component variants

### Communication
- **[Axios](https://axios-http.com/)** - HTTP client with interceptors
- **WebSocket** - Real-time bidirectional communication
- **[WebRTC](https://webrtc.org/)** - Peer-to-peer voice and video
- **Custom WebSocket Dispatcher** - Event-based message handling

### Desktop
- **[Tauri 2.10](https://tauri.app/)** - Rust-powered native app framework
- **Tauri Plugins** - HTTP, notifications, dialogs, updater, autostart

### Additional Tools
- **[marked](https://marked.js.org/)** - Fast markdown parser
- **[DOMPurify](https://github.com/cure53/DOMPurify)** - XSS sanitization
- **[SortableJS](https://sortablejs.github.io/Sortable/)** - Drag-and-drop library
- **[Vue I18n](https://vue-i18n.intlify.dev/)** - Internationalization
- **[Vue Sonner](https://vue-sonner.vercel.app/)** - Toast notifications
- **[VueUse](https://vueuse.org/)** - Collection of Vue composition utilities
- **[Vitest](https://vitest.dev/)** - Unit testing framework

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Fluffwire Frontend                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Web App    │  │ Tauri Desktop│  │ Mobile (TBD) │      │
│  │  (Browser)   │  │  (Native)    │  │              │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │               │
│         └─────────────────┴─────────────────┘               │
│                         │                                    │
│  ┌──────────────────────┴──────────────────────────────┐   │
│  │               Vue 3 Application                      │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │   │
│  │  │   Views    │  │ Components │  │  Layouts   │    │   │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘    │   │
│  │        └────────────────┴───────────────┘           │   │
│  │                       │                              │   │
│  │  ┌────────────────────┴──────────────────────┐     │   │
│  │  │         Pinia Stores (State)              │     │   │
│  │  │  auth • servers • channels • messages     │     │   │
│  │  │  voice • members • friends • ui           │     │   │
│  │  └────────┬──────────────────┬────────────┬──┘     │   │
│  │           │                  │            │        │   │
│  │  ┌────────┴──────┐  ┌────────┴──────┐  ┌─┴──────┐ │   │
│  │  │  API Service  │  │  WebSocket    │  │ WebRTC │ │   │
│  │  │    (Axios)    │  │   Service     │  │Service │ │   │
│  │  └────────┬──────┘  └────────┬──────┘  └────────┘ │   │
│  └───────────┼──────────────────┼─────────────────────┘   │
│              │                  │                          │
└──────────────┼──────────────────┼──────────────────────────┘
               │                  │
        ┌──────┴──────┐    ┌──────┴──────┐
        │  REST API   │    │  WebSocket  │
        │ (HTTP/HTTPS)│    │  (WS/WSS)   │
        └─────────────┘    └─────────────┘
               │                  │
        ┌──────┴──────────────────┴──────┐
        │     Fluffwire Backend Server    │
        │  (Go + PostgreSQL + WebRTC)     │
        └─────────────────────────────────┘
```

### State Management Flow

1. **User Action** → Component emits event
2. **Store Action** → Pinia store handles business logic
3. **API Call** → Axios or WebSocket sends request
4. **Backend Response** → Data received
5. **Store Update** → State updated reactively
6. **UI Re-render** → Vue automatically updates DOM

### Real-Time Events

WebSocket events are dispatched through a custom event system:

```typescript
// Register handler in store
wsDispatcher.register('MESSAGE_CREATE', (data) => {
  messages.value.push(data)
})

// Events are automatically dispatched when received
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 22+** - [Install Node.js](https://nodejs.org/)
- **npm or pnpm** - Package manager
- **Backend Server** - [fluffwire-server](https://github.com/Fluffwire/fluffwire-server) running locally or remote

### Web App Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/Fluffwire/fluffwire-app.git
   cd fluffwire-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment** (optional)

   Create `.env.local` if you need to override API URL:
   ```env
   VITE_API_URL=http://localhost:3000/api
   VITE_WS_URL=ws://localhost:3000/ws
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

   App will be available at http://localhost:5173

5. **Build for production**
   ```bash
   npm run build
   ```

   Production files will be in `dist/`

### Desktop App Development

1. **Install Rust** (required for Tauri)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Install Tauri CLI** (if not already installed)
   ```bash
   npm install
   ```

3. **Run desktop app in development**
   ```bash
   npm run tauri:dev
   ```

4. **Build desktop app**
   ```bash
   npm run tauri:build
   ```

   Installers will be in `src-tauri/target/release/bundle/`

---

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test -- --coverage
```

### Testing Guidelines

- ✅ All new features must include tests
- ✅ Stores: Test actions, getters, and mutations
- ✅ Composables: Test with different scenarios
- ✅ Services: Mock HTTP/WebSocket calls
- ✅ Components: Test logic and user interactions

See [CLAUDE.md](CLAUDE.md) for detailed testing requirements.

---

## 📁 Project Structure

```
fluffwire-app/
├── public/                      # Static assets
│   ├── logo-512.png            # App logo
│   └── ...
├── src/
│   ├── assets/
│   │   └── styles/
│   │       └── main.css        # Global styles, Tailwind config
│   ├── components/
│   │   ├── ui/                 # shadcn-vue components
│   │   ├── chat/               # Chat-related components
│   │   ├── channels/           # Channel management
│   │   ├── server/             # Server management
│   │   ├── sidebar/            # Sidebar components
│   │   ├── members/            # Member list
│   │   ├── voice/              # Voice controls
│   │   ├── friends/            # Friends list
│   │   └── common/             # Shared components
│   ├── composables/            # Vue composables
│   │   ├── useMarkdown.ts
│   │   ├── useResponsive.ts
│   │   ├── useNotifications.ts
│   │   └── useTheme.ts
│   ├── layouts/                # App layouts
│   │   ├── AppLayout.vue       # Main app layout
│   │   └── AuthLayout.vue      # Login/register layout
│   ├── router/                 # Vue Router configuration
│   │   └── index.ts
│   ├── services/               # API and WebSocket services
│   │   ├── api.ts              # Axios instance
│   │   ├── websocket.ts        # WebSocket manager
│   │   ├── wsDispatcher.ts     # Event dispatcher
│   │   ├── webrtc.ts           # WebRTC service
│   │   └── updater.ts          # Desktop auto-updater
│   ├── stores/                 # Pinia stores
│   │   ├── auth.ts             # Authentication
│   │   ├── servers.ts          # Servers management
│   │   ├── channels.ts         # Channels & categories
│   │   ├── messages.ts         # Messages
│   │   ├── members.ts          # Server members
│   │   ├── voice.ts            # Voice state
│   │   ├── friends.ts          # Friends
│   │   ├── presence.ts         # User presence
│   │   └── ui.ts               # UI state
│   ├── types/                  # TypeScript interfaces
│   │   ├── user.ts
│   │   ├── server.ts
│   │   ├── message.ts
│   │   ├── voice.ts
│   │   └── websocket.ts
│   ├── views/                  # Route views
│   │   ├── auth/               # Login, register
│   │   └── app/                # Main app views
│   ├── App.vue                 # Root component
│   └── main.ts                 # App entry point
├── src-tauri/                  # Tauri desktop app
│   ├── src/                    # Rust source
│   ├── icons/                  # App icons
│   ├── tauri.conf.json         # Tauri configuration
│   └── Cargo.toml              # Rust dependencies
├── docs/                       # Documentation
├── BACKEND_REQUIREMENTS.md     # API contract
├── CLAUDE.md                   # Project guidelines
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
├── vite.config.ts              # Vite configuration
└── tailwind.config.js          # Tailwind configuration
```

---

## 🔧 Development

### Code Style

- **TypeScript** - Strict mode enabled
- **Vue 3 Composition API** - `<script setup>` syntax
- **ESLint** - For linting (coming soon)
- **Prettier** - For formatting (coming soon)

### Branch Strategy

- `main` - Production-ready code
- `feature/*` - New features
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: Add emoji autocomplete
fix: Resolve voice disconnection issue
docs: Update README with new features
chore: Update dependencies
```

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm run test`
5. Type-check: `npm run build`
6. Commit: `git commit -m 'feat: Add amazing feature'`
7. Push: `git push origin feature/amazing-feature`
8. Open a Pull Request

---

## 🤝 Contributing

We welcome contributions from the community! Whether it's:

- 🐛 Bug fixes
- ✨ New features
- 📝 Documentation improvements
- 🎨 UI/UX enhancements
- 🌍 Translations
- 🧪 Tests

### Getting Started

1. Check [open issues](https://github.com/Fluffwire/fluffwire-app/issues) or create a new one
2. Fork the repository
3. Create a feature branch
4. Make your changes with tests
5. Submit a pull request

### Guidelines

- **Write tests** for new features (see [Testing Requirements](#-testing))
- **Follow TypeScript** best practices
- **Keep PRs focused** - One feature/fix per PR
- **Update documentation** if needed
- **Be respectful** and constructive

### Code Review Process

1. Automated checks must pass (type-checking, tests)
2. At least one maintainer review required
3. Address review feedback
4. Squash commits if requested
5. Merge to `main`

---

## 📥 Desktop App

### Download

Download the latest desktop app for your platform:

- **Windows** - `.exe` installer or `.msi` installer
- **macOS** - `.dmg` disk image or `.app` bundle
- **Linux** - `.AppImage`, `.deb`, or `.rpm`

👉 [**Download from GitHub Releases**](https://github.com/Fluffwire/fluffwire-app/releases)

### Features

- **Native Performance** - Built with Tauri (Rust + Webview)
- **Auto-Updates** - Checks for updates on startup
- **System Tray** - Minimize to tray, quick access
- **Desktop Notifications** - Native OS notifications
- **Auto-Start** - Launch on system startup (optional)
- **Keyboard Shortcuts** - Optimized for desktop

### System Requirements

- **Windows** - Windows 10 or later (64-bit)
- **macOS** - macOS 10.15 (Catalina) or later
- **Linux** - Modern distributions with GTK 3.24+

### Building from Source

See [Quick Start → Desktop App Development](#desktop-app-development) for build instructions.

---

## 🌐 Deployment

### Web App

The web app is a static SPA built with Vite.

**Build for production:**
```bash
npm run build
```

**Deploy to static hosting:**
- The `dist/` folder contains all static files
- Configure your web server for SPA routing (redirect all routes to `index.html`)
- Set environment variables for production API URL

**Example nginx config:**
```nginx
server {
    listen 443 ssl;
    server_name app.fluffwire.com;

    root /var/www/app;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Desktop App

Desktop releases are automated via GitHub Actions.

**Trigger a release:**
```bash
gh workflow run release.yml -f tag=v0.9.0
```

This will:
1. Update version in `tauri.conf.json`
2. Build for Windows, macOS, and Linux
3. Sign installers with minisign
4. Create a GitHub draft release with all artifacts
5. Generate `latest.json` for auto-updater

---

## 🗺️ Roadmap

### Current Version: v0.8.x

✅ Real-time messaging and voice channels
✅ Server and channel management
✅ Friends and DMs
✅ Desktop app with auto-updates
✅ Role/permission system
✅ Multi-device settings sync

### Upcoming Features

🚧 **v0.9.0** - Bot System
- Bot API for server automation
- Webhook integrations
- Custom bot SDK

🔮 **v1.0.0** - Public Release
- Mobile apps (iOS/Android)
- Video calls and screen sharing
- End-to-end encryption for DMs
- Custom emojis and stickers
- Message search
- Two-factor authentication

🌟 **Future**
- Server discovery/directory
- Threads and forums
- Voice channels recording
- Advanced moderation tools
- Plugin system
- Self-hosting documentation

See [GitHub Milestones](https://github.com/Fluffwire/fluffwire-app/milestones) for detailed planning.

---

## 📸 Screenshots

<div align="center">

### 💬 Chat Interface
![Chat Interface](docs/screenshots/chat.png)

### 🎙️ Voice Channels
![Voice Channels](docs/screenshots/voice.png)

### ⚙️ Settings
![Settings](docs/screenshots/settings.png)

</div>

---

## 🌍 Internationalization

Fluffwire supports multiple languages via Vue I18n.

**Current languages:**
- 🇺🇸 English (en)

**Contributing translations:**
1. Copy `src/locales/en.json`
2. Translate to your language
3. Add language to `src/i18n.ts`
4. Submit a pull request

We welcome translations for all languages!

---

## 🐛 Bug Reports

Found a bug? Please [open an issue](https://github.com/Fluffwire/fluffwire-app/issues/new) with:

- **Description** - What happened vs. what you expected
- **Steps to Reproduce** - How to trigger the bug
- **Environment** - Browser/OS version, desktop app version
- **Screenshots** - If applicable
- **Logs** - Browser console errors (F12)

---

## 💡 Feature Requests

Have an idea? [Open a feature request](https://github.com/Fluffwire/fluffwire-app/issues/new) with:

- **Problem** - What problem does this solve?
- **Proposed Solution** - How would you like it to work?
- **Alternatives** - Any alternative solutions you've considered?
- **Additional Context** - Screenshots, mockups, examples

---

## 📜 License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

**What this means:**
- ✅ You can use, modify, and distribute this software
- ✅ You can use it for commercial purposes
- ⚠️ If you modify and distribute it, you must open-source your changes
- ⚠️ If you run a modified version as a network service, you must provide the source code

See [LICENSE](LICENSE) for full details.

**Why AGPL?**
We chose AGPL to ensure that all improvements to Fluffwire remain open and benefit the entire community, even when deployed as a hosted service.

---

## 🙏 Acknowledgments

Fluffwire is built with amazing open-source technologies:

- **[Vue.js](https://vuejs.org/)** - The Progressive JavaScript Framework
- **[Tauri](https://tauri.app/)** - Build smaller, faster, and more secure desktop applications
- **[shadcn-vue](https://www.shadcn-vue.com/)** - Beautifully designed components
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework

Special thanks to all our [contributors](https://github.com/Fluffwire/fluffwire-app/graphs/contributors)!

---

## 🔗 Links

- **Production App** - https://app.fluffwire.com
- **Website** - https://fluffwire.com
- **Backend Repository** - https://github.com/Fluffwire/fluffwire-server
- **Desktop Releases** - https://github.com/Fluffwire/fluffwire-app/releases
- **Issues** - https://github.com/Fluffwire/fluffwire-app/issues
- **Discussions** - https://github.com/Fluffwire/fluffwire-app/discussions

---

## 📧 Contact

- **Email** - support@fluffwire.com
- **Twitter** - [@fluffwire](https://twitter.com/fluffwire)
- **GitHub Discussions** - [Community Forum](https://github.com/Fluffwire/fluffwire-app/discussions)

---

<div align="center">

**Made with ❤️ by the Fluffwire community**

[⭐ Star us on GitHub](https://github.com/Fluffwire/fluffwire-app) • [🐦 Follow on Twitter](https://twitter.com/fluffwire) • [💬 Join the Community](https://app.fluffwire.com)

</div>
