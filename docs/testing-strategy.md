# PayQusta Testing Strategy

This project already includes `jest` and `supertest` in `backend/package.json`, but it currently has only a smoke test script in `backend/scripts/run_smoke_tests.js`.

## Current State

- `npm test` runs `jest --coverage`
- No real `backend/tests` suite exists yet
- Existing smoke coverage is limited to:
- tenant isolation
- invoice create + pay-all
- coupon usage in checkout

## Recommended Test Pyramid

## 1. Unit Tests

Target pure or near-pure logic.

Priority areas:

- `src/services/InvoiceService.js`
- `src/services/GamificationService.js`
- `src/services/ReportsService.js`
- `src/services/PaymentGatewayService.js`
- `src/middleware/checkPermission.js`
- utility modules under `src/utils`

Typical assertions:

- totals, balances, due dates, and discounts are calculated correctly
- permission matrices allow and deny correctly
- invalid payloads throw `AppError`
- helper functions handle edge cases

## 2. Integration Tests

Target single endpoints with real middleware and database interaction.

Use `jest + supertest` against the Express app.

Priority endpoints:

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/products`
- `POST /api/v1/customers`
- `POST /api/v1/invoices`
- `POST /api/v1/invoices/:id/pay`

Validate:

- HTTP status codes
- response shape
- auth and permission enforcement
- tenant scoping
- DB side effects

## 3. End-to-End API Tests

Target full business flows.

Best candidates:

- auth -> product -> customer -> invoice -> payment
- portal checkout with coupon
- supplier purchase and settlement
- admin tenant lifecycle
- import and backup workflows

## Test Environment Rules

## Database

- Use a dedicated test database, never production or development.
- Recommended environment variable: `MONGO_URI_TEST`
- Clear only test data between tests.
- Seed minimum fixtures per suite.

## Isolation

- One suite should not depend on another suite’s data.
- Create fresh users, tenants, products, and customers inside each suite or shared setup.
- Clean up with `afterEach` or `afterAll`.

## Authentication

- Prefer logging in through the API to get a real JWT.
- Only mock auth when you are explicitly unit-testing controller internals.

## External Integrations

Mock these in unit/integration tests:

- WhatsApp
- email sending
- OCR
- payment gateways
- file storage

For E2E, keep them disabled or redirected to sandbox endpoints.

## Suggested Test Layout

```text
backend/
  tests/
    setup.js
    helpers/
      factory.js
      auth.js
    unit/
      invoice-service.test.js
      permissions.test.js
    integration/
      auth.test.js
      products.test.js
      invoices.test.js
    e2e/
      sales-flow.test.js
      portal-checkout.test.js
      admin-tenant-lifecycle.test.js
```

## How To Run

## Unit/Integration

```bash
cd backend
npm test
```

## Smoke Script

```bash
cd backend
node scripts/run_smoke_tests.js
```

## Focused Jest Run

```bash
cd backend
npx jest tests/integration/auth.test.js --runInBand
```

## What Good Coverage Looks Like

Minimum high-value coverage:

- auth success + auth failure
- protected route unauthorized
- protected route forbidden
- CRUD success path for products and customers
- invoice create, partial payment, full payment
- tenant isolation on reads and writes
- validation failures for malformed payloads
- webhook signature or payload rejection paths

## Known Structural Limitation

`backend/server.js` starts the server on import. That makes testing harder because `supertest` works best when it can import an Express app without opening a port.

To fix that cleanly:

- build the app in a separate module
- let `server.js` only start listening when run directly
- let tests import the app factory

This repo now includes a starter `createApp` factory to support that pattern.
