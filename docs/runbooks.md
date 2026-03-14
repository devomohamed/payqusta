# Runbooks

## API Down

Symptoms:

- `GET /api/health/live` fails
- reverse proxy returns `502/503`

Actions:

1. Check container/process restart count.
2. Inspect latest backend logs in `backend/logs/error.log` or container stdout.
3. Confirm environment variables are present.
4. If the process is crash-looping, inspect webhook alerts for startup failure or uncaught exception details.

## Readiness Failing

Symptoms:

- `GET /api/health/ready` returns `503`
- `GET /api/health` shows `ready: false`

Actions:

1. Check MongoDB connectivity and credentials.
2. Inspect `/api/v1/ops/status` for `database.state` and startup task failures.
3. Verify `MONGODB_URI` and network reachability from the runtime environment.
4. If the database is healthy, review startup task errors and rerun deploy after correction.

## Background Job Failure

Symptoms:

- `/api/v1/ops/status` shows a job with `status: error`
- operational alerts arrive for scheduler issues

Actions:

1. Identify the failing job in `jobs.items`.
2. Check `lastFailureAt`, `error.message`, and `lastContext`.
3. Review the matching business dependency:
   customer/supplier reminders, stock monitoring, or product trends.
4. Fix the underlying dependency or data issue, then confirm the next scheduled run reports `status: ok`.

## Metrics Scrape Failure

Symptoms:

- internal scraper fails on `GET /api/v1/ops/metrics`
- dashboards stop receiving fresh runtime metrics

Actions:

1. Confirm the monitoring token still authenticates against protected vendor/admin routes.
2. Check `GET /api/v1/ops/status` first; if it fails too, investigate auth or process health.
3. If only `/api/v1/ops/metrics` fails, inspect recent backend changes around `healthService` and route protection.
4. Confirm the scraper expects `text/plain` and not JSON.`r`n5. Run `npm --prefix backend run ops:snapshot -- --app-url=https://your-service` to capture a point-in-time snapshot and metrics dump.

## Upload Migration Failure

Symptoms:

- webhook alert titled `Upload migration failed`
- logs contain `[UPLOAD_MIGRATION] Failed during startup`

Actions:

1. Verify whether local upload migration is expected in this environment.
2. Check local filesystem availability and `GCS_BUCKET_NAME` configuration.
3. If migration is not needed, disable `UPLOAD_MIGRATION_ON_START`.
4. If migration is required, rerun after fixing storage credentials or file permissions.

## Backup Restore Drill

Recommended drill:

1. Export a tenant backup with `GET /api/v1/backup/export-json`.
2. Restore it into a clean tenant or staging environment via `POST /api/v1/backup/restore-json`.
3. Validate product, customer, supplier, and invoice counts.
4. Verify login, dashboard, and a sample order/invoice flow.
5. Record restore duration and any manual remediation required.

