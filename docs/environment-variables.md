# Environment Variables

This file documents the environment variables currently read by the codebase. It is based on actual usage in `backend/` and `frontend/`, not on legacy assumptions.

## Where variables live

- Backend local development: `backend/.env`
- Cloud Run deployment: local untracked `cloudrun.env` copied from `cloudrun.env.example`
- Frontend build-time variables: shell environment or Vite `.env*` files inside `frontend/`

Notes:

- Vite only exposes variables prefixed with `VITE_`.
- `import.meta.env.PROD` is a Vite built-in flag, not a manually configured variable.
- `MONGO_URI` still appears in helper scripts and should be treated as legacy. The main runtime uses `MONGODB_URI`.

## Minimum local backend setup

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/payqusta
JWT_SECRET=replace-with-a-strong-secret
JWT_EXPIRE=30d
CLIENT_URL=http://127.0.0.1:5173
APP_URL=http://127.0.0.1:5173
```

## Core runtime

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NODE_ENV` | Yes | `development` | Controls logging, security behavior, and production static serving. |
| `PORT` | No | `5000` | Backend listen port. |
| `APP_VERSION` | No | package version | Exposed in ops/runtime payloads. |

## Database and auth

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `MONGODB_URI` | Yes | none | Main MongoDB connection string used by the backend runtime. |
| `MONGO_URI` | No | none | Legacy helper-script fallback; not the primary runtime variable. |
| `TEST_MONGODB_URI` | No | none | Dedicated database connection string for DB-backed E2E runs. |
| `TEST_MONGODB_DB_NAME` | No | `payqusta_e2e` | Overrides the database name used by DB-backed E2E suites. |
| `JWT_SECRET` | Yes | none | Signs JWTs for tenant users and portal customers. |
| `JWT_EXPIRE` | No | `7d` or `30d` depending on call site | Token lifetime. |
| `SUPER_ADMIN_EMAIL` | No | `super@payqusta.com` | Identifies the platform-level super admin user in several flows. |

## URLs and domain routing

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `CLIENT_URL` | Strongly recommended | `http://localhost:5173` | Used in emails and updated by the Cloud Run deployment script. |
| `APP_URL` | Strongly recommended | `http://localhost:5173` | Used for payment return URLs and generated links. |
| `PLATFORM_ROOT_DOMAIN` | No | `payqusta.store` | Base domain for storefront subdomains. |
| `RESERVED_PLATFORM_SUBDOMAINS` | No | `www,api,admin,app,portal,mail` | Disallowed storefront subdomains. |
| `CORS_ALLOWED_ORIGINS` | No | none | Extra comma-separated production origins allowed by the API CORS layer. |

## Security and rate limiting

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `ENABLE_HTTPS` | No | `false` | Enables stricter production Helmet behavior when HTTPS is guaranteed. |
| `API_RATE_LIMIT_WINDOW_MS` | No | `60000` | Shared API rate-limit window. |
| `API_RATE_LIMIT_MAX` | No | env-sensitive | Write-request ceiling per route/IP. |
| `API_READ_RATE_LIMIT_MAX` | No | env-sensitive | Read-request ceiling per route/IP. |
| `PORTAL_AUTH_RATE_LIMIT_MAX` | No | `20` | Failed customer portal login attempts per IP per 15 minutes. |
| `PORTAL_ENROLLMENT_RATE_LIMIT_MAX` | No | `10` | Public portal register/activate attempts per IP per hour. |
| `WEBHOOK_RATE_LIMIT_MAX` | No | env-sensitive | Public webhook ceiling per route/IP over 5 minutes. |
| `API_JSON_LIMIT` | No | `10mb` | Maximum JSON payload size accepted by general API routes. |
| `API_FORM_LIMIT` | No | `2mb` | Maximum urlencoded payload size accepted by general API routes. |

## Logging, alerting, and observability

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `LOG_LEVEL` | No | `debug` in dev, `info` in prod | Winston log level. |
| `LOG_SILENT` | No | `false` | Turns off logger transports when set to `true`. |
| `SENTRY_DSN` | No | none | Enables Sentry initialization when configured. |
| `WEBHOOK_URL` | No | none | Enables external alerting/webhook integration in ops status. |
| `OPS_BEARER_TOKEN` | No | none | Shared bearer token accepted by `/api/v1/ops/status` and `/api/v1/ops/metrics` when configured. |
| `OPS_MONITOR_URL` | No | none | Reference or destination used by rollout/monitoring scripts. |

## Uploads and object storage

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `UPLOAD_STORAGE` | No | auto-detect | Forces `local`, `mongodb`, or `gcs` upload mode. |
| `GCS_BUCKET_NAME` | No | none | Enables Google Cloud Storage upload mode. |
| `GCS_PROJECT_ID` | No | none | Optional explicit GCS project ID. |
| `GCS_PUBLIC_BASE_URL` | No | GCS public URL | Custom base URL for uploaded files. |
| `GCS_MAKE_UPLOADS_PUBLIC` | No | `false` | Makes uploaded objects public after write. |
| `UPLOAD_MIGRATION_ON_START` | No | auto | Controls whether local uploads migrate into fallback storage on startup. |
| `UPLOAD_MIGRATION_FOLDERS` | No | service default | Restricts which upload folders are migrated. |
| `K_SERVICE` | Platform-provided | none | Cloud Run detection; also used to infer MongoDB-backed upload mode. |

## Email

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `EMAIL_HOST` | Optional | none | SMTP host. |
| `EMAIL_PORT` | Optional | `587` | SMTP port. |
| `EMAIL_SECURE` | Optional | `false` | SMTP TLS mode. |
| `EMAIL_USER` | Optional | none | SMTP username. |
| `EMAIL_PASS` | Optional | none | SMTP password. |
| `EMAIL_FROM` | Optional | fallback from `EMAIL_USER` | Sender identity for email notifications. |

## WhatsApp / Meta integration

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `WHATSAPP_API_URL` | No | Meta Graph base URL | WhatsApp API host. |
| `WHATSAPP_ACCESS_TOKEN` | Optional | none | Platform-level fallback token. Tenant-scoped config can override it. |
| `WHATSAPP_PHONE_NUMBER_ID` | Optional | none | Platform-level fallback phone number id. |
| `WABA_ID` | Optional | none | Platform-level fallback WhatsApp Business Account id. |

## Payments

### Shared payment settings

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `PAYMENT_FEES_ON_CUSTOMER` | No | `false` | Whether gateway fees are pushed to the customer. |
| `EARLY_PAYMENT_DISCOUNT` | No | `3` | Early-payment discount percentage. |
| `PAYMENT_LINK_EXPIRY_HOURS` | No | `24` | Payment-link expiration window. |
| `PAYMENT_CURRENCY` | No | `EGP` | Default payment currency. |
| `PAYMENT_SUCCESS_URL` | No | derived from `APP_URL` | Success redirect URL. |
| `PAYMENT_FAILURE_URL` | No | derived from `APP_URL` | Failure redirect URL. |

### Paymob

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `PAYMOB_API_KEY` | Optional | none | Paymob API key. |
| `PAYMOB_INTEGRATION_ID` | Optional | none | Paymob integration id. |
| `PAYMOB_IFRAME_ID` | Optional | none | Paymob iframe id. |
| `PAYMOB_HMAC_SECRET` | Optional | none | Paymob HMAC validation secret. |
| `PAYMOB_API_URL` | No | Paymob production URL | Paymob API host. |
| `PAYMOB_ENABLED` | No | `false` | Feature flag for Paymob. |
| `PAYMOB_FEES` | No | `2.5` | Fee percentage. |

### Fawry

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `FAWRY_MERCHANT_CODE` | Optional | none | Merchant code. |
| `FAWRY_SECURITY_KEY` | Optional | none | Security key. |
| `FAWRY_API_URL` | No | Fawry production URL | API host. |
| `FAWRY_ENABLED` | No | `false` | Feature flag. |
| `FAWRY_FEES` | No | `1.5` | Fee percentage. |

### Vodafone Cash

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `VODAFONE_MERCHANT_ID` | Optional | none | Merchant id. |
| `VODAFONE_API_KEY` | Optional | none | API key. |
| `VODAFONE_API_URL` | No | Vodafone production URL | API host. |
| `VODAFONE_ENABLED` | No | `false` | Feature flag. |
| `VODAFONE_FEES` | No | `2.0` | Fee percentage. |

### InstaPay

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `INSTAPAY_MERCHANT_ID` | Optional | none | Merchant id. |
| `INSTAPAY_API_KEY` | Optional | none | API key. |
| `INSTAPAY_API_URL` | No | InstaPay production URL | API host. |
| `INSTAPAY_ENABLED` | No | `false` | Feature flag. |
| `INSTAPAY_FEES` | No | `0.5` | Fee percentage. |

## Shipping

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `BOSTA_API_URL` | No | Bosta production URL | Shipping provider API host. |
| `BOSTA_API_KEY` | Optional | none | Provider API key fallback. Tenant-scoped settings are expected to override this over time. |
| `BOSTA_WEBHOOK_SECRET` | Optional | none | Shared secret for validating inbound Bosta webhook payloads when enforced. |
| `SUBSCRIPTION_WEBHOOK_SECRET` | No | none | Shared secret for subscription provider callbacks. |
| `SUBSCRIPTION_INSTAPAY_WEBHOOK_SECRET` | No | none | Optional gateway-specific secret overriding `SUBSCRIPTION_WEBHOOK_SECRET` for InstaPay subscription callbacks. |
| `SUBSCRIPTION_VODAFONE_CASH_WEBHOOK_SECRET` | No | none | Optional gateway-specific secret overriding `SUBSCRIPTION_WEBHOOK_SECRET` for Vodafone Cash subscription callbacks. |
| `SUBSCRIPTION_PAYMOB_WEBHOOK_SECRET` | No | none | Optional gateway-specific secret overriding `SUBSCRIPTION_WEBHOOK_SECRET` for Paymob subscription callbacks. |
| `SUBSCRIPTION_STRIPE_WEBHOOK_SECRET` | No | none | Optional gateway-specific secret overriding `SUBSCRIPTION_WEBHOOK_SECRET` for Stripe subscription callbacks. |

## Frontend Vite variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `VITE_API_URL` | No | `/api/v1` | Frontend API base URL. |
| `VITE_PLATFORM_ROOT_DOMAIN` | No | `payqusta.store` | Frontend storefront domain resolution. |
| `VITE_RESERVED_PLATFORM_SUBDOMAINS` | No | `www,api,admin,app,portal,mail` | Frontend-side reserved subdomain list. |
| `VITE_VAPID_PUBLIC_KEY` | Optional | empty string | Push notification public key. |
| `VITE_BUILD_ID` | No | current timestamp | Build identifier injected into the frontend bundle. |

## Practical recommendations

- Prefer `MONGODB_URI` everywhere new work is added.
- Keep domain variables aligned between backend and frontend.
- Treat `CLIENT_URL` and `APP_URL` as production-critical, not optional niceties.
- When deploying to Cloud Run with private or ephemeral disks, choose `UPLOAD_STORAGE=gcs` or `UPLOAD_STORAGE=mongodb`.
- Keep secrets out of Git and CI logs.
- Do not commit `cloudrun.env`; keep it local and derive it from `cloudrun.env.example`.
