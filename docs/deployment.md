# Deployment

## Supported runtime model

The repository is currently optimized for a single deployable service:

- backend API
- background jobs
- production static serving of `frontend/dist`

That means production boot normally looks like:

1. build the frontend
2. start `backend/server.js`
3. let Express serve API + frontend

## Local production simulation

```bash
cd frontend
npm run build
cd ..
npm start
```

Important:

- `npm start` at the repo root runs `node backend/server.js`.
- The frontend must already be built into `frontend/dist`.
- Runtime env vars must be available to the backend process.

## Local development

Use separate dev servers:

```bash
cd backend
npm run dev
```

```bash
cd frontend
npm run dev
```

The Vite dev server proxies `/api` and `/uploads` to `http://127.0.0.1:5000`.

## Cloud Run flow in this repo

`deploy-cloudrun.ps1` is the current deployment script for Google Cloud Run.

Before rollout, copy `cloudrun.env.example` to a local `cloudrun.env` and fill in the real secrets. `cloudrun.env` should stay untracked.

It performs these steps:

1. validates that `gcloud.cmd` exists
2. validates that `cloudrun.env` exists
3. runs `backend/scripts/release-preflight.js`
4. optionally runs `backend/scripts/migrate-local-uploads-to-db.js`
5. builds the frontend
6. deploys the service with `gcloud run deploy --source .`
7. reads the deployed service URL
8. updates `CLIENT_URL` and `APP_URL` on the Cloud Run service
   - uses `DEPLOY_PUBLIC_URL` from the operator shell if present
   - otherwise prefers `APP_URL` or `CLIENT_URL` from `cloudrun.env`
   - falls back to the raw Cloud Run `run.app` URL only if no public URL is configured
9. performs a health check against `/api/health`
10. runs `backend/scripts/post-deploy-smoke.js`

Current defaults inside the script:

- project: `payqusta`
- service: `payqusta`
- region: `us-central1`

## Required production concerns

### Core env vars

At minimum, production should define:

- `NODE_ENV=production`
- `PORT`
- `MONGODB_URI`
- `JWT_SECRET`
- `CLIENT_URL`
- `APP_URL`

### Recommended env vars

- `PLATFORM_ROOT_DOMAIN`
- `RESERVED_PLATFORM_SUBDOMAINS`
- `LOG_LEVEL=info`
- `SENTRY_DSN`
- upload storage variables (`GCS_*` or `UPLOAD_STORAGE`)
- `OPS_BEARER_TOKEN`
- `OPS_MONITOR_URL`
- `PAYMOB_API_KEY`
- `PAYMOB_HMAC_SECRET`
- `BOSTA_API_KEY`
- `BOSTA_WEBHOOK_SECRET`

### Upload storage

Do not assume local disk is durable in managed platforms.

Recommended choices:

- `UPLOAD_STORAGE=gcs` for durable object storage
- `UPLOAD_STORAGE=mongodb` only as a fallback when GCS is unavailable

### Background jobs

`backend/server.js` starts scheduled jobs in-process. Production deployment therefore must assume:

- every running instance may attempt to schedule jobs
- job observability matters
- horizontal scaling should be evaluated carefully if jobs are not yet leader-elected

## Health and operational endpoints

Public endpoints:

- `/api/health`
- `/api/health/live`
- `/api/health/ready`

Authenticated ops endpoint:

- `/api/v1/ops/status`
- `/api/v1/ops/metrics`

Swagger:

- `/api-docs`
- `/api-docs.json`

Recommended use:

- liveness probe -> `/api/health/live`
- readiness probe -> `/api/health/ready`
- post-deploy smoke check -> `/api/health`
- scripted preflight -> `npm --prefix backend run release:preflight`
- scripted rollout smoke -> `npm --prefix backend run release:smoke -- --app-url=https://service-url`
- scripted tenant onboarding check -> `npm --prefix backend run release:onboarding -- --app-url=https://service-url --auth-token=...`

## Deployment checklist

Before deploy:

- confirm frontend builds cleanly
- confirm `MONGODB_URI` targets the intended database
- confirm `CLIENT_URL` and `APP_URL` match the production hostname
- confirm upload storage configuration is durable
- capture a fresh backup

After deploy:

- hit `/api/health`
- hit `/api/health/ready`
- sign into the backoffice
- load a storefront page
- verify uploads render
- verify one protected API call and one public storefront API call

## Rollback reality

The repo now ships a basic Cloud Run rollback helper:

- `rollback-cloudrun.ps1`

Recommended rollback flow:

1. run `./rollback-cloudrun.ps1 -DryRun` to inspect the current and target revisions
2. run `./rollback-cloudrun.ps1` to shift 100% traffic to the previous ready revision
3. let the script execute post-rollback smoke automatically unless `-SkipSmoke` is used
4. restore tenant data only if the incident was data-destructive

This is still revision rollback, not a full infrastructure rebuild, but it removes the previous fully-manual rollback gap.

## CI status

GitHub Actions is now codified in:

- `.github/workflows/backend-ci.yml`

Current automation:

- backend unit + integration tests
- frontend production build
- optional DB-backed E2E suite when `TEST_MONGODB_URI` is configured in repository secrets

## Gaps to keep in mind

- Monitoring and alerting still need actual production scraper / dashboard wiring.
- DB-backed E2E is opt-in until a CI database secret is provisioned.
- Runbooks are documented, but release execution still depends on operator discipline rather than a fully automated rollout controller.

