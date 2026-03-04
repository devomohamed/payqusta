# Portal + Storefront Merge Tasks

1. **Hero & Trust Experience** (owner: frontend store team)
   - Update `frontend/src/storefront/StorefrontHome.jsx` hero to mirror `PortalHome` (gradient hero, premium badge, CTA buttons).
   - Reuse `Card`, `Badge`, `Button` primitives from `frontend/src/components/UI` for consistency.
   - Confirm hero copy references tenant branding (`settings.tenant.name`).

2. **Dashboard Hooks**
   - Call `portalStore.fetchDashboard`, `fetchNotifications`, and `fetchPoints` whenever `customer` is present (storefront home + layout).  Cache dashboard data in local state.
   - Surface wallet balance, available credit, tier progress, and loyalty points as responsive cards.
   - Animate progress bars (borrow `PortalHome` styles).

3. **Notifications + Support**
   - Add top banner or drawer showing `portalStore.unreadCount` and link to `/portal/notifications`.
   - Embed a `SupportBubble` (based on `PortalSupportChat`) that triggers the support modal and opens `/portal/support` when clicked.
   - Wire `portalApi` event stream (same endpoint used by portal) so storefront notices new notifications instantly.

4. **Orders / Invoices / Returns Links**
   - Render quick-action tiles for orders, invoices, returns (reuse `Link` components pointing to `/portal/orders`, `/portal/invoices`, `/portal/returns`).
   - Show summary badges (`portalStore.customer.orders`, `outstanding invoices`) if available.
   - Ensure each tile has semantic `aria` labels and `key` attributes (prevents React error #31 when mapping arrays of portal metadata).

5. **Documents / Wishlist / Addresses**
   - Add a profile section that shows the number of uploaded documents, wishlist items, and saved addresses (use `portalStore.fetchDocuments`, `.fetchWishlist`, `.fetchAddresses`).
   - Provide buttons for uploading a document and editing addresses that re-use `PortalDocuments`/`PortalAddresses` modals.
   - Persist counts in the storefront state/store for quick re-render.

6. **Task Tracking & Verification**
   - Keep this file updated with progress, blockers, and verification steps (simulated login, API smoke tests, storybook snapshots).
   - Reference `docs/api-inventory.md` for endpoint expectations when wiring the new UI.

## Storefront Conversion Backlog

### Priority 1: Highest Revenue / Lowest Friction

- [x] **Order Confirmation via WhatsApp**
  - Send an instant WhatsApp confirmation after guest checkout with order number, summary, and tracking link.
  - Reuse existing tenant WhatsApp settings where available.
  - Add fallback to SMS/email-style notification if WhatsApp is not configured.
  - Implemented: guest checkout now requests WhatsApp confirmation by default and the invoice API falls back for legacy payloads (`customer` and `online`).

- [x] **Coupon Field in Cart**
  - Add a visible coupon input inside the cart page before checkout.
  - Validate the coupon before order submission and show the discount impact in totals.
  - Surface coupon errors clearly without blocking cart editing.
  - Implemented: storefront cart now validates coupons publicly, keeps the applied coupon between cart and checkout, and the invoice service records the discount on the final order.

- [x] **Buy Now Flow**
  - Add a dedicated `Buy Now` CTA on product cards and product details.
  - Skip the cart and go directly to checkout with the selected product when appropriate.
  - Preserve support for variants by routing to product details first if product options are required.
  - Implemented: product cards, home recommendations, and product details can now send a single item directly to checkout while variant-based products still route to product details first.

- [x] **Guest Autofill**
  - Save guest checkout name, phone, email, and address locally after a successful order.
  - Prefill guest checkout fields on the next visit.
  - Provide a lightweight clear/reset action for privacy.
  - Implemented: guest checkout now saves the latest delivery details in local storage, prefills them on the next visit, and exposes a clear-data action in the checkout notice.

- [x] **Smart Cart Nudges**
  - Show progress toward free shipping and/or minimum discount thresholds.
  - Suggest one low-friction add-on product in the cart.
  - Keep the copy concise and commercial, not intrusive.
  - Implemented: storefront cart now shows progress toward the free-shipping threshold, highlights estimated shipping savings, and suggests one in-stock add-on product that can be added directly from the cart.

### Priority 2: Conversion Uplift

- [x] **Cross-sell / Frequently Bought Together**
  - Add related product blocks on product details and optionally inside cart.
  - Prefer same-category or manually curated add-ons first.
  - Track clicks and add-to-cart from suggested items.
  - Implemented: product details now prioritizes same-category / close-fit suggestions, shows a quick add CTA on each suggested card, and logs clicks/adds locally for lightweight storefront tracking.

- [x] **Shipping Cost + ETA Preview**
  - Let the customer pick governorate/region before final checkout.
  - Show estimated shipping cost and delivery window before order confirmation.
  - Reflect the chosen region in the checkout summary.
  - Implemented: storefront checkout now requires the customer to choose a governorate, shows a shipping quote + delivery ETA before payment, and passes the selected governorate/city in the shipping address payload.

- [x] **Stronger Reviews Section**
  - Surface recent verified reviews more prominently.
  - Support richer review signals like customer images, top comments, and “most helpful”.
  - Highlight trust-focused snippets near the primary CTA.

  - Implemented: product details now sorts reviews by recency, highlights standout recent comments, and surfaces trust signals like the latest review date plus the most-mentioned review theme.

- [x] **Back-in-Stock Alerts**
  - Let customers register interest when a product is out of stock.
  - Support WhatsApp, phone, or email capture depending on available channels.
  - Add admin visibility later for pending alert demand.

  - Implemented: storefront product details now lets out-of-stock shoppers leave an email or phone number without logging in, the subscription route is publicly tenant-scoped, and pending alerts are processed automatically once the product returns to stock.

- [x] **Bundles / Volume Offers**
  - Add “buy 2 save more” and bundle pricing support for compatible products.
  - Display bundle savings clearly on product cards/details.
  - Ensure discount math is reflected in cart and checkout.

  - Implemented: storefront now advertises automatic 2+ / 3+ quantity discounts on catalog cards and product details, while cart, checkout, and invoice creation all apply the same online-store volume discount math.

### Priority 3: Merchandising / Growth

- [x] **Dedicated Landing Pages**
  - Add structured landing pages for seasonal offers, best sellers, installment products, and campaign links.
  - Reuse existing storefront sections/components where possible.
  - Make each landing page trackable by campaign source.

  - Implemented: the storefront now exposes dedicated landing pages for seasonal offers, best sellers, installment-friendly picks, and campaign traffic, surfaces them from the home page and main navigation, and records landing-page visits locally with the current campaign source for later review.

- [x] **Trust Signal Enhancements**
  - Add real-time trust copy like sales count, latest order activity, guarantees, and delivery confidence.
  - Keep claims data-backed to avoid fake urgency.
  - Test placement near hero, product price, and checkout summary.

  - Implemented: the storefront hero, product details CTA, and checkout summary now surface live availability, review-backed confidence, delivery timing, and guest-checkout clarity using the currently loaded product and cart data.

- [x] **Smarter Search**
  - Add typeahead suggestions, typo tolerance, and stronger product/category matching.
  - Consider highlighting popular searches or trending products.
  - Keep search fast on mobile and low bandwidth.

  - Implemented: storefront search now uses ranked fuzzy matching for name/category/SKU lookups, shows quick typeahead suggestions and category chips in both catalog and header search, and the public products API now matches additional product fields like description, tags, and barcode.

- [x] **Campaign Attribution**
  - Capture `utm_*` parameters and campaign sources through the storefront journey.
  - Attach source data to orders for later reporting.
  - Allow campaign-specific banners or promo messaging.

  - Implemented: the storefront now captures `utm_*`, click IDs, referral sources, and optional campaign messaging in local storage, shows a lightweight campaign banner during browsing/checkout, and attaches the attribution payload to online-store invoices for later reporting.

- [x] **Storefront Funnel Analytics**
  - Track product view, add-to-cart, cart view, checkout start, and order completion.
  - Identify drop-off points for guest checkout specifically.
  - Keep instrumentation simple enough to expand later.

  - Implemented: storefront pages now log product views, add-to-cart actions, cart views, checkout starts, and completed orders into a lightweight local funnel tracker, which also maintains guest drop-off estimates between browsing intent, checkout start, and completed orders.

### Execution Notes

- Work through Priority 1 in order unless blocked by backend/API gaps.
- Prefer changes that improve guest checkout before adding account-centric features.
- Reuse existing modules in `frontend/src/storefront`, `frontend/src/store/commerceStore.js`, and tenant notification settings before introducing new systems.
- After each completed task, update this file with implementation notes and verification steps.
