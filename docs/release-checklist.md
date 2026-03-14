# Release Checklist

## Before Release

1. Run `npm --prefix backend run test:ci`
2. Run `npm --prefix frontend run build`
3. Run `npm --prefix backend run test:e2e` if `TEST_MONGODB_URI` is available
4. Run `npm --prefix backend run release:preflight`
5. Verify `.github/workflows/backend-ci.yml` is green on the target branch
6. Create `cloudrun.env` from `cloudrun.env.example` and confirm it is not staged for commit
7. Confirm `CLIENT_URL`, `APP_URL`, and `PLATFORM_ROOT_DOMAIN`
8. Confirm payment and shipping secrets are present:
   - `PAYMOB_API_KEY`
   - `PAYMOB_HMAC_SECRET`
   - `BOSTA_API_KEY`
   - `BOSTA_WEBHOOK_SECRET`
   - `OPS_BEARER_TOKEN`
9. Export a fresh tenant backup if the release touches invoices, customers, products, payments, shipping, or returns

## Deployment Window

1. Deploy using the current approved script or Cloud Run workflow
2. Watch deploy logs until the health check passes
3. Ensure `OPS_BEARER_TOKEN` is present on the operator machine if protected smoke checks should run
4. Optionally trigger `.github/workflows/rollout-validation.yml` against the public URL
5. Check:
   - `GET /api/health`
   - `GET /api/health/ready`
   - `GET /api/v1/ops/status`
   - `GET /api/v1/ops/metrics`

## Post Deploy Smoke

1. Run `npm --prefix backend run release:smoke -- --app-url=https://your-service`
2. Backoffice login
3. Public storefront load
4. Portal login
5. Create one safe test customer or use sandbox data
6. Create one invoice
7. Record one payment
8. Verify public order tracking if storefront checkout changed
9. Verify shipping webhook endpoint is reachable if shipping logic changed
10. Run through `docs/manual-qa-checklist.md` for the affected surfaces

## Rollback Trigger

Rollback immediately if any of these fail:

- readiness stays `503`
- protected ops endpoint fails for valid admin/vendor token
- invoice creation breaks
- payment recording breaks
- portal orders or storefront checkout regress

## After Rollback

1. Re-check health and readiness
2. Re-check a protected API and a storefront API
3. Review whether any data repair is needed
4. Log the incident and root cause before the next rollout





