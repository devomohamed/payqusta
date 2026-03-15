# Production Ops

This document covers the production-facing operational surface added for PayQusta phase 3.

## Health Endpoints

- `GET /api/health`
  Returns public status, readiness flag, database summary, and background job summary.
- `GET /api/health/live`
  Liveness probe. Use this to confirm the Node process is serving requests.
- `GET /api/health/ready`
  Readiness probe. Returns `200` only when MongoDB is connected and blocking startup checks are complete.
- `GET /api/v1/health`
  Versioned alias for API clients that already use `/api/v1`.
- `GET /api/v1/ops/status`
  Protected endpoint for vendor/admin users. Returns detailed process info, runtime state, job history, and config flags.
- `GET /api/v1/ops/metrics`
  Protected Prometheus-style metrics surface for internal scrapers and dashboards.

## Runtime Tracking

The backend now tracks:

- MongoDB connection readiness
- startup tasks and whether they are blocking or non-blocking
- background jobs with last run status, last success/failure time, and run context
- container/server listening time and process uptime

Tracked jobs:

- `customer_installment_reminders`
- `supplier_payment_reminders`
- `installment_overdue_sync`
- `stock_monitor`
- `product_trends`
- `tenant_auto_backup`

## Alerting

Set `WEBHOOK_URL` to a Slack incoming webhook or Discord webhook URL.

Critical process-level alerts now send webhook notifications for:

- startup failures
- unhandled promise rejections
- uncaught exceptions
- deferred upload migration failures

Tenant-facing in-app alerts also exist for:

- auto-backup failures

## Logging

Relevant env vars:

- `LOG_LEVEL`
- `LOG_SILENT`
- `WEBHOOK_URL`

Log locations:

- local backend logs: `backend/logs/`
- container logs: `/app/backend/logs/`

## Docker / Compose

Build and run locally with:

```bash
docker compose -f backend/docker-compose.yml up --build -d
```

The Docker healthcheck now targets:

```text
/api/health/ready
```

The compose file now builds from the repository root and uses `backend/Dockerfile`, which matches the current `backend/` + `frontend/` layout.

## Backup and Restore

Tenant-safe backup endpoints already in the platform:

- `GET /api/v1/backup/export`
- `GET /api/v1/backup/export-json`
- `GET /api/v1/backup/stats`
- `GET /api/v1/backup/auto-settings`
- `PUT /api/v1/backup/auto-settings`
- `POST /api/v1/backup/restore`
- `POST /api/v1/backup/restore-json`

Platform control-plane backup endpoints for the system owner:

- `GET /api/v1/super-admin/backup/stats`
- `GET /api/v1/super-admin/backup/export-json`
- `GET /api/v1/super-admin/backup/export-full-json`
- `POST /api/v1/super-admin/backup/restore-json`
- `POST /api/v1/super-admin/backup/restore-full-json`

Recommended cadence:

- enable daily auto backup for every active tenant that accepts the opt-in
- keep manual JSON export before high-risk maintenance or migration work
- run weekly restore drills into a clean tenant or staging database
- review failure notifications after every failed scheduled backup

## Minimum Monitoring Setup

At minimum, production should monitor:

- `GET /api/health/live` every 30-60 seconds
- `GET /api/health/ready` every 30-60 seconds
- `GET /api/v1/ops/status` from an authenticated internal monitor
- `GET /api/v1/ops/metrics` from an authenticated internal scraper
- process/container restarts
- MongoDB availability
- webhook alert delivery success
- failed auto-backup notifications or repeated backup failures

## Scripted Monitoring Helpers

Local or operator-triggered helpers now available:

- `npm --prefix backend run release:smoke -- --app-url=https://payqusta.store`
- `npm --prefix backend run release:validate -- --app-url=https://payqusta.store --write-json=backend/artifacts/release-validation.json --write-markdown=backend/artifacts/release-validation.md`
- `npm --prefix backend run ops:snapshot -- --app-url=https://payqusta.store --write-json=backend/artifacts/ops-snapshot.json --write-metrics=backend/artifacts/ops-metrics.prom`

`release:validate` is the stricter rollout gate. It fails when:

- readiness is not green
- startup tasks are failing
- failing jobs exceed the configured threshold
- expired job locks exceed the configured threshold
- required ops metrics are missing

## GitHub Rollout Validation

The repository now ships a manual/scheduled workflow:

- `.github/workflows/rollout-validation.yml`

Usage:

1. Set repository secret `OPS_MONITOR_URL` to the deployed public URL.
2. Set repository secret `OPS_BEARER_TOKEN` to a valid admin/vendor bearer token if protected ops checks should run.
3. Trigger the workflow manually after deploy, or let the daily schedule run.
4. Download the uploaded artifacts if you need the latest JSON snapshot, Prometheus metrics dump, or rollout gate report.
