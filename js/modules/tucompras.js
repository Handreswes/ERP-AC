// TUCOMPRAS Module
window.TuCompras = {
    activeStatus: 'despachado',
    cart: [],
    selectedLiquidations: new Set(),

    init() {
        this.renderPanel();
    },

    getSales() {
        return Storage.get(STORAGE_KEYS.TUCOMPRAS_SALES);
    },

    renderPanel() {
        const contentArea = document.getElementById('content-area');
        if (!document.getElementById('tucompras-panel')) {
            const panel = document.createElement('div');
            panel.id = 'tucompras-panel';
            panel.className = 'panel';
            contentArea.appendChild(panel);
        }

        const panel = document.getElementById('tucompras-panel');
        panel.innerHTML = `
            <div class="panel-header">
                <h1>E-commerce TUCOMPRAS</h1>
                <div class="actions">
                    <button id="new-tucompras-sale-btn" class="btn btn-primary">Nueva Venta Ecommerce</button>
                </div>
            </div>

            <div class="stats-grid" id="tc-stats-container">
                <!-- Stats load here -->
            </div>

            <div class="inventory-tabs" style="margin-bottom: 1.5rem;">
                <button class="tab-btn ${this.activeStatus === 'despachado' ? 'active' : ''}" data-status="despachado">Despachados</button>
                <button class="tab-btn ${this.activeStatus === 'recibido' ? 'active' : ''}" data-status="recibido">Entregados</button>
                <button class="tab-btn ${this.activeStatus === 'proceso_devolucion' ? 'active' : ''}" data-status="proceso_devolucion">En Proceso Dev.</button>
                <button class="tab-btn ${this.activeStatus === 'devolucion_recibida' ? 'active' : ''}" data-status="devolucion_recibida">Devueltos</button>
                <button class="tab-btn ${this.activeStatus === 'liquidacion' ? 'active' : ''}" data-status="liquidacion" style="border: 1px solid var(--accent);">Liquidación Bodegas</button>
            </div>

            <div id="tucompras-main-content">
                <!-- Data will be loaded here -->
            </div>

            <!-- New Sale Modal - CRM & MULTI PRODUCT -->
            <div id="tucompras-sale-modal" class="modal">
                <div class="modal-content" style="max-width: 1100px; width: 95%;">
                    <div class="modal-header">
                        <h2>Nueva Venta Ecommerce</h2>
                        <span class="close-modal">&times;</span>
                    </div>
                    <div class="modal-body" style="padding: 1rem;">
                        <div class="pos-container" style="display: grid; grid-template-columns: 1fr 380px; gap: 1rem; height: 80vh;">
                            
                            <!-- Left: Product Selection & Customer -->
                            <div class="selection-area" style="display: flex; flex-direction: column; gap: 1rem; overflow-y: auto;">
                                
                                <!-- CUSTOMER SECTION -->
                                <div class="card" style="background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 8px; border: 1px solid var(--border);">
                                    <h3><i class="fas fa-user-circle"></i> Información del Cliente</h3>
                                    <div class="form-grid" style="grid-template-columns: 1fr 1fr; margin-top: 10px;">
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
                                        <div class="form-group" id="tc-cust-city-other-group" style="display: none;">
                                            <label>Escriba Ciudad *</label>
                                            <input type="text" id="tc-cust-city-other" class="form-control" placeholder="Nombre de la ciudad">
                                        </div>
                                        <div class="form-group" style="grid-column: span 2;">
                                            <label>Dirección (Opcional)</label>
                                            <input type="text" id="tc-cust-address" class="form-control" placeholder="Calle, Carrera, Apto...">
                                        </div>
                                    </div>
                                </div>

                                <!-- PRODUCT GRID -->
                                <div class="card" style="background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 8px; border: 1px solid var(--border); flex: 1; display: flex; flex-direction: column; min-height: 300px;">
                                    <h3><i class="fas fa-box-open"></i> Elegir Productos</h3>
                                    <div class="search-bar" style="width: 100%; margin: 10px 0;">
                                        <i class="fas fa-search"></i>
                                        <input type="text" id="tc-product-search" placeholder="Buscar por nombre..." style="background: none; border: none; color: white; width: 100%;">
                                    </div>
                                    <div id="tc-product-grid" class="product-grid-tiny" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; overflow-y: auto; flex: 1;">
                                        <!-- Products -->
                                    </div>
                                </div>
                            </div>

                            <!-- Right: Logistics & Cart -->
                            <div class="cart-form-area" style="background: var(--bg-sidebar); border-radius: 8px; padding: 1rem; display: flex; flex-direction: column; gap: 1rem; border: 1px solid var(--border); overflow-y: auto;">
                                <h3><i class="fas fa-shipping-fast"></i> Logística y Comisión</h3>
                                <form id="tucompras-sale-form">
                                    <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
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
                                            <label>Vendedor</label>
                                            <select id="tc-seller-select" name="seller_id" class="form-control" required></select>
                                        </div>
                                        <div class="form-group">
                                            <label>Bodega</label>
                                            <select name="inventory_source" class="form-control" required id="tc-source-select">
                                                <option value="millenio">Millenio</option>
                                                <option value="vulcano">Vulcano</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div id="tc-cart-items" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 1rem; min-height: 100px;">
                                        <!-- Cart -->
                                    </div>

                                    <div class="summary-card" style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">
                                        <div class="form-group" style="margin-bottom: 5px;">
                                            <label style="font-size: 0.75rem;">Flete (Valor Cobrado por Dropi)</label>
                                            <input type="number" name="shipping_cost" class="form-control" required value="0" style="height: 30px;">
                                        </div>
                                        <div class="summary-line" style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                                            <span>Subtotal Venta:</span>
                                            <strong id="tc-total-sale-text">$0</strong>
                                        </div>
                                        <div class="summary-line" style="display: flex; justify-content: space-between; font-size: 0.9rem; color: var(--text-secondary);">
                                            <span>Subtotal Comisión:</span>
                                            <strong id="tc-total-commission-text">$0</strong>
                                        </div>
                                    </div>

                                    <button type="submit" class="btn btn-primary btn-block" style="margin-top: 1rem; height: 50px;">REGISTRAR DESPACHO</button>
                                </form>
                            </div>
                        </div>
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
        this.updateCartUI();
        this.renderProductGrid();

        // Location Data
        Locations.populateDepartments('tc-cust-dept');

        // Sellers
        const sellersSel = document.getElementById('tc-seller-select');
        const sellers = Vendedores.getSellers().filter(s => s.status === 'active');
        sellersSel.innerHTML = '<option value="">Seleccione...</option>' + sellers.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

        document.getElementById('tucompras-sale-form').reset();
        document.getElementById('tc-cust-name').value = '';
        document.getElementById('tc-cust-phone').value = '';
        document.getElementById('tucompras-sale-modal').classList.add('show');
    },

    renderProductGrid(query = '') {
        const grid = document.getElementById('tc-product-grid');
        if (!grid) return;

        const products = Inventory.getProducts().filter(p => p.active !== false && p.name.toLowerCase().includes(query.toLowerCase()));
        grid.innerHTML = products.map(p => `
            <div class="product-item-tiny" style="background: var(--bg-card); padding: 5px; border-radius: 6px; border: 1px solid var(--border); display: flex; flex-direction: column; gap: 3px;">
                <img src="${p.image || 'https://via.placeholder.com/60'}" style="width: 100%; height: 50px; object-fit: cover; border-radius: 3px;">
                <h4 style="font-size: 0.65rem; margin:0; line-height: 1.1;">${p.name}</h4>
                <p style="font-size: 0.6rem; color: var(--text-secondary); margin:0;">Stock: ${parseInt(p.stockMillenio) + parseInt(p.stockVulcano)}</p>
                <button class="btn btn-sm btn-primary tc-add-btn" data-id="${p.id}" style="padding: 1px; font-size: 0.6rem;">+Añadir</button>
            </div>
        `).join('');
    },

    addToCart(productId) {
        const product = Inventory.getProducts().find(p => p.id === productId);
        if (!product) return;

        const existing = this.cart.find(i => i.product_id === productId);
        if (existing) {
            existing.qty++;
        } else {
            this.cart.push({
                product_id: productId,
                name: product.name,
                qty: 1,
                cost_price: product.priceWholesale || product.cost || 0,
                sale_price: product.priceInternet || 0,
                commission_paid: product.commissionBase || 0
            });
        }
        this.updateCartUI();
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

        // Save customer profile automatically
        await TuComprasCRM.addCustomer({
            name, phone,
            dept: document.getElementById('tc-cust-dept').value,
            city: document.getElementById('tc-cust-city').value,
            address: document.getElementById('tc-cust-address').value
        });


        for (const item of this.cart) {
            const product = Inventory.getProducts().find(p => p.id === item.product_id);
            if (product) {
                if (source === 'millenio') product.stockMillenio -= item.qty;
                else product.stockVulcano -= item.qty;
                await Storage.updateItem(STORAGE_KEYS.PRODUCTS, product.id, product);
            }
        }

        // Calculate total commission (sum across all cart items x qty)
        const totalCommission = this.cart.reduce((sum, i) => sum + (parseFloat(i.commission_paid || 0) * (i.qty || 1)), 0);

        const sale = {
            date: new Date().toISOString(),
            customer_name: name,
            customer_phone: phone,
            seller_id: formData.get('seller_id'),
            carrier: formData.get('carrier'),
            tracking_number: formData.get('tracking_number'),
            inventory_source: source,
            status: 'despachado',
            shipping_cost: parseFloat(formData.get('shipping_cost')) || 0,
            commission_paid: totalCommission, // ← total commission stored at root for quick access
            items: this.cart,
            money_confirmed: false,
            is_paid_to_inventory: false
        };

        await Storage.addItem(STORAGE_KEYS.TUCOMPRAS_SALES, sale);
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
