// Vendedores Module
window.Vendedores = {
    editingId: null,
    activeTab: 'summary', // 'summary' or 'settlements'

    init() {
        this.renderPanel();
    },

    getSellers() {
        return Storage.get(STORAGE_KEYS.SELLERS);
    },

    async addSeller(seller) {
        return await Storage.addItem(STORAGE_KEYS.SELLERS, seller);
    },

    async updateSeller(id, seller) {
        return await Storage.updateItem(STORAGE_KEYS.SELLERS, id, seller);
    },

    renderPanel() {
        const contentArea = document.getElementById('content-area');
        if (!document.getElementById('vendedores-panel')) {
            const panel = document.createElement('div');
            panel.id = 'vendedores-panel';
            panel.className = 'panel';
            contentArea.appendChild(panel);
        }

        const panel = document.getElementById('vendedores-panel');
        panel.innerHTML = `
            <div class="panel-header">
                <h1>Gestión de Vendedores</h1>
                <div class="actions">
                    <button id="add-seller-btn" class="btn btn-primary">Nuevo Vendedor</button>
                </div>
            </div>

            <div class="inventory-tabs" style="margin-bottom: 2rem;">
                <div style="display:flex; gap: 1rem;">
                    <button class="tab-btn ${this.activeTab === 'summary' ? 'active' : ''}" data-tab="summary">Listado de Vendedores</button>
                    <button class="tab-btn ${this.activeTab === 'settlements' ? 'active' : ''}" data-tab="settlements">💰 Liquidación de Comisiones</button>
                </div>
            </div>

            <div id="vendedores-summary-view" style="display: ${this.activeTab === 'summary' ? 'block' : 'none'};">
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Teléfono</th>
                                <th>Estado</th>
                                <th>Campaña Activa</th>
                                <th>Meta Cumplida</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="sellers-list">
                            <!-- Sellers will be loaded here -->
                        </tbody>
                    </table>
                </div>
            </div>

            <div id="vendedores-settlements-view" style="display: ${this.activeTab === 'settlements' ? 'block' : 'none'};">
                <div class="search-filter-row" style="margin-bottom: 1.5rem; justify-content: space-between;">
                    <div style="display:flex; gap: 10px; align-items: center;">
                        <label>Vendedor:</label>
                        <select id="comm-seller-filter" class="form-control" style="width: 200px;">
                            <option value="all">Todos los vendedores</option>
                            ${this.getSellers().map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                        </select>
                        <label>Mes:</label>
                        <input type="month" id="comm-month-filter" class="form-control" value="${new Date().toISOString().substring(0, 7)}">
                    </div>
                    <button id="comm-batch-pay-btn" class="btn btn-success" disabled>
                        <i class="fas fa-check-double"></i> Pagar Seleccionados (<span id="comm-selected-total">$0</span>)
                    </button>
                </div>

                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th><input type="checkbox" id="comm-select-all"></th>
                                <th>Fecha Ingreso $</th>
                                <th>Vendedor</th>
                                <th>Cliente</th>
                                <th>Estado</th>
                                <th>Comisión</th>
                                <th>Confirmado</th>
                            </tr>
                        </thead>
                        <tbody id="commission-list">
                            <!-- Commissions list -->
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Seller Modal -->
            <div id="seller-modal" class="modal">
                <div class="modal-content" style="max-width: 450px;">
                    <div class="modal-header">
                        <h2 id="seller-modal-title">Nuevo Vendedor</h2>
                        <span class="close-modal">&times;</span>
                    </div>
                    <div class="modal-body">
                        <form id="seller-form">
                            <input type="hidden" name="id" id="seller-id">
                            <div class="form-grid">
                                <div class="form-group" style="grid-column: span 2;">
                                    <label>Nombre Completo</label>
                                    <input type="text" name="name" required class="form-control">
                                </div>
                                <div class="form-group" style="grid-column: span 2;">
                                    <label>Teléfono / Celular</label>
                                    <input type="text" name="phone" required class="form-control">
                                </div>
                                <div class="form-group" style="grid-column: span 2;">
                                    <label>Estado</label>
                                    <select name="status" class="form-control">
                                        <option value="active">Activo</option>
                                        <option value="inactive">Inactivo</option>
                                    </select>
                                </div>
                            </div>
                            <button type="submit" class="btn btn-primary btn-block" style="margin-top: 1.5rem;">Guardar Vendedor</button>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Campaigns Modal -->
            <div id="campaign-modal" class="modal">
                <div class="modal-content" style="max-width: 700px;">
                    <div class="modal-header">
                        <h2 id="campaign-modal-title">Campañas y Metas</h2>
                        <span class="close-modal">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div id="campaign-list-container" style="margin-bottom: 2rem;">
                            <!-- List of campaigns -->
                        </div>
                        <hr>
                        <h3>Nueva Campaña</h3>
                        <p class="text-secondary" style="font-size: 0.8rem; margin-bottom: 1rem;">
                            Si no ingresas "Fecha Fin", la campaña será indefinida y la meta se calculará como <strong>diaria</strong>.
                        </p>
                        <form id="campaign-form">
                            <input type="hidden" name="seller_id" id="campaign-seller-id">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Fecha Inicio</label>
                                    <input type="date" name="start_date" required class="form-control" value="${new Date().toISOString().split('T')[0]}">
                                </div>
                                <div class="form-group">
                                    <label>Fecha Fin (Opcional)</label>
                                    <input type="date" name="end_date" class="form-control">
                                </div>
                                <div class="form-group">
                                    <label>Tipo de Meta</label>
                                    <select name="goal_type" class="form-control" required>
                                        <option value="daily_qty">Productos Diarios</option>
                                        <option value="total_qty">Productos Totales (Periodo)</option>
                                        <option value="total_value">Valor Ventas Totales ($)</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Valor de la Meta</label>
                                    <input type="number" name="goal_value" required class="form-control">
                                </div>
                            </div>
                            <button type="submit" class="btn btn-success btn-block" style="margin-top: 1rem;">Activar Campaña</button>
                        </form>
                    </div>
                </div>
            </div>
        `;

        this.activeTab === 'summary' ? this.updateSellersList() : this.updateCommissionList();
        this.setupEventListeners();
    },

    updateCommissionList() {
        const list = document.getElementById('commission-list');
        if (!list) return;

        const sellerId = document.getElementById('comm-seller-filter')?.value || 'all';
        const month = document.getElementById('comm-month-filter')?.value || '';
        const sales = Storage.get(STORAGE_KEYS.TUCOMPRAS_SALES) || [];
        const sellers = this.getSellers();

        // Eligibility: recibida, money_confirmed=true, is_commission_paid != true
        let filtered = sales.filter(s =>
            s.status === 'recibido' &&
            s.money_confirmed === true &&
            s.is_commission_paid !== true
        );

        if (sellerId !== 'all') {
            filtered = filtered.filter(s => s.seller_id === sellerId);
        }

        if (month) {
            filtered = filtered.filter(s => s.date.startsWith(month));
        }

        list.innerHTML = filtered.map(s => {
            const seller = sellers.find(sel => sel.id === s.seller_id);
            const commission = parseFloat(s.commission_paid) || 0;
            const moneyDate = s.money_confirmed_at
                ? new Date(s.money_confirmed_at).toLocaleDateString()
                : (s.date ? new Date(s.date).toLocaleDateString() + ' *' : 'N/A');
            return `
                <tr>
                    <td><input type="checkbox" class="comm-check" data-id="${s.id}" data-amount="${commission}"></td>
                    <td>${moneyDate}</td>
                    <td><strong>${seller ? seller.name : 'Vendedor Desconocido'}</strong></td>
                    <td>${s.customer_name || 'N/A'}</td>
                    <td><span class="badge bg-success">Entregado</span></td>
                    <td class="text-right"><strong>$${commission.toLocaleString()}</strong></td>
                    <td><span class="badge" style="background: #10b98122; color: #10b981;"><i class="fas fa-check"></i> Sí</span></td>
                </tr>
            `;
        }).join('');

        if (filtered.length === 0) {
            list.innerHTML = '<tr><td colspan="7" class="text-center text-secondary" style="padding: 2rem;">No hay comisiones pendientes de liquidar para los criterios seleccionados.</td></tr>';
        }

        this.updateSelectedCommTotal();
    },

    updateSelectedCommTotal() {
        const checks = document.querySelectorAll('.comm-check:checked');
        const btn = document.getElementById('comm-batch-pay-btn');
        const totalText = document.getElementById('comm-selected-total');

        let total = 0;
        checks.forEach(c => total += parseFloat(c.dataset.amount) || 0);

        if (totalText) totalText.textContent = `$${total.toLocaleString()}`;
        if (btn) btn.disabled = checks.length === 0;
    },

    async processBatchCommissionPayment() {
        const checks = document.querySelectorAll('.comm-check:checked');
        if (checks.length === 0) return;

        if (!confirm(`¿Confirmas el pago de comisiones por un total de ${document.getElementById('comm-selected-total').textContent}?`)) return;

        const sales = Storage.get(STORAGE_KEYS.TUCOMPRAS_SALES) || [];
        const idsToPay = Array.from(checks).map(c => c.dataset.id);

        for (const id of idsToPay) {
            const sale = sales.find(s => s.id === id);
            if (sale) {
                sale.is_commission_paid = true;
                sale.commission_paid_at = new Date().toISOString();
                await Storage.updateItem(STORAGE_KEYS.TUCOMPRAS_SALES, id, sale);
            }
        }

        alert('¡Comisiones liquidadas exitosamente!');
        this.updateCommissionList();
    },

    updateSellersList() {
        const sellers = this.getSellers();
        const list = document.getElementById('sellers-list');
        if (!list) return;

        if (sellers.length === 0) {
            list.innerHTML = '<tr><td colspan="6" class="text-center">No hay vendedores registrados</td></tr>';
            return;
        }

        const campaigns = Storage.get(STORAGE_KEYS.CAMPAIGNS) || [];
        const tucomprasSales = Storage.get(STORAGE_KEYS.TUCOMPRAS_SALES) || [];
        const now = new Date();
        now.setHours(23, 59, 59, 999);

        list.innerHTML = sellers.map(s => {
            const activeCampaign = campaigns.find(c => {
                if (c.seller_id !== s.id || c.status === 'ended') return false;
                const start = new Date(c.start_date + 'T00:00:00');
                if (c.end_date) {
                    const end = new Date(c.end_date + 'T23:59:59');
                    return now >= start && now <= end;
                }
                return now >= start; // Open-ended
            });

            let fulfillment = 'N/A';
            if (activeCampaign) {
                const salesInPeriod = tucomprasSales.filter(sale => {
                    const saleDate = new Date(sale.date);
                    const start = new Date(activeCampaign.start_date + 'T00:00:00');
                    if (activeCampaign.end_date) {
                        const end = new Date(activeCampaign.end_date + 'T23:59:59');
                        return sale.seller_id === s.id && sale.status === 'recibido' && saleDate >= start && saleDate <= end;
                    }
                    return sale.seller_id === s.id && sale.status === 'recibido' && saleDate >= start;
                });

                if (activeCampaign.goal_type === 'total_qty') {
                    fulfillment = `${salesInPeriod.length} / ${activeCampaign.goal_value}`;
                } else if (activeCampaign.goal_type === 'total_value') {
                    const totalVal = salesInPeriod.reduce((sum, sale) => sum + parseFloat(sale.sale_price || 0), 0);
                    fulfillment = `$${totalVal.toLocaleString()} / $${parseFloat(activeCampaign.goal_value).toLocaleString()}`;
                } else {
                    const start = new Date(activeCampaign.start_date + 'T00:00:00');
                    const days = Math.max(1, Math.ceil((new Date() - start) / (1000 * 60 * 60 * 24)));
                    fulfillment = `${(salesInPeriod.length / days).toFixed(1)} / ${activeCampaign.goal_value} día`;
                }
            }

            return `
                <tr class="${s.status === 'inactive' ? 'inactive-row' : ''}">
                    <td><strong>${s.name}</strong></td>
                    <td>${s.phone || '-'}</td>
                    <td>
                        <span class="status-badge ${s.status}">
                            ${s.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                    </td>
                    <td>${activeCampaign ? `<span class="badge bg-blue">Activa (${activeCampaign.end_date ? 'Período' : 'Día'})</span>` : '<span class="text-secondary">Ninguna</span>'}</td>
                    <td><strong>${fulfillment}</strong></td>
                    <td class="table-actions">
                        <button class="btn btn-sm btn-outline campaign-btn" data-id="${s.id}"><i class="fas fa-bullseye"></i> Campañas</button>
                        <button class="icon-btn edit-seller-btn" data-id="${s.id}"><i class="fas fa-edit"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    setupEventListeners() {
        const panel = document.getElementById('vendedores-panel');
        if (!panel) return;

        panel.onclick = (e) => {
            // Tab system
            const tabBtn = e.target.closest('.tab-btn');
            if (tabBtn && tabBtn.dataset.tab) {
                this.activeTab = tabBtn.dataset.tab;
                this.renderPanel();
                return;
            }

            if (e.target.id === 'add-seller-btn') {
                this.editingId = null;
                document.getElementById('seller-modal-title').textContent = 'Nuevo Vendedor';
                document.getElementById('seller-form').reset();
                document.getElementById('seller-modal').classList.add('show');
                return;
            }

            // Commission list handlers
            if (e.target.id === 'comm-select-all') {
                const checks = panel.querySelectorAll('.comm-check');
                checks.forEach(c => c.checked = e.target.checked);
                this.updateSelectedCommTotal();
                return;
            }

            if (e.target.classList.contains('comm-check')) {
                this.updateSelectedCommTotal();
                return;
            }

            if (e.target.id === 'comm-batch-pay-btn') {
                this.processBatchCommissionPayment();
                return;
            }

            const editBtn = e.target.closest('.edit-seller-btn');
            if (editBtn) {
                this.editingId = editBtn.dataset.id;
                const seller = this.getSellers().find(s => s.id === this.editingId);
                document.getElementById('seller-modal-title').textContent = 'Editar Vendedor';
                const form = document.getElementById('seller-form');
                form.elements['name'].value = seller.name;
                form.elements['phone'].value = seller.phone || '';
                form.elements['status'].value = seller.status;
                document.getElementById('seller-modal').classList.add('show');
                return;
            }

            const campaignBtn = e.target.closest('.campaign-btn');
            if (campaignBtn) {
                this.openCampaignModal(campaignBtn.dataset.id);
                return;
            }

            const endBtn = e.target.closest('#btn-end-campaign');
            if (endBtn) {
                this.endCampaign(endBtn.dataset.id);
                return;
            }

            if (e.target.classList.contains('close-modal')) {
                document.querySelectorAll('.modal').forEach(m => m.classList.remove('show'));
                return;
            }
        };

        panel.onchange = (e) => {
            if (e.target.id === 'comm-seller-filter' || e.target.id === 'comm-month-filter') {
                this.updateCommissionList();
            }
        };

        const sellerForm = document.getElementById('seller-form');
        if (sellerForm) {
            sellerForm.onsubmit = async (e) => {
                e.preventDefault();
                const formData = new FormData(sellerForm);
                const sellerData = {
                    name: formData.get('name'),
                    phone: formData.get('phone'),
                    status: formData.get('status')
                };

                if (this.editingId) {
                    await this.updateSeller(this.editingId, sellerData);
                } else {
                    await this.addSeller(sellerData);
                }

                document.getElementById('seller-modal').classList.remove('show');
                this.updateSellersList();
                alert('Vendedor guardado');
            };
        }

        const campaignForm = document.getElementById('campaign-form');
        if (campaignForm) {
            campaignForm.onsubmit = async (e) => {
                e.preventDefault();
                const formData = new FormData(campaignForm);
                const campaignData = {
                    seller_id: formData.get('seller_id'),
                    start_date: formData.get('start_date'),
                    end_date: formData.get('end_date') || null,
                    goal_type: formData.get('goal_type'),
                    goal_value: parseFloat(formData.get('goal_value')),
                    status: 'active'
                };

                await Storage.addItem(STORAGE_KEYS.CAMPAIGNS, campaignData);
                this.openCampaignModal(campaignData.seller_id);
                this.updateSellersList();
                alert('Campaña activada');
            };
        }
    },

    async endCampaign(id) {
        if (!confirm('¿Seguro que deseas finalizar esta campaña manualmente?')) return;
        const campaigns = Storage.get(STORAGE_KEYS.CAMPAIGNS) || [];
        const index = campaigns.findIndex(c => c.id === id);
        if (index !== -1) {
            campaigns[index].status = 'ended';
            campaigns[index].end_date = new Date().toISOString().split('T')[0];
            await Storage.updateItem(STORAGE_KEYS.CAMPAIGNS, id, campaigns[index]);
            const sellerId = campaigns[index].seller_id;
            this.openCampaignModal(sellerId);
            this.updateSellersList();
        }
    },

    openCampaignModal(sellerId) {
        document.getElementById('campaign-seller-id').value = sellerId;
        const campaigns = (Storage.get(STORAGE_KEYS.CAMPAIGNS) || []).filter(c => c.seller_id === sellerId);
        const container = document.getElementById('campaign-list-container');
        const now = new Date();

        if (campaigns.length === 0) {
            container.innerHTML = '<p class="text-secondary text-center">No hay campañas registradas para este vendedor</p>';
        } else {
            container.innerHTML = `
                <table class="data-table" style="font-size: 0.85rem;">
                    <thead>
                        <tr>
                            <th>Periodo</th>
                            <th>Meta</th>
                            <th>Estado</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${campaigns.sort((a, b) => new Date(b.start_date) - new Date(a.start_date)).map(c => {
                const isEnded = c.status === 'ended';
                const hasExpired = c.end_date && now > new Date(c.end_date + 'T23:59:59');
                const isActive = !isEnded && !hasExpired;

                return `
                                <tr>
                                    <td>${c.start_date} al ${c.end_date || 'Indefinida'}</td>
                                    <td>${c.goal_value} (${c.goal_type})</td>
                                    <td>
                                        <span class="badge ${isActive ? 'bg-success' : 'bg-secondary'}">
                                            ${isActive ? 'Activa' : (isEnded ? 'Cerrada' : 'Expirada')}
                                        </span>
                                    </td>
                                    <td>
                                        ${isActive ? `<button class="btn btn-sm btn-outline-danger" id="btn-end-campaign" data-id="${c.id}">Finalizar</button>` : ''}
                                    </td>
                                </tr>
                            `;
            }).join('')}
                    </tbody>
                </table>
            `;
        }

        document.getElementById('campaign-modal').classList.add('show');
    }
};
