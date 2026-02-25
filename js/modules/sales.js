// Sales Module
window.Sales = {
    cart: [],
    selectedClient: null,
    activeCompany: 'all',

    init() {
        this.renderPanel();
        this.setupEventListeners();
    },

    renderPanel() {
        const contentArea = document.getElementById('content-area');

        if (!document.getElementById('sales-panel')) {
            const panel = document.createElement('div');
            panel.id = 'sales-panel';
            panel.className = 'panel';
            contentArea.appendChild(panel);
        }

        const panel = document.getElementById('sales-panel');
        panel.innerHTML = `
            <div class="panel-header">
                <h1>Ventas POS</h1>
                <div class="company-selector">
                    <button class="btn ${this.activeCompany === 'all' ? 'btn-primary' : 'btn-outline'}" data-company="all">Todos</button>
                    <button class="btn ${this.activeCompany === 'millenio' ? 'btn-primary' : 'btn-outline'}" data-company="millenio">Millenio</button>
                    <button class="btn ${this.activeCompany === 'vulcano' ? 'btn-primary' : 'btn-outline'}" data-company="vulcano">Vulcano</button>
                </div>
            </div>

            <div class="pos-container">
                <div class="pos-main">
                    <div class="search-row">
                        <input type="text" id="pos-product-search" placeholder="Buscar producto..." class="form-control">
                    </div>
                    
                    <div id="pos-product-grid" class="pos-grid">
                        <!-- Product grid will be rendered here -->
                    </div>
                </div>

                <aside class="pos-sidebar">
                    <div class="cart-container" style="margin-bottom: 1.5rem;">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>Precio</th>
                                    <th>Cant.</th>
                                    <th>Total</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody id="cart-list"></tbody>
                        </table>
                    </div>

                    <div class="pos-card client-selection">
                        <h3>Cliente</h3>
                        <div id="selected-client-info" class="selected-client-info">
                            <p class="text-secondary">Ningún cliente seleccionado</p>
                        </div>
                        <button id="select-client-btn" class="btn btn-outline btn-block">Seleccionar Cliente</button>
                    </div>

                    <div class="pos-card summary">
                        <div class="summary-line total">
                            <span>Total:</span>
                            <span id="pos-total">$0.00</span>
                        </div>
                        
                        <div class="payment-methods">
                            <label>Método de Pago</label>
                            <select id="payment-method" class="form-control">
                                <option value="cash">Efectivo</option>
                                <option value="transfer">Consignación / Transferencia</option>
                                <option value="credit">Crédito (Cuenta Corriente)</option>
                            </select>
                        </div>

                        <div id="payment-details-container" style="display: none; margin-top: 1rem;">
                            <!-- Dynamic Bank Select -->
                        </div>

                        <button id="checkout-btn" class="btn btn-primary btn-block btn-lg" style="margin-top: 1rem;">Finalizar Venta</button>
                    </div>
                </aside>
            </div>

            <!-- Client Picker Modal -->
            <div id="client-picker-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Seleccionar Cliente</h2>
                        <span class="close-modal">&times;</span>
                    </div>
                    <div class="modal-body">
                        <input type="text" id="picker-search" placeholder="Buscar cliente..." class="form-control">
                        <div id="picker-list" class="picker-list"></div>
                    </div>
                </div>
            </div>
        `;

        this.renderProductGrid();
        this.updateCartUI();
    },

    renderProductGrid(searchTerm = '') {
        const grid = document.getElementById('pos-product-grid');
        if (!grid) return;

        const allProducts = Inventory.getProducts();
        console.log(`[POS Debug] Full storage: ${allProducts.length} items`);

        const products = allProducts.filter(p => {
            const name = p.name || '';
            const category = p.category || '';
            const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                category.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesCompany = this.activeCompany === 'all' || !p.company || p.company === 'both' || p.company === this.activeCompany;
            const isActive = p.active !== false;

            return isActive && matchesSearch && matchesCompany;
        });

        console.log(`[POS Debug] Filtered products for grid: ${products.length} (Company: ${this.activeCompany})`);

        if (products.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1/-1; padding: 2rem; text-align: center; opacity: 0.5;">No se encontraron productos</div>';
            return;
        }

        grid.innerHTML = products.map(p => {
            const stock = this.activeCompany === 'millenio' ? p.stockMillenio :
                this.activeCompany === 'vulcano' ? p.stockVulcano :
                    ((parseInt(p.stockMillenio) || 0) + (parseInt(p.stockVulcano) || 0));

            return `
                <div class="product-card" data-id="${p.id}">
                    <img src="${p.image || 'https://via.placeholder.com/150?text=No+Foto'}" class="card-img" alt="${p.name}">
                    <div class="card-info">
                        <div class="card-name">${p.name}</div>
                        <div class="card-price">$${(p.priceWholesale || p.priceFinal).toLocaleString()}</div>
                        <div class="card-stock">S: ${stock}</div>
                    </div>
                </div>
            `;
        }).join('');
    },

    updateCartUI() {
        const list = document.getElementById('cart-list');
        if (!list) return;

        let total = 0;
        list.innerHTML = this.cart.map((item, index) => {
            const subtotal = item.price * item.quantity;
            total += subtotal;
            return `
                <tr>
                    <td><div style="max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${item.name}">${item.name}</div></td>
                    <td>
                        <input type="number" class="cart-price-input" data-index="${index}" value="${item.price}" step="1">
                    </td>
                    <td>
                        <div class="qty-control">
                            <button class="qty-btn" data-index="${index}" data-action="dec">-</button>
                            <span>${item.quantity}</span>
                            <button class="qty-btn" data-index="${index}" data-action="inc">+</button>
                        </div>
                    </td>
                    <td>$${subtotal.toLocaleString()}</td>
                    <td><button class="icon-btn text-danger remove-item" data-index="${index}"><i class="fas fa-times"></i></button></td>
                </tr>
            `;
        }).join('');

        if (this.cart.length === 0) {
            list.innerHTML = '<tr><td colspan="5" class="text-center">Vacio</td></tr>';
        }

        const totalEl = document.getElementById('pos-total');
        if (totalEl) totalEl.textContent = `$${total.toLocaleString()}`;
    },

    addToCart(product) {
        const existing = this.cart.find(item => item.id === product.id);
        // Default to wholesale price as requested
        const defaultPrice = product.priceWholesale || product.priceFinal;

        if (existing) {
            existing.quantity++;
        } else {
            this.cart.push({
                ...product,
                price: defaultPrice,
                quantity: 1
            });
        }
        this.updateCartUI();
    },

    setupEventListeners() {
        const container = document.getElementById('sales-panel');
        if (!container) return;

        // Centralized Event Delegation for Click Actions
        container.onclick = async (e) => {
            // 1. Company Switching
            if (e.target.dataset.company) {
                this.activeCompany = e.target.dataset.company;
                this.renderPanel();
                return;
            }

            // 2. Add item from grid
            const card = e.target.closest('.product-card');
            if (card) {
                const product = Inventory.getProducts().find(p => p.id === card.dataset.id);
                this.addToCart(product);
                return;
            }

            // 3. Client Selection from list
            const pickerItem = e.target.closest('.picker-item');
            if (pickerItem) {
                this.selectedClient = CRM.getClients().find(c => c.id === pickerItem.dataset.id);
                document.getElementById('selected-client-info').innerHTML = `
                    <strong>${this.selectedClient.name}</strong>
                    <span class="badge ${this.selectedClient.type === 'wholesale' ? 'bg-orange' : 'bg-blue'}">${this.selectedClient.type === 'wholesale' ? 'Mayorista' : 'Final'}</span>
                `;
                document.getElementById('client-picker-modal').classList.remove('show');

                // Update cart prices ONLY for items that don't have a manual override
                this.cart.forEach(item => {
                    if (!item.manualPrice) {
                        const p = Inventory.getProducts().find(prod => prod.id === item.id);
                        item.price = this.selectedClient.type === 'wholesale' ? p.priceWholesale : p.priceFinal;
                    }
                });
                this.updateCartUI();
                return;
            }

            // 4. Close Modal
            if (e.target.classList.contains('close-modal')) {
                e.target.closest('.modal').classList.remove('show');
                return;
            }

            // 5. Buttons (Qty, Remove, Select Client, Checkout)
            const btn = e.target.closest('button');
            if (btn) {
                const index = parseInt(btn.dataset.index);

                if (btn.classList.contains('qty-btn')) {
                    if (btn.dataset.action === 'inc') this.cart[index].quantity++;
                    else if (this.cart[index].quantity > 1) this.cart[index].quantity--;
                    this.updateCartUI();
                    return;
                }

                if (btn.classList.contains('remove-item')) {
                    this.cart.splice(index, 1);
                    this.updateCartUI();
                    return;
                }

                if (btn.id === 'select-client-btn') {
                    document.getElementById('client-picker-modal').classList.add('show');
                    this.renderPickerList();
                    return;
                }

                if (btn.id === 'checkout-btn') {
                    if (this.cart.length === 0) return alert('El carrito está vacío');
                    if (!this.selectedClient) return alert('Seleccione un cliente');
                    await this.processCheckout();
                    return;
                }
            }
        };

        // 2. Centralized Event Delegation for Input Actions (Search, Price)
        container.oninput = (e) => {
            // Product Search
            if (e.target.id === 'pos-product-search') {
                this.renderProductGrid(e.target.value);
                return;
            }

            // Price Manual Override
            if (e.target.classList.contains('cart-price-input')) {
                const index = parseInt(e.target.dataset.index);
                const newPrice = parseFloat(e.target.value) || 0;
                this.cart[index].price = newPrice;
                this.cart[index].manualPrice = true; // Mark as manually overridden

                // Update row subtotal and grand total without full re-render (keep focus)
                const row = e.target.closest('tr');
                if (row) {
                    const subtotal = newPrice * this.cart[index].quantity;
                    if (row.cells[3]) row.cells[3].textContent = `$${subtotal.toLocaleString()}`;

                    const grandTotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    const totalEl = document.getElementById('pos-total');
                    if (totalEl) totalEl.textContent = `$${grandTotal.toLocaleString()}`;
                }
            }

            // Show/Hide Bank Details
            if (e.target.id === 'payment-method') {
                const container = document.getElementById('payment-details-container');
                if (container) {
                    if (e.target.value === 'transfer') {
                        const co = this.activeCompany === 'all' ? 'millenio' : this.activeCompany;
                        const accounts = Storage.get(STORAGE_KEYS.ACCOUNTS).filter(a => a.company === co);
                        let html = '<label>Banco / Cuenta Destino</label><select id="pos-bank-account" class="form-control" required>';
                        html += accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
                        if (accounts.length === 0) html += '<option value="" disabled selected>No hay cuentas bancarias</option>';
                        html += '</select>';
                        container.innerHTML = html;
                        container.style.display = 'block';
                    } else {
                        container.style.display = 'none';
                    }
                }
            }
        };
    },

    renderPickerList() {
        const pickerList = document.getElementById('picker-list');
        const clients = CRM.getClients();
        pickerList.innerHTML = clients.map(c => `
            <div class="picker-item" data-id="${c.id}">
                <div>
                    <strong>${c.name}</strong>
                    <div class="text-secondary">${c.phone}</div>
                </div>
                <span class="badge ${c.type === 'wholesale' ? 'bg-orange' : 'bg-blue'}">${c.type === 'wholesale' ? 'Mayorista' : 'Final'}</span>
            </div>
        `).join('');
    },

    async processCheckout() {
        const btn = document.getElementById('checkout-btn');
        if (!btn) return;

        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESANDO...';
            window.ERP_LOG('Iniciando proceso de checkout POS...');

            const method = document.getElementById('payment-method').value;
            const accountId = method === 'transfer' ? document.getElementById('pos-bank-account')?.value : null;
            const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            let totalM = 0;
            let totalV = 0;

            // 1. Process items
            for (const item of this.cart) {
                const p = Inventory.getProducts().find(prod => prod.id === item.id);
                if (!p) continue;

                const itemTotal = item.price * item.quantity;
                let targetCompany = p.company || 'millenio';

                if (targetCompany === 'both') {
                    if (this.activeCompany !== 'all') {
                        targetCompany = this.activeCompany;
                    } else {
                        targetCompany = (p.stockMillenio >= item.quantity) ? 'millenio' : 'vulcano';
                    }
                }

                if (targetCompany === 'millenio') {
                    p.stockMillenio = (p.stockMillenio || 0) - item.quantity;
                    totalM += itemTotal;
                } else {
                    p.stockVulcano = (p.stockVulcano || 0) - item.quantity;
                    totalV += itemTotal;
                }
                await Storage.updateItem(STORAGE_KEYS.PRODUCTS, p.id, p);
            }

            const sale = {
                clientId: this.selectedClient.id,
                clientName: this.selectedClient.name,
                items: this.cart.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity
                })),
                total: total,
                totalM: totalM,
                totalV: totalV,
                method: method,
                accountId: accountId,
                date: new Date().toISOString()
            };

            await Storage.addItem(STORAGE_KEYS.SALES, sale);
            window.ERP_LOG('Venta registrada localmente', 'success');

            if (method === 'credit') {
                const c = this.selectedClient;
                c.balanceMillenio = (c.balanceMillenio || 0) + totalM;
                c.balanceVulcano = (c.balanceVulcano || 0) + totalV;
                await Storage.updateItem(STORAGE_KEYS.CLIENTS, c.id, c);
            }

            alert(`✅ Venta realizada. Millenio: $${totalM.toLocaleString()} | Vulcano: $${totalV.toLocaleString()}`);
            this.cart = [];
            this.selectedClient = null;
            this.renderPanel();
            this.setupEventListeners();
            Inventory.updateInventoryList();
        } catch (err) {
            window.ERP_LOG('Error Checkout: ' + err.message, 'error');
            alert('❌ Error: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Finalizar Venta';
        }
    }
};
