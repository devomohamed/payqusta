# PayQusta API Inventory

This document summarizes the current API surface based on the route files under `backend/src/routes`.

## Base URLs

- API base: `/api/v1`
- Health check: `/api/health`
- Liveness: `/api/health/live`
- Readiness: `/api/health/ready`
- Versioned health alias: `/api/v1/health`
- Protected ops status: `/api/v1/ops/status`
- Swagger UI: `/api-docs`
- Swagger JSON: `/api-docs.json`

## Authentication and Access Model

- Public endpoints: health, selected auth endpoints, plans, storefront settings, conditional checkout/customer creation, selected payment/subscription webhooks, and some coupon/review portal flows.
- Protected endpoints: most business APIs require `Authorization: Bearer <jwt>`.
- Tenant scoping is applied centrally after `router.use(protect)` and `router.use(tenantScope)` in `backend/src/routes/index.js`.
- Role gates are enforced with `authorize(...)`.
- Feature and permission gates are enforced with `requireFeature(...)`, `checkPermission(...)`, and `checkLimit(...)`.

## Route Groups

## Health

- `GET /health`
- `GET /health/live`
- `GET /health/ready`

## Ops

- `GET /ops/status`

## Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/forgot-password`
- `POST /auth/reset-password/:token`
- `POST /auth/logout`
- `POST /auth/logout-all`
- `GET /auth/me`
- `PUT /auth/update-password`
- `PUT /auth/update-profile`
- `PUT /auth/update-avatar`
- `DELETE /auth/remove-avatar`
- `GET /auth/users`
- `POST /auth/users`
- `PUT /auth/users/:id`
- `DELETE /auth/users/:id`
- `POST /auth/add-user`
- `POST /auth/switch-tenant`
- `POST /auth/create-store`

## Plans

- `GET /plans`

## Portal

- `POST /portal/login`
- `POST /portal/register`
- `POST /portal/activate`
- `GET /portal/dashboard`
- `GET /portal/invoices`
- `GET /portal/invoices/:id`
- `GET /portal/invoices/:id/pdf`
- `POST /portal/invoices/:id/pay`
- `GET /portal/statement`
- `GET /portal/statement/pdf`
- `PUT /portal/profile`
- `PUT /portal/change-password`
- `GET /portal/documents`
- `POST /portal/documents`
- `DELETE /portal/documents/:id`
- `GET /portal/returns`
- `POST /portal/returns`
- `GET /portal/addresses`
- `POST /portal/addresses`
- `PUT /portal/addresses/:id`
- `DELETE /portal/addresses/:id`
- `GET /portal/points`
- `GET /portal/points/history`
- `GET /portal/products`
- `GET /portal/products/:id`
- `POST /portal/cart/checkout`
- `GET /portal/orders`
- `GET /portal/orders/:id`
- `POST /portal/orders/:id/cancel`
- `POST /portal/orders/:id/reorder`
- `GET /portal/notifications`
- `GET /portal/notifications/unread-count`
- `PUT /portal/notifications/read-all`
- `PUT /portal/notifications/:id/read`
- `GET /portal/wishlist`
- `POST /portal/wishlist/:productId`
- `GET /portal/support`
- `GET /portal/support/:id`
- `POST /portal/support`
- `POST /portal/support/:id/reply`
- `GET /portal/reviews`
- `GET /portal/reviews/store`
- `POST /portal/reviews`
- `POST /portal/coupons/validate`
- `POST /portal/gamification/daily-reward`

## Dashboard

- `GET /dashboard/overview`
- `GET /dashboard/sales-report`
- `GET /dashboard/profit-intelligence`
- `GET /dashboard/risk-scoring`
- `GET /dashboard/daily-collections`
- `GET /dashboard/aging-report`
- `GET /dashboard/business-health`
- `GET /dashboard/cash-flow-forecast`
- `GET /dashboard/smart-assistant`
- `GET /dashboard/real-profit`
- `GET /dashboard/credit-engine`
- `GET /dashboard/customer-lifetime-value`

## Products

- `GET /products`
- `GET /products/low-stock`
- `GET /products/summary`
- `GET /products/categories`
- `GET /products/barcode/:code`
- `POST /products`
- `PUT /products/:id`
- `DELETE /products/:id`
- `PATCH /products/:id/stock`
- `POST /products/:id/upload-image`
- `DELETE /products/:id/images/:imageUrl`
- `POST /products/stocktake`
- `POST /products/:id/request-restock`
- `POST /products/request-restock-bulk`
- `POST /products/bulk-delete`

## Categories

- `GET /categories`
- `GET /categories/tree`
- `POST /categories`
- `PUT /categories/:id`
- `DELETE /categories/:id`

## Customers

- `POST /customers` (conditional public checkout path or protected)
- `GET /customers`
- `GET /customers/top`
- `GET /customers/debtors`
- `GET /customers/segments`
- `GET /customers/:id`
- `GET /customers/:id/transactions`
- `GET /customers/:id/statement-pdf`
- `GET /customers/:id/credit-assessment`
- `POST /customers/:id/send-statement`
- `POST /customers/:id/send-statement-pdf`
- `POST /customers/:id/block-sales`
- `POST /customers/:id/unblock-sales`
- `POST /customers/:id/redeem-points`
- `POST /customers/broadcast`
- `PUT /customers/:id`
- `PUT /customers/:id/whatsapp-preferences`
- `DELETE /customers/:id`
- `POST /customers/bulk-delete`

## Invoices

- `POST /invoices` (conditional public checkout path or protected)
- `GET /invoices`
- `GET /invoices/overdue`
- `GET /invoices/upcoming-installments`
- `GET /invoices/sales-summary`
- `GET /invoices/:id`
- `POST /invoices/send-whatsapp-message`
- `POST /invoices/:id/pay`
- `POST /invoices/:id/pay-all`
- `POST /invoices/:id/send-whatsapp`
- `PATCH /invoices/:id/order-status`
- `POST /invoices/:id/payment-link`

## BI

- `GET /bi/health-score`
- `GET /bi/stock-forecast`
- `GET /bi/cash-flow-forecast`
- `GET /bi/command-center`
- `GET /bi/achievements`
- `GET /bi/customer-lifetime-value`
- `GET /bi/aging-report`
- `GET /bi/real-profit`
- `GET /bi/staff-performance`
- `POST /bi/what-if`

## Branches

- `GET /branches`
- `POST /branches`
- `PUT /branches/:id`
- `DELETE /branches/:id`
- `GET /branches/:id/stats`
- `POST /branches/:id/shift/start`
- `POST /branches/:id/shift/end`
- `POST /branches/:id/settlement`

## Suppliers

- `GET /suppliers`
- `GET /suppliers/upcoming-payments`
- `GET /suppliers/:id`
- `GET /suppliers/:id/low-stock-products`
- `POST /suppliers`
- `PUT /suppliers/:id`
- `DELETE /suppliers/:id`
- `POST /suppliers/:id/purchase`
- `POST /suppliers/:id/payments/:paymentId/pay`
- `POST /suppliers/:id/pay-all`
- `POST /suppliers/:id/send-reminder`
- `POST /suppliers/:id/request-restock`

## Notifications

- `GET /notifications`
- `GET /notifications/unread-count`
- `GET /notifications/stream`
- `PATCH /notifications/read-all`
- `PATCH /notifications/:id/read`
- `DELETE /notifications/:id`

## Stock Adjustments

- `GET /stock-adjustments`
- `POST /stock-adjustments`

## Cash Shifts

- `GET /cash-shifts/current`
- `POST /cash-shifts/open`
- `POST /cash-shifts/close`
- `GET /cash-shifts/history`

## Expenses

- `GET /expenses`
- `GET /expenses/summary`
- `GET /expenses/categories`
- `POST /expenses`
- `PUT /expenses/:id`
- `DELETE /expenses/:id`

## Settings

- `GET /storefront/settings`
- `GET /settings`
- `PUT /settings/store`
- `PUT /settings/whatsapp`
- `POST /settings/whatsapp/test`
- `POST /settings/whatsapp/topup`
- `GET /settings/whatsapp/templates`
- `POST /settings/whatsapp/create-templates`
- `POST /settings/whatsapp/detect-templates`
- `POST /settings/whatsapp/apply-templates`
- `PUT /settings/branding`
- `PUT /settings/user`
- `PUT /settings/password`
- `PUT /settings/categories`
- `DELETE /settings/categories/:name`

## Subscriptions

- `POST /subscriptions/webhook/:gateway`
- `GET /subscriptions/payment-methods`
- `GET /subscriptions/my-subscription`
- `POST /subscriptions/subscribe`
- `POST /subscriptions/submit-receipt`

## Addons

- `GET /addons`
- `POST /addons/:key/purchase`

## Referrals

- `GET /referrals/my-code`
- `GET /referrals/stats`
- `POST /referrals/apply`

## Owner Management

- `GET /manage/returns`
- `PATCH /manage/returns/:id`
- `GET /manage/documents`
- `PATCH /manage/documents/:customerId/:docId`
- `GET /manage/support`
- `GET /manage/support/:id`
- `POST /manage/support/:id/reply`
- `PATCH /manage/support/:id/close`

## Roles

- `GET /roles`
- `GET /roles/:id`
- `POST /roles`
- `PUT /roles/:id`
- `DELETE /roles/:id`

## Purchase Orders

- `GET /purchase-orders`
- `GET /purchase-orders/:id`
- `GET /purchase-orders/:id/pdf`
- `POST /purchase-orders`
- `PUT /purchase-orders/:id`
- `POST /purchase-orders/:id/receive`
- `DELETE /purchase-orders/:id`

## Payments

- `GET /payments/gateways`
- `POST /payments/create-link`
- `GET /payments/transactions`
- `GET /payments/transactions/:id`
- `GET /payments/analytics`
- `POST /payments/transactions/:id/refund`
- `POST /payments/webhook/paymob`
- `POST /payments/webhook/fawry`
- `POST /payments/webhook/vodafone`
- `POST /payments/webhook/instapay`

## Collection

- `GET /collection/tasks/today`
- `GET /collection/tasks/:id`
- `POST /collection/tasks/:id/visit`
- `POST /collection/tasks/:id/collect`
- `POST /collection/tasks/:id/skip`
- `GET /collection/routes/today`
- `POST /collection/routes/optimize`
- `POST /collection/routes/:id/start`
- `POST /collection/routes/:id/complete`
- `POST /collection/routes/track`
- `GET /collection/collectors`
- `GET /collection/collectors/:id/stats`
- `POST /collection/assign`

## Admin

- `GET /admin/dashboard`
- `GET /admin/statistics`
- `GET /admin/analytics/revenue`
- `GET /admin/tenants`
- `POST /admin/tenants`
- `PUT /admin/tenants/:id`
- `DELETE /admin/tenants/:id`
- `POST /admin/tenants/:id/reset-password`
- `POST /admin/plans`
- `PUT /admin/plans/:id`
- `DELETE /admin/plans/:id`
- `GET /admin/users`
- `POST /admin/users`
- `PUT /admin/users/:id`
- `DELETE /admin/users/:id`
- `GET /admin/audit-logs`
- `GET /audit-logs`
- `GET /audit-logs/active-users`
- `GET /audit-logs/login-history`

## Super Admin

- `GET /super-admin/tenants`
- `GET /super-admin/analytics`
- `GET /super-admin/tenants/:id/details`
- `POST /super-admin/tenants`
- `PUT /super-admin/tenants/:id`
- `DELETE /super-admin/tenants/:id`
- `POST /super-admin/tenants/:id/impersonate`
- `GET /super-admin/plans`
- `POST /super-admin/plans`
- `PUT /super-admin/plans/:id`
- `DELETE /super-admin/plans/:id`
- `GET /super-admin/payment-methods`
- `PUT /super-admin/payment-methods`
- `GET /super-admin/subscription-requests`
- `POST /super-admin/subscription-requests/:id/approve`
- `POST /super-admin/subscription-requests/:id/reject`

## Reports

- `GET /reports/sales`
- `GET /reports/profit`
- `GET /reports/inventory`
- `GET /reports/customers`
- `GET /reports/products`
- `GET /reports/ledger`
- `GET /reports/pnl`
- `GET /reports/cash-flow-forecast`
- `GET /reports/export/sales`
- `GET /reports/export/profit`
- `GET /reports/export/inventory`
- `GET /reports/export/customers`
- `GET /reports/export/products`

## Search

- `GET /search`
- `GET /search/suggestions`
- `GET /search/quick`

## Import

- `POST /import/products`
- `POST /import/customers`
- `POST /import/preview`
- `GET /import/template/:type`

## Reviews

- `GET /reviews`
- `GET /reviews/stats`
- `GET /reviews/product/:productId`
- `GET /reviews/:id`
- `PATCH /reviews/:id/status`
- `POST /reviews/:id/reply`
- `DELETE /reviews/:id`

## Coupons

- `GET /coupons`
- `GET /coupons/stats`
- `POST /coupons/validate`
- `GET /coupons/:id`
- `POST /coupons`
- `PUT /coupons/:id`
- `DELETE /coupons/:id`

## Backup

- `GET /backup/export`
- `GET /backup/export-json`
- `GET /backup/stats`
- `POST /backup/restore`
- `POST /backup/restore-json`

## Documentation Gaps

- `backend/src/docs/apiDocs.js` does not document the full route inventory above.
- New route groups should be added there if Swagger is intended to stay complete.
- For controller-level function docs, the next step is to add JSDoc blocks directly above exports in `backend/src/controllers` and `backend/src/services`.
