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
    /**
     * Initial Load: Loads local cache first (instant) and syncs critical tables in background
     */
    async init() {
        console.log('--- STORAGE: INITIALIZING (V106) ---');
        const keys = Object.values(STORAGE_KEYS);
        const supabase = window.supabaseAdminClient || window.supabaseClient;

        // Reset connection status
        this.updateStatus(!!supabase);

        // 1. Immediately load local cache into memory (instant load)
        for (const key of keys) {
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
        }

        // Notify that local cache is loaded and ERP UI can render immediately!
        window.dispatchEvent(new CustomEvent('erp_storage_ready'));

        // 2. Sync critical tables in the background (asynchronous, does not block page load)
        if (supabase) {
            // Initial sync
            setTimeout(async () => {
                await this.syncCriticalTables();
                // Check migration once in background
                this.migrateLocalToCloud();
            }, 500); // 500ms delay to prioritize UI load

            // Periodic background sync every 30 seconds (Delta Sync)
            setInterval(async () => {
                await this.syncCriticalTables();
            }, 30000);
        }

        return true;
    },

    async syncCriticalTables() {
        const criticalKeys = [
            window.STORAGE_KEYS.PRODUCTS,
            window.STORAGE_KEYS.SALES,
            window.STORAGE_KEYS.CLIENTS,
            window.STORAGE_KEYS.ACCOUNTS
        ];
        for (const key of criticalKeys) {
            try {
                await this.syncTable(key);
            } catch (err) {
                console.warn(`Background delta sync failed for ${key}:`, err.message);
            }
        }
    },

    /**
     * Delta Sync: Fetches only new/modified records from Supabase since the last local update
     */
    async syncTable(key) {
        const table = TABLE_MAP[key];
        const supabase = window.supabaseAdminClient || window.supabaseClient;
        if (!table || !supabase) return;

        const storageKey = `erp_${key}`;
        const localItems = this.cache[key] || [];

        // Determine if this table should use full overwrite instead of delta sync
        const isFullSyncTable = key === STORAGE_KEYS.CLIENTS || 
                                key === STORAGE_KEYS.ACCOUNTS || 
                                key === STORAGE_KEYS.SELLERS ||
                                key === STORAGE_KEYS.PRODUCTS;

        // Find the latest timestamp from local data (only if not doing a full sync)
        let latestTimestamp = null;
        if (!isFullSyncTable) {
            for (const item of localItems) {
                const ts = item.updatedAt || item.createdAt || item.date;
                if (ts) {
                    if (!latestTimestamp || new Date(ts) > new Date(latestTimestamp)) {
                        latestTimestamp = ts;
                    }
                }
            }
        }

        try {
            let query = supabase.from(table).select('*').limit(1000);

            // If we have a local latest timestamp, perform a delta sync query
            if (latestTimestamp) {
                // Determine whether to filter by updatedAt or createdAt based on schema
                const hasUpdatedAt = localItems.some(i => 'updatedAt' in i);
                const filterCol = hasUpdatedAt ? 'updatedAt' : (localItems.some(i => 'createdAt' in i) ? 'createdAt' : 'date');
                
                // Fetch items modified/created strictly after our latest local timestamp
                query = query.gt(filterCol, latestTimestamp);
            }

            const { data, error } = await query;
            if (error) throw error;

            if (data) {
                let finalItems = null;

                if (isFullSyncTable) {
                    // For full sync tables, completely overwrite local cache to handle updates and deletions correctly
                    finalItems = data;
                    console.log(`Cloud Full Sync: ${table} (Downloaded ${data.length} items)`);
                } else if (data.length > 0) {
                    // For delta sync tables, merge updates
                    console.log(`Cloud Delta Sync: ${table} (Downloaded ${data.length} new/modified items)`);
                    const merged = [...localItems];
                    for (const newItem of data) {
                        const idx = merged.findIndex(item => item.id === newItem.id);
                        if (idx !== -1) {
                            merged[idx] = newItem; // Update existing
                        } else {
                            merged.unshift(newItem); // Insert new
                        }
                    }
                    finalItems = merged;
                } else {
                    console.log(`Cloud Delta Sync: ${table} (Already up to date)`);
                }

                if (finalItems !== null) {
                    // Update cache and localStorage
                    this.cache[key] = finalItems;
                    localStorage.setItem(storageKey, JSON.stringify(finalItems));

                    // Dispatch event indicating this specific table has updated
                    window.dispatchEvent(new CustomEvent(`erp_table_updated_${key}`, { detail: data }));
                }
            }
            this.updateStatus(true);
        } catch (err) {
            console.warn(`Sync failed for ${table}:`, err.message);
            this.updateStatus(false);
            throw err;
        }
    },

    async migrateLocalToCloud() {
        const supabase = window.supabaseAdminClient || window.supabaseClient;
        if (!supabase) return;

        // Check if migration already completed to avoid redundant checks
        if (localStorage.getItem('erp_migration_completed') === 'true') {
            return;
        }

        window.ERP_LOG('Verificando datos para migración a la nube...');
        let allCompleted = true;

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
                    console.log(`Cloud table ${table} already has data, skipping bulk migration.`);
                }
            } catch (err) {
                console.warn(`Error migrando ${table}:`, err.message);
                allCompleted = false;
            }
        }

        if (allCompleted) {
            localStorage.setItem('erp_migration_completed', 'true');
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
     * Get the latest values for specific fields of a row directly from Supabase (bypasses cache)
     */
    async getLatestFields(key, id, fieldsArray) {
        const table = TABLE_MAP[key];
        const supabase = window.supabaseAdminClient || window.supabaseClient;
        if (table && supabase) {
            try {
                const { data, error } = await supabase
                    .from(table)
                    .select(fieldsArray.join(','))
                    .eq('id', id)
                    .single();
                if (error) throw error;
                return data;
            } catch (err) {
                console.warn(`Could not fetch latest fields from cloud for ${table}:`, err.message);
            }
        }
        return null;
    },

    /**
     * ADD ITEM: CLOUD-FIRST (Awaits network response)
     */
    async addItem(key, item) {
        const table = TABLE_MAP[key];
        const supabase = window.supabaseAdminClient || window.supabaseClient;

        const newItem = {
            ...item,
            id: item.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'erp-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)),
            createdAt: new Date().toISOString()
        };

        // Auto-Limbo Trigger
        if (key === STORAGE_KEYS.PRODUCTS) {
            const stockM = parseInt(newItem.stockMillenio) || 0;
            const stockV = parseInt(newItem.stockVulcano) || 0;
            const totalStock = stockM + stockV;
            if (totalStock <= 0) {
                newItem.active = false;
            } else if (newItem.active === undefined) {
                newItem.active = true;
            }
        }

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
        const supabase = window.supabaseAdminClient || window.supabaseClient;
        const items = this.get(key);
        const index = items.findIndex(item => item.id === id);

        if (index !== -1) {
            // Auto-Limbo Trigger
            if (key === STORAGE_KEYS.PRODUCTS) {
                const existing = items[index];
                const oldStock = (parseInt(existing.stockMillenio) || 0) + (parseInt(existing.stockVulcano) || 0);
                const newStockM = updatedData.stockMillenio !== undefined ? (parseInt(updatedData.stockMillenio) || 0) : (parseInt(existing.stockMillenio) || 0);
                const newStockV = updatedData.stockVulcano !== undefined ? (parseInt(updatedData.stockVulcano) || 0) : (parseInt(existing.stockVulcano) || 0);
                const newStock = newStockM + newStockV;

                if (newStock <= 0 && oldStock > 0) {
                    updatedData.active = false;
                } else if (newStock > 0 && oldStock <= 0) {
                    updatedData.active = true;
                }
            }

            updatedData.updatedAt = new Date().toISOString();
            const finalItem = { ...items[index], ...updatedData };

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
        const supabase = window.supabaseAdminClient || window.supabaseClient;
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