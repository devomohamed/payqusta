import { useEffect } from 'react';
import { useUnsavedChangesStore } from '../store/unsavedChangesStore';

/**
 * Hook to handle unsaved changes warning.
 * Triggers browser "beforeunload" prompt and updates global store.
 * 
 * @param {boolean} isDirty - Whether current page has unsaved changes
 * @param {string} pageId - Unique ID for this page (e.g., 'products', 'stocktake')
 */
export function useUnsavedWarning(isDirty, pageId) {
    const setDirty = useUnsavedChangesStore((state) => state.setDirty);

    // Sync with global store
    useEffect(() => {
        setDirty(pageId, isDirty);
        // Cleanup on unmount: mark as not dirty for this page
        return () => setDirty(pageId, false);
    }, [isDirty, pageId, setDirty]);

    // Handle browser tab/window close
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isDirty) {
                // Standard way to trigger browser prompt
                e.preventDefault();
                e.returnValue = ''; // Required for Chrome
                return '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);
}
