# PayQusta API E2E Scenarios

These scenarios are API-only business journeys. They are intended for `jest + supertest` or a black-box API runner.

## Scenario 1: Sales Flow

Goal: prove the core sales loop works end to end.

1. `POST /api/v1/auth/login` as vendor.
2. `POST /api/v1/products` to create a stocked product.
3. `POST /api/v1/customers` to create a customer.
4. `POST /api/v1/invoices` using deferred payment.
5. `GET /api/v1/invoices/:id` and verify:
   - total matches item price x quantity
   - status is pending or equivalent unpaid state
6. `POST /api/v1/invoices/:id/pay` with a partial amount.
7. `GET /api/v1/invoices/:id` and verify remaining amount decreased.
8. `POST /api/v1/invoices/:id/pay-all`.
9. `GET /api/v1/invoices/:id` and verify status is paid.
10. `GET /api/v1/products/:id` if available through controller path or verify through list endpoint that stock dropped.

Expected assertions:

- valid JWT is accepted
- stock is reduced exactly once
- invoice balance reaches zero
- customer balance reflects the invoice lifecycle

## Scenario 2: Portal Checkout With Coupon

Goal: verify e-commerce checkout and coupon enforcement.

1. Vendor logs in and creates:
   - one product
   - one coupon with `usageLimit = 1`
2. Customer registers or authenticates through `/api/v1/portal/login`.
3. `POST /api/v1/portal/coupons/validate` with the coupon code.
4. `POST /api/v1/portal/cart/checkout` with:
   - product
   - quantity
   - coupon code
5. Verify:
   - status is `201`
   - discount is applied
   - total amount is reduced
6. Retry the same checkout with the same coupon.
7. Verify the second request fails with a coupon limit error.

Expected assertions:

- coupon is consumed once
- duplicate usage is rejected
- invoice/order is created for the first attempt only

## Scenario 3: Supplier Settlement

Goal: verify supplier debt lifecycle.

1. Vendor logs in.
2. `POST /api/v1/suppliers`
3. `POST /api/v1/suppliers/:id/purchase`
4. `GET /api/v1/suppliers/:id`
5. Verify outstanding payable increased.
6. `POST /api/v1/suppliers/:id/payments/:paymentId/pay` with a partial amount.
7. Verify remaining payable decreased.
8. `POST /api/v1/suppliers/:id/pay-all`
9. Verify remaining payable is zero.

## Scenario 4: Admin Tenant Lifecycle

Goal: verify top-level administration.

1. Admin logs in.
2. `POST /api/v1/admin/tenants`
3. `GET /api/v1/admin/tenants` and confirm the tenant exists.
4. `PUT /api/v1/admin/tenants/:id`
5. `POST /api/v1/admin/tenants/:id/reset-password`
6. `DELETE /api/v1/admin/tenants/:id`
7. `GET /api/v1/admin/audit-logs`
8. Verify create, update, reset, and delete actions were logged.

## Scenario 5: Import and Restore

Goal: verify data portability.

1. Vendor logs in.
2. `POST /api/v1/import/products` with a small CSV/XLSX fixture.
3. `GET /api/v1/products` and verify imported products exist.
4. `GET /api/v1/backup/export-json`
5. In a clean test tenant, `POST /api/v1/backup/restore-json`
6. Verify the restored tenant has the expected products/customers counts.

## Scenario 6: Collection Route Execution

Goal: verify field collection flow.

1. Coordinator logs in.
2. `GET /api/v1/collection/tasks/today`
3. `POST /api/v1/collection/tasks/:id/visit`
4. `POST /api/v1/collection/tasks/:id/collect`
5. `GET /api/v1/collection/routes/today`
6. `POST /api/v1/collection/routes/:id/start`
7. `POST /api/v1/collection/routes/:id/complete`
8. Verify task state, route state, and linked invoice/payment state changed consistently.

## Execution Notes

- Use a dedicated test database.
- Freeze or control time for installment or overdue scenarios.
- Disable real third-party integrations.
- Keep fixture data minimal and explicit.
