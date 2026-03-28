// TUCOMPRAS Module
window.TuCompras = {
    activeStatus: 'despachado',
    cart: [],
    selectedLiquidations: new Set(),
    activeStep: 1,
    activeCompanyFilter: 'all',

    init() {
        this.renderPanel();
    },

    getSales() {
        return Storage.get(STORAGE_KEYS.TUCOMPRAS_SALES);
    },

    renderPanel() {
        const contentArea = document.getElementById('content-area');
        let panel = document.getElementById('tucompras-panel');

        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'tucompras-panel';
            panel.className = 'panel';
            contentArea.appendChild(panel);
        }

        panel.innerHTML = `
            <div class="panel-header">
                <h1>E-commerce TUCOMPRAS</h1>
                <div class="actions">
                    <button id="new-tucompras-sale-btn" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Nueva Venta
                    </button>
                </div>
            </div>

            <div class="stats-grid" id="tc-stats-container">
                <!-- Stats load here -->
            </div>

            <div class="inventory-tabs">
                <button class="tab-btn ${this.activeStatus === 'despachado' ? 'active' : ''}" data-status="despachado">Despachados</button>
                <button class="tab-btn ${this.activeStatus === 'recibido' ? 'active' : ''}" data-status="recibido">Entregados</button>
                <button class="tab-btn ${this.activeStatus === 'proceso_devolucion' ? 'active' : ''}" data-status="proceso_devolucion">En Proceso Dev.</button>
                <button class="tab-btn ${this.activeStatus === 'devolucion_recibida' ? 'active' : ''}" data-status="devolucion_recibida">Devueltos</button>
                <button class="tab-btn ${this.activeStatus === 'liquidacion' ? 'active' : ''}" data-status="liquidacion" style="border: 1px solid var(--accent);">Liquidación Bodegas</button>
            </div>

            <div id="tucompras-main-content">
                <!-- Data will be loaded here -->
            </div>

            <!-- New Sale Modal - WIZARD STYLE -->
            <div id="tucompras-sale-modal" class="modal">
                <div class="modal-content" style="max-width: 900px; width: 95%; border-radius: 24px; overflow: hidden; background: var(--bg-dark);">
                    <div class="modal-header" style="background: var(--bg-sidebar); border-bottom: 1px solid var(--border); padding: 1.5rem 2rem;">
                        <h2 id="tc-wizard-title" style="margin:0; font-size: 1.25rem; display: flex; align-items: center; gap: 10px;">
                            <span class="step-indicator" style="background: var(--accent); color: white; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 0.9rem;">1</span>
                            Información del Cliente
                        </h2>
                        <span class="close-modal">&times;</span>
                    </div>
                    
                    <div class="modal-body" style="padding: 2rem;">
                        
                        <!-- STEP 1: CLIENTE -->
                        <div id="tc-step-1" class="wizard-step">
                            <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                                <div class="form-group">
                                    <label>Nombre Completo *</label>
                                    <input type="text" id="tc-cust-name" class="form-control" placeholder="Nombre completo" required>
                                </div>
                                <div class="form-group">
                                    <label>Teléfono *</label>
                                    <input type="text" id="tc-cust-phone" class="form-control" placeholder="300 000 0000" required>
                                </div>
                                <div class="form-group">
                                    <label>Departamento</label>
                                    <select id="tc-cust-dept" class="form-control"></select>
                                </div>
                                <div class="form-group">
                                    <label>Ciudad *</label>
                                    <select id="tc-cust-city" class="form-control" required>
                                        <option value="">Seleccione depto primero...</option>
                                    </select>
                                </div>
                                <div class="form-group" style="grid-column: span 2;">
                                    <label>Dirección (Opcional)</label>
                                    <input type="text" id="tc-cust-address" class="form-control" placeholder="Calle, Carrera, Apto...">
                                </div>
                                <div class="form-group" id="tc-cust-city-other-group" style="display: none; grid-column: span 2;">
                                    <label>Escriba Ciudad *</label>
                                    <input type="text" id="tc-cust-city-other" class="form-control" placeholder="Nombre de la ciudad">
                                </div>
                            </div>
                        </div>

                        <!-- STEP 2: PRODUCTOS -->
                        <div id="tc-step-2" class="wizard-step" style="display: none;">
                            <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 1rem; flex-wrap: wrap;">
                                    <div class="search-bar" style="flex: 1; background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 0.75rem 1rem; display: flex; align-items: center; gap: 10px;">
                                        <i class="fas fa-search" style="color: var(--text-secondary);"></i>
                                        <input type="text" id="tc-product-search" placeholder="Buscar por nombre..." style="background: none; border: none; color: white; width: 100%; outline: none;">
                                    </div>
                                    <div class="filter-group" style="display: flex; gap: 5px; background: var(--bg-card); padding: 5px; border-radius: 12px; border: 1px solid var(--border);">
                                        <button class="tab-btn btn-sm tc-filter-btn active" data-filter="all">Todas</button>
                                        <button class="tab-btn btn-sm tc-filter-btn" data-filter="millenio">Millenio</button>
                                        <button class="tab-btn btn-sm tc-filter-btn" data-filter="vulcano">Vulcano</button>
                                    </div>
                                </div>

                                <div id="tc-product-grid" class="product-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px; max-height: 450px; overflow-y: auto; padding-right: 10px;">
                                    <!-- Dynamic products -->
                                </div>
                            </div>
                        </div>

                        <!-- STEP 3: LOGÍSTICA & RESUMEN -->
                        <div id="tc-step-3" class="wizard-step" style="display: none;">
                            <form id="tucompras-sale-form" style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                                <div class="logistics-section" style="display: flex; flex-direction: column; gap: 1.25rem;">
                                    <h4 style="margin: 0 0 0.5rem 0; font-size: 0.9rem; color: var(--text-secondary);">LOGÍSTICA</h4>
                                    <div class="form-group">
                                        <label>Vendedor *</label>
                                        <select id="tc-seller-select" name="seller_id" class="form-control" required></select>
                                    </div>
                                    <div class="form-group">
                                        <label>Transportadora</label>
                                        <select name="carrier" class="form-control">
                                            <option value="Interrapidisimo">Interrapidisimo</option>
                                            <option value="Servientrega">Servientrega</option>
                                            <option value="Envía">Envía</option>
                                            <option value="Coordinadora">Coordinadora</option>
                                            <option value="TCC">TCC</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Número de Guía</label>
                                        <input type="text" name="tracking_number" class="form-control" placeholder="Guía #">
                                    </div>
                                    <div class="form-group">
                                        <label>Flete (Valor Cobrado por Dropi)</label>
                                        <input type="number" name="shipping_cost" class="form-control" required value="0">
                                    </div>
                                </div>

                                <div class="summary-section" style="display: flex; flex-direction: column; gap: 1.25rem;">
                                    <h4 style="margin: 0 0 0.5rem 0; font-size: 0.9rem; color: var(--text-secondary);">RESUMEN DE PRODUCTOS</h4>
                                    <div id="tc-cart-items" style="background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border); padding: 1rem; display: flex; flex-direction: column; gap: 10px; max-height: 250px; overflow-y: auto;">
                                        <!-- Items -->
                                    </div>
                                    <div class="totals-card" style="background: var(--bg-sidebar); border: 1px solid var(--accent); border-radius: 16px; padding: 1.25rem;">
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                            <span>Subtotal Venta:</span>
                                            <strong id="tc-total-sale-text" style="color: var(--accent-vibrant);">$0</strong>
                                        </div>
                                        <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--border); padding-top: 8px;">
                                            <span>Comisión:</span>
                                            <strong id="tc-total-commission-text" style="color: var(--warning);">$0</strong>
                                        </div>
                                    </div>
                                    <button type="submit" class="btn btn-primary btn-block btn-lg" style="height: 56px; border-radius: 16px;">
                                        REGISTRAR DESPACHO
                                    </button>
                                </div>
                            </form>
                        </div>

                    </div>

                    <div class="modal-footer" style="background: var(--bg-sidebar); border-top: 1px solid var(--border); padding: 1.5rem 2rem; display: flex; justify-content: space-between;">
                        <button id="tc-wizard-prev" class="btn btn-outline" style="border-radius: 12px; display: none;">Anterior</button>
                        <div style="flex: 1;"></div>
                        <button id="tc-wizard-next" class="btn btn-primary" style="border-radius: 12px; min-width: 120px;">Siguiente</button>
                    </div>
                </div>
            </div>

            <!-- Update Status Modal -->
            <div id="tc-status-modal" class="modal">
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h2>Actualizar Estado</h2>
                        <span class="close-modal">&times;</span>
                    </div>
                    <div class="modal-body" id="tc-status-modal-body">
                        <!-- Dynamic content -->
                    </div>
                </div>
            </div>
        `;

        if (this.activeStatus === 'liquidacion') {
            this.renderLiquidationView();
        } else {
            this.renderSalesView();
        }

        this.updateStats();
        this.setupEventListeners();
    },

    updateStats() {
        const sales = this.getSales();
        const container = document.getElementById('tc-stats-container');
        if (!container) return;

        // Financial Stats
        const totalUtility = sales.reduce((sum, s) => {
            if (s.status === 'recibido') {
                const totalSale = s.items ? s.items.reduce((sum, i) => sum + (parseFloat(i.sale_price) * i.qty), 0) : s.sale_price;
                const totalCost = s.items ? s.items.reduce((sum, i) => sum + (parseFloat(i.cost_price) * i.qty), 0) : s.cost_price;
                const totalComm = s.items ? s.items.reduce((sum, i) => sum + (parseFloat(i.commission_paid) * i.qty), 0) : s.commission_paid;
                return sum + (totalSale - totalCost - totalComm - parseFloat(s.shipping_cost));
            } else if (s.status === 'proceso_devolucion' || s.status === 'devolucion_recibida' || s.status === 'devuelto') {
                return sum - (parseFloat(s.shipping_loss) || 0);
            }
            return sum;
        }, 0);

        const debtMillenio = sales
            .filter(s => s.status === 'recibido' && s.money_confirmed && !s.is_paid_to_inventory && s.inventory_source === 'millenio')
            .reduce((sum, s) => sum + (s.items ? s.items.reduce((ss, i) => ss + (parseFloat(i.cost_price) * i.qty), 0) : s.cost_price), 0);

        const debtVulcano = sales
            .filter(s => s.status === 'recibido' && s.money_confirmed && !s.is_paid_to_inventory && s.inventory_source === 'vulcano')
            .reduce((sum, s) => sum + (s.items ? s.items.reduce((ss, i) => ss + (parseFloat(i.cost_price) * i.qty), 0) : s.cost_price), 0);

        // Shipping Stats
        const carriers = [...new Set(sales.filter(s => s.carrier).map(s => s.carrier))];
        const shippingStats = carriers.map(c => {
            const carrierSales = sales.filter(s => s.carrier === c);
            const total = carrierSales.length;
            const delivered = carrierSales.filter(s => s.status === 'recibido').length;
            const returns = carrierSales.filter(s => s.status === 'devolucion_recibida' || s.status === 'proceso_devolucion').length;
            const rate = total > 0 ? Math.round((delivered / total) * 100) : 0;
            return { name: c, total, delivered, returns, rate };
        });

        container.innerHTML = `
            <div class="stat-card">
                <h3>Utilidad Neta Total</h3>
                <p class="stat-value">$${totalUtility.toLocaleString()}</p>
            </div>
            <div class="stat-card">
                <h3>Deuda MILLENIO</h3>
                <p class="stat-value text-danger">$${debtMillenio.toLocaleString()}</p>
            </div>
            <div class="stat-card">
                <h3>Deuda VULCANO</h3>
                <p class="stat-value text-danger">$${debtVulcano.toLocaleString()}</p>
            </div>
            <div class="stat-card" style="grid-column: span 1.5; background: rgba(16,185,129,0.05);">
                <h3>Rendimiento Logística (${shippingStats.length} trans.)</h3>
                <div style="font-size: 0.75rem; margin-top: 5px;">
                    ${shippingStats.map(s => `
                        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                            <span>${s.name}:</span>
                            <strong>${s.delivered}✅ / ${s.returns}❌ (${s.rate}%)</strong>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    renderSalesView() {
        const container = document.getElementById('tucompras-main-content');
        container.innerHTML = `
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Cliente / Logística</th>
                            <th>Productos</th>
                            <th>Vendedor</th>
                            <th>Precio Venta</th>
                            <th>Comisión</th>
                            <th>Utilidad</th>
                            <th>Estado Pago</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="tucompras-sales-list"></tbody>
                </table>
            </div>
        `;
        this.updateSalesList();
    },

    updateSalesList() {
        const sales = this.getSales().filter(s => s.status === this.activeStatus);
        const list = document.getElementById('tucompras-sales-list');
        if (!list) return;

        if (sales.length === 0) {
            list.innerHTML = '<tr><td colspan="8" class="text-center">No hay registros</td></tr>';
            return;
        }

        const sellers = Vendedores.getSellers();
        const products = Inventory.getProducts();

        list.innerHTML = sales.map(s => {
            const seller = sellers.find(sel => sel.id === s.seller_id)?.name || 'N/A';
            const customer = s.customer_name || 'Sin Cliente';

            let productNames = "";
            if (s.items && s.items.length > 0) {
                productNames = s.items.map(i => {
                    const pName = products.find(p => p.id === i.product_id)?.name || 'Producto Elimi.';
                    return `${i.qty}x ${pName}`;
                }).join('<br>');
            } else {
                productNames = products.find(p => p.id === s.product_id)?.name || 'Prod. Antiguo';
            }

            const totalSaleValue = s.items ? s.items.reduce((sum, i) => sum + (parseFloat(i.sale_price) * i.qty), 0) : s.sale_price;
            const totalCostValue = s.items ? s.items.reduce((sum, i) => sum + (parseFloat(i.cost_price) * i.qty), 0) : s.cost_price;
            const totalCommValue = s.items ? s.items.reduce((sum, i) => sum + (parseFloat(i.commission_paid) * i.qty), 0) : s.commission_paid;

            let utility = 0;
            if (s.status === 'recibido') {
                utility = totalSaleValue - totalCostValue - totalCommValue - parseFloat(s.shipping_cost);
            } else if (s.status === 'proceso_devolucion' || s.status === 'devolucion_recibida') {
                utility = -(parseFloat(s.shipping_loss) || 0);
            }

            return `
                <tr class="${s.status === 'proceso_devolucion' ? 'highlight-return' : ''}">
                    <td>${new Date(s.date).toLocaleDateString()}</td>
                    <td>
                        <div style="font-size: 0.85rem;">
                            <strong>${customer}</strong><br>
                            <span class="text-secondary">
                                ${s.carrier || 'N/A'}: 
                                <a href="${Locations.getTrackingUrl(s.carrier, s.tracking_number)}" target="_blank" class="tracking-link">
                                    ${s.tracking_number || '-'}
                                </a>
                            </span>
                        </div>
                    </td>
                    <td style="font-size: 0.8rem;">${productNames}</td>
                    <td>${seller}</td>
                    <td>$${parseFloat(totalSaleValue).toLocaleString()}</td>
                    <td class="text-orange">$${parseFloat(totalCommValue).toLocaleString()}</td>
                    <td class="${utility >= 0 ? 'text-success' : 'text-danger'}"><strong>$${utility.toLocaleString()}</strong></td>
                    <td>
                        <span class="badge ${s.money_confirmed ? 'bg-success' : 'bg-secondary'}">
                            ${s.money_confirmed ? 'PAGADA' : 'PENDIENTE'}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline tc-update-btn" data-id="${s.id}">Actualizar</button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    renderLiquidationView() {
        const container = document.getElementById('tucompras-main-content');
        this.selectedLiquidations.clear();

        container.innerHTML = `
            <div class="actions-row" style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
                <div class="alert alert-info" style="margin:0;">
                    <i class="fas fa-check-double"></i> Selecciona una o varias ventas para liquidar el pago a bodega.
                </div>
                <button id="tc-batch-pay-btn" class="btn btn-success" disabled>Pagar Seleccionados ($0)</button>
            </div>

            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th style="width: 40px;"><input type="checkbox" id="tc-select-all-liq"></th>
                            <th>Fecha</th>
                            <th>Bodega</th>
                            <th>Productos / Cliente</th>
                            <th>Valor a Pagar</th>
                            <th>Guía</th>
                        </tr>
                    </thead>
                    <tbody id="tucompras-liquidation-list"></tbody>
                </table>
            </div>
        `;
        this.updateLiquidationList();
    },

    updateLiquidationList() {
        const sales = this.getSales().filter(s => s.status === 'recibido' && s.money_confirmed && !s.is_paid_to_inventory);
        const list = document.getElementById('tucompras-liquidation-list');
        if (!list) return;

        if (sales.length === 0) {
            list.innerHTML = '<tr><td colspan="6" class="text-center">No hay liquidaciones pendientes</td></tr>';
            return;
        }

        const products = Inventory.getProducts();

        list.innerHTML = sales.map(s => {
            let totalCostValue = 0;
            let productSummary = "";
            if (s.items) {
                totalCostValue = s.items.reduce((sum, i) => sum + (parseFloat(i.cost_price) * i.qty), 0);
                productSummary = s.items.map(i => `${i.qty}x ${products.find(p => p.id === i.product_id)?.name || 'Prod'}`).join(', ');
            } else {
                totalCostValue = parseFloat(s.cost_price);
            }

            return `
                <tr>
                    <td><input type="checkbox" class="tc-liq-checkbox" data-id="${s.id}" data-amount="${totalCostValue}" ${this.selectedLiquidations.has(s.id) ? 'checked' : ''}></td>
                    <td>${new Date(s.date).toLocaleDateString()}</td>
                    <td><span class="badge ${s.inventory_source === 'millenio' ? 'bg-blue' : 'bg-orange'}">${s.inventory_source}</span></td>
                    <td style="font-size: 0.8rem;">
                        <strong>${productSummary}</strong><br>
                        <span class="text-secondary">Cli: ${s.customer_name || 'N/A'}</span>
                    </td>
                    <td><strong>$${totalCostValue.toLocaleString()}</strong></td>
                    <td>${s.tracking_number || '-'}</td>
                </tr>
            `;
        }).join('');
    },

    setupEventListeners() {
        const panel = document.getElementById('tucompras-panel');
        if (!panel) return;

        panel.onclick = (e) => {
            const tabBtn = e.target.closest('.tab-btn');
            if (tabBtn) {
                this.activeStatus = tabBtn.dataset.status;
                this.renderPanel();
                return;
            }

            if (e.target.id === 'new-tucompras-sale-btn') {
                this.openNewSaleModal();
                return;
            }

            if (e.target.id === 'tc-wizard-next') {
                this.navigateWizard(1);
                return;
            }

            if (e.target.id === 'tc-wizard-prev') {
                this.navigateWizard(-1);
                return;
            }

            const filterBtn = e.target.closest('.tc-filter-btn');
            if (filterBtn) {
                document.querySelectorAll('.tc-filter-btn').forEach(b => b.classList.remove('active'));
                filterBtn.classList.add('active');
                this.activeCompanyFilter = filterBtn.dataset.filter;
                this.renderProductGrid(document.getElementById('tc-product-search')?.value || '');
                return;
            }

            const updateBtn = e.target.closest('.tc-update-btn');
            if (updateBtn) {
                this.openStatusModal(updateBtn.dataset.id);
                return;
            }

            if (e.target.id === 'tc-batch-pay-btn') {
                this.processBatchPayment();
                return;
            }

            const addToCartBtn = e.target.closest('.tc-add-btn');
            if (addToCartBtn) {
                this.addToCart(addToCartBtn.dataset.id);
                return;
            }

            const removeFromCartBtn = e.target.closest('.tc-remove-item');
            if (removeFromCartBtn) {
                this.removeFromCart(removeFromCartBtn.dataset.id);
                return;
            }

            if (e.target.classList.contains('close-modal')) {
                document.querySelectorAll('.modal').forEach(m => m.classList.remove('show'));
                return;
            }
        };

        panel.onchange = (e) => {
            if (e.target.id === 'tc-cust-dept') {
                Locations.populateCities(e.target.value, 'tc-cust-city');
                document.getElementById('tc-cust-city-other-group').style.display = 'none';
            }

            if (e.target.id === 'tc-cust-city') {
                const otherGroup = document.getElementById('tc-cust-city-other-group');
                otherGroup.style.display = e.target.value === 'OTRO (Escribir manualmente)' ? 'block' : 'none';
            }

            if (e.target.id === 'tc-select-all-liq') {
                const checkboxes = document.querySelectorAll('.tc-liq-checkbox');
                checkboxes.forEach(cb => {
                    cb.checked = e.target.checked;
                    if (cb.checked) this.selectedLiquidations.add(cb.dataset.id);
                    else this.selectedLiquidations.delete(cb.dataset.id);
                });
                this.updateBatchButton();
            }

            if (e.target.classList.contains('tc-liq-checkbox')) {
                if (e.target.checked) this.selectedLiquidations.add(e.target.dataset.id);
                else this.selectedLiquidations.delete(e.target.dataset.id);
                this.updateBatchButton();
            }
        };

        const prodSearch = document.getElementById('tc-product-search');
        if (prodSearch) prodSearch.oninput = (e) => this.renderProductGrid(e.target.value);

        const form = document.getElementById('tucompras-sale-form');
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                await this.handleNewSale(new FormData(form));
            };
        }
    },

    updateBatchButton() {
        const btn = document.getElementById('tc-batch-pay-btn');
        if (!btn) return;

        let totalVal = 0;
        const sales = this.getSales();
        this.selectedLiquidations.forEach(id => {
            const s = sales.find(x => x.id === id);
            if (s) {
                totalVal += s.items ? s.items.reduce((sum, i) => sum + (parseFloat(i.cost_price) * i.qty), 0) : s.cost_price;
            }
        });

        btn.disabled = this.selectedLiquidations.size === 0;
        btn.textContent = `Pagar Seleccionados ($${totalVal.toLocaleString()})`;
    },

    async processBatchPayment() {
        if (!confirm(`¿Confirmas el pago a bodega de ${this.selectedLiquidations.size} ventas seleccionadas?`)) return;

        const sales = this.getSales();
        for (const id of this.selectedLiquidations) {
            const sale = sales.find(s => s.id === id);
            if (sale) {
                sale.is_paid_to_inventory = true;
                sale.inventory_paid_at = new Date().toISOString();
                await Storage.updateItem(STORAGE_KEYS.TUCOMPRAS_SALES, id, sale);
            }
        }

        alert('Pagos registrados con éxito.');
        this.renderPanel();
    },

    openNewSaleModal() {
        this.cart = [];
        this.activeStep = 1;
        this.activeCompanyFilter = 'all';
        this.updateCartUI();
        this.renderProductGrid();
        this.updateWizardUI();

        // Location Data
        Locations.populateDepartments('tc-cust-dept');

        // Sellers
        const sellersSel = document.getElementById('tc-seller-select');
        const sellers = Vendedores.getSellers().filter(s => s.status === 'active' || s.active !== false);
        sellersSel.innerHTML = '<option value="">Seleccione...</option>' + sellers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

        const form = document.getElementById('tucompras-sale-form');
        if (form) form.reset();
        
        document.getElementById('tc-cust-name').value = '';
        document.getElementById('tc-cust-phone').value = '';
        document.getElementById('tucompras-sale-modal').classList.add('show');
    },

    navigateWizard(stepChange) {
        if (stepChange === 1) {
            // Validation
            if (this.activeStep === 1) {
                if (!document.getElementById('tc-cust-name').value || !document.getElementById('tc-cust-phone').value || !document.getElementById('tc-cust-city').value) {
                    alert("Por favor complete los datos obligatorios del cliente.");
                    return;
                }
            }
            if (this.activeStep === 2 && this.cart.length === 0) {
                alert("Seleccione al menos un producto.");
                return;
            }
        }

        const newStep = this.activeStep + stepChange;
        if (newStep >= 1 && newStep <= 3) {
            this.activeStep = newStep;
            this.updateWizardUI();
        }
    },

    updateWizardUI() {
        // Steps visibility
        document.querySelectorAll('.wizard-step').forEach((s, idx) => {
            s.style.display = (idx + 1 === this.activeStep) ? 'block' : 'none';
        });

        // Title and Indicator
        const title = document.getElementById('tc-wizard-title');
        const indicator = title.querySelector('.step-indicator');
        indicator.textContent = this.activeStep;
        
        const titles = ["Información del Cliente", "Selección de Productos", "Logística y Resumen"];
        title.innerHTML = `<span class="step-indicator" style="background: var(--accent); color: white; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 0.9rem; margin-right: 10px;">${this.activeStep}</span> ${titles[this.activeStep - 1]}`;

        // Buttons
        document.getElementById('tc-wizard-prev').style.display = (this.activeStep === 1) ? 'none' : 'block';
        document.getElementById('tc-wizard-next').style.display = (this.activeStep === 3) ? 'none' : 'block';
        
        if (this.activeStep === 2) this.renderProductGrid(document.getElementById('tc-product-search')?.value || '');
    },

    renderProductGrid(query = '') {
        const grid = document.getElementById('tc-product-grid');
        if (!grid) return;

        let products = Inventory.getProducts().filter(p => p.active !== false && p.name.toLowerCase().includes(query.toLowerCase()));
        
        if (this.activeCompanyFilter !== 'all') {
            products = products.filter(p => {
                if (this.activeCompanyFilter === 'millenio') return p.stockMillenio > 0 || p.company === 'millenio';
                if (this.activeCompanyFilter === 'vulcano') return p.stockVulcano > 0 || p.company === 'vulcano';
                return true;
            });
        }

        grid.innerHTML = products.map(p => {
            const hasMillenio = (parseInt(p.stockMillenio) > 0);
            const hasVulcano = (parseInt(p.stockVulcano) > 0);
            const totalStock = (parseInt(p.stockMillenio) || 0) + (parseInt(p.stockVulcano) || 0);

            return `
                <div class="product-item" style="background: var(--bg-card); padding: 12px; border-radius: 12px; border: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px; transition: all 0.2s ease;">
                    <img src="${(Array.isArray(p.image) ? p.image[0] : p.image) || 'https://via.placeholder.com/100'}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 8px;">
                    <h4 style="font-size: 0.85rem; margin:0; line-height: 1.2; height: 2.4rem; overflow: hidden;">${p.name}</h4>
                    <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                        ${hasMillenio ? '<span class="badge bg-blue" style="font-size: 0.6rem; padding: 2px 5px;">M: '+p.stockMillenio+'</span>' : ''}
                        ${hasVulcano ? '<span class="badge bg-orange" style="font-size: 0.6rem; padding: 2px 5px;">V: '+p.stockVulcano+'</span>' : ''}
                    </div>
                    <div style="margin-top: auto; display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.9rem; font-weight: 700; color: var(--accent-vibrant);">$${parseFloat(p.priceFinal || p.priceInternet || 0).toLocaleString()}</span>
                        <button class="btn btn-sm btn-primary tc-add-btn" data-id="${p.id}" style="width: 32px; height: 32px; padding: 0; border-radius: 50%;"><i class="fas fa-plus"></i></button>
                    </div>
                </div>
            `;
        }).join('');
    },

    addToCart(productId) {
        const product = Inventory.getProducts().find(p => p.id === productId);
        if (!product) return;

        // Auto-determine source based on stock
        let source = 'millenio';
        if (product.stockVulcano > 0 && product.stockMillenio <= 0) source = 'vulcano';
        else if (product.stockMillenio > 0) source = 'millenio';
        else if (product.company === 'vulcano') source = 'vulcano';

        const existing = this.cart.find(i => i.product_id === productId);
        if (existing) {
            existing.qty++;
        } else {
            this.cart.push({
                product_id: productId,
                name: product.name,
                qty: 1,
                cost_price: product.priceWholesale || product.cost || 0,
                sale_price: product.priceFinal || product.priceInternet || 0,
                commission_paid: product.commissionBase || 0,
                inventory_source: source
            });
        }
        this.updateCartUI();
        
        // Visual feedback
        const btn = document.querySelector(`.tc-add-btn[data-id="${productId}"]`);
        if (btn) {
            const original = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i>';
            btn.classList.replace('btn-primary', 'btn-success');
            setTimeout(() => {
                btn.innerHTML = original;
                btn.classList.replace('btn-success', 'btn-primary');
            }, 800);
        }
    },

    removeFromCart(productId) {
        this.cart = this.cart.filter(i => i.product_id !== productId);
        this.updateCartUI();
    },

    updateCartUI() {
        const container = document.getElementById('tc-cart-items');
        if (!container) return;

        container.innerHTML = this.cart.length === 0 ? '<p class="text-center text-secondary">Elegir productos de la izquierda</p>' :
            this.cart.map(i => `
                <div class="cart-item" style="background: rgba(255,255,255,0.03); padding: 8px; border-radius: 6px; border: 1px solid var(--border); font-size: 0.75rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <strong>${i.qty}x ${i.name}</strong>
                        <button type="button" class="tc-remove-item icon-btn" data-id="${i.product_id}" style="width:16px; height:16px; font-size: 0.6rem;">&times;</button>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                        <div class="form-group" style="margin:0;">
                            <label style="font-size: 0.6rem;">P. Venta</label>
                            <input type="number" value="${i.sale_price}" onchange="TuCompras.updateCartValue('${i.product_id}', 'sale_price', this.value)" style="width: 100%; height: 22px; font-size: 0.7rem;">
                        </div>
                        <div class="form-group" style="margin:0;">
                            <label style="font-size: 0.6rem;">Comisión</label>
                            <input type="number" value="${i.commission_paid}" onchange="TuCompras.updateCartValue('${i.product_id}', 'commission_paid', this.value)" style="width: 100%; height: 22px; font-size: 0.7rem; background: rgba(245,158,11,0.05);">
                        </div>
                    </div>
                </div>
            `).join('');

        const totalSale = this.cart.reduce((sum, i) => sum + (parseFloat(i.sale_price) * i.qty), 0);
        const totalComm = this.cart.reduce((sum, i) => sum + (parseFloat(i.commission_paid) * i.qty), 0);
        document.getElementById('tc-total-sale-text').textContent = `$${totalSale.toLocaleString()}`;
        document.getElementById('tc-total-commission-text').textContent = `$${totalComm.toLocaleString()}`;
    },

    updateCartValue(productId, field, value) {
        const item = this.cart.find(i => i.product_id === productId);
        if (item) {
            item[field] = parseFloat(value) || 0;
            this.updateCartUI();
        }
    },

    async handleNewSale(formData) {
        let city = document.getElementById('tc-cust-city').value;
        if (city === 'OTRO (Escribir manualmente)') {
            city = document.getElementById('tc-cust-city-other').value;
            if (!city) { alert('Debe escribir la ciudad'); return; }
        }
        const name = document.getElementById('tc-cust-name').value;
        const phone = document.getElementById('tc-cust-phone').value;

        if (!name || !phone || this.cart.length === 0) {
            alert('Faltan datos obligatorios (Cliente o Productos)');
            return;
        }

        // FIX: Vendor is required
        const sellerId = formData.get('seller_id');
        if (!sellerId) {
            alert('⚠️ Debes seleccionar un Vendedor antes de registrar el despacho.');
            return;
        }

        const source = formData.get('inventory_source');

        // FIX: Validate stock availability before dispatching
        const stockErrors = [];
        for (const item of this.cart) {
            const product = Inventory.getProducts().find(p => p.id === item.product_id);
            if (!product) {
                stockErrors.push(`"${item.name}" ya no existe en inventario.`);
                continue;
            }
            const available = source === 'millenio' ? (product.stockMillenio || 0) : (product.stockVulcano || 0);
            if (item.qty > available) {
                stockErrors.push(`"${product.name}": solicitados ${item.qty}, disponibles ${available} en ${source}.`);
            }
        }
        if (stockErrors.length > 0) {
            alert('❌ Stock insuficiente:\n\n' + stockErrors.join('\n'));
            return;
        }

        const totalCommission = this.cart.reduce((sum, i) => sum + (parseFloat(i.commission_paid || 0) * (i.qty || 1)), 0);

        const sale = {
            date: new Date().toISOString(),
            customer_name: name,
            customer_phone: phone,
            seller_id: formData.get('seller_id'),
            carrier: formData.get('carrier'),
            tracking_number: formData.get('tracking_number'),
            inventory_source: this.cart[0].inventory_source, // Use the source of the first product as primary
            status: 'despachado',
            shipping_cost: parseFloat(formData.get('shipping_cost')) || 0,
            commission_paid: totalCommission,
            items: this.cart,
            money_confirmed: false,
            is_paid_to_inventory: false
        };

        // 1. SAVE SALE FIRST (Primary Data)
        await Storage.addItem(STORAGE_KEYS.TUCOMPRAS_SALES, sale);

        // 2. DEPENDENT DATA (Customer CRM)
        await TuComprasCRM.addCustomer({
            name, phone,
            dept: document.getElementById('tc-cust-dept').value,
            city: document.getElementById('tc-cust-city').value,
            address: document.getElementById('tc-cust-address').value
        });

        // 3. DEPENDENT DATA (Inventory Discount)
        for (const item of this.cart) {
            const product = Inventory.getProducts().find(p => p.id === item.product_id);
            if (product) {
                const itemSource = item.inventory_source || 'millenio';
                if (itemSource === 'millenio') product.stockMillenio -= item.qty;
                else product.stockVulcano -= item.qty;
                await Storage.updateItem(STORAGE_KEYS.PRODUCTS, product.id, product);
            }
        }
        document.getElementById('tucompras-sale-modal').classList.remove('show');
        this.renderPanel();
        alert('Despacho registrado con éxito.');
    },

    openStatusModal(saleId) {
        const sale = this.getSales().find(s => s.id === saleId);
        const modalBody = document.getElementById('tc-status-modal-body');

        modalBody.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <p>Estado actual: <strong>${sale.status.toUpperCase()}</strong></p>
                <div class="card" style="padding:10px; font-size: 0.8rem; background: rgba(0,0,0,0.1);">
                    <strong>Cliente:</strong> ${sale.customer_name}<br>
                    <strong>Guía:</strong> ${sale.carrier} - ${sale.tracking_number}
                </div>
                
                ${sale.status === 'despachado' ? `
                    <button class="btn btn-success btn-block" onclick="TuCompras.updateStatus('${saleId}', 'recibido')">Confirmar ENTREGA</button>
                    <button class="btn btn-warning btn-block" onclick="TuCompras.updateStatus('${saleId}', 'proceso_devolucion')">Venta DEVUELTA (En Camino)</button>
                ` : ''}

                ${sale.status === 'proceso_devolucion' ? `
                    <button class="btn btn-primary btn-block" onclick="TuCompras.updateStatus('${saleId}', 'devolucion_recibida')">Recibida físicamente (Reingresar Stock)</button>
                ` : ''}

                ${sale.status === 'recibido' && !sale.money_confirmed ? `
                    <div class="form-group">
                        <label>Ingresar valor debitado real flete (Dropi):</label>
                        <input type="number" id="tc-final-shipping" class="form-control" value="${sale.shipping_cost}">
                    </div>
                    <button class="btn btn-primary btn-block" onclick="TuCompras.confirmMoney('${saleId}')">Confirmar Dinero Ingresado</button>
                ` : ''}
            </div>
        `;
        document.getElementById('tc-status-modal').classList.add('show');
    },

    async updateStatus(id, newStatus) {
        const sale = this.getSales().find(s => s.id === id);

        if (newStatus === 'proceso_devolucion') {
            const loss = prompt('Ingrese valor debitado por flete devuelto:', sale.shipping_cost);
            if (loss === null) return;
            sale.shipping_loss = parseFloat(loss) || 0;
        }

        if (newStatus === 'devolucion_recibida') {
            for (const item of sale.items) {
                const product = Inventory.getProducts().find(p => p.id === item.product_id);
                if (product) {
                    if (sale.inventory_source === 'millenio') product.stockMillenio += item.qty;
                    else product.stockVulcano += item.qty;
                    await Storage.updateItem(STORAGE_KEYS.PRODUCTS, product.id, product);
                } else {
                    console.warn('[TUCOMPRAS] Producto no encontrado para reingreso de stock:', item.product_id);
                }
            }
        }

        sale.status = newStatus;
        await Storage.updateItem(STORAGE_KEYS.TUCOMPRAS_SALES, id, sale);
        document.getElementById('tc-status-modal').classList.remove('show');
        this.renderPanel();
    },

    async confirmMoney(id) {
        const val = document.getElementById('tc-final-shipping')?.value;
        const sale = this.getSales().find(s => s.id === id);
        sale.shipping_cost = parseFloat(val) || sale.shipping_cost;
        sale.money_confirmed = true;
        sale.money_confirmed_at = new Date().toISOString();
        await Storage.updateItem(STORAGE_KEYS.TUCOMPRAS_SALES, id, sale);
        document.getElementById('tc-status-modal').classList.remove('show');
        this.renderPanel();
    }
};
