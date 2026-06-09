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
    PAYMENTS: 'payments', // Added for consistency
    SELLERS: 'sellers',
    TUCOMPRAS_SALES: 'tucompras_sales',
    CAMPAIGNS: 'campaigns',
    TUCOMPRAS_CUSTOMERS: 'tucompras_customers',
    STOCK_ENTRIES: 'stock_entries'
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
    [STORAGE_KEYS.TRANSIT_ORDERS]: 'transit_orders',
    [STORAGE_KEYS.SELLERS]: 'sellers',
    [STORAGE_KEYS.TUCOMPRAS_SALES]: 'tucompras_sales',
    [STORAGE_KEYS.CAMPAIGNS]: 'campaigns',
    [STORAGE_KEYS.TUCOMPRAS_CUSTOMERS]: 'tucompras_customers',
    [STORAGE_KEYS.STOCK_ENTRIES]: 'stock_entries'
};

window.Storage = {
    cache: {},
    isConnected: false,

    /**
     * Initial Load: Fetches all data from Supabase into memory
     */
    async init() {
        console.log('--- STORAGE: INITIALIZING (V105) ---');
        const keys = Object.values(STORAGE_KEYS);
        const supabase = window.supabaseClient;

        // Reset connection status
        this.updateStatus(!!supabase);

        // Parallelize loading and syncing for speed
        const syncPromises = keys.map(async (key) => {
            const table = TABLE_MAP[key];

            // 1. Always load local first for speed
            const storageKey = `erp_${key}`;
            const localData = localStorage.getItem(storageKey);
            this.cache[key] = [];
            
            if (localData && localData !== 'undefined' && localData !== 'null') {
                try {
                    this.cache[key] = JSON.parse(localData);
                } catch (e) {
                    console.warn(`Corruption in ${key}, resetting local cache.`);
                    localStorage.removeItem(storageKey);
                }
            }

            // 2. Try to sync with cloud if available
            if (table && supabase) {
                try {
                    const { data, error } = await supabase.from(table).select('*').limit(1000);
                    if (!error && data) {
                        // Only overwrite local if cloud has data
                        if (data.length > 0) {
                            this.cache[key] = data;
                            try {
                                localStorage.setItem(storageKey, JSON.stringify(data));
                            } catch (e) {
                                console.warn(`Could not persist ${key} to LocalStorage:`, e.message);
                            }
                            console.log(`Cloud Sync: ${table} (${data.length} items loaded)`);
                        } else {
                            console.log(`Cloud Table ${table} is empty. Preserving local data.`);
                        }
                        this.updateStatus(true);
                    } else if (error) {
                        console.warn(`Cloud Sync Error (${table}):`, error.message);
                    }
                } catch (err) {
                    console.warn(`Sync failed for ${table}:`, err.message);
                }
            }
        });

        await Promise.all(syncPromises);

        // 3. Auto-Migration check
        if (supabase) {
            this.migrateLocalToCloud();
        }

        // Notify that sync is complete
        window.dispatchEvent(new CustomEvent('erp_storage_ready'));
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
        try {
            localStorage.setItem(`erp_${key}`, JSON.stringify(data));
        } catch (e) {
            console.warn(`LocalStorage Full: Could not save ${key} locally.`);
        }
    },

    get(key) {
        return this.cache[key] || [];
    },

    getById(key, id) {
        const items = this.get(key);
        return items.find(item => item.id === id);
    },

    /**
     * ADD ITEM: CLOUD-FIRST (Awaits network response)
     */
    async addItem(key, item) {
        const table = TABLE_MAP[key];
        const supabase = window.supabaseClient;

        const newItem = {
            ...item,
            id: item.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'erp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)),
            createdAt: new Date().toISOString()
        };

        // 1. CLOUD SYNC STRICT AWAIT (Fails if network/API errors occur)
        if (table && supabase) {
            console.log(`Syncing ${table} to Cloud...`);
            const { error } = await supabase.from(table).insert(newItem);
            
            if (error) {
                console.error(`Supabase Insert Error (${table}):`, error.message);
                this.updateStatus(false);
                if (window.ERP_LOG) window.ERP_LOG(`Error Nube (${table}): ${error.message}`, 'error');
                throw new Error(`Refusado por el Servidor (Nube): ${error.message}`);
            } else {
                console.log(`Supabase Sync Success (${table})`);
                this.updateStatus(true);
            }
        }

        // 2. UPDATE CACHE & LOCALSTORAGE ONLY ON SUCCESS
        // Always update memory first
        if (!this.cache[key]) this.cache[key] = [];
        this.cache[key].unshift(newItem);
        
        // Try persisting to LocalStorage, but don't fail if it's full
        try {
            localStorage.setItem(`erp_${key}`, JSON.stringify(this.cache[key]));
        } catch (e) {
            console.warn(`LocalStorage Full: Could not save ${key} locally, data exists in Cloud and Memory.`);
        }

        return newItem;
    },

    /**
     * UPDATE ITEM: CLOUD-FIRST
     */
    async updateItem(key, id, updatedData) {
        const table = TABLE_MAP[key];
        const supabase = window.supabaseClient;
        const items = this.get(key);
        const index = items.findIndex(item => item.id === id);

        if (index !== -1) {
            const finalItem = { ...items[index], ...updatedData, updatedAt: new Date().toISOString() };

            // Cloud Sync Await
            if (table && supabase) {
                const { error } = await supabase.from(table).update(updatedData).eq('id', id);
                if (error) {
                    console.error(`Supabase Update Error (${table}):`, error.message);
                    this.updateStatus(false);
                    if (window.ERP_LOG) window.ERP_LOG(`Error Nube (${table}): ${error.message}`, 'error');
                    throw new Error(`Refusado por el Servidor (Nube): ${error.message}`);
                } else {
                    this.updateStatus(true);
                }
            }

            // Local Update
            items[index] = finalItem;
            this.cache[key] = items;
            try {
                localStorage.setItem(`erp_${key}`, JSON.stringify(items));
            } catch (e) {
                console.warn(`LocalStorage Full: Could not update ${key} locally.`);
            }
        }
        return items;
    },

    /**
     * DELETE ITEM: CLOUD-FIRST
     */
    async deleteItem(key, id) {
        const table = TABLE_MAP[key];
        const supabase = window.supabaseClient;
        const items = this.get(key);
        
        // Cloud Sync Await
        if (table && supabase) {
            const { error } = await supabase.from(table).delete().eq('id', id);
            if (error) {
                console.error(`Supabase Delete Error (${table}):`, error.message);
                this.updateStatus(false);
                if (window.ERP_LOG) window.ERP_LOG(`Error Nube (${table}): ${error.message}`, 'error');
                throw new Error(`Refusado por el Servidor (Nube): ${error.message}`);
            } else {
                this.updateStatus(true);
            }
        }

        const filtered = items.filter(item => item.id !== id);
        this.cache[key] = filtered;
        try {
            localStorage.setItem(`erp_${key}`, JSON.stringify(filtered));
        } catch (e) {
            console.warn(`LocalStorage Full: Could not delete ${key} locally.`);
        }

        return filtered;
    }
};
