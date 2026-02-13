# Fluffwire

A real-time chat application with voice channels, screen sharing, and direct messaging — inspired by Discord.

## Features

- **Servers & Channels** — Create servers with text and voice channels, organized by categories
- **Real-time Messaging** — WebSocket-powered chat with markdown, emoji reactions, file attachments, and message pinning
- **Voice Chat** — WebRTC-based voice channels with push-to-talk, voice activity detection, and screen sharing
- **Direct Messages** — Private conversations with friends
- **Friends System** — Send/accept friend requests, manage your friends list
- **Webhooks** — Integrate external services via server webhooks ([docs](docs/WEBHOOKS.md))
- **Desktop App** — Native desktop client built with Tauri 2

## Tech Stack

- **Frontend**: Vue 3 + TypeScript, Vite, Tailwind CSS, shadcn-vue
- **Backend**: Go + Gin, PostgreSQL, gorilla/websocket, Pion WebRTC
- **Desktop**: Tauri 2

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Type-check and build for production
npm run build

# Preview production build
npm run preview
```

The frontend expects a running backend server. See [fluffwire-server](https://github.com/Fluffwire/fluffwire-server) for setup instructions.

## Links

- **Web App**: [app.fluffwire.com](https://app.fluffwire.com)
- **Desktop Releases**: [GitHub Releases](https://github.com/Fluffwire/fluffwire-app/releases)
- **Backend**: [fluffwire-server](https://github.com/Fluffwire/fluffwire-server)

## License

[AGPL-3.0](LICENSE)
