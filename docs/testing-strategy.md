# PayQusta Testing Strategy

## Current Baseline

The backend now has three useful layers of automated coverage:

- `tests/unit`
  Covers auth and permission guards without needing a real database.
- `tests/integration`
  Uses `supertest` against `createApp()` for lightweight API regression checks.
- `tests/smoke`
  Verifies key endpoints fail safely instead of throwing `500` errors.

This baseline is intentionally focused on Phase 2 hardening work:

- RBAC / permission regression coverage
- tenant context and public tenant resolution coverage
- auth guard behavior for protected routes
- a CI entrypoint that can run inside GitHub Actions without MongoDB

## Commands

Run from `backend/`:

```bash
npm run test:unit
npm run test:integration
npm run test:ci
npm run test:e2e
npm run test:smoke
```

Command intent:

- `test:unit`
  Fast guard-level regression tests.
- `test:integration`
  App-level API checks using the Express app factory.
- `test:ci`
  The default GitHub Actions command. Runs unit + integration suites without coverage overhead.
- `test:e2e`
  Runs DB-backed end-to-end suites. Requires `TEST_MONGODB_URI`.
- `test`
  Full Jest run with coverage for local deeper inspection.

## CI Workflow

GitHub Actions workflow:

- `.github/workflows/backend-ci.yml`

What it does:

- installs backend dependencies with `npm ci`
- installs frontend dependencies with `npm ci`
- runs on `push` to `main`/`master`
- runs on `pull_request`
- executes `npm run test:ci`
- executes the frontend production build

CI environment variables are kept minimal on purpose:

- `NODE_ENV=test`
- `JWT_SECRET`
- `JWT_EXPIRE`
- `PLATFORM_ROOT_DOMAIN`

The current CI flow does not require a live MongoDB instance because the covered suites avoid DB-dependent business flows.

## DB-Backed E2E Mode

The E2E layer now supports real database execution for the highest-value business flow:

- vendor login
- customer creation
- invoice creation
- partial payment
- pay-all settlement
- DB-backed tenant isolation verification

Required environment:

- `TEST_MONGODB_URI`
- optional `TEST_MONGODB_DB_NAME` (defaults to `payqusta_e2e`)

If `TEST_MONGODB_URI` is not set, the DB-backed suite is skipped safely.

## What Is Covered Now

- missing / invalid bearer token handling
- disabled-user rejection in auth middleware
- tenant scoping for protected routes
- public tenant resolution via header or store subdomain
- default role permission enforcement
- custom role permission lookup
- admin full-access behavior
- lightweight health + malformed login API regression
- guest order confirmation and guest order tracking regression
- Bosta shipping webhook sync for `in_transit` and `returned` updates
- refund service regression for gateway execution, manual fallback, and gateway failure
- Paymob refund orchestration and transaction-id capture from webhooks
- protected-route tenant isolation on customer reads
- route-level permission denial for coordinator access to invoice refunds
- conditional storefront checkout routing for guest vs authenticated invoice creation
- portal protected-route auth rejection when the customer token is missing
- portal order listing regression scoped to the authenticated customer
- portal return-request creation regression with tenant context coming from portal auth
- portal support-ticket creation regression with admin notification fan-out
- DB-backed sales flow from vendor login to full invoice settlement
- DB-backed tenant isolation verification on real customer reads
- protected ops status and ops metrics route coverage
- security-header presence and auth rate-limit regression coverage

## Highest-Value Gaps Still Open

These are the next Phase 2 targets after the current baseline:

- real tenant-isolation tests against DB-backed reads and writes
- storefront / portal / admin regression flows
- deeper portal support flows
- subscription enforcement and quota coverage
- broader E2E business flows with seeded fixtures beyond the current sales path

## Practical Next Step

Once Phase 1 shipping work stabilizes, add DB-backed integration suites for:

1. tenant isolation on `products`, `customers`, and `invoices`
2. permission enforcement on `users`, `settings`, and `expenses`
3. storefront checkout, portal orders, return-management, and support flows
