console.log('--- ERP AC SYSTEM V67 LOADING (CLOUD SYNC) ---');

// Visual Logger (Console only for production V67)
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
    ERP_LOG('Iniciando Sistema V67...');

    // 0. Initialize Auth FIRST
    try {
        if (typeof Auth !== 'undefined') {
            await Auth.init();
            ERP_LOG('Auth Listo', 'success');
        }
    } catch (e) { ERP_LOG('Error Auth: ' + e.message, 'error'); }

    // 0.1 Initialize Supabase
    try {
        if (typeof window.initSupabase === 'function') {
            window.initSupabase();
            ERP_LOG('Supabase Listo', 'success');
        }
    } catch (e) { ERP_LOG('Error Supabase: ' + e.message, 'error'); }

    // 1. Initialize Storage
    try {
        await Storage.init();
        ERP_LOG('Storage Listo', 'success');
    } catch (e) { ERP_LOG('Error Storage: ' + e.message, 'error'); }

    // 2. Initialize Modules
    const mods = [Inventory, CRM, Sales, Dashboard, Finances, TuCompras, Vendedores, Settings, Consultas, Catalog];
    mods.forEach(m => {
        try { if (m && m.init) m.init(); } catch (e) { ERP_LOG('Error Modulo: ' + m?.constructor?.name + ': ' + e.message, 'error'); }
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

            // Prevent body scroll when menu is open
            document.body.style.overflow = show ? 'hidden' : '';
        }
    };

    if (menuTrigger) {
        menuTrigger.onclick = (e) => {
            e.preventDefault();
            toggleMenu(true);
        };
    }

    if (closeMenu) closeMenu.onclick = () => toggleMenu(false);
    if (overlay) overlay.onclick = () => toggleMenu(false);

    // Global navigation handler
    document.addEventListener('click', (e) => {
        const navItem = e.target.closest('.nav-item, .bottom-nav-item, .menu-grid-item');
        if (!navItem) return;

        const panelName = navItem.getAttribute('data-panel');
        if (!panelName) return;

        e.preventDefault();
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
            'dashboard': window.Dashboard?.updateStats,
            'inventory': window.Inventory?.updateInventoryList,
            'sales': window.Sales?.renderPanel,
            'crm': window.CRM?.renderPanel,
            'finances': window.Finances?.renderPanel,
            'tucompras': window.TuCompras?.renderPanel,
            'vendedores': window.Vendedores?.renderPanel,
            'tucompras-crm': window.TuComprasCRM?.renderPanel,
            'consultas': window.Consultas?.renderPanel,
            'catalog': window.Catalog?.renderPanel
        };

        if (modMap[panelName]) {
            try { modMap[panelName](); } catch (err) { console.error(`Error refreshing ${panelName}:`, err); }
        }

        localStorage.setItem('erp_active_panel', panelName);

        // Scroll to top on mobile when switching panels
        window.scrollTo({ top: 0, behavior: 'smooth' });
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

