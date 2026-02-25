// Settings Module
window.Settings = {
    init() {
        this.renderPanel();
    },

    renderPanel() {
        const contentArea = document.getElementById('content-area');
        if (!document.getElementById('config-panel')) {
            const panel = document.createElement('div');
            panel.id = 'config-panel';
            panel.className = 'panel';
            contentArea.appendChild(panel);
        }

        const panel = document.getElementById('config-panel');
        const config = Storage.get(STORAGE_KEYS.CONFIG) || {};

        panel.innerHTML = `
            <div class="panel-header">
                <h1>Configuraciones del Sistema</h1>
            </div>

            <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
                <!-- Business Profile -->
                <div class="stat-card">
                    <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:1rem;">
                        <i class="fas fa-building" style="color:var(--accent); font-size:1.2rem;"></i>
                        <h2 style="margin:0; font-size:1.1rem;">Perfil del Negocio</h2>
                    </div>
                    <form id="settings-profile-form">
                        <div class="form-group">
                            <label>Nombre del Negocio</label>
                            <input type="text" name="businessName" class="form-control" value="${config.businessName || ''}" placeholder="Ej: VULCANO MOTOS">
                        </div>
                        <div class="form-group">
                            <label>NIT / Identificación</label>
                            <input type="text" name="nit" class="form-control" value="${config.nit || ''}" placeholder="Ej: 900.123.456-1">
                        </div>
                        <div class="form-group">
                            <label>Teléfono de Contacto</label>
                            <input type="text" name="phone" class="form-control" value="${config.phone || ''}" placeholder="Ej: 300 123 4567">
                        </div>
                        <div class="form-group">
                            <label>Dirección</label>
                            <input type="text" name="address" class="form-control" value="${config.address || ''}" placeholder="Ej: Calle 123 #45-67">
                        </div>
                        <button type="submit" class="btn btn-primary btn-block">Guardar Perfil</button>
                    </form>
                </div>

                <!-- Alerts & Thresholds -->
                <div class="stat-card">
                    <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:1rem;">
                        <i class="fas fa-bell" style="color:var(--warning); font-size:1.2rem;"></i>
                        <h2 style="margin:0; font-size:1.1rem;">Alertas y Notificaciones</h2>
                    </div>
                    <form id="settings-alerts-form">
                        <div class="form-group">
                            <label>Umbral de Stock Bajo</label>
                            <input type="number" name="lowStock" class="form-control" value="${config.lowStock || 5}" min="0">
                            <small class="text-secondary">Los productos debajo de este stock se verán rojos.</small>
                        </div>
                        <div class="form-group">
                            <label>Alertas Gastos (Días antes)</label>
                            <input type="number" name="expenseAlertDays" class="form-control" value="${config.expenseAlertDays || 2}" min="0" max="31">
                            <small class="text-secondary">Días previos para avisar pagos programados.</small>
                        </div>
                        <button type="submit" class="btn btn-primary btn-block">Guardar Umbrales</button>
                    </form>
                </div>

                <!-- Backup & Security -->
                <div class="stat-card">
                    <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:1rem;">
                        <i class="fas fa-shield-alt" style="color:var(--success); font-size:1.2rem;"></i>
                        <h2 style="margin:0; font-size:1.1rem;">Seguridad y Datos</h2>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:1rem;">
                        <p class="text-secondary" style="font-size:0.85rem;">Protege tu información descargando una copia de seguridad periódicamente.</p>
                        <button id="export-data-btn" class="btn btn-outline btn-block">
                            <i class="fas fa-download"></i> Descargar Backup (.JSON)
                        </button>
                        <div style="position:relative;">
                            <button id="import-trigger-btn" class="btn btn-outline btn-block">
                                <i class="fas fa-upload"></i> Restaurar desde Archivo
                            </button>
                            <input type="file" id="import-data-input" accept=".json" style="display:none;">
                        </div>
                        <hr style="border:0; border-top:1px solid var(--border); margin:0.5rem 0;">
                        <button id="reset-system-btn" class="btn btn-outline btn-block" style="border-color:var(--danger); color:var(--danger);">
                            <i class="fas fa-trash-alt"></i> ELIMINAR TODO EL SISTEMA
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners();
    },

    setupEventListeners() {
        const panel = document.getElementById('config-panel');
        if (!panel) return;

        // 1. Profile Form
        const profileForm = document.getElementById('settings-profile-form');
        profileForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target));
            this.updateConfig(data);
            alert('Perfil actualizado correctamente.');
            // Update UI components that use this info
            if (data.businessName) document.getElementById('active-company').textContent = data.businessName;
        });

        // 2. Alerts Form
        const alertsForm = document.getElementById('settings-alerts-form');
        alertsForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target));
            this.updateConfig(data);
            alert('Umbrales guardados.');
        });

        // 3. Export Data
        document.getElementById('export-data-btn')?.addEventListener('click', () => {
            const allData = {};
            Object.values(STORAGE_KEYS).forEach(key => {
                allData[key] = localStorage.getItem(key);
            });

            const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_erp_ac_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });

        // 4. Import Data
        const importBtn = document.getElementById('import-trigger-btn');
        const importInput = document.getElementById('import-data-input');
        importBtn?.addEventListener('click', () => importInput.click());
        importInput?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    if (confirm('¿Estás seguro de restaurar estos datos? Se SOBREESCRIBIRÁ toda la información actual.')) {
                        Object.keys(data).forEach(key => {
                            if (data[key]) localStorage.setItem(key, data[key]);
                        });
                        alert('Datos restaurados con éxito. El sistema se reiniciará.');
                        location.reload();
                    }
                } catch (err) {
                    alert('Error al leer el archivo. Asegúrate que sea un backup válido del sistema.');
                }
            };
            reader.readAsText(file);
        });

        // 5. Reset System
        document.getElementById('reset-system-btn')?.addEventListener('click', () => {
            if (confirm('PELIGRO: Esto borrará ABSOLUTAMENTE TODO (Inventario, Ventas, Clientes, Finanzas). ¿Estás totalmente seguro?')) {
                if (confirm('Confirma una vez más para proceder.')) {
                    localStorage.clear();
                    alert('Sistema reiniciado. Se cargará en blanco.');
                    location.reload();
                }
            }
        });
    },

    updateConfig(newData) {
        const config = Storage.get(STORAGE_KEYS.CONFIG) || {};
        const updated = { ...config, ...newData };
        Storage.save(STORAGE_KEYS.CONFIG, updated);
        // Backup: In a real Supabase scenario, CONFIG could also be a table
        // For now, we keep it in cache/LocalStorage as it's minor
    }
};
