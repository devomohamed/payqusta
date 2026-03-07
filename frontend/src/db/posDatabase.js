import Dexie from 'dexie';

// Define the database and its schema
const db = new Dexie('PayQustaPOS');

// Declare tables with their indexes
db.version(1).stores({
    products: '_id, sku, barcode, name, category, price, stock.quantity',
    customers: '_id, phone, name, barcode, tier',
    pendingInvoices: '++id, customerId, totalAmount, createdAt, status', // Local auto-increment ID
    settings: 'key',
});

// Helper functions for POS operations

/**
 * Sync products from server to local IndexedDB
 * @param {Array} productsList 
 */
export const syncProductsToLocal = async (productsList) => {
    if (!productsList || !Array.isArray(productsList)) return;

    try {
        await db.products.clear();
        await db.products.bulkAdd(productsList);
        console.log(`[POS DB] Synced ${productsList.length} products`);
    } catch (error) {
        console.error('[POS DB] Failed to sync products:', error);
    }
};

/**
 * Sync customers from server to local IndexedDB
 * @param {Array} customersList 
 */
export const syncCustomersToLocal = async (customersList) => {
    if (!customersList || !Array.isArray(customersList)) return;

    try {
        await db.customers.clear();
        await db.customers.bulkAdd(customersList);
        console.log(`[POS DB] Synced ${customersList.length} customers`);
    } catch (error) {
        console.error('[POS DB] Failed to sync customers:', error);
    }
};

/**
 * Search local products by name, sku, or barcode
 */
export const searchLocalProducts = async (term) => {
    if (!term) return await db.products.limit(50).toArray();

    const lowerTerm = term.toLowerCase();
    return await db.products.filter(p => {
        return (
            (p.name && p.name.toLowerCase().includes(lowerTerm)) ||
            (p.sku && p.sku.toLowerCase().includes(lowerTerm)) ||
            (p.barcode && p.barcode.includes(term))
        );
    }).limit(50).toArray();
};

/**
 * Search local customers by name or phone
 */
export const searchLocalCustomers = async (term) => {
    if (!term) return await db.customers.limit(50).toArray();

    const lowerTerm = term.toLowerCase();
    return await db.customers.filter(c => {
        return (
            (c.name && c.name.toLowerCase().includes(lowerTerm)) ||
            (c.phone && c.phone.includes(term))
        );
    }).limit(50).toArray();
};

/**
 * Save an invoice locally when offline
 */
export const savePendingInvoice = async (invoiceData) => {
    try {
        const id = await db.pendingInvoices.add({
            ...invoiceData,
            createdAt: new Date().toISOString(),
            status: 'pending_sync'
        });
        console.log(`[POS DB] Saved pending invoice local ID: ${id}`);
        return id;
    } catch (error) {
        console.error('[POS DB] Failed to save pending invoice:', error);
        throw error;
    }
};

/**
 * Get all pending invoices that need to be synced
 */
export const getPendingInvoices = async () => {
    return await db.pendingInvoices.toArray();
};

/**
 * Remove an invoice from local DB after successful sync
 */
export const removePendingInvoice = async (id) => {
    await db.pendingInvoices.delete(id);
};

export default db;
