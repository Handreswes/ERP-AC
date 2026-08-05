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
        'Catalog', 'PDFManager', 'TuComprasCRM', 'Logistics', 'UserManagement', 'WebsiteAdmin', 'Agent'
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
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const closeBtn = document.getElementById('sidebar-close-btn');

    window.toggleMobileMenu = (show) => {
        if (sidebar) {
            sidebar.classList.toggle('open', show);
            sidebar.classList.toggle('active', show);
        }
        if (overlay) {
            overlay.classList.toggle('active', show);
        }
        document.body.style.overflow = show ? 'hidden' : '';
    };

    if (mobileBtn) mobileBtn.onclick = (e) => { e.preventDefault(); window.toggleMobileMenu(true); };
    if (closeBtn) closeBtn.onclick = (e) => { e.preventDefault(); window.toggleMobileMenu(false); };
    if (overlay) overlay.onclick = () => window.toggleMobileMenu(false);

    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('#mobile-menu-btn, #mobile-menu-trigger');
        if (trigger) {
            e.preventDefault();
            window.toggleMobileMenu(true);
            return;
        }

        const closeTrigger = e.target.closest('#sidebar-close-btn');
        if (closeTrigger) {
            e.preventDefault();
            window.toggleMobileMenu(false);
            return;
        }

        const navItem = e.target.closest('[data-panel]');
        if (navItem) {
            e.preventDefault();
            const panelName = navItem.dataset.panel;
            window.handleNavClick(panelName);
            window.toggleMobileMenu(false);
        }
    });

    window.addEventListener('hashchange', () => {
        const panelName = window.location.hash.replace('#', '');
        if (panelName && panelName !== localStorage.getItem('erp_active_panel')) {
            window.handleNavClick(panelName, false);
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

    if (!found) {
        console.warn(`Panel HTML element non-existent for: ${panelName}`);
    }

    // Scroll to top of content area on navigation
    const contentArea = document.getElementById('content-area');
    if (contentArea) {
        contentArea.scrollTop = 0;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
};
