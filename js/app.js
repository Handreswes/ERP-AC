console.log('--- ERP AC SYSTEM V102 LOADING (CLOUD SYNC) ---');

// Visual Logger (Console only for production V102)
window.ERP_LOG = function (msg, type = 'info') {
    console.log(`[ERP ${type.toUpperCase()}]`, msg);
    // Visual tray removed by user request
};

window.onerror = function (msg, url, line) {
    ERP_LOG(`${msg} (${line})`, 'error');
    return false;
};

document.addEventListener('DOMContentLoaded', async () => {
    window.erpStarted = true;
    ERP_LOG('Iniciando Sistema V102...');

    // 0. Initialize Supabase FIRST
    try {
        if (typeof window.initSupabase === 'function') {
            window.initSupabase();
            ERP_LOG('Supabase Listo', 'success');
        }
    } catch (e) { ERP_LOG('Error Supabase: ' + e.message, 'error'); }

    // 0.1 Initialize Auth
    try {
        if (typeof Auth !== 'undefined') {
            await Auth.init();
            ERP_LOG('Auth Listo', 'success');
        }
    } catch (e) { ERP_LOG('Error Auth: ' + e.message, 'error'); }

    // 1. Initialize Storage
    try {
        await Storage.init();
        ERP_LOG('Storage Listo', 'success');
    } catch (e) { ERP_LOG('Error Storage: ' + e.message, 'error'); }

    // 2. Initialize Modules
    const mods = [Inventory, CRM, Sales, Dashboard, Finances, Marketing, TuCompras, Vendedores, CategoriesModule, Settings, Consultas, Catalog, PDFManager, TuComprasCRM, Logistics, UserManagement];
    mods.forEach(m => {
        try { if (m && m.init) m.init(); } catch (e) { ERP_LOG('Error Modulo Initializing: ' + e.message, 'error'); }
    });

    // 3. Navigation
    try {
        initNavigation();
        loadActivePanel();
    } catch (e) { ERP_LOG('Error Nav: ' + e.message, 'error'); }

    // 4. Cleanup
    if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (let r of regs) await r.unregister();
    }
});

function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-item, .bottom-nav-item, .menu-grid-item');
    const sheet = document.getElementById('bottom-sheet');
    const overlay = document.getElementById('bottom-sheet-overlay');
    const menuTrigger = document.getElementById('mobile-menu-trigger');
    const closeMenu = document.getElementById('close-mobile-menu');

    const toggleMenu = (show) => {
        if (sheet && overlay) {
            sheet.classList.toggle('active', show);
            overlay.classList.toggle('active', show);
        }
        // Always reset overflow — never leave it stuck
        document.body.style.overflow = show ? 'hidden' : '';
    };

    if (menuTrigger) {
        menuTrigger.onclick = (e) => {
            e.preventDefault();
            toggleMenu(true);
        };
    }

    if (closeMenu) closeMenu.onclick = () => toggleMenu(false);
    if (overlay) overlay.onclick = () => toggleMenu(false);

    // Global navigation handler exposed for direct onclick calls
    window.handleNavClick = function (panelName) {
        if (!panelName) return;

        toggleMenu(false);

        // Update all related nav items (bottom, sidebar, sheet)
        document.querySelectorAll('.nav-item, .bottom-nav-item, .menu-grid-item').forEach(el => {
            el.classList.toggle('active', el.getAttribute('data-panel') === panelName);
        });

        // Switch panels
        document.querySelectorAll('.panel').forEach(p => {
            p.classList.toggle('active', p.id === `${panelName}-panel`);
        });

        console.log(`Navigation: Switching to ${panelName}`);

        // Module specific refreshes
        const modMap = {
            'dashboard': () => { if (window.Dashboard && window.Dashboard.updateStats) window.Dashboard.updateStats(); },
            'inventory': () => { if (window.Inventory && window.Inventory.updateInventoryList) window.Inventory.updateInventoryList(); },
            'sales': () => { if (window.Sales && window.Sales.renderProductGrid) window.Sales.renderProductGrid(''); },
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
            'user-management': () => { if (window.UserManagement && window.UserManagement.init) window.UserManagement.init(); }
        };

        if (modMap[panelName]) {
            try { modMap[panelName](); } catch (err) { console.error(`Error refreshing ${panelName}:`, err); }
        }

        localStorage.setItem('erp_active_panel', panelName);

        // Scroll to top on mobile when switching panels
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Attach to existing elements just in case they don't have inline handlers
    document.querySelectorAll('.nav-item, .bottom-nav-item, .menu-grid-item').forEach(el => {
        if (el.id !== 'mobile-menu-trigger') {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                window.handleNavClick(el.getAttribute('data-panel'));
            });
        }
    });
}

function loadActivePanel() {
    const last = localStorage.getItem('erp_active_panel') || 'dashboard';
    const btn = document.querySelector(`[data-panel="${last}"]`);
    if (btn) btn.click();
}

window.clearAllSystemData = async function () {
    if (!confirm('¿Limpiar todo el sistema?')) return;
    localStorage.clear();
    document.cookie.split(";").forEach(c => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    location.reload(true);
};

