// TUCOMPRAS Module
window.TuCompras = {
    activeStatus: 'despachado',
    cart: [],
    selectedLiquidations: new Set(),
    activeStep: 1,
    activeCompanyFilter: 'all',
    pendingImportOrders: [],
    hideImported: true,
    hideCancelled: true,
    statusFilter: 'active',

    init() {
        this.renderPanel();
    },

    getSales() {
        return Storage.get(STORAGE_KEYS.TUCOMPRAS_SALES);
    },

    isOrderImported(order) {
        const sales = this.getSales();
        return sales.find(s => 
            (s.id === 'TC-DR-' + order.id) || 
            (order.tracking_number && s.tracking_number === order.tracking_number)
        );
    },

    parseDropiDateStr(dateStr, timeStr = '') {
        if (!dateStr) return new Date().toISOString();
        const dateParts = dateStr.split(/[-/]/);
        if (dateParts.length === 3) {
            let day, month, year;
            if (dateParts[2].length === 4) {
                day = parseInt(dateParts[0]);
                month = parseInt(dateParts[1]) - 1;
                year = parseInt(dateParts[2]);
            } else if (dateParts[0].length === 4) {
                year = parseInt(dateParts[0]);
                month = parseInt(dateParts[1]) - 1;
                day = parseInt(dateParts[2]);
            } else {
                return new Date().toISOString();
            }
            let hours = 12, minutes = 0;
            if (timeStr) {
                const timeParts = timeStr.split(':');
                if (timeParts.length >= 2) {
                    hours = parseInt(timeParts[0]) || 12;
                    minutes = parseInt(timeParts[1]) || 0;
                }
            }
            try {
                return new Date(year, month, day, hours, minutes).toISOString();
            } catch (e) {
                return new Date().toISOString();
            }
        }
        return new Date().toISOString();
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
                                <div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;">
                                    <div style="flex: 1; min-width: 250px; position: relative;">
                                        <i class="fas fa-search" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-secondary); font-size: 1rem;"></i>
                                        <input type="text" id="tc-product-search" class="form-control" placeholder="🔍 Buscar producto por nombre..." style="padding-left: 40px !important; border-radius: 12px; height: 42px; font-size: 0.9rem;">
                                    </div>
                                    <div class="filter-group" style="display: flex; gap: 5px; background: var(--bg-card); padding: 5px; border-radius: 12px; border: 1px solid var(--border);">
                                        <button class="tab-btn btn-sm tc-filter-btn active" data-filter="all">Todas</button>
                                        <button class="tab-btn btn-sm tc-filter-btn" data-filter="millenio">Millenio</button>
                                        <button class="tab-btn btn-sm tc-filter-btn" data-filter="vulcano">Vulcano</button>
                                    </div>
                                </div>

                                <div id="tc-product-grid" class="product-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 15px; max-height: 450px; overflow-y: auto; padding-right: 10px;">
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
                    <td data-label="Fecha">${new Date(s.date).toLocaleDateString()}</td>
                    <td data-label="Cliente">
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
                    <td data-label="Productos" style="font-size: 0.8rem;">${productNames}</td>
                    <td data-label="Vendedor">${seller}</td>
                    <td data-label="Precio Venta">$${parseFloat(totalSaleValue).toLocaleString()}</td>
                    <td data-label="Comisión" class="text-orange">$${parseFloat(totalCommValue).toLocaleString()}</td>
                    <td data-label="Utilidad" class="${utility >= 0 ? 'text-success' : 'text-danger'}"><strong>$${utility.toLocaleString()}</strong></td>
                    <td data-label="Estado Pago">
                        <span class="badge ${s.money_confirmed ? 'bg-success' : 'bg-secondary'}">
                            ${s.money_confirmed ? 'PAGADA' : 'PENDIENTE'}
                        </span>
                    </td>
                    <td data-label="Acciones">
                        <button class="btn btn-sm btn-outline tc-update-btn" data-id="${s.id}">Actualizar</button>
                    </td>
                </tr>
            `;
        }).join('');
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
        const searchInput = document.getElementById('tc-product-search');
        if (searchInput) searchInput.value = '';
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
                if (this.activeCompanyFilter === 'millenio') return (parseInt(p.stockMillenio) || 0) > 0 || p.company === 'millenio';
                if (this.activeCompanyFilter === 'vulcano') return (parseInt(p.stockVulcano) || 0) > 0 || p.company === 'vulcano';
                return true;
            });
        }

        if (products.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-secondary);"><i class="fas fa-box-open" style="font-size: 2rem; margin-bottom: 10px;"></i><br>No se encontraron productos que coincidan.</div>';
            return;
        }

        grid.innerHTML = products.map(p => {
            const stockM = parseInt(p.stockMillenio) || 0;
            const stockV = parseInt(p.stockVulcano) || 0;
            const totalStock = stockM + stockV;
            const inCart = this.cart.find(item => item.product_id === p.id);
            const qtyInCart = inCart ? inCart.qty : 0;

            return `
                <div class="product-item" style="background: var(--bg-card); padding: 12px; border-radius: 14px; border: 1px solid ${qtyInCart > 0 ? 'var(--accent)' : 'var(--border)'}; display: flex; flex-direction: column; gap: 8px; transition: all 0.2s ease; position: relative;">
                    ${qtyInCart > 0 ? `<span style="position: absolute; top: -8px; right: -8px; background: var(--accent); color: white; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">${qtyInCart}</span>` : ''}
                    <img src="${(Array.isArray(p.image) ? p.image[0] : p.image) || 'https://via.placeholder.com/100'}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 8px;">
                    <h4 style="font-size: 0.85rem; margin:0; line-height: 1.2; height: 2.4rem; overflow: hidden; color: var(--text-primary);" title="${p.name}">${p.name}</h4>
                    <div style="display: flex; gap: 4px; flex-wrap: wrap; align-items: center;">
                        <span class="badge ${totalStock > 0 ? 'bg-success' : 'bg-danger'}" style="font-size: 0.65rem; padding: 2px 6px;">
                            ${totalStock > 0 ? `Stock Total: ${totalStock}` : 'SIN STOCK'}
                        </span>
                        ${stockM > 0 ? `<span class="badge bg-blue" style="font-size: 0.6rem; padding: 2px 5px;" title="Stock Millenio">M: ${stockM}</span>` : ''}
                        ${stockV > 0 ? `<span class="badge bg-orange" style="font-size: 0.6rem; padding: 2px 5px;" title="Stock Vulcano">V: ${stockV}</span>` : ''}
                    </div>
                    <div style="margin-top: auto; display: flex; justify-content: space-between; align-items: center; padding-top: 4px;">
                        <span style="font-size: 0.9rem; font-weight: 700; color: var(--accent-vibrant);">$${parseFloat(p.priceFinal || p.priceInternet || 0).toLocaleString()}</span>
                        <button class="btn btn-sm ${qtyInCart > 0 ? 'btn-success' : 'btn-primary'} tc-add-btn" data-id="${p.id}" style="height: 32px; padding: 0 12px; border-radius: 8px; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                            <i class="fas ${qtyInCart > 0 ? 'fa-plus' : 'fa-cart-plus'}"></i> ${qtyInCart > 0 ? 'Agregar +1' : 'Agregar'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    addToCart(productId) {
        const product = Inventory.getProducts().find(p => p.id === productId);
        if (!product) return;

        // Auto-determine source based on stock
        const stockM = parseInt(product.stockMillenio) || 0;
        const stockV = parseInt(product.stockVulcano) || 0;
        let source = 'millenio';
        if (stockV > 0 && stockM <= 0) source = 'vulcano';
        else if (stockM > 0) source = 'millenio';
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
        this.renderProductGrid(document.getElementById('tc-product-search')?.value || '');
    },

    removeFromCart(productId) {
        this.cart = this.cart.filter(i => i.product_id !== productId);
        this.updateCartUI();
        this.renderProductGrid(document.getElementById('tc-product-search')?.value || '');
    },

    updateCartUI() {
        const container = document.getElementById('tc-cart-items');
        if (!container) return;

        container.innerHTML = this.cart.length === 0 ? '<p class="text-center text-secondary">Elegir productos de la izquierda</p>' :
            this.cart.map(i => `
                <div class="cart-item" style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 10px; border: 1px solid var(--border); font-size: 0.8rem; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <strong style="color: var(--text-primary); font-size: 0.85rem;">${i.name}</strong>
                        <button type="button" class="tc-remove-item icon-btn" data-id="${i.product_id}" style="width:22px; height:22px; font-size: 0.7rem; background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); border-radius: 50%; cursor: pointer;">&times;</button>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; align-items: center;">
                        <div class="form-group" style="margin:0;">
                            <label style="font-size: 0.65rem; color: var(--text-secondary);">Cantidad</label>
                            <input type="number" min="1" value="${i.qty}" onchange="TuCompras.updateCartValue('${i.product_id}', 'qty', this.value)" style="width: 100%; height: 28px; font-size: 0.8rem; font-weight: 700; text-align: center; border-radius: 6px; border: 1px solid var(--accent); background: var(--bg-body); color: var(--accent-vibrant);">
                        </div>
                        <div class="form-group" style="margin:0;">
                            <label style="font-size: 0.65rem; color: var(--text-secondary);">P. Venta ($)</label>
                            <input type="number" value="${i.sale_price}" onchange="TuCompras.updateCartValue('${i.product_id}', 'sale_price', this.value)" style="width: 100%; height: 28px; font-size: 0.8rem; font-weight: 600; border-radius: 6px; background: var(--bg-body); color: var(--text-primary);">
                        </div>
                        <div class="form-group" style="margin:0;">
                            <label style="font-size: 0.65rem; color: var(--text-secondary);">Comisión ($)</label>
                            <input type="number" value="${i.commission_paid}" onchange="TuCompras.updateCartValue('${i.product_id}', 'commission_paid', this.value)" style="width: 100%; height: 28px; font-size: 0.8rem; font-weight: 600; border-radius: 6px; background: rgba(245,158,11,0.05); color: #f59e0b;">
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
            const val = parseFloat(value) || 0;
            if (field === 'qty') {
                item.qty = Math.max(1, parseInt(val) || 1);
            } else {
                item[field] = val;
            }
            this.updateCartUI();
            this.renderProductGrid(document.getElementById('tc-product-search')?.value || '');
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

        // FIX: Smart Stock Validation per Product Item
        const stockErrors = [];
        for (const item of this.cart) {
            const product = Inventory.getProducts().find(p => p.id === item.product_id);
            if (!product) {
                stockErrors.push(`"${item.name}" ya no existe en inventario.`);
                continue;
            }
            const stockM = parseInt(product.stockMillenio) || 0;
            const stockV = parseInt(product.stockVulcano) || 0;
            const totalStock = stockM + stockV;

            let itemSource = item.inventory_source || (stockM > 0 ? 'millenio' : 'vulcano');
            let available = itemSource === 'millenio' ? stockM : stockV;

            // If current warehouse stock is lower than requested quantity, auto-switch to the other warehouse if it has stock
            if (item.qty > available) {
                const altSource = itemSource === 'millenio' ? 'vulcano' : 'millenio';
                const altAvailable = altSource === 'millenio' ? stockM : stockV;
                if (item.qty <= altAvailable) {
                    item.inventory_source = altSource; // Auto switch
                } else {
                    stockErrors.push(`"${product.name}": Solicitados ${item.qty}, disponible total en bodegas: ${totalStock} (Millenio: ${stockM}, Vulcano: ${stockV}).`);
                }
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

        alert('✅ Venta registrada y despacho creado con éxito.');
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('show'));
        this.renderPanel();
    },

    setupEventListeners() {
        const panel = document.getElementById('tucompras-panel');
        if (!panel) return;

        panel.onclick = async (e) => {
            const tabBtn = e.target.closest('.inventory-tabs .tab-btn');
            if (tabBtn && tabBtn.dataset.status) {
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
        };

        panel.oninput = (e) => {
            if (e.target.id === 'tc-product-search') {
                this.renderProductGrid(e.target.value);
            }
        };
    }
};
