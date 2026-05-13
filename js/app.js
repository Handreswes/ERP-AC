console.log('--- ERP AC SYSTEM V105 LOADING (ROBUST INIT) ---');

window.ERP_LOG = function (msg, type = 'info') {
    console.log(`[ERP ${type.toUpperCase()}]`, msg);
};

window.onerror = function (msg, url, line) {
    ERP_LOG(`${msg} (${line})`, 'error');
    return false;
};

document.addEventListener('DOMContentLoaded', async () => {
    window.erpStarted = true;
    ERP_LOG('Iniciando Sistema V105...');

    // 0. Initialize Navigation FIRST so UI functions are available
    try {
        initNavigation();
        ERP_LOG('Navegación Inicializada', 'success');
    } catch (e) { ERP_LOG('Error Crítico Nav: ' + e.message, 'error'); }

    // 1. Initialize Supabase
    try {
        if (typeof window.initSupabase === 'function') {
            window.initSupabase();
            ERP_LOG('Supabase Listo', 'success');
        }
    } catch (e) { ERP_LOG('Error Supabase: ' + e.message, 'error'); }

    // 2. Initialize Auth
    try {
        if (typeof Auth !== 'undefined') {
            await Auth.init();
            ERP_LOG('Auth Listo', 'success');
        }
    } catch (e) { ERP_LOG('Error Auth: ' + e.message, 'error'); }

    // Initialization Guard
    window.isERPInitializing = true;

    // 3. Storage Init (Cache + Cloud Sync)
    try {
        ERP_LOG('Iniciando Sincronización de Datos...');
        const storageTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Storage timeout')), 10000)
        );
        
        window.addEventListener('erp_storage_ready', () => {
            ERP_LOG('Sincronización Completa (Evento)', 'success');
            updateUIAfterSync();
        });

        await Promise.race([Storage.init(), storageTimeout]);
        ERP_LOG('Sincronización Finalizada', 'success');
        window.isERPInitializing = false;
        updateUIAfterSync();
    } catch (e) {
        ERP_LOG('Storage Timeout/Error: ' + e.message, 'warning');
        window.isERPInitializing = false;
        updateUIAfterSync();
    }

    // 4. Initialize All Modules
    const mods = [Inventory, CRM, Sales, Dashboard, Finances, Marketing, TuCompras, Vendedores, CategoriesModule, Settings, Consultas, Catalog, PDFManager, TuComprasCRM, Logistics, UserManagement, WebsiteAdmin];
    mods.forEach(m => {
        try { if (m && m.init) m.init(); } catch (e) { console.warn('Modulo Init Error:', e.message); }
    });

    // 5. Final UI Polish
    loadActivePanel();

    // 6. SW Cleanup
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => {
            for (let r of regs) r.unregister();
        }).catch(() => {});
    }
});

function initNavigation() {
    const sheet = document.getElementById('bottom-sheet');
    const overlay = document.getElementById('bottom-sheet-overlay');
    const menuTrigger = document.getElementById('mobile-menu-trigger');
    const closeMenu = document.getElementById('close-mobile-menu');

    const sidebar = document.getElementById('sidebar');
    const openSidebarBtn = document.getElementById('open-sidebar-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    const toggleSidebar = (show) => {
        if (sidebar && sidebarOverlay) {
            sidebar.classList.toggle('open', show);
            sidebarOverlay.classList.toggle('active', show);
            document.body.style.overflow = show ? 'hidden' : '';
        }
    };

    if (openSidebarBtn) openSidebarBtn.onclick = () => toggleSidebar(true);
    if (closeSidebarBtn) closeSidebarBtn.onclick = () => toggleSidebar(false);
    if (sidebarOverlay) sidebarOverlay.onclick = () => toggleSidebar(false);

    const toggleMenu = (show) => {
        if (sheet && overlay) {
            sheet.classList.toggle('active', show);
            overlay.classList.toggle('active', show);
        }
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

    window.handleNavClick = function (panelName) {
        if (!panelName) return;

        toggleMenu(false);
        toggleSidebar(false);

        document.querySelectorAll('.nav-item, .bottom-nav-item, .menu-grid-item').forEach(el => {
            el.classList.toggle('active', el.getAttribute('data-panel') === panelName);
        });

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
            'user-management': () => { if (window.UserManagement && window.UserManagement.init) window.UserManagement.init(); },
            'website_admin': () => { if (window.WebsiteAdmin && window.WebsiteAdmin.init) window.WebsiteAdmin.init(); }
        };

        if (modMap[panelName]) {
            try { modMap[panelName](); } catch (err) { console.error(`Error refreshing ${panelName}:`, err); }
        }

        const panels = document.querySelectorAll('.panel');
        panels.forEach(p => {
            const isActive = p.id === `${panelName}-panel`;
            p.classList.toggle('active', isActive);
            if (isActive) p.setAttribute('aria-hidden', 'false');
            else p.setAttribute('aria-hidden', 'true');
        });

        localStorage.setItem('erp_active_panel', panelName);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    document.querySelectorAll('.nav-item, .bottom-nav-item, .menu-grid-item').forEach(el => {
        if (el.id !== 'mobile-menu-trigger') {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                const panel = el.getAttribute('data-panel');
                if (panel) window.handleNavClick(panel);
            });
        }
    });
}

function loadActivePanel() {
    const last = localStorage.getItem('erp_active_panel') || 'dashboard';
    if (window.handleNavClick) {
        window.handleNavClick(last);
    }
}

function updateUIAfterSync() {
    const loadingName = document.querySelector('.user-profile span');
    if (loadingName && (loadingName.textContent === 'Cargando...' || !loadingName.textContent)) {
        loadingName.textContent = window.Auth?.currentUser?.name || 'Usuario';
    }

    const last = localStorage.getItem('erp_active_panel') || 'dashboard';
    if (window.handleNavClick) {
        window.handleNavClick(last);
    }
}

window.clearAllSystemData = async function () {
    if (!confirm('¿Limpiar todo el sistema?')) return;
    localStorage.clear();
    document.cookie.split(";").forEach(c => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    location.reload(true);
};
