# PayQusta

PayQusta is a multi-tenant commerce SaaS that combines a tenant backoffice, a public storefront, a customer portal, and super-admin tooling in one repository.

The codebase is already beyond the "landing page + CRUD" stage. The gap now is operational clarity: accurate docs, repeatable setup, clearer product boundaries, and an onboarding story that matches the current implementation.

## Repository layout

```text
payqusta/
  backend/                 Express + MongoDB API, jobs, services, tests
  frontend/                React + Vite admin, storefront, portal, public site
  docs/                    Product, architecture, and operations documentation
  deploy-cloudrun.ps1      Windows deployment script for Google Cloud Run
  cloudrun.env             Cloud Run environment file
```

## Product surfaces

- Tenant backoffice: inventory, invoices, customers, suppliers, reports, settings, imports, backups, notifications.
- Public storefront: catalog, cart, checkout, guest order confirmation, guest order tracking.
- Customer portal: customer login, orders, invoices, returns, addresses, wishlist, support, notifications, reviews.
- Public marketing site: landing pages, feature pages, use-case pages, FAQ.
- Super admin: plans, tenant management, subscription requests, revenue analytics, system-level operations.

## Quick start

### Requirements

- Node.js 18+
- npm 9+
- MongoDB 7+ or MongoDB Atlas

### Local development

1. Install backend dependencies.

```bash
cd backend
npm install
```

2. Install frontend dependencies.

```bash
cd ../frontend
npm install
```

3. Create backend env file.

```bash
cd ../backend
cp .env.example .env
```

4. Start the API.

```bash
cd backend
npm run dev
```

5. Start the frontend in a second terminal.

```bash
cd frontend
npm run dev
```

### Local URLs

- Frontend: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:5000/api/v1`
- Public health: `http://127.0.0.1:5000/api/health`
- Readiness: `http://127.0.0.1:5000/api/health/ready`
- Swagger: `http://127.0.0.1:5000/api-docs`

### Seed sample data

```bash
cd backend
npm run seed
```

## Production shape

- The production entrypoint is `node backend/server.js`.
- The backend serves `frontend/dist` when `NODE_ENV=production`.
- You must build the frontend before starting the production server.

```bash
cd frontend
npm run build
cd ..
npm start
```

The repo also includes `deploy-cloudrun.ps1`, which builds the frontend, deploys the service to Google Cloud Run, updates `CLIENT_URL`, and performs a health check.

## Tests

Backend tests live under `backend/tests`.

```bash
cd backend
npm test
npm run test:api
npm run test:smoke
```

Current suites include:

- integration auth coverage
- an end-to-end sales flow
- smoke tests for auth, customers, invoices, products, and storefront flows

## Documentation map

- [docs/architecture.md](docs/architecture.md)
- [docs/environment-variables.md](docs/environment-variables.md)
- [docs/deployment.md](docs/deployment.md)
- [docs/tenant-onboarding.md](docs/tenant-onboarding.md)
- [docs/backup-restore.md](docs/backup-restore.md)
- [docs/feature-boundaries.md](docs/feature-boundaries.md)
- [docs/testing-strategy.md](docs/testing-strategy.md)

## Important notes

- `backend/.env.example` is a starting point, but [docs/environment-variables.md](docs/environment-variables.md) is the authoritative reference.
- Storefront tenancy can be resolved by `x-tenant-id`, `slug`, platform subdomain, or connected custom domain.
- Upload storage supports local filesystem, Google Cloud Storage, and MongoDB-backed fallback storage depending on env configuration.
- Backup and restore exist today, but coverage is intentionally documented in [docs/backup-restore.md](docs/backup-restore.md) because not every domain object is included yet.

## License

Proprietary. PayQusta internal/commercial use only unless the owner states otherwise.
