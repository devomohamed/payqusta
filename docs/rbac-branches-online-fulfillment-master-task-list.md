# RBAC, Branches, and Online Fulfillment Master Task List

## Purpose

This file is the execution board for the RBAC, employees, branches, and online fulfillment initiative.

Use it when:

- distributing work across multiple chats
- assigning work to multiple developers
- tracking dependencies before implementation

This file is derived from:

- `docs/rbac-branches-online-fulfillment-analysis.md`
- `docs/rbac-branches-online-fulfillment-implementation-plan.md`

## Priority Legend

- `P0`: decision or foundation blocker
- `P1`: required for the target model
- `P2`: required for safe completion
- `P3`: polish, hardening, and extended coverage

## Ownership Rules

- Do not assign the same file to two active chats.
- Do not run `InvoiceService` work in parallel with allocation persistence work unless one owner coordinates both.
- Do not split `AdminUsersPage.jsx` and backend user assignment work across separate uncoordinated chats.
- Do not start UI finalization before data contracts for that area are stable.

## Execution Order

1. P0 decisions
2. P1 RBAC alignment
3. P1 employee scope
4. P1 branch commerce model
5. P1 product branch availability
6. P1 online fulfillment policy
7. P2 allocation persistence
8. P2 UI completion
9. P2 tests
10. P3 audit and polish

## Task Board

### T-001

- Priority: `P0`
- Title: Freeze branch and fulfillment decisions
- Status: `completed`
- Parallel-safe: `yes`
- Depends on: none
- Files:
  - `docs/rbac-branches-online-fulfillment-analysis.md`
  - `docs/rbac-branches-online-fulfillment-implementation-plan.md`
- Goal:
  - record final decisions for:
    - mixed-branch order support in V1
    - portal customer-branch preference
    - tenant admin restriction policy
    - warehouse vs branch modeling
    - product-level vs variant-level branch availability
- Acceptance criteria:
  - all five decisions are written and frozen before data-model work starts

### T-002

- Priority: `P1`
- Title: Create canonical permission registry
- Status: `completed`
- Parallel-safe: `no`
- Depends on: `T-001`
- Files:
  - `backend/src/config/permissions.js`
  - `backend/src/models/Role.js`
  - `frontend/src/pages/RolesPage.jsx`
- Goal:
  - unify permission resources and action groups across backend and frontend
- Acceptance criteria:
  - no resource naming drift remains between config, model, and role UI

### T-003

- Priority: `P1`
- Title: Complete custom-role assignment in user CRUD
- Status: `completed`
- Parallel-safe: `no`
- Depends on: `T-002`
- Files:
  - `backend/src/controllers/authController.js`
  - `backend/src/controllers/adminController.js`
  - `frontend/src/pages/AdminUsersPage.jsx`
- Goal:
  - support create, update, and edit flows for `customRole`
- Acceptance criteria:
  - a user can be assigned, updated, and displayed with a custom role end to end

### T-004

- Priority: `P1`
- Title: Define tenant-admin permission policy
- Status: `completed`
- Parallel-safe: `no`
- Depends on: `T-001`
- Files:
  - `backend/src/middleware/checkPermission.js`
  - any admin-only guards touched by the decision
- Goal:
  - decide whether tenant `admin` remains unrestricted or becomes partially scoped
- Acceptance criteria:
  - permission model behavior is explicit and documented in code and docs

### T-005

- Priority: `P1`
- Title: Extend user model with branch scope
- Status: `completed`
- Parallel-safe: `no`
- Depends on: `T-003`
- Files:
  - `backend/src/models/User.js`
  - `backend/src/controllers/authController.js`
  - `backend/src/controllers/adminController.js`
- Goal:
  - add:
    - `primaryBranch`
    - `assignedBranches[]`
    - `branchAccessMode`
- Acceptance criteria:
  - users can hold one or multiple branches and a declared branch scope mode

### T-006

- Priority: `P1`
- Title: Redesign employee assignment UI
- Status: `completed`
- Parallel-safe: `no`
- Depends on: `T-005`
- Files:
  - `frontend/src/pages/AdminUsersPage.jsx`
- Goal:
  - expose role, custom role, primary branch, assigned branches, and branch access mode clearly
- Acceptance criteria:
  - employee edit flow is unambiguous and maps exactly to backend payloads

### T-007

- Priority: `P1`
- Title: Add branch commerce settings to data model
- Status: `completed`
- Parallel-safe: `yes`
- Depends on: `T-001`
- Files:
  - `backend/src/models/Branch.js`
  - `backend/src/controllers/branchController.js`
- Goal:
  - support:
    - `branchType`
    - `participatesInOnlineOrders`
    - `isFulfillmentCenter`
    - `onlinePriority`
    - `pickupEnabled`
    - `shippingOrigin`
- Acceptance criteria:
  - branch APIs can persist and return operational commerce settings

### T-008

- Priority: `P1`
- Title: Extend branch management screen
- Status: `completed`
- Parallel-safe: `yes`
- Depends on: `T-007`
- Files:
  - `frontend/src/pages/BranchManagement.jsx`
- Goal:
  - expose branch commerce settings with clear grouping
- Acceptance criteria:
  - owner can edit online participation and fulfillment settings from the branch screen

### T-009

- Priority: `P1`
- Title: Add product branch availability layer
- Status: `completed`
- Parallel-safe: `no`
- Depends on: `T-001`, `T-007`
- Files:
  - `backend/src/models/Product.js`
  - `backend/src/controllers/productController.js`
- Goal:
  - add branch availability and sellability metadata beside inventory quantities
- Acceptance criteria:
  - product branch availability is stored and retrieved independently from quantity

### T-010

- Priority: `P1`
- Title: Add branch availability UI to product flows
- Status: `completed`
- Parallel-safe: `no`
- Depends on: `T-009`
- Files:
  - `frontend/src/pages/ProductsPage.jsx`
  - `frontend/src/components/products/*`
- Goal:
  - allow editing:
    - available in branch
    - available in POS
    - available online
    - safety stock
    - reserve stock
    - branch priority
- Acceptance criteria:
  - product UI can manage branch availability without confusing it with stock quantity

### T-011

- Priority: `P1`
- Title: Add tenant-level online fulfillment settings
- Status: `completed`
- Parallel-safe: `no`
- Depends on: `T-001`, `T-007`
- Files:
  - `backend/src/models/Tenant.js`
  - `backend/src/controllers/settingsController.js`
- Goal:
  - support:
    - `onlineFulfillmentMode`
    - `defaultOnlineBranchId`
    - `branchPriorityOrder[]`
    - `allowCrossBranchOnlineAllocation`
    - `allowMixedBranchOrders`
- Acceptance criteria:
  - settings are persisted, validated, and available to allocation logic

### T-012

- Priority: `P1`
- Title: Update inventory allocation policy engine
- Status: `completed`
- Parallel-safe: `no`
- Depends on: `T-011`, `T-009`
- Files:
  - `backend/src/utils/inventoryAllocation.js`
  - `backend/src/services/InvoiceService.js`
  - `backend/src/controllers/portalController.js`
- Goal:
  - route online deduction using explicit tenant policy instead of implicit fallback only
- Acceptance criteria:
  - storefront and portal follow deterministic allocation rules

### T-013

- Priority: `P1`
- Title: Add storefront settings UI for online deduction
- Status: `completed`
- Parallel-safe: `yes`
- Depends on: `T-011`
- Files:
  - `frontend/src/components/settings/SettingsStore.jsx`
- Goal:
  - let the brand owner choose fulfillment mode and branch routing policy
- Acceptance criteria:
  - owner can configure online deduction without touching backend or hidden defaults

### T-014

- Priority: `P2`
- Title: Persist branch allocation at invoice-line level
- Status: `completed`
- Parallel-safe: `no`
- Depends on: `T-012`
- Files:
  - `backend/src/models/Invoice.js`
  - `backend/src/services/InvoiceService.js`
- Goal:
  - save branch allocation per line item
- Acceptance criteria:
  - each deducted line retains the source branch and quantity allocation

### T-015

- Priority: `P2`
- Title: Refactor cancel and return lifecycle to use line allocations
- Status: `completed`
- Parallel-safe: `no`
- Depends on: `T-014`
- Files:
  - `backend/src/utils/orderLifecycle.js`
  - returns and cancel handlers that depend on invoice branch assumptions
- Goal:
  - restore stock to original branches correctly
- Acceptance criteria:
  - cancel and return flows no longer rely only on invoice-level branch

### T-016

- Priority: `P2`
- Title: Add branch-routing explanation to checkout surfaces
- Status: `completed`
- Parallel-safe: `yes`
- Depends on: `T-012`, `T-013`
- Files:
  - `frontend/src/storefront/Checkout.jsx`
  - any portal order confirmation surface if needed
- Goal:
  - make branch routing behavior understandable where needed
- Acceptance criteria:
  - the user-facing flow remains clean while operational routing stays explainable

### T-017

- Priority: `P2`
- Title: Redesign roles UI
- Status: `completed`
- Parallel-safe: `yes`
- Depends on: `T-002`, `T-004`
- Files:
  - `frontend/src/pages/RolesPage.jsx`
- Goal:
  - move from flat permission matrix to grouped and scope-aware role editing
- Acceptance criteria:
  - roles screen clearly separates identity, permissions, and branch scope

### T-018

- Priority: `P2`
- Title: Add branch and employee audit visibility
- Status: `completed`
- Parallel-safe: `yes`
- Depends on: `T-006`, `T-008`
- Files:
  - relevant admin pages and backend audit surfaces if available
- Goal:
  - show who changed branch assignment, role assignment, and fulfillment settings
- Acceptance criteria:
  - operational changes are traceable

### T-019

- Priority: `P2`
- Title: Add RBAC and branch-scope backend tests
- Status: `completed`
- Parallel-safe: `yes`
- Depends on: `T-005`
- Files:
  - `backend/tests/**/*`
- Goal:
  - cover role enforcement and employee branch scope
- Acceptance criteria:
  - branch-scope regressions are caught by automated tests

### T-020

- Priority: `P2`
- Title: Add online allocation and restoration tests
- Status: `completed`
- Parallel-safe: `yes`
- Depends on: `T-015`
- Files:
  - `backend/tests/**/*`
- Goal:
  - cover storefront allocation, portal allocation, cancel, and partial return paths
- Acceptance criteria:
  - the main allocation lifecycle is regression-tested

### T-021

- Priority: `P3`
- Title: Update docs and QA checklists
- Status: `completed`
- Parallel-safe: `yes`
- Depends on: `T-020`
- Files:
  - `docs/testing-strategy.md`
  - `docs/manual-qa-checklist.md`
  - any feature docs touched by final behavior
- Goal:
  - align documentation and manual QA with the new model
- Acceptance criteria:
  - docs reflect the actual final branch and RBAC behavior

### T-022

- Priority: `P3`
- Title: Perform final design polish for dark and light mode
- Status: `completed`
- Parallel-safe: `yes`
- Depends on: `T-006`, `T-008`, `T-010`, `T-013`, `T-017`
- Files:
  - related frontend screens and shared UI
- Goal:
  - ensure all new screens remain coherent in both themes
- Acceptance criteria:
  - no new RBAC, branch, or fulfillment UI feels visually inconsistent with the system

## Recommended Chat Distribution

### Chat A

- `T-002`
- `T-003`
- `T-004`
- `T-005`

Reason:

- these are tightly coupled around RBAC and user scope

### Chat B

- `T-007`
- `T-008`

Reason:

- branch commerce model is fairly isolated

### Chat C

- `T-009`
- `T-010`

Reason:

- product branch availability is highly coupled and should stay under one owner

### Chat D

- `T-011`
- `T-012`
- `T-013`

Reason:

- online fulfillment policy and settings are logic-coupled

### Chat E

- `T-014`
- `T-015`
- `T-020`

Reason:

- allocation persistence and restoration must remain under one owner

### Chat F

- `T-017`
- `T-018`
- `T-019`
- `T-021`
- `T-022`

Reason:

- these are supporting surfaces and hardening tasks after the core model stabilizes

## Best Next Step

Start with:

- `T-001`
- then `T-002` through `T-005`

Reason:

- everything else becomes risky if the role and user-scope foundation is still unstable
