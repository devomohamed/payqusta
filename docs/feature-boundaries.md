# Feature Boundaries

This document defines what each product surface owns today and where the edges are intentionally shared.

## Surface map

### Public marketing site

Routes:

- `/`
- `/features`
- `/use-cases`
- `/how-it-works`
- `/faq`

Owns:

- product marketing
- public brand messaging
- non-authenticated acquisition content

Does not own:

- tenant catalog
- authenticated customer data
- backoffice workflows

### Storefront

Routes:

- `/store/*` in local/platform-path mode
- `/{tenant-subdomain}` in subdomain mode
- connected custom domains in production

Owns:

- public catalog browsing
- product details
- cart
- checkout
- order confirmation
- guest order tracking
- campaign attribution and merchandising flows

Does not own:

- tenant staff operations
- deep customer account management
- platform-level plan administration

### Customer portal

Routes:

- `/portal/*`

Owns:

- authenticated customer self-service
- orders and invoices
- addresses, wishlist, returns, support
- customer notifications and loyalty surfaces

Does not own:

- public acquisition pages
- staff inventory workflows
- platform super-admin tools

### Tenant backoffice

Routes:

- authenticated routes under `/`
- selected `/admin/*` tenant-admin screens

Owns:

- products, categories, stock
- customers and suppliers
- invoices, expenses, reports
- settings, imports, backup, notifications
- branch and role management

Does not own:

- platform-wide plan configuration
- public customer browsing flow

### Super admin

Routes:

- `/super-admin/*`
- platform admin API paths

Owns:

- plans
- tenant lifecycle management
- subscription request review
- system analytics and audit visibility

Does not own:

- day-to-day tenant inventory or customer ops

## Backend boundary rules

### Public tenant-scoped APIs

Use `publicTenantScope`.

Examples:

- storefront settings
- public products
- public checkout
- coupon validation
- guest-facing order flows

Tenant resolution can happen through:

- header
- query
- subdomain
- custom domain

### Protected tenant APIs

Use:

- `protect`
- `tenantScope`
- role checks
- permission checks
- limit checks where relevant

Examples:

- products
- customers
- invoices
- reports
- settings
- imports
- backups

### Super-admin APIs

Platform-only ownership:

- tenant management
- plan management
- global audit/revenue views

These should not be repurposed for tenant-local workflows.

## Shared areas by design

Some boundaries are intentionally shared rather than duplicated:

- invoice creation logic is shared across POS, portal, import, and online-store flows through `InvoiceService`
- shopping/cart components are reused across storefront and parts of the portal
- notification infrastructure is shared across backoffice and customer-facing experiences
- uploads are shared across product media, avatars, and documents

## Known overlap and cleanup notes

- Tenant admin routes are split between `/admin/*` and authenticated root routes. This works, but it is not the cleanest mental model yet.
- Portal and storefront are separate surfaces but share enough commerce logic that regressions can leak across them.
- Shipping and returns lifecycle spans storefront, portal, admin, and backend service layers, so it must remain backend-authoritative.
- Camera/live-stream functionality exists, but it is closer to an operational add-on than a cleanly bounded commerce module today.

## Out-of-scope assumptions to avoid

- Do not assume backup/restore is a full SaaS snapshot.
- Do not assume customer portal auth is the same as staff auth.
- Do not assume every public page is tenant-scoped.
- Do not assume custom domains bypass tenant isolation logic; they are just another tenant-resolution input.
