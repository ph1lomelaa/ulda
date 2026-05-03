# ULDA Architecture

## 1. Overview

ULDA is a document-grounded AI assistant built as a containerized web application. It combines four major layers:

- a React frontend for user interaction
- a FastAPI backend for auth, chat, source ingestion, and retrieval
- PostgreSQL and ChromaDB for persistence and vector search
- Caddy as the public reverse proxy in production

The deployment is designed around a single public domain. Browser traffic goes to Caddy, Caddy routes `/api/*` to the backend, and all other traffic goes to the frontend container.

## 2. Execution Contour

```text
Browser
  |
  v
Public domain on Caddy
  |
  +--> /api/* -> backend container
  |
  +--> everything else -> frontend container

Backend container
  |
  +--> PostgreSQL
  +--> ChromaDB
  +--> external LLM API when configured
```

The frontend uses relative `/api` requests in production, so the browser does not need to know the backend host directly. That keeps cookies, CORS, and container movement simpler.

## 3. Repository Layout

```text
.
├── README.md
├── architecture.md
├── Caddyfile
├── docker-compose.yml
├── .env.example
├── backend/
└── frontend/
```

### 3.1 Root Files

- `README.md`: capstone report and summary
- `architecture.md`: full architecture and deployment map
- `Caddyfile`: reverse-proxy configuration for production
- `docker-compose.yml`: runtime composition for server deployment
- `.env.example`: example environment variables without secrets

### 3.2 Backend Folder

```text
backend/
├── app/
├── alembic/
├── tests/
├── requirements.txt
├── Dockerfile
└── start.sh
```

Important backend subfolders:

- `app/api/`: route groups and HTTP endpoints
- `app/core/`: configuration and settings
- `app/db/`: database session and base definitions
- `app/models/`: SQLAlchemy models
- `app/schemas/`: Pydantic request and response schemas
- `app/services/`: ingestion, retrieval, auth, chat, embeddings, connectors, and background jobs
- `alembic/`: database migrations
- `tests/`: backend tests for retrieval, connectors, text parsing, and chat flow

Backend execution files:

- `backend/Dockerfile`: builds the backend image
- `backend/start.sh`: container entrypoint
- `backend/alembic.ini`: Alembic configuration

### 3.3 Frontend Folder

```text
frontend/
├── src/
├── Dockerfile
├── Dockerfile.prod
├── nginx.conf
├── package.json
└── vite.config.ts
```

Important frontend subfolders:

- `src/app/pages/`: top-level application pages
- `src/app/api/`: browser API wrappers
- `src/app/auth/`: authentication state and guards
- `src/app/components/`: reusable UI components
- `src/styles/`: global styles, theme, and font setup
- `src/app/data/`: mock data for some screens

Frontend execution files:

- `frontend/Dockerfile`: local Vite development image
- `frontend/Dockerfile.prod`: production static build
- `frontend/nginx.conf`: SPA fallback for direct route refreshes

## 4. System Roles

### 4.1 Frontend

The frontend is a single-page application. It renders:

- landing page
- login and registration
- dashboard
- data sources
- source detail
- chat
- connected apps

It sends requests with `fetch`, usually using `credentials: "include"` so refresh-token cookies work correctly.

### 4.2 Backend

The backend exposes API route groups for:

- `auth`
- `chat`
- `sources`
- `system`
- `audit`

It also starts a background job runner on startup so queued source sync tasks are processed automatically.

### 4.3 Storage

PostgreSQL stores:

- users
- refresh sessions
- data sources
- documents
- document chunks
- conversations
- messages
- source sync runs
- audit logs

ChromaDB stores chunk embeddings for retrieval.

## 5. Backend Architecture

### 5.1 API Layer

`backend/app/api/router.py` registers the route groups under the global API prefix. The backend entrypoint is `backend/app/main.py`, which:

- creates the FastAPI app
- installs CORS middleware
- mounts the API router
- starts and stops the background source sync worker

### 5.2 Core Services

- `security.py` handles password hashing, JWT access tokens, and refresh-token creation.
- `chat_service.py` builds the final assistant response from retrieval context and optional LLM synthesis.
- `rag_pipeline.py` scores, deduplicates, and formats retrieved chunks into citations and prompt blocks.
- `source_ingestion.py` processes uploads, PostgreSQL sources, and Google Sheets sources.
- `google_sheets_connector.py` accepts either a full spreadsheet URL or a spreadsheet ID and exports the public sheet as CSV.
- `postgres_connector.py` validates and extracts PostgreSQL snapshots.
- `chroma_store.py` writes and queries embeddings in ChromaDB.
- `job_runner.py` polls queued sync jobs and executes ingestion in the background.
- `chat_fallbacks.py` controls graceful fallback messages when retrieval or synthesis is weak.

### 5.3 Request Lifecycle

1. FastAPI creates the app in `backend/app/main.py`.
2. CORS is installed using the configured frontend origins.
3. API routers are mounted under the configured API prefix.
4. On startup, the backend ensures the upload directory exists.
5. The source sync runner starts polling queued jobs.
6. On shutdown, the worker thread is stopped cleanly.

### 5.4 Chat Logic

The chat flow is layered to avoid hard failures:

- casual greetings are answered immediately
- if there are no indexed sources, the assistant returns a generic fallback
- if there are indexed sources, the backend retrieves candidate chunks from ChromaDB
- retrieved chunks are turned into citations and context blocks
- an OpenAI-compatible client is used for synthesis when an LLM key is configured
- if synthesis fails, the system falls back to grounded retrieval text instead of crashing

The retrieval layer is not just raw vector search. It also applies lexical scoring, per-document chunk limits, similarity-based deduplication, and excerpt sanitization so the assistant gets cleaner context and does not repeat near-identical passages.

## 6. Data Ingestion Pipeline

The source pipeline is the same for uploads and connected sources:

1. create a `data_source`
2. create a `document`
3. create a `source_sync_run`
4. extract text from the file or connector
5. sanitize and chunk the text
6. store chunks in PostgreSQL
7. embed chunks and write them to ChromaDB
8. mark the source ready

Supported source types include:

- uploaded files
- PostgreSQL snapshots
- Google Sheets snapshots

## 7. Frontend Architecture

The frontend uses route-based navigation defined in `frontend/src/app/routes.tsx`. The shell layout is handled by `AppLayout`, and authentication state is managed in `AuthProvider`.

The frontend API layer is split by feature:

- `auth.ts`
- `chat.ts`
- `sources.ts`
- `system.ts`
- `audit.ts`

The frontend build is split into two modes:

- `frontend/Dockerfile` for local Vite development
- `frontend/Dockerfile.prod` for production static builds served by nginx

The production nginx config uses SPA fallback so refreshing a deep route still works.

The frontend data flow is:

1. The router loads the requested page.
2. `AuthProvider` restores the user session from the stored access token or refresh cookie.
3. Pages call feature-specific API wrappers in `frontend/src/app/api/`.
4. API wrappers use `credentials: "include"` so refresh cookies stay attached.
5. Protected pages render only after auth state is resolved.

## 8. Docker And Deployment

### 8.1 Compose Layout

The root `docker-compose.yml` defines:

- `postgres`
- `chroma`
- `backend`
- `frontend`

It is the main runtime definition used on the server.

The compose file mirrors the app layers:

- `postgres` stores relational state.
- `chroma` stores the vector index.
- `backend` exposes the FastAPI API only inside Docker.
- `frontend` serves the built React app on port `80` inside Docker.

### 8.2 Backend Container

The backend container:

- installs Python dependencies from `backend/requirements.txt`
- copies the application code and Alembic migrations
- creates the uploads directory
- exposes port `8000` internally
- starts `backend/start.sh`

At runtime, the backend reads configuration from the root `.env`, connects to PostgreSQL and ChromaDB by service name, and handles API requests from the reverse proxy.

### 8.3 Frontend Container

The frontend container in production:

- runs a Node build stage to compile the React app
- injects `VITE_API_BASE_URL=/api`
- serves the compiled static files with nginx on port `80`

This means the frontend is not running a dev server in production. The build happens once at container build time, and nginx serves the resulting static assets.

### 8.4 Caddy

Caddy is not created by this repo as a new public listener. Instead, the project assumes an existing server Caddy container is already running.

The server Caddy must:

- listen on ports `80` and `443`
- be connected to the shared Docker network `bull_project_default`
- load a Caddyfile block for the ULDA domain

Recommended routing:

- `/api/*` -> `ulda-backend:8000`
- everything else -> `ulda-frontend:80`

The current deployment uses service aliases so both `backend`/`frontend` and `ulda-backend`/`ulda-frontend` can be resolved from the proxy side.

The Caddyfile is intentionally simple because the actual application containers already expose stable internal hostnames on the shared network.

### 8.5 Why The Network Matters

The `backend` and `frontend` containers must be on the same Docker network as Caddy. Otherwise Caddy cannot resolve the container hostnames and API requests fail with request/network errors.

### 8.6 Docker Build Flow

`backend/Dockerfile`:

1. starts from `python:3.11-slim`
2. installs Python dependencies from `requirements.txt`
3. copies Alembic and application code
4. creates the upload storage directory
5. exposes port `8000`
6. runs `start.sh`

`frontend/Dockerfile.prod`:

1. starts from `node:20-alpine`
2. installs Node dependencies
3. builds the React app with `VITE_API_BASE_URL=/api`
4. switches to `nginx:1.27-alpine`
5. copies in `nginx.conf`
6. serves the compiled static files from `/usr/share/nginx/html`

The reverse proxy is external to the app images. The existing server Caddy container just reloads the `Caddyfile` and proxies browser requests to the correct service.

## 9. Environment And Secrets

The project reads configuration from the root `.env` file.

Important runtime variables:

- `DATABASE_URL`
- `JWT_SECRET_KEY`
- `JWT_REFRESH_SECRET_KEY`
- `FRONTEND_ORIGIN`
- `COOKIE_SECURE`
- `COOKIE_DOMAIN`
- `LLM_PROVIDER`
- `LLM_API_KEY`
- `LLM_BASE_URL`
- `LLM_MODEL`
- `VITE_API_BASE_URL`

Recommended production values:

- `FRONTEND_ORIGIN=https://your-domain`
- `COOKIE_SECURE=true`
- `COOKIE_DOMAIN=your-domain`
- `VITE_API_BASE_URL=/api`
- `LLM_PROVIDER` matching the actual provider key you have

Secrets are not meant to be committed to Git. The repository ignores `.env` files by default.

## 10. Operational Notes

- `LLM_API_KEY` enables synthesis, but the app still works in retrieval-only mode.
- Google Sheets must be public or export-accessible for the connector to work.
- CORS and cookies depend on `FRONTEND_ORIGIN`, `COOKIE_DOMAIN`, and HTTPS.
- If a backend container is not attached to the shared Docker network, Caddy cannot proxy to it.
- If `.env` is committed, rotate the exposed keys immediately.

## 11. Deployment Constraints

- The server already has a Caddy container listening on `80` and `443`.
- ULDA must join the existing Docker network instead of starting a new public proxy.
- The frontend should be accessed through the public domain, not through `localhost`.
- The backend should be reached only through Caddy in normal operation.

## 12. Risks And Constraints

- A bad LLM key causes synthesis fallback, not a hard crash.
- A private Google Sheet cannot be exported by the connector.
- Secure cookies require the deployed site to be served over HTTPS.
- The shared reverse proxy must be kept in sync with the actual container names and network aliases.
