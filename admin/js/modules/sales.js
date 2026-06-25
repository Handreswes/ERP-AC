// Sales Module
window.Sales = {
    cart: [],
    selectedClient: null,
    activeCompany: 'all',

    init() {
        this.renderPanel();
        this.setupEventListeners();

        // Listen for background sync updates to update product grid
        window.addEventListener('erp_table_updated_products', (e) => {
            console.log('[Sales] Products synced in background, re-rendering grid...');
            const panel = document.getElementById('sales-panel');
            if (panel && panel.classList.contains('active')) {
                const searchEl = document.getElementById('pos-product-search');
                this.renderProductGrid(searchEl ? searchEl.value : '');
            }
        });

        // Also listen for clients updates to refresh client picker if open
        window.addEventListener('erp_table_updated_clients', (e) => {
            console.log('[Sales] Clients synced in background, refreshing picker...');
            const pickerModal = document.getElementById('client-picker-modal');
            if (pickerModal && pickerModal.classList.contains('show')) {
                const searchEl = document.getElementById('client-search-input');
                this.renderPickerList(searchEl ? searchEl.value : '');
            }
        });

        // Also listen for sales updates to refresh consecutive number
        window.addEventListener('erp_table_updated_sales', (e) => {
            console.log('[Sales] Sales synced in background, updating consecutive number...');
            Sales.updateRemissionInput();
        });
    },

    calculateNextRemission() {
        const sales = Storage.get(STORAGE_KEYS.SALES) || [];
        let maxNum = 0;
        const remPattern = /^REM-(\d+)/i;
        
        sales.forEach(s => {
            if (s.remissionNumber) {
                const match = s.remissionNumber.trim().match(remPattern);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num > maxNum) {
                        maxNum = num;
                    }
                }
            }
        });
        
        const nextNum = maxNum + 1;
        return `REM-${String(nextNum).padStart(4, '0')}`;
    },

    async updateRemissionInput() {
        const remInput = document.getElementById('remision-number-input');
        if (!remInput || remInput.dataset.userEdited === "true") return;

        // 1. Calculate from local storage cache
        let nextRem = this.calculateNextRemission();
        remInput.value = nextRem;

        // 2. Fetch from Cloud in background to double check (handles empty local cache/new devices)
        const supabase = window.supabaseAdminClient || window.supabaseClient;
        if (supabase) {
            try {
                // Get the latest remission numbers from Supabase (sorted alphabetically descending)
                const { data, error } = await supabase
                    .from('sales')
                    .select('remissionNumber')
                    .not('remissionNumber', 'is', null)
                    .order('remissionNumber', { ascending: false })
                    .limit(20);

                if (!error && data && data.length > 0) {
                    let cloudMaxNum = 0;
                    const remPattern = /^REM-(\d+)/i;
                    
                    data.forEach(s => {
                        if (s.remissionNumber) {
                            const match = s.remissionNumber.trim().match(remPattern);
                            if (match) {
                                const num = parseInt(match[1], 10);
                                if (num > cloudMaxNum) {
                                    cloudMaxNum = num;
                                }
                            }
                        }
                    });

                    if (cloudMaxNum > 0) {
                        const localMaxNum = parseInt(nextRem.replace('REM-', ''), 10) - 1;
                        // Use the maximum between local cache and cloud
                        const finalMaxNum = Math.max(localMaxNum, cloudMaxNum);
                        const finalNextRem = `REM-${String(finalMaxNum + 1).padStart(4, '0')}`;
                        
                        // Double check the user hasn't typed in the meantime
                        if (remInput && remInput.dataset.userEdited !== "true") {
                            remInput.value = finalNextRem;
                        }
                    }
                }
            } catch (err) {
                console.warn('[Sales] Failed to fetch latest remission number from cloud:', err.message);
            }
        }
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
        
        let editingHeaderHTML = '';
        if (this.editingSaleId) {
            const remNum = this.editingSale?.remissionNumber || 'Venta';
            editingHeaderHTML = `
                <div style="background: rgba(245, 158, 11, 0.1); border: 2px dashed #f59e0b; border-radius: 12px; padding: 12px 20px; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <div>
                        <span style="font-weight: 700; color: #f59e0b; font-size: 1rem;"><i class="fas fa-edit"></i> MODO EDICIÓN ACTIVO</span>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">Modificando venta: <strong>${remNum}</strong> (${this.editingSale?.clientName})</div>
                    </div>
                    <button id="cancel-edit-sale-btn" class="btn btn-sm btn-danger" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid #ef4444; border-radius: 8px;">
                        Cancelar
                    </button>
                </div>
            `;
        }

        panel.innerHTML = `
            ${editingHeaderHTML}
            <div class="panel-header">
                <h1>Ventas POS ${this.editingSaleId ? '(Editando)' : ''}</h1>
                <div class="company-selector">
                    <button class="btn ${this.activeCompany === 'all' ? 'btn-primary' : 'btn-outline'}" data-company="all">Todos</button>
                    <button class="btn ${this.activeCompany === 'millenio' ? 'btn-primary' : 'btn-outline'}" data-company="millenio">Millenio</button>
                    <button class="btn ${this.activeCompany === 'vulcano' ? 'btn-primary' : 'btn-outline'}" data-company="vulcano">Vulcano</button>
                </div>
            </div>

            <div class="pos-container">
                <div class="pos-main">
                    
                    <div style="position: relative; max-width: 500px; width: 100%; margin-bottom: 1.5rem;">
                        <i class="fas fa-search" style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: var(--text-secondary); font-size: 1.2rem;"></i>
                        <input type="text" id="pos-product-search" class="form-control" placeholder="Buscar productos..." style="padding-left: 45px !important; border-radius: 15px; border: 2px solid var(--border); transition: all 0.3s;" onfocus="this.style.borderColor='var(--accent)'; this.style.boxShadow='0 0 0 4px rgba(37,99,235,0.1)';" onblur="this.style.borderColor='var(--border)'; this.style.boxShadow='none';">
                    </div>

                    <div id="pos-product-grid" class="pos-grid">
                        <!-- Product grid will be rendered here -->
                    </div>
                </div>

                <aside class="pos-sidebar">
                    <div class="cart-container" style="margin-bottom: 1.5rem;">
                        <div style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 0.5rem; letter-spacing: 0.5px; padding-left: 5px;">Carrito de Compras</div>
                        <div id="cart-list" style="display: flex; flex-direction: column; gap: 8px; max-height: 550px; overflow-y: auto; padding-right: 5px;">
                            <!-- Card items will be rendered here -->
                        </div>
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
                                <option value="split">Pago Múltiple / Dividido</option>
                            </select>
                        </div>

                        <div id="payment-details-container" style="display: none; margin-top: 1rem;">
                            <!-- Dynamic Bank Select -->
                        </div>

                        <!-- Delivery Type Selection -->
                        <div style="margin-top: 1rem; padding: 10px; background: rgba(59,130,246,0.05); border: 1px solid rgba(59,130,246,0.2); border-radius: 8px;">
                            <label style="font-size: 0.75rem; font-weight: 600; display: block; margin-bottom: 5px;">Tipo de Entrega</label>
                            <select id="pos-delivery-type" class="form-control">
                                <option value="pickup">Entregado en Tienda</option>
                                <option value="shipping">Para Despachar (Envío)</option>
                            </select>
                        </div>

                        <!-- Observations Box -->
                        <div style="margin-top: 1rem; padding: 10px; background: rgba(245,158,11,0.05); border: 1px solid rgba(245,158,11,0.2); border-radius: 8px;">
                            <label style="font-size: 0.75rem; font-weight: 600; display: block; margin-bottom: 5px; color: var(--text-secondary);">Observaciones de la Venta</label>
                            <textarea id="pos-sale-notes" class="form-control" placeholder="Ej: Venta para Juan Pérez (Cliente Ocasional)" rows="2" style="font-size: 0.85rem; border-radius: 8px; resize: none; width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.1); border: 1px solid var(--border); color: white;">${this.editingSale?.notes || ''}</textarea>
                        </div>

                        <!-- Remission Box -->
                        <div style="margin-top: 1rem; padding: 10px; background: rgba(59,130,246,0.05); border: 1px solid rgba(59,130,246,0.2); border-radius: 8px;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                <input type="checkbox" id="generate-remision-chk" style="width: 16px; height: 16px; cursor: pointer;">
                                <label for="generate-remision-chk" style="margin: 0; cursor: pointer; font-weight: 600; color: var(--accent);">Generar Remisión PDF</label>
                            </div>
                            <div id="remision-number-wrapper">
                                <label style="font-size: 0.75rem;">N° Consecutivo</label>
                                <input type="text" id="remision-number-input" class="form-control" style="padding: 6px; font-size: 0.9rem;" data-user-edited="false">
                            </div>
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
                        <div style="position: relative; margin-bottom: 15px;">
                            <i class="fas fa-search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-secondary);"></i>
                            <input type="text" id="client-search-input" class="form-control" placeholder="Buscar por nombre o teléfono..." style="padding-left: 35px !important;">
                        </div>
                        <div id="picker-list" class="picker-list"></div>
                    </div>
                </div>
            </div>
        `;

        this.renderProductGrid();
        this.updateCartUI();

        // Auto-fill Remission Sequence robustly
        this.updateRemissionInput();
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

            const img = Array.isArray(p.image) ? p.image[0] : p.image;

            return `
                <div class="product-card" data-id="${p.id}">
                    <img src="${img || 'https://via.placeholder.com/150?text=Sin+Foto'}" alt="${p.name}" class="card-img">
                    <div class="card-info">
                        <div class="card-name">${p.name}</div>
                        <div class="card-price">$${(parseFloat(p.priceWholesale) || parseFloat(p.priceFinal) || parseFloat(p.priceInternet) || 0).toLocaleString('es-CO')}</div>
                        <div class="card-stock">S: ${stock}</div>
                    </div>
                    <div class="pos-feedback-overlay">
                        <div class="pos-feedback-badge">
                            <i class="fas fa-check-circle"></i>
                            <span>Agregado</span>
                        </div>
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
            
            const company = item.company || 'millenio';
            const companyColor = company === 'vulcano' ? '#f59e0b' : (company === 'both' ? '#64748b' : '#3b82f6');
            const companyLabel = company === 'vulcano' ? 'Vulcano' : (company === 'both' ? 'Mixto' : 'Millenio');

            return `
                <div class="cart-item-card" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-left: 4px solid ${companyColor}; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 8px; position: relative;">
                    <!-- Line 1: Name, Number and Remove Button -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; padding-right: 25px;">
                        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; text-align: left;">
                            <span style="background: ${companyColor}; color: white; border-radius: 50%; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: bold; flex-shrink: 0;" title="Item #${index + 1}">
                                ${index + 1}
                            </span>
                            <span style="font-weight: 600; font-size: 0.85rem; word-break: break-word; color: var(--text-primary);" title="${item.name}">${item.name}</span>
                            <span style="font-size: 0.65rem; font-weight: bold; padding: 2px 5px; border-radius: 4px; background: rgba(255, 255, 255, 0.08); border: 1px solid ${companyColor}; color: ${companyColor}; text-transform: uppercase;">
                                ${companyLabel}
                            </span>
                        </div>
                        <button class="icon-btn text-danger remove-item" data-index="${index}" style="position: absolute; right: 10px; top: 10px; background: none; border: none; padding: 5px; cursor: pointer; font-size: 0.95rem; width: auto; height: auto;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <!-- Line 2: Price, Qty and Subtotal -->
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 4px;">
                        <!-- Price Input -->
                        <div style="display: flex; align-items: center; gap: 4px;">
                            <span style="color: var(--text-secondary); font-size: 0.8rem;">$</span>
                            <input type="number" class="cart-price-input form-control" data-index="${index}" value="${item.price}" step="1" style="width: 85px !important; height: 28px !important; padding: 0px 8px !important; font-size: 0.85rem !important; min-height: unset !important; margin: 0 !important; background: rgba(0,0,0,0.2) !important; border: 1px solid var(--border) !important; border-radius: 6px !important; color: white !important; text-align: left !important; box-sizing: border-box !important;">
                        </div>
                        
                        <!-- Quantity Control -->
                        <div class="qty-control" style="gap: 4px;">
                            <button class="qty-btn" data-index="${index}" data-action="dec" style="width: 26px; height: 26px; font-size: 0.9rem; border-radius: 6px; padding: 0;">-</button>
                            <input type="number" class="cart-qty-input" data-index="${index}" value="${item.quantity}" min="1" style="width: 38px !important; height: 28px !important; padding: 0px !important; font-size: 0.9rem !important; min-height: unset !important; margin: 0 !important; background: rgba(255, 255, 255, 0.08) !important; border: 1px solid var(--border) !important; border-radius: 6px !important; color: white !important; text-align: center !important; font-weight: bold !important; box-sizing: border-box !important; -moz-appearance: textfield !important;">
                            <button class="qty-btn" data-index="${index}" data-action="inc" style="width: 26px; height: 26px; font-size: 0.9rem; border-radius: 6px; padding: 0;">+</button>
                        </div>
                        
                        <!-- Subtotal -->
                        <div class="cart-item-subtotal" style="text-align: right; font-weight: 700; color: #10b981; font-size: 0.9rem; min-width: 80px;">
                            $${subtotal.toLocaleString('es-CO')}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        if (this.cart.length === 0) {
            list.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-secondary); font-size: 0.9rem; opacity: 0.7;">Carrito Vacío</div>';
        }

        const totalEl = document.getElementById('pos-total');
        if (totalEl) totalEl.textContent = `$${total.toLocaleString('es-CO')}`;
    },

    updateBankAccountsSelect() {
        const container = document.getElementById('payment-details-container');
        const pm = document.getElementById('payment-method');
        if (!container || !pm) return;

        if (pm.value === 'transfer') {
            const allAccounts = Storage.get(STORAGE_KEYS.ACCOUNTS) || [];
            const accounts = this.activeCompany === 'all'
                ? allAccounts
                : allAccounts.filter(a => a.company === this.activeCompany);
            
            let html = '<label>Banco / Cuenta Destino</label><select id="pos-bank-account" class="form-control" required>';
            html += accounts.map(a => {
                const suffix = this.activeCompany === 'all' ? ` (${a.company.toUpperCase()})` : '';
                return `<option value="${a.id}">${a.name}${suffix}</option>`;
            }).join('');
            if (accounts.length === 0) {
                html += '<option value="" disabled selected>No hay cuentas bancarias</option>';
            }
            html += '</select>';
            container.innerHTML = html;
            container.style.display = 'block';
        } else if (pm.value === 'split') {
            let totalM = 0;
            let totalV = 0;
            this.cart.forEach(item => {
                const subtotal = item.price * item.quantity;
                let targetCompany = item.company || 'millenio';
                if (targetCompany === 'both') {
                    if (this.activeCompany !== 'all') {
                        targetCompany = this.activeCompany;
                    } else {
                        targetCompany = (item.stockMillenio >= item.quantity) ? 'millenio' : 'vulcano';
                    }
                }
                if (targetCompany === 'millenio') totalM += subtotal;
                else totalV += subtotal;
            });

            const allAccounts = Storage.get(STORAGE_KEYS.ACCOUNTS) || [];
            const accountsM = allAccounts.filter(a => a.company === 'millenio');
            const accountsV = allAccounts.filter(a => a.company === 'vulcano');

            const pd = this.editingSale?.paymentDetails;
            const initCashM = pd ? parseFloat(pd.cashM) : totalM;
            const initTransferM = pd ? parseFloat(pd.transferM) : 0;
            const initAccountIdM = pd ? pd.accountIdM : (accountsM.length > 0 ? accountsM[0].id : '');
            
            const initCashV = pd ? parseFloat(pd.cashV) : totalV;
            const initTransferV = pd ? parseFloat(pd.transferV) : 0;
            const initAccountIdV = pd ? pd.accountIdV : (accountsV.length > 0 ? accountsV[0].id : '');

            let html = '<div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border); padding: 12px; border-radius: 12px; display:flex; flex-direction:column; gap:12px; margin-top: 1rem;">';
            
            if (totalM > 0) {
                html += `
                    <div style="border-bottom: ${totalV > 0 ? '1px dashed var(--border)' : 'none'}; padding-bottom: ${totalV > 0 ? '12px' : '0'};">
                        <h4 style="margin:0 0 8px 0; color:#3b82f6; font-size:0.85rem; font-weight:700; text-transform:uppercase;">Pago Millenio (Total: $${totalM.toLocaleString('es-CO')})</h4>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:8px;">
                            <div class="form-group" style="margin:0">
                                <label style="font-size:0.7rem; color:var(--text-secondary);">Efectivo</label>
                                <input type="number" id="split-cash-m" class="form-control split-input" data-company="m" value="${initCashM}" min="0" style="padding:6px; font-size:0.85rem; background:rgba(0,0,0,0.2); color:white; border:1px solid var(--border); border-radius:6px;">
                            </div>
                            <div class="form-group" style="margin:0">
                                <label style="font-size:0.7rem; color:var(--text-secondary);">Consignación</label>
                                <input type="number" id="split-transfer-m" class="form-control split-input" data-company="m" value="${initTransferM}" min="0" style="padding:6px; font-size:0.85rem; background:rgba(0,0,0,0.2); color:white; border:1px solid var(--border); border-radius:6px;">
                            </div>
                        </div>
                        <div class="form-group" style="margin:0 0 8px 0;" id="split-account-container-m">
                            <label style="font-size:0.7rem; color:var(--text-secondary);">Cuenta Banco Millenio</label>
                            <select id="split-account-m" class="form-control" style="padding:6px; font-size:0.85rem; background:rgba(0,0,0,0.2); color:white; border:1px solid var(--border); border-radius:6px;">
                                ${accountsM.map(a => `<option value="${a.id}" ${a.id === initAccountIdM ? 'selected' : ''}>${a.name}</option>`).join('')}
                                ${accountsM.length === 0 ? '<option value="" disabled selected>No hay cuentas</option>' : ''}
                            </select>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.15); padding:6px 10px; border-radius:6px; font-size:0.8rem;">
                            <span style="color:var(--text-secondary);">Crédito (A Deber):</span>
                            <strong id="split-credit-m-label" style="color:#ef4444; font-weight:700;">$0</strong>
                        </div>
                    </div>
                `;
            }

            if (totalV > 0) {
                html += `
                    <div style="padding-top: ${totalM > 0 ? '4px' : '0'};">
                        <h4 style="margin:0 0 8px 0; color:#f59e0b; font-size:0.85rem; font-weight:700; text-transform:uppercase;">Pago Vulcano (Total: $${totalV.toLocaleString('es-CO')})</h4>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:8px;">
                            <div class="form-group" style="margin:0">
                                <label style="font-size:0.7rem; color:var(--text-secondary);">Efectivo</label>
                                <input type="number" id="split-cash-v" class="form-control split-input" data-company="v" value="${initCashV}" min="0" style="padding:6px; font-size:0.85rem; background:rgba(0,0,0,0.2); color:white; border:1px solid var(--border); border-radius:6px;">
                            </div>
                            <div class="form-group" style="margin:0">
                                <label style="font-size:0.7rem; color:var(--text-secondary);">Consignación</label>
                                <input type="number" id="split-transfer-v" class="form-control split-input" data-company="v" value="${initTransferV}" min="0" style="padding:6px; font-size:0.85rem; background:rgba(0,0,0,0.2); color:white; border:1px solid var(--border); border-radius:6px;">
                            </div>
                        </div>
                        <div class="form-group" style="margin:0 0 8px 0;" id="split-account-container-v">
                            <label style="font-size:0.7rem; color:var(--text-secondary);">Cuenta Banco Vulcano</label>
                            <select id="split-account-v" class="form-control" style="padding:6px; font-size:0.85rem; background:rgba(0,0,0,0.2); color:white; border:1px solid var(--border); border-radius:6px;">
                                ${accountsV.map(a => `<option value="${a.id}" ${a.id === initAccountIdV ? 'selected' : ''}>${a.name}</option>`).join('')}
                                ${accountsV.length === 0 ? '<option value="" disabled selected>No hay cuentas</option>' : ''}
                            </select>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.15); padding:6px 10px; border-radius:6px; font-size:0.8rem;">
                            <span style="color:var(--text-secondary);">Crédito (A Deber):</span>
                            <strong id="split-credit-v-label" style="color:#ef4444; font-weight:700;">$0</strong>
                        </div>
                    </div>
                `;
            }

            html += '</div>';
            container.innerHTML = html;
            container.style.display = 'block';

            // Initial calculation
            this.updateSplitPaymentTotals(totalM, totalV);
        } else {
            container.style.display = 'none';
        }
    },

    updateSplitPaymentTotals(totalM, totalV) {
        const cashM = parseFloat(document.getElementById('split-cash-m')?.value) || 0;
        const transferM = parseFloat(document.getElementById('split-transfer-m')?.value) || 0;
        const creditM = Math.max(0, totalM - cashM - transferM);

        const creditMLabel = document.getElementById('split-credit-m-label');
        if (creditMLabel) creditMLabel.textContent = `$${creditM.toLocaleString('es-CO')}`;

        const accountContainerM = document.getElementById('split-account-container-m');
        if (accountContainerM) {
            accountContainerM.style.display = transferM > 0 ? 'block' : 'none';
        }

        const cashV = parseFloat(document.getElementById('split-cash-v')?.value) || 0;
        const transferV = parseFloat(document.getElementById('split-transfer-v')?.value) || 0;
        const creditV = Math.max(0, totalV - cashV - transferV);

        const creditVLabel = document.getElementById('split-credit-v-label');
        if (creditVLabel) creditVLabel.textContent = `$${creditV.toLocaleString('es-CO')}`;

        const accountContainerV = document.getElementById('split-account-container-v');
        if (accountContainerV) {
            accountContainerV.style.display = transferV > 0 ? 'block' : 'none';
        }
    },

    addToCart(product) {
        const existing = this.cart.find(item => item.id === product.id);
        // Default to wholesale price as requested
        const defaultPrice = product.priceWholesale || product.priceFinal || product.priceInternet;

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

        const observer = new MutationObserver(() => {
            if (container.classList.contains('active')) {
                const searchEl = document.getElementById('pos-product-search');
                this.renderProductGrid(searchEl ? searchEl.value : '');
            }
        });
        observer.observe(container, { attributes: true, attributeFilter: ['class'] });

        // Centralized Event Delegation for Click Actions
        container.onclick = async (e) => {
            // 1. Company Switching — only re-render grid, don't rebuild whole panel
            const targetCompany = e.target.dataset.company;
            if (targetCompany !== undefined && ['all', 'millenio', 'vulcano'].includes(targetCompany)) {
                this.activeCompany = targetCompany;
                // Update active button styles
                container.querySelectorAll('.company-selector [data-company]').forEach(btn => {
                    btn.className = btn.dataset.company === this.activeCompany
                        ? 'btn btn-primary'
                        : 'btn btn-outline';
                });
                const searchEl = document.getElementById('pos-product-search');
                this.renderProductGrid(searchEl ? searchEl.value : '');
                
                // Update bank accounts dropdown if visible
                this.updateBankAccountsSelect();
                return;
            }

            // 2. Add item from grid
            const card = e.target.closest('.product-card');
            if (card) {
                const product = Inventory.getProducts().find(p => p.id === card.dataset.id);
                this.addToCart(product);
                
                // Efecto de selección visual premium con reinicio instantáneo en clics rápidos
                if (card.timeoutId) {
                    clearTimeout(card.timeoutId);
                    card.classList.remove('added-active');
                    void card.offsetWidth; // Forzar reflow para reiniciar la transición
                }
                card.classList.add('added-active');
                card.timeoutId = setTimeout(() => {
                    card.classList.remove('added-active');
                    card.timeoutId = null;
                }, 350);
                
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
                        item.price = this.selectedClient.type === 'wholesale' ? p.priceWholesale : p.priceInternet;
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

                if (btn.id === 'cancel-edit-sale-btn') {
                    if (confirm('¿Desea cancelar la edición de la venta? Se perderán los cambios del carrito actual.')) {
                        this.cart = [];
                        this.selectedClient = null;
                        this.editingSaleId = null;
                        this.editingSale = null;
                        this.renderPanel();
                        this.setupEventListeners();
                    }
                    return;
                }

                if (btn.classList.contains('qty-btn')) {
                    if (btn.dataset.action === 'inc') this.cart[index].quantity++;
                    else if (this.cart[index].quantity > 1) this.cart[index].quantity--;
                    
                    // Update input value directly without full re-render if possible
                    const card = btn.closest('.cart-item-card');
                    const qtyInput = card ? card.querySelector('.cart-qty-input') : null;
                    if (qtyInput) qtyInput.value = this.cart[index].quantity;
                    
                    this.updateCartUI(); // Keep full re-render for now to ensure consistency, though it breaks focus. 
                    return;
                }

                if (btn.classList.contains('remove-item')) {
                    this.cart.splice(index, 1);
                    this.updateCartUI();
                    return;
                }

                if (e.target.id === 'manage-accounts-btn') {
                    const modal = document.getElementById('accounts-modal'); // Corrected ID
                    if (modal) modal.classList.add('show');
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
            // Remission Number Manual Edit
            if (e.target.id === 'remision-number-input') {
                e.target.dataset.userEdited = "true";
                return;
            }

            // Product Search
            if (e.target.id === 'pos-product-search') {
                this.renderProductGrid(e.target.value);
                return;
            }

            // Client Search
            if (e.target.id === 'client-search-input') {
                this.renderPickerList(e.target.value);
                return;
            }

            // Price Manual Override
            if (e.target.classList.contains('cart-price-input')) {
                const index = parseInt(e.target.dataset.index);
                const newPrice = parseFloat(e.target.value) || 0;
                this.cart[index].price = newPrice;
                this.cart[index].manualPrice = true; // Mark as manually overridden

                // Update row subtotal and grand total without full re-render (keep focus)
                const card = e.target.closest('.cart-item-card');
                if (card) {
                    const subtotal = newPrice * this.cart[index].quantity;
                    const subtotalEl = card.querySelector('.cart-item-subtotal');
                    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toLocaleString('es-CO')}`;

                    const grandTotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    const totalEl = document.getElementById('pos-total');
                    if (totalEl) totalEl.textContent = `$${grandTotal.toLocaleString('es-CO')}`;
                }
            }

            // Quantity Manual Override
            if (e.target.classList.contains('cart-qty-input')) {
                const index = parseInt(e.target.dataset.index);
                const newQty = parseInt(e.target.value) || 1;
                this.cart[index].quantity = newQty;

                // Update row subtotal and grand total
                const card = e.target.closest('.cart-item-card');
                if (card) {
                    const subtotal = this.cart[index].price * newQty;
                    const subtotalEl = card.querySelector('.cart-item-subtotal');
                    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toLocaleString('es-CO')}`;

                    const grandTotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                    const totalEl = document.getElementById('pos-total');
                    if (totalEl) totalEl.textContent = `$${grandTotal.toLocaleString('es-CO')}`;
                }
            }

            // Show/Hide Bank Details
            if (e.target.id === 'payment-method') {
                this.updateBankAccountsSelect();
            }

            // Split payment inputs change
            if (e.target.classList.contains('split-input')) {
                let totalM = 0;
                let totalV = 0;
                this.cart.forEach(item => {
                    const subtotal = item.price * item.quantity;
                    let targetCompany = item.company || 'millenio';
                    if (targetCompany === 'both') {
                        if (this.activeCompany !== 'all') {
                            targetCompany = this.activeCompany;
                        } else {
                            targetCompany = (item.stockMillenio >= item.quantity) ? 'millenio' : 'vulcano';
                        }
                    }
                    if (targetCompany === 'millenio') totalM += subtotal;
                    else totalV += subtotal;
                });
                this.updateSplitPaymentTotals(totalM, totalV);
            }
        };

        // 3. Centralized Event Delegation for Change Actions (Select Dropdowns)
        container.onchange = (e) => {
            // Show/Hide Bank Details
            if (e.target.id === 'payment-method') {
                this.updateBankAccountsSelect();
            }
        };
    },

    renderPickerList(searchTerm = '') {
        const pickerList = document.getElementById('picker-list');
        const allClients = CRM.getClients();
        
        const clients = allClients.filter(c => {
            const name = c.name || '';
            const phone = c.phone || '';
            const search = searchTerm.toLowerCase();
            return name.toLowerCase().includes(search) || phone.toLowerCase().includes(search);
        });

        if (clients.length === 0) {
            pickerList.innerHTML = '<div style="padding: 1rem; text-align: center; opacity: 0.6;">No se encontraron clientes</div>';
            return;
        }

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
            const bankSelect = document.getElementById('pos-bank-account');
            const accountId = method === 'transfer' ? (bankSelect ? bankSelect.value : null) : null;
            const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            // Validación de venta duplicada en el mismo día para el mismo cliente
            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
            const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
            
            const todaySales = (Storage.get(STORAGE_KEYS.SALES) || []).filter(s => {
                if (this.editingSaleId && s.id === this.editingSaleId) return false; // Excluir la venta que se está editando
                if (!s.date) return false;
                const d = new Date(s.date);
                return d >= startOfDay && d <= endOfDay;
            });
            
            const isDuplicate = todaySales.some(s => {
                // Obligatorio: Mismo cliente
                if (s.clientId !== this.selectedClient.id) return false;
                
                // Opcional 1: Mismo valor
                const sameTotal = Math.abs(parseFloat(s.total) - total) < 0.01;
                
                // Opcional 2: Mismos productos
                const sItems = s.items || [];
                const sameProducts = sItems.length === this.cart.length && sItems.every(item => {
                    const cartItem = this.cart.find(c => c.id === item.id);
                    return cartItem && cartItem.quantity === item.quantity;
                });
                
                return sameTotal || sameProducts;
            });
            
            if (isDuplicate) {
                const confirmNew = confirm(`⚠️ ALERTA DE POSIBLE DUPLICADO\n\nYa existe una venta hoy para "${this.selectedClient.name}" con el mismo valor o los mismos productos.\n\n¿Esta es una NUEVA VENTA o es una venta DUPLICADA?\n\n- Presiona ACEPTAR si es una NUEVA venta independiente.\n- Presiona CANCELAR si está DUPLICADA (no se registrará).`);
                if (!confirmNew) {
                    window.ERP_LOG('Checkout cancelado: venta identificada como duplicada por el usuario.');
                    return;
                }
            }

            // 1. Simulación y Validación de Stock (Previene saldo negativo)
            const productClones = {};
            const getClone = (id) => {
                if (!productClones[id]) {
                    const original = Inventory.getProducts().find(p => p.id === id);
                    if (!original) return null;
                    productClones[id] = { ...original };
                }
                return productClones[id];
            };

            // Si es edición, devolvemos temporalmente el stock de la venta anterior para simular
            if (this.editingSaleId && this.editingSale) {
                const oldSale = this.editingSale;
                const oldCompany = oldSale.company || 'millenio';
                for (const oldItem of oldSale.items) {
                    const pClone = getClone(oldItem.id);
                    if (pClone) {
                        let targetCompany = pClone.company || 'millenio';
                        if (targetCompany === 'both') {
                            targetCompany = oldCompany;
                        }
                        if (targetCompany === 'millenio') {
                            pClone.stockMillenio = (parseInt(pClone.stockMillenio) || 0) + oldItem.quantity;
                        } else {
                            pClone.stockVulcano = (parseInt(pClone.stockVulcano) || 0) + oldItem.quantity;
                        }
                    }
                }
            }

            let totalM = 0;
            let totalV = 0;

            // Procesar ítems del carrito contra el clon de inventario
            for (const item of this.cart) {
                const pClone = getClone(item.id);
                if (!pClone) {
                    throw new Error(`Producto "${item.name}" no encontrado en el inventario.`);
                }

                const itemTotal = item.price * item.quantity;
                let targetCompany = pClone.company || 'millenio';

                if (targetCompany === 'both') {
                    if (this.activeCompany !== 'all') {
                        targetCompany = this.activeCompany;
                    } else {
                        targetCompany = (pClone.stockMillenio >= item.quantity) ? 'millenio' : 'vulcano';
                    }
                }

                if (targetCompany === 'millenio') {
                    pClone.stockMillenio = (parseInt(pClone.stockMillenio) || 0) - item.quantity;
                    totalM += itemTotal;
                } else {
                    pClone.stockVulcano = (parseInt(pClone.stockVulcano) || 0) - item.quantity;
                    totalV += itemTotal;
                }

                // Validación de stock negativo
                if (pClone.stockMillenio < 0 || pClone.stockVulcano < 0) {
                    const available = targetCompany === 'millenio' ? (pClone.stockMillenio + item.quantity) : (pClone.stockVulcano + item.quantity);
                    throw new Error(`Stock insuficiente para "${pClone.name}". Stock disponible en bodega ${targetCompany.toUpperCase()}: ${available}, solicitado: ${item.quantity}.`);
                }
            }

            const deliveryType = document.getElementById('pos-delivery-type')?.value || 'pickup';
            const remissionNumberInput = document.getElementById('remision-number-input');
            const remNumber = remissionNumberInput?.value || `REM-${Date.now()}`;
            const generateRemision = document.getElementById('generate-remision-chk')?.checked;
            const notes = document.getElementById('pos-sale-notes')?.value || '';

            let paymentDetails = null;
            let creditM = 0;
            let creditV = 0;

            if (method === 'split') {
                const cashM = parseFloat(document.getElementById('split-cash-m')?.value) || 0;
                const transferM = parseFloat(document.getElementById('split-transfer-m')?.value) || 0;
                const accountIdM = document.getElementById('split-account-m')?.value || null;
                creditM = Math.max(0, totalM - cashM - transferM);

                const cashV = parseFloat(document.getElementById('split-cash-v')?.value) || 0;
                const transferV = parseFloat(document.getElementById('split-transfer-v')?.value) || 0;
                const accountIdV = document.getElementById('split-account-v')?.value || null;
                creditV = Math.max(0, totalV - cashV - transferV);

                paymentDetails = {
                    cashM,
                    transferM,
                    accountIdM,
                    creditM,
                    cashV,
                    transferV,
                    accountIdV,
                    creditV
                };
            } else {
                creditM = method === 'credit' ? totalM : 0;
                creditV = method === 'credit' ? totalV : 0;
            }
            
            const sale = {
                clientId: this.selectedClient.id,
                clientName: this.selectedClient.name,
                clientPhone: this.selectedClient.phone || '',
                sellerName: Auth.currentUser?.name || "Caja Mostrador",
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
                paymentDetails: paymentDetails,
                notes: notes,
                delivery_type: deliveryType,
                delivery_status: deliveryType === 'shipping' ? 'pending' : 'completed',
                company: totalM >= totalV ? 'millenio' : 'vulcano',
                remissionNumber: remNumber,
                date: this.editingSaleId && this.editingSale ? this.editingSale.date : new Date().toISOString()
            };

            // 1. SAVE SALE (Add or Update)
            if (this.editingSaleId) {
                await Storage.updateItem(STORAGE_KEYS.SALES, this.editingSaleId, sale);
                window.ERP_LOG('Venta modificada exitosamente en la nube', 'success');
            } else {
                await Storage.addItem(STORAGE_KEYS.SALES, sale);
                window.ERP_LOG('Venta registrada en la nube', 'success');
            }

            // 2. COMMIT INVENTORY (Dependent Data)
            for (const id in productClones) {
                const clone = productClones[id];
                await Storage.updateItem(STORAGE_KEYS.PRODUCTS, id, {
                    stockMillenio: clone.stockMillenio,
                    stockVulcano: clone.stockVulcano
                });
            }

            // 3. COMMIT CREDIT DEBT IF APPLICABLE
            if (this.editingSaleId && this.editingSale) {
                const oldSale = this.editingSale;
                
                // Revertir deuda del cliente original si tuvo porción a crédito
                const oldCreditM = oldSale.paymentDetails ? parseFloat(oldSale.paymentDetails.creditM || 0) : (oldSale.method === 'credit' ? parseFloat(oldSale.totalM || 0) : 0);
                const oldCreditV = oldSale.paymentDetails ? parseFloat(oldSale.paymentDetails.creditV || 0) : (oldSale.method === 'credit' ? parseFloat(oldSale.totalV || 0) : 0);

                if ((oldCreditM > 0 || oldCreditV > 0) && oldSale.clientId) {
                    const oldClient = Storage.getById(STORAGE_KEYS.CLIENTS, oldSale.clientId);
                    if (oldClient) {
                        const newBalM = Math.max(0, (oldClient.balanceMillenio || 0) - oldCreditM);
                        const newBalV = Math.max(0, (oldClient.balanceVulcano || 0) - oldCreditV);
                        await Storage.updateItem(STORAGE_KEYS.CLIENTS, oldClient.id, {
                            balanceMillenio: newBalM,
                            balanceVulcano: newBalV
                        });
                    }
                }
            }

            // Sumar nueva deuda al cliente
            if (creditM > 0 || creditV > 0) {
                const c = Storage.getById(STORAGE_KEYS.CLIENTS, this.selectedClient.id);
                if (c) {
                    const newBalM = (c.balanceMillenio || 0) + creditM;
                    const newBalV = (c.balanceVulcano || 0) + creditV;
                    await Storage.updateItem(STORAGE_KEYS.CLIENTS, c.id, {
                        balanceMillenio: newBalM,
                        balanceVulcano: newBalV
                    });
                }
            }

            const isEditing = !!this.editingSaleId;

            this.cart = [];
            this.selectedClient = null;
            this.editingSaleId = null;
            this.editingSale = null;
            this.renderPanel();
            this.setupEventListeners();
            Inventory.updateInventoryList();

            if (generateRemision && window.PDFManager) {
                window.PDFManager.showRemission(sale, remNumber);
            } else {
                alert(isEditing ? `✅ Venta modificada exitosamente.` : `✅ Venta realizada. Millenio: $${totalM.toLocaleString()} | Vulcano: $${totalV.toLocaleString()}`);
            }

            if (isEditing) {
                window.handleNavClick('consultas');
            }
        } catch (err) {
            window.ERP_LOG('Error Checkout: ' + err.message, 'error');
            alert('❌ Error: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Finalizar Venta';
        }
    }
};

