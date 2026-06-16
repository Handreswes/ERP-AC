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
                <button class="tab-btn ${this.activeStatus === 'importar_dropi' ? 'active' : ''}" data-status="importar_dropi" style="border: 1px solid var(--success);"><i class="fas fa-cloud-download-alt"></i> Importar Dropi</button>
                <button class="tab-btn ${this.activeStatus === 'gastos' ? 'active' : ''}" data-status="gastos" style="border: 1px solid var(--warning);"><i class="fas fa-wallet"></i> Gastos TuCompras</button>
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
                            <div class="form-grid">
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
                                    <div class="filter-group" style="display: flex; gap: 5px; background: var(--bg-card); padding: 5px; border-radius: 12px; border: 1px solid var(--border); margin-left: auto;">
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
                            <form id="tucompras-sale-form" class="form-grid">
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
        } else if (this.activeStatus === 'importar_dropi') {
            this.renderImportDropiView();
        } else if (this.activeStatus === 'gastos') {
            this.renderExpensesView();
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
        const totalUtilitySales = sales.reduce((sum, s) => {
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

        const tcExpenses = Storage.get(STORAGE_KEYS.EXPENSES).filter(e => e.company === 'tucompras');
        const totalExpenses = tcExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        const netUtility = totalUtilitySales - totalExpenses;

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
            <div class="stat-card" style="background: linear-gradient(135deg, rgba(16,185,129,0.1), transparent); border-left: 4px solid var(--success);">
                <h3>Utilidad Neta Total</h3>
                <p class="stat-value" style="color:var(--success); font-size: 1.8rem;">$${netUtility.toLocaleString()}</p>
                <span style="font-size:0.75rem; color:var(--text-secondary);">Cindy (50%): $${Math.max(0, netUtility / 2).toLocaleString()} | Andrés (50%): $${Math.max(0, netUtility / 2).toLocaleString()}</span>
            </div>
            <div class="stat-card" style="border-left: 4px solid var(--warning);">
                <h3>Gastos TuCompras</h3>
                <p class="stat-value text-warning" style="font-size: 1.8rem;">$${totalExpenses.toLocaleString()}</p>
                <span style="font-size:0.75rem; color:var(--text-secondary);">Publicidad y varios</span>
            </div>
            <div class="stat-card">
                <h3>Deuda MILLENIO</h3>
                <p class="stat-value text-danger" style="font-size: 1.8rem;">$${debtMillenio.toLocaleString()}</p>
                <span style="font-size:0.75rem; color:var(--text-secondary);">Pendiente liquidar</span>
            </div>
            <div class="stat-card">
                <h3>Deuda VULCANO</h3>
                <p class="stat-value text-danger" style="font-size: 1.8rem;">$${debtVulcano.toLocaleString()}</p>
                <span style="font-size:0.75rem; color:var(--text-secondary);">Pendiente liquidar</span>
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

        panel.onclick = async (e) => {
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

            if (e.target.id === 'tc-add-expense-btn') {
                const modal = document.getElementById('tc-expense-modal');
                if (modal) modal.classList.add('show');
                return;
            }

            const delExpenseBtn = e.target.closest('.tc-delete-expense-btn');
            if (delExpenseBtn) {
                if (confirm('¿Seguro que deseas eliminar este gasto?')) {
                    await Storage.deleteItem(STORAGE_KEYS.EXPENSES, delExpenseBtn.dataset.id);
                    this.renderPanel();
                }
                return;
            }

            if (e.target.classList.contains('close-modal') || e.target.classList.contains('tc-close-modal')) {
                document.querySelectorAll('.modal').forEach(m => m.classList.remove('show'));
                return;
            }

            // --- Dropi Import click handlers ---
            if (e.target.id === 'tc-save-dropi-key-btn') {
                const keyInput = document.getElementById('tc-dropi-key');
                if (keyInput) {
                    localStorage.setItem('erp_dropi_integration_key', keyInput.value.trim());
                    alert('Token de Dropi guardado.');
                    this.renderPanel();
                }
                return;
            }

            if (e.target.id === 'tc-process-dropi-btn') {
                const text = document.getElementById('tc-dropi-raw')?.value;
                if (!text) {
                    alert('Por favor pega el texto de Dropi primero.');
                    return;
                }
                const parsed = this.parseDropiData(text);
                if (parsed.length > 0) {
                    this.pendingImportOrders = parsed;
                    this.renderPanel();
                    alert(`Se procesaron ${parsed.length} pedidos. Por favor verifícalos abajo.`);
                } else {
                    alert('No se encontraron pedidos válidos. Verifica el formato pegado.');
                }
                return;
            }

            if (e.target.id === 'tc-clear-pending-import-btn') {
                if (confirm('¿Deseas vaciar la lista de pedidos pendientes de importación?')) {
                    this.pendingImportOrders = [];
                    this.renderPanel();
                }
                return;
            }

            if (e.target.id === 'tc-batch-assign-seller-btn') {
                const sellerId = document.getElementById('tc-batch-seller-select')?.value;
                if (!sellerId) {
                    alert('Por favor selecciona un vendedor.');
                    return;
                }
                const checked = document.querySelectorAll('.tc-import-check:checked');
                if (checked.length === 0) {
                    alert('Selecciona al menos un pedido marcando la casilla a la izquierda.');
                    return;
                }
                checked.forEach(cb => {
                    const idx = parseInt(cb.dataset.index);
                    this.pendingImportOrders[idx].seller_id = sellerId;
                    const row = document.getElementById(`tc-pending-row-${idx}`);
                    if (row) {
                        row.classList.remove('highlight-warning');
                        const sel = row.querySelector('.tc-order-seller-select');
                        if (sel) {
                            sel.value = sellerId;
                            sel.style.borderColor = 'var(--border)';
                        }
                    }
                });
                alert(`Vendedor asignado a ${checked.length} pedidos.`);
                return;
            }

            const importSingleBtn = e.target.closest('.tc-import-single-btn');
            if (importSingleBtn) {
                const idx = parseInt(importSingleBtn.dataset.index);
                this.handleImportOrders([idx]);
                return;
            }

            if (e.target.id === 'tc-batch-import-submit-btn') {
                const checked = document.querySelectorAll('.tc-import-check:checked');
                if (checked.length === 0) {
                    alert('Selecciona al menos un pedido para importar.');
                    return;
                }
                const indices = Array.from(checked).map(cb => parseInt(cb.dataset.index));
                this.handleImportOrders(indices);
                return;
            }
            // --- End Dropi Import click handlers ---
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

            // --- Dropi Import change handlers ---
            if (e.target.id === 'tc-import-select-all') {
                const checked = e.target.checked;
                document.querySelectorAll('.tc-import-check').forEach(cb => cb.checked = checked);
                return;
            }

            if (e.target.classList.contains('tc-item-product-select')) {
                const orderIdx = parseInt(e.target.dataset.orderIdx);
                const itemIdx = parseInt(e.target.dataset.itemIdx);
                const prodId = e.target.value;
                this.pendingImportOrders[orderIdx].items[itemIdx].mapped_product_id = prodId;
                e.target.style.borderColor = prodId ? 'var(--border)' : '#ef4444';
                const icon = e.target.nextElementSibling;
                if (icon) {
                    icon.className = prodId ? 'fas fa-check-circle text-success' : 'fas fa-exclamation-circle text-danger';
                }
                return;
            }

            if (e.target.classList.contains('tc-item-warehouse-select')) {
                const orderIdx = parseInt(e.target.dataset.orderIdx);
                const itemIdx = parseInt(e.target.dataset.itemIdx);
                this.pendingImportOrders[orderIdx].items[itemIdx].inventory_source = e.target.value;
                return;
            }

            if (e.target.classList.contains('tc-order-seller-select')) {
                const orderIdx = parseInt(e.target.dataset.orderIdx);
                const sellerId = e.target.value;
                this.pendingImportOrders[orderIdx].seller_id = sellerId;
                e.target.style.borderColor = sellerId ? 'var(--border)' : '#f59e0b';
                
                const row = document.getElementById(`tc-pending-row-${orderIdx}`);
                if (row) row.classList.toggle('highlight-warning', !sellerId);
                return;
            }
            // --- End Dropi Import change handlers ---
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

        const expForm = document.getElementById('tc-expense-form');
        if (expForm) {
            expForm.onsubmit = async (e) => {
                e.preventDefault();
                const formData = new FormData(expForm);
                const data = {
                    company: 'tucompras',
                    category: formData.get('category'),
                    concept: formData.get('concept'),
                    amount: parseFloat(formData.get('amount')) || 0,
                    date: new Date().toISOString(),
                    notes: formData.get('notes') || '',
                    originAccount: 'cash'
                };
                await Storage.addItem(STORAGE_KEYS.EXPENSES, data);
                alert('Gasto registrado con éxito.');
                this.renderPanel();
            };
        }

        // --- File input & API Sync button listeners ---
        const fileInput = document.getElementById('tc-dropi-file');
        if (fileInput) {
            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        const textarea = document.getElementById('tc-dropi-raw');
                        if (textarea) textarea.value = evt.target.result;
                    };
                    reader.readAsText(file);
                }
            };
        }

        const syncApiBtn = document.getElementById('tc-sync-dropi-api-btn');
        if (syncApiBtn) {
            syncApiBtn.onclick = async () => {
                const key = localStorage.getItem('erp_dropi_integration_key');
                if (!key) { alert('No hay token de Dropi guardado.'); return; }
                
                try {
                    syncApiBtn.disabled = true;
                    syncApiBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sincronizando...';
                    
                    const response = await fetch('https://api.dropi.co/orders/myorders', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'dropi-integration-key': key
                        },
                        body: JSON.stringify({
                            limit: 50,
                            offset: 0
                        })
                    });
                    
                    if (!response.ok) throw new Error(`Status: ${response.status}`);
                    const json = await response.json();
                    
                    if (json && json.data) {
                        const parsed = this.parseDropiData(JSON.stringify(json.data));
                        if (parsed.length > 0) {
                            this.pendingImportOrders = parsed;
                            this.renderPanel();
                            alert(`Sincronización exitosa: ${parsed.length} pedidos cargados.`);
                        } else {
                            alert('No se encontraron pedidos nuevos en la respuesta de Dropi.');
                        }
                    } else {
                        alert('Respuesta inesperada de Dropi: ' + JSON.stringify(json));
                    }
                } catch (err) {
                    console.error('[TUCOMPRAS] Dropi API Sync Error:', err);
                    alert(`❌ Error de Sincronización: ${err.message}\n\nNota: Esto puede deberse a restricciones de CORS en tu navegador local. Te recomendamos exportar el reporte CSV de Dropi y pegarlo en el cuadro de texto para una importación directa y segura sin dependencias.`);
                } finally {
                    syncApiBtn.disabled = false;
                    syncApiBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Sincronizar API Dropi';
                }
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
        const sales = this.getSales();
        const millenioSales = [];
        const vulcanoSales = [];
        let millenioAmount = 0;
        let vulcanoAmount = 0;

        this.selectedLiquidations.forEach(id => {
            const s = sales.find(x => x.id === id);
            if (s) {
                const cost = s.items ? s.items.reduce((sum, i) => sum + (parseFloat(i.cost_price) * i.qty), 0) : parseFloat(s.cost_price || 0);
                if (s.inventory_source === 'millenio') {
                    millenioSales.push(s);
                    millenioAmount += cost;
                } else if (s.inventory_source === 'vulcano') {
                    vulcanoSales.push(s);
                    vulcanoAmount += cost;
                }
            }
        });

        if (millenioSales.length === 0 && vulcanoSales.length === 0) {
            alert('No se encontraron ventas seleccionadas válidas.');
            return;
        }

        let confirmMsg = '¿Confirmas el pago de las siguientes liquidaciones?\n';
        if (millenioAmount > 0) confirmMsg += `- Millenio: $${millenioAmount.toLocaleString()} (${millenioSales.length} ventas)\n`;
        if (vulcanoAmount > 0) confirmMsg += `- Vulcano: $${vulcanoAmount.toLocaleString()} (${vulcanoSales.length} ventas)\n`;
        if (!confirm(confirmMsg)) return;

        // Process Millenio Destination Account
        let millenioDestAccount = 'cash';
        if (millenioAmount > 0) {
            const millenioAccounts = Storage.get(STORAGE_KEYS.ACCOUNTS).filter(a => a.company === 'millenio');
            let optionsText = "Selecciona la cuenta de destino para MILLENIO (escribe el número correspondiente):\n\n0: Caja Efectivo\n";
            millenioAccounts.forEach((acc, index) => {
                optionsText += `${index + 1}: ${acc.bankName} - ${acc.name} ($${parseFloat(acc.balance || 0).toLocaleString()})\n`;
            });
            
            const selection = prompt(optionsText, "0");
            if (selection === null) return; // cancelled
            
            if (selection !== "0") {
                const idx = parseInt(selection) - 1;
                if (millenioAccounts[idx]) {
                    millenioDestAccount = millenioAccounts[idx].id;
                } else {
                    alert('Selección de cuenta Millenio inválida. Proceso cancelado.');
                    return;
                }
            }
        }

        // Process Vulcano Destination Account
        let vulcanoDestAccount = 'cash';
        if (vulcanoAmount > 0) {
            const vulcanoAccounts = Storage.get(STORAGE_KEYS.ACCOUNTS).filter(a => a.company === 'vulcano');
            let optionsText = "Selecciona la cuenta de destino para VULCANO (escribe el número correspondiente):\n\n0: Caja Efectivo\n";
            vulcanoAccounts.forEach((acc, index) => {
                optionsText += `${index + 1}: ${acc.bankName} - ${acc.name} ($${parseFloat(acc.balance || 0).toLocaleString()})\n`;
            });
            
            const selection = prompt(optionsText, "0");
            if (selection === null) return; // cancelled
            
            if (selection !== "0") {
                const idx = parseInt(selection) - 1;
                if (vulcanoAccounts[idx]) {
                    vulcanoDestAccount = vulcanoAccounts[idx].id;
                } else {
                    alert('Selección de cuenta Vulcano inválida. Proceso cancelado.');
                    return;
                }
            }
        }

        // Save Inflow Movements
        if (millenioAmount > 0) {
            await Storage.addItem(STORAGE_KEYS.MOVEMENTS, {
                company: 'millenio',
                type: 'inflow',
                originAccount: 'tucompras',
                destinationAccount: millenioDestAccount,
                amount: millenioAmount,
                concept: `Liquidación Bodega TuCompras (${millenioSales.length} ventas)`,
                date: new Date().toISOString(),
                notes: `Guías: ${millenioSales.map(s => s.tracking_number || s.id).join(', ')}`
            });
        }

        if (vulcanoAmount > 0) {
            await Storage.addItem(STORAGE_KEYS.MOVEMENTS, {
                company: 'vulcano',
                type: 'inflow',
                originAccount: 'tucompras',
                destinationAccount: vulcanoDestAccount,
                amount: vulcanoAmount,
                concept: `Liquidación Bodega TuCompras (${vulcanoSales.length} ventas)`,
                date: new Date().toISOString(),
                notes: `Guías: ${vulcanoSales.map(s => s.tracking_number || s.id).join(', ')}`
            });
        }

        // Update Sales status in Storage
        for (const sale of [...millenioSales, ...vulcanoSales]) {
            sale.is_paid_to_inventory = true;
            sale.inventory_paid_at = new Date().toISOString();
            await Storage.updateItem(STORAGE_KEYS.TUCOMPRAS_SALES, sale.id, sale);
        }

        alert('Liquidación a bodegas procesada y registrada en Finanzas con éxito.');
        this.selectedLiquidations.clear();
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
    },

    renderExpensesView() {
        const container = document.getElementById('tucompras-main-content');
        const expenses = Storage.get(STORAGE_KEYS.EXPENSES).filter(e => e.company === 'tucompras');

        container.innerHTML = `
            <div class="actions-row" style="margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <h2 style="margin:0;"><i class="fas fa-wallet" style="color:var(--warning);"></i> Listado de Gastos TuCompras</h2>
                <button id="tc-add-expense-btn" class="btn btn-warning" style="border-radius: 12px;">
                    <i class="fas fa-plus"></i> Registrar Gasto
                </button>
            </div>

            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Categoría</th>
                            <th>Concepto</th>
                            <th class="text-right">Monto</th>
                            <th>Notas</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody id="tc-expenses-list-body">
                        ${expenses.map(e => `
                            <tr>
                                <td>${new Date(e.date || e.createdAt).toLocaleDateString()}</td>
                                <td><span class="badge" style="background: rgba(245,158,11,0.15); color: var(--warning); border: 1px solid rgba(245,158,11,0.3); font-size: 0.75rem;">${e.category || 'General'}</span></td>
                                <td><strong>${e.concept}</strong></td>
                                <td class="text-right text-danger"><strong>$${parseFloat(e.amount).toLocaleString()}</strong></td>
                                <td style="font-size: 0.8rem; color: var(--text-secondary); max-width: 250px; overflow: hidden; text-overflow: ellipsis;">${e.notes || '-'}</td>
                                <td class="table-actions">
                                    <button class="icon-btn tc-delete-expense-btn" data-id="${e.id}" style="color:var(--danger);" title="Eliminar Gasto">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                        ${expenses.length === 0 ? '<tr><td colspan="6" class="text-center text-secondary" style="padding: 2rem;">No hay gastos registrados</td></tr>' : ''}
                    </tbody>
                </table>
            </div>

            <!-- Add Expense Modal -->
            <div id="tc-expense-modal" class="modal">
                <div class="modal-content" style="max-width: 450px; border-radius: 20px;">
                    <div class="modal-header">
                        <h2>Registrar Gasto TuCompras</h2>
                        <span class="close-modal tc-close-modal">&times;</span>
                    </div>
                    <div class="modal-body" style="padding: 1.5rem 2rem;">
                        <form id="tc-expense-form">
                            <div class="form-grid" style="display: flex; flex-direction: column; gap: 1.25rem;">
                                <div class="form-group">
                                    <label>Categoría</label>
                                    <select name="category" class="form-control" required>
                                        <option value="Publicidad">Publicidad / Marketing</option>
                                        <option value="Fletes">Fletes</option>
                                        <option value="Devoluciones">Devoluciones (Cargos)</option>
                                        <option value="Operativo">Gasto Operativo</option>
                                        <option value="General">Otro / General</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Concepto / Detalle *</label>
                                    <input type="text" name="concept" class="form-control" placeholder="Ej: Publicidad Facebook Junio" required>
                                </div>
                                <div class="form-group">
                                    <label>Monto ($) *</label>
                                    <input type="number" name="amount" class="form-control" placeholder="Monto del gasto" required>
                                </div>
                                <div class="form-group">
                                    <label>Notas Adicionales</label>
                                    <textarea name="notes" class="form-control" placeholder="Detalles extra..." rows="3"></textarea>
                                </div>
                            </div>
                            <button type="submit" class="btn btn-primary btn-block btn-lg" style="margin-top: 1.5rem; height: 50px; border-radius: 12px;">
                                GUARDAR GASTO
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        `;
    },

    renderImportDropiView() {
        const container = document.getElementById('tucompras-main-content');
        const key = localStorage.getItem('erp_dropi_integration_key') || '';
        const sellers = Vendedores.getSellers().filter(s => s.status === 'active' || s.active !== false);

        container.innerHTML = `
            <div class="card" style="padding: 1.5rem; margin-bottom: 1.5rem; background: var(--bg-sidebar); border-radius: 16px; border: 1px solid var(--border);">
                <div style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="document.getElementById('tc-dropi-settings').classList.toggle('hidden')">
                    <h3 style="margin:0; font-size:1.1rem; display:flex; align-items:center; gap:8px;"><i class="fas fa-cog text-blue"></i> Configuración de Integración Dropi (API)</h3>
                    <span style="font-size: 0.8rem; color: var(--text-secondary);"><i class="fas fa-chevron-down"></i></span>
                </div>
                <div id="tc-dropi-settings" class="hidden" style="margin-top: 1rem; border-top: 1px solid var(--border); padding-top: 1rem;">
                    <div style="display: flex; gap: 1rem; align-items: flex-end;">
                        <div class="form-group" style="margin:0; flex: 1;">
                            <label style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:4px;">Token de Integración (Dropi Integration Key)</label>
                            <input type="password" id="tc-dropi-key" class="form-control" value="${key}" placeholder="Pegar token de integraciones de Dropi">
                        </div>
                        <button id="tc-save-dropi-key-btn" class="btn btn-primary" style="height: 42px; border-radius:10px;">Guardar Token</button>
                    </div>
                    <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 5px; margin-bottom: 0;">
                        * Puedes obtener este token en tu cuenta de Dropi -> Configuración -> Integraciones -> Token de Integración.
                    </p>
                </div>
            </div>

            <div class="card" style="padding: 1.5rem 2rem; border-radius: 16px; margin-bottom: 1.5rem; border: 1px solid var(--border);">
                <h3 style="margin:0 0 1rem 0; font-size:1.2rem; display:flex; align-items:center; gap:8px;"><i class="fas fa-file-import text-success"></i> Cargar Ventas de Dropi</h3>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">
                    <strong>Método Recomendado (CORS-Safe):</strong> Copia la tabla de pedidos o el reporte CSV de Dropi y pégalo abajo, o arrastra el archivo CSV.
                </p>

                <div style="display: flex; flex-direction: column; gap: 1rem;">
                    <textarea id="tc-dropi-raw" class="form-control" style="height: 120px; font-family: monospace; font-size: 0.8rem; border-radius:12px; background: rgba(0,0,0,0.15);" placeholder="Pega el texto CSV o JSON de tu reporte de pedidos de Dropi aquí..."></textarea>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                        <div style="display:flex; gap:10px;">
                            <input type="file" id="tc-dropi-file" accept=".csv,.txt" style="display: none;">
                            <button class="btn btn-outline" onclick="document.getElementById('tc-dropi-file').click()" style="border-radius:10px;">
                                <i class="fas fa-file-upload"></i> Subir Archivo CSV
                            </button>
                            <button id="tc-process-dropi-btn" class="btn btn-success" style="min-width: 140px; border-radius:10px;">Procesar Datos</button>
                        </div>
                        
                        <div style="display:flex; gap:10px;">
                            <button id="tc-sync-dropi-api-btn" class="btn btn-primary" ${key ? '' : 'disabled'} title="Sincronizar directamente vía API de Dropi" style="border-radius:10px;">
                                <i class="fas fa-sync-alt"></i> Sincronizar API Dropi
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div id="tc-pending-import-area" class="${this.pendingImportOrders.length === 0 ? 'hidden' : ''}">
                <div class="card" style="padding: 1.5rem; border-radius: 16px; margin-bottom: 2rem; border: 1px solid var(--border);">
                    <div class="panel-header" style="padding:0; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                        <h2 style="margin:0; font-size:1.2rem;"><i class="fas fa-tasks text-blue"></i> Pedidos Pendientes de Confirmar (${this.pendingImportOrders.length})</h2>
                        
                        <div style="display: flex; gap: 10px; align-items: center; background: rgba(255,255,255,0.03); padding: 5px 12px; border-radius: 12px; border:1px solid var(--border);">
                            <label style="font-size:0.8rem; white-space:nowrap; color: var(--text-secondary); margin:0;">Asignar Vendedor Masivo:</label>
                            <select id="tc-batch-seller-select" class="form-control" style="width: 150px; height: 30px; padding: 2px 5px; font-size:0.8rem; border-radius:6px; background:var(--bg-dark);">
                                <option value="">Seleccione...</option>
                                ${sellers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                            </select>
                            <button id="tc-batch-assign-seller-btn" class="btn btn-primary btn-sm" style="border-radius:6px; height:30px; padding: 0 10px; font-size:0.8rem;">Asignar</button>
                        </div>
                    </div>

                    <div style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items:center;">
                        <div class="alert alert-info" style="margin: 0; padding: 8px 12px; font-size:0.8rem; border-radius:8px;">
                            <i class="fas fa-info-circle"></i> Selecciona los pedidos, asigna el vendedor e impórtalos al ERP.
                        </div>
                        <button id="tc-clear-pending-import-btn" class="btn btn-outline-danger btn-sm" style="border-radius:8px;">Limpiar Lista</button>
                    </div>

                    <div class="table-container" style="overflow-x: auto; margin:0;">
                        <table class="data-table" style="font-size: 0.85rem;">
                            <thead>
                                <tr>
                                    <th style="width: 40px;"><input type="checkbox" id="tc-import-select-all"></th>
                                    <th>Pedido / Cliente</th>
                                    <th>Logística / Flete</th>
                                    <th>Artículos de Dropi</th>
                                    <th>Mapear Producto ERP</th>
                                    <th>Bodega</th>
                                    <th>Vendedor</th>
                                    <th>Precio Venta</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody id="tc-pending-import-list">
                                ${this.renderPendingImportListRows()}
                            </tbody>
                        </table>
                    </div>

                    <div style="margin-top: 1.5rem; text-align: right;">
                        <button id="tc-batch-import-submit-btn" class="btn btn-success btn-lg" style="border-radius: 12px; height: 50px; font-size:1rem; padding: 0 2rem;">
                            <i class="fas fa-check-circle"></i> CONFIRMAR E IMPORTAR SELECCIONADOS
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    renderPendingImportListRows() {
        const erpProducts = Inventory.getProducts().filter(p => p.active !== false);
        const sellers = Vendedores.getSellers().filter(s => s.status === 'active' || s.active !== false);

        return this.pendingImportOrders.map((order, orderIdx) => {
            const customerStr = `
                <div>
                    <strong>${order.customer_name || 'N/A'}</strong><br>
                    <span class="text-secondary" style="font-size:0.75rem;">Tel: ${order.customer_phone || '-'}<br>
                    ${order.customer_city || ''} (${order.customer_dept || ''})</span>
                </div>
            `;
            const logisticsStr = `
                <div>
                    <span class="badge bg-blue" style="font-size: 0.65rem; padding: 2px 6px;">${order.carrier || 'N/A'}</span><br>
                    <span style="font-size:0.75rem; display:block; margin-top:2px;">Guía: <strong>${order.tracking_number || '-'}</strong><br>
                    Flete: <span class="text-orange">$${(order.shipping_cost || 0).toLocaleString()}</span></span>
                </div>
            `;

            // Render mapping cells
            let itemsHtml = "";
            let mapHtml = "";
            let warehouseHtml = "";

            order.items.forEach((item, itemIdx) => {
                // Auto-match
                let matchedId = item.mapped_product_id || "";
                if (!matchedId) {
                    // Try exact or substring match in ERP products
                    const match = erpProducts.find(p => 
                        p.name.toLowerCase() === item.name.toLowerCase() || 
                        p.ref && item.name.toLowerCase().includes(p.ref.toLowerCase()) ||
                        p.name.toLowerCase().includes(item.name.toLowerCase()) ||
                        item.name.toLowerCase().includes(p.name.toLowerCase())
                    );
                    if (match) {
                        matchedId = match.id;
                        item.mapped_product_id = match.id; // Save in object
                    }
                }

                // Default warehouse source based on stock
                let matchedProd = erpProducts.find(p => p.id === matchedId);
                let defaultSource = item.inventory_source || "millenio";
                if (matchedProd) {
                    if (matchedProd.stockVulcano > 0 && matchedProd.stockMillenio <= 0) defaultSource = "vulcano";
                }
                item.inventory_source = item.inventory_source || defaultSource;

                itemsHtml += `<div style="margin-bottom: 5px; font-size:0.8rem; font-weight:600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">
                    ${item.qty}x ${item.name}
                </div>`;

                mapHtml += `
                    <div style="margin-bottom: 5px; display:flex; gap: 4px; align-items:center;">
                        <select class="form-control tc-item-product-select" data-order-idx="${orderIdx}" data-item-idx="${itemIdx}" style="height:26px; padding: 2px; font-size: 0.75rem; width: 140px; border-color: ${matchedId ? 'var(--border)' : '#ef4444'};">
                            <option value="">-- Mapear... --</option>
                            ${erpProducts.map(p => `<option value="${p.id}" ${p.id === matchedId ? 'selected' : ''}>${p.name}</option>`).join('')}
                        </select>
                        ${matchedId ? '<i class="fas fa-check-circle text-success" title="Mapeado"></i>' : '<i class="fas fa-exclamation-circle text-danger" title="Falta mapear"></i>'}
                    </div>
                `;

                warehouseHtml += `
                    <div style="margin-bottom: 5px;">
                        <select class="form-control tc-item-warehouse-select" data-order-idx="${orderIdx}" data-item-idx="${itemIdx}" style="height:26px; padding: 2px; font-size: 0.75rem; width: 85px;">
                            <option value="millenio" ${item.inventory_source === 'millenio' ? 'selected' : ''}>Millenio</option>
                            <option value="vulcano" ${item.inventory_source === 'vulcano' ? 'selected' : ''}>Vulcano</option>
                        </select>
                    </div>
                `;
            });

            // Seller selection
            const selectedSellerId = order.seller_id || "";
            const sellerDropdown = `
                <select class="form-control tc-order-seller-select" data-order-idx="${orderIdx}" style="height:30px; padding: 2px 5px; font-size: 0.75rem; width: 120px; border-color: ${selectedSellerId ? 'var(--border)' : '#f59e0b'};">
                    <option value="">-- Seleccione... --</option>
                    ${sellers.map(s => `<option value="${s.id}" ${s.id === selectedSellerId ? 'selected' : ''}>${s.name}</option>`).join('')}
                </select>
            `;

            return `
                <tr id="tc-pending-row-${orderIdx}" class="${!order.seller_id ? 'highlight-warning' : ''}">
                    <td><input type="checkbox" class="tc-import-check" data-index="${orderIdx}"></td>
                    <td>${customerStr}</td>
                    <td>${logisticsStr}</td>
                    <td style="vertical-align: top;">${itemsHtml}</td>
                    <td style="vertical-align: top;">${mapHtml}</td>
                    <td style="vertical-align: top;">${warehouseHtml}</td>
                    <td style="vertical-align: middle;">${sellerDropdown}</td>
                    <td style="vertical-align: middle;"><strong>$${(order.sale_price || 0).toLocaleString()}</strong></td>
                    <td class="table-actions" style="vertical-align: middle;">
                        <button class="btn btn-sm btn-outline tc-import-single-btn" data-index="${orderIdx}" style="border-radius:6px; font-size:0.75rem; padding: 4px 8px;">Importar</button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    parseDropiData(rawText) {
        if (!rawText || !rawText.trim()) return [];

        const cleanText = rawText.trim();
        let orders = [];

        // 1. Check if it's JSON
        if (cleanText.startsWith('[') || cleanText.startsWith('{')) {
            try {
                let parsed = JSON.parse(cleanText);
                if (!Array.isArray(parsed)) parsed = [parsed];
                
                // Map JSON properties to our standard pending orders
                parsed.forEach(o => {
                    const name = o.customer_name || o.nombreRecibe || (o.cliente && o.cliente.nombre) || o.nombre_recibe || '';
                    const phone = o.customer_phone || o.celularRecibe || (o.cliente && o.cliente.telefono) || o.telefono_recibe || '';
                    const address = o.customer_address || o.direccionRecibe || (o.cliente && o.cliente.direccion) || o.direccion_recibe || '';
                    const city = o.customer_city || o.ciudadRecibe || (o.cliente && o.cliente.ciudad) || o.ciudad_recibe || '';
                    const dept = o.customer_dept || o.departamentoRecibe || (o.cliente && o.cliente.departamento) || o.departamento_recibe || '';
                    const carrier = o.carrier || o.nombreTransportadora || o.transportadora || '';
                    const tracking = o.tracking_number || o.guia || o.tracking || o.numero_guia || '';
                    const shipping = parseFloat(o.shipping_cost || o.costo_envio || o.valorFlete || o.flete_recaudo || 0);
                    const totalVal = parseFloat(o.sale_price || o.total || o.valorTotal || o.recaudo || 0);
                    
                    let items = [];
                    const jsonItems = o.items || o.productos || o.detalles || [];
                    if (Array.isArray(jsonItems)) {
                        jsonItems.forEach(item => {
                            items.push({
                                name: item.name || item.nombre || item.producto || 'Producto Dropi',
                                qty: parseInt(item.qty || item.cantidad || item.cantidad_producto || 1),
                                mapped_product_id: item.mapped_product_id || item.product_id || '',
                                inventory_source: item.inventory_source || 'millenio'
                            });
                        });
                    } else if (typeof jsonItems === 'string') {
                        items.push({ name: jsonItems, qty: 1, mapped_product_id: '', inventory_source: 'millenio' });
                    }

                    if (name && phone && items.length > 0) {
                        orders.push({
                            id: o.id || o.id_orden || o.idPedido || 'DR-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                            date: o.date || o.fecha || new Date().toISOString(),
                            customer_name: name,
                            customer_phone: phone,
                            customer_address: address,
                            customer_city: city,
                            customer_dept: dept,
                            carrier: carrier,
                            tracking_number: tracking,
                            shipping_cost: shipping,
                            sale_price: totalVal,
                            items: items,
                            seller_id: o.seller_id || ''
                        });
                    }
                });
            } catch (e) {
                console.warn('[TUCOMPRAS] Failed to parse Dropi data as JSON, falling back to CSV parser.', e.message);
            }
        }

        // 2. CSV Parser (either fallback or primary)
        if (orders.length === 0) {
            const lines = cleanText.split(/\r?\n/).filter(l => l.trim().length > 0);
            if (lines.length > 1) {
                // Detect delimiter
                const headerLine = lines[0];
                let delim = ',';
                const commaCount = (headerLine.match(/,/g) || []).length;
                const semiCount = (headerLine.match(/;/g) || []).length;
                const tabCount = (headerLine.match(/\t/g) || []).length;
                
                if (semiCount > commaCount && semiCount > tabCount) delim = ';';
                else if (tabCount > commaCount && tabCount > semiCount) delim = '\t';

                const parseCsvRow = (rowText) => {
                    let fields = [];
                    let insideQuote = false;
                    let current = '';
                    for (let i = 0; i < rowText.length; i++) {
                        const char = rowText[i];
                        if (char === '"') {
                            insideQuote = !insideQuote;
                        } else if (char === delim && !insideQuote) {
                            fields.push(current.trim());
                            current = '';
                        } else {
                            current += char;
                        }
                    }
                    fields.push(current.trim());
                    return fields;
                };

                const headers = parseCsvRow(headerLine).map(h => h.toLowerCase()
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                    .replace(/[^a-z0-9_]/g, '_')
                    .replace(/_+/g, '_')
                    .replace(/(^_|_$)/g, '')
                );

                console.log('[TUCOMPRAS] Normalized CSV headers:', headers);

                const getHeaderIdx = (synonyms) => {
                    return headers.findIndex(h => synonyms.some(syn => h === syn || h.includes(syn)));
                };

                const idxId = getHeaderIdx(['id', 'pedido', 'orden', 'consecutivo', 'numero']);
                const idxName = getHeaderIdx(['cliente', 'recibe', 'nombre', 'destinatario', 'nombre_recibe']);
                const idxPhone = getHeaderIdx(['telefono', 'celular', 'movil', 'contacto', 'celular_recibe']);
                const idxAddress = getHeaderIdx(['direccion', 'nomenclatura', 'direccion_recibe']);
                const idxCity = getHeaderIdx(['ciudad', 'municipio', 'ciudad_recibe']);
                const idxDept = getHeaderIdx(['departamento', 'estado', 'departamento_recibe']);
                const idxCarrier = getHeaderIdx(['transportadora', 'courier', 'carrier', 'nombre_transportadora']);
                const idxTracking = getHeaderIdx(['guia', 'rastrear', 'tracking', 'codigo_rastreo', 'numero_guia']);
                const idxShipping = getHeaderIdx(['flete', 'costo_envio', 'valor_envio', 'flete_recaudo']);
                const idxTotal = getHeaderIdx(['total', 'recaudo', 'valor_cobrar', 'cobro', 'valor_total']);
                const idxProductName = getHeaderIdx(['producto', 'item', 'descripcion', 'articulo', 'detalle']);
                const idxProductQty = getHeaderIdx(['cantidad', 'unidades', 'qty', 'cantidad_producto']);

                const groupedOrders = {};

                for (let i = 1; i < lines.length; i++) {
                    const cols = parseCsvRow(lines[i]);
                    if (cols.length < 2) continue;

                    const id = idxId !== -1 ? cols[idxId] : '';
                    const name = idxName !== -1 ? cols[idxName] : '';
                    const phone = idxPhone !== -1 ? cols[idxPhone] : '';
                    
                    if (!name && !phone) continue;

                    const groupKey = id || `${name}_${phone}`;

                    const address = idxAddress !== -1 ? cols[idxAddress] : '';
                    const city = idxCity !== -1 ? cols[idxCity] : '';
                    const dept = idxDept !== -1 ? cols[idxDept] : '';
                    const carrier = idxCarrier !== -1 ? cols[idxCarrier] : '';
                    const tracking = idxTracking !== -1 ? cols[idxTracking] : '';
                    const shipping = idxShipping !== -1 ? parseFloat(cols[idxShipping].replace(/[^\d.-]/g, '')) || 0 : 0;
                    const totalVal = idxTotal !== -1 ? parseFloat(cols[idxTotal].replace(/[^\d.-]/g, '')) || 0 : 0;
                    
                    const prodName = idxProductName !== -1 ? cols[idxProductName] : 'Producto Dropi';
                    const prodQty = idxProductQty !== -1 ? parseInt(cols[idxProductQty].replace(/[^\d]/g, '')) || 1 : 1;

                    if (!groupedOrders[groupKey]) {
                        groupedOrders[groupKey] = {
                            id: id || 'DR-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                            date: new Date().toISOString(),
                            customer_name: name,
                            customer_phone: phone,
                            customer_address: address,
                            customer_city: city,
                            customer_dept: dept,
                            carrier: carrier,
                            tracking_number: tracking,
                            shipping_cost: shipping,
                            sale_price: totalVal,
                            items: [],
                            seller_id: ''
                        };
                    }

                    groupedOrders[groupKey].items.push({
                        name: prodName,
                        qty: prodQty,
                        mapped_product_id: '',
                        inventory_source: 'millenio'
                    });
                }

                orders = Object.values(groupedOrders);
            }
        }

        return orders;
    },

    async handleImportOrders(indices) {
        if (!indices || indices.length === 0) {
            alert('Por favor seleccione al menos un pedido para importar.');
            return;
        }

        const erpProducts = Inventory.getProducts().filter(p => p.active !== false);
        let successCount = 0;

        for (const idx of indices) {
            const order = this.pendingImportOrders[idx];
            if (!order) continue;

            // 1. Validation
            if (!order.seller_id) {
                alert(`⚠️ El pedido de "${order.customer_name}" no tiene Vendedor asignado.`);
                return;
            }

            const missingMap = order.items.some(item => !item.mapped_product_id);
            if (missingMap) {
                alert(`⚠️ El pedido de "${order.customer_name}" tiene artículos sin mapear a productos del ERP.`);
                return;
            }

            // Validate stock availability
            const stockErrors = [];
            for (const item of order.items) {
                const product = erpProducts.find(p => p.id === item.mapped_product_id);
                if (!product) {
                    stockErrors.push(`El producto mapeado para "${item.name}" no existe.`);
                    continue;
                }
                const source = item.inventory_source || 'millenio';
                const available = source === 'millenio' ? (product.stockMillenio || 0) : (product.stockVulcano || 0);
                if (item.qty > available) {
                    stockErrors.push(`"${product.name}": solicitados ${item.qty}, disponibles ${available} en ${source}.`);
                }
            }
            if (stockErrors.length > 0) {
                alert(`❌ Stock insuficiente para el pedido de "${order.customer_name}":\n\n` + stockErrors.join('\n'));
                return;
            }

            // 2. Process stock discount
            for (const item of order.items) {
                const product = erpProducts.find(p => p.id === item.mapped_product_id);
                if (product) {
                    const source = item.inventory_source || 'millenio';
                    if (source === 'millenio') product.stockMillenio -= item.qty;
                    else product.stockVulcano -= item.qty;
                    await Storage.updateItem(STORAGE_KEYS.PRODUCTS, product.id, product);
                }
            }

            // 3. Create items list for ERP TuCompras sale
            const finalSaleItems = order.items.map(item => {
                const prod = erpProducts.find(p => p.id === item.mapped_product_id);
                return {
                    product_id: item.mapped_product_id,
                    name: prod.name,
                    qty: item.qty,
                    cost_price: prod.priceWholesale || prod.cost || 0,
                    sale_price: order.sale_price / order.items.length, // Distribute total price evenly
                    commission_paid: prod.commissionBase || 0,
                    inventory_source: item.inventory_source
                };
            });

            const totalCommission = finalSaleItems.reduce((sum, i) => sum + (parseFloat(i.commission_paid) * i.qty), 0);

            // Construct sale object
            const sale = {
                id: 'TC-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                date: order.date || new Date().toISOString(),
                customer_name: order.customer_name,
                customer_phone: order.customer_phone,
                seller_id: order.seller_id,
                carrier: order.carrier,
                tracking_number: order.tracking_number,
                inventory_source: order.items[0].inventory_source,
                status: 'despachado',
                shipping_cost: order.shipping_cost,
                commission_paid: totalCommission,
                items: finalSaleItems,
                money_confirmed: false,
                is_paid_to_inventory: false
            };

            // Save sale
            await Storage.addItem(STORAGE_KEYS.TUCOMPRAS_SALES, sale);

            // CRM Sync
            await TuComprasCRM.addCustomer({
                name: order.customer_name,
                phone: order.customer_phone,
                dept: order.customer_dept || '',
                city: order.customer_city || '',
                address: order.customer_address || ''
            });

            successCount++;
        }

        // Clean imported items from list
        this.pendingImportOrders = this.pendingImportOrders.filter((_, idx) => !indices.includes(idx));

        alert(`¡Se importaron ${successCount} pedidos al ERP exitosamente!`);
        this.renderPanel();
    }
};
