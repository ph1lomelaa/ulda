# ULDA - project inf 395

## Project Title - ULDA

Universal LLM-Powered Data Assistant 

## Architecture Link

The detailed architecture document is here: [architecture.md](./architecture.md)

## Deployed URL - https://uldaai.duckdns.org

### Team Members (with Email IDs)

- Altynai Nazik (`230103323`) - Frontend Developer & Database Design - Email: 230103323@sdu.edu.kz
- Muslima Kosmagambetova (`230103269`) - Backend Developer & Database Design - Email: 230103269@sdu.edu.kz
- Zhandos Yeldos (`230103321`) - DevOps & System Architecture - Email: T230103321@sdu.edu.kzODO

## Topic Area

AI/ML Systems, Enterprise Software, Knowledge Management, Natural Language Processing

## Project Summary

ULDA is a document-grounded AI assistant for enterprise data integration. It indexes content into ChromaDB, retrieves relevant context from connected sources, and answers through a provider-backed LLM when configured. The application is designed around a simple idea: one conversational interface should be able to work with uploaded documents, public Google Sheets, and database snapshots without forcing the user to switch between tools.

The full system breakdown is documented in [architecture.md](./architecture.md).

## Problem Statement

Enterprises keep knowledge in spreadsheets, PDFs, documents, and databases, but users still have to search each source separately. That process is slow, error-prone, and not friendly to non-technical users.

ULDA addresses this by providing a unified natural-language interface over uploaded files and connected sources.

## Proposed Solution

ULDA acts as a middleware layer between the user and the data sources. The platform:

- accepts documents and connected sources
- extracts and indexes their contents
- retrieves relevant chunks for each question
- synthesizes answers when an LLM is configured
- preserves citations, history, and audit logs

The assistant is intentionally built to degrade gracefully. If LLM synthesis is unavailable, the system still returns grounded retrieval context instead of failing completely. If a source has not been indexed yet, the UI still remains usable and the user sees the current status of the integration.

## Target Users

- Knowledge workers
- Customer support teams
- Business analysts
- HR teams
- Project managers
- Small and mid-size enterprises

These users typically need quick access to company knowledge without writing SQL, opening multiple documents, or manually copying information from one system into another.

## Key Features

- Multi-source ingestion from uploaded files, Google Sheets, and PostgreSQL
- Natural-language chat over indexed enterprise data
- Citations and grounded retrieval context in answers
- Conversation history retention for continuity
- Optional LLM synthesis with graceful fallback behavior
- Audit logging for major actions and source processing
- Production deployment behind a shared Caddy reverse proxy

## Implemented Scope

- Upload PDF, TXT, CSV, MD, and JSON files
- Connect Google Sheets and PostgreSQL sources
- Index source text into ChromaDB
- Ask questions in chat with citations from retrieved context
- Support optional LLM synthesis over grounded context
- Provide authenticated access with refresh-token cookies
- Record audit logs for major actions
- Run behind Caddy in production under one public domain

Implemented source handling covers:

- uploaded files stored on the server and indexed asynchronously
- PostgreSQL snapshots captured from a configured database connection
- Google Sheets snapshots pulled from a public sheet URL or spreadsheet ID

Implemented assistant behavior covers:

- conversation history retention for continuity
- retrieval scoring, chunk deduplication, and citation building
- casual-message short-circuiting so the assistant can answer simple greetings without a retrieval round trip
- fallback replies when synthesis cannot be completed

## Technology Stack

- Frontend: Vite, React, TypeScript
- Backend: FastAPI, SQLAlchemy, Alembic
- Database: PostgreSQL 16
- Vector store: ChromaDB
- LLM provider layer: OpenAI-compatible client
- Deployment: Docker Compose + Caddy + nginx

The stack was chosen to keep the app container-friendly and easy to deploy on a single server while still supporting future expansion toward more connectors or a different LLM provider.

## Expected Outcome

The expected outcome is a working capstone prototype that demonstrates:

- a public deployed web application
- source ingestion from uploaded files and external connectors
- authenticated access and persistent conversation history
- grounded AI responses with citations
- a production deployment path that runs on the server

## System Report

### Backend

The backend exposes REST endpoints for:

- authentication: register, login, refresh, logout, me
- chat: conversations, messages, export
- data sources: uploads, PostgreSQL, Google Sheets, sync runs
- system status and integrations
- audit logs

The backend keeps user-specific state in PostgreSQL and stores documents, conversations, messages, and audit events in relational tables. It also starts a background job runner on startup to process queued source sync jobs.

The backend code is split into a few clear layers:

- `app/api/` defines the HTTP routes.
- `app/core/` holds configuration and environment loading.
- `app/models/` defines database tables.
- `app/schemas/` defines request and response contracts.
- `app/services/` contains the business logic for auth, retrieval, ingestion, embeddings, storage, and LLM synthesis.

This structure keeps the route handlers thin and pushes real application logic into service modules, which makes the project easier to debug and extend.

### Retrieval Pipeline

Uploaded or connected sources are normalized into text, split into chunks, and stored locally in PostgreSQL and in ChromaDB. When a user asks a question, the backend:

1. loads recent conversation history,
2. retrieves relevant chunks from ChromaDB,
3. builds citations and context blocks,
4. optionally calls the configured LLM provider,
5. falls back to grounded retrieval output when synthesis is unavailable.

The retrieval layer is not just a raw vector search. It also applies lexical scoring, per-document chunk limits, similarity-based deduplication, and excerpt sanitization so the assistant gets cleaner context and does not repeat near-identical passages.

### Frontend

The frontend is a single-page app with these main views:

- landing page
- login and registration
- dashboard
- data sources
- source details
- chat
- connected apps

The UI uses authenticated requests with `credentials: "include"` and a bearer token for the current user session.

The frontend is organized around route-level pages and reusable UI components. The landing page explains the product, the auth pages handle sign-in and registration, the dashboard gives a status overview, and the source/chat pages are the working area for connected data.


## Build And Deployment

The project was assembled and deployed on the server with the current Docker-based stack. The public site runs behind the existing Caddy reverse proxy, and the backend, frontend, PostgreSQL, and ChromaDB services are containerized for server-side execution.

In production, the frontend is built into static files and served by nginx, while the backend is exposed only as an internal service on the Docker network. Caddy sits in front of both containers and routes browser requests to the correct service by path. That keeps the public site on a single domain and makes cookie-based authentication work correctly.


## Deliverables Covered

This repository covers the core capstone deliverables:

- a working web application with a chat interface
- integrations for uploaded files, Google Sheets, and PostgreSQL
- backend API documentation through FastAPI
- a production deployment path for the public server
- unit and integration tests for the main service layers
