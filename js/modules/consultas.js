// ========================================================
// CONSULTAS MODULE – Historial y reportes
// Tabs: Pagos Millenio | Pagos Vulcano | Comisiones Pagadas | Ventas Históricas
// ========================================================
window.Consultas = {
    activeTab: 'millenio',

    init() {
        this.renderPanel();
    },

    renderPanel() {
        const contentArea = document.getElementById('content-area');
        if (!document.getElementById('consultas-panel')) {
            const panel = document.createElement('div');
            panel.id = 'consultas-panel';
            panel.className = 'panel';
            contentArea.appendChild(panel);
        }

        const panel = document.getElementById('consultas-panel');
        panel.innerHTML = `
            <div class="panel-header">
                <h1><i class="fas fa-search" style="color: var(--accent);"></i> Consultas e Historial</h1>
            </div>

            <!-- Tab Bar -->
            <div class="inventory-tabs" style="margin-bottom: 2rem;">
                <div style="display:flex; gap: 0.75rem; flex-wrap: wrap;">
                    <button class="tab-btn ${this.activeTab === 'millenio' ? 'active' : ''}" data-tab="millenio">
                        <i class="fas fa-box"></i> Pagos a MILLENIO
                    </button>
                    <button class="tab-btn ${this.activeTab === 'vulcano' ? 'active' : ''}" data-tab="vulcano">
                        <i class="fas fa-box"></i> Pagos a VULCANO
                    </button>
                    <button class="tab-btn ${this.activeTab === 'commissions' ? 'active' : ''}" data-tab="commissions">
                        <i class="fas fa-hand-holding-usd"></i> Comisiones Pagadas
                    </button>
                    <button class="tab-btn ${this.activeTab === 'sales' ? 'active' : ''}" data-tab="sales">
                        <i class="fas fa-history"></i> Ventas Históricas
                    </button>
                </div>
            </div>

            <!-- Content Area -->
            <div id="consultas-content">
                <!-- dynamically rendered -->
            </div>
        `;

        this.renderTab();
        this.setupEventListeners();
    },

    renderTab() {
        const content = document.getElementById('consultas-content');
        if (!content) return;
        switch (this.activeTab) {
            case 'millenio': this.renderInventoryPayments(content, 'millenio'); break;
            case 'vulcano': this.renderInventoryPayments(content, 'vulcano'); break;
            case 'commissions': this.renderCommissionHistory(content); break;
            case 'sales': this.renderSalesHistory(content); break;
        }
    },

    // ── PAGOS A INVENTARIO (Millenio / Vulcano) ─────────────────────────
    renderInventoryPayments(container, source) {
        const tcSales = Storage.get(STORAGE_KEYS.TUCOMPRAS_SALES) || [];
        const paid = tcSales.filter(s =>
            s.inventory_source === source &&
            s.is_paid_to_inventory === true
        );

        const totalPaid = paid.reduce((sum, s) => {
            const cost = s.items
                ? s.items.reduce((ss, i) => ss + (parseFloat(i.cost_price || 0) * (i.qty || 1)), 0)
                : parseFloat(s.cost_price || 0);
            return sum + cost;
        }, 0);

        const label = source === 'millenio' ? 'MILLENIO' : 'VULCANO';
        const color = source === 'millenio' ? '#3b82f6' : '#f59e0b';

        container.innerHTML = `
            <div class="stats-grid" style="margin-bottom: 1.5rem;">
                <div class="stat-card" style="border-left: 3px solid ${color};">
                    <h3>Total Pagado a ${label}</h3>
                    <p class="stat-value" style="color: ${color};">$${totalPaid.toLocaleString()}</p>
                    <span class="stat-label">${paid.length} pagos registrados</span>
                </div>
            </div>

            <!-- Filters -->
            <div class="search-filter-row" style="margin-bottom: 1rem; flex-wrap: wrap; gap: 10px;">
                <input type="text" id="q-inv-search" class="form-control" placeholder="Buscar por cliente o producto..." style="max-width: 280px;">
                <input type="month" id="q-inv-month" class="form-control" style="max-width: 160px;">
            </div>

            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Fecha Pago Inventario</th>
                            <th>Cliente</th>
                            <th>Productos</th>
                            <th>Transportadora</th>
                            <th>Guía</th>
                            <th class="text-right">Costo Pagado</th>
                        </tr>
                    </thead>
                    <tbody id="inv-payments-list">
                        ${this.buildInventoryRows(paid, source)}
                    </tbody>
                </table>
            </div>
        `;

        // Live filter
        const search = document.getElementById('q-inv-search');
        const monthFilter = document.getElementById('q-inv-month');
        const refilter = () => {
            const q = (search?.value || '').toLowerCase();
            const m = monthFilter?.value || '';
            let rows = paid;
            if (q) rows = rows.filter(s => {
                const productNames = s.items ? s.items.map(i => i.name).join(' ') : (s.product_name || '');
                return (s.customer_name || '').toLowerCase().includes(q) || productNames.toLowerCase().includes(q);
            });
            if (m) rows = rows.filter(s => {
                const dateField = s.inventory_paid_at || s.date;
                return dateField && dateField.startsWith(m);
            });
            document.getElementById('inv-payments-list').innerHTML = this.buildInventoryRows(rows, source);
        };
        search?.addEventListener('input', refilter);
        monthFilter?.addEventListener('change', refilter);
    },

    buildInventoryRows(rows, source) {
        if (rows.length === 0) return `<tr><td colspan="6" class="text-center text-secondary" style="padding:2rem;">No hay pagos registrados a ${source === 'millenio' ? 'MILLENIO' : 'VULCANO'}.</td></tr>`;
        return rows.map(s => {
            const cost = s.items
                ? s.items.reduce((ss, i) => ss + (parseFloat(i.cost_price || 0) * (i.qty || 1)), 0)
                : parseFloat(s.cost_price || 0);
            const dateStr = s.inventory_paid_at
                ? new Date(s.inventory_paid_at).toLocaleDateString()
                : (s.date ? new Date(s.date).toLocaleDateString() : '—');

            const productNames = s.items ? s.items.map(i => `${i.qty}x ${i.name}`).join(', ') : (s.product_name || '—');
            return `
                <tr>
                    <td>${dateStr}</td>
                    <td>${s.customer_name || '—'}</td>
                    <td style="font-size: 0.8rem; color: var(--text-secondary);">${productNames}</td>
                    <td>${s.carrier || '—'}</td>
                    <td>${s.tracking_number ? `<a href="${this.getTrackingUrl(s.carrier, s.tracking_number)}" target="_blank" style="color: var(--accent);">${s.tracking_number}</a>` : '—'}</td>
                    <td class="text-right"><strong>$${cost.toLocaleString()}</strong></td>
                </tr>
            `;
        }).join('');
    },

    // ── COMISIONES PAGADAS ───────────────────────────────────────────────
    renderCommissionHistory(container) {
        const tcSales = Storage.get(STORAGE_KEYS.TUCOMPRAS_SALES) || [];
        const sellers = Storage.get(STORAGE_KEYS.SELLERS) || [];
        const paid = tcSales.filter(s => s.is_commission_paid === true);

        const totalPaid = paid.reduce((sum, s) => sum + (parseFloat(s.commission_paid) || 0), 0);

        container.innerHTML = `
            <div class="stats-grid" style="margin-bottom: 1.5rem;">
                <div class="stat-card" style="border-left: 3px solid #10b981;">
                    <h3>Total Comisiones Pagadas</h3>
                    <p class="stat-value" style="color: #10b981;">$${totalPaid.toLocaleString()}</p>
                    <span class="stat-label">${paid.length} liquidaciones</span>
                </div>
            </div>

            <!-- Filters -->
            <div class="search-filter-row" style="margin-bottom: 1rem; gap: 10px; flex-wrap: wrap;">
                <select id="q-comm-seller" class="form-control" style="max-width: 200px;">
                    <option value="all">Todos los vendedores</option>
                    ${sellers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                </select>
                <input type="month" id="q-comm-month" class="form-control" style="max-width: 160px;">
            </div>

            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Fecha Pago Comisión</th>
                            <th>Fecha Ingreso $</th>
                            <th>Vendedor</th>
                            <th>Cliente</th>
                            <th>Productos</th>
                            <th class="text-right">Comisión</th>
                        </tr>
                    </thead>
                    <tbody id="comm-history-list">
                        ${this.buildCommissionRows(paid, sellers)}
                    </tbody>
                </table>
            </div>
        `;

        const sellerFilter = document.getElementById('q-comm-seller');
        const monthFilter = document.getElementById('q-comm-month');
        const refilter = () => {
            let rows = paid;
            const sellerId = sellerFilter?.value || 'all';
            const m = monthFilter?.value || '';
            if (sellerId !== 'all') rows = rows.filter(s => s.seller_id === sellerId);
            if (m) rows = rows.filter(s => {
                const d = s.commission_paid_at || s.date;
                return d && d.startsWith(m);
            });
            document.getElementById('comm-history-list').innerHTML = this.buildCommissionRows(rows, sellers);
        };
        sellerFilter?.addEventListener('change', refilter);
        monthFilter?.addEventListener('change', refilter);
    },

    buildCommissionRows(rows, sellers) {
        if (rows.length === 0) return `<tr><td colspan="6" class="text-center text-secondary" style="padding:2rem;">No hay comisiones liquidadas aún.</td></tr>`;
        return rows.map(s => {
            const seller = sellers.find(sel => sel.id === s.seller_id);
            const commission = parseFloat(s.commission_paid) || 0;
            const paidAt = s.commission_paid_at ? new Date(s.commission_paid_at).toLocaleDateString() : '—';
            const moneyAt = s.money_confirmed_at ? new Date(s.money_confirmed_at).toLocaleDateString() : '—';
            const productNames = s.items ? s.items.map(i => `${i.qty}x ${i.name}`).join(', ') : (s.product_name || '—');
            return `
                <tr>
                    <td>${paidAt}</td>
                    <td>${moneyAt}</td>
                    <td><strong>${seller ? seller.name : 'Desconocido'}</strong></td>
                    <td>${s.customer_name || '—'}</td>
                    <td style="font-size: 0.8rem; color: var(--text-secondary);">${productNames}</td>
                    <td class="text-right"><strong style="color: #10b981;">$${commission.toLocaleString()}</strong></td>
                </tr>
            `;
        }).join('');
    },

    // ── VENTAS HISTÓRICAS ────────────────────────────────────────────────
    renderSalesHistory(container) {
        const tcSales = Storage.get(STORAGE_KEYS.TUCOMPRAS_SALES) || [];

        container.innerHTML = `
            <!-- Filters -->
            <div class="search-filter-row" style="margin-bottom: 1rem; flex-wrap: wrap; gap: 10px;">
                <input type="text" id="q-sales-search" class="form-control" placeholder="Buscar por cliente, producto, guía..." style="max-width: 280px;">
                <input type="month" id="q-sales-month" class="form-control" style="max-width: 160px;">
                <select id="q-sales-carrier" class="form-control" style="max-width: 180px;">
                    <option value="all">Todas las transportadoras</option>
                    ${[...new Set(tcSales.filter(s => s.carrier).map(s => s.carrier))].map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
                <select id="q-sales-status" class="form-control" style="max-width: 170px;">
                    <option value="all">Todos los estados</option>
                    <option value="despachado">Despachado</option>
                    <option value="recibido">Entregado</option>
                    <option value="proceso_devolucion">En Dev.</option>
                    <option value="devolucion_recibida">Devuelto</option>
                </select>
            </div>

            <div id="q-sales-summary" style="margin-bottom: 1rem; font-size: 0.85rem; color: var(--text-secondary);"></div>

            <div class="table-container">
                <table class="data-table" style="font-size: 0.82rem;">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Cliente</th>
                            <th>Productos</th>
                            <th>Transportadora</th>
                            <th>Guía</th>
                            <th>Estado</th>
                            <th class="text-right">Precio Venta</th>
                            <th class="text-right">Comisión</th>
                        </tr>
                    </thead>
                    <tbody id="sales-history-list">
                        ${this.buildSalesRows(tcSales)}
                    </tbody>
                </table>
            </div>
        `;

        this.updateSalesSummary(tcSales);

        const search = document.getElementById('q-sales-search');
        const monthF = document.getElementById('q-sales-month');
        const carrierF = document.getElementById('q-sales-carrier');
        const statusF = document.getElementById('q-sales-status');

        const refilter = () => {
            const q = (search?.value || '').toLowerCase();
            const m = monthF?.value || '';
            const ca = carrierF?.value || 'all';
            const st = statusF?.value || 'all';
            let rows = tcSales;
            if (q) rows = rows.filter(s => {
                const products = s.items ? s.items.map(i => i.name).join(' ') : (s.product_name || '');
                return (s.customer_name || '').toLowerCase().includes(q)
                    || products.toLowerCase().includes(q)
                    || (s.tracking_number || '').toLowerCase().includes(q);
            });
            if (m) rows = rows.filter(s => s.date && s.date.startsWith(m));
            if (ca !== 'all') rows = rows.filter(s => s.carrier === ca);
            if (st !== 'all') rows = rows.filter(s => s.status === st);
            document.getElementById('sales-history-list').innerHTML = this.buildSalesRows(rows);
            this.updateSalesSummary(rows);
        };

        search?.addEventListener('input', refilter);
        monthF?.addEventListener('change', refilter);
        carrierF?.addEventListener('change', refilter);
        statusF?.addEventListener('change', refilter);
    },

    updateSalesSummary(rows) {
        const el = document.getElementById('q-sales-summary');
        if (!el) return;
        const totalSale = rows.reduce((sum, s) => {
            return sum + (s.items ? s.items.reduce((ss, i) => ss + (parseFloat(i.sale_price || 0) * (i.qty || 1)), 0) : parseFloat(s.sale_price || 0));
        }, 0);
        const totalComm = rows.reduce((sum, s) => sum + (parseFloat(s.commission_paid) || 0), 0);
        el.innerHTML = `<strong>${rows.length}</strong> resultados · Valor total: <strong style="color:var(--success);">$${totalSale.toLocaleString()}</strong> · Comisiones: <strong style="color:var(--warning);">$${totalComm.toLocaleString()}</strong>`;
    },

    buildSalesRows(rows) {
        if (rows.length === 0) return `<tr><td colspan="8" class="text-center text-secondary" style="padding:2rem;">Sin resultados para los filtros aplicados.</td></tr>`;
        const statusLabel = { despachado: '🚚 Despachado', recibido: '✅ Entregado', proceso_devolucion: '↩️ En Dev.', devolucion_recibida: '📦 Devuelto' };
        const statusColor = { despachado: '#3b82f6', recibido: '#10b981', proceso_devolucion: '#f59e0b', devolucion_recibida: '#ef4444' };
        return rows.map(s => {
            const saleTotal = s.items ? s.items.reduce((ss, i) => ss + (parseFloat(i.sale_price || 0) * (i.qty || 1)), 0) : parseFloat(s.sale_price || 0);
            const commission = parseFloat(s.commission_paid) || 0;
            const productNames = s.items ? s.items.map(i => `${i.qty}x ${i.name}`).join(', ') : (s.product_name || '—');
            const trackingUrl = s.carrier && s.tracking_number ? this.getTrackingUrl(s.carrier, s.tracking_number) : null;
            const color = statusColor[s.status] || '#888';
            return `
                <tr>
                    <td>${s.date ? new Date(s.date).toLocaleDateString() : '—'}</td>
                    <td>${s.customer_name || '—'}</td>
                    <td style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${productNames}">${productNames}</td>
                    <td>${s.carrier || '—'}</td>
                    <td>${trackingUrl ? `<a href="${trackingUrl}" target="_blank" style="color:var(--accent);">${s.tracking_number}</a>` : (s.tracking_number || '—')}</td>
                    <td><span class="badge" style="background: ${color}22; color: ${color};">${statusLabel[s.status] || s.status}</span></td>
                    <td class="text-right"><strong>$${saleTotal.toLocaleString()}</strong></td>
                    <td class="text-right" style="color: var(--warning);">$${commission.toLocaleString()}</td>
                </tr>
            `;
        }).join('');
    },

    // ── HELPERS ─────────────────────────────────────────────────────────
    getTrackingUrl(carrier, number) {
        if (!carrier || !number) return '#';
        const c = carrier.toLowerCase();
        if (c.includes('servientrega')) return `https://www.servientrega.com/rastreo/?guia=${number}`;
        if (c.includes('coordinadora')) return `https://www.coordinadora.com/portafolio-de-servicios/servicios-en-linea/rastrear-guias/?guia=${number}`;
        if (c.includes('envia')) return `https://www.envia.com.co/rastreo?numero=${number}`;
        if (c.includes('deprisa')) return `https://www.deprisa.com/rastreo?guia=${number}`;
        if (c.includes('tcc')) return `https://www.tcc.com.co/rastreo?guia=${number}`;
        if (c.includes('interrapidisimo')) return `https://www.interrapidisimo.com/rastreos/?guia=${number}`;
        if (c.includes('fedex')) return `https://www.fedex.com/fedextrack/?trknbr=${number}`;
        return `https://www.google.com/search?q=${encodeURIComponent(carrier)}+rastreo+guia+${number}`;
    },

    setupEventListeners() {
        const panel = document.getElementById('consultas-panel');
        if (!panel) return;

        panel.onclick = (e) => {
            const tabBtn = e.target.closest('.tab-btn');
            if (tabBtn && tabBtn.dataset.tab) {
                this.activeTab = tabBtn.dataset.tab;
                this.renderPanel();
            }
        };
    }
};
