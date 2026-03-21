# RBAC, Branches, and Online Fulfillment Implementation Plan

## Purpose

This document turns the analysis in `docs/rbac-branches-online-fulfillment-analysis.md` into an implementation-ready plan.

It is written to support:

- phased execution
- multiple parallel workstreams
- low merge conflict risk
- clear acceptance criteria

## Primary Goal

Move the platform from:

- tenant-level catalog with branch stock only
- partial RBAC
- implicit online stock deduction

To:

- explicit role and branch scope model
- branch-aware employee access
- product availability by branch
- owner-controlled online fulfillment routing
- safe allocation persistence for cancellation and returns

## Non-Goals For First Delivery

Do **not** include these in the first implementation unless explicitly approved:

- geolocation-based branch routing
- full mixed-branch fulfillment across one order
- independent branch-level product masters
- region-based tax engines
- advanced warehouse wave picking

## Delivery Strategy

The work should be executed in this order:

1. permission model alignment
2. user and employee scope model
3. branch commerce settings
4. product-by-branch availability
5. online fulfillment settings and allocation policy
6. invoice line allocation persistence
7. UI redesign
8. test coverage and regression hardening

## Workstream Map

### Workstream A: RBAC foundation

Scope:

- permission registry
- role model alignment
- user role assignment correctness

Main files:

- `backend/src/config/permissions.js`
- `backend/src/models/Role.js`
- `backend/src/middleware/checkPermission.js`
- `backend/src/controllers/authController.js`
- `backend/src/controllers/adminController.js`
- `frontend/src/pages/RolesPage.jsx`
- `frontend/src/pages/AdminUsersPage.jsx`

### Workstream B: Employee and branch scope

Scope:

- branch assignment model
- user branch scope
- branch visibility and restrictions

Main files:

- `backend/src/models/User.js`
- `backend/src/controllers/authController.js`
- `backend/src/controllers/adminController.js`
- `frontend/src/pages/AdminUsersPage.jsx`

### Workstream C: Branch commerce model

Scope:

- branch operational settings
- branch fulfillment settings
- branch online participation

Main files:

- `backend/src/models/Branch.js`
- `backend/src/controllers/branchController.js`
- `frontend/src/pages/BranchManagement.jsx`

### Workstream D: Product branch availability

Scope:

- branch assortment
- online/POS sellability
- reserve and safety stock

Main files:

- `backend/src/models/Product.js`
- `backend/src/controllers/productController.js`
- `frontend/src/pages/ProductsPage.jsx`
- `frontend/src/components/products/*`

### Workstream E: Online fulfillment policy

Scope:

- tenant-level routing policy
- branch selection rules
- storefront and portal order behavior

Main files:

- `backend/src/models/Tenant.js`
- `backend/src/controllers/settingsController.js`
- `backend/src/utils/inventoryAllocation.js`
- `backend/src/services/InvoiceService.js`
- `backend/src/controllers/portalController.js`
- `frontend/src/storefront/Checkout.jsx`
- `frontend/src/components/settings/SettingsStore.jsx`

### Workstream F: Allocation persistence and lifecycle integrity

Scope:

- per-line branch allocation records
- cancellation, returns, and restock integrity

Main files:

- `backend/src/models/Invoice.js`
- `backend/src/services/InvoiceService.js`
- `backend/src/utils/orderLifecycle.js`
- related invoice and returns controllers

### Workstream G: UI and design system expansion

Scope:

- roles UI
- employee UI
- branch UI
- product availability UI
- online fulfillment settings UI

Main files:

- `frontend/src/pages/RolesPage.jsx`
- `frontend/src/pages/AdminUsersPage.jsx`
- `frontend/src/pages/BranchManagement.jsx`
- `frontend/src/pages/ProductsPage.jsx`
- `frontend/src/components/settings/SettingsStore.jsx`
- shared UI components as needed

### Workstream H: Tests and regression safety

Scope:

- RBAC tests
- branch routing tests
- storefront and portal allocation tests
- cancellation and return allocation tests

Main files:

- `backend/tests/**/*`
- `frontend/scripts/*`
- docs if new test strategy notes are needed

## Phase-by-Phase Plan

## Phase 0: Decision Freeze

Before code changes, explicitly decide:

1. Is mixed-branch fulfillment allowed in V1
2. Should portal always prefer customer branch
3. Should brand admin be restrictable by custom permission model or remain full access
4. Is the main warehouse a real branch entity or a tenant special case
5. Does branch assortment apply at product level only or also per variant

Acceptance criteria:

- written decisions recorded in the analysis doc or a follow-up decisions doc

## Phase 1: Canonical Permission Model

### Tasks

1. Create one canonical permission resource registry.
2. Align `permissions.js`, `Role.js`, and `RolesPage.jsx`.
3. Add missing resources such as branch and purchasing resources if approved.
4. Decide whether tenant `admin` remains unrestricted or gets scoped controls.
5. Ensure user CRUD supports `customRole`.

### Backend changes

- normalize resource names in `backend/src/config/permissions.js`
- update enum and validation in `backend/src/models/Role.js`
- review `backend/src/middleware/checkPermission.js`
- update role assignment handling in:
  - `backend/src/controllers/authController.js`
  - `backend/src/controllers/adminController.js`

### Frontend changes

- update `frontend/src/pages/RolesPage.jsx`
- update `frontend/src/pages/AdminUsersPage.jsx`

### Acceptance criteria

- backend and frontend use the same resource names
- custom role can be assigned and edited
- role editor can represent every guarded route resource

## Phase 2: Employee Scope Model

### Tasks

1. Extend user model with branch scope.
2. Support:
   - `primaryBranch`
   - `assignedBranches[]`
   - `branchAccessMode`
3. Update user creation and update flows.
4. Add branch-aware data filtering where required.

### Backend changes

- update `backend/src/models/User.js`
- update `backend/src/controllers/authController.js`
- update `backend/src/controllers/adminController.js`
- review tenant/branch-sensitive reads in controllers that expose cross-branch data

### Frontend changes

- redesign employee assignment inside `frontend/src/pages/AdminUsersPage.jsx`

### Acceptance criteria

- employee can belong to one or many branches
- employee scope is saved and loaded consistently
- branch manager can be modeled without custom hacks

## Phase 3: Branch Commerce Model

### Tasks

1. Add commerce settings to branches.
2. Support online fulfillment participation.
3. Add branch priority and branch type.
4. Add pickup and shipping origin controls if in scope.

### Backend changes

- update `backend/src/models/Branch.js`
- update `backend/src/controllers/branchController.js`

Recommended fields:

- `branchType`
- `participatesInOnlineOrders`
- `isFulfillmentCenter`
- `onlinePriority`
- `pickupEnabled`
- `shippingOrigin`

### Frontend changes

- extend `frontend/src/pages/BranchManagement.jsx`

### Acceptance criteria

- owner can declare which branches participate in online orders
- owner can define branch priority
- branch settings are visible and editable in one place

## Phase 4: Product Branch Availability Layer

### Tasks

1. Add branch assortment policy for products.
2. Add branch assortment policy for variants if approved.
3. Keep quantity separate from availability.
4. Add reserve and safety stock fields.

### Backend changes

- extend `backend/src/models/Product.js`
- update `backend/src/controllers/productController.js`

Recommended branch fields:

- `isAvailableInBranch`
- `isSellableInPos`
- `isSellableOnline`
- `safetyStock`
- `onlineReserveQty`
- `priorityRank`

### Frontend changes

- add a `Branches & Availability` section in `frontend/src/pages/ProductsPage.jsx`
- extend composer steps under `frontend/src/components/products/*`

### Acceptance criteria

- a product can exist in the catalog without being sold in all branches
- owner can disable online sale for one branch while keeping branch stock
- branch availability rules can be edited clearly

## Phase 5: Online Fulfillment Policy

### Tasks

1. Add tenant-level fulfillment settings.
2. Support explicit online deduction modes.
3. Route storefront and portal orders through the selected policy.
4. Make the decision auditable.

### Backend changes

- extend `backend/src/models/Tenant.js`
- update `backend/src/controllers/settingsController.js`
- update `backend/src/utils/inventoryAllocation.js`
- update `backend/src/services/InvoiceService.js`
- update `backend/src/controllers/portalController.js`

Recommended settings:

- `onlineFulfillmentMode`
- `defaultOnlineBranchId`
- `branchPriorityOrder[]`
- `allowCrossBranchOnlineAllocation`
- `allowMixedBranchOrders`

### Frontend changes

- extend storefront settings UI in `frontend/src/components/settings/SettingsStore.jsx`
- optionally expose read-only fulfillment branch explanation in `frontend/src/storefront/Checkout.jsx`

### Acceptance criteria

- owner can choose how online stock is deducted
- storefront orders use a deterministic branch policy
- portal orders follow the approved branch preference rules

## Phase 6: Allocation Persistence

### Tasks

1. Persist branch allocation per order line.
2. Store enough detail for cancel and return flows.
3. Refactor lifecycle logic to use line allocation instead of invoice-level branch only.

### Backend changes

- extend `backend/src/models/Invoice.js`
- update `backend/src/services/InvoiceService.js`
- update `backend/src/utils/orderLifecycle.js`
- update returns/cancel flows if they rely on invoice-level branch assumptions

Recommended line allocation shape:

- `branchId`
- `quantity`
- `variantId` where relevant
- optional allocation metadata for audit

### Acceptance criteria

- order cancellation restores stock to the original source branch
- partial return restores only the correct lines and quantities
- audit trail can explain branch deduction decisions

## Phase 7: UI/UX Expansion

### Roles UI

Design changes:

- grouped permission cards
- branch scope selector
- clearer difference between role identity and scope

### Employees UI

Design changes:

- multi-step or tabbed employee form
- branch assignment cards
- scope summary preview

### Branches UI

Design changes:

- operational profile card
- online fulfillment card
- priority and pickup controls

### Products UI

Design changes:

- branch availability matrix
- online/POS toggles
- reserve and safety stock inputs

### Store settings UI

Design changes:

- dedicated `Online Inventory Deduction` section
- default branch selector
- fallback strategy
- explanatory helper text

### Acceptance criteria

- owner can understand the branch-routing model without backend knowledge
- branch and employee editing flows are not ambiguous
- dark and light modes remain coherent

## Phase 8: Tests and Regression Coverage

### Backend tests

Add coverage for:

- permission enforcement by role and branch scope
- user creation with custom role and branch assignment
- branch policy save/load
- product branch availability persistence
- storefront order allocation
- portal order allocation
- cancellation and return re-stock behavior

### Frontend validation

At minimum:

- route smoke checks remain green
- form payload contract checks where practical
- manual QA checklist updated for:
  - branch availability
  - online deduction modes
  - staff scope behavior

### Acceptance criteria

- no critical path relies on manual confidence only
- main branch-routing flows are regression-tested

## Suggested Parallelization Plan

If multiple chats or developers work in parallel, split them like this:

### Track 1

- Phase 1 only

Files overlap heavily:

- `permissions.js`
- `Role.js`
- `checkPermission.js`
- `authController.js`
- `adminController.js`
- `RolesPage.jsx`
- `AdminUsersPage.jsx`

Do not split this across multiple parallel executors.

### Track 2

- Phase 3 only

Files:

- `Branch.js`
- `branchController.js`
- `BranchManagement.jsx`

This is relatively isolated.

### Track 3

- Phase 4 only

Files:

- `Product.js`
- `productController.js`
- `ProductsPage.jsx`
- `frontend/src/components/products/*`

This should be one owner because of high coupling.

### Track 4

- Phase 5 only

Files:

- `Tenant.js`
- `settingsController.js`
- `inventoryAllocation.js`
- `InvoiceService.js`
- `portalController.js`
- `SettingsStore.jsx`
- `Checkout.jsx`

This is a logic-heavy stream and should not be split blindly.

### Track 5

- Phase 6 only

Files:

- `Invoice.js`
- `InvoiceService.js`
- `orderLifecycle.js`
- returns/cancel flows

This track overlaps with Track 4 through `InvoiceService.js`, so they should be sequenced, not fully parallel.

### Track 6

- Phase 8 tests and docs updates

This can run after Track 1 through Track 5 stabilize.

## Recommended Immediate Next Step

The best next execution step is:

### Start with Phase 1

Reason:

- every later phase depends on reliable role and user scope behavior
- branch operations and online routing become risky if employee access is not modeled correctly first

## Final Delivery Order

Use this order for implementation:

1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4
5. Phase 5
6. Phase 6
7. Phase 7
8. Phase 8

If speed is required:

- run Phase 3 in parallel with late Phase 1 or early Phase 2 only if file ownership is separated clearly
- run design exploration for Phase 7 in parallel, but do not implement final UI until data contracts stabilize

## Definition of Done

This initiative is done only when:

- roles and permissions are consistent end to end
- employee branch scope is explicit and enforced
- branch operational settings exist
- branch product availability exists
- online deduction policy is owner-controlled
- branch allocation is persisted at line level
- cancel and return flows restore correctly
- UI surfaces support all of the above cleanly
- regression tests cover the critical paths
