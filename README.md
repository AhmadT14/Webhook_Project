# Webhook Project

A simplified Zapier-like webhook processing service built with TypeScript, PostgreSQL, Docker Compose, and GitHub Actions.

## Overview

This service lets users create pipelines where:

1. A unique source webhook URL receives events.
2. A processing action transforms the payload.
3. The transformed payload is delivered to one or more subscriber URLs.

Incoming webhooks are not processed synchronously. They are queued as jobs and processed by a background worker.

Beyond the core spec, this project adds:

- HMAC signature verification on inbound webhooks, and signed outbound deliveries to subscribers
- Per-pipeline rate limiting
- Exponential backoff on retries, with safe concurrent job claiming (`FOR UPDATE SKIP LOCKED`)
- A manual retry endpoint for jobs stuck in `failed`

## Quick Start

### Option A: Run With Docker (Recommended)

1. Clone the repository.
2. Move into the project directory.
3. Copy the example env file (Compose loads `.env` for the API and worker):

```bash
cp .env.example .env
```

4. Start everything:

```bash
docker compose up --build
```

5. API is available at `http://localhost:3000`. `GET /` returns a simple health string.

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

2. Set environment variables (see `.env.example`):

- `DATABASE_URL`
- `ADMIN_API_KEY`

Postgres must already be running and reachable at `DATABASE_URL`.

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
- Node.js 22 + Express
- PostgreSQL 16
- Drizzle ORM + Drizzle migrations
- Docker / Docker Compose
- GitHub Actions (CI)

## Architecture

- API service (`src/app.ts` -> runtime `dist/app.js`): CRUD APIs + webhook ingestion
- Worker service (`src/workerEntry.ts` -> runtime `dist/workerEntry.js`): starts the worker loop that claims queued jobs, processes them, forwards results to subscribers, and retries on failures
- DB service: PostgreSQL 16 (Docker image `postgres:16-alpine`)
- Migration service: runs schema migrations before API/worker start

## Drizzle ORM

This project uses [Drizzle ORM](https://orm.drizzle.team/) for type-safe SQL queries and schema migrations in TypeScript.

- **Schema location:** `src/db/schema.ts`
- **Migrations:** SQL migration files are in the `drizzle/` directory. Migrations are run automatically by the migration service on startup (see Docker Compose).
- **Configuration:** See `drizzle.config.ts` for Drizzle setup.

### Flow

1. Client sends a signed webhook to `POST /api/webhook/:pipelineId`.
2. API checks the pipeline's rate limit for the last 60 seconds; requests over the limit get `429`.
3. API verifies `X-Webhook-Signature` against the pipeline's `signing_secret`; invalid or missing signatures get `400`.
4. API creates one job per subscriber, each with `status = queued` and `next_attempt_at = now()`.
5. Worker claims a due, queued job using `SELECT ... FOR UPDATE SKIP LOCKED`, so multiple worker instances never process the same job twice, then marks it `processing`.
6. Worker runs the pipeline's action against the payload.
7. Worker signs the result and delivers it to the job's subscriber.
8. Delivery attempts are recorded in `delivery_attempts`, success (`sent`) or failure (`failed`).
9. On success: job status -> `completed`.
10. On failure: job goes back to `queued` with `next_attempt_at` pushed out using exponential backoff (30s, 2m, 10m, 30m, 1h). After 5 attempts, the job is marked `failed` permanently.
11. A `failed` job can be manually requeued via `POST /api/jobs/:jobId/retry`.

## Processing Actions

Current supported actions:

- `convertDatesToISO`: recursively converts all date-like strings and Date objects to ISO 8601 strings (including nested objects and arrays)
- `add_event_id`: enriches payload with `event_id` (UUID)
- `redact`: replaces sensitive-key fields (password, token, secret, key, authorization, auth) with `[REDACTED]`

Each pipeline runs exactly one action against every event it receives. Subscribers do not have their own action, they only define where the pipeline's result gets delivered. Subscriber URLs are unique per pipeline (`pipeline_id` + `url`).

## Reliability

### Concurrency-safe job claiming

The worker claims jobs inside a transaction using `SELECT ... FOR UPDATE SKIP LOCKED`. `FOR UPDATE` locks the selected row so no other transaction can touch it until the claim completes; `SKIP LOCKED` means a second worker looking for work simply skips rows already locked by another worker instead of blocking on them. This makes it safe to run more than one worker replica against the same queue without double-processing a job.

### Retry with exponential backoff

Failed deliveries are retried with increasing delay (30s, 2m, 10m, 30m, 1h) rather than immediately, so a struggling subscriber isn't hammered on every worker loop iteration. `next_attempt_at` on the `jobs` table is what the claim query checks before picking up a retry. After 5 attempts, the job is marked `failed` and stops being retried automatically.

### Manual retry

`POST /api/jobs/:jobId/retry` resets a `failed` job back to `queued` with `next_attempt_at = now()`, so it's picked up on the worker's next poll. The endpoint only accepts jobs currently in `failed` status, both as an explicit check (for a clear error message) and as a `WHERE` clause on the update itself, so a race between two retry calls can't double-requeue the same job.

### Rate limiting

Each pipeline has a configurable `rate_limit_per_min` (default 60). Before accepting a webhook, the API counts how many requests that pipeline has received in the last 60 seconds using a Postgres-backed sliding window (not a fixed per-minute bucket, so bursts spanning a minute boundary can't slip through twice the limit). Requests over the limit get `429 Too Many Requests`. This is backed by Postgres (`webhook_requests`) rather than in-memory counters so the limit stays correct even if the API runs as multiple replicas.

Rate-limit accounting runs before signature verification, so a request with a bad signature still counts toward the window if it was accepted by the limiter.

### Signature verification

- **Inbound**: every pipeline has a `signing_secret`, generated once at creation. Incoming webhooks must include `X-Webhook-Signature`, an HMAC-SHA256 of the JSON body using that secret (`sha256=<hex>`). Requests with a missing or invalid signature are rejected with `400` before any job is created.
- **Outbound**: every subscriber has its own `signing_secret`. When the worker delivers a result, it signs the payload the same way and sends it as `X-Webhook-Signature`, so the subscriber can verify the delivery actually came from this service.

The API verifies the signature against `JSON.stringify` of the parsed JSON object. When computing a signature for a test request, hash the exact same serialized body you send.

## API

Base URL: `http://localhost:3000`

### Auth

The following routes require an API key header:

- `/api/pipelines/**`
- `/api/pipelines/:pipelineId/subscribers/**`
- `/api/jobs/**`

Header:

`X-API-Key: <ADMIN_API_KEY>`

The key is compared using a constant-time comparison (`crypto.timingSafeEqual`) to avoid leaking information through response timing.

Note: the webhook ingestion endpoint (`/api/webhook/:pipelineId`) is intentionally public, so external systems can trigger events without an admin key. It is instead protected by per-pipeline signature verification and rate limiting (see above).

### Pipelines

- `GET /api/pipelines`
- `GET /api/pipelines/:pipelineId`
- `POST /api/pipelines`
- `PUT /api/pipelines/:pipelineId`
- `DELETE /api/pipelines/:pipelineId`

Example create payload:

```json
{
  "name": "Redact Pipeline",
  "action": "redact",
  "rate_limit_per_min": 60
}
```

`rate_limit_per_min` is optional on create and update, and defaults to 60. The create response includes the pipeline's `signing_secret`. Save it and use it to sign every webhook sent to this pipeline.

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

The create response includes the subscriber's `signing_secret`, used to verify that a delivered payload actually came from this service.

### Webhook Ingestion

- `POST /api/webhook/:pipelineId`

Headers:

- `Content-Type: application/json`
- `X-Webhook-Signature: sha256=<hmac-sha256 of the JSON body, using the pipeline's signing_secret>`

Body: any JSON object.

Responses:

- `201` — job(s) created, one per subscriber
- `400` — missing/invalid signature, or malformed body
- `404` — pipeline not found, or pipeline has no subscribers
- `429` — pipeline's rate limit exceeded

### Jobs and Delivery History

- `GET /api/jobs`
- `GET /api/jobs/:jobId`
- `POST /api/jobs/:jobId/retry` — requeue a `failed` job; returns `400` if the job is not currently `failed`
- `GET /api/jobs/delivery-attempts`
- `GET /api/jobs/:jobId/delivery-attempts`

### Environment Variables

In Compose, database credentials are already set on the services. `ADMIN_API_KEY` is loaded from `.env` (see `.env.example`):

- `DATABASE_URL=postgresql://webhook_user:webhook_pass@db:5432/webhook_db` (inside Compose)
- `ADMIN_API_KEY=dev-admin-key` (or overridden in `.env`)

For local (non-Docker) runs, `.env.example` uses `localhost` instead of the Compose hostname `db`.

Security note: these defaults are intended for local development/testing only. Do not commit real secrets. `.env` is gitignored; copy from `.env.example` and keep secrets out of `docker-compose.yml`.

If you want a custom key:

```bash
export ADMIN_API_KEY=my-secret-key
docker compose up --build
```

## Example End-to-End Usage

The easiest way to see the full loop without standing up your own receiving server is [webhook.site](https://webhook.site), which gives you a disposable URL and shows every request sent to it live.

### 1. Create a pipeline

```bash
curl -X POST http://localhost:3000/api/pipelines \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-admin-key" \
  -d '{"name": "Redact Pipeline", "action": "redact"}'
```

Save the `id` and `signing_secret` from the response.

### 2. Add a subscriber

```bash
curl -X POST http://localhost:3000/api/pipelines/<PIPELINE_ID>/subscribers \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-admin-key" \
  -d '{"name": "Receiver", "url": "https://webhook.site/<your-id>"}'
```

### 3. Trigger the webhook

Webhooks must be signed. Compute the signature with the pipeline's `signing_secret`. Hash the exact JSON string you will send:

```javascript
const crypto = require("crypto");
const secret = "<PIPELINE_SIGNING_SECRET>";
const body = JSON.stringify({ user: "ahmad", password: "123456" });
const signature = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
console.log(signature);
```

Then send it:

```bash
curl -X POST http://localhost:3000/api/webhook/<PIPELINE_ID> \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: <signature from above>" \
  -d '{"user": "ahmad", "password": "123456"}'
```

### 4. Check job status

```bash
curl http://localhost:3000/api/jobs -H "X-API-Key: dev-admin-key"
```

You should see a job move from `queued` to `completed`, and the redacted payload arrive at your webhook.site URL with a `X-Webhook-Signature` header signed by the subscriber's own secret.

### 5. Simulate and recover from a failure

Point a subscriber at an invalid URL, trigger the webhook, and watch the job retry with increasing delay until it's marked `failed` after 5 attempts. Then call `POST /api/jobs/:jobId/retry` to requeue it.

## CI

### CI (`.github/workflows/ci.yml`)

Runs on push to `main`:

- install dependencies
- build (`npm run build`)
- lint (`npm run lint`)
- format check (`npm run prettier:check`)

## Design Decisions

- **Async processing over sync:** the webhook endpoint only validates, rate-limits, and enqueues jobs, so inbound requests stay fast and resilient even if a subscriber is slow or down.
- **Action lives on the pipeline, not the subscriber:** a pipeline runs exactly one action against every event; subscribers only define delivery destinations. This keeps "what happens to the data" and "where it goes" as separate, single-purpose concerns.
- **Concurrency-safe job claiming:** `FOR UPDATE SKIP LOCKED` was chosen over a naive `SELECT` + `UPDATE` so the worker can safely scale to multiple replicas without a distributed lock or extra infrastructure like Redis.
- **Exponential backoff over fixed-delay retry:** spaces out retries against a failing subscriber instead of hammering it every polling cycle, while still recovering quickly from brief blips.
- **Postgres-backed rate limiting:** kept the project on a single datastore rather than adding Redis, at the cost of a small amount of extra write load per webhook request. A sliding window (not a fixed bucket) avoids the double-burst bug fixed-window limiters have at minute boundaries.
- **Per-pipeline, not global, rate limits:** each pipeline represents a distinct integration; a noisy or misconfigured source shouldn't be able to starve traffic for a different, well-behaved pipeline.
- **HMAC signatures both directions:** inbound signatures prove a webhook actually came from the expected source before it's trusted enough to become a job; outbound signatures let subscribers verify a delivered payload actually came from this service and wasn't spoofed.
- **Delivery attempt auditing:** every attempt, success or failure, is stored in `delivery_attempts` with a status and attempt number, giving a full audit trail per job rather than only the latest state.
- **Simple API-key auth over full user accounts:** a single, DB-independent admin key was enough for this project's scope; the constant-time comparison and header-based check leave room to swap in per-user, DB-backed keys later without changing the route structure.
