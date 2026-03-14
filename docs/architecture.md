# PayQusta Architecture

## Overview

PayQusta is a single-repo SaaS platform with one backend and one frontend serving multiple product surfaces:

- tenant backoffice
- public storefront
- customer portal
- public marketing site
- super-admin operations

The backend is an Express application backed by MongoDB. The frontend is a React + Vite application that renders different route groups for each surface.

## Runtime layers

### Backend

Primary backend entrypoints:

- `backend/server.js`: production-style bootstrap, database connection, startup tasks, scheduled jobs, Express server listen.
- `backend/src/app.js`: app factory used for test-friendly bootstrapping.

Major backend layers:

- `src/routes/`: centralized route wiring.
- `src/controllers/`: HTTP handlers for auth, invoices, settings, portal, admin, backup, reports, and more.
- `src/services/`: business logic for invoices, notifications, payments, shipping, uploads, reports, email, WhatsApp.
- `src/models/`: MongoDB schemas for tenant, user, plan, product, customer, invoice, supplier, branch, role, notification, and related domains.
- `src/middleware/`: auth, tenant scoping, permissions, security, validation, uploads, error handling.
- `src/ops/`: runtime health snapshots, readiness/liveness payloads, startup/job status.
- `src/jobs/`: scheduled background processes.

### Frontend

Frontend entrypoint:

- `frontend/src/App.jsx`

The frontend hosts multiple route groups inside one application:

- public marketing routes
- storefront routes
- portal routes
- authenticated backoffice routes
- super-admin routes

Shared state is handled with Zustand stores under `frontend/src/store*`.

## Product surfaces

### Tenant backoffice

Purpose:

- inventory and catalog management
- customer and supplier operations
- invoices and installments
- reports and dashboards
- settings, branding, WhatsApp, imports, backups

Representative files:

- `frontend/src/pages/*`
- `backend/src/routes/index.js`
- `backend/src/controllers/*`

### Storefront

Purpose:

- public catalog browsing
- guest and customer checkout
- order confirmation and tracking
- storefront landing pages and merchandising flows

Representative files:

- `frontend/src/storefront/*`
- `backend/src/controllers/settingsController.js`
- `backend/src/middleware/auth.js` via `publicTenantScope`

Storefront tenancy can be resolved by:

- `x-tenant-id`
- `slug`
- platform subdomain under `PLATFORM_ROOT_DOMAIN`
- connected custom domain

### Customer portal

Purpose:

- customer-authenticated post-purchase experience
- orders, invoices, statement, returns, addresses, wishlist
- notifications, support, reviews, points

Representative files:

- `frontend/src/portal/*`
- `backend/src/controllers/portalController.js`
- `backend/src/routes/portal/*`

### Public marketing site

Purpose:

- non-tenant marketing pages
- product/feature messaging
- lead and brand positioning

Representative files:

- `frontend/src/pages/Public*.jsx`
- `frontend/src/publicSite/*`

### Super admin

Purpose:

- platform-level plans and billing operations
- tenant administration
- subscription request review
- revenue and audit visibility

Representative files:

- `frontend/src/pages/SuperAdmin*.jsx`
- `backend/src/routes/superAdminRoutes.js`
- `backend/src/controllers/adminController.js`

## Tenant isolation model

Tenant isolation is enforced in multiple places:

- JWT tokens carry tenant context when needed.
- `protect` authenticates the user.
- `tenantScope` attaches `req.tenantId` and a tenant filter to protected routes.
- `publicTenantScope` resolves tenant context for public storefront requests.
- Most domain models include a `tenant` field indexed for scoped queries.

This means the platform is not "multi-instance"; it is one application serving multiple tenants inside shared infrastructure with application-level isolation.

## Domain model summary

Core platform entities:

- `Tenant`: store identity, subscription, branding, settings, domains, WhatsApp, cameras, addons.
- `User`: tenant staff and authentication.
- `Plan`: subscription plan definitions and limits.

Core commerce entities:

- `Product`
- `Category`
- `Customer`
- `Invoice`
- `Supplier`
- `Branch`
- `Expense`

Supporting entities:

- `Role`
- `Notification`
- `AuditLog`
- `ReturnRequest`
- `SubscriptionRequest`
- `StoredUpload`

## Request flow patterns

### Public storefront flow

```text
Browser
  -> React storefront
  -> /api/v1 public route
  -> publicTenantScope
  -> controller
  -> service
  -> MongoDB
```

### Protected tenant flow

```text
Browser
  -> React backoffice
  -> /api/v1 protected route
  -> protect
  -> tenantScope
  -> authorize / checkPermission / checkLimit
  -> controller
  -> service
  -> MongoDB
```

## Background jobs and ops

`backend/server.js` starts scheduled jobs for:

- installment reminders
- stock monitoring
- product trends

Operational health is exposed through:

- `/api/health`
- `/api/health/live`
- `/api/health/ready`
- `/api/v1/ops/status`

Runtime startup tasks and job states are tracked through `backend/src/ops/runtimeState.js`.

## Storage model

Primary persistence:

- MongoDB for business data

Uploads support three modes:

- local filesystem
- Google Cloud Storage
- MongoDB-backed fallback storage

Selection is environment-driven through `UPLOAD_STORAGE`, `GCS_BUCKET_NAME`, and Cloud Run detection.

## Known architecture pressure points

- The frontend intentionally mixes several product surfaces in one app, which is efficient but raises route-boundary and bundle-size complexity.
- Some flows are shared across storefront and portal, especially checkout/cart behavior.
- Shipping and returns lifecycle is expanding and should remain backend-authoritative as that phase lands.
- Backup/restore exists, but not every domain is yet covered.
