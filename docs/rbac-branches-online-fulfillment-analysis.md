# RBAC, Employees, Branches, and Online Fulfillment Analysis

## Purpose

This document captures the current implementation state, the gaps that still exist, and the target design for:

- roles and permissions
- employees and branch assignment
- branches and branch-level operations
- product availability by branch
- online order inventory deduction policy

It is intended to be a decision document before implementation work starts.

## Executive Summary

The platform already supports:

- tenant isolation
- branches
- users and roles
- custom roles
- per-branch inventory rows for products and variants
- automatic branch-aware stock deduction for some invoice flows

The current implementation does **not** yet provide a complete operational model for multi-branch commerce.

The biggest gaps are:

1. RBAC is not fully consistent across backend config, backend models, and frontend role management.
2. Employee branch scope is shallow; a user has only one branch and branch isolation is not enforced deeply.
3. Products support branch stock, but not a strong branch-level assortment and sales policy.
4. Online orders already deduct from branch inventory, but the policy is implicit, not owner-controlled.
5. Order allocation is not persisted strongly enough at line level for safe cancellation, return, audit, and reallocation flows.

## Frozen Decisions

The following decisions are now frozen for the current implementation wave:

1. Mixed-branch online orders are not allowed in V1.
2. Portal orders may prefer customer branch when the customer is branch-linked and the branch is eligible.
3. Tenant `admin` remains full-access in the current wave; fine-grained controls focus on staff roles first.
4. The "main warehouse" remains a temporary tenant-level special case for now and will not be promoted to a first-class branch in this wave.
5. Branch availability rules apply at product level first, with variant-level extension to follow where variant inventory already exists.

## Source Review

The analysis below is based on the current code in:

- `backend/src/config/permissions.js`
- `backend/src/models/Role.js`
- `backend/src/middleware/checkPermission.js`
- `backend/src/models/User.js`
- `backend/src/controllers/authController.js`
- `backend/src/controllers/adminController.js`
- `backend/src/models/Branch.js`
- `backend/src/controllers/branchController.js`
- `backend/src/models/Product.js`
- `backend/src/controllers/productController.js`
- `backend/src/utils/inventoryAllocation.js`
- `backend/src/services/InvoiceService.js`
- `backend/src/controllers/portalController.js`
- `backend/src/models/Invoice.js`
- `backend/src/utils/orderLifecycle.js`
- `backend/src/models/Tenant.js`
- `backend/src/controllers/settingsController.js`
- `frontend/src/pages/RolesPage.jsx`
- `frontend/src/pages/AdminUsersPage.jsx`
- `frontend/src/pages/BranchManagement.jsx`
- `frontend/src/pages/ProductsPage.jsx`
- `frontend/src/storefront/Checkout.jsx`

## Current State

### 1. Roles and permissions

The platform currently has:

- standard roles such as `admin`, `vendor`, `supplier`, `customer`, `coordinator`
- a default permission map in `backend/src/config/permissions.js`
- custom roles stored in `backend/src/models/Role.js`
- permission checks via `backend/src/middleware/checkPermission.js`

What works now:

- non-admin staff can be checked against default permissions
- custom roles can exist per tenant
- route-level permission guards are present on many operational routes

What is already weak:

- the resource list is not fully aligned between backend config, model enum, and frontend role UI
- tenant `admin` bypass remains intentional in the current wave and must stay explicit in code, not implicit
- custom roles exist conceptually, but user assignment and editing flows are incomplete

### 2. Employees and staff structure

The current user model supports:

- `tenant`
- one optional `branch`
- one `role`
- one optional `customRole`

What works now:

- a staff member can belong to a tenant
- a staff member can be linked to one branch
- branch managers can be created from branch flows

What is limited:

- only one branch per user
- no explicit branch scope policy
- no multi-branch assignment
- no strong distinction between platform owner, brand owner, branch manager, cashier, warehouse, and support operationally
- branch membership is not enough by itself to isolate all data views

### 3. Branches

Branches currently support:

- basic profile and contact details
- manager linkage
- branch shifts and settlements
- branch statistics

What is missing at branch level:

- branch commerce policy
- branch storefront participation
- branch fulfillment priority
- branch shipping origin rules
- branch-specific online order eligibility
- branch-specific assortment rules

### 4. Products and inventory

Products currently support:

- tenant-level product master records
- branch inventory rows
- variant branch inventory rows
- stock adjustments and stocktake by branch

What this means in practice:

- quantity can differ by branch
- a branch-aware stock balance exists

What is missing:

- a strong branch availability layer
- explicit per-branch sales channel flags
- separation between "stored in branch" and "sellable in branch"
- clear distinction between main warehouse and real branch entities

### 5. Online order deduction

The system already deducts inventory for online orders:

- storefront checkout goes through the invoice flow
- portal checkout also goes through inventory allocation logic
- allocation can prefer a branch or auto-pick a branch with sufficient stock

What works:

- online orders do not always deduct blindly from global stock
- branch inventory can be decremented

What is weak:

- the owner cannot clearly configure online fulfillment policy
- storefront checkout does not express branch intent
- portal uses customer branch bias in some cases, but this is not a full business policy
- the final branch used for each line is not modeled strongly enough

## Gap Analysis

### A. RBAC gaps

#### Current gap

- `permissions.js` includes resources that are not fully mirrored in `Role.js` and `RolesPage.jsx`
- some operational resources are route-protected but not clearly role-managed in the UI
- `admin` bypass makes fine-grained tenant-admin restrictions impossible today

#### Why this matters

- the UI can promise controls that backend assignment does not fully enforce
- future branch-level restrictions will remain brittle
- reporting, approvals, and branch management permissions will drift over time

#### Required target

- one canonical resource registry
- one canonical action set
- shared source for backend checks and frontend role editor
- explicit documentation that tenant `admin` stays unrestricted in this wave while branch-scoped staff controls mature
- explicit support for:
  - branch scope
  - inventory scope
  - finance scope
  - storefront control scope

### B. Employee model gaps

#### Current gap

- one user can only point to one branch
- no branch access mode
- no branch-based override model
- custom role assignment is not fully wired across user management flows

#### Why this matters

- branch managers cannot be modeled cleanly if they oversee more than one branch
- regional staff and auditors cannot be expressed correctly
- permissions and visibility drift away from operations reality

#### Required target

Each employee should support:

- `roleType`
- `customRoleId`
- `primaryBranchId`
- `assignedBranchIds[]`
- `branchAccessMode`
- `isBrandLevelUser`
- `isActive`

Recommended `branchAccessMode` values:

- `all_branches`
- `assigned_branches`
- `single_branch`

### C. Branch operations gaps

#### Current gap

- branches are operational shells, not full commercial units
- no dedicated branch settings for online order participation or routing

#### Why this matters

- a branch cannot be declared as:
  - store only
  - warehouse only
  - pickup branch
  - online fulfillment branch
- stock may exist in a branch without a clear rule about whether online orders may deduct from it

#### Required target

Each branch should support:

- `branchType`
- `participatesInOnlineOrders`
- `isFulfillmentCenter`
- `onlinePriority`
- `shippingOrigin`
- `pickupEnabled`
- `visibleInStorefront`

### D. Product-by-branch gaps

#### Current gap

Per-branch quantity exists, but branch assortment policy does not.

#### Why this matters

The business needs to answer questions like:

- Is this product sold in this branch at all?
- Is it available online from this branch?
- Is it only stored there, not sold there?
- Does this branch reserve some stock from online allocation?

The current model cannot answer these cleanly.

#### Required target

Introduce a branch assortment layer per product and per variant:

- `isAvailableInBranch`
- `isSellableInPos`
- `isSellableOnline`
- `safetyStock`
- `onlineReserveQty`
- `priorityRank`

This should sit beside quantity, not replace quantity.

### E. Online fulfillment gaps

#### Current gap

Online orders can already consume branch stock, but the policy is hidden inside backend allocation logic.

#### Why this matters

The brand owner needs explicit control over:

- which branch online orders should prefer
- when fallback to another branch is allowed
- whether one order may split across multiple branches
- how to report, cancel, and restore those allocations safely

#### Required target

Add explicit tenant-level online fulfillment settings:

- `onlineFulfillmentMode`
- `defaultOnlineBranchId`
- `branchPriorityOrder[]`
- `allowCrossBranchOnlineAllocation`
- `allowMixedBranchOrders`

Recommended initial modes:

- `default_branch`
- `customer_branch`
- `highest_stock`
- `priority_order`

Do not start with geolocation routing unless operations are ready for it.

## Recommended Business Model

### Recommended branch-product model

Use:

- one brand-level master product
- one branch assortment layer
- one branch inventory layer

Do **not** duplicate the full product catalog per branch unless branches are separate businesses.

This model gives:

- cleaner reporting
- easier catalog maintenance
- clear branch separation
- safer pricing and inventory logic

### Recommended employee model

Use these operational categories:

- `Brand Owner`
- `Brand Admin`
- `Branch Manager`
- `Cashier`
- `Warehouse Staff`
- `Sales Staff`
- `Customer Support`
- `Collector`
- `Finance`

Each should combine:

- functional permissions
- branch scope
- optional overrides

### Recommended online deduction model

Recommended first release:

1. tenant owner selects `default online branch`
2. tenant owner may define `branch priority order`
3. portal orders may prefer customer branch
4. fallback to next allowed branch only if enabled
5. do not support mixed-branch order allocation initially unless line-level allocation persistence is completed first

## Critical Scenarios To Support

### Scenario group 1: staff and access

- branch manager should only see their branch data
- cashier should not edit global settings
- warehouse staff may adjust stock but not see sensitive finance
- brand admin can oversee all branches
- support employee may see orders without editing stock

### Scenario group 2: branch product separation

- product exists in branch A but not branch B
- product exists in both branches, but online sales are enabled only for branch A
- product exists in branch B for storage only
- variant inventory differs by branch

### Scenario group 3: online order deduction

- all online orders deduct from the default branch
- default branch has insufficient stock, fallback to priority branch
- portal order prefers the customer branch
- branch is disabled from online fulfillment and must never be used
- an online order is cancelled and stock returns to the original branch allocation
- a partial return restores only the specific line allocation

### Scenario group 4: reporting and audit

- order reports show fulfillment branch
- branch sales and branch fulfillment are not confused
- restored stock matches the original deduction source
- owner can audit why a specific branch was selected

## Current Design Gaps In The UI

### Roles screen

The roles experience should move from a flat permission grid to:

- role profile
- branch scope selector
- grouped permissions
- permission preview

### Employees screen

The employee form should be restructured into:

- basic profile
- role and permissions
- branch assignment
- activity and audit log

### Branches screen

Each branch should expose:

- branch type
- online participation
- fulfillment priority
- manager
- operating status
- shipping and pickup behavior

### Product screen

Products need a dedicated section like:

- `Branches & Availability`

With columns for:

- branch
- available in branch
- available online
- available in POS
- quantity
- safety stock
- reserve quantity
- priority

### Store settings screen

Add a dedicated section like:

- `Online Inventory Deduction`

It should let the owner choose:

- fulfillment mode
- default branch
- fallback strategy
- whether mixed-branch orders are allowed

## Data Model Changes Recommended

### User

Add:

- `primaryBranch`
- `assignedBranches[]`
- `branchAccessMode`

### Branch

Add:

- `branchType`
- `participatesInOnlineOrders`
- `isFulfillmentCenter`
- `onlinePriority`
- `pickupEnabled`
- `shippingOrigin`

### Product / Variant branch layer

Add to branch-level product availability records:

- `isAvailableInBranch`
- `isSellableInPos`
- `isSellableOnline`
- `safetyStock`
- `onlineReserveQty`
- `priorityRank`

### Tenant settings

Add:

- `onlineFulfillmentMode`
- `defaultOnlineBranchId`
- `branchPriorityOrder[]`
- `allowCrossBranchOnlineAllocation`
- `allowMixedBranchOrders`

### Invoice / line allocation

Add a per-line allocation record so the system knows exactly:

- which branch was used
- how much was deducted from that branch
- how to restore it on cancellation or return

Invoice-level branch alone is not sufficient for future-safe multi-branch fulfillment.

## API Changes Recommended

### Users

User create/update APIs should support:

- branch scope mode
- primary branch
- assigned branches
- custom role assignment

### Branches

Branch APIs should support:

- commerce and fulfillment settings
- online participation flags
- priority management

### Products

Product APIs should support:

- branch availability payload
- branch online/POS sellability flags
- branch reserve rules

### Checkout / invoices

Invoice creation should:

- resolve branch allocation using explicit tenant policy
- persist per-line allocation
- expose branch selection result clearly

## Execution Priority

### Phase 1: permission and user model alignment

- unify resource registry
- align backend model, config, and frontend role editor
- finish custom role assignment
- add branch scope to users

### Phase 2: branch commerce model

- add branch operational settings
- add branch online fulfillment flags
- add branch priority model

### Phase 3: branch assortment model

- add product-by-branch availability policy
- keep inventory and assortment as separate concepts

### Phase 4: online fulfillment policy

- add tenant owner controls for online deduction
- implement deterministic branch routing
- support fallback strategy

### Phase 5: allocation persistence and lifecycle integrity

- persist line-level branch allocation
- fix cancel/return/restock flows to use original allocation data

### Phase 6: UI redesign

- redesign roles
- redesign employees
- extend branches
- add branch availability inside products
- add online fulfillment settings

### Phase 7: testing and audit coverage

- branch-scoped permission tests
- branch allocation tests
- storefront checkout allocation tests
- portal order allocation tests
- cancellation and return restoration tests

## Final Recommendation

The platform should not move toward "a separate product catalog per branch" as the default model.

The recommended model is:

- one brand-level catalog
- one branch assortment layer
- one branch inventory layer
- one explicit online fulfillment policy
- one line-level allocation record for each order item

This gives the brand owner exactly the control they need while keeping the system maintainable.

## Decision Points Before Implementation

The product team should explicitly approve:

1. whether mixed-branch online orders are allowed in the first release
2. whether portal orders should always prefer customer branch
3. whether branch managers may edit only their branch assortment or also branch fulfillment policy
4. whether "main warehouse" becomes a first-class branch or remains a special tenant-level concept
5. whether branch availability rules apply at product level only or also at variant level

Once these decisions are made, implementation can proceed with much lower risk.
