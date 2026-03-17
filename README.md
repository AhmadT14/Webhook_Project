# Webhook Project

A simplified Zapier-like webhook processing service built with TypeScript, PostgreSQL, Docker Compose, and GitHub Actions.

## Overview

This service lets users create pipelines where:

1. A unique source webhook URL receives events.
2. A processing action transforms the payload.
3. The transformed payload is delivered to one or more subscriber URLs.

Incoming webhooks are not processed synchronously. They are queued as jobs and processed by a background worker.

## Quick Start

### Option A: Run With Docker (Recommended)

1. Clone the repository.
2. Move into the project directory.
3. Start everything:

```bash
docker compose up --build
```

4. API is available at `http://localhost:3000`.

Compose will start:

- `db` (Postgres)
- `migrate` (runs Drizzle migrations)
- `api`
- `worker`

No extra command is needed to start the server or worker.

### Option B: Run Without Docker

1. Install dependencies:

```bash
npm install
```

2. Set environment variables:

- `DATABASE_URL`
- `ADMIN_API_KEY`

3. Run migrations:

```bash
npm run db:migrate
```

4. Start API in terminal 1:

```bash
npm run dev
```

5. Start worker in terminal 2:

```bash
npm run worker
```

## Tech Stack

- TypeScript
- Node.js + Express
- PostgreSQL
- Drizzle ORM + Drizzle migrations
- Docker / Docker Compose
- GitHub Actions (CI + CD)

## Architecture

- API service (`src/app.ts` -> runtime `dist/app.js`): CRUD APIs + webhook ingestion
- Worker service (`src/workerEntry.ts` -> runtime `dist/workerEntry.js`): starts the worker loop that polls queued jobs, processes, forwards to subscribers, and retries on failures
- DB service: PostgreSQL 16 (Docker image `postgres:16-alpine`)
- Migration service: runs schema migrations before API/worker start

### Flow

1. Client sends webhook to `POST /api/webhook/:pipelineId`.
2. API validates pipeline and stores job in `jobs` table with `queued` status.
3. Worker picks queued job and marks it `processing`.
4. Worker applies the pipeline action.
5. Worker forwards result to all subscribers.
6. Delivery attempts are recorded in `delivery_attempts`.
7. If all deliveries succeed: job status -> `sent`.
8. If failures occur: job is re-queued and retried up to 5 attempts, then marked `failed`.

## Processing Actions

Current supported actions:

- `uppercase`: recursively uppercases all string values (including nested objects and arrays)
- `add_event_id`: enriches payload with `event_id` (UUID)
- `redact`: replaces sensitive-key fields (password, token, secret, key, authorization, auth) with `[REDACTED]`

## API

Base URL: `http://localhost:3000`

### Auth

The following routes require API key header:

- `/api/pipelines/**`
- `/api/pipelines/:pipelineId/subscribers/**`
- `/api/jobs/**`

Header:

`X-API-Key: <ADMIN_API_KEY>`

Note: webhook ingestion endpoint (`/api/webhook/:pipelineId`) is intentionally public so external systems can trigger events.

### Pipelines

- `GET /api/pipelines`
- `GET /api/pipelines/:pipelineId`
- `POST /api/pipelines`
- `PUT /api/pipelines/:pipelineId`
- `DELETE /api/pipelines/:pipelineId`

Example create payload:

```json
{
  "name": "Uppercase Orders",
  "action": "uppercase"
}
```

### Subscribers (scoped to pipeline)

- `GET /api/pipelines/:pipelineId/subscribers`
- `GET /api/pipelines/:pipelineId/subscribers/:subscriberId`
- `POST /api/pipelines/:pipelineId/subscribers`
- `PUT /api/pipelines/:pipelineId/subscribers/:subscriberId`
- `DELETE /api/pipelines/:pipelineId/subscribers/:subscriberId`

Example create payload:

```json
{
  "name": "Audit Endpoint",
  "url": "https://example.com/webhooks/audit"
}
```

### Webhook Ingestion

- `POST /api/webhook/:pipelineId`

Body: any JSON object.

### Jobs and Delivery History

- `GET /api/jobs`
- `GET /api/jobs/:jobId`
- `GET /api/jobs/delivery-attempts`
- `GET /api/jobs/:jobId/delivery-attempts`

### Environment Variables

In Compose, defaults are already set:

- `DATABASE_URL=postgresql://webhook_user:webhook_pass@db:5432/webhook_db`
- `ADMIN_API_KEY=dev-admin-key` (or overridden from shell/.env)

If you want a custom key:

```bash
export ADMIN_API_KEY=my-secret-key
docker compose up --build
```

## Example End-to-End Usage

### 1. Create pipeline

```bash
curl -X POST http://localhost:3000/api/pipelines \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $ADMIN_API_KEY" \
  -d '{"name":"Redact Pipeline","actions":"redact"}'
```

### 2. Add subscribers

```bash
curl -X POST http://localhost:3000/api/pipelines/<PIPELINE_ID>/subscribers \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $ADMIN_API_KEY" \
  -d '{"name":"Receiver","url":"https://webhook.site/<id>"}'
```

### 3. Trigger webhook

```bash
curl -X POST http://localhost:3000/api/webhook/<PIPELINE_ID> \
  -H "Content-Type: application/json" \
  -d '{"user":"ahmad","password":"123456"}'
```

### 4. Check job history

```bash
curl -X GET http://localhost:3000/api/jobs \
  -H "X-API-Key: $ADMIN_API_KEY"
```

## CI/CD

### CI (`.github/workflows/ci.yml`)

Runs on push to `main`:

- install dependencies
- build (`npm run build`)
- lint (`npm run lint`)
- format check (`npm run prettier_check`)

### CD (`.github/workflows/cd.yml`)

Runs on push to `main`:

- install dependencies
- build app
- authenticate to GCP
- build and push container to Artifact Registry

## Design Decisions

- **Async processing over sync:** webhook endpoint only enqueues jobs so inbound requests stay fast and resilient.
- **Worker retry strategy:** transient downstream failures are retried up to 5 attempts.
- **Delivery attempt auditing:** every subscriber forwarding attempt is stored in DB for traceability.
- **Scoped subscribers:** subscribers belong to a pipeline and are managed through nested routes.
- **Simple API-key auth:** protects management and job introspection APIs while allowing inbound webhook triggers.
