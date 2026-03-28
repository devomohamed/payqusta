# Shipping, Fulfillment, and Stock Transfer Worklog

## Purpose

This file is the active checkpoint log for the shipping and stock-transfer initiative.

Use it to:

- record what has been decided
- track what was completed
- record the next exact step
- resume safely after interruption

## Current Status

- Initiative state: `implementation`
- Analysis doc: `docs/shipping-stock-transfer-analysis.md`
- Implementation plan: `docs/shipping-stock-transfer-implementation-plan.md`
- Last updated by: `Codex`

## Frozen Decisions

- `Branch X` is the only shipping branch used for courier handoff in V1.
- Pricing mode is exclusive: `fixed_zones` or `dynamic_api`.
- Shipping cost is frozen on order creation.
- Address changes after order creation require admin review.
- V1 does not support multi-source or split fulfillment.
- Stock leaves `Branch Y` on `in_transit`.
- Stock enters `Branch X` on confirmed receipt.
- Unmatched fixed-zone addresses are blocked at checkout in V1.
- Over-receipt requires admin confirmation before adding extra units to stock.
- Overdue transfer reminders are enabled and tenant-configurable.
- Portal checkout uses the same shipping pricing flow as storefront.
- Address-change review does not silently edit the original shipping snapshot; any repricing or courier refresh is a manual admin action.
- Partial receipt never moves the order directly to `ready_for_shipping`; it requires explicit admin confirmation.
- Transfer requests cannot be cancelled after they reach `in_transit`; they must be resolved through receipt and issue handling.
- Shipment creation is manual in V1, even after the order becomes `ready_for_shipping`.
- Dynamic pricing requires sufficiently complete destination data; `governorate` plus `city/area` is the minimum target input.
- If dynamic pricing input is incomplete, checkout blocks price calculation until the required address fields are completed.
- Customer-facing shipping handoff remains tied to `Branch X` even if stock originated from `Branch Y`.
- The temporary fulfillment status after partial receipt is `partial_receipt_review`.
- Dynamic-pricing checkout requires `governorate` plus one `city/area` field in V1; deeper area granularity is sent when available but not required as a separate field.
- Overdue transfer reminders use a platform default and allow tenant-level override.
- Over-receipt is blocked explicitly in V1; the system does not silently cap or auto-accept extra units anymore.
- Transfer reminder state resets on every lifecycle transition so stale reminders do not bleed into the next status stage.

## Open Decisions

- none for the current implementation phase

## Implementation Queue

### Q-001

- Title: Add shipping settings data contract
- Status: `completed`
- Suggested owners:
  - backend settings/model
  - frontend settings UI
- Notes:
  - prefer reusing tenant settings structure unless a dedicated model becomes necessary
  - completed by extending `Tenant.settings.shipping`, adding dedicated shipping settings endpoints, and creating a standalone `Shipping` settings tab

### Q-002

- Title: Add checkout shipping calculation and snapshot persistence
- Status: `completed`
- Depends on:
  - `Q-001`
- Notes:
  - completed by routing both storefront and portal checkout through the backend shipping quote flow
  - shipping quote loading, error, fallback, and snapshot persistence now share the same resolver contract

### Q-003

- Title: Create admin order confirmation page with branch recommendation
- Status: `completed`
- Depends on:
  - `Q-001`
  - `Q-002`
- Notes:
  - completed with a dedicated order detail route, fulfillment-analysis endpoint, Branch X readiness view, branch recommendation cards, and in-page transfer request creation

### Q-004

- Title: Implement stock transfer model and lifecycle endpoints
- Status: `completed`
- Depends on:
  - `Q-003`
- Notes:
  - completed with the `StockTransfer` model, lifecycle endpoints, invoice fulfillment-status coupling, and the new `/stock-transfers` admin page
  - admin transfer UI now supports listing, details, and safe lifecycle actions that do not require extra modal input

### Q-005

- Title: Add Branch Y and Branch X transfer dashboards
- Status: `completed`
- Depends on:
  - `Q-004`
- Notes:
  - completed by extending `BranchDashboardPage` with branch-specific outgoing and incoming transfer queues
  - includes request acceptance/rejection, preparation, in-transit confirmation, partial/full receipt handling, and ready-for-shipping order cards

### Q-006

- Title: Add notifications and failure hardening
- Status: `completed`
- Depends on:
  - `Q-004`
  - `Q-005`
- Notes:
  - completed by hardening transfer permissions so branch users can only act on relevant source/destination flows
  - added core admin notifications for transfer creation, rejection, in-transit, partial receipt, and ready-for-shipping handoff
  - added tenant-configurable overdue reminder settings and a recurring stale-transfer reminder job
  - added notification dedupe for transfer lifecycle and reminder events
  - persisted shipment creation failures on invoices and exposed retry/dismiss state in admin order detail
  - added order-detail admin actions for address-review resolution and `partial_receipt_review` approval

#### Q-006A

- Title: Overdue reminders and transfer SLA configuration
- Status: `completed`
- Scope:
  - add tenant-level override for overdue reminder timing
  - add job logic to detect stale `requested` and `approved` transfers
  - emit reminder/escalation notifications without duplication

#### Q-006B

- Title: Notification dedupe and event safety
- Status: `completed`
- Scope:
  - prevent repeated notifications for the same transfer/order state change
  - add safe guards for retry/replay scenarios
  - keep bell dropdown free from contradictory duplicate items

#### Q-006C

- Title: Shipment creation failure recovery
- Status: `completed`
- Scope:
  - persist shipment creation failure reason on the order
  - keep order in `ready_for_shipping` on courier failure
  - expose retry state clearly in admin order detail

#### Q-006D

- Title: Address review and partial-receipt decision polish
- Status: `completed`
- Scope:
  - show `addressChangedAfterCheckout` warning banner and review action in order detail
  - add explicit admin decision flow for `partial_receipt_review`
  - surface over-receipt confirmation policy in UI and backend validation

### Q-007

- Title: Branch-scoped product inventory and product-list performance hardening
- Status: `completed`
- Depends on:
  - `Q-006`
- Notes:
  - each branch should behave as if it has its own operational warehouse view without introducing a second inventory model
  - branch-scoped users should see products for the active branch only
  - admins and cross-branch operators may switch between `all branches` and a specific branch view
  - list endpoints must return lightweight branch-aware stock fields instead of full inventory population to avoid UI hangs
  - zero-stock products in the active branch should remain visible for replenishment and transfer workflows

## Branch Product Inventory Plan

The next track will be executed in the following order:

1. lock the target behavior for branch users, admins, zero-stock products, unavailable products, and variant products
2. add backend branch-scoped filtering for product listing with a lightweight response shape
3. enforce active-branch context on the backend for branch-scoped users so the UI cannot accidentally overfetch cross-branch data
4. update the products page to load and render branch stock for the active branch only, with an admin branch switcher when allowed
5. preserve replenishment workflows by keeping zero-stock products visible and clearly labeled in the active branch
6. validate the result with focused manual checks and a frontend production build

Execution logging rule for this track:

- before each significant code step, record the intended action in this file
- after each significant code step, record completed work and touched files in this file
- if a session is interrupted, resume from the latest `Next recommended step` entry in this file before touching code

## Branch Product Inventory Scenario Matrix

### A. Visibility and access scenarios

1. branch-scoped user on a single branch
   - sees products for the active branch only
   - sees branch stock only
   - cannot fetch or view other branches through the products page

2. admin or cross-branch operator
   - can switch between `all branches` and a specific branch
   - default view should prefer a single branch when an active branch context exists
   - `all branches` view should show summary data only, not full branch inventory payloads

3. unauthorized user
   - does not see branch inventory management actions
   - does not see replenishment actions if the role lacks the required permission

### B. Product-state scenarios inside a branch

1. product available in branch and stock is healthy
   - show the product normally
   - show branch quantity and normal stock status

2. product available in branch and stock is low
   - keep the product visible
   - label it as low stock
   - allow replenishment actions if the user has permission

3. product available in branch and stock is zero
   - keep the product visible
   - label it as out of stock in this branch
   - use this state as a trigger candidate for transfer or supplier replenishment

4. product not available in branch
   - hide it from the default branch products list
   - allow admins to inspect it from `all branches` or product detail if needed

5. product has variants
   - branch stock must be calculated per variant, not only on the parent product
   - list view should surface a compact branch summary while detail view may show full variant breakdown

### C. Replenishment decision scenarios

1. branch stock falls below the branch minimum and another branch has enough stock
   - suggest or create a `stock transfer request`

2. branch stock falls below the branch minimum and no internal branch can cover it
   - suggest or create a supplier-side replenishment request

3. branch stock is not yet below the minimum but sales velocity predicts shortage soon
   - mark as at-risk
   - prepare proactive replenishment suggestion without waiting for zero stock

4. branch stock is zero during active sales
   - keep product visible for operations
   - prioritize replenishment action over hiding the item from branch operations users

### D. Supplier-order scenarios

1. branch is allowed to request from suppliers directly
   - branch manager can create a purchase request or purchase-order draft
   - final supplier approval may remain with admin depending on tenant policy

2. branch is not allowed to order directly from suppliers
   - branch can only submit a replenishment request
   - admin or procurement converts it into a supplier order

3. preferred supplier exists for the product
   - use the preferred supplier as the default suggestion

4. no preferred supplier exists
   - branch request stays pending supplier selection by admin or procurement

## Supplier Replenishment Scenario Matrix

### Goal

- allow the branch admin or a branch employee with explicit inventory permission to raise a supplier-side shortage request when the branch cannot cover the shortage internally
- keep cashier-style branch accounts aware of shortage status without giving them supplier-request authority

### Recommended baseline for this project

1. branch-side users do not create final supplier purchase orders directly
   - they create a `purchase request` or `supplier replenishment request`
   - admin or procurement can later approve/convert it into the real supplier order

2. shortage visibility is broader than shortage execution
   - branch cashier and similar roles can see `low` / `out_of_stock`
   - only branch admin or explicitly authorized inventory staff can create supplier requests

3. internal transfer remains the first-class path when another branch can cover the shortage
   - supplier request becomes the preferred path only when internal stock cannot cover the shortage or tenant policy allows bypassing internal transfer

### Role and permission scenarios

1. branch cashier or low-privilege branch account
   - sees shortage status only
   - does not see `طلب من المورد`
   - may see a passive message such as `تواصل مع مدير الفرع`

2. branch admin / branch manager
   - sees shortage status
   - can trigger `طلب من المورد` if granted the future supplier-request permission

3. branch inventory employee with delegated permission
   - same as branch admin for shortage-request actions
   - permission should be separate from generic invoice/sales permissions

4. admin / procurement
   - can review all branch-created supplier requests
   - can approve, reject, edit supplier, or convert to real purchasing workflow

### Product and supplier binding scenarios

1. product has one preferred supplier
   - preselect that supplier automatically in the request modal
   - user can submit quickly after reviewing quantity and note

2. product has no preferred supplier
   - require supplier selection from a dropdown before submit
   - request must not be created without supplier choice

3. product has multiple valid suppliers
   - use the preferred/default supplier as the initial selection
   - still allow changing supplier before submission

4. product has a stale or inactive supplier reference
   - show a validation warning
   - force the user to pick another active supplier

### Duplicate and overlap scenarios

1. open incoming stock transfer already exists for the same product and branch
   - do not silently create a supplier request on top of it
   - show a warning with the option to continue only if tenant policy later allows parallel sourcing

2. open supplier request already exists for the same branch + product + supplier
   - block duplicate creation or show an explicit duplicate warning

3. open supplier request exists for the same branch + product but different supplier
   - show existing requests before allowing a second one
   - later policy can decide whether multiple requests are allowed

### Quantity scenarios

1. product is below minimum but not zero
   - suggested request quantity should cover the shortage to the branch minimum at minimum

2. product is zero during active sales
   - suggested request quantity should be at least one shortage-restoring amount
   - item remains visible in the branch list

3. user enters invalid quantity
   - block submit for zero, negative, or non-numeric values

4. user enters an unusually high quantity
   - allow configurable warning later
   - do not trust UI alone; validate server-side too

### Branch-availability and variant scenarios

1. product is not enabled for the branch
   - do not present supplier-request action from normal shortage UI

2. product uses variants
   - request should target the exact variant, not just the parent product
   - this needs to be accounted for before implementing the final supplier-request model

3. branch inventory row is missing
   - treat as zero/unknown safely
   - do not crash the request flow

### Approval and lifecycle scenarios

1. branch creates supplier replenishment request
   - initial state should be something like `requested`

2. admin/procurement reviews request
   - can move to `under_review`, `approved`, `rejected`, or `converted_to_po`

3. goods are eventually purchased and received
   - the downstream purchasing flow, not the branch request itself, should own the final stock receipt

### Performance scenarios

1. products list must not preload supplier dropdown data for every row
   - supplier options should load only when the request modal opens

2. shortage widgets should continue using lightweight branch-scoped product payloads
   - supplier-request UI must not reintroduce the old list-page hanging problem

## Supplier Replenishment Decision Table

1. If branch user lacks supplier-request permission
   - show shortage state only
   - hide supplier-request action

2. If branch user has permission and preferred supplier exists
   - prefill supplier
   - allow submit as supplier replenishment request

3. If branch user has permission and no preferred supplier exists
   - require supplier dropdown selection
   - create request only after selection

4. If open internal replenishment already exists for the same product
   - warn before creating supplier request
   - future policy can decide whether to block or allow override

5. If open supplier request already exists for the same branch/product/supplier
   - block duplicate creation by default

6. If branch cannot finalize supplier purchasing in current phase
   - create branch-side `purchase request`
   - leave approval/conversion to admin or procurement

## Supplier Replenishment Implementation Spec

### Current-state findings from the codebase

1. `Product` already has a single `supplier` link
   - useful as the default supplier
   - not enough on its own for historical supplier-choice tracking

2. `PurchaseOrder` already exists and is branch-aware
   - it can represent the final purchasing document later
   - it should not be the first branch-side object created in the new shortage flow

3. existing `request-restock` endpoints are legacy/global
   - `productController.requestRestock`
   - `productController.requestRestockBulk`
   - `supplierController.requestRestock`
   - they send WhatsApp-based restock messages
   - they rely on global stock summaries rather than enforced branch context
   - they do not create a workflow object that can be reviewed, deduplicated, or approved

4. current permissions are too coarse for the planned feature
   - `suppliers.update` and `purchase_orders.create` exist
   - there is no dedicated permission yet for `branch supplier replenishment request`

### Recommended implementation order

#### Step SR-1: introduce a dedicated branch-side request model

- add a new model such as `SupplierReplenishmentRequest`
- purpose:
  - represent a branch shortage request to a supplier
  - exist before any final purchase order is created
- minimum fields:
  - `tenant`
  - `branch`
  - `product`
  - `variantId` (nullable for now, required later when variant flow is enabled)
  - `supplier`
  - `requestedQty`
  - `currentQty`
  - `minQty`
  - `status`
  - `notes`
  - `createdBy`
  - `reviewedBy`
  - `reviewedAt`
  - `convertedPurchaseOrder`
  - `source`
    - example values: `branch_products`, `branch_dashboard`, `low_stock_page`

#### Step SR-2: add dedicated permission and role mapping

- add a new permission resource instead of overloading `purchase_orders`
- recommended resource name:
  - `supplier_replenishment_requests`
- minimum actions:
  - `create`
  - `read`
  - `update`
- expected role mapping:
  - `cashier`: no access
  - `coordinator`: read only by default, unless tenant explicitly delegates
  - `مدير فرع`: create/read for branch-owned requests
  - `vendor/admin`: full review/approval access

#### Step SR-3: create branch-scoped request APIs

- recommended initial endpoints:
  - `POST /supplier-replenishment-requests`
  - `GET /supplier-replenishment-requests`
  - `GET /supplier-replenishment-requests/:id`
  - `PATCH /supplier-replenishment-requests/:id/status`
- server rules:
  - enforce branch context for branch-scoped users
  - prefill supplier from product when present
  - require explicit supplier selection when product has no supplier
  - prevent duplicate active requests for same branch + product + supplier
  - optionally warn if an open incoming stock transfer already exists for the same product

#### Step SR-4: wire branch-product UI

- add a new branch-only action:
  - `طلب من المورد`
- surfaces:
  - `ProductsPage`
  - `LowStockPage`
  - `BranchDashboardPage`
- behavior:
  - if user lacks permission -> hide the action
  - if product has supplier -> preselected in modal
  - if product has no supplier -> load supplier dropdown lazily in the modal

#### Step SR-5: add branch request review surface

- add a page or tab to review branch supplier requests
- viewers:
  - branch creator sees own-branch requests
  - admin/procurement sees all allowed requests
- minimum statuses:
  - `requested`
  - `under_review`
  - `approved`
  - `rejected`
  - `converted_to_purchase_order`

#### Step SR-6: convert approved request into final purchasing flow

- allow admin/procurement to convert an approved supplier replenishment request into `PurchaseOrder`
- copy:
  - branch
  - supplier
  - product
  - quantity
  - note trail
- mark the request as linked to the created purchase order

### Non-goals for the first implementation slice

1. do not replace the existing full `PurchaseOrder` flow
2. do not preload all suppliers in the branch products list
3. do not solve full multi-supplier ranking in phase one
4. do not make cashier-like users capable of creating supplier requests

### First execution chunk after this spec

1. create the new request model
2. add permission resource and role mapping
3. expose `POST` + `GET list` endpoints only
4. wire the branch-side modal from one entry point first
   - recommended first entry point: `StockTransfersPage` focused low-stock context or `ProductsPage`

### E. Performance and anti-hang scenarios

1. products list page
   - must not populate full `inventory.branch` and `branchAvailability.branch` trees for every product row
   - should return lightweight branch-aware fields only

2. branch switching
   - should refetch only the current branch list
   - should cancel or replace stale requests to avoid duplicate rendering and UI lockups

3. product detail
   - may load richer inventory data on demand
   - should not make the list page pay the same cost

4. search and filters
   - should run against the branch-scoped dataset on the backend when possible
   - avoid shipping full tenant inventory to the client and filtering there

### F. Data and integrity scenarios

1. main branch versus other branches
   - branch stock shown in UI must come from the branch inventory source of truth
   - avoid mixing list-page quantities from global `stock.quantity` with branch-level `inventory[]` when a branch filter is active

2. branch without explicit inventory row yet
   - treat missing branch inventory as zero or unavailable based on branch availability rules
   - do not crash the page because a row is absent

3. legacy products with incomplete branch data
   - keep them readable for admins
   - surface safe defaults in branch view until data is normalized

## Q-007 Execution Steps

### Step 1

- freeze the behavior matrix above as the implementation contract
- decide which roles can trigger transfer requests versus supplier requests
- decide whether zero-stock branch products remain searchable in the default list
- finalized decisions:
  - `مدير فرع` can raise a replenishment request only; direct supplier purchase-order creation remains an admin or procurement responsibility in the current project phase
  - branch products with `zero stock` remain visible and searchable by default in the branch products list, with a clear out-of-stock label for replenishment workflows

### Step 2

- implement backend branch-scoped product listing
- add lightweight computed fields such as branch quantity, branch stock status, and branch availability
- avoid heavy per-row population in list responses

### Step 3

- enforce branch context on the backend for branch-scoped users
- prevent accidental cross-branch overfetch through direct query manipulation

### Step 4

- update the frontend products page to read and render branch-scoped product data
- add branch switcher behavior only for users who are allowed to switch branch context

### Step 5

- add replenishment-oriented labels and actions for low-stock and zero-stock products
- keep transfer-first versus supplier-first behavior aligned with tenant policy

### Step 6

- run manual checks for branch user, branch manager, and admin scenarios
- run frontend build and any focused backend validation needed for the final response

## Remaining Delivery Gaps

- full integration/e2e coverage is still missing for the end-to-end shipping and transfer flow across checkout, admin confirmation, transfer execution, and courier handoff
- there is no dedicated customer-facing address-change request surface yet; admin review support is ready once that trigger is wired
- if the business later wants to accept over-receipt, that needs a dedicated review workflow instead of the current explicit block

## Active Risks

- existing online fulfillment settings may overlap with the new shipping settings surface
- current order admin page may need route restructuring, not just UI expansion
- stock deduction rules must be transactional or the feature will create inventory drift
- transfer states and order states must remain coherent under retries and concurrent admin actions

## Resume Checklist

When work resumes, do this in order:

1. read `docs/shipping-stock-transfer-analysis.md`
2. confirm unresolved decisions in `Open Decisions`
3. update this file before editing code
4. mark the active queue item as `in_progress`
5. record touched files after each significant step

## Session Log

### Session 2026-03-26

- Completed:
  - created consolidated analysis doc for shipping, checkout, fulfillment, and transfers
  - created implementation plan aligned with the current codebase
  - created this worklog for durable resume support
  - recorded resolved shipping and transfer policy decisions for V1
  - recorded MVP decisions for address-change review, partial receipt, in-transit cancellation, manual shipment creation, and dynamic-pricing input requirements
  - completed `Q-001` by implementing shipping settings persistence, validation, a new settings tab, and connection testing
- Next recommended step:
  - start `Q-002` for checkout shipping calculation and shipping snapshot persistence
- Files touched in this session:
  - `docs/shipping-stock-transfer-analysis.md`
  - `docs/shipping-stock-transfer-implementation-plan.md`
  - `docs/shipping-stock-transfer-worklog.md`

### Session 2026-03-27

- Completed:
  - started `Q-002`
  - added unified backend shipping quote resolver for fixed-zone and dynamic pricing
  - added public `POST /shipping/calculate`
  - added portal `POST /portal/shipping/calculate`
  - updated invoice creation and portal checkout persistence to validate and reuse the same shipping snapshot logic
  - updated portal checkout UI to request shipping quotes from the backend and support loading / fallback / error states
  - completed storefront checkout integration against `/shipping/calculate`
  - completed `Q-002`, including quote gating, fallback/error states, and shipping snapshot reuse
  - completed `Q-003` by adding a dedicated `/portal-orders/:id` detail route, fulfillment analysis, Branch X recommendation logic, and transfer request creation from the order detail page
  - completed `Q-004` by implementing the `StockTransfer` model, lifecycle endpoints, transfer-driven fulfillment status updates, and the dedicated `Stock Transfers` admin page
  - completed `Q-005` by extending the branch dashboard with outgoing transfer requests, incoming quantities, partial/full receipt flows, and ready-for-shipping order visibility
  - added invoice list filtering by `fulfillmentBranch` and `fulfillmentStatus` for Branch X operational queues
  - closed a permission gap in transfer lifecycle APIs so branch users can only view and update transfers relevant to their own branch scope
  - started `Q-006` by adding core admin notifications for transfer lifecycle events and matching `info` rendering in the navbar notification dropdown
  - resolved the remaining open decisions for partial-receipt status naming, dynamic-pricing address minimums, and overdue reminder default strategy
  - expanded `Q-006` into concrete sub-steps so the remaining work is execution-ready
  - completed `Q-006A` by adding tenant-configurable transfer reminder settings and a scheduled overdue reminder job
  - completed `Q-006B` by adding deduped notification delivery for transfer lifecycle and reminder events
  - completed `Q-006C` by persisting courier shipment creation failures on invoices and surfacing retry state in the admin order detail page
  - completed `Q-006D` by adding address-review and partial-receipt admin actions in the order detail page
  - turned over-receipt into an explicit backend validation rule and surfaced the V1 cap in the branch receipt modal
  - fixed a missing `shippingSettings` binding in `InvoiceService` that surfaced during unit-test verification
  - added focused unit coverage for stock transfer receipt validation
  - reset transfer reminder state on each status transition and added focused unit coverage for shipping reminder settings normalization
  - fixed the notification dedupe test harness to match the real query chain behavior and added focused unit coverage for deduped admin fan-out
  - added focused unit coverage for the overdue reminder job, including both reminder emission and tenant-level disable behavior
  - removed a duplicate malformed copy of `shipping_business_plan.md` from the repo root to keep the working tree clean
  - re-ran the full backend unit suite successfully after the shipping and transfer changes
  - re-ran the frontend production build successfully after the final cleanup pass
  - added focused unit coverage for transfer status permissions and the `prepared -> in_transit` lifecycle path in `StockTransferController`
  - added focused unit coverage for invoice shipping snapshot persistence and shipping-quote failure blocking in `InvoiceService`
  - added focused unit coverage for Bosta shipment-failure persistence and dismissal flow in `InvoiceController`
- Next recommended step:
  - add integration/e2e coverage for the full checkout-to-transfer-to-courier operational flow
- Files touched in this session:
  - `backend/src/controllers/settingsController.js`
  - `backend/src/controllers/portalController.js`
  - `backend/src/controllers/stockTransferController.js`
  - `backend/src/routes/index.js`
  - `backend/src/routes/portal/authRoutes.js`
  - `backend/src/routes/stockTransferRoutes.js`
  - `backend/src/services/InvoiceService.js`
  - `backend/src/services/FulfillmentService.js`
  - `backend/src/utils/shippingQuoteResolver.js`
  - `frontend/src/portal/PortalCheckout.jsx`
  - `frontend/src/store/portalStore.js`
  - `frontend/src/storefront/Checkout.jsx`
  - `frontend/src/storefront/storefrontShipping.js`
  - `backend/src/models/Invoice.js`
  - `backend/src/models/StockTransfer.js`
  - `frontend/src/pages/PortalOrderConfirmationPage.jsx`
  - `frontend/src/pages/PortalOrdersAdminPage.jsx`
  - `frontend/src/pages/StockTransfersPage.jsx`
  - `frontend/src/pages/BranchDashboardPage.jsx`
  - `frontend/src/App.jsx`
  - `frontend/src/components/Sidebar.jsx`
  - `backend/src/controllers/invoiceController.js`
  - `backend/src/controllers/stockTransferController.js`
  - `backend/src/routes/stockTransferRoutes.js`
  - `frontend/src/components/NotificationDropdown.jsx`
  - `backend/src/models/Tenant.js`
  - `backend/src/models/Invoice.js`
  - `backend/src/models/StockTransfer.js`
  - `backend/src/routes/invoiceRoutes.js`
  - `backend/src/jobs/StockTransferReminderJob.js`
  - `backend/src/services/NotificationService.js`
  - `backend/src/services/InvoiceService.js`
  - `backend/src/utils/shippingHelpers.js`
  - `backend/src/utils/stockTransferValidation.js`
  - `backend/server.js`
  - `frontend/src/components/settings/SettingsShipping.jsx`
  - `frontend/src/pages/BranchDashboardPage.jsx`
  - `backend/tests/unit/stock-transfer-validation.test.js`
  - `backend/tests/unit/shipping-helpers.test.js`
  - `backend/tests/unit/notification.service.test.js`
  - `backend/tests/unit/stock-transfer-reminder-job.test.js`
  - `backend/tests/unit/stock-transfer-controller.test.js`
  - `backend/tests/unit/invoice-controller-operations.test.js`
  - `docs/shipping-stock-transfer-worklog.md`
  - `backend/src/models/Tenant.js`
  - `backend/src/utils/shippingHelpers.js`
  - `backend/src/controllers/settingsController.js`
  - `backend/src/routes/index.js`
  - `frontend/src/pages/SettingsPage.jsx`
  - `frontend/src/components/settings/SettingsShipping.jsx`

### Session 2026-03-27

- Completed:
  - repaired broken Arabic copy in `frontend/src/storefront/Checkout.jsx` after a live checkout regression exposed mojibake and literal `????` strings in the customer, shipping, review, and summary surfaces
  - repaired the same checkout-copy regression in `frontend/src/portal/PortalCheckout.jsx` for the branch-routing note, shipping-state messages, and shipping summary labels
  - re-validated the affected frontend surfaces by scanning for remaining broken `???` string literals in the storefront/portal/pages/components UI tree
  - re-ran the frontend production build successfully after the copy and encoding cleanup
- Next recommended step:
  - refresh the local dev session and run a manual live pass on `/store/checkout` and `/portal/checkout` to confirm the corrected copy renders in-browser
- Files touched in this session:
  - `frontend/src/storefront/Checkout.jsx`
  - `frontend/src/portal/PortalCheckout.jsx`
  - `docs/shipping-stock-transfer-worklog.md`

### Session 2026-03-28

- Completed:
  - fixed a live storefront checkout regression where the shipping quote effect re-ran on every render because it depended on a non-stable inline helper in `frontend/src/storefront/Checkout.jsx`
  - fixed a live storefront settings lookup regression where `GET /api/v1/storefront/settings` did not resolve tenants by `slug` even though the storefront client was sending `?slug=...`
  - added a direct branch-scoped stock-transfer entry in the admin sidebar so receiving/sending branch users can open transfers without relying on notifications
  - made the stock-transfers page branch-aware so its title, counters, filters, rows, and actions change based on the currently opened branch context
  - refined the branch sidebar entry to open directly on the outgoing transfer queue (`?direction=outgoing`) for the active branch, matching the "طلبات التزويد من الفرع" workflow
  - kept notification deep links to `/stock-transfers/:id` working with the same branch-aware transfer details modal
  - tightened stock-transfer visibility so users without `invoices.update` no longer see the stock-transfer page, sidebar entry, branch-dashboard transfer widgets, or stock-transfer notifications
  - aligned backend filtering with the UI by requiring `invoices.update` for stock-transfer reads and excluding legacy `/stock-transfers` notifications from unread counts/listing for users who cannot manage transfers
  - added a seeded system role named `مدير فرع` that appears automatically in tenant role lists and employee role assignment
  - assigned `مدير فرع` operational permissions for branch sales, cash shifts, stock adjustments, expenses, reporting, and stock-transfer visibility via `invoices.update`, without granting user-management or settings administration
  - pinned `مدير فرع` assignments to the safer `coordinator` base role internally so the custom role keeps branch-transfer access without inheriting broader vendor-only route access
  - relaxed stock-transfer receipt transitions so the receiving branch can complete `استلام كامل` directly from `prepared` when goods have already arrived operationally, while the backend still performs the pending source-stock deduction before receipt
  - re-validated the fix with backend syntax check and a successful frontend production build
  - prepared `Q-007` as the next execution track for branch-scoped product inventory and product-list performance hardening
  - recorded the `Q-007` phase plan and explicit checkpoint logging rule in this worklog before starting implementation
  - moved `Q-007` to `in_progress` at the analysis/specification level
  - documented the full branch-product scenario matrix, including visibility, stock states, replenishment routing, supplier-order flows, performance constraints, and data-integrity edge cases
  - documented the step-by-step execution sequence for `Q-007` so implementation can continue from a stable contract
  - finalized the remaining `Q-007` step 1 business decisions: branch managers raise replenishment requests only, and zero-stock branch products remain visible/searchable by default
  - started `Q-007` step 2 implementation planning against `productController` and `ProductsPage` to replace heavy product-list population with branch-scoped lightweight stock data
  - implemented the backend branch-scoped product-list foundation in `productController` by resolving the active branch context, deriving lightweight `branchStock` data per product, filtering branch visibility in the list response, and removing heavy branch-name population from the products list query
  - validated the updated backend controller syntax successfully before moving to the frontend phase
  - updated `ProductsPage` to consume the new lightweight `branchStock` payload, support admin-capable branch switching, show branch-scoped stock counts and statuses, and keep zero-stock items visible in branch view
  - aligned branch-context actions with the frozen business rule by hiding direct supplier restock actions in branch view and linking low/out-of-stock branch cards to `طلبات التزويد`
  - revalidated backend syntax successfully after the final `Q-007` controller changes
  - confirmed the frontend production build successfully after rerunning `vite build` from inside the `frontend` working directory, which avoided the transient `--prefix` / PWA build issue seen during verification
  - completed `Q-007`
  - ran a post-completion review pass on `Q-007` and closed the remaining consistency gap in the low-stock surface
  - made `/products/low-stock` and `/products/summary` branch-aware through the same enforced branch context used by the main products list, so branch users now see low-stock and stock-summary data for the active branch only
  - aligned `LowStockPage` with the frozen business rule by keeping direct supplier restock actions available only in the global/all-branches view and showing branch users an informational message instead of a supplier action
  - confirmed backend syntax again and re-ran the frontend production build successfully after the low-stock follow-up
  - extended the branch workflow one step further by adding a branch-specific low-stock widget to `BranchDashboardPage`, so branch users can see the top shortage items for their own branch without leaving the dashboard
  - connected the new dashboard widget to the already branch-scoped `/products/low-stock` endpoint and linked it directly to `/low-stock` for the full shortage queue
  - re-ran the frontend production build successfully after the branch-dashboard low-stock addition
  - started a small follow-up on top of the branch low-stock widget to carry product-specific replenishment context into `StockTransfersPage`, so branch users do not lose track of the exact low-stock item when they jump from the dashboard/products views into transfer operations
  - finished the replenishment-context follow-up by sending focused product data from branch-scoped product cards and the branch dashboard low-stock widget into `StockTransfersPage` through query parameters
  - added a focused replenishment banner to `StockTransfersPage` that shows the selected low-stock product, its current quantity vs. branch minimum, and how many open transfers already include that product in the current branch context
  - re-ran the frontend production build successfully after the replenishment-context linking update
  - corrected the replenishment navigation direction for low-stock branch products from `outgoing` to `incoming`, because the low-stock branch is the receiving side of the replenishment flow, not the source branch
  - aligned the focused-transfer counter in `StockTransfersPage` to count only incoming open transfers for the selected product in the active branch context
  - closed a remaining usability gap in `StockTransfersPage` by surfacing an explicit warning card when the focused low-stock product has no open incoming replenishment transfers for the current branch
  - prioritized transfer visibility around the focused product by keeping a dedicated match count in the table header and visually highlighting the matching transfer rows with a `الصنف المحدد` badge
  - added a follow-up filter-recovery shortcut in `StockTransfersPage` so when matching incoming replenishment transfers exist but current filters hide them, the user can reveal them in one click instead of manually resetting filters
  - re-ran the frontend production build successfully after the direction correction
  - re-ran the frontend production build successfully after the focused-transfer empty-state and matching-row follow-up
- In progress:
  - starting a follow-up implementation to let branch replenishment flows create standalone stock-transfer requests for low-stock products even when no invoice/order is attached yet, because the current transfer model/controller still require `orderId`
- Completed:
  - extended the stock-transfer model and controller to support standalone branch replenishment requests with `requestType=branch_replenishment`, so low-stock replenishment no longer depends on an existing invoice/order
  - made `POST /stock-transfers` accept both order-linked transfers and direct branch replenishment requests, with automatic best-source selection when the source branch is not chosen manually for a single focused product
  - kept the transfer lifecycle working end-to-end for standalone replenishment by making status updates, notifications, and overdue reminders tolerate `order=null` and fall back to `StockTransfer` linkage instead of `Invoice`
  - updated `StockTransfersPage` with a direct `إنشاء طلب تزويد` action when the focused low-stock product has no incoming open transfer, plus a modal that lets the branch request quantity, notes, and either automatic or manual source-branch selection
  - updated transfer presentation in both `StockTransfersPage` and `BranchDashboardPage` so standalone replenishment transfers show `طلب تزويد مباشر` instead of a blank linked-order reference
  - closed the remaining replenishment navigation gap by making low-stock links from `ProductsPage` and `BranchDashboardPage` carry a `createReplenishment=1` intent, so `StockTransfersPage` auto-opens the replenishment modal only when the focused product has no incoming open transfer yet
  - removed a duplicated low-stock warning card from `StockTransfersPage`, keeping one actionable empty-state instead of repeated messages
  - fixed a live `StockTransfersPage` runtime regression by moving the replenishment auto-open effect below the `focusedTransferCount` memo it depends on, removing the `Cannot access 'focusedTransferCount' before initialization` crash
  - documented a dedicated `Supplier Replenishment Scenario Matrix` and `Supplier Replenishment Decision Table` covering role visibility, preferred-supplier fallback, duplicate prevention, approval routing, variant edge cases, and performance guardrails before implementing supplier-side branch shortage requests
  - reviewed the current purchasing/supplier code paths and documented an `Implementation Spec` for supplier replenishment, including the finding that existing `request-restock` endpoints are legacy WhatsApp helpers built on global stock rather than branch-scoped workflow objects
  - started the first backend execution chunk for supplier replenishment by adding a new `SupplierReplenishmentRequest` model, branch-scoped `POST/GET` endpoints, and a dedicated permission resource `supplier_replenishment_requests`
  - wired the seeded `مدير فرع` system role to the new request resource with `create/read`, while default coordinator remains `read`-only and vendor/admin keep broader access
  - added the first frontend supplier-request entry point on `LowStockPage`, where branch-scoped users with `supplier_replenishment_requests.create` can open a `طلب من المورد` modal, reuse the product's linked supplier when present, or lazily load suppliers when the product has no default supplier
  - closed the next delegation gap by exposing `supplier_replenishment_requests` inside `RolesPage`, so admins can now assign the new supplier-request capability to custom roles from the UI instead of relying on backend seeding only
  - added the first read/review surface for supplier replenishment requests through a dedicated `SupplierReplenishmentRequestsPage`, a protected `/supplier-replenishment-requests` route, and a sidebar entry under the suppliers/purchasing section for users who have `supplier_replenishment_requests.read`
  - made the new requests page branch-aware from day one, including branch scoping for branch users, optional branch switching for broader users, status filtering, summary counters, and a paginated card list that shows product, supplier, branch, requester, quantities, source, and notes
  - extended the supplier replenishment flow beyond read-only review by adding `PATCH /supplier-replenishment-requests/:id/status`, including guarded transitions (`requested -> under_review/approved/rejected`, `under_review -> approved/rejected`) and reviewer stamps on the request; conversion to purchase order remains isolated in its dedicated endpoint instead of being reachable through generic status updates
  - connected the review actions into `SupplierReplenishmentRequestsPage`, so users with `supplier_replenishment_requests.update` can start review, approve, or reject directly from the request cards while branch-scoped create/read users remain read-only
  - completed the next workflow handoff by adding `POST /supplier-replenishment-requests/:id/convert-to-purchase-order`, which converts an approved supplier replenishment request into a draft `PurchaseOrder` with the branch, supplier, and requested product prefilled while leaving unit cost at `0` for later purchasing review
  - wired the conversion action into `SupplierReplenishmentRequestsPage`, so approved requests now expose `تحويل إلى أمر شراء` and redirect the reviewer toward `/purchase-orders` after successful draft creation
  - re-ran backend syntax checks successfully for the stock-transfer controller/model/routes/reminder job after the standalone replenishment changes
  - re-ran the frontend production build successfully after wiring the direct replenishment-request modal and standalone-transfer labels
  - re-ran `frontend` validation through `npm run sanity:check` and `npm run smoke:routes` successfully after adding the supplier replenishment review page and route; `vite build` is still timing out on this machine, so route/sanity validation is the reliable frontend gate for this slice
  - re-ran `node -c` on the supplier replenishment controller and route index successfully after adding the review/update endpoint, and repeated `frontend` sanity/route-contract checks successfully after wiring the in-page review actions
  - re-ran `node -c` on the supplier replenishment controller and route index successfully after adding conversion-to-purchase-order, and repeated `frontend` sanity/route-contract checks successfully after wiring the conversion action in the requests page
  - closed the follow-up review gaps by preventing `converted_to_purchase_order` from being set through the generic status endpoint, by making duplicate prevention variant-aware through `variantId`, by removing the pseudo main-branch selector from the supplier-requests review page, and by disabling direct supplier-request creation from the low-stock view when the admin is only viewing the synthetic main-warehouse scope
  - repaired a broken route loading message in `frontend/src/App.jsx` so users no longer see literal `????` text while loading the portal order confirmation screen
  - completed `SR-001` by teaching `PurchaseOrdersPage` to understand `/purchase-orders?highlight=<id>`, fetch the highlighted order when it is hidden by the current list view, show a dedicated focus banner with reveal/clear actions, and visually mark the matching purchase-order card/row including an explicit supplier-replenishment badge when the order notes indicate it came from a branch supplier request
  - re-ran `frontend` validation successfully through `npm run sanity:check` and `npm run smoke:routes` after the purchase-order highlight UX changes
  - completed `SR-002` by adding explicit purchase-order source traceability through `PurchaseOrder.sourceType` and `PurchaseOrder.sourceSupplierReplenishmentRequest`, stamping those fields during supplier-request conversion, populating them in purchase-order list/detail endpoints, and updating `PurchaseOrdersPage` to display a supplier-request reference instead of inferring origin from notes text alone
  - re-ran backend syntax checks successfully for `PurchaseOrder`, `purchaseOrderController`, and `supplierReplenishmentRequestController` after the source-traceability changes, and repeated `frontend` sanity/route-contract checks successfully
  - completed `SR-003` by wiring supplier-replenishment notifications into the backend workflow: reviewers with `supplier_replenishment_requests.update` now get an in-app alert when a new branch supplier request is created, the request creator gets notified when the request is approved or rejected, and both requester/reviewer get a direct notification with a highlighted purchase-order link when the request is converted into a draft purchase order
  - completed `SR-006` on the backend side by blocking creation of a new supplier replenishment request when an open purchase order already exists for the same tenant/branch/supplier/product/variant context; the API now returns a conflict that includes the existing purchase-order reference
  - re-ran backend syntax checks successfully for `NotificationService` and `supplierReplenishmentRequestController` after adding supplier-request notifications and purchase-order deduplication hardening
  - fixed a live `SupplierReplenishmentRequestsPage` crash caused by passing the `RefreshCw` component object مباشرة into the shared `Button` `icon` prop; the page now passes a rendered icon element instead of a raw React component definition
  - aligned purchase-order access with the new supplier-replenishment conversion flow by allowing `coordinator` users who already have `purchase_orders.read` permission to access `GET /purchase-orders`, `GET /purchase-orders/:id`, and the purchase-order PDF endpoint
  - added a frontend `PurchaseOrdersRoute` guard so users without `purchase_orders.read` are redirected before `PurchaseOrdersPage` attempts a forbidden API call
  - removed the React Router parent-route warning by making `/` a pure landing/redirect route and letting the authenticated app shell live behind the existing `/*` catch-all route, while unknown in-app paths now fall back directly to `/dashboard`
  - re-ran backend syntax checks successfully for `backend/src/routes/index.js` and repeated `frontend` sanity/route-contract checks successfully after the purchase-order guard and route fixes
  - improved readability in `PortalOrderConfirmationPage` by strengthening muted text contrast on the dark order-detail layout, adding clearer information rows for customer/shipping/pricing/shipment details, and making product line pricing easier to scan without changing the underlying workflow
  - verified the portal-order detail follow-up through `npm --prefix frontend run sanity:check`
- Next recommended step:
  - run `SR-004` manual live workflow validation in the browser because the remaining highest-risk gap is now behavioral confirmation rather than missing backend wiring
  - after the manual pass, decide whether `SR-005` variant-aware UI needs to be implemented now or can stay deferred until branch shortage flows actually expose variant selection in the product and low-stock screens
- Supplier Replenishment Follow-up Tasks:
  - `SR-001` Purchase Order Highlight UX
    - goal: make `/purchase-orders?highlight=<id>` visibly focus the new draft created from a supplier replenishment request
    - scope: `frontend/src/pages/PurchaseOrdersPage.jsx`
    - status: completed
  - `SR-002` Purchase Order Source Traceability
    - goal: show that the purchase order originated from a supplier replenishment request, with a backlink from the order flow where practical
    - scope: `backend/src/models/PurchaseOrder.js`, `backend/src/controllers/supplierReplenishmentRequestController.js`, `frontend/src/pages/PurchaseOrdersPage.jsx`
    - status: completed
  - `SR-003` Supplier Request Notifications
    - goal: notify the right actors when a request is created, approved, rejected, or converted to a purchase order
    - scope: notifications pipeline and related UI surfaces
    - status: completed
  - `SR-004` Manual Live Workflow Pass
    - goal: validate end-to-end behavior for branch manager, read-only branch staff, and reviewer/admin accounts in the browser
    - checklist:
      - branch manager can create a supplier replenishment request from low stock
      - read-only branch users can see shortage states without action buttons
      - reviewer can move request through review states
      - approved request converts to purchase order draft successfully
      - resulting purchase order is visible and understandable in purchasing UI
    - status: pending
  - `SR-005` Variant-aware UI Follow-up
    - goal: expose variant-specific supplier replenishment behavior in the frontend if/when variant-driven branch shortage flows are enabled
    - scope: product and low-stock UI only; backend duplicate handling is already variant-aware
    - status: pending
  - `SR-006` Request/PO Deduplication Hardening
    - goal: guard against creating redundant supplier requests when an open purchase order already exists for the same branch/product/supplier context
    - scope: backend validation and optional frontend warnings
    - status: completed
  - recommended execution order:
    - `SR-001`
    - `SR-002`
    - `SR-003`
    - `SR-004`
    - `SR-005`
    - `SR-006`
- Files touched in this session:
  - `frontend/src/storefront/Checkout.jsx`
  - `backend/src/controllers/settingsController.js`
  - `backend/src/services/InvoiceService.js`
  - `backend/tests/unit/invoice-service-allocation.test.js`
  - `frontend/src/components/Sidebar.jsx`
  - `frontend/src/App.jsx`
  - `frontend/src/pages/BranchDashboardPage.jsx`
  - `frontend/src/pages/StockTransfersPage.jsx`
  - `backend/src/controllers/notificationController.js`
  - `backend/src/middleware/checkPermission.js`
  - `backend/src/routes/stockTransferRoutes.js`
  - `backend/src/jobs/StockTransferReminderJob.js`
  - `backend/src/services/NotificationService.js`
  - `backend/src/services/systemRoleService.js`
  - `backend/src/controllers/roleController.js`
  - `backend/src/utils/userAccessHelpers.js`
  - `backend/src/controllers/stockTransferController.js`
  - `frontend/src/pages/StockTransfersPage.jsx`
  - `backend/src/controllers/productController.js`
  - `frontend/src/pages/ProductsPage.jsx`
  - `frontend/src/store.js`
  - `frontend/src/pages/LowStockPage.jsx`
  - `frontend/src/pages/BranchDashboardPage.jsx`
  - `frontend/src/pages/StockTransfersPage.jsx`
  - `frontend/src/pages/ProductsPage.jsx`
  - `frontend/src/pages/PurchaseOrdersPage.jsx`
  - `backend/src/models/PurchaseOrder.js`
  - `backend/src/controllers/purchaseOrderController.js`
  - `backend/src/controllers/supplierReplenishmentRequestController.js`
  - `docs/shipping-stock-transfer-worklog.md`
 
 
