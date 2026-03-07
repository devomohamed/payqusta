import { create } from 'zustand';

/**
 * Store to track unsaved changes across different pages/components.
 * Allows App.jsx or other high-level components to check if any part of the app is "dirty".
 */
export const useUnsavedChangesStore = create((set, get) => ({
    // Map of pageId -> boolean (isDirty)
    dirtyStates: {},

    /**
     * Update the dirty status for a specific page or form.
     * @param {string} pageId - Unique identifier for the page/component
     * @param {boolean} isDirty - Whether there are unsaved changes
     */
    setDirty: (pageId, isDirty) => {
        set((state) => ({
            dirtyStates: {
                ...state.dirtyStates,
                [pageId]: isDirty,
            },
        }));
    },

    /**
     * Clear all dirty states (e.g., on logout or global reset)
     */
    clearAll: () => set({ dirtyStates: {} }),

    /**
     * Selector: Check if any tracking page currently has unsaved changes.
     */
    isAnythingDirty: () => {
        const states = get().dirtyStates;
        return Object.values(states).some((dirty) => dirty === true);
    },
}));
