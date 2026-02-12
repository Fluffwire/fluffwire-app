# Fluffwire Production Deployment

## Architecture

```
Browser -> nginx (443/SSL) on app.fluffwire.com
               |-- /api/*  -> proxy_pass -> Docker container (127.0.0.1:3001)
               |-- /ws     -> proxy_pass (WebSocket upgrade) -> Docker container (127.0.0.1:3001)
               |-- /*      -> /var/www/app/ (Vue SPA with try_files fallback)
```

- **Production backend**: port `3001` (mapped to container's internal port `3000`)
- **Development backend**: port `3000` (run directly on host)
- Frontend is a static Vue SPA served by nginx
- Backend runs as a Docker container with `--restart unless-stopped`
- PostgreSQL 16 runs on the host, accessed by the container via Docker bridge gateway (`172.17.0.1`)

## Prerequisites

- Ubuntu with nginx, Let's Encrypt SSL for `app.fluffwire.com`
- Docker installed
- PostgreSQL 16 running on the host
- Node.js (via nvm) for frontend builds
- Go 1.24 + `golang-migrate` CLI for database migrations

## Database Setup

Production uses a separate database (`fluffwire_prod`) and user (`fluffwire_prod`) from development.

### Create prod database & user

```bash
sudo -u postgres psql
```

```sql
CREATE USER fluffwire_prod WITH PASSWORD '<strong-random-password>';
CREATE DATABASE fluffwire_prod OWNER fluffwire_prod;
```

### Run migrations

```bash
cd /home/cryo/fluffwire-server
export PATH=$PATH:/usr/local/go/bin:$HOME/go/bin

migrate -path internal/database/migrations \
  -database "postgres://fluffwire_prod:<url-encoded-password>@localhost:5432/fluffwire_prod?sslmode=disable" up
```

Note: If the password contains special characters (like `/`), URL-encode them (e.g., `/` -> `%2F`).

### Allow Docker connections to PostgreSQL

Add to `/etc/postgresql/16/main/pg_hba.conf`:

```
host    fluffwire_prod  fluffwire_prod  172.17.0.0/16           scram-sha-256
```

Update `/etc/postgresql/16/main/postgresql.conf`:

```
listen_addresses = 'localhost,172.17.0.1'
```

Then restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

## Frontend Deployment

### Build

The frontend uses Vite with environment files:
- `.env.development` — used by `npm run dev` (localhost URLs)
- `.env.production` — used by `npm run build` (production URLs)

`.env.production` contents:

```
VITE_API_BASE_URL=https://app.fluffwire.com/api
VITE_WS_URL=wss://app.fluffwire.com/ws
```

Build and deploy:

```bash
cd /home/cryo/fluffwire-app
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
npm run build
sudo rm -rf /var/www/app/*
sudo cp -r dist/* /var/www/app/
```

## Backend Deployment

### Build Docker image

```bash
cd /home/cryo/fluffwire-server
sudo docker build -t fluffwire-server .
```

### Run container

```bash
sudo docker run -d \
  --name fluffwire-server \
  --restart unless-stopped \
  -p 127.0.0.1:3001:3000 \
  --add-host=host.docker.internal:host-gateway \
  -e PORT=3000 \
  -e "DATABASE_URL=postgres://fluffwire_prod:<url-encoded-password>@host.docker.internal:5432/fluffwire_prod?sslmode=disable" \
  -e "JWT_ACCESS_SECRET=<random-secret>" \
  -e "JWT_REFRESH_SECRET=<random-secret>" \
  -e "CORS_ORIGIN=https://app.fluffwire.com" \
  fluffwire-server
```

Generate secrets with: `openssl rand -base64 32`

### Updating the backend

```bash
cd /home/cryo/fluffwire-server
sudo docker build -t fluffwire-server .
sudo docker stop fluffwire-server
sudo docker rm fluffwire-server
# Re-run the docker run command above
```

## nginx Configuration

The nginx config at `/etc/nginx/sites-enabled/app` handles:

1. **API proxy** (`/api/`) — forwards to backend container on port 3001
2. **WebSocket proxy** (`/ws`) — forwards with Upgrade/Connection headers, 24h timeout
3. **Static assets** — cached for 1 year (css, js, svg, fonts, images)
4. **SPA fallback** (`/`) — `try_files $uri $uri/ /index.html`
5. **SSL** — managed by Certbot/Let's Encrypt
6. **HTTP -> HTTPS redirect** — port 80 redirects to 443

After changes:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Verification Checklist

```bash
# Container running
sudo docker ps --filter name=fluffwire-server

# Backend health (direct)
curl -s http://127.0.0.1:3001/api/health
# Expected: {"status":"ok"}

# Backend health (through nginx)
curl -s https://app.fluffwire.com/api/health
# Expected: {"status":"ok"}

# SPA loads
curl -s -o /dev/null -w "%{http_code}" https://app.fluffwire.com/
# Expected: 200

# SPA fallback works for deep routes
curl -s -o /dev/null -w "%{http_code}" https://app.fluffwire.com/login
# Expected: 200
```

## Troubleshooting

### Check container logs
```bash
sudo docker logs fluffwire-server
sudo docker logs --tail 50 -f fluffwire-server
```

### Database connection issues from container
Verify PostgreSQL is listening on Docker bridge:
```bash
sudo ss -tlnp | grep 5432
```
Should show `172.17.0.1:5432` in addition to `127.0.0.1:5432`.

### Password URL encoding
If DATABASE_URL fails to parse, ensure special characters in the password are URL-encoded:
- `/` -> `%2F`
- `+` -> `%2B`
- `=` -> `%3D`

### Restart everything
```bash
sudo systemctl restart postgresql
sudo docker restart fluffwire-server
sudo systemctl reload nginx
```

## Port Summary

| Service          | Port | Binding        | Purpose     |
|------------------|------|----------------|-------------|
| nginx HTTP       | 80   | 0.0.0.0        | Redirect    |
| nginx HTTPS      | 443  | 0.0.0.0        | Production  |
| Backend (prod)   | 3001 | 127.0.0.1      | Docker      |
| Backend (dev)    | 3000 | localhost       | Direct      |
| PostgreSQL       | 5432 | localhost + 172.17.0.1 | Database |
| Frontend (dev)   | 5173 | localhost       | Vite dev    |
