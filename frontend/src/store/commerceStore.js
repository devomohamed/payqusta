import { usePortalStore } from './portalStore';

/**
 * Commerce store exposes the shared cart / wishlist / notification surface for storefront UI.
 * It currently re-uses the portal store behind the scenes so both worlds stay in sync.
 */
export const useCommerceStore = usePortalStore;
