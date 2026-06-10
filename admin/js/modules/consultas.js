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
                        <i class="fas fa-globe"></i> Ventas Externas (Drop)
                    </button>
                    <button class="tab-btn ${this.activeTab === 'local_sales' ? 'active' : ''}" data-tab="local_sales">
                        <i class="fas fa-store"></i> Ventas Locales (POS)
                    </button>
                    <button class="tab-btn ${this.activeTab === 'abonos_recibidos' ? 'active' : ''}" data-tab="abonos_recibidos">
                        <i class="fas fa-hand-holding-usd"></i> Abonos de Clientes
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
            case 'local_sales': this.renderLocalSalesHistory(content); break;
            case 'abonos_recibidos': this.renderAbonosRecibidosHistory(content); break;
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

    // ── VENTAS LOCALES (POS) ─────────────────────────────────────────────
    renderLocalSalesHistory(container) {
        const localSales = Storage.get(STORAGE_KEYS.SALES) || [];
        localSales.sort((a, b) => new Date(b.date) - new Date(a.date));

        container.innerHTML = `
            <!-- Filters -->
            <div class="search-filter-row" style="margin-bottom: 1rem; flex-wrap: wrap; gap: 10px;">
                <input type="text" id="q-local-search" class="form-control" placeholder="Buscar por cliente o remisión..." style="max-width: 280px;">
                <input type="month" id="q-local-month" class="form-control" style="max-width: 160px;">
                <select id="q-local-method" class="form-control" style="max-width: 170px;">
                    <option value="all">Todos los métodos</option>
                    <option value="cash">Efectivo</option>
                    <option value="transfer">Transferencia</option>
                    <option value="credit">Crédito</option>
                </select>
            </div>

            <div id="q-local-summary" style="margin-bottom: 1rem; font-size: 0.85rem; color: var(--text-secondary);"></div>

            <div class="table-container">
                <table class="data-table" style="font-size: 0.85rem;">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Remisión</th>
                            <th>Cliente</th>
                            <th>Productos</th>
                            <th>Método Pago</th>
                            <th>Vendedor</th>
                            <th class="text-right">Total Venta</th>
                            <th class="text-center">Acción</th>
                        </tr>
                    </thead>
                    <tbody id="local-history-list">
                        ${this.buildLocalSalesRows(localSales)}
                    </tbody>
                </table>
            </div>
        `;

        this.updateLocalSummary(localSales);

        const search = document.getElementById('q-local-search');
        const monthF = document.getElementById('q-local-month');
        const methodF = document.getElementById('q-local-method');

        const refilter = () => {
            const q = (search?.value || '').toLowerCase();
            const m = monthF?.value || '';
            const me = methodF?.value || 'all';
            let rows = localSales;
            
            if (q) rows = rows.filter(s => {
                const rem = (s.remissionNumber || '').toLowerCase();
                const client = (s.clientName || '').toLowerCase();
                return rem.includes(q) || client.includes(q);
            });
            if (m) rows = rows.filter(s => s.date && s.date.startsWith(m));
            if (me !== 'all') rows = rows.filter(s => s.method === me);
            
            document.getElementById('local-history-list').innerHTML = this.buildLocalSalesRows(rows);
            this.updateLocalSummary(rows);
        };

        search?.addEventListener('input', refilter);
        monthF?.addEventListener('change', refilter);
        methodF?.addEventListener('change', refilter);
    },

    updateLocalSummary(rows) {
        const el = document.getElementById('q-local-summary');
        if (!el) return;
        const totalSale = rows.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
        el.innerHTML = `<strong>${rows.length}</strong> ventas encontradas · Valor total: <strong style="color:var(--success);">$${totalSale.toLocaleString()}</strong>`;
    },

    buildLocalSalesRows(rows) {
        if (rows.length === 0) return `<tr><td colspan="8" class="text-center text-secondary" style="padding:2rem;">Sin resultados para los filtros aplicados.</td></tr>`;
        
        const methods = { cash: '💵 Efectivo', transfer: '🏦 Transf.', credit: '💳 Crédito' };
        
        return rows.map((s, idx) => {
            const productNames = s.items ? s.items.map(i => `${i.quantity}x ${i.name}`).join(', ') : '—';
            const remNumber = s.remissionNumber || `REM-V${String(idx+1).padStart(3, '0')}`;
            const total = parseFloat(s.total) || 0;
            const methodLabel = methods[s.method] || s.method;
            
            const safeSale = encodeURIComponent(JSON.stringify(s));

            return `
                <tr>
                    <td>${s.date ? new Date(s.date).toLocaleString('es-CO', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}) : '—'}</td>
                    <td><strong>${remNumber}</strong></td>
                    <td>${s.clientName || 'Cliente de Mostrador'}</td>
                    <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${productNames}">${productNames}</td>
                    <td>${methodLabel}</td>
                    <td>${s.sellerName || 'Caja'}</td>
                    <td class="text-right"><strong>$${total.toLocaleString()}</strong></td>
                    <td class="text-center" style="white-space: nowrap;">
                        <button class="btn btn-sm btn-primary btn-reprint-pdf" data-sale="${safeSale}" data-rem="${remNumber}">
                            <i class="fas fa-file-pdf"></i> Ver
                        </button>
                        ${Auth.isAdmin() ? `
                        <button class="btn btn-sm btn-danger btn-delete-sale" data-id="${s.id}" style="background:var(--danger); border-color:var(--danger); color:white; margin-left:5px;">
                            <i class="fas fa-trash"></i> Anular
                        </button>
                        ` : ''}
                    </td>
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
                return;
            }
            
            const pdfBtn = tgt.closest('.btn-reprint-pdf');
            if (pdfBtn && window.PDFManager) {
                try {
                    const saleData = JSON.parse(decodeURIComponent(pdfBtn.dataset.sale));
                    const remNumber = pdfBtn.dataset.rem;
                    window.PDFManager.showRemission(saleData, remNumber);
                } catch(err) {
                    console.error("Error parsing sale data for PDF", err);
                    alert("Error al intentar reconstruir la remisión.");
                }
                return;
            }

            const deleteSaleBtn = tgt.closest('.btn-delete-sale');
            if (deleteSaleBtn) {
                const id = deleteSaleBtn.dataset.id;
                await this.deleteSale(id);
                return;
            }

            const deletePaymentBtn = tgt.closest('.btn-delete-payment');
            if (deletePaymentBtn) {
                const id = deletePaymentBtn.dataset.id;
                await this.deletePayment(id);
                return;
            }
        };
    },

    renderAbonosRecibidosHistory(container) {
        const payments = Storage.get(STORAGE_KEYS.PAYMENTS) || [];
        payments.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

        container.innerHTML = `
            <!-- Filters -->
            <div class="search-filter-row" style="margin-bottom: 1rem; flex-wrap: wrap; gap: 10px;">
                <input type="text" id="q-abonos-search" class="form-control" placeholder="Buscar por cliente o notas..." style="max-width: 280px;">
                <input type="month" id="q-abonos-month" class="form-control" style="max-width: 160px;">
                <select id="q-abonos-company" class="form-control" style="max-width: 170px;">
                    <option value="all">Millenio y Vulcano</option>
                    <option value="millenio">Sólo Millenio</option>
                    <option value="vulcano">Sólo Vulcano</option>
                </select>
            </div>

            <div id="q-abonos-summary" style="margin-bottom: 1rem; font-size: 0.85rem; color: var(--text-secondary);"></div>

            <div class="table-container">
                <table class="data-table" style="font-size: 0.85rem;">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Cliente</th>
                            <th>Empresa</th>
                            <th>Método Pago</th>
                            <th>Notas</th>
                            <th class="text-right">Monto</th>
                            <th class="text-center">Acción</th>
                        </tr>
                    </thead>
                    <tbody id="abonos-history-list">
                        ${this.buildAbonosRows(payments)}
                    </tbody>
                </table>
            </div>
        `;

        this.updateAbonosSummary(payments);

        const search = document.getElementById('q-abonos-search');
        const monthF = document.getElementById('q-abonos-month');
        const companyF = document.getElementById('q-abonos-company');

        const refilter = () => {
            const q = (search?.value || '').toLowerCase();
            const m = monthF?.value || '';
            const comp = companyF?.value || 'all';
            let rows = payments;

            if (q) rows = rows.filter(p => {
                const client = (p.clientName || '').toLowerCase();
                const notes = (p.notes || '').toLowerCase();
                return client.includes(q) || notes.includes(q);
            });
            if (m) rows = rows.filter(p => {
                const dateField = p.date || p.createdAt;
                return dateField && dateField.startsWith(m);
            });
            if (comp !== 'all') rows = rows.filter(p => p.company === comp);

            document.getElementById('abonos-history-list').innerHTML = this.buildAbonosRows(rows);
            this.updateAbonosSummary(rows);
        };

        search?.addEventListener('input', refilter);
        monthF?.addEventListener('change', refilter);
        companyF?.addEventListener('change', refilter);
    },

    updateAbonosSummary(rows) {
        const el = document.getElementById('q-abonos-summary');
        if (!el) return;
        const total = rows.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        el.innerHTML = `<strong>${rows.length}</strong> abonos encontrados · Valor total: <strong style="color:var(--success);">$${total.toLocaleString()}</strong>`;
    },

    buildAbonosRows(rows) {
        if (rows.length === 0) return `<tr><td colspan="7" class="text-center text-secondary" style="padding:2rem;">Sin resultados para los filtros aplicados.</td></tr>`;
        
        const methods = { cash: '💵 Efectivo', transfer: '🏦 Transf.', credit: '💳 Crédito' };
        
        return rows.map(p => {
            const dateStr = (p.date || p.createdAt) ? new Date(p.date || p.createdAt).toLocaleString('es-CO', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'}) : '—';
            const amt = parseFloat(p.amount) || 0;
            const methodLabel = methods[p.method] || p.method;
            
            return `
                <tr>
                    <td>${dateStr}</td>
                    <td><strong>${p.clientName || '—'}</strong></td>
                    <td><span class="badge ${p.company === 'millenio' ? 'bg-blue' : 'bg-orange'}">${p.company.toUpperCase()}</span></td>
                    <td>${methodLabel}</td>
                    <td><span style="font-size: 0.8rem; color: var(--text-secondary);">${p.notes || '—'}</span></td>
                    <td class="text-right" style="color: var(--success);"><strong>$${amt.toLocaleString()}</strong></td>
                    <td class="text-center">
                        ${Auth.isAdmin() ? `
                        <button class="btn btn-sm btn-danger btn-delete-payment" data-id="${p.id}" style="background:var(--danger); border-color:var(--danger); color:white;">
                            <i class="fas fa-trash"></i> Anular
                        </button>
                        ` : '<small class="text-secondary">—</small>'}
                    </td>
                </tr>
            `;
        }).join('');
    },

    async deleteSale(saleId) {
        if (!Auth.isAdmin()) {
            alert("No tienes permisos para anular ventas.");
            return;
        }
        if (!confirm("⚠️ ¿Estás seguro de ANULAR esta venta permanentemente?\n\nEsto eliminará la remisión, reintegrará los productos al stock y descontará el saldo al cliente si fue a crédito.")) {
            return;
        }

        try {
            const sale = Storage.getById(STORAGE_KEYS.SALES, saleId);
            if (!sale) throw new Error("Venta no encontrada en memoria.");

            // 1. Reintegrar stock
            if (sale.items && Array.isArray(sale.items)) {
                for (const item of sale.items) {
                    const p = Storage.getById(STORAGE_KEYS.PRODUCTS, item.id);
                    if (p) {
                        if (sale.company === 'millenio') {
                            p.stockMillenio = (p.stockMillenio || 0) + (item.quantity || 1);
                        } else {
                            p.stockVulcano = (p.stockVulcano || 0) + (item.quantity || 1);
                        }
                        await Storage.updateItem(STORAGE_KEYS.PRODUCTS, p.id, {
                            stockMillenio: p.stockMillenio,
                            stockVulcano: p.stockVulcano
                        });
                    }
                }
            }

            // 2. Restar saldo al cliente
            if (sale.method === 'credit' && sale.clientId) {
                const c = Storage.getById(STORAGE_KEYS.CLIENTS, sale.clientId);
                if (c) {
                    c.balanceMillenio = Math.max(0, (c.balanceMillenio || 0) - (sale.totalM || 0));
                    c.balanceVulcano = Math.max(0, (c.balanceVulcano || 0) - (sale.totalV || 0));
                    await Storage.updateItem(STORAGE_KEYS.CLIENTS, c.id, {
                        balanceMillenio: c.balanceMillenio,
                        balanceVulcano: c.balanceVulcano
                    });
                }
            }

            // 3. Eliminar venta
            await Storage.deleteItem(STORAGE_KEYS.SALES, saleId);
            alert("✅ Venta anulada exitosamente.");
            
            // Actualizar Vistas
            this.renderTab();
            if (window.Inventory && window.Inventory.updateInventoryList) window.Inventory.updateInventoryList();
            if (window.CRM && window.CRM.updateClientList) window.CRM.updateClientList();
            if (window.Finances && window.Finances.updateDebtUI) {
                window.Finances.updateDebtUI();
                window.Finances.updateBalancesUI();
            }
        } catch(err) {
            console.error(err);
            alert("❌ Error al anular la venta: " + err.message);
        }
    },

    async deletePayment(paymentId) {
        if (!Auth.isAdmin()) {
            alert("No tienes permisos para anular abonos.");
            return;
        }
        if (!confirm("⚠️ ¿Estás seguro de ANULAR este abono permanentemente?\n\nEsto eliminará el registro de abono de la base de datos y aumentará la deuda del cliente correspondiente para restablecer su saldo anterior.")) {
            return;
        }

        try {
            const p = Storage.getById(STORAGE_KEYS.PAYMENTS, paymentId);
            if (!p) throw new Error("Abono no encontrado en memoria.");

            // 1. Restablecer saldo al cliente
            if (p.clientId) {
                const c = Storage.getById(STORAGE_KEYS.CLIENTS, p.clientId);
                if (c) {
                    const amt = parseFloat(p.amount) || 0;
                    if (p.company === 'millenio') {
                        c.balanceMillenio = (c.balanceMillenio || 0) + amt;
                    } else {
                        c.balanceVulcano = (c.balanceVulcano || 0) + amt;
                    }
                    await Storage.updateItem(STORAGE_KEYS.CLIENTS, c.id, {
                        balanceMillenio: c.balanceMillenio,
                        balanceVulcano: c.balanceVulcano
                    });
                }
            }

            // 2. Eliminar abono
            await Storage.deleteItem(STORAGE_KEYS.PAYMENTS, paymentId);
            alert("✅ Abono anulado exitosamente.");
            
            // Actualizar Vistas
            this.renderTab();
            if (window.CRM && window.CRM.updateClientList) window.CRM.updateClientList();
            if (window.Finances && window.Finances.updateDebtUI) {
                window.Finances.updateDebtUI();
                window.Finances.updateBalancesUI();
            }
        } catch(err) {
            console.error(err);
            alert("❌ Error al anular el abono: " + err.message);
        }
    }
};
