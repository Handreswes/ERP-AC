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
    STOCK_ENTRIES: 'stock_entries',
    USERS: 'users'
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
    [STORAGE_KEYS.STOCK_ENTRIES]: 'stock_entries',
    [STORAGE_KEYS.USERS]: 'users'
};

window.Storage = {
    cache: {},
    isConnected: false,

    /**
     * Deterministic sorter for entities and transactions across the ERP.
     * Prevents list jumping caused by Supabase/PostgreSQL heap rewrites.
     */
    sortCollection(key, items) {
        if (!Array.isArray(items) || items.length <= 1) return items || [];
        const strCompare = (a, b) => (a || '').toString().localeCompare((b || '').toString(), 'es', { sensitivity: 'base', numeric: true });
        const dateCompareDesc = (a, b) => {
            const dateA = new Date(a || 0).getTime();
            const dateB = new Date(b || 0).getTime();
            return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
        };

        switch (key) {
            case STORAGE_KEYS.PRODUCTS:
                return [...items].sort((a, b) => strCompare(a.name, b.name));
            case STORAGE_KEYS.CLIENTS:
                return [...items].sort((a, b) => strCompare(a.name, b.name));
            case STORAGE_KEYS.SELLERS:
                return [...items].sort((a, b) => strCompare(a.name, b.name));
            case STORAGE_KEYS.TUCOMPRAS_CUSTOMERS:
                return [...items].sort((a, b) => strCompare(a.name, b.name));
            case STORAGE_KEYS.USERS:
                return [...items].sort((a, b) => strCompare(a.username || a.name, b.username || b.name));
            case STORAGE_KEYS.ACCOUNTS:
                return [...items].sort((a, b) => {
                    const c = strCompare(a.company, b.company);
                    return c !== 0 ? c : strCompare(a.name, b.name);
                });
            case STORAGE_KEYS.SALES:
            case STORAGE_KEYS.TUCOMPRAS_SALES:
            case STORAGE_KEYS.PAYMENTS:
            case STORAGE_KEYS.EXPENSES:
            case STORAGE_KEYS.STOCK_ENTRIES:
            case STORAGE_KEYS.TRANSIT_ORDERS:
            case STORAGE_KEYS.MOVEMENTS:
            case STORAGE_KEYS.CASH_CLOSINGS:
                return [...items].sort((a, b) => dateCompareDesc(a.date || a.createdAt, b.date || b.createdAt));
            default:
                return items;
        }
    },

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
                    this.cache[key] = this.sortCollection(key, JSON.parse(localData));
                } catch (e) {
                    console.warn(`Corruption in ${key}, resetting local cache.`);
                    localStorage.removeItem(storageKey);
                }
            }
        }

        // Notify that local cache is loaded and ERP UI can render immediately!
        window.dispatchEvent(new CustomEvent('erp_storage_ready'));

        // 2. Sync critical tables in the background (smart visibility-aware polling)
        if (supabase) {
            // Initial sync
            setTimeout(async () => {
                await this.syncCriticalTables();
                // Check migration once in background
                this.migrateLocalToCloud();
                // Initialize real-time WebSocket listeners
                this.initRealtime();
            }, 500); // 500ms delay to prioritize UI load

            // Periodic background sync every 30 minutes, ONLY if tab is active (saves Disk IO on Supabase)
            const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
            setInterval(async () => {
                if (typeof document !== 'undefined' && document.hidden) return; // Skip if tab is hidden/minimized
                await this.syncCriticalTables();
            }, SYNC_INTERVAL_MS);

            // Sync on tab focus with a cooldown (minimum 15 minutes between focus syncs)
            let lastFocusSync = Date.now();
            if (typeof document !== 'undefined') {
                document.addEventListener('visibilitychange', () => {
                    if (!document.hidden) {
                        const now = Date.now();
                        if (now - lastFocusSync >= 15 * 60 * 1000) {
                            lastFocusSync = now;
                            this.syncCriticalTables();
                        }
                    }
                });
            }
        }

        return true;
    },

    async syncCriticalTables() {
        const criticalKeys = [
            window.STORAGE_KEYS.PRODUCTS,
            window.STORAGE_KEYS.SALES,
            window.STORAGE_KEYS.CLIENTS,
            window.STORAGE_KEYS.ACCOUNTS,
            window.STORAGE_KEYS.PAYMENTS,
            window.STORAGE_KEYS.STOCK_ENTRIES,
            window.STORAGE_KEYS.SELLERS,
            window.STORAGE_KEYS.TUCOMPRAS_SALES,
            window.STORAGE_KEYS.TUCOMPRAS_CUSTOMERS,
            window.STORAGE_KEYS.EXPENSES,
            window.STORAGE_KEYS.MOVEMENTS
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
     * Supabase Realtime Listener (Instant multi-user sync with ZERO Disk IO)
     */
    initRealtime() {
        const supabase = window.supabaseAdminClient || window.supabaseClient;
        if (!supabase || typeof supabase.channel !== 'function') return;

        try {
            console.log('--- STORAGE: INITIALIZING REALTIME LISTENERS ---');
            const channel = supabase.channel('erp_live_sync');

            const tablesToWatch = [
                { table: 'sales', key: window.STORAGE_KEYS.SALES },
                { table: 'payments', key: window.STORAGE_KEYS.PAYMENTS },
                { table: 'clients', key: window.STORAGE_KEYS.CLIENTS },
                { table: 'products', key: window.STORAGE_KEYS.PRODUCTS },
                { table: 'accounts', key: window.STORAGE_KEYS.ACCOUNTS },
                { table: 'expenses', key: window.STORAGE_KEYS.EXPENSES },
                { table: 'movements', key: window.STORAGE_KEYS.MOVEMENTS },
                { table: 'orders', key: 'orders' }
            ];

            tablesToWatch.forEach(({ table, key }) => {
                channel.on('postgres_changes', { event: '*', schema: 'public', table: table }, (payload) => {
                    console.log(`[Realtime Event] ${table}:`, payload.eventType, payload.new || payload.old);
                    this.handleRealtimeEvent(table, key, payload);
                });
            });

            channel.subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Supabase Realtime: Conectado y escuchando cambios en vivo');
                } else if (err) {
                    console.warn('Realtime subscription issue:', status, err);
                }
            });
        } catch (e) {
            console.warn('Could not initialize Realtime:', e);
        }
    },

    handleRealtimeEvent(table, key, payload) {
        if (!key) return;

        // If it's orders, update logistics badge directly
        if (table === 'orders') {
            if (window.updateLogisticsBadge) window.updateLogisticsBadge();
            return;
        }

        const items = this.cache[key] || [];
        const storageKey = `erp_${key}`;

        if (payload.eventType === 'INSERT' && payload.new) {
            const newItem = payload.new;
            if (!items.some(i => i.id === newItem.id)) {
                items.unshift(newItem);
                const sorted = this.sortCollection(key, items);
                this.cache[key] = sorted;
                try { localStorage.setItem(storageKey, JSON.stringify(sorted)); } catch(e){}
                window.dispatchEvent(new CustomEvent(`erp_table_updated_${key}`, { detail: [newItem] }));
            }
        } else if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedItem = payload.new;
            const idx = items.findIndex(i => i.id === updatedItem.id);
            if (idx !== -1) {
                items[idx] = { ...items[idx], ...updatedItem };
            } else {
                items.unshift(updatedItem);
            }
            const sorted = this.sortCollection(key, items);
            this.cache[key] = sorted;
            try { localStorage.setItem(storageKey, JSON.stringify(sorted)); } catch(e){}
            window.dispatchEvent(new CustomEvent(`erp_table_updated_${key}`, { detail: [updatedItem] }));
        } else if (payload.eventType === 'DELETE' && payload.old) {
            const deletedId = payload.old.id;
            if (deletedId) {
                this.cache[key] = items.filter(i => i.id !== deletedId);
                try { localStorage.setItem(storageKey, JSON.stringify(this.cache[key])); } catch(e){}
                window.dispatchEvent(new CustomEvent(`erp_table_updated_${key}`, { detail: [] }));
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
                                key === STORAGE_KEYS.PRODUCTS ||
                                key === STORAGE_KEYS.PAYMENTS ||
                                key === STORAGE_KEYS.SALES;

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

            // Deterministic ordering directly from database to avoid PostgreSQL heap/MVCC shuffle
            if (key === STORAGE_KEYS.PRODUCTS || key === STORAGE_KEYS.CLIENTS || key === STORAGE_KEYS.SELLERS || key === STORAGE_KEYS.TUCOMPRAS_CUSTOMERS) {
                query = query.order('name', { ascending: true });
            } else if (key === STORAGE_KEYS.SALES || key === STORAGE_KEYS.PAYMENTS || key === STORAGE_KEYS.EXPENSES || key === STORAGE_KEYS.STOCK_ENTRIES || key === STORAGE_KEYS.TRANSIT_ORDERS || key === STORAGE_KEYS.MOVEMENTS) {
                query = query.order('date', { ascending: false });
            }

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
                    if (key === STORAGE_KEYS.PRODUCTS) {
                        // Reconcile out-of-stock products to ensure active=false if stock <= 0
                        finalItems.forEach(p => {
                            const totalStock = (parseInt(p.stockMillenio) || 0) + (parseInt(p.stockVulcano) || 0);
                            if (totalStock <= 0 && p.active !== false) {
                                p.active = false;
                                if (supabase) {
                                    supabase.from('products').update({ active: false }).eq('id', p.id).then();
                                }
                            }
                        });
                    }

                    // Sort final items deterministically before committing to cache and localStorage
                    finalItems = this.sortCollection(key, finalItems);

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
        const sorted = this.sortCollection(key, data);
        this.cache[key] = sorted;
        try {
            localStorage.setItem(`erp_${key}`, JSON.stringify(sorted));
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

        // 1. CLOUD SYNC STRICT AWAIT WITH AUTOMATIC MISSING-COLUMN STRIPPING RETRY
        if (table && supabase) {
            console.log(`Syncing ${table} to Cloud...`);
            await this.safeSupabaseWrite(table, 'insert', newItem);
        }

        // 2. UPDATE CACHE & LOCALSTORAGE ONLY ON SUCCESS
        // Always update memory first
        if (!this.cache[key]) this.cache[key] = [];
        this.cache[key].unshift(newItem);
        this.cache[key] = this.sortCollection(key, this.cache[key]);
        
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
            // Auto-Limbo Trigger: Any product with stock <= 0 MUST be deactivated automatically, and stock > 0 MUST be activated
            if (key === STORAGE_KEYS.PRODUCTS) {
                const existing = items[index];
                const newStockM = updatedData.stockMillenio !== undefined ? (parseInt(updatedData.stockMillenio) || 0) : (parseInt(existing.stockMillenio) || 0);
                const newStockV = updatedData.stockVulcano !== undefined ? (parseInt(updatedData.stockVulcano) || 0) : (parseInt(existing.stockVulcano) || 0);
                const newStock = newStockM + newStockV;

                if (newStock <= 0) {
                    updatedData.active = false;
                } else if (newStock > 0) {
                    updatedData.active = true;
                }
            }

            updatedData.updatedAt = new Date().toISOString();
            const finalItem = { ...items[index], ...updatedData };

            // Cloud Sync Await with Automatic Missing-Column Retry
            if (table && supabase) {
                await this.safeSupabaseWrite(table, 'update', updatedData, id);
            }

            // Local Update
            items[index] = finalItem;
            this.cache[key] = this.sortCollection(key, items);
            try {
                localStorage.setItem(`erp_${key}`, JSON.stringify(this.cache[key]));
            } catch (e) {
                console.warn(`LocalStorage Full: Could not update ${key} locally.`);
            }
        }
        return items;
    },

    /**
     * Safe Supabase Write Helper: Retries writing by stripping unmapped cloud columns automatically if schema mismatch occurs
     */
    async safeSupabaseWrite(table, action, payload, id = null) {
        const supabase = window.supabaseAdminClient || window.supabaseClient;
        if (!table || !supabase) return { success: true };

        let currentPayload = { ...payload };
        let maxRetries = 35;
        let lastError = null;

        while (maxRetries > 0) {
            maxRetries--;
            let res = null;
            try {
                if (action === 'insert') {
                    res = await supabase.from(table).insert(currentPayload);
                } else if (action === 'update') {
                    res = await supabase.from(table).update(currentPayload).eq('id', id);
                }
            } catch (netErr) {
                console.warn(`[STORAGE] Network exception on table '${table}' (retries left: ${maxRetries}):`, netErr);
                lastError = netErr;
                if ((35 - maxRetries) < 3) {
                    await new Promise(r => setTimeout(r, 400));
                    continue; // Retry on transient network error
                }
                // Fallback: If network is down or fetch error occurs, mark offline status and proceed with local cache
                this.updateStatus(false);
                if (window.ERP_LOG) window.ERP_LOG(`Nube Offline (${table}): ${netErr.message || 'Sin conexión'}`, 'warning');
                return { success: false, offline: true, error: netErr };
            }

            if (!res || !res.error) {
                console.log(`Supabase Sync Success (${table})`);
                this.updateStatus(true);
                return { success: true };
            }

            lastError = res.error;
            const msg = res.error.message || '';

            // Check if error is due to missing column in PostgREST schema cache
            const match = msg.match(/Could not find the ['"]([^'"]+)['"] column/i) || 
                          msg.match(/column ["']([^"']+)["'] of relation ".*" does not exist/i) ||
                          msg.match(/column ["']([^"']+)["'] does not exist/i);

            if (match && match[1]) {
                const missingCol = match[1];
                console.warn(`[STORAGE] Stripping unmapped cloud column '${missingCol}' for table '${table}' and retrying...`);
                delete currentPayload[missingCol];
                continue; // Retry with cleaned payload
            }

            // If non-recoverable error, break loop
            break;
        }

        console.error(`Supabase Write Error (${table}):`, lastError ? lastError.message : 'Unknown error');
        this.updateStatus(false);
        if (window.ERP_LOG) window.ERP_LOG(`Error Nube (${table}): ${lastError ? lastError.message : ''}`, 'error');
        throw new Error(`Refusado por el Servidor (Nube): ${lastError ? lastError.message : 'Error desconocido'}`);
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
            try {
                const { error } = await supabase.from(table).delete().eq('id', id);
                if (error) {
                    console.error(`Supabase Delete Error (${table}):`, error.message);
                    this.updateStatus(false);
                    if (window.ERP_LOG) window.ERP_LOG(`Error Nube (${table}): ${error.message}`, 'error');
                } else {
                    this.updateStatus(true);
                }
            } catch (netErr) {
                console.warn(`[STORAGE] Network Delete Error (${table}):`, netErr);
                this.updateStatus(false);
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
