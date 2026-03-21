# Tenant Onboarding

This document describes what happens today when a new merchant is created and what still must happen manually before the store is production-ready.

## Automatic provisioning on registration

When `POST /api/v1/auth/register` succeeds, the backend currently does all of the following:

- creates a `Tenant`
- creates the first admin user for that tenant
- looks up a free plan when available
- stores subscription limits on the tenant snapshot
- seeds starter category settings
- seeds a starter catalog when the tenant has no products
- returns the auth token, user, and tenant summary

The same starter-catalog seeding is also used when a logged-in owner creates another store through `POST /api/v1/auth/create-store`.

## What the tenant gets by default

Immediately after registration, the tenant has:

- a tenant record with name and business info
- an admin user linked to that tenant
- a subscription status that starts active with the free plan if found
- starter category settings
- starter products and categories if the catalog is empty

This means onboarding is not empty-state only; merchants land in a usable environment.

## Recommended onboarding sequence

### 1. Validate tenant identity

Backoffice checks:

- sign in with the new admin account
- call `GET /api/v1/auth/me`
- call `GET /api/v1/settings`

Confirm:

- tenant name
- subscription limits
- business info
- seeded catalog visibility

### 2. Configure store profile

Primary endpoint:

- `PUT /api/v1/settings/store`

Configure:

- store name
- business phone, email, address
- tenant-level settings such as watermark and other store options

### 3. Configure branding and domains

Primary endpoints:

- `PUT /api/v1/settings/branding`
- `GET /api/v1/settings/subdomain-availability`
- `PUT /api/v1/settings/subdomain`

Configure:

- logo
- primary and secondary colors
- dark mode preference
- platform subdomain
- optional custom domain

Notes:

- platform storefront routing uses `PLATFORM_ROOT_DOMAIN`
- custom domains are marked `pending` until traffic confirms them

### 4. Add staff, roles, and branches

Primary endpoints:

- `POST /api/v1/auth/users`
- `POST /api/v1/roles`
- branch routes under `/api/v1/branches`

Configure:

- extra staff accounts
- custom roles and permissions
- branches for multi-location tenants

This is where SaaS hardening starts to matter. A tenant is not really onboarded until RBAC and branch structure match the business.

### 5. Clean or replace starter catalog

Options:

- edit starter products manually
- import tenant inventory through `/api/v1/import/products`
- create categories and products through backoffice screens

Recommended merchant task:

- remove seeded products that do not match the real business
- upload real product media
- verify stock, pricing, and category structure

### 6. Configure communications

Primary endpoints:

- `PUT /api/v1/settings/whatsapp`
- WhatsApp template helper routes under `/api/v1/settings/whatsapp/*`

Configure:

- tenant WhatsApp token and phone id
- template mappings
- notification preferences

Email configuration is still platform-level through backend env vars rather than tenant-owned settings.

### 7. Configure billing and plan state

Primary endpoints:

- `/api/v1/subscriptions/*`

Configure:

- active plan
- payment gateway selection
- manual receipt flow when using InstaPay or Vodafone Cash

Plan enforcement today is limit-based in middleware such as `checkLimit`.

### 8. Storefront smoke test

Before go-live, test:

- public storefront settings load
- catalog page renders
- product details render
- cart and checkout work
- order confirmation works
- guest order tracking works

Storefront tenancy can be resolved by:

- `x-tenant-id`
- `slug`
- platform subdomain
- connected custom domain

### 9. First backup

Before inviting the merchant to real usage:

- generate a JSON export
- confirm backup stats
- document the tenant id and chosen domain

## Suggested operator checklist

- Tenant can sign in
- Tenant subdomain is assigned
- Branding is applied
- Real products exist
- At least one payment method is configured
- Notification channel is configured or intentionally disabled
- Backup has been tested
- One end-to-end order flow has been exercised

## Scripted readiness check

The repo now ships a tenant onboarding readiness helper:

- `npm --prefix backend run release:onboarding -- --app-url=https://service-url --auth-token=...`

What it validates:

- public health endpoint
- authenticated `auth/me`
- tenant settings access
- dashboard overview access
- backup stats access
- storefront settings resolution
- public catalog resolution

Use it after initial provisioning and again before declaring a tenant production-ready.

The backoffice now also includes an in-app onboarding wizard at `/onboarding` for tenant admins. It walks through the same readiness areas inside the product, supports inline editing for store profile, branding, subdomain, and backup settings, and links directly to the catalog, branches, users, backup, and storefront surfaces when deeper work is still needed.


## Current onboarding gaps

- The in-app wizard covers the highest-value setup actions, but catalog management, branches, staff, and advanced branding still hand off to their dedicated screens rather than being edited fully inline.
- Email is not tenant-scoped configuration.
- Backup/restore is tenant-scoped but not full-platform.
- Shipping/returns lifecycle is still maturing and should be validated separately before declaring a store fully ready for high-volume commerce.
