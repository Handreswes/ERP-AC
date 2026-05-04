/**
 * ERP AC Marketing Module
 */

window.Marketing = {
    async init() {
        // Initial setup
    },

    async renderPanel() {
        const contentArea = document.getElementById('content-area');
        
        // Hide all panels
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        
        if (!document.getElementById('marketing-panel')) {
            const panel = document.createElement('div');
            panel.id = 'marketing-panel';
            panel.className = 'panel';
            contentArea.appendChild(panel);
        }

        const panel = document.getElementById('marketing-panel');
        panel.classList.add('active');
        
        panel.innerHTML = `
            <div class="panel-header">
                <h1>Marketing y Campañas</h1>
                <div class="actions">
                    <button class="btn btn-primary" onclick="Marketing.showNotificationModal()">
                        <i class="fas fa-paper-plane"></i> Nueva Notificación
                    </button>
                </div>
            </div>

            <div class="stats-grid" style="margin-top: 1.5rem;">
                <div class="stat-card">
                    <h3>Campañas Activas</h3>
                    <p class="stat-value">0</p>
                    <span class="stat-label">Próximamente</span>
                </div>
                <div class="stat-card">
                    <h3>Notificaciones Enviadas</h3>
                    <p id="total-notifs" class="stat-value">...</p>
                    <span class="stat-label">En la web</span>
                </div>
            </div>

            <div class="table-container" style="margin-top: 2rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                    <h3>Historial de Notificaciones</h3>
                    <button class="btn btn-outline btn-sm" onclick="Marketing.fetchNotifications()"><i class="fas fa-sync"></i></button>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Cliente (ID)</th>
                            <th>Título</th>
                            <th>Mensaje</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody id="notif-history">
                        <tr><td colspan="5" class="text-center">Cargando historial...</td></tr>
                    </tbody>
                </table>
            </div>
        `;
        this.fetchNotifications();
    },

    async fetchNotifications() {
        const { data, error } = await window.supabaseClient.from('marketing_notifications').select('*').order('createdAt', { ascending: false });
        const tbody = document.getElementById('notif-history');
        const totalEl = document.getElementById('total-notifs');
        
        if (error || !data) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error al cargar historial</td></tr>';
            return;
        }

        if (totalEl) totalEl.textContent = data.length;

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay notificaciones enviadas</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(n => `
            <tr>
                <td>${new Date(n.createdAt).toLocaleString()}</td>
                <td><small>${n.customer_id || 'Global'}</small></td>
                <td><strong>${n.title}</strong></td>
                <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${n.message}</td>
                <td><span class="badge ${n.is_read ? 'bg-success' : 'bg-warning'}">${n.is_read ? 'Leída' : 'Pendiente'}</span></td>
            </tr>
        `).join('');
    },

    async showNotificationModal() {
        // Create modal on the fly
        const modalId = 'marketing-notif-modal';
        let modal = document.getElementById(modalId);
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal';
            document.body.appendChild(modal);
        }

        const { data: customers } = await window.supabaseClient.from('tucompras_customers').select('id, name');

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>Nueva Notificación</h2>
                    <span class="close-modal" onclick="document.getElementById('${modalId}').style.display='none'">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="marketing-notif-form">
                        <div class="form-group">
                            <label>Cliente Destino</label>
                            <select id="notif-customer" class="form-select" required>
                                <option value="all">Todos los clientes</option>
                                ${customers?.map(c => `<option value="${c.id}">${c.name}</option>`).join('') || ''}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Título</label>
                            <input type="text" id="notif-title" class="form-control" required placeholder="Ej: ¡Oferta Flash!">
                        </div>
                        <div class="form-group">
                            <label>Mensaje</label>
                            <textarea id="notif-message" class="form-control" required rows="4" placeholder="Escribe el contenido..."></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary btn-block" style="margin-top: 1.5rem; height: 50px;">ENVIAR NOTIFICACIÓN</button>
                    </form>
                </div>
            </div>
        `;

        modal.style.display = 'flex';

        document.getElementById('marketing-notif-form').onsubmit = async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

            const payload = {
                customer_id: document.getElementById('notif-customer').value === 'all' ? null : document.getElementById('notif-customer').value,
                title: document.getElementById('notif-title').value,
                message: document.getElementById('notif-message').value
            };

            const { error } = await window.supabaseClient.from('marketing_notifications').insert([payload]);

            if (error) {
                alert('Error al enviar: ' + error.message);
                btn.disabled = false;
                btn.innerHTML = 'ENVIAR NOTIFICACIÓN';
            } else {
                alert('Notificación enviada con éxito');
                modal.style.display = 'none';
                this.fetchNotifications();
            }
        };
    }
};
