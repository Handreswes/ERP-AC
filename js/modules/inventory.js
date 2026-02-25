// Inventory Module
window.Inventory = {
    activeCompanyFilter: 'all',
    activeTab: 'stock',
    editingId: null,

    init() {
        this.renderPanel();
        this.setupEventListeners();
    },

    getProducts() {
        return Storage.get(STORAGE_KEYS.PRODUCTS);
    },

    async addProduct(product) {
        return await Storage.addItem(STORAGE_KEYS.PRODUCTS, product);
    },

    async updateProduct(id, product) {
        return await Storage.updateItem(STORAGE_KEYS.PRODUCTS, id, product);
    },

    renderPanel() {
        const contentArea = document.getElementById('content-area');

        // Check if panel already exists
        if (!document.getElementById('inventory-panel')) {
            const panel = document.createElement('div');
            panel.id = 'inventory-panel';
            panel.className = 'panel';
            contentArea.appendChild(panel);
        }

        const panel = document.getElementById('inventory-panel');
        panel.innerHTML = `
            <div class="panel-header">
                <h1>Inventarios</h1>
                <div class="actions">
                    <button id="load-test-data" class="btn btn-secondary" style="margin-right: 10px;">Cargar Datos Prueba</button>
                    <button id="add-product-btn" class="btn btn-primary">Nuevo Producto</button>
                </div>
            </div>

            <div class="inventory-tabs" style="margin-bottom: 2rem;">
                <div style="display:flex; gap: 1rem;">
                    <button class="tab-btn ${this.activeTab === 'stock' ? 'active' : ''}" data-tab="stock">Inventario Disponible</button>
                    <button class="tab-btn ${this.activeTab === 'transit' ? 'active' : ''}" data-tab="transit">📦 En Tránsito / Importaciones</button>
                </div>
            </div>

            <div id="inventory-stock-view" style="display: ${this.activeTab === 'stock' ? 'block' : 'none'};">
                <div class="inventory-tabs" style="margin-bottom: 1.5rem; background: rgba(255,255,255,0.02); padding: 5px; border-radius: 25px; display: inline-flex;">
                    <button class="tab-btn ${this.activeCompanyFilter === 'all' ? 'active' : ''}" data-company="all" style="font-size: 0.8rem; padding: 4px 15px;">Todos</button>
                    <button class="tab-btn ${this.activeCompanyFilter === 'millenio' ? 'active' : ''}" data-company="millenio" style="font-size: 0.8rem; padding: 4px 15px;">Millenio</button>
                    <button class="tab-btn ${this.activeCompanyFilter === 'vulcano' ? 'active' : ''}" data-company="vulcano" style="font-size: 0.8rem; padding: 4px 15px;">Vulcano</button>
                </div>

                <div class="search-filter-row">
                    <input type="text" id="inventory-search" placeholder="Buscar por nombre o categoría..." class="form-control">
                </div>

                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Foto</th>
                                <th>Producto</th>
                                <th>Categoría</th>
                                <th>Stock Millenio</th>
                                <th>Stock Vulcano</th>
                                <th>Precio Final</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="inventory-list">
                            <!-- Table content dynamically loaded -->
                        </tbody>
                    </table>
                </div>
            </div>

            <div id="inventory-transit-view" style="display: ${this.activeTab === 'transit' ? 'block' : 'none'};">
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Fecha Pago</th>
                                <th>Empresa</th>
                                <th>Concepto / Proveedor</th>
                                <th class="text-right">Monto Invertido</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="transit-list">
                            <!-- Transit content -->
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Add/Edit Modal -->
            <div id="product-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="modal-title">Nuevo Producto</h2>
                        <span class="close-modal">&times;</span>
                    </div>
                    <div class="modal-body">
                        <form id="product-form">
                            <input type="hidden" name="id" id="product-id">
                            <div class="form-grid">
                                <div class="form-group" style="grid-column: span 2;">
                                    <label>Imagen del Producto</label>
                                    <div class="image-upload-wrapper" style="display: flex; flex-direction: column; align-items: center; gap: 1rem; background: rgba(255,255,255,0.02); padding: 1.5rem; border-radius: 12px; border: 1px dashed var(--border);">
                                        <input type="file" id="product-image-input" accept="image/*" class="form-control" style="margin-bottom: 0;">
                                        <img id="product-image-preview" src="https://via.placeholder.com/150?text=No+Foto" class="upload-preview" style="width: 150px; height: 150px; border-radius: 12px; object-fit: cover;">
                                        <input type="hidden" name="image" id="product-image-base64">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Nombre</label>
                                    <input type="text" name="name" required>
                                </div>
                                <div class="form-group">
                                    <label>Categoría</label>
                                    <input type="text" name="category" required>
                                </div>
                                <div class="form-group">
                                    <label>Proveedor</label>
                                    <input type="text" name="provider">
                                </div>
                                <div class="form-group">
                                    <label>Costo</label>
                                    <input type="number" name="cost" step="0.01" required>
                                </div>
                                <div class="form-group">
                                    <label>Precio Final</label>
                                    <input type="number" name="priceFinal" step="0.01" required>
                                </div>
                                <div class="form-group">
                                    <label>Precio Mayorista</label>
                                    <input type="number" name="priceWholesale" step="0.01" required>
                                </div>
                                <div class="form-group">
                                    <label>Stock Millenio</label>
                                    <input type="number" name="stockMillenio" value="0">
                                </div>
                                <div class="form-group">
                                    <label>Stock Vulcano</label>
                                    <input type="number" name="stockVulcano" value="0">
                                </div>
                                <div class="form-group">
                                    <label>Empresa Dueña</label>
                                    <select name="company" required>
                                        <option value="both">Ambas Empresas</option>
                                        <option value="millenio">Millenio</option>
                                        <option value="vulcano">Vulcano</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Estado</label>
                                    <select name="active">
                                        <option value="true">Activo</option>
                                        <option value="false">Inactivo</option>
                                    </select>
                                </div>
                            </div>
                            <button type="button" id="save-product-manual-btn" class="btn btn-primary btn-block" style="margin-top: 1.5rem; padding: 1rem;">Guardar Producto</button>
                        </form>
                    </div>
                </div>
            </div>
        `;

        this.activeTab === 'stock' ? this.updateInventoryList() : this.updateTransitList();
    },

    updateTransitList() {
        const list = document.getElementById('transit-list');
        if (!list) return;

        const transit = Storage.get(STORAGE_KEYS.TRANSIT_ORDERS).filter(o => o.status === 'pending');

        list.innerHTML = transit.map(o => `
            <tr>
                <td>${new Date(o.date).toLocaleDateString()}</td>
                <td><span class="badge ${o.company === 'millenio' ? 'bg-blue' : 'bg-orange'}">${o.company}</span></td>
                <td><strong>${o.concept}</strong></td>
                <td class="text-right"><strong>$${parseFloat(o.amount).toLocaleString()}</strong></td>
                <td><span class="badge" style="background: #f59e0b22; color: #f59e0b;">En Camino</span></td>
                <td>
                    <button class="btn btn-success btn-sm receive-transit-btn" data-id="${o.id}">
                        <i class="fas fa-check-circle"></i> Recibir Mercancía
                    </button>
                </td>
            </tr>
        `).join('');

        if (transit.length === 0) {
            list.innerHTML = '<tr><td colspan="6" class="text-center text-secondary" style="padding: 2rem;">No hay mercancía en tránsito pendiente</td></tr>';
        }
    },

    async receiveTransitOrder(id) {
        const order = Storage.getById(STORAGE_KEYS.TRANSIT_ORDERS, id);
        if (!order) return;

        const products = this.getProducts();
        const searchTerm = prompt(`Recibiendo: ${order.concept}\n¿Qué producto del inventario llegó? (Escriba parte del nombre)`);

        if (!searchTerm) return;

        const matches = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

        if (matches.length === 0) {
            alert('No se encontró ningún producto con ese nombre.');
            return;
        }

        let selection = matches[0];
        if (matches.length > 1) {
            const options = matches.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
            const choice = prompt(`Se encontraron varios productos. Elija el número correcto:\n${options}`);
            if (!choice || isNaN(choice) || choice < 1 || choice > matches.length) return;
            selection = matches[parseInt(choice) - 1];
        }

        const qty = parseInt(prompt(`¿Cuántas unidades de "${selection.name}" llegaron para ${order.company}?`));
        if (isNaN(qty) || qty <= 0) return;

        // Update stock
        if (order.company === 'millenio') selection.stockMillenio = (selection.stockMillenio || 0) + qty;
        else selection.stockVulcano = (selection.stockVulcano || 0) + qty;

        await this.updateProduct(selection.id, selection);

        // Update order status
        order.status = 'received';
        order.receivedAt = new Date().toISOString();
        await Storage.updateItem(STORAGE_KEYS.TRANSIT_ORDERS, id, order);

        alert(`¡Stock actualizado! ${qty} unidades añadidas a ${selection.name}.`);
        this.renderPanel();
    },

    updateInventoryList(searchTerm = '') {
        const products = this.getProducts();
        const list = document.getElementById('inventory-list');
        if (!list) return;

        let filtered = products.filter(p => {
            const name = p.name || '';
            const category = p.category || '';
            return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                category.toLowerCase().includes(searchTerm.toLowerCase());
        });

        // Filter by company tab
        if (this.activeCompanyFilter !== 'all') {
            filtered = filtered.filter(p => p.company === 'both' || p.company === this.activeCompanyFilter);
        }

        if (filtered.length === 0) {
            list.innerHTML = '<tr><td colspan="8" class="text-center">No se encontraron productos</td></tr>';
            return;
        }

        list.innerHTML = filtered.map(p => `
            <tr class="${p.active === false ? 'inactive-row' : ''}">
                <td>
                    <img src="${p.image || 'https://via.placeholder.com/40?text=NP'}" class="table-thumb" alt="${p.name}">
                </td>
                <td><strong>${p.name}</strong></td>
                <td>${p.category}</td>
                <td><span class="stock-badge ${p.stockMillenio < 5 ? 'low-stock' : ''}">${p.stockMillenio}</span></td>
                <td><span class="stock-badge ${p.stockVulcano < 5 ? 'low-stock' : ''}">${p.stockVulcano}</span></td>
                <td>$${parseFloat(p.priceFinal).toLocaleString()}</td>
                <td>
                    <span class="status-badge ${p.active === false ? 'inactive' : 'active'}">
                        ${p.active === false ? 'Inactivo' : 'Activo'}
                    </span>
                </td>
                <td class="table-actions">
                    <button class="icon-btn edit-btn" data-id="${p.id}"><i class="fas fa-edit"></i></button>
                    <button class="icon-btn delete-btn" data-id="${p.id}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    },

    setupEventListeners() {
        const panel = document.getElementById('inventory-panel');
        if (!panel) return;

        panel.addEventListener('click', async (e) => {
            // 1. Main Tabs (Stock vs Transit)
            const tabBtn = e.target.closest('.tab-btn');
            if (tabBtn) {
                if (tabBtn.dataset.tab) {
                    this.activeTab = tabBtn.dataset.tab;
                    this.renderPanel();
                } else if (tabBtn.dataset.company) {
                    this.activeCompanyFilter = tabBtn.dataset.company;
                    this.updateInventoryList(document.getElementById('inventory-search')?.value || '');
                    panel.querySelectorAll('.inventory-tabs [data-company]').forEach(b => b.classList.remove('active'));
                    tabBtn.classList.add('active');
                }
                return;
            }

            // 2. Action Buttons (Edit/Delete)
            const actionBtn = e.target.closest('.icon-btn');
            if (actionBtn) {
                const id = actionBtn.dataset.id;
                if (actionBtn.classList.contains('edit-btn')) {
                    this.editingId = id;
                    const product = this.getProducts().find(p => p.id === id);
                    document.getElementById('modal-title').textContent = 'Editar Producto';
                    const form = document.getElementById('product-form');
                    Object.keys(product).forEach(key => {
                        const input = form.elements[key];
                        if (input) {
                            if (input.type === 'checkbox') input.checked = product[key] !== false;
                            else if (input.type !== 'file') input.value = product[key];
                        }
                    });
                    document.getElementById('product-image-preview').src = product.image || "https://via.placeholder.com/150?text=No+Foto";
                    document.getElementById('product-image-base64').value = product.image || "";
                    document.getElementById('product-modal').classList.add('show');
                } else if (actionBtn.classList.contains('delete-btn')) {
                    if (confirm('¿Estás seguro de eliminar este producto?')) {
                        await Storage.deleteItem(STORAGE_KEYS.PRODUCTS, id);
                        this.updateInventoryList(document.getElementById('inventory-search')?.value || '');
                    }
                }
                return;
            }

            // 3. Receive Transit
            const receiveBtn = e.target.closest('.receive-transit-btn');
            if (receiveBtn) {
                await this.receiveTransitOrder(receiveBtn.dataset.id); // Await the async function
                return;
            }

            // 3. Manual Save Button (Killer for blank screen)
            if (e.target.id === 'save-product-manual-btn') {
                this.handleSaveProduct();
                return;
            }

            if (e.target.id === 'add-product-btn') {
                this.editingId = null;
                document.getElementById('modal-title').textContent = 'Nuevo Producto';
                document.getElementById('product-form').reset();
                document.getElementById('product-image-preview').src = "https://via.placeholder.com/150?text=No+Foto";
                document.getElementById('product-modal').classList.add('show');
                return;
            }

            if (e.target.id === 'load-test-data') {
                const testProducts = [
                    { id: 'TEST1', name: 'Aceite Millenio Gold', category: 'Aceites', cost: 15000, priceFinal: 25000, priceWholesale: 22000, stockMillenio: 10, stockVulcano: 5, company: 'millenio', active: true, image: 'https://via.placeholder.com/150?text=Aceite' },
                    { id: 'TEST2', name: 'Filtro Aire Vulcano', category: 'Filtros', cost: 5000, priceFinal: 12000, priceWholesale: 10000, stockMillenio: 0, stockVulcano: 20, company: 'vulcano', active: true, image: 'https://via.placeholder.com/150?text=Filtro' }
                ];
                testProducts.forEach(p => this.addProduct(p));
                this.updateInventoryList();
                alert('Datos de prueba cargados.');
                return;
            }

            if (e.target.classList.contains('close-modal')) {
                e.target.closest('.modal').classList.remove('show');
                return;
            }
        });

        // Search Input (Delegated to panel for safety)
        panel.addEventListener('input', (e) => {
            if (e.target.id === 'inventory-search') {
                this.updateInventoryList(e.target.value);
            }
        });

        // Image Preview logic
        panel.addEventListener('change', (e) => {
            if (e.target.id === 'product-image-input') {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        document.getElementById('product-image-preview').src = ev.target.result;
                        document.getElementById('product-image-base64').value = ev.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            }
        });
    },

    async handleSaveProduct() {
        const form = document.getElementById('product-form');
        const btn = document.getElementById('save-product-manual-btn');
        if (!form || !btn) {
            window.ERP_LOG('Formulario o botón no encontrado', 'error');
            return;
        }

        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESANDO...';
            window.ERP_LOG('Iniciando guardado manual (V66)...');

            const formData = new FormData(form);
            const product = {
                id: this.editingId || '',
                name: formData.get('name'),
                category: formData.get('category'),
                provider: formData.get('provider'),
                cost: parseFloat(formData.get('cost')) || 0,
                priceFinal: parseFloat(formData.get('priceFinal')) || 0,
                priceWholesale: parseFloat(formData.get('priceWholesale')) || 0,
                stockMillenio: parseInt(formData.get('stockMillenio')) || 0,
                stockVulcano: parseInt(formData.get('stockVulcano')) || 0,
                company: formData.get('company'),
                active: formData.get('active') === 'true',
                image: document.getElementById('product-image-base64').value || ''
            };

            if (this.editingId) {
                await Storage.updateItem(STORAGE_KEYS.PRODUCTS, this.editingId, product);
                window.ERP_LOG('Actualización local exitosa', 'success');
            } else {
                await Storage.addItem(STORAGE_KEYS.PRODUCTS, product);
                window.ERP_LOG('Creación local exitosa', 'success');
            }

            form.reset();
            this.editingId = null;
            const modal = document.getElementById('product-modal');
            if (modal) modal.classList.remove('show');
            this.updateInventoryList();
            alert('✅ ¡EXITO! Producto guardado correctamente y sincronizando...');

        } catch (err) {
            window.ERP_LOG('ERROR CRITICO: ' + err.message, 'error');
            alert('❌ ERROR AL GUARDAR: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Guardar Producto';
        }
    }
};
