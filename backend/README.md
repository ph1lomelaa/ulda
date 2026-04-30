# ULDA Backend

FastAPI backend for ULDA MVP authentication.

## Stack

- FastAPI
- SQLAlchemy 2
- PostgreSQL
- JWT access tokens
- Refresh tokens stored in the database and sent via `HttpOnly` cookie

## Quick Start

```bash
docker compose up --build
```

By default the API runs on `http://127.0.0.1:8000`.

## Manual Backend Run

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

## Environment

Set these values in `.env`:

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@127.0.0.1:55432/ulda
JWT_SECRET_KEY=change-me
JWT_REFRESH_SECRET_KEY=change-me-too
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
FRONTEND_ORIGIN=http://127.0.0.1:5173
FRONTEND_ORIGIN_LOCALHOST=http://localhost:5173
COOKIE_SECURE=false
UPLOAD_STORAGE_DIR=storage/uploads
CHROMA_HOST=127.0.0.1
CHROMA_PORT=8001
CHROMA_COLLECTION_PREFIX=ulda
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
RETRIEVAL_CANDIDATE_LIMIT=8
RETRIEVAL_CONTEXT_LIMIT=5
RETRIEVAL_SCORE_THRESHOLD=0.2
RETRIEVAL_MAX_CHUNKS_PER_DOCUMENT=2
RETRIEVAL_DEDUP_SIMILARITY=0.92
CONVERSATION_HISTORY_LIMIT=8
CITATION_EXCERPT_CHARS=240
ASSISTANT_SYSTEM_PROMPT=You are ULDA, an enterprise data assistant. Use indexed documents as your primary context, but answer like a capable AI assistant: explain, summarize, infer, reorganize, and help the user work with the material. Prefer grounded answers when the documents are relevant, cite the relevant sources when you use them, and if the documents are incomplete, you may still answer helpfully from general knowledge without pretending the files said something they did not.
```

## Auth Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## Database Migrations

```bash
cd backend
source .venv/bin/activate
alembic upgrade head
```
