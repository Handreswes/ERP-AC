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
        }
    };

    if (menuTrigger) menuTrigger.addEventListener('click', (e) => { e.preventDefault(); toggleMenu(true); });
    if (closeMenu) closeMenu.addEventListener('click', () => toggleMenu(false));
    if (overlay) overlay.addEventListener('click', () => toggleMenu(false));

    navLinks.forEach(item => {
        item.addEventListener('click', (e) => {
            const panelName = item.getAttribute('data-panel');
            if (!panelName) return;
            e.preventDefault();

            toggleMenu(false); // Close menu if it's open

            // Update active states
            navLinks.forEach(ni => ni.classList.remove('active'));
            document.querySelectorAll(`[data-panel="${panelName}"]`).forEach(el => el.classList.add('active'));

            // Show panel
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
            const target = document.getElementById(`${panelName}-panel`);
            if (target) {
                target.classList.add('active');
            }

            console.log(`Navigation: Switching to ${panelName}`);

            if (panelName === 'dashboard' && window.Dashboard) Dashboard.updateStats();
            if (panelName === 'inventory' && window.Inventory) Inventory.updateInventoryList();
            if (panelName === 'sales' && window.Sales) Sales.renderPanel();
            if (panelName === 'crm' && window.CRM) CRM.renderPanel();
            if (panelName === 'finances' && window.Finances) Finances.renderPanel();
            if (panelName === 'tucompras' && window.TuCompras) TuCompras.renderPanel();
            if (panelName === 'vendedores' && window.Vendedores) Vendedores.renderPanel();
            if (panelName === 'tucompras-crm' && window.TuComprasCRM) TuComprasCRM.renderPanel();
            if (panelName === 'consultas' && window.Consultas) Consultas.renderPanel();
            if (panelName === 'catalog' && window.Catalog) Catalog.renderPanel();

            localStorage.setItem('erp_active_panel', panelName);
        });
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
