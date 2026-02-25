/**
 * ERP AC Storage Utility
 * Handles persistent data using LocalStorage (Cache) and Supabase (Cloud)
 */

window.STORAGE_KEYS = {
    PRODUCTS: 'products',
    SALES: 'sales',
    CLIENTS: 'clients',
    EXPENSES: 'expenses',
    ACCOUNTS: 'accounts',
    MOVEMENTS: 'movements',
    RECURRING_EXPENSES: 'recurring_expenses',
    CASH_CLOSINGS: 'cash_closings',
    TRANSIT_ORDERS: 'transit_orders',
    CONFIG: 'config',
    PAYMENTS: 'payments' // Added for consistency
};

// Map storage keys to Supabase table names
const TABLE_MAP = {
    [STORAGE_KEYS.PRODUCTS]: 'products',
    [STORAGE_KEYS.SALES]: 'sales',
    [STORAGE_KEYS.CLIENTS]: 'clients',
    [STORAGE_KEYS.EXPENSES]: 'expenses',
    [STORAGE_KEYS.ACCOUNTS]: 'accounts',
    [STORAGE_KEYS.MOVEMENTS]: 'movements',
    [STORAGE_KEYS.RECURRING_EXPENSES]: 'recurring_expenses',
    [STORAGE_KEYS.CASH_CLOSINGS]: 'cash_closings',
    [STORAGE_KEYS.PAYMENTS]: 'payments',
    [STORAGE_KEYS.TRANSIT_ORDERS]: 'transit_orders'
};

window.Storage = {
    cache: {},
    isConnected: false,

    /**
     * Initial Load: Fetches all data from Supabase into memory
     */
    async init() {
        console.log('--- STORAGE: INITIALIZING (V65) ---');
        const keys = Object.values(STORAGE_KEYS);
        const supabase = window.supabaseClient;

        // Reset connection status
        this.updateStatus(!!supabase);

        for (const key of keys) {
            const table = TABLE_MAP[key];

            // 1. Always load local first for speed
            const localData = localStorage.getItem(`erp_${key}`);
            this.cache[key] = localData ? JSON.parse(localData) : [];

            // 2. Try to sync with cloud if available
            if (table && supabase) {
                try {
                    const { data, error } = await supabase.from(table).select('*').limit(1000);
                    if (!error && data) {
                        this.cache[key] = data;
                        localStorage.setItem(`erp_${key}`, JSON.stringify(data));
                        console.log(`Cloud Sync: ${table} (${data.length} items)`);
                        this.updateStatus(true);
                    } else if (error) {
                        console.warn(`Cloud Sync Error (${table}):`, error.message);
                    }
                } catch (err) {
                    console.warn(`Sync failed for ${table}:`, err.message);
                }
            }
        }

        // 3. Auto-Migration check
        if (supabase) {
            this.migrateLocalToCloud();
        }

        return true;
    },

    async migrateLocalToCloud() {
        const supabase = window.supabaseClient;
        if (!supabase) return;

        window.ERP_LOG('Verificando datos para migración a la nube...');

        for (const [key, table] of Object.entries(TABLE_MAP)) {
            const localData = this.cache[key] || [];
            if (localData.length === 0) continue;

            try {
                // Check if cloud has data for this table
                const { count, error: countError } = await supabase
                    .from(table)
                    .select('*', { count: 'exact', head: true });

                if (countError) throw countError;

                // Simple logic: if cloud is empty but local has data, push all
                if (count === 0) {
                    window.ERP_LOG(`Migrando ${localData.length} items de ${table}...`);
                    const { error: insError } = await supabase.from(table).insert(localData);
                    if (insError) throw insError;
                    window.ERP_LOG(`Migración de ${table} exitosa`, 'success');
                } else {
                    // If cloud has data, we assume migration already happened or cloud is master
                    // In a more complex setup, we'd do a delta sync
                    console.log(`Cloud table ${table} already has data, skipping bulk migration.`);
                }
            } catch (err) {
                console.warn(`Error migrando ${table}:`, err.message);
            }
        }
    },

    updateStatus(status) {
        this.isConnected = status;
        const indicator = document.getElementById('supabase-status');
        if (indicator) {
            indicator.style.color = status ? '#10b981' : '#ef4444';
            indicator.title = status ? 'Conectado a Supabase' : 'Modo Offline (Sin conexión)';
        }
    },

    save(key, data) {
        this.cache[key] = data;
        localStorage.setItem(`erp_${key}`, JSON.stringify(data));
    },

    get(key) {
        return this.cache[key] || [];
    },

    getById(key, id) {
        const items = this.get(key);
        return items.find(item => item.id === id);
    },

    /**
     * ADD ITEM: STRICTLY OFFLINE-FIRST
     */
    async addItem(key, item) {
        const table = TABLE_MAP[key];
        const supabase = window.supabaseClient;

        const newItem = {
            ...item,
            id: item.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'erp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)),
            createdAt: new Date().toISOString()
        };

        // 1. UPDATE CACHE & LOCALSTORAGE INSTANTLY
        if (!this.cache[key]) this.cache[key] = [];
        this.cache[key].push(newItem);
        localStorage.setItem(`erp_${key}`, JSON.stringify(this.cache[key]));

        // 2. BACKGROUND SYNC (NO AWAIT)
        if (table && supabase) {
            console.log(`Syncing ${table} in background...`);
            supabase.from(table).insert(newItem)
                .then(({ error }) => {
                    if (error) {
                        console.error(`Supabase Insert Error (${table}):`, error.message);
                        this.updateStatus(false);
                    } else {
                        console.log(`Supabase Sync Success (${table})`);
                        this.updateStatus(true);
                    }
                })
                .catch(err => {
                    console.error('Network Error during sync:', err);
                    this.updateStatus(false);
                });
        }

        return newItem;
    },

    /**
     * UPDATE ITEM: STRICTLY OFFLINE-FIRST
     */
    async updateItem(key, id, updatedData) {
        const table = TABLE_MAP[key];
        const supabase = window.supabaseClient;
        const items = this.get(key);
        const index = items.findIndex(item => item.id === id);

        if (index !== -1) {
            const finalItem = { ...items[index], ...updatedData, updatedAt: new Date().toISOString() };
            items[index] = finalItem;
            this.cache[key] = items;
            localStorage.setItem(`erp_${key}`, JSON.stringify(items));

            // Background Sync
            if (table && supabase) {
                supabase.from(table).update(updatedData).eq('id', id)
                    .then(({ error }) => {
                        if (error) {
                            console.error(`Supabase Update Error (${table}):`, error.message);
                            this.updateStatus(false);
                        } else {
                            this.updateStatus(true);
                        }
                    })
                    .catch(() => this.updateStatus(false));
            }
        }
        return items;
    },

    /**
     * DELETE ITEM: STRICTLY OFFLINE-FIRST
     */
    async deleteItem(key, id) {
        const table = TABLE_MAP[key];
        const supabase = window.supabaseClient;
        const items = this.get(key);
        const filtered = items.filter(item => item.id !== id);
        this.cache[key] = filtered;
        localStorage.setItem(`erp_${key}`, JSON.stringify(filtered));

        // Background Sync
        if (table && supabase) {
            supabase.from(table).delete().eq('id', id)
                .then(({ error }) => {
                    if (error) {
                        console.error(`Supabase Delete Error (${table}):`, error.message);
                        this.updateStatus(false);
                    } else {
                        this.updateStatus(true);
                    }
                })
                .catch(() => this.updateStatus(false));
        }

        return filtered;
    }
};
