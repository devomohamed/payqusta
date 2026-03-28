# Shipping, Fulfillment, and Stock Transfer Analysis

## Purpose

This document consolidates the shipping, checkout, branch-fulfillment, and stock-transfer discussions for Payqusta into one implementation-ready reference.

It is intended to support:

- UI design and Google Stitch page generation
- backend and frontend planning
- phased delivery decisions
- operational edge-case handling

This document is deliberately aligned with the current project structure and should be treated as the canonical decision brief for this feature area.

## Product Goal

Enable Payqusta to support online orders that:

- calculate shipping at checkout using either fixed zones or dynamic courier pricing
- always ship from one configured default shipping branch in V1, called `Branch X`
- request an internal stock transfer from another branch, `Branch Y`, when `Branch X` lacks enough stock
- only hand the order to the courier after stock is fully available in `Branch X`

## Scope

### In scope for V1

- tenant-level shipping settings
- default shipping branch selection
- fixed shipping zones
- dynamic shipping pricing via courier API
- admin order confirmation with branch recommendation
- one-source internal stock transfer from `Branch Y` to `Branch X`
- branch-side transfer acceptance, preparation, shipping, and receipt
- order and transfer notifications
- operational error and delay states

### Explicitly out of scope for V1

- mixed-branch fulfillment within one order
- split shipment to the customer
- multiple concurrent source branches for one order
- automatic repricing after order creation
- advanced courier SLA optimization
- geolocation route engines

## Frozen Decisions

1. `Branch X` is the only shipping branch used for customer delivery in V1.
2. Shipping pricing mode is exclusive: only one mode is active at a time.
3. Shipping cost is calculated during checkout and stored as a snapshot on the order.
4. Customer address changes after order creation require admin review and do not silently reprice the order.
5. Internal stock transfer is not a sale and must not affect branch revenue directly.
6. Stock is deducted from `Branch Y` only when the transfer moves to `in_transit`.
7. Stock is added to `Branch X` only when receipt is confirmed there.
8. If no single branch can satisfy the missing quantity, V1 does not auto-combine multiple branches.
9. The order can only move to courier handoff when the required stock is fully available in `Branch X`.
10. The temporary post-receipt review state is `partial_receipt_review`.
11. Dynamic pricing in V1 requires `governorate` plus one `city/area` field; more granular area data is sent when available but not required as a separate mandatory field.
12. Overdue transfer reminders use a platform default with tenant-level override.
13. Over-receipt is blocked explicitly in V1; extra received units are rejected until a future dedicated review flow exists.

## Stakeholders

- `System Admin / Owner`
  - configures shipping
  - reviews online orders
  - creates transfer requests
  - confirms, delays, or cancels orders
- `Branch X Manager`
  - receives internal transfers
  - confirms full or partial receipt
  - reports loss, damage, or mismatch
  - prepares ready orders for courier pickup
- `Branch Y Manager`
  - accepts or rejects transfer requests
  - prepares stock
  - marks transfer as shipped
- `Customer`
  - enters shipping address
  - sees shipping cost and ETA before order placement
- `Courier / Shipping Company`
  - may price shipping dynamically
  - picks up from `Branch X`
  - updates last-mile delivery status

## Core Entities

### ShippingConfig

Tenant-level configuration for shipping.

Suggested fields:

- `defaultShippingBranchId`
- `pricingMode` = `fixed_zones | dynamic_api`
- `dynamicApi.enabled`
- `dynamicApi.endpoint`
- `dynamicApi.apiKey`
- `dynamicApi.errorBehavior` = `show_error | use_fallback_price | block_checkout`
- `dynamicApi.fallbackPrice`
- `dynamicApi.timeoutMs`

### ShippingZone

Suggested fields:

- `tenant`
- `name`
- `governorates`
- `areas`
- `price`
- `estimatedDaysMin`
- `estimatedDaysMax`
- `sortOrder`
- `isActive`

### Order / Invoice

Suggested additions or clarified usage:

- `shippingBranchId`
- `shippingSnapshot`
- `transferRequestId`
- `addressChangedAfterCheckout`
- `addressReviewStatus`
- `fulfillmentDecision`
- `orderStatus`

### StockTransfer

Suggested fields:

- `tenant`
- `orderId`
- `fromBranchId`
- `toBranchId`
- `createdBy`
- `items[]`
- `status`
- `rejectionReason`
- `notes`
- `trackingReference`
- `receivedSummary`
- `issueReport`

## Pricing Model

## 1. Fixed Zones

The customer selects governorate and address details.

System behavior:

- match the entered governorate or zone key to a configured shipping zone
- show the zone name, fixed price, and ETA immediately
- persist the selected zone and price in the order snapshot

If no zone matches:

- show `shipping unavailable` in strict mode
- or use an explicit configured fallback policy in a later phase

## 2. Dynamic Courier API

The system sends a request using:

- source: `Branch X` shipping origin
- destination: customer address

Expected API response:

- shipping price
- ETA / delivery window
- optional carrier metadata

Supported UX states:

- `loading`
- `success`
- `timeout / connection error`
- `fallback price`
- `blocked checkout`

## Order Lifecycle

Recommended order statuses:

- `pending`
- `awaiting_confirmation`
- `awaiting_stock_transfer`
- `transfer_in_progress`
- `ready_for_shipping`
- `assigned_to_courier`
- `out_for_delivery`
- `delivered`
- `cancelled`
- `failed`

Operational note:

- use `partial_receipt_review` as the explicit temporary status after partial receipt and before admin resolution

## Transfer Lifecycle

Recommended transfer statuses:

- `requested`
- `approved`
- `rejected`
- `prepared`
- `in_transit`
- `partially_received`
- `fully_received`
- `cancelled`

Note:

- the UI can display `Completed` if preferred, but the internal enum should stay unified
- avoid mixing `completed` and `fully_received` as separate technical states

## Inventory Rules

1. Creating a transfer request does not change stock.
2. Approving a transfer request does not change stock.
3. Moving to `in_transit` deducts the shipped quantity from `Branch Y`.
4. Confirming receipt adds the actual received quantity to `Branch X`.
5. Partial receipt adds only the actual received quantity.
6. Wrong, lost, or damaged units are recorded as transfer incidents, not sales.
7. The sale remains attributed to `Branch X` as the customer-facing shipping branch.

## Branch Recommendation Logic

When `Branch X` lacks enough stock:

1. find active branches with sufficient available stock
2. rank by:
   - shortest distance to `Branch X`
   - highest available quantity
   - lowest `onlinePriority` value
3. return the top recommendations to the admin

If no single branch can satisfy the missing quantity:

- show an admin warning
- offer `delay order` or `cancel order`
- do not propose multi-source fulfillment in V1

## Main User Flows

## Flow A: Shipping configuration

1. admin opens `Settings -> Shipping`
2. admin selects `Branch X`
3. admin selects pricing mode
4. admin configures zones or API settings
5. admin tests and saves configuration

## Flow B: Customer checkout

1. customer enters shipping details
2. system calculates shipping
3. customer sees shipping cost and ETA
4. customer places the order
5. order stores a shipping snapshot

## Flow C: Direct confirmation

1. admin opens order details
2. stock in `Branch X` is sufficient
3. admin confirms the order
4. order becomes `ready_for_shipping`
5. shipment is created with the courier

## Flow D: Transfer-assisted fulfillment

1. admin opens order details
2. stock in `Branch X` is insufficient
3. system recommends source branches
4. admin creates transfer request from `Branch Y` to `Branch X`
5. `Branch Y` accepts, prepares, and ships
6. `Branch X` receives and confirms
7. order becomes `ready_for_shipping`
8. shipment is created with the courier

## Required UI Surfaces

### 1. Shipping Settings Tab

Location:

- `SettingsPage`

Purpose:

- choose `Branch X`
- choose pricing mode
- manage fixed zones or dynamic API settings

### 2. Customer Checkout - Shipping Step

Locations:

- public storefront checkout
- portal checkout if needed by the business model

Purpose:

- collect address
- calculate shipping
- show shipping state clearly before final placement

### 3. Admin Order Confirmation Page

Purpose:

- inspect the order
- evaluate stock in `Branch X`
- create transfer when needed
- confirm or cancel the order

### 4. Stock Transfers Page

Purpose:

- central transfer queue
- filters, statuses, and timeline
- manual review and intervention

### 5. Branch Y Transfer Requests Dashboard

Purpose:

- accept or reject request
- prepare and ship
- provide notes and reference data

### 6. Branch X Incoming Transfers Dashboard

Purpose:

- confirm receipt
- record issues
- unlock order readiness for shipping

## Scenario Matrix With Solutions

The following scenarios must be considered in both design and implementation.

| Scenario | Trigger | Required system solution | Required UI treatment | Priority |
|---|---|---|---|---|
| Shipping API timeout | Courier API does not respond in time | mark pricing request as failed, allow retry, obey configured fallback behavior | loading -> error card with retry, or fallback warning, or blocked checkout state | P0 |
| Shipping API returns invalid price | API returns zero, negative, or malformed result | reject response, log incident, use configured error behavior | inline error alert, do not silently accept bad price | P0 |
| Customer changes address during checkout | address fields change after a successful quote | invalidate old quote and recalculate before order placement | stale quote warning and recalculation loader | P0 |
| Customer changes address after order creation | address edit requested after order exists | set `addressChangedAfterCheckout = true`, require admin review, do not auto-reprice | warning banner in order details with review action | P0 |
| No zone match in fixed mode | selected governorate is not mapped to any zone | block or fallback according to business policy, default should be block in V1 | unavailable shipping state | P0 |
| Stock in Branch X changed before confirmation | another process consumed stock | re-run stock validation at confirm time, never trust stale UI data | warning toast and refresh availability panel | P0 |
| Two admins act on same order | concurrent confirm or transfer creation | enforce optimistic or server-side guard, allow only one active decision path | stale state banner and disabled duplicate actions | P0 |
| Branch Y rejects transfer | source branch cannot fulfill | record rejection reason, notify admin, reopen recommendation flow | rejection card with reason and action to create another transfer | P0 |
| Branch Y does not respond | request stays idle past SLA | mark as overdue, notify admin, allow reassignment | overdue badge, escalated alert | P1 |
| Branch Y accepts but cannot fully prepare | real stock is lower than expected | allow preparation note, return to admin review or partial shipment policy if approved later | warning state before shipment | P1 |
| Duplicate transfer request | double click or retry creates same transfer twice | enforce idempotency or block if active transfer exists for same order gap | duplicate-protection alert | P0 |
| Transfer is in transit but order is cancelled | customer/admin cancels mid-flow | freeze automatic shipping, show recovery decision for received stock | cancellation warning on transfer and order | P1 |
| Full receipt succeeds but stock update fails | transactional failure | treat as failed receipt completion, retry safely, never show completed state without stock sync | error alert with retry admin action | P0 |
| Partial receipt | fewer items arrive than expected | add actual received qty to X, keep incident record, reopen admin decision | orange badge, actual quantity inputs, wait-for-remaining or cancel flow | P0 |
| Wrong items received | mismatched SKU or variant | do not auto-complete receipt, record issue, require admin review | red issue modal and incident panel | P1 |
| Damaged or lost items | received condition is bad | add only valid quantity, record loss report, notify admin | damage/loss form and incident summary | P0 |
| Quantity greater than expected arrives | source branch sent extra units | allow controlled admin policy: accept extra to X stock but flag audit note | over-receipt warning and confirm modal | P2 |
| Courier rejects shipment creation | invalid address or carrier validation failure | keep order in `ready_for_shipping`, store failure reason, allow edit/retry | red shipping alert in order details | P0 |
| Courier shipment created but response not persisted | partial integration failure | support shipment reconciliation job and retry-safe create behavior | sync status banner | P1 |
| Unknown courier status | carrier sends unmapped status code | map to generic exception state and alert admin | gray unknown-status badge with details | P2 |
| Multi-product mixed availability | one item needs transfer, one has no stock | do not auto-confirm; show item-level decision table | per-product availability matrix | P0 |
| No stock in any branch | total stock unavailable | allow delay or cancel only | red empty-state style alert | P0 |
| Reserved or frozen stock exists in Branch Y | available qty is lower than raw qty | recommendation engine must use available-to-transfer quantity, not gross qty | low-availability annotation in branch table | P1 |
| Notification duplication | same event fires repeatedly | add event dedupe keys per order/transfer state change | single notification item, no spam | P2 |
| User loses connectivity during action | save or status update fails client-side | keep server as source of truth and present retry-safe actions | retry banner and last-known state indicator | P1 |

## Remaining Delivery Gaps

These items are still required before the initiative is fully done:

- automated tests for transfer permission boundaries, lifecycle transitions, and shipping snapshot integrity
- customer-facing address-change request wiring is still needed if the storefront or portal will let customers request post-order address edits
- over-receipt remains blocked in V1; if the business later wants to accept extra received units, that needs a dedicated review workflow instead of the current explicit validation error

## Design Guidance

The UI must match the current admin and storefront patterns already present in the project:

- Arabic RTL by default
- dark and light mode
- `app-surface`, `app-surface-glass`, and `app-surface-muted`
- large rounded corners such as `rounded-2xl` and `rounded-3xl`
- gradient hero banners matching current branch-management and admin pages
- pill-shaped badges
- Lucide icons
- reusable modal, table, empty state, and skeleton patterns

## Alignment With Current Codebase

This feature should build on the existing patterns in:

- `frontend/src/pages/SettingsPage.jsx`
- `frontend/src/pages/BranchManagement.jsx`
- `frontend/src/pages/PortalOrdersAdminPage.jsx`
- `frontend/src/pages/BranchDashboardPage.jsx`
- `frontend/src/storefront/Checkout.jsx`
- `frontend/src/portal/PortalCheckout.jsx`
- `frontend/src/storefront/storefrontShipping.js`
- `frontend/src/components/UI.jsx`
- `frontend/src/components/NotificationDropdown.jsx`
- `frontend/src/index.css`

## Recommended Next Documents

This analysis is meant to be used together with:

- `docs/shipping-stock-transfer-implementation-plan.md`
- `docs/shipping-stock-transfer-worklog.md`
