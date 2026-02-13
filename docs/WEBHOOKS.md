# Webhooks

Webhooks allow external services to send messages to your Fluffwire server channels.

## Setup

1. Open **Server Settings** (right-click server icon > Server Settings)
2. Go to the **Webhooks** tab
3. Click **Create Webhook**
4. Choose a name, avatar, and target channel
5. Copy the webhook URL

## API

Send a message by making a POST request to the webhook URL. No authentication is required — the URL contains the webhook ID and token.

```
POST /api/webhooks/:webhookId/:token
Content-Type: application/json
```

### Request Body

| Field     | Type   | Required | Description           |
|-----------|--------|----------|-----------------------|
| `content` | string | Yes      | The message content   |

### Examples

**Linux / macOS:**

```bash
curl -X POST https://app.fluffwire.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_TOKEN \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello from a webhook!"}'
```

**Windows (cmd.exe):**

```cmd
curl -X POST https://app.fluffwire.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_TOKEN -H "Content-Type: application/json" -d "{\"content\": \"Hello from a webhook!\"}"
```

**Windows (PowerShell):**

```powershell
curl.exe -X POST https://app.fluffwire.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_TOKEN `
  -H "Content-Type: application/json" `
  -d '{"content": "Hello from a webhook!"}'
```

> Note: In PowerShell, use `curl.exe` — bare `curl` is an alias for `Invoke-WebRequest`.

### Response

- **200 OK** — Message sent successfully
- **400 Bad Request** — Missing or invalid content
- **404 Not Found** — Invalid webhook ID or token

## Notes

- Webhook messages display a **BOT** badge next to the username
- The webhook's configured name and avatar are used as the message author
- Messages support the same markdown formatting as regular messages
