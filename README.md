# ULDA Dashboard UI Design

ULDA is a document-grounded AI assistant. Users upload or connect data sources, ULDA indexes them into ChromaDB, and the chat uses those documents as primary context while still answering naturally like an AI assistant.

## Stack

- `frontend/`: Vite + React
- `backend/`: FastAPI + SQLAlchemy + Alembic
- `postgres`: primary relational database
- `chroma`: vector store for retrieval
- `docker-compose.yml`: local development stack
- `docker-compose.prod.yml`: production stack behind Caddy

## Project Structure

```text
.
├── .env.example
├── .env.production.example
├── Caddyfile
├── docker-compose.yml
├── docker-compose.prod.yml
├── backend/
└── frontend/
```

## Environment

The main `.env` file belongs in the project root.

For local development:

```bash
cp .env.example .env
```

For production on the server:

```bash
cp .env.production.example .env
```

Notes:

- Docker Compose reads the root `.env`.
- The backend is configured to read that same root `.env` even if you start it from inside `backend/`.
- `LLM_API_KEY` is optional, but without it the app falls back to retrieval-only responses instead of LLM synthesis.
- The default provider is `xAI` with `LLM_BASE_URL=https://api.x.ai/v1` and `LLM_MODEL=grok-3-mini`.

## Local Development

Start from the project root:

```bash
docker compose up --build -d
```

Stop:

```bash
docker compose down
```

Stop and remove volumes:

```bash
docker compose down -v
```

## Option 2: Run Behind Caddy On A Server

Use the root `docker-compose.yml` and the [Caddyfile](/Users/muslimakosmagambetova/Downloads/ULDA%20Dashboard%20UI%20Design/Caddyfile):

```bash
docker compose up -d --build
```

Required setup:

- Create the external Docker network `bull_project_default` if it does not already exist.
- Run Caddy with the provided Caddyfile so it can reverse proxy to `frontend:80` and `backend:8000`.
- Set `DOMAIN`, `FRONTEND_ORIGIN`, `JWT_SECRET_KEY`, `JWT_REFRESH_SECRET_KEY`, and `LLM_API_KEY` in the server environment.
- Keep `VITE_API_BASE_URL=/api` for the prod frontend build so browser requests go through Caddy.

Services:

- frontend: `http://127.0.0.1:5173`
- backend API: `http://127.0.0.1:18000`
- backend docs: `http://127.0.0.1:18000/docs`
- PostgreSQL: `127.0.0.1:55432`
- ChromaDB: `http://127.0.0.1:8001`

## Production Deployment

Production uses:

- `frontend/Dockerfile.prod`: builds Vite and serves static files with nginx
- `Caddyfile`: serves the domain, terminates TLS, proxies `/api/*` to backend
- `docker-compose.prod.yml`: production stack

### 1. Point the domain to the server


Create an `A` record for your domain and point it to the public IP of the server.

Examples:

- `your-domain.com` -> `SERVER_IP`
- `www.your-domain.com` -> `SERVER_IP` if you want `www` too

### 2. Prepare production env

On the server, in the project root:

```bash
cp .env.production.example .env
```

Then set at minimum:

```env
DOMAIN=your-domain.com
FRONTEND_ORIGIN=https://your-domain.com
COOKIE_DOMAIN=your-domain.com
POSTGRES_PASSWORD=strong-password
JWT_SECRET_KEY=strong-secret
JWT_REFRESH_SECRET_KEY=strong-secret-too
GEMINI_API_KEY=your-key
```

Important:

- `COOKIE_SECURE=true` should stay enabled in production
- `VITE_API_BASE_URL=/api` lets frontend and backend work under one domain
- backend uses `postgres` and `chroma` by Docker service name internally, so they are not exposed publicly

### 3. Make sure ports 80 and 443 are free

On the server:

```bash
ss -tulpn | grep -E ':80 |:443 '
```

If another reverse proxy already owns them, either stop it or integrate ULDA into that existing proxy instead of starting the bundled Caddy container.

### 4. Start production stack

From the project root:

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

Check status:

```bash
docker compose -f docker-compose.prod.yml ps
```

Check logs:

```bash
docker compose -f docker-compose.prod.yml logs -f caddy
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
```

### 5. Open the app

- `https://your-domain.com`
- backend API through Caddy: `https://your-domain.com/api`

## Manual Local Run

Use this if you want faster iteration without full Docker frontend/backend rebuilds.

### 1. Start infrastructure

```bash
docker compose up -d postgres chroma
```

### 2. Start backend

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 18000
```

### 3. Start frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Testing

Backend tests:

```bash
cd backend
PYTHONPATH=. pytest
```

Frontend production build:

```bash
cd frontend
npm run build
```

## Common Problems

### Docker cannot pull images

Symptom:

- `failed to resolve source metadata`
- `lookup registry-1.docker.io: no such host`

Meaning:

- Docker Desktop or Docker Engine cannot resolve or reach Docker Hub.

### HTTPS does not come up

Check:

- DNS `A` record points to the correct server IP
- ports `80` and `443` are reachable from the internet
- no other proxy/container already binds `80/443`
- Caddy logs are clean

### Backend works but login/cookies fail in production

Check:

- `FRONTEND_ORIGIN=https://your-domain.com`
- `COOKIE_DOMAIN=your-domain.com`
- `COOKIE_SECURE=true`
- the site is opened over `https`, not plain `http`

## Useful Commands

Local stack:

```bash
docker compose up --build -d
docker compose down
```

Production stack:

```bash
docker compose -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.prod.yml down
```
