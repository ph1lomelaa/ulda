# ULDA Dashboard UI Design

ULDA is a document-grounded AI assistant. Users upload or connect data sources, ULDA indexes them into ChromaDB, and the chat uses those documents as primary context while still answering naturally like an AI assistant.

## Stack

- `frontend/`: Vite + React
- `backend/`: FastAPI + SQLAlchemy + Alembic
- `postgres`: primary relational database
- `chroma`: vector store for retrieval
- `docker-compose.yml`: local full-stack orchestration

## Project Structure

```text
.
├── .env.example
├── docker-compose.yml
├── backend/
└── frontend/
```

## Environment

The main `.env` file belongs in the project root, next to `docker-compose.yml`.

Create it from the template:

```bash
cp .env.example .env
```

Notes:

- Docker Compose reads the root `.env`.
- The backend is configured to read that same root `.env` even if you start it from inside `backend/`.
- `GEMINI_API_KEY` is optional, but without it the app falls back to retrieval-only responses instead of LLM synthesis.

## Option 1: Run With Docker Compose

Start from the project root:

```bash
docker compose up --build
```

Run in background:

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

Services:

- frontend: `http://127.0.0.1:5173`
- backend API: `http://127.0.0.1:18000`
- backend docs: `http://127.0.0.1:18000/docs`
- PostgreSQL: `127.0.0.1:55432`
- ChromaDB: `http://127.0.0.1:8001`

Important:

- Docker must be able to reach Docker Hub to pull base images like `python:3.11-slim` and `node:20-alpine`.
- If `docker compose up --build` fails with `lookup registry-1.docker.io: no such host`, that is a Docker Desktop DNS/network issue on the machine, not an app code issue.



# ULDA Frontend

Frontend for the ULDA dashboard prototype, moved into the `frontend/` folder and cleaned up for local development.

## Run locally

From the repository root:

```bash
cd frontend
npm install
npm run dev
```

Vite will print the local URL, usually `http://localhost:5173`.

## Build

```bash
cd frontend
npm run build
```
  
