# Fluffwire Backend API Requirements

This document specifies the complete backend API contract required by the Fluffwire frontend. The backend should implement a REST API for CRUD operations and a WebSocket server for real-time events.

## Base Configuration

- **REST API Base URL:** `http://localhost:3000/api`
- **WebSocket URL:** `ws://localhost:3000/ws`
- **Auth:** Bearer token (JWT) in `Authorization` header
- **Content-Type:** `application/json`
- **CORS:** Allow origin `http://localhost:5173` (dev), support credentials

---

## Data Models

### User
```json
{
  "id": "string (UUID)",
  "username": "string (unique, 2-32 chars, alphanumeric + underscores)",
  "displayName": "string (1-32 chars)",
  "email": "string (unique, valid email) — only on CurrentUser",
  "avatar": "string (URL) | null",
  "status": "online | idle | dnd | offline",
  "customStatus": "string | null",
  "createdAt": "string (ISO 8601)"
}
```

### Server
```json
{
  "id": "string (UUID)",
  "name": "string (1-100 chars)",
  "icon": "string (URL) | null",
  "ownerId": "string (UUID)",
  "memberCount": "number",
  "createdAt": "string (ISO 8601)"
}
```

### ServerMember
```json
{
  "userId": "string (UUID)",
  "serverId": "string (UUID)",
  "nickname": "string | null",
  "roles": ["string"],
  "joinedAt": "string (ISO 8601)",
  "user": { "id", "username", "displayName", "avatar", "status" }
}
```

### Channel
```json
{
  "id": "string (UUID)",
  "serverId": "string (UUID)",
  "name": "string (1-100 chars, lowercase, hyphens)",
  "type": "text | voice",
  "categoryId": "string (UUID) | null",
  "position": "number",
  "topic": "string | null"
}
```

### ChannelCategory
```json
{
  "id": "string (UUID)",
  "serverId": "string (UUID)",
  "name": "string",
  "position": "number"
}
```

### Message
```json
{
  "id": "string (UUID / Snowflake)",
  "channelId": "string (UUID)",
  "author": {
    "id": "string",
    "username": "string",
    "displayName": "string",
    "avatar": "string | null"
  },
  "content": "string (1-2000 chars)",
  "timestamp": "string (ISO 8601)",
  "editedAt": "string (ISO 8601) | null",
  "attachments": [
    {
      "id": "string",
      "filename": "string",
      "url": "string",
      "contentType": "string",
      "size": "number (bytes)"
    }
  ]
}
```

### Friend
```json
{
  "id": "string (UUID, friendship ID)",
  "user": {
    "id": "string",
    "username": "string",
    "displayName": "string",
    "avatar": "string | null",
    "status": "online | idle | dnd | offline"
  },
  "since": "string (ISO 8601)"
}
```

### FriendRequest
```json
{
  "id": "string (UUID)",
  "from": { "id", "username", "displayName", "avatar" },
  "to": { "id", "username", "displayName", "avatar" },
  "createdAt": "string (ISO 8601)"
}
```

### DirectMessageChannel
```json
{
  "id": "string (UUID)",
  "recipientId": "string (UUID)",
  "recipient": {
    "id": "string",
    "username": "string",
    "displayName": "string",
    "avatar": "string | null",
    "status": "online | idle | dnd | offline"
  },
  "lastMessage": {
    "content": "string",
    "timestamp": "string (ISO 8601)"
  } | null
}
```

### ServerInvite
```json
{
  "code": "string (8-char alphanumeric)",
  "serverId": "string (UUID)",
  "creatorId": "string (UUID)",
  "expiresAt": "string (ISO 8601) | null",
  "maxUses": "number | null",
  "uses": "number"
}
```

---

## REST API Endpoints

### Authentication

#### POST `/api/auth/register`
Create a new account.

**Request:**
```json
{
  "email": "string",
  "username": "string",
  "password": "string (8+ chars)"
}
```

**Response (201):**
```json
{
  "accessToken": "string (JWT, 15min expiry)",
  "refreshToken": "string (JWT, 7d expiry)",
  "user": { CurrentUser object }
}
```

**Errors:** `400` (validation), `409` (email/username taken)

#### POST `/api/auth/login`
Authenticate with email and password.

**Request:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response (200):** Same as register.

**Errors:** `401` (invalid credentials)

#### POST `/api/auth/refresh`
Refresh access token.

**Request:**
```json
{
  "refreshToken": "string"
}
```

**Response (200):**
```json
{
  "accessToken": "string",
  "refreshToken": "string"
}
```

**Errors:** `401` (invalid/expired refresh token)

#### POST `/api/auth/logout`
Invalidate the current refresh token. Requires auth.

**Response:** `204 No Content`

#### GET `/api/auth/me`
Get the current authenticated user. Requires auth.

**Response (200):** `CurrentUser` object

---

### Users

#### GET `/api/users/:id`
Get a user's public profile. Requires auth.

**Response (200):** `User` object (no email)

#### PATCH `/api/users/@me/settings`
Update user settings. Requires auth.

**Request:** Partial `UserSettings` object.

**Response (200):** Full `UserSettings` object.

---

### Servers

#### GET `/api/servers`
List all servers the current user belongs to. Requires auth.

**Response (200):** `Server[]`

#### GET `/api/servers/:id`
Get a single server. Requires auth + membership.

**Response (200):** `Server`

#### POST `/api/servers`
Create a new server. Requires auth.

**Request:**
```json
{
  "name": "string"
}
```

**Response (201):** `Server` (creator is auto-added as member + owner)

A default `#general` text channel should be created automatically.

#### PATCH `/api/servers/:id`
Update a server. Requires auth + owner.

**Request:** `{ "name"?: "string", "icon"?: "string" }`

**Response (200):** `Server`

#### DELETE `/api/servers/:id`
Delete a server. Requires auth + owner.

**Response:** `204 No Content`

Broadcasts `SERVER_DELETE` to all members via WS.

#### POST `/api/servers/join`
Join a server via invite code. Requires auth.

**Request:**
```json
{
  "inviteCode": "string"
}
```

**Response (200):** `Server`

**Errors:** `404` (invalid code), `409` (already a member)

#### GET `/api/servers/:id/members`
List all members of a server. Requires auth + membership.

**Response (200):** `ServerMember[]` (with nested `user` object including current status)

#### DELETE `/api/servers/:id/members/@me`
Leave a server. Requires auth + membership. Owner cannot leave.

**Response:** `204 No Content`

#### POST `/api/servers/:id/invites`
Create an invite for a server. Requires auth + membership.

**Response (201):** `ServerInvite`

---

### Channels

#### GET `/api/servers/:serverId/channels`
List all channels and categories for a server. Requires auth + membership.

**Response (200):**
```json
{
  "channels": Channel[],
  "categories": ChannelCategory[]
}
```

#### POST `/api/servers/:serverId/channels`
Create a channel. Requires auth + owner/admin.

**Request:**
```json
{
  "name": "string",
  "type": "text | voice",
  "categoryId": "string (UUID) | null"
}
```

**Response (201):** `Channel`

#### PATCH `/api/channels/:channelId`
Update a channel. Requires auth + owner/admin.

**Request:** `{ "name"?: "string", "topic"?: "string" }`

**Response (200):** `Channel`

#### DELETE `/api/channels/:channelId`
Delete a channel. Requires auth + owner/admin.

**Response:** `204 No Content`

---

### Messages

#### GET `/api/channels/:channelId/messages`
Fetch message history with cursor pagination. Requires auth + channel access.

**Query params:**
- `limit` (number, default 50, max 100)
- `cursor` (string, message ID — fetch messages before this ID)

**Response (200):**
```json
{
  "messages": Message[],
  "hasMore": true,
  "cursor": "string (ID of oldest message) | null"
}
```

Messages are returned in chronological order (oldest first).

#### PATCH `/api/channels/:channelId/messages/:messageId`
Edit a message. Requires auth + author.

**Request:**
```json
{
  "content": "string"
}
```

**Response (200):** `Message` (with updated `editedAt`)

#### DELETE `/api/channels/:channelId/messages/:messageId`
Delete a message. Requires auth + (author OR server admin/owner).

**Response:** `204 No Content`

#### POST `/api/channels/:channelId/typing`
Send a typing indicator. Requires auth + channel access.

**Response:** `204 No Content`

This triggers a `TYPING_START` WS event to other users in the channel.

---

### Friends

#### GET `/api/friends`
List all friends. Requires auth.

**Response (200):** `Friend[]`

#### GET `/api/friends/requests`
List all pending friend requests (incoming and outgoing). Requires auth.

**Response (200):** `FriendRequest[]`

#### POST `/api/friends/requests`
Send a friend request. Requires auth.

**Request:**
```json
{
  "username": "string"
}
```

**Response (201):** `FriendRequest`

**Errors:** `404` (user not found), `409` (already friends / request exists)

#### POST `/api/friends/requests/:id/accept`
Accept a friend request. Requires auth + request recipient.

**Response (200):** `Friend`

#### POST `/api/friends/requests/:id/reject`
Reject/cancel a friend request. Requires auth + request sender or recipient.

**Response:** `204 No Content`

#### DELETE `/api/friends/:id`
Remove a friend. Requires auth.

**Response:** `204 No Content`

---

### Direct Messages

#### GET `/api/dm`
List all DM channels for the current user. Requires auth.

**Response (200):** `DirectMessageChannel[]` (sorted by last message time)

#### POST `/api/dm`
Create/open a DM channel. Requires auth.

**Request:**
```json
{
  "recipientId": "string (UUID)"
}
```

**Response (200):** `DirectMessageChannel`

If a DM channel already exists with this recipient, return the existing one.

#### GET `/api/dm/:id/messages`
Fetch DM message history. Same pagination as channel messages.

**Response (200):** Same as `/api/channels/:channelId/messages`

---

## WebSocket Protocol

The WebSocket connection follows a gateway protocol using JSON messages.

### Connection Flow

1. Client connects to `ws://localhost:3000/ws`
2. Server sends **HELLO** (op 10) with heartbeat interval
3. Client sends **IDENTIFY** (op 2) with auth token
4. Server responds with **DISPATCH** (op 0, event `READY`) containing initial state
5. Client sends **HEARTBEAT** (op 1) at the specified interval
6. Server responds with **HEARTBEAT_ACK** (op 11)

### Op Codes

| Op | Name | Direction | Description |
|----|------|-----------|-------------|
| 0 | DISPATCH | Server → Client | Event dispatch (carries event name + data) |
| 1 | HEARTBEAT | Client → Server | Client heartbeat (payload: last sequence number) |
| 2 | IDENTIFY | Client → Server | Auth with token |
| 3 | PRESENCE_UPDATE | Client → Server | Update own presence/status |
| 4 | VOICE_STATE_UPDATE | Client → Server | Join/leave/update voice state |
| 6 | RESUME | Client → Server | Resume a dropped connection |
| 7 | RECONNECT | Server → Client | Server requests client reconnect |
| 10 | HELLO | Server → Client | First message after connect |
| 11 | HEARTBEAT_ACK | Server → Client | Acknowledge heartbeat |

### Message Format

```json
{
  "op": 0,
  "d": {},
  "s": 42,
  "t": "MESSAGE_CREATE"
}
```

- `op` — opcode (number)
- `d` — payload data (object)
- `s` — sequence number (only for op 0, increments per dispatch)
- `t` — event name (only for op 0)

### Op 10 — HELLO

Sent by server immediately after WebSocket connection is established.

```json
{
  "op": 10,
  "d": {
    "heartbeatInterval": 41250
  }
}
```

### Op 2 — IDENTIFY

Sent by client to authenticate.

```json
{
  "op": 2,
  "d": {
    "token": "JWT access token"
  }
}
```

If invalid, server closes connection with code `4004`.

### Op 6 — RESUME

Sent by client to resume after disconnect.

```json
{
  "op": 6,
  "d": {
    "token": "JWT access token",
    "sessionId": "string",
    "seq": 42
  }
}
```

Server replays missed events since `seq`.

### Op 1 — HEARTBEAT

Sent by client at `heartbeatInterval` from HELLO.

```json
{
  "op": 1,
  "d": 42
}
```

Payload is last received sequence number (or null if none).

### Op 3 — PRESENCE_UPDATE

Client updates own status.

```json
{
  "op": 3,
  "d": {
    "status": "online | idle | dnd | offline",
    "customStatus": "string | null"
  }
}
```

### Op 4 — VOICE_STATE_UPDATE

Client joins/leaves/updates voice.

```json
{
  "op": 4,
  "d": {
    "serverId": "string",
    "channelId": "string | null",
    "selfMute": false,
    "selfDeaf": false
  }
}
```

`channelId: null` means leave voice.

---

## Dispatch Events (Op 0)

### READY

Sent after successful IDENTIFY. Contains initial state.

```json
{
  "t": "READY",
  "d": {
    "sessionId": "string",
    "user": CurrentUser,
    "servers": Server[],
    "friends": Friend[],
    "presences": [
      { "userId": "string", "status": "online", "customStatus": null }
    ]
  }
}
```

### MESSAGE_CREATE

A new message was sent (text channel or DM). Broadcast to all users in the channel.

```json
{
  "t": "MESSAGE_CREATE",
  "d": Message
}
```

**Note:** Messages are sent from the client via this same dispatch event through the WebSocket. The client sends:
```json
{
  "op": 0,
  "t": "MESSAGE_CREATE",
  "d": {
    "content": "Hello!",
    "channelId": "uuid"
  }
}
```

The server processes this and broadcasts the full `Message` object (with id, author, timestamp) to all channel members.

### MESSAGE_UPDATE

A message was edited. Broadcast to channel members.

```json
{
  "t": "MESSAGE_UPDATE",
  "d": Message
}
```

### MESSAGE_DELETE

A message was deleted. Broadcast to channel members.

```json
{
  "t": "MESSAGE_DELETE",
  "d": {
    "id": "string",
    "channelId": "string"
  }
}
```

### CHANNEL_CREATE

A channel was created in a server. Broadcast to server members.

```json
{
  "t": "CHANNEL_CREATE",
  "d": Channel
}
```

### CHANNEL_UPDATE

```json
{
  "t": "CHANNEL_UPDATE",
  "d": Channel
}
```

### CHANNEL_DELETE

```json
{
  "t": "CHANNEL_DELETE",
  "d": { "id": "string" }
}
```

### SERVER_CREATE

User joined or created a server. Sent to the user.

```json
{
  "t": "SERVER_CREATE",
  "d": Server
}
```

### SERVER_UPDATE

```json
{
  "t": "SERVER_UPDATE",
  "d": Server
}
```

### SERVER_DELETE

Server was deleted or user was removed. Sent to affected members.

```json
{
  "t": "SERVER_DELETE",
  "d": { "id": "string" }
}
```

### SERVER_MEMBER_ADD

A user joined the server. Broadcast to server members.

```json
{
  "t": "SERVER_MEMBER_ADD",
  "d": {
    "serverId": "string",
    "member": ServerMember
  }
}
```

### SERVER_MEMBER_REMOVE

A user left/was removed from the server.

```json
{
  "t": "SERVER_MEMBER_REMOVE",
  "d": {
    "serverId": "string",
    "userId": "string"
  }
}
```

### PRESENCE_UPDATE

A user's presence changed. Broadcast to users who share a server or are friends.

```json
{
  "t": "PRESENCE_UPDATE",
  "d": {
    "userId": "string",
    "status": "online | idle | dnd | offline",
    "customStatus": "string | null"
  }
}
```

### TYPING_START

A user started typing. Broadcast to channel members (excluding sender).

```json
{
  "t": "TYPING_START",
  "d": {
    "channelId": "string",
    "userId": "string",
    "username": "string"
  }
}
```

### VOICE_STATE_UPDATE

A user's voice state changed. Broadcast to server members.

```json
{
  "t": "VOICE_STATE_UPDATE",
  "d": {
    "userId": "string",
    "channelId": "string | null",
    "serverId": "string",
    "selfMute": false,
    "selfDeaf": false,
    "username": "string",
    "displayName": "string",
    "avatar": "string | null"
  }
}
```

### VOICE_SIGNAL

WebRTC signaling relay. Sent to specific user.

```json
{
  "t": "VOICE_SIGNAL",
  "d": {
    "type": "offer | answer | ice-candidate",
    "payload": RTCSessionDescriptionInit | RTCIceCandidateInit,
    "fromUserId": "string"
  }
}
```

### FRIEND_REQUEST

A friend request was received. Sent to the target user.

```json
{
  "t": "FRIEND_REQUEST",
  "d": FriendRequest
}
```

### FRIEND_ACCEPT

A friend request was accepted. Sent to both users.

```json
{
  "t": "FRIEND_ACCEPT",
  "d": {
    "id": "string (friendship ID)",
    "requestId": "string (original request ID)",
    "user": User
  }
}
```

### FRIEND_REMOVE

A friend was removed. Sent to both users.

```json
{
  "t": "FRIEND_REMOVE",
  "d": {
    "userId": "string"
  }
}
```

### DM_CREATE

A new DM channel was opened. Sent to the recipient.

```json
{
  "t": "DM_CREATE",
  "d": DirectMessageChannel
}
```

---

## WebRTC Voice Signaling Flow (SFU Model)

The backend acts as an SFU (Selective Forwarding Unit) for voice chat.

### Flow

1. **Client sends `VOICE_STATE_UPDATE`** (op 4) with `channelId` to join a voice channel
2. **Server responds with `VOICE_STATE_UPDATE`** dispatch events for all current voice users in that channel
3. **Client creates `RTCPeerConnection`** and sends SDP offer via `VOICE_SIGNAL` dispatch
4. **Server (SFU) handles the offer**, creates an answer, and sends it back via `VOICE_SIGNAL`
5. **ICE candidates** are exchanged bidirectionally via `VOICE_SIGNAL`
6. **When new users join**, the SFU renegotiates with existing peers (sends new offer)
7. **When a user leaves** (VOICE_STATE_UPDATE with `channelId: null`), the SFU removes their tracks and renegotiates

### SFU Responsibilities

- Accept one `RTCPeerConnection` per client
- Forward audio tracks from all other users in the same voice channel
- Handle SDP renegotiation when users join/leave
- Relay ICE candidates
- Track speaking activity (optional: can be done client-side)

---

## Rate Limits

| Endpoint Pattern | Rate Limit |
|------------------|------------|
| `POST /auth/login` | 5 req / minute |
| `POST /auth/register` | 3 req / minute |
| `POST /*/messages` | 5 req / 5 seconds |
| `POST /*/typing` | 5 req / 5 seconds |
| `*` (general) | 50 req / second |

Return `429 Too Many Requests` with `Retry-After` header when exceeded.

---

## Error Response Format

All errors should use consistent JSON format:

```json
{
  "message": "Human-readable error description",
  "code": "MACHINE_READABLE_CODE"
}
```

Common HTTP status codes:
- `400` — Bad Request (validation error)
- `401` — Unauthorized (missing/invalid token)
- `403` — Forbidden (insufficient permissions)
- `404` — Not Found
- `409` — Conflict (duplicate resource)
- `429` — Too Many Requests

---

## WebSocket Close Codes

| Code | Description |
|------|-------------|
| 4000 | Unknown error |
| 4001 | Unknown opcode |
| 4003 | Not authenticated (sent before IDENTIFY) |
| 4004 | Authentication failed |
| 4005 | Already authenticated |
| 4007 | Invalid seq (resume failed) |
| 4009 | Session timed out |

---

## CORS Requirements

The backend must support:

```
Access-Control-Allow-Origin: http://localhost:5173 (dev) / production domain
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

---

## Database Schema Suggestions

The following tables are recommended (any SQL or NoSQL database):

- **users** — id, username, display_name, email, password_hash, avatar, created_at
- **servers** — id, name, icon, owner_id, created_at
- **server_members** — user_id, server_id, nickname, joined_at
- **channels** — id, server_id, name, type, category_id, position, topic
- **channel_categories** — id, server_id, name, position
- **messages** — id, channel_id, author_id, content, created_at, edited_at
- **attachments** — id, message_id, filename, url, content_type, size
- **friends** — id, user_id_1, user_id_2, since
- **friend_requests** — id, from_id, to_id, created_at
- **dm_channels** — id, user_id_1, user_id_2
- **server_invites** — code, server_id, creator_id, expires_at, max_uses, uses
- **sessions** — id, user_id, refresh_token_hash, created_at, expires_at
