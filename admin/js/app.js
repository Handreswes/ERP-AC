// ========================================================
// APP.JS - Main Orchestrator (Super Robust V106)
// ========================================================

// 1. Global Error Tracking
window.onerror = function(msg, url, lineNo, columnNo, error) {
    console.error('ERP Global Error:', msg, 'at', lineNo, ':', columnNo);
    if (window.ERP_LOG) window.ERP_LOG(`Error Crítico: ${msg}`, 'error');
    return false;
};

document.addEventListener('DOMContentLoaded', async () => {
    window.isERPInitializing = true;
    
    // 2. Logger Setup
    window.ERP_LOG = (msg, type = 'info') => {
        console.log(`[ERP ${type.toUpperCase()}]: ${msg}`);
        const logArea = document.getElementById('debug-log-area');
        if (logArea) {
            const entry = document.createElement('div');
            entry.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
            entry.style.padding = '5px';
            entry.style.fontSize = '12px';
            entry.style.color = type === 'error' ? '#ef4444' : (type === 'warning' ? '#f59e0b' : '#10b981');
            entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
            logArea.prepend(entry);
        }
    };

    ERP_LOG('Iniciando Sistema ERP...', 'info');

    // 3. Storage & Auth Initialization
    const storageTimeout = new Promise(resolve => setTimeout(() => resolve('timeout'), 10000));
    
    try {
        if (window.initSupabase) window.initSupabase();
        if (window.Auth && window.Auth.init) await window.Auth.init();
        
        ERP_LOG('Sincronizando Almacenamiento...', 'info');
        if (window.Storage && window.Storage.init) {
            const syncResult = await Promise.race([window.Storage.init(), storageTimeout]);
            if (syncResult === 'timeout') ERP_LOG('Sincronización demorada, iniciando con caché local', 'warning');
        }
    } catch (e) {
        ERP_LOG('Error en pre-inicialización: ' + e.message, 'error');
    } finally {
        window.isERPInitializing = false;
    }

    // 4. Initialize All Modules (Non-blocking)
    const modulesToInit = [
        'Inventory', 'CRM', 'Sales', 'Dashboard', 'Finances', 'Marketing', 
        'TuCompras', 'Vendedores', 'CategoriesModule', 'Settings', 'Consultas', 
        'Catalog', 'PDFManager', 'TuComprasCRM', 'Logistics', 'UserManagement', 'WebsiteAdmin'
    ];

    ERP_LOG('Registrando módulos...', 'info');
    modulesToInit.forEach(modName => {
        const m = window[modName];
        if (m && m.init) {
            try {
                m.init();
                ERP_LOG(`Módulo ${modName} listo`, 'success');
            } catch (e) {
                console.error(`Error inicializando ${modName}:`, e);
                ERP_LOG(`Falla en ${modName}: ${e.message}`, 'error');
            }
        } else {
            console.warn(`Módulo ${modName} no encontrado en window`);
        }
    });

    // 5. Final Setup
    if (window.initNavigation) window.initNavigation();
    
    // Restoration logic: Priority URL Hash > localStorage > default 'dashboard'
    const getInitialPanel = () => {
        const hash = window.location.hash.replace('#', '');
        const validPanels = [
            'dashboard', 'inventory', 'categories', 'sales', 'crm', 'finances', 
            'tucompras', 'vendedores', 'tucompras-crm', 'marketing', 
            'website_admin', 'logistics', 'consultas', 'catalog', 
            'user-management', 'settings'
        ];
        
        if (hash && validPanels.includes(hash)) return hash;
        return localStorage.getItem('erp_active_panel') || 'dashboard';
    };

    const lastPanel = getInitialPanel();
    
    setTimeout(() => {
        if (window.handleNavClick) window.handleNavClick(lastPanel);
        ERP_LOG('Sistema Listo', 'success');
    }, 300);

    // 6. SW Cleanup
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => {
            for (let r of regs) r.unregister();
        }).catch(() => {});
    }

    // Initialize logistics badge and start interval polling
    setTimeout(() => {
        if (window.updateLogisticsBadge) {
            window.updateLogisticsBadge();
            setInterval(window.updateLogisticsBadge, 30000); // Poll every 30 seconds
        }
    }, 1000);
});

// ========================================================
// NAVIGATION ENGINE
// ========================================================
window.initNavigation = initNavigation;
function initNavigation() {
    const sheet = document.getElementById('bottom-sheet');
    const overlay = document.getElementById('bottom-sheet-overlay');
    const closeMenu = document.getElementById('close-mobile-menu');

    window.toggleMobileMenu = (show) => {
        if (sheet && overlay) {
            sheet.classList.toggle('active', show);
            overlay.classList.toggle('active', show);
            document.body.style.overflow = show ? 'hidden' : '';
        }
    };

    if (closeMenu) closeMenu.addEventListener('click', () => window.toggleMobileMenu(false));
    if (overlay) overlay.addEventListener('click', () => window.toggleMobileMenu(false));

    document.addEventListener('click', (e) => {
        // Handle Mobile Menu Trigger
        if (e.target.closest('#mobile-menu-trigger')) {
            e.preventDefault();
            window.toggleMobileMenu(true);
            return;
        }

        const navItem = e.target.closest('[data-panel]');
        if (navItem) {
            e.preventDefault();
            const panelName = navItem.dataset.panel;
            window.handleNavClick(panelName);
        }
    });

    // Handle back/forward and manual hash changes
    window.addEventListener('hashchange', () => {
        const panelName = window.location.hash.replace('#', '');
        if (panelName && panelName !== localStorage.getItem('erp_active_panel')) {
            window.handleNavClick(panelName, false); // false = don't update hash again
        }
    });
};

window.handleNavClick = function (panelName, updateHash = true) {
    if (!panelName) return;
    
    if (window.toggleMobileMenu) window.toggleMobileMenu(false);
    
    console.log(`Navigating to: ${panelName}`);
    
    // 1. Module-Specific Rendering (Ensure panel exists)
    const modMap = {
        'dashboard': () => { if (window.Dashboard && window.Dashboard.updateStats) window.Dashboard.updateStats(); },
        'inventory': () => { 
            if (window.Inventory) {
                if (!document.getElementById('inventory-panel')) {
                    console.log('Force rendering Inventory...');
                    window.Inventory.renderPanel();
                }
                if (window.Inventory.updateInventoryList) window.Inventory.updateInventoryList();
            }
        },
        'sales': () => { 
            if (window.Sales) {
                if (!document.getElementById('sales-panel')) window.Sales.renderPanel();
                if (window.Sales.renderProductGrid) window.Sales.renderProductGrid('');
            }
        },
        'crm': () => { if (window.CRM && window.CRM.renderPanel) window.CRM.renderPanel(); },
        'finances': () => { if (window.Finances && window.Finances.renderPanel) window.Finances.renderPanel(); },
        'tucompras': () => { if (window.TuCompras && window.TuCompras.renderPanel) window.TuCompras.renderPanel(); },
        'vendedores': () => { if (window.Vendedores && window.Vendedores.renderPanel) window.Vendedores.renderPanel(); },
        'tucompras-crm': () => { if (window.TuComprasCRM && window.TuComprasCRM.renderPanel) window.TuComprasCRM.renderPanel(); },
        'marketing': () => { if (window.Marketing && window.Marketing.renderPanel) window.Marketing.renderPanel(); },
        'consultas': () => { if (window.Consultas && window.Consultas.renderPanel) window.Consultas.renderPanel(); },
        'catalog': () => { if (window.Catalog && window.Catalog.renderPanel) window.Catalog.renderPanel(); },
        'logistics': () => { if (window.Logistics && window.Logistics.renderPanel) window.Logistics.renderPanel(); },
        'categories': () => { if (window.CategoriesModule && window.CategoriesModule.init) window.CategoriesModule.init(); },
        'user-management': () => { if (window.UserManagement && window.UserManagement.init) window.UserManagement.init(); },
        'website_admin': () => { if (window.WebsiteAdmin && window.WebsiteAdmin.renderPanel) window.WebsiteAdmin.renderPanel(); },
        'settings': () => { if (window.Settings && window.Settings.renderPanel) window.Settings.renderPanel(); }
    };

    try {
        if (modMap[panelName]) modMap[panelName]();
    } catch (e) {
        console.error(`Error in module render (${panelName}):`, e);
    }

    // 2. UI State Updates
    localStorage.setItem('erp_active_panel', panelName);
    if (updateHash) {
        window.location.hash = panelName;
    }

    // Update Nav Active State
    document.querySelectorAll('[data-panel]').forEach(item => {
        item.classList.toggle('active', item.dataset.panel === panelName);
    });

    // Toggle Panels
    const panels = document.querySelectorAll('.panel');
    let found = false;
    panels.forEach(p => {
        const isActive = p.id === `${panelName}-panel`;
        p.classList.toggle('active', isActive);
        if (isActive) found = true;
    });

    // 3. Fallback: If panel not found, create it (Emergency)
    if (!found) {
        console.warn(`Panel ${panelName}-panel not found in DOM after render attempt.`);
    }
};

window.clearAllSystemData = async function () {
    if (!confirm('¿Limpiar todo el sistema?')) return;
    localStorage.clear();
    location.reload(true);
};

// Logistics Badge Update Logic
window.updateLogisticsBadge = async function() {
    try {
        if (!window.supabaseClient || !window.Storage) return;

        // 1. POS sales pending shipment
        const sales = window.Storage.get('sales') || [];
        const pendingPOS = sales.filter(s => s.delivery_type === 'shipping' && s.delivery_status === 'pending').length;

        // 2. Web orders pending confirmation
        const { data: webOrders, error } = await window.supabaseClient
            .from('orders')
            .select('id')
            .eq('status', 'Pendiente por Confirmar');
        
        const pendingWeb = error ? 0 : (webOrders || []).length;
        const totalPending = pendingPOS + pendingWeb;

        // 3. Update the UI badges
        const navItems = document.querySelectorAll('[data-panel="logistics"]');
        navItems.forEach(item => {
            let badge = item.querySelector('.logistics-badge');
            if (totalPending > 0) {
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'logistics-badge';
                    badge.style.background = '#10b981'; // Green dot
                    badge.style.color = 'white';
                    badge.style.fontSize = '10px';
                    badge.style.fontWeight = 'bold';
                    badge.style.borderRadius = '50%';
                    badge.style.padding = '2px 6px';
                    badge.style.marginLeft = '8px';
                    badge.style.display = 'inline-flex';
                    badge.style.alignItems = 'center';
                    badge.style.justifyContent = 'center';
                    badge.style.minWidth = '16px';
                    badge.style.height = '16px';
                    badge.style.boxShadow = '0 0 8px rgba(16, 185, 129, 0.5)';
                    item.appendChild(badge);
                }
                badge.textContent = totalPending;
            } else {
                if (badge) badge.remove();
            }
        });
    } catch (e) {
        console.error('Error updating logistics badge:', e);
    }
};
