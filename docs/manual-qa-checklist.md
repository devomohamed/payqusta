# Manual QA Checklist

Use this checklist before major rollouts that touch storefront, portal, admin, shipping, or payments.

## Viewports

- `320x568`
- `375x812`
- `390x844`
- `430x932`
- `768x1024`
- `1024x768`

## Public / Storefront

- home page loads without layout overflow
- product catalog filters/search work
- product details CTA remains reachable on mobile
- cart updates quantity and totals correctly
- checkout empty/loading/success states are correct
- guest order confirmation opens
- guest order tracking works with `orderNumber + token`

## Portal

- customer login works
- portal home renders quick actions and stats
- orders list/details open correctly on mobile
- invoices list/details render without clipped tables
- returns request flow works
- support message flow works

## Admin / Backoffice

- login works
- dashboard loads without console-breaking errors
- products page supports create/edit/upload flows
- invoices page supports create/pay/refund actions
- customers page and customer details modal render correctly
- returns management page can review and complete return flows
- ops status is reachable for admin/vendor

## Shipping / Payments

- create one safe test order
- record one payment
- verify refund status surfaces correctly
- verify shipment creation or refresh action works
- verify webhook endpoints are reachable after deploy

## Ops

- `/api/health`
- `/api/health/ready`
- `/api/v1/ops/status`
- `/api/v1/ops/metrics`
- `npm --prefix backend run release:smoke -- --app-url=https://your-service`

## Accessibility Spot Checks

- keyboard focus visible on primary actions
- modal opens and closes cleanly
- no blocked scroll or clipped modal body on mobile
- buttons remain reachable with touch targets
