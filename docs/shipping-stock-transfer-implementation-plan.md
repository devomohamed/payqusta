# Shipping, Fulfillment, and Stock Transfer Implementation Plan

## Purpose

This plan turns `docs/shipping-stock-transfer-analysis.md` into an implementation sequence that fits the current Payqusta codebase.

## Delivery Strategy

Execute in this order:

1. decision and data-contract freeze
2. shipping settings foundation
3. checkout pricing flow
4. admin order confirmation flow
5. stock transfer lifecycle
6. branch dashboards
7. notifications and hardening

## Phase 0: Decision Freeze

Before touching code, confirm:

1. whether unmatched fixed-zone addresses are blocked or allowed via future fallback
2. whether over-receipt is accepted automatically or requires admin confirmation
3. whether transfer overdue timing is configurable per tenant or global
4. whether dynamic courier pricing is available for storefront only or storefront plus portal

Acceptance criteria:

- unresolved choices are written into the worklog before implementation starts

## Phase 1: Shipping Settings Foundation

Goal:

- create a tenant-level shipping settings surface and data model

Backend scope:

- `backend/src/models/Tenant.js` or a dedicated shipping model if preferred
- `backend/src/controllers/settingsController.js`
- shipping settings validation and persistence

Frontend scope:

- `frontend/src/pages/SettingsPage.jsx`
- new component under `frontend/src/components/settings/`

Expected UI:

- `Shipping` tab
- default shipping branch selector restricted to online-enabled branches
- pricing mode toggle tiles
- zones table or dynamic API form

Acceptance criteria:

- only one pricing mode can be active
- settings persist and reload correctly
- loading, empty, success, and error states exist

## Phase 2: Checkout Shipping Calculation

Goal:

- calculate and display shipping in checkout, then freeze it into the order snapshot

Frontend scope:

- `frontend/src/storefront/Checkout.jsx`
- `frontend/src/portal/PortalCheckout.jsx`
- `frontend/src/storefront/storefrontShipping.js`

Backend scope:

- new endpoint such as `POST /shipping/calculate`
- courier integration layer if dynamic mode is enabled

Acceptance criteria:

- fixed-zone mode resolves immediately from configured zone data
- dynamic mode supports loading, retry, fallback, and blocked states
- the final order stores a shipping snapshot that is not recalculated silently later

## Phase 3: Admin Order Confirmation

Goal:

- replace implicit or modal-only review with a strong order detail decision screen

Frontend scope:

- split `frontend/src/pages/PortalOrdersAdminPage.jsx` into list and detail behavior
- add route for order detail

Backend scope:

- order availability evaluation endpoint or enriched order detail payload
- branch recommendation endpoint or service

Required capabilities:

- stock sufficiency in `Branch X`
- recommendation of source branches
- transfer creation from order detail
- delay or cancel path
- mixed-availability table for multi-product orders

Acceptance criteria:

- admin can make a deterministic fulfillment decision from one page
- stale stock detection is enforced on confirm action

## Phase 4: Stock Transfer Lifecycle

Goal:

- model and execute transfer requests from `Branch Y` to `Branch X`

Backend scope:

- new transfer model
- `POST /transfers`
- `PATCH /transfers/:id/status`
- receipt and issue endpoints

Frontend scope:

- new `Stock Transfers` page
- transfer detail modal or page

Acceptance criteria:

- transfer can move through all supported statuses
- status changes enforce inventory rules
- rejection reason and issue reporting are persisted

## Phase 5: Branch Dashboards

Goal:

- give each branch role the screens they need without exposing unrelated controls

Frontend scope:

- extend `frontend/src/pages/BranchDashboardPage.jsx`
- or add dedicated sub-routes if that is cleaner

Branch Y requirements:

- new transfer request list
- accept/reject
- prepare
- mark shipped

Branch X requirements:

- incoming transfer list
- full receipt
- partial receipt
- issue reporting
- unlock `ready_for_shipping`

Acceptance criteria:

- branch managers only see transfer work relevant to their own branch scope

## Phase 6: Notifications and Operational Hardening

Goal:

- connect all major lifecycle events to in-app notifications and handle operational failure states

Frontend scope:

- `frontend/src/components/NotificationDropdown.jsx`

Backend scope:

- notification emission on order and transfer state transitions
- dedupe protection
- overdue reminders

Acceptance criteria:

- admin, Branch X, and Branch Y get the correct notifications
- duplicate or contradictory notifications are avoided

Execution breakdown:

1. add overdue reminder timing settings with platform default and tenant override
2. add stale-transfer detection job for `requested` and `approved` transfers
3. add notification dedupe protection for transfer and order lifecycle events
4. persist courier shipment creation failures on the order and expose retry state in admin UI
5. add address-change review and `partial_receipt_review` resolution actions to the order detail page

## Suggested File Mapping

### Frontend

- `frontend/src/pages/SettingsPage.jsx`
- `frontend/src/components/settings/SettingsShipping.jsx`
- `frontend/src/storefront/Checkout.jsx`
- `frontend/src/portal/PortalCheckout.jsx`
- `frontend/src/storefront/storefrontShipping.js`
- `frontend/src/pages/PortalOrdersAdminPage.jsx`
- `frontend/src/pages/StockTransfersPage.jsx`
- `frontend/src/pages/BranchDashboardPage.jsx`
- `frontend/src/components/NotificationDropdown.jsx`

### Backend

- `backend/src/models/Tenant.js`
- `backend/src/models/Invoice.js`
- `backend/src/models/Branch.js`
- `backend/src/models/StockTransfer.js`
- `backend/src/controllers/settingsController.js`
- `backend/src/controllers/portalController.js`
- `backend/src/controllers/invoiceController.js`
- `backend/src/controllers/transferController.js`
- `backend/src/services/InvoiceService.js`
- `backend/src/utils/inventoryAllocation.js`
- `backend/src/utils/orderLifecycle.js`

## Scenario Hardening Checklist

The following scenario solutions are mandatory before release:

- timeout and retry behavior for courier pricing
- stale stock validation before confirmation
- duplicate transfer creation protection
- transfer rejection with mandatory reason
- partial receipt flow
- loss and damage incident recording
- address-changed-after-checkout review state
- cancellation while transfer is active
- shipment creation failure recovery

## Testing Strategy

### Backend

- unit tests for shipping calculation mode selection
- transfer lifecycle tests
- inventory integrity tests for in-transit and receipt states
- order lifecycle transition tests

### Frontend

- manual QA on checkout states
- manual QA on admin order detail scenarios
- manual QA on branch dashboards
- smoke coverage for settings route and new transfer screens

## Definition Of Done

This initiative is done only when:

1. shipping settings are editable and stable
2. checkout pricing works in both supported modes
3. order confirmation supports stock transfer decisions
4. transfer lifecycle updates stock correctly
5. Branch X can unlock `ready_for_shipping`
6. core notifications are in place
7. failure states are represented clearly in the UI
