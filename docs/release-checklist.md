# Release Checklist

## Before Release

1. Run `npm --prefix backend run test:ci`
2. Run `npm --prefix backend run test:e2e:readiness`
3. Run `npm --prefix frontend run build`
4. Run `npm --prefix backend run test:e2e` if `TEST_MONGODB_URI` is available
5. Run `npm --prefix backend run release:preflight`
6. Verify `.github/workflows/backend-ci.yml` is green on the target branch
7. Create `cloudrun.env` from `cloudrun.env.example` and confirm it is not staged for commit
8. Confirm `CLIENT_URL`, `APP_URL`, and `PLATFORM_ROOT_DOMAIN`
9. Confirm payment and shipping secrets are present:
   - `PAYMOB_API_KEY`
   - `PAYMOB_HMAC_SECRET`
   - `BOSTA_API_KEY`
   - `BOSTA_WEBHOOK_SECRET`
   - `OPS_BEARER_TOKEN`
10. Export a fresh tenant backup if the release touches invoices, customers, products, payments, shipping, or returns
11. If DB-backed E2E is expected in CI, confirm repository secret `TEST_MONGODB_URI` is configured

## Deployment Window

1. Deploy using the current approved script or Cloud Run workflow
2. Watch deploy logs until the health check passes
3. Ensure `OPS_BEARER_TOKEN` is present on the operator machine if protected smoke checks should run
4. Optionally trigger `.github/workflows/rollout-validation.yml` against the public URL
5. Create a release artifact folder such as `backend/artifacts/releases/2026-03-21-prod-01/`
6. Check:
   - `GET /api/health`
   - `GET /api/health/ready`
   - `GET /api/v1/ops/status`
   - `GET /api/v1/ops/metrics`

## Post Deploy Smoke

1. Run `npm --prefix backend run release:smoke -- --app-url=https://your-service`
2. Run `npm --prefix backend run release:validate -- --app-url=https://your-service --write-json=backend/artifacts/releases/<release-id>/release-validation.json --write-markdown=backend/artifacts/releases/<release-id>/release-validation.md`
3. Run `npm --prefix backend run ops:snapshot -- --app-url=https://your-service --write-json=backend/artifacts/releases/<release-id>/ops-snapshot.json --write-metrics=backend/artifacts/releases/<release-id>/ops-metrics.prom`
4. Backoffice login
5. Public storefront load
6. Portal login
7. Create one safe test customer or use sandbox data
8. Create one invoice
9. Record one payment
10. Verify public order tracking if storefront checkout changed
11. Verify shipping webhook endpoint is reachable if shipping logic changed
12. Run through `docs/manual-qa-checklist.md` for the affected surfaces
13. Keep the generated release artifacts attached to the rollout record or incident ticket

## Rollback Trigger

Rollback immediately if any of these fail:

- readiness stays `503`
- protected ops endpoint fails for valid admin/vendor token
- release validation reports failing jobs or expired job locks
- invoice creation breaks
- payment recording breaks
- portal orders or storefront checkout regress

## After Rollback

1. Re-check health and readiness
2. Re-check a protected API and a storefront API
3. Review whether any data repair is needed
4. Log the incident and root cause before the next rollout
