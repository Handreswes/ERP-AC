// Logistics Module
window.Logistics = {
    async init() {
        await this.renderPanel();
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
                            <div id="web-order-fields" style="display: none; border: 1px solid var(--accent); padding: 1rem; border-radius: 12px; margin-bottom: 1rem;">
                                <p style="font-size: 0.8rem; color: var(--accent); margin-bottom: 10px;"><strong>Configuración Web Order:</strong></p>
                                <div class="form-group">
                                    <label>Vendedor Responsable *</label>
                                    <select id="logistic-seller" class="form-control"></select>
                                </div>

                            </div>
                            <div class="form-group">
                                <label>Transportadora</label>
                                <input type="text" id="logistic-carrier" class="form-control" placeholder="Ej: Servientrega">
                            </div>
                            <div class="form-group">
                                <label>Número de Guía</label>
                                <input type="text" id="logistic-tracking" class="form-control" placeholder="# Guía">
                            </div>
                            <button type="submit" class="btn btn-primary btn-block" style="margin-top: 1rem;">Confirmar y Despachar</button>
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
            const pendingPOS = sales.filter(s => s.delivery_type === 'shipping' && s.delivery_status === 'pending').map(s => {
                const client = Storage.getById(STORAGE_KEYS.CLIENTS, s.clientId);
                return {
                    ...s,
                    phone: s.clientPhone || client?.phone || '',
                    address: s.address || client?.address || 'Sin dirección',
                    city: s.city || client?.city || '--',
                    source: 'pos',
                    shippingType: s.shippingType || 'domicilio'
                };
            });

            // 2. Fetch Website Orders from Supabase
            const { data: webOrders, error } = await window.supabaseClient
                .from('orders')
                .select('*')
                .eq('status', 'Pendiente por Confirmar');

            if (error) throw error;

            // Map web orders to match logistics format
            const mappedWeb = (webOrders || []).map(o => ({
                id: o.id,
                date: o.createdAt,
                clientName: o.customerName,
                phone: o.customerPhone || '',
                address: o.customerAddress,
                city: `${o.customerCity}, ${o.customerDept}`,
                items: o.items,
                total: o.total,
                carrier: o.carrier || '',
                tracking_number: o.tracking_number || '',
                source: 'web',
                shippingType: o.shippingType || 'domicilio',
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
                <td>
                    <strong>${s.clientName || 'Cliente Genérico'}</strong><br>
                    <small style="color: var(--accent); font-weight: 600;"><i class="fas fa-phone"></i> ${s.phone || s.clientPhone || 'Sin teléfono'}</small>
                </td>
                <td>${s.city || '--'}</td>
                <td>
                    <span class="badge ${s.shippingType === 'oficina' ? 'bg-orange' : 'bg-blue'}" style="font-size: 0.65rem; margin-bottom: 4px;">
                        ${(s.shippingType || 'domicilio').toUpperCase()}
                    </span><br>
                    <small>${s.address || '--'}</small>
                </td>
                <td>${s.items.map(i => `${i.qty || i.quantity}x ${i.name}`).join('<br>')}</td>
                <td>$${(s.total || 0).toLocaleString()}</td>
                <td><span class="badge ${s.source === 'web' ? 'bg-blue' : 'bg-success'}">${s.source === 'web' ? 'WEB' : 'POS'}</span></td>
                <td>${s.carrier || '<span class="text-secondary">--</span>'}</td>
                <td>${s.tracking_number || '<span class="text-secondary">--</span>'}</td>
                <td class="table-actions" style="display: flex; gap: 5px;">
                    <button class="btn btn-sm btn-primary edit-logistic-btn" data-id="${s.id}">
                        <i class="fas fa-truck"></i> Despachar
                    </button>
                    ${s.source === 'web' ? `
                    <button class="btn btn-sm btn-danger cancel-web-order-btn" data-id="${s.id}" title="Cancelar Pedido" style="background-color: var(--danger); border-color: var(--danger);">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');
    },

    setupEventListeners() {
        const panel = document.getElementById('logistics-panel');
        if (!panel) return;

        // Use delegation for clicks AND submits
        panel.addEventListener('click', async (e) => {
            const editBtn = e.target.closest('.edit-logistic-btn');
            if (editBtn) {
                const saleId = editBtn.dataset.id;
                let sale = Storage.getById(STORAGE_KEYS.SALES, saleId);
                
                if (!sale) {
                    const pending = await this.getPendingShipments();
                    sale = pending.find(p => p.id === saleId);
                }

                if (sale) {
                    document.getElementById('logistic-sale-id').value = saleId;
                    document.getElementById('logistic-carrier').value = sale.carrier || '';
                    document.getElementById('logistic-tracking').value = sale.tracking_number || '';
                    
                    const webFields = document.getElementById('web-order-fields');
                    if (sale.source === 'web') {
                        webFields.style.display = 'block';
                        // Populate sellers
                        const sellersSel = document.getElementById('logistic-seller');
                        const sellers = Vendedores.getSellers().filter(s => s.status === 'active' || s.active !== false);
                        sellersSel.innerHTML = '<option value="">Asignar...</option>' + sellers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
                    } else {
                        webFields.style.display = 'none';
                    }
                    
                    document.getElementById('logistic-modal').classList.add('show');
                }
                return;
            }

            const cancelBtn = e.target.closest('.cancel-web-order-btn');
            if (cancelBtn) {
                const saleId = cancelBtn.dataset.id;
                if (!confirm(`¿Estás seguro de cancelar el pedido ${saleId}? Se eliminará de la lista.`)) return;

                try {
                    // 1. Update order status to 'Cancelado' in Supabase
                    const { error } = await window.supabaseClient
                        .from('orders')
                        .update({ status: 'Cancelado' })
                        .eq('id', saleId);
                    
                    if (error) throw error;

                    // 2. If it was partially created in tucompras_sales, delete it to clean stats
                    if (Storage.getById(STORAGE_KEYS.TUCOMPRAS_SALES, saleId)) {
                        await Storage.deleteItem(STORAGE_KEYS.TUCOMPRAS_SALES, saleId);
                    }

                    alert('Pedido cancelado exitosamente.');
                    
                    // 3. Re-render panel
                    const pending = await this.getPendingShipments();
                    this.updateListUI(pending);
                    
                    // Update main badge if function exists
                    if (window.updateLogisticsBadge) window.updateLogisticsBadge();

                } catch(err) {
                    console.error(err);
                    alert('Error al cancelar pedido: ' + err.message);
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
                    const isWeb = !sale;

                    if (isWeb) {
                        const pending = await this.getPendingShipments();
                        sale = pending.find(p => p.id === saleId);
                    }

                    if (sale) {
                        if (isWeb) {
                            const sellerId = document.getElementById('logistic-seller').value;
                            
                            if (!sellerId) { alert('Debes asignar un vendedor para pedidos web.'); return; }

                            // 1. Create TuCompras Sale record for stats
                            const tcSale = {
                                id: sale.id,
                                date: new Date().toISOString(),
                                customer_name: sale.clientName,
                                customer_phone: sale.original_order?.customerPhone,
                                seller_id: sellerId,
                                carrier: carrier,
                                tracking_number: tracking,
                                inventory_source: 'auto',
                                status: 'despachado',
                                shipping_cost: 0,
                                commission_paid: 0, // Will be calculated on confirm money or manual
                                items: sale.items.map(i => ({
                                    product_id: i.product_id,
                                    name: i.name,
                                    qty: i.qty || i.quantity,
                                    sale_price: i.price,
                                    cost_price: 0, // Will need manual sync later or check inventory
                                    warehouse_used: 'auto'
                                })),
                                money_confirmed: false,
                                is_paid_to_inventory: false
                            };
                            
                            // Try to get costs from inventory for better stats and auto-detect warehouse
                            for (const item of tcSale.items) {
                                const p = Inventory.getProducts().find(prod => prod.id === item.product_id);
                                if (p) {
                                    item.cost_price = p.priceWholesale || p.cost || 0;
                                    tcSale.commission_paid += (p.commissionBase || 0) * item.qty;
                                    
                                    // Auto-detect warehouse based on product company or stock availability
                                    let itemSource = p.company || 'both';
                                    if (itemSource === 'both') {
                                        if ((p.stockMillenio || 0) >= item.qty) {
                                            itemSource = 'millenio';
                                        } else if ((p.stockVulcano || 0) >= item.qty) {
                                            itemSource = 'vulcano';
                                        } else {
                                            itemSource = (p.stockMillenio || 0) >= (p.stockVulcano || 0) ? 'millenio' : 'vulcano';
                                        }
                                    }
                                    item.warehouse_used = itemSource;
                                }
                            }

                            // Summarize inventory sources used
                            const sourcesUsed = [...new Set(tcSale.items.map(i => i.warehouse_used).filter(Boolean))];
                            tcSale.inventory_source = sourcesUsed.join(', ') || 'auto';

                            // 1. Save TuCompras Sale record (Idempotent: update if already exists)
                            const existingSale = Storage.getById(STORAGE_KEYS.TUCOMPRAS_SALES, tcSale.id);
                            if (existingSale) {
                                await Storage.updateItem(STORAGE_KEYS.TUCOMPRAS_SALES, tcSale.id, tcSale);
                            } else {
                                await Storage.addItem(STORAGE_KEYS.TUCOMPRAS_SALES, tcSale);
                            }

                            // 2. Discount Inventory (only if not already dispatched previously)
                            if (!existingSale) {
                                for (const item of tcSale.items) {
                                    const p = Inventory.getProducts().find(prod => prod.id === item.product_id);
                                    if (p) {
                                        if (item.warehouse_used === 'millenio') {
                                            p.stockMillenio = Math.max(0, (p.stockMillenio || 0) - item.qty);
                                        } else {
                                            p.stockVulcano = Math.max(0, (p.stockVulcano || 0) - item.qty);
                                        }
                                        await Storage.updateItem(STORAGE_KEYS.PRODUCTS, p.id, p);
                                    }
                                }
                            }

                            // 3. Update Web Order in Supabase
                            const { error } = await window.supabaseClient
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
                        alert('✅ Despacho registrado y sincronizado.');

                        const modal = document.getElementById('logistic-modal');
                        if (modal) modal.classList.remove('show');

                        if (window.updateLogisticsBadge) window.updateLogisticsBadge();

                        setTimeout(() => this.renderPanel(), 100);
                    }
                } catch (err) {
                    alert('Error al actualizar despacho: ' + err.message);
                }
            }
        });
    }
};
