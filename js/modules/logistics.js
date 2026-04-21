// Logistics Module
window.Logistics = {
    init() {
        this.renderPanel();
        this.setupEventListeners();
    },

    async renderPanel() {
        const contentArea = document.getElementById('content-area');

        if (!document.getElementById('logistics-panel')) {
            const panel = document.createElement('div');
            panel.id = 'logistics-panel';
            panel.className = 'panel';
            contentArea.appendChild(panel);
        }

        const panel = document.getElementById('logistics-panel');
        panel.innerHTML = '<div class="loader">Cargando despachos...</div>';

        const pendingSales = await this.getPendingShipments();

        panel.innerHTML = `
            <div class="panel-header">
                <h1>Logística y Despachos</h1>
                <div class="stats-badge bg-orange">
                    ${pendingSales.length} Pendientes
                </div>
            </div>

            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Cliente</th>
                            <th>Ubicación</th>
                            <th>Dirección</th>
                            <th>Productos</th>
                            <th>Total</th>
                            <th>Origen</th>
                            <th>Transportadora</th>
                            <th>Nro. Guía</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="logistics-list">
                        ${pendingSales.length === 0 ? '<tr><td colspan="7" class="text-center">No hay despachos pendientes</td></tr>' : ''}
                    </tbody>
                </table>
            </div>

            <!-- Modal para Editar Despacho -->
            <div id="logistic-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Actualizar Despacho</h2>
                        <span class="close-modal">&times;</span>
                    </div>
                    <div class="modal-body">
                        <form id="logistic-form">
                            <input type="hidden" id="logistic-sale-id">
                            <div class="form-group">
                                <label>Transportadora (Opcional)</label>
                                <input type="text" id="logistic-carrier" class="form-control" placeholder="Ej: Servientrega">
                            </div>
                            <div class="form-group">
                                <label>Número de Guía (Opcional)</label>
                                <input type="text" id="logistic-tracking" class="form-control" placeholder="# Guía">
                            </div>
                            <button type="submit" class="btn btn-primary btn-block" style="margin-top: 1rem;">Marcar como Despachado</button>
                        </form>
                    </div>
                </div>
            </div>
        `;

        if (pendingSales.length > 0) {
            this.updateListUI(pendingSales);
        }
    },

    async getPendingShipments() {
        try {
            // 1. Fetch POS Sales from Storage/DB
            const sales = Storage.get(STORAGE_KEYS.SALES) || [];
            const pendingPOS = sales.filter(s => s.delivery_type === 'shipping' && s.delivery_status === 'pending');

            // 2. Fetch Website Orders from Supabase
            const { data: webOrders, error } = await supabase
                .from('orders')
                .select('*')
                .eq('status', 'Pendiente por Confirmar');

            if (error) throw error;

            // Map web orders to match logistics format
            const mappedWeb = (webOrders || []).map(o => ({
                id: o.id,
                date: o.createdAt,
                clientName: o.customerName,
                address: o.customerAddress,
                city: `${o.customerCity}, ${o.customerDept}`,
                items: o.items,
                total: o.total,
                carrier: '',
                tracking_number: '',
                source: 'web',
                original_order: o
            }));

            return [...pendingPOS, ...mappedWeb];
        } catch (err) {
            ERP_LOG('Error fetching logistics: ' + err.message, 'error');
            return [];
        }
    },

    updateListUI(sales) {
        const list = document.getElementById('logistics-list');
        if (!list) return;

        list.innerHTML = sales.map(s => `
            <tr>
                <td>${new Date(s.date).toLocaleDateString()}</td>
                <td><strong>${s.clientName || 'Cliente Genérico'}</strong></td>
                <td>${s.city || '--'}</td>
                <td><small>${s.address || '--'}</small></td>
                <td>${s.items.map(i => `${i.qty || i.quantity}x ${i.name}`).join('<br>')}</td>
                <td>$${(s.total || 0).toLocaleString()}</td>
                <td><span class="badge ${s.source === 'web' ? 'bg-blue' : 'bg-success'}">${s.source === 'web' ? 'WEB' : 'POS'}</span></td>
                <td>${s.carrier || '<span class="text-secondary">--</span>'}</td>
                <td>${s.tracking_number || '<span class="text-secondary">--</span>'}</td>
                <td class="table-actions">
                    <button class="btn btn-sm btn-primary edit-logistic-btn" data-id="${s.id}">
                        <i class="fas fa-truck"></i> Despachar
                    </button>
                </td>
            </tr>
        `).join('');
    },

    setupEventListeners() {
        const panel = document.getElementById('logistics-panel');
        if (!panel) return;

        // Use delegation for clicks AND submits
        panel.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-logistic-btn');
            if (editBtn) {
                const saleId = editBtn.dataset.id;
                const sale = Storage.getById(STORAGE_KEYS.SALES, saleId);
                if (sale) {
                    document.getElementById('logistic-sale-id').value = saleId;
                    document.getElementById('logistic-carrier').value = sale.carrier || '';
                    document.getElementById('logistic-tracking').value = sale.tracking_number || '';
                    document.getElementById('logistic-modal').classList.add('show');
                }
                return;
            }

            if (e.target.classList.contains('close-modal')) {
                e.target.closest('.modal').classList.remove('show');
            }
        });

        panel.addEventListener('submit', async (e) => {
            if (e.target.id === 'logistic-form') {
                e.preventDefault();
                const saleId = document.getElementById('logistic-sale-id').value;
                const carrier = document.getElementById('logistic-carrier').value;
                const tracking = document.getElementById('logistic-tracking').value;

                try {
                    let sale = Storage.getById(STORAGE_KEYS.SALES, saleId);

                    if (!sale) {
                        // Check if it's a web order
                        const pending = await this.getPendingShipments();
                        sale = pending.find(p => p.id === saleId);
                    }

                    if (sale) {
                        if (sale.source === 'web') {
                            // Update Web Order in Supabase
                            const { error } = await supabase
                                .from('orders')
                                .update({
                                    status: 'Despachado',
                                    carrier: carrier,
                                    tracking_number: tracking
                                })
                                .eq('id', saleId);
                            if (error) throw error;
                        } else {
                            // Update POS Sale
                            const updatedSale = {
                                ...sale,
                                carrier: carrier,
                                tracking_number: tracking,
                                delivery_status: 'shipped',
                                shipped_at: new Date().toISOString()
                            };
                            await Storage.updateItem(STORAGE_KEYS.SALES, saleId, updatedSale);
                        }
                        alert('✅ Despacho registrado correctamente.');

                        const modal = document.getElementById('logistic-modal');
                        if (modal) modal.classList.remove('show');

                        // Small delay to ensure DB sync before refresh
                        setTimeout(() => this.renderPanel(), 100);
                    }
                } catch (err) {
                    alert('Error al actualizar despacho: ' + err.message);
                }
            }
        });
    }
};
