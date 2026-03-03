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
