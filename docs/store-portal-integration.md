# Store / Portal Integration Analysis

## Current context
- `frontend/src/portal` contains the customer portal UI: login, wallets, quotes, installments, support, gamification, notifications, documents, returns, wishlist, and the whole shopping + checkout flow through `PortalLayout`.
- `frontend/src/storefront` focuses on the public storefront: home hero, product catalog, cart, checkout, and layout components with more limited portal-specific bells and whistles.
- State hooks live in `frontend/src/store/portalStore.js` (Zustand) and `frontend/src/store/storefront*.js`. Most portal business data (wallet, tiers, notifications, documents, invoices, returns, support) is surfaced via `portalStore`.

## Portal feature set that should strengthen the storefront
1. **Customer dashboard kit** (`PortalHome.jsx`, `PortalProfile.jsx`, `PortalNotifications.jsx`): wallet summary, tier progress, points history, unread notifications, account support, documents, gamification badges, and links to invoices/orders.
2. **Order / invoice surfaces** (`PortalOrders`, `PortalInvoices`, `PortalStatement`, `PortalInstallmentCalculator`): full paginated views with filters/status chips, interactive cards, and toast/loader states tied to `portalStore.fetchOrders`, `fetchInvoices`, etc.
3. **Support + communication** (`PortalSupport.jsx`, `PortalSupportChat.jsx`): supportive cards with canned actions, streaming chat (notifications SSE via `/api/v1/notifications/stream`), and gratification (submit ticket, see replies).
4. **Administration helpers** (`PortalWishlist`, `PortalDocuments`, `PortalReturns`, `PortalAddresses`, `PortalProductDetails`): documents upload/download, return request, address book, wishlist persistence.
5. **Design/Branding assets**: hero gradients, premium badge, trust cards, high-contrast CTA buttons, dark/light-friendly cards, animated load states, and `Card`, `Badge`, `Button` UI primitives reused by both portal and storefront.

## Storefront capabilities today
- `StorefrontHome.jsx` currently fetches featured/new products, tenant settings, and renders hero + trust badges + categories + optional dashboard widgets when `customer` exists.
- Store data relies on `api` (axios wrapper) plus `portalStore` data (wallet/customer) for logged-in customers.
- The storefront routing (`storefrontPath`) works with product catalog pages, checkout, etc., but lacks the deeper portal experiences (wallet, documents, notifications, orders, support).

## Gap analysis and design opportunities
| Portal capability | Storefront status | Integration idea |
| --- | --- | --- |
| Wallet/credit/points widgets | Only basic wallet summary if `customer` exists | Borrow the `Card` + gradient layout from `PortalHome` to render a multi-tile premium dashboard on the storefront landing page (wallet progress, tier progress, pending installments). |
| Notifications stream | Not surfaced on storefront | Add a slim top banner or drawer that reads `portalStore.unreadCount`, triggers `fetchNotifications`, and includes the same SSE/long-polling hook the portal uses for `/notifications/stream`. |
| Orders/invoices/returns filtering | No quick links | Add CTA tiles linking to `/orders`, `/invoices`, `/returns` routes, reusing `PortalOrders`/`PortalInvoices` pages or a reorganized tab component (pull tasks from portal). |
| Support chat | Portal has chat + message center | Integrate a `SupportBubble` component into storefront footer/header that opens `PortalSupport` actions or the chat modal. |
| Documents & profiles | Portal profile page | Embed a `ProfileCard` showing document status on storefront customer zone and allow uploads (mirror `PortalDocuments`). |
| Gamification | Not surfaced | Show loyalty point meter and a CTA for `claimDailyReward` with the same streak logic from `PortalPointsHistory`. |

## Key integration tasks
1. **Sync `PortalHome` hero/trust layout into `StorefrontHome`** (files: `frontend/src/storefront/StorefrontHome.jsx`, `frontend/src/components/UI/*`).  Keep gradient hero, trust badges, CTA buttons, and extend the hero copy to mention portal features.  Use `Card`/`Badge` components so the styling stays consistent.
2. **Wire portal dashboard hooks to storefront**: ensure `StorefrontHome` calls `portalStore.fetchDashboard`, `fetchNotifications`, and `fetchPoints` when a customer is cached, and surface their data in retailer cards (wallet, tier, monthly installments).  Pull the progress bar styling from `PortalHome` for visual parity.
3. **Expose portal data panels** in the storefront layout: notifications count badge (linking to `PortalNotifications`), a persistent support action (copied from `PortalSupportChat`), and quick-action cards for invoices/orders/returns.  Use the same localized strings (see `frontend/src/i18n.js` for Arabic text).
4. **Surface documents/wishlist/addresses** from the portal on the storefront profile section (use `portalStore.fetchDocuments`, `fetchWishlist`, `fetchAddresses`).  Provide upload/download buttons similar to `PortalDocuments` to avoid duplication.
5. **Integrate support streaming**: reuse the SSE/`portalApi` notification stream from the portal to keep the storefront's toast system (`NotificationDropdown.jsx`) in sync. Tie errors (e.g., React error #31) to missing React key props when mapping portal data (the logged runtime error mentions rendering an object with keys `{ _id, name, icon }`, so ensure each mapped portal feature has a `key={item._id}` or stable ID).
6. **Create a task board** (tracking doc or `docs/portal-store-tasks.md`) summarizing each frontend/backlog change, describing API contracts (endpoints from `docs/api-inventory.md`), and deadlines so we can execute the merge in phases (hero/notifications first, then wallet/orders, then support/documents).

## Risks / open questions
- The React error (#31) indicates a child list changing type; check `PortalProducts` or `StorefrontHome` sections where components return arrays of plain objects without `key`.  Fixing this during integration will prevent runtime crashes when portal data renders on the storefront.
- Need to confirm which portal routes should stay under `/portal` vs. the storefront.  Decide whether to reuse the portal layout for document uploads or create new storefront-specific pages that call the same `portalStore` actions.

Use this analysis as the single source for scoping the merge. Next step: prioritize task #1 (hero + dashboard) and track progress in an explicit checklist in `docs/portal-store-tasks.md`.
