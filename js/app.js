console.log('--- ERP AC SYSTEM V67 LOADING (CLOUD SYNC) ---');

// Visual Logger for Debugging without Console
window.ERP_LOG = function (msg, type = 'info') {
    console.log(`[ERP ${type.toUpperCase()}]`, msg);
    let tray = document.getElementById('debug-tray');
    if (!tray) {
        tray = document.createElement('div');
        tray.id = 'debug-tray';
        tray.style = 'position:fixed; bottom:0; right:0; width:300px; max-height:200px; background:rgba(0,0,0,0.8); color:#0f0; font-family:monospace; font-size:10px; padding:10px; overflow-y:auto; z-index:99999; border-top-left-radius:10px; pointer-events:none;';
        document.body.appendChild(tray);
    }
    const entry = document.createElement('div');
    entry.style.color = type === 'error' ? '#ff4444' : type === 'success' ? '#44ff44' : '#0f0';
    entry.textContent = `> ${new Date().toLocaleTimeString()}: ${msg}`;
    tray.appendChild(entry);
    tray.scrollTop = tray.scrollHeight;
};

window.onerror = function (msg, url, line) {
    ERP_LOG(`${msg} (${line})`, 'error');
    return false;
};

document.addEventListener('DOMContentLoaded', async () => {
    window.erpStarted = true;
    ERP_LOG('Iniciando Sistema V67...');

    // 0. Initialize Supabase
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
    const mods = [Inventory, CRM, Sales, Dashboard, Finances, Settings];
    mods.forEach(m => {
        try { if (m && m.init) m.init(); } catch (e) { ERP_LOG('Error Modulo: ' + e.message, 'error'); }
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
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const panelName = item.getAttribute('data-panel');

            navItems.forEach(ni => ni.classList.remove('active'));
            item.classList.add('active');

            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
            const target = document.getElementById(`${panelName}-panel`);
            if (target) target.classList.add('active');

            if (panelName === 'dashboard' && window.Dashboard) Dashboard.updateStats();
            if (panelName === 'inventory' && window.Inventory) Inventory.updateInventoryList();

            localStorage.setItem('erp_active_panel', panelName);
        });
    });
}

function loadActivePanel() {
    const last = localStorage.getItem('erp_active_panel') || 'dashboard';
    const btn = document.querySelector(`.nav-item[data-panel="${last}"]`);
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
