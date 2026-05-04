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

    async renderPanel() {
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
                    <button id="cleanup-products-btn" class="btn btn-outline" style="margin-right: 10px; color: #ef4444; border-color: #ef4444;"><i class="fas fa-broom"></i> Depurar Fantasmas</button>
                    <button id="add-product-btn" class="btn btn-primary">Nuevo Producto</button>
                </div>
            </div>

            <div class="inventory-tabs" style="margin-bottom: 2rem;">
                <div style="display:flex; gap: 1rem;">
                    <button class="tab-btn ${this.activeTab === 'stock' ? 'active' : ''}" data-tab="stock">Inventario Disponible</button>
                    <button class="tab-btn ${this.activeTab === 'limbo' ? 'active' : ''}" data-tab="limbo">🌪️ El Limbo (Agotados)</button>
                    <button class="tab-btn ${this.activeTab === 'transit' ? 'active' : ''}" data-tab="transit">📦 En Tránsito / Importaciones</button>
                    <button class="tab-btn ${this.activeTab === 'history' ? 'active' : ''}" data-tab="history">📜 Historial de Entradas</button>
                </div>
            </div>

            <div id="inventory-stock-view" style="display: ${this.activeTab === 'stock' || this.activeTab === 'limbo' ? 'block' : 'none'};">
                <div class="inventory-tabs" style="margin-bottom: 1.5rem; background: rgba(255,255,255,0.02); padding: 5px; border-radius: 25px; display: inline-flex;">
                    <button class="tab-btn ${this.activeCompanyFilter === 'all' ? 'active' : ''}" data-company="all" style="font-size: 0.8rem; padding: 4px 15px;">Todos</button>
                    <button class="tab-btn ${this.activeCompanyFilter === 'millenio' ? 'active' : ''}" data-company="millenio" style="font-size: 0.8rem; padding: 4px 15px;">Millenio</button>
                    <button class="tab-btn ${this.activeCompanyFilter === 'vulcano' ? 'active' : ''}" data-company="vulcano" style="font-size: 0.8rem; padding: 4px 15px;">Vulcano</button>
                </div>

                <div class="search-filter-row" style="margin-bottom: 1.5rem; display: flex; gap: 10px; align-items: center;">
                    <div class="search-input-wrapper" style="flex: 1; position: relative;">
                        <i class="fas fa-search" style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: var(--text-secondary);"></i>
                        <input type="text" id="inventory-search" class="form-control" placeholder="Buscar por nombre, categoría o referencia..." style="padding-left: 45px; border-radius: 15px; border: 2px solid var(--border); transition: all 0.3s;" onfocus="this.style.borderColor='var(--accent)'; this.style.boxShadow='0 0 0 4px rgba(37,99,235,0.1)';" onblur="this.style.borderColor='var(--border)'; this.style.boxShadow='none';">
                    </div>
                </div>

                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Foto</th>
                                <th>Ref</th>
                                <th>Producto</th>
                                <th>Categoría</th>
                                 <th>Stock Millenio</th>
                                 <th>Stock Vulcano</th>
                                 <th>Precio Internet/Final</th>
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
                <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
                    <button id="add-import-btn" class="btn btn-primary"><i class="fas fa-ship"></i> Nueva Importación</button>
                </div>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Fecha / Empresa</th>
                                <th>Proveedor</th>
                                <th class="text-right">Total FOB</th>
                                <th class="text-right">Logística</th>
                                <th class="text-right">Total Neto</th>
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

            <div id="inventory-history-view" style="display: ${this.activeTab === 'history' ? 'block' : 'none'};">
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Producto</th>
                                <th>Empresa</th>
                                <th class="text-right">Cantidad</th>
                                <th>Origen / Nota</th>
                            </tr>
                        </thead>
                        <tbody id="history-list">
                            <!-- History content -->
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
                                    <label>Galería de Imágenes (Máx 5)</label>
                                    <div class="image-gallery-grid" id="product-image-gallery">
                                        ${[0, 1, 2, 3, 4].map(i => `
                                            <div class="image-slot empty" data-index="${i}" onclick="document.getElementById('product-image-input-${i}').click()">
                                                <input type="file" id="product-image-input-${i}" accept="image/*" style="display:none" onchange="window.Inventory.handleImageUpload(event, ${i})">
                                                <input type="hidden" class="image-base64" data-index="${i}">
                                                <div class="slot-placeholder">
                                                    <i class="fas fa-camera"></i>
                                                </div>
                                                <button type="button" class="remove-image-btn" onclick="window.Inventory.removeImage(event, ${i})">
                                                    <i class="fas fa-times"></i>
                                                </button>
                                            </div>
                                        `).join('')}
                                    </div>
                                    <p class="text-secondary" style="font-size: 0.7rem; margin-top: 5px; opacity: 0.7;">
                                        <i class="fas fa-info-circle"></i> La primera foto aparecerá en el catálogo principal.
                                    </p>
                                </div>
                                 <div class="form-group">
                                    <label>Referencia / REF</label>
                                    <input type="text" name="ref" placeholder="Ej: REF-001">
                                </div>
                                <div class="form-group">
                                    <label>Nombre</label>
                                    <input type="text" name="name" required>
                                </div>
                                <div class="form-group">
                                    <label>Categoría</label>
                                    <select name="category" id="product-category-select" required>
                                        <option value="">Seleccione Categoría...</option>
                                        <!-- Opciones cargadas dinámicamente -->
                                    </select>
                                </div>
                                <div class="form-group" style="grid-column: span 2;">
                                    <label>Descripción (Sólo visible en Catálogo)</label>
                                    <textarea name="description" rows="3" placeholder="Ej: Excelente herramienta con motor de cobre..."></textarea>
                                </div>
                                <div class="form-group">
                                    <label>Proveedor</label>
                                    <input type="text" name="provider">
                                </div>
                                 <div class="form-group">
                                     <label>Costo ($)</label>
                                     <input type="text" name="cost" placeholder="0" inputmode="numeric" required
                                         oninput="this.value=this.value.replace(/[^0-9]/g,'').replace(/\B(?=(\d{3})+(?!\d))/g,'.')">
                                 </div>
                                 <div class="form-group">
                                     <label>Precio Mayorista ($)</label>
                                     <input type="text" name="priceWholesale" placeholder="0" inputmode="numeric" required
                                         oninput="this.value=this.value.replace(/[^0-9]/g,'').replace(/\B(?=(\d{3})+(?!\d))/g,'.')">
                                 </div>
                                 <div class="form-group">
                                     <label>Precio Internet / Final ($)</label>
                                     <input type="text" name="priceFinal" placeholder="0" inputmode="numeric"
                                         oninput="this.value=this.value.replace(/[^0-9]/g,'').replace(/\B(?=(\d{3})+(?!\d))/g,'.')">
                                 </div>
                                 <div class="form-group">
                                     <label>Comisión Base (TUCOMPRAS) ($)</label>
                                     <input type="text" name="commissionBase" placeholder="0" inputmode="numeric"
                                         oninput="this.value=this.value.replace(/[^0-9]/g,'').replace(/\B(?=(\d{3})+(?!\d))/g,'.')">
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
                             <div class="form-group" style="grid-column: span 2; margin-top: 1rem;">
                                 <button type="button" id="save-product-manual-btn" class="btn btn-primary btn-block" style="padding: 1rem; border-radius: 16px; font-weight: 700; font-size: 1rem; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);">
                                     <i class="fas fa-save"></i> GUARDAR PRODUCTO
                                 </button>
                             </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Transit / Import Modal -->
            <div id="transit-modal" class="modal">
                <div class="modal-content" style="max-width: 900px;">
                    <div class="modal-header">
                        <h2 id="transit-modal-title">Nueva Importación</h2>
                        <span class="close-modal">&times;</span>
                    </div>
                    <div class="modal-body">
                        <form id="transit-form">
                            <input type="hidden" name="id" id="transit-id">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Proveedor / Concepto</label>
                                    <input type="text" name="concept" required placeholder="Ej: Proveedor China">
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
                                    <label>Fecha de Creación</label>
                                    <input type="date" name="date" required>
                                </div>
                            </div>
                            
                            <h3 style="margin-top: 1.5rem; margin-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px;">Gastos Financieros / Logísticos ($)</h3>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Pago Inicial (50% u otro)</label>
                                    <input type="text" name="initialPayment" id="transit-initial" placeholder="0" inputmode="numeric" oninput="window.Inventory.formatNumberInput(this); window.Inventory.calculateTransitTotals();">
                                </div>
                                <div class="form-group">
                                    <label>Pago Final</label>
                                    <input type="text" name="finalPayment" id="transit-final" placeholder="0" inputmode="numeric" oninput="window.Inventory.formatNumberInput(this); window.Inventory.calculateTransitTotals();">
                                </div>
                                <div class="form-group">
                                    <label>Flete Marítimo</label>
                                    <input type="text" name="maritimeFreight" id="transit-maritime" placeholder="0" inputmode="numeric" oninput="window.Inventory.formatNumberInput(this); window.Inventory.calculateTransitTotals();">
                                </div>
                                <div class="form-group">
                                    <label>Flete Local (Colombia)</label>
                                    <input type="text" name="localFreight" id="transit-local" placeholder="0" inputmode="numeric" oninput="window.Inventory.formatNumberInput(this); window.Inventory.calculateTransitTotals();">
                                </div>
                                <div class="form-group">
                                    <label>Gastos Nacionalización/Otros</label>
                                    <input type="text" name="additionalExpenses" id="transit-additional" placeholder="0" inputmode="numeric" oninput="window.Inventory.formatNumberInput(this); window.Inventory.calculateTransitTotals();">
                                </div>
                            </div>

                            <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 10px; margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
                                <span><i class="fas fa-truck-loading" style="color: #10b981;"></i> Total Gastos Logísticos (Prorrateables):</span>
                                <strong id="transit-logistics-total" style="font-size: 1.2rem; color: #10b981;">$0</strong>
                            </div>

                            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px;">
                                <h3>Productos a Importar (Ítems)</h3>
                                <button type="button" class="btn btn-sm btn-outline" onclick="window.Inventory.addTransitItemRow()">
                                    <i class="fas fa-plus"></i> Agregar Ítem
                                </button>
                            </div>
                            
                            <div class="table-container" style="margin-top: 10px;">
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>Ref</th>
                                            <th>Nombre</th>
                                            <th>Cant.</th>
                                            <th>Costo Unit. FOB ($)</th>
                                            <th>Total FOB ($)</th>
                                            <th style="background: rgba(16,185,129,0.1); color: #10b981;" title="Costo Unitario + Gasto Logístico Prorrateado">Costo Neto Proyectado</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody id="transit-items-list">
                                        <!-- Dynamic items -->
                                    </tbody>
                                </table>
                            </div>

                            <div style="display: flex; justify-content: flex-end; margin-top: 10px; font-size: 1.1rem;">
                                <span>Total Mercancía (FOB): <strong id="transit-fob-total" style="color: #60a5fa;">$0</strong></span>
                            </div>

                            <div class="form-group" style="margin-top: 2rem;">
                                 <button type="button" id="save-transit-btn" class="btn btn-primary btn-block" style="padding: 1rem; border-radius: 16px; font-weight: 700; font-size: 1rem; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);">
                                     <i class="fas fa-save"></i> GUARDAR PROGRESO DE IMPORTACIÓN
                                 </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        if (this.activeTab === 'transit') this.updateTransitList();
        else if (this.activeTab === 'history') this.updateHistoryList();
        else this.updateInventoryList();

        await this.loadCategoryOptions();
    },

    async loadCategoryOptions() {
        const select = document.getElementById('product-category-select');
        if (!select || !window.CategoriesModule) return;

        const currentVal = select.value;
        select.innerHTML = '<option value="">Cargando categorías...</option>';

        // Force fetch from database to ensure fresh data
        if (window.CategoriesModule.fetchCategories) {
            await window.CategoriesModule.fetchCategories();
        }

        if (!window.CategoriesModule.categories || window.CategoriesModule.categories.length === 0) {
            select.innerHTML = '<option value="">No hay categorías (Cree una primero)</option>';
            return;
        }

        select.innerHTML = '<option value="">Seleccione Categoría...</option>';
        window.CategoriesModule.categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.name;
            option.textContent = cat.name;
            select.appendChild(option);
        });
        if (currentVal) select.value = currentVal;
    },

    updateHistoryList() {
        const list = document.getElementById('history-list');
        if (!list) return;

        const entries = Storage.get(STORAGE_KEYS.STOCK_ENTRIES).sort((a, b) => new Date(b.date) - new Date(a.date));

        list.innerHTML = entries.map(e => `
            <tr>
                <td>${new Date(e.date).toLocaleString()}</td>
                <td><strong>${e.productName}</strong></td>
                <td><span class="badge ${e.company === 'millenio' ? 'bg-blue' : 'bg-orange'}">${e.company}</span></td>
                <td class="text-right"><strong style="color: var(--success);">+${e.quantity}</strong></td>
                <td><small>${e.source || 'Entrada Manual'} ${e.notes ? `(${e.notes})` : ''}</small></td>
            </tr>
        `).join('');

        if (entries.length === 0) {
            list.innerHTML = '<tr><td colspan="5" class="text-center text-secondary" style="padding: 2rem;">No hay registros de entradas todavía</td></tr>';
        }
    },

    updateTransitList() {
        const list = document.getElementById('transit-list');
        if (!list) return;

        const transit = Storage.get(STORAGE_KEYS.TRANSIT_ORDERS).filter(o => o.status === 'pending');

        list.innerHTML = transit.map(o => {
            const logisticsTotal = (parseFloat(o.maritimeFreight) || 0) + (parseFloat(o.localFreight) || 0) + (parseFloat(o.additionalExpenses) || 0);
            const fobTotal = parseFloat(o.fobTotal) || 0;
            const netTotal = fobTotal + logisticsTotal;

            return `
            <tr>
                <td>${new Date(o.date).toLocaleDateString()}<br><span class="badge ${o.company === 'millenio' ? 'bg-blue' : 'bg-orange'}">${o.company}</span></td>
                <td><strong>${o.concept}</strong></td>
                <td class="text-right"><strong>$${fobTotal.toLocaleString('es-CO')}</strong></td>
                <td class="text-right" style="color:#10b981;"><strong>+$${logisticsTotal.toLocaleString('es-CO')}</strong></td>
                <td class="text-right"><strong style="color:var(--text);">$${netTotal.toLocaleString('es-CO')}</strong></td>
                <td><span class="badge" style="background: #f59e0b22; color: #f59e0b;">En Proceso</span></td>
                <td>
                    <div style="display:flex; gap:5px; justify-content:center;">
                        <button class="btn btn-outline btn-sm edit-transit-btn" data-id="${o.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-success btn-sm receive-transit-btn" data-id="${o.id}">
                            <i class="fas fa-box-open"></i> Recibir
                        </button>
                    </div>
                </td>
            </tr>
        `}).join('');

        if (transit.length === 0) {
            list.innerHTML = '<tr><td colspan="7" class="text-center text-secondary" style="padding: 2rem;">No hay mercancía en tránsito pendiente</td></tr>';
        }
    },

    async receiveTransitOrder(id) {
        const order = Storage.getById(STORAGE_KEYS.TRANSIT_ORDERS, id);
        if (!order) return;

        if (!order.items || order.items.length === 0) {
            alert('Esta importación no tiene productos listados. Agréguelos editándola primero.');
            return;
        }

        if (!confirm(`¿Está seguro de RECIBIR esta importación?\n\nSe añadirán ${order.items.length} productos al inventario general automáticamente con su costo neto real prorrateado.\nPodrá editar sus fotos y márgenes de ganancia después en "Inventario Disponible".`)) {
            return;
        }

        const logisticsTotal = (parseFloat(order.maritimeFreight) || 0) + (parseFloat(order.localFreight) || 0) + (parseFloat(order.additionalExpenses) || 0);
        const fobTotal = parseFloat(order.fobTotal) || 0;

        try {
            for (let item of order.items) {
                const qty = parseInt(item.qty) || 0;
                const unitFob = parseFloat(item.unitFob) || 0;
                const totalItemFob = qty * unitFob;
                
                let assignedLogistics = 0;
                if (fobTotal > 0) {
                    const weight = totalItemFob / fobTotal;
                    assignedLogistics = logisticsTotal * weight;
                }
                const netUnitCost = unitFob + (qty > 0 ? (assignedLogistics / qty) : 0);

                const productId = 'PROD-' + Date.now() + '-' + Math.floor(Math.random()*1000);
                const newProduct = {
                    id: productId,
                    name: item.name,
                    ref: item.ref,
                    cost: Math.round(netUnitCost),
                    priceWholesale: 0,
                    priceFinal: 0,
                    company: order.company,
                    stockMillenio: order.company === 'millenio' || order.company === 'both' ? qty : 0,
                    stockVulcano: order.company === 'vulcano' || order.company === 'both' ? qty : 0,
                    active: true,
                    category: '',
                    description: 'Importación: ' + order.concept,
                    image: []
                };
                await Storage.addItem(STORAGE_KEYS.PRODUCTS, newProduct);
                await this.recordStockEntry(productId, item.name, qty, order.company, 'Importación', order.concept);
            }

            order.status = 'received';
            order.receivedAt = new Date().toISOString();
            await Storage.updateItem(STORAGE_KEYS.TRANSIT_ORDERS, id, order);

            alert('¡Importación recibida con éxito!\\nLos productos ya están en el Inventario Disponible.');
            this.updateTransitList();
            this.updateInventoryList();
        } catch (err) {
            console.error(err);
            alert('Error recibiendo importación: ' + err.message);
        }
    },

    async recordStockEntry(productId, productName, quantity, company, source, notes = '') {
        const entry = {
            date: new Date().toISOString(),
            productId,
            productName,
            quantity,
            company,
            source,
            notes
        };
        await Storage.addItem(STORAGE_KEYS.STOCK_ENTRIES, entry);
    },

    updateInventoryList(searchTerm = '') {
        const products = this.getProducts();
        const list = document.getElementById('inventory-list');
        if (!list) return;

        let filtered = products.filter(p => {
            const name = p.name || '';
            const category = p.category || '';
            const ref = p.ref || '';
            return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ref.toLowerCase().includes(searchTerm.toLowerCase());
        });

        // Filter by company tab
        if (this.activeCompanyFilter !== 'all') {
            filtered = filtered.filter(p => {
                const company = p.company || 'both'; // Default to both if missing
                return company === 'both' || company === this.activeCompanyFilter;
            });
        }

        // FILTER BY DISPONIBLE VS LIMBO
        if (this.activeTab === 'stock') {
            filtered = filtered.filter(p => (parseFloat(p.stockMillenio) || 0) + (parseFloat(p.stockVulcano) || 0) > 0);
        } else if (this.activeTab === 'limbo') {
            filtered = filtered.filter(p => (parseFloat(p.stockMillenio) || 0) + (parseFloat(p.stockVulcano) || 0) <= 0);
        }

        if (filtered.length === 0) {
            list.innerHTML = '<tr><td colspan="8" class="text-center">No se encontraron productos</td></tr>';
            return;
        }

        list.innerHTML = filtered.map(p => `
            <tr class="${p.active === false ? 'inactive-row' : ''}">
                <td data-label="Foto">
                    <img src="${(Array.isArray(p.image) ? p.image[0] : p.image) || 'https://via.placeholder.com/40?text=NP'}" class="table-thumb" alt="${p.name}">
                </td>
                <td data-label="Ref"><small class="text-secondary">${p.ref || '-'}</small></td>
                <td data-label="Producto"><strong>${p.name}</strong></td>
                <td data-label="Categoría">${p.category}</td>
                <td data-label="Stock Millenio"><span class="stock-badge ${p.stockMillenio < 5 ? 'low-stock' : ''}">${p.stockMillenio}</span></td>
                 <td data-label="Stock Vulcano"><span class="stock-badge ${p.stockVulcano < 5 ? 'low-stock' : ''}">${p.stockVulcano}</span></td>
                 <td data-label="Precio">$${(parseFloat(p.priceInternet) || parseFloat(p.priceFinal) || 0).toLocaleString()}</td>
                 <td data-label="Estado">
                    <span class="status-badge ${p.active === false ? 'inactive' : 'active'}">
                        ${p.active === false ? 'Inactivo' : 'Activo'}
                    </span>
                </td>
                <td class="table-actions">
                    <button class="icon-btn receive-btn" data-id="${p.id}" title="Recibir Mercancía (Sumar)" style="color: var(--success);"><i class="fas fa-plus"></i></button>
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
                    const searchEl = document.getElementById('inventory-search');
                    this.updateInventoryList(searchEl ? searchEl.value : '');
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
                    
                    // Refresh categories before opening
                    await this.loadCategoryOptions();
                    
                    const form = document.getElementById('product-form');
                    Object.keys(product).forEach(key => {
                        const input = form.elements[key];
                        if (input) {
                            if (input.type === 'checkbox') input.checked = product[key] !== false;
                            else if (input.type !== 'file') input.value = product[key] !== undefined ? product[key] : (input.type === 'number' ? 0 : '');
                        }
                    });
                    const previewOld = document.getElementById('product-image-preview');
                    if (previewOld) previewOld.remove();

                    // Populate images
                    const images = Array.isArray(product.image) ? product.image : (product.image ? [product.image] : []);
                    const slots = document.querySelectorAll('.image-slot');
                    slots.forEach((slot, i) => {
                        const imgData = images[i];
                        if (imgData) {
                            slot.classList.remove('empty');
                            if (i === 0) slot.classList.add('primary');
                            let img = slot.querySelector('img');
                            if (!img) {
                                img = document.createElement('img');
                                slot.appendChild(img);
                            }
                            img.src = imgData;
                            slot.querySelector('.image-base64').value = imgData;
                        } else {
                            slot.classList.add('empty');
                            slot.classList.remove('primary');
                            const img = slot.querySelector('img');
                            if (img) img.remove();
                            slot.querySelector('.image-base64').value = '';
                        }
                    });

                    document.getElementById('product-modal').classList.add('show');
                } else if (actionBtn.classList.contains('delete-btn')) {
                    if (confirm('¿Estás seguro de eliminar este producto?')) {
                        await Storage.deleteItem(STORAGE_KEYS.PRODUCTS, id);
                        const searchEl = document.getElementById('inventory-search');
                        this.updateInventoryList(searchEl ? searchEl.value : '');
                    }
                } else if (actionBtn.classList.contains('receive-btn')) {
                    try {
                        const product = this.getProducts().find(p => p.id == id);
                        if (!product) {
                            alert("Error: Producto no encontrado.");
                            return;
                        }

                        const qtyStr = prompt(`Recibir Mercancía (Sumar stock)\nProducto: ${product.name}\n\n¿Cuántas unidades llegaron?`);
                        if (qtyStr === null) return;

                        const qty = parseInt(qtyStr);
                        if (isNaN(qty) || qty <= 0) return;

                        const companyChoice = prompt(`¿A qué inventario desea sumarlas? (m = Millenio, v = Vulcano)`, 'm');
                        if (companyChoice === null) return;

                        const company = companyChoice.toLowerCase();
                        const targetCompany = (company === 'v' || company === 'vulcano') ? 'vulcano' : 'millenio';

                        const notes = prompt(`¿Alguna nota o número de factura?`, 'Entrada Manual');

                        // Update stock
                        if (targetCompany === 'millenio') product.stockMillenio = (parseInt(product.stockMillenio) || 0) + qty;
                        else product.stockVulcano = (parseInt(product.stockVulcano) || 0) + qty;

                        await this.updateProduct(product.id, product);
                        await this.recordStockEntry(product.id, product.name, qty, targetCompany, 'Entrada Directa', notes);

                        alert(`¡Éxito! Se sumaron ${qty} unidades a ${product.name} (${targetCompany}). Total ahora: ${targetCompany === 'millenio' ? product.stockMillenio : product.stockVulcano}`);
                        this.updateInventoryList(document.getElementById('inventory-search')?.value || '');
                    } catch (err) {
                        console.error("Error receiving stock:", err);
                        alert("❌ Error al registrar entrada: " + err.message + "\n\nSi el error dice que la tabla 'stock_entries' no existe, por favor contacte a soporte para actualizar la base de datos.");
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

            // Transit / Import Modal Hooks
            if (e.target.id === 'add-import-btn' || e.target.closest('#add-import-btn')) {
                this.openTransitModal();
                return;
            }

            const editTransitBtn = e.target.closest('.edit-transit-btn');
            if (editTransitBtn) {
                this.openTransitModal(editTransitBtn.dataset.id);
                return;
            }

            if (e.target.id === 'save-transit-btn') {
                this.saveTransitOrder();
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
                
                // Refresh categories before opening
                await this.loadCategoryOptions();
                
                const slots = document.querySelectorAll('.image-slot');
                slots.forEach(slot => {
                    slot.classList.add('empty');
                    slot.classList.remove('primary');
                    const img = slot.querySelector('img');
                    if (img) img.remove();
                    slot.querySelector('.image-base64').value = '';
                });
                document.getElementById('product-modal').classList.add('show');
                return;
            }

            if (e.target.id === 'load-test-data') {
                const testProducts = [
                    { id: 'TEST1', name: 'Aceite Millenio Gold', category: 'Aceites', cost: 15000, priceInternet: 25000, priceWholesale: 22000, stockMillenio: 10, stockVulcano: 5, company: 'millenio', active: true, image: 'https://via.placeholder.com/150?text=Aceite' },
                    { id: 'TEST2', name: 'Filtro Aire Vulcano', category: 'Filtros', cost: 5000, priceInternet: 12000, priceWholesale: 10000, stockMillenio: 0, stockVulcano: 20, company: 'vulcano', active: true, image: 'https://via.placeholder.com/150?text=Filtro' }
                ];
                testProducts.forEach(p => this.addProduct(p));
                this.updateInventoryList();
                alert('Datos de prueba cargados.');
                return;
            }

            if (e.target.id === 'cleanup-products-btn') {
                this.handleCleanupProducts();
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

    },

    handleImageUpload(e, index) {
        const file = e.target.files[0];
        if (!file) return;

        console.log(`DEBUG: Uploading image to slot ${index}`);
        const reader = new FileReader();
        reader.onload = (ev) => {
            const tempImg = new Image();
            tempImg.onload = () => {
                // Resize rules for LocalStorage limits
                const MAX_WIDTH = 600;
                const MAX_HEIGHT = 600;
                let width = tempImg.width;
                let height = tempImg.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');

                // Clear and draw image with white background in case of transparent PNGs
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(tempImg, 0, 0, width, height);

                // Compress heavily to avoid 5MB quota errors
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);

                const slot = document.querySelector(`.image-slot[data-index="${index}"]`);
                if (slot) {
                    slot.classList.remove('empty');
                    if (index === 0) slot.classList.add('primary');

                    let img = slot.querySelector('img');
                    if (!img) {
                        img = document.createElement('img');
                        slot.insertBefore(img, slot.firstChild);
                    }
                    img.src = compressedBase64;
                    const hiddenInput = slot.querySelector('.image-base64');
                    if (hiddenInput) {
                        hiddenInput.value = compressedBase64;
                        console.log(`DEBUG: Image ${index} compressed to ${Math.round(compressedBase64.length / 1024)}KB`);
                    }
                }
            };
            tempImg.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    },

    removeImage(e, index) {
        if (e) e.stopPropagation();
        console.log(`DEBUG: Removing image from slot ${index}`);
        const slot = document.querySelector(`.image-slot[data-index="${index}"]`);
        if (slot) {
            slot.classList.add('empty');
            slot.classList.remove('primary');
            const img = slot.querySelector('img');
            if (img) img.remove();
            const hiddenInput = slot.querySelector('.image-base64');
            if (hiddenInput) hiddenInput.value = '';
            const fileInput = document.getElementById(`product-image-input-${index}`);
            if (fileInput) fileInput.value = '';
        }
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

            const cleanCurrency = (val) => parseFloat(String(val).replace(/\./g, "").replace(/[^0-9-]/g, "")) || 0;

            const formData = new FormData(form);
            const product = {
                id: this.editingId || '',
                name: formData.get('name'),
                category: formData.get('category'),
                description: formData.get('description') || '',
                provider: formData.get('provider'),
                cost: cleanCurrency(formData.get('cost')),
                priceWholesale: cleanCurrency(formData.get('priceWholesale')),
                priceFinal: cleanCurrency(formData.get('priceFinal')),
                commissionBase: cleanCurrency(formData.get('commissionBase')),
                stockMillenio: parseInt(formData.get('stockMillenio')) || 0,
                stockVulcano: parseInt(formData.get('stockVulcano')) || 0,
                company: formData.get('company'),
                active: formData.get('active') === 'true',
                image: Array.from(document.querySelectorAll('.image-base64'))
                    .map(input => input.value)
                    .filter(val => val && val.startsWith('data:image')),
                ref: formData.get('ref') || ''
            };

            console.log('DEBUG: Product object to save:', product);

            if (this.editingId) {
                await Storage.updateItem(STORAGE_KEYS.PRODUCTS, this.editingId, product);
                window.ERP_LOG('Actualización local exitosa', 'success');
            } else {
                const result = await Storage.addItem(STORAGE_KEYS.PRODUCTS, product);
                console.log('DEBUG: Storage.addItem result:', result);
                window.ERP_LOG('Creación local exitosa. ID: ' + result.id, 'success');
            }

            // If stock is 0, user won't see it in 'stock' tab. Auto-switch to 'limbo'.
            const totalStock = product.stockMillenio + product.stockVulcano;
            if (totalStock <= 0) {
                this.activeTab = 'limbo';
            } else {
                this.activeTab = 'stock';
            }

            // Visual Success instead of blocking alert
            btn.innerHTML = '<i class="fas fa-check"></i> ¡GUARDADO!';
            btn.classList.replace('btn-primary', 'btn-success');

            setTimeout(() => {
                form.reset();
                this.editingId = null;
                const modal = document.getElementById('product-modal');
                if (modal) modal.classList.remove('show');

                // Re-render UI to update tabs and lists
                this.renderPanel();

                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> GUARDAR PRODUCTO';
                btn.classList.replace('btn-success', 'btn-primary');
            }, 1200);

        } catch (err) {
            window.ERP_LOG('ERROR CRITICO: ' + err.message, 'error');
            alert('❌ ERROR AL GUARDAR: ' + err.message);
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> GUARDAR PRODUCTO';
        }
    },

    async handleCleanupProducts() {
        const products = this.getProducts();
        // Ghost products: No price, or "MILLENIO TOOLS" from old site that user says they never created.
        // We will show a confirmation with the count.
        const ghostCount = products.filter(p => !p.priceFinal && !p.priceInternet && !p.priceWholesale).length;
        
        if (ghostCount === 0) {
            alert("No se detectaron productos 'fantasma' (sin precios).");
            return;
        }

        if (confirm(`Se han detectado ${ghostCount} productos sin precios (posibles remanentes de la web antigua).\n\n¿Desea eliminarlos permanentemente del sistema?`)) {
            const productsToKeep = products.filter(p => p.priceFinal || p.priceInternet || p.priceWholesale);
            
            // Sync with Supabase (this might take a while if done one by one)
            // But Storage.addItem/updateItem are already async.
            // We need a Storage.setAll ideally.
            
            if (window.supabaseClient) {
                try {
                    const idsToRemove = products.filter(p => !p.priceFinal && !p.priceInternet && !p.priceWholesale).map(p => p.id);
                    const { error } = await window.supabaseClient.from('products').delete().in('id', idsToRemove);
                    if (error) throw error;
                } catch (err) {
                    console.error("Error cleaning up cloud products:", err);
                    alert("Error al limpiar en la nube: " + err.message);
                }
            }

            // Local update
            localStorage.setItem(`erp_${STORAGE_KEYS.PRODUCTS}`, JSON.stringify(productsToKeep));
            Storage.cache[STORAGE_KEYS.PRODUCTS] = productsToKeep;
            
            alert(`¡Limpieza completada! Se eliminaron ${ghostCount} productos.`);
            this.renderPanel();
        }
    },

    openTransitModal(orderId = null) {
        const form = document.getElementById('transit-form');
        form.reset();
        document.getElementById('transit-items-list').innerHTML = '';
        document.getElementById('transit-fob-total').textContent = '$0';
        document.getElementById('transit-logistics-total').textContent = '$0';

        if (orderId) {
            document.getElementById('transit-modal-title').textContent = 'Editar Importación';
            const order = Storage.getById(STORAGE_KEYS.TRANSIT_ORDERS, orderId);
            if (order) {
                document.getElementById('transit-id').value = order.id;
                form.elements['concept'].value = order.concept || '';
                form.elements['company'].value = order.company || 'both';
                form.elements['date'].value = order.date || '';
                
                form.elements['initialPayment'].value = (order.initialPayment || 0).toLocaleString('es-CO');
                form.elements['finalPayment'].value = (order.finalPayment || 0).toLocaleString('es-CO');
                form.elements['maritimeFreight'].value = (order.maritimeFreight || 0).toLocaleString('es-CO');
                form.elements['localFreight'].value = (order.localFreight || 0).toLocaleString('es-CO');
                form.elements['additionalExpenses'].value = (order.additionalExpenses || 0).toLocaleString('es-CO');

                if (order.items && Array.isArray(order.items)) {
                    order.items.forEach(item => this.addTransitItemRow(item));
                }
            }
        } else {
            document.getElementById('transit-modal-title').textContent = 'Nueva Importación';
            document.getElementById('transit-id').value = '';
            form.elements['date'].value = new Date().toISOString().split('T')[0];
            this.addTransitItemRow();
        }
        
        this.calculateTransitTotals();
        document.getElementById('transit-modal').classList.add('show');
    },

    addTransitItemRow(item = null) {
        const tbody = document.getElementById('transit-items-list');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="transit-item-ref" placeholder="Ej: REF-01" value="${item ? item.ref : ''}"></td>
            <td><input type="text" class="transit-item-name" placeholder="Ej: Producto..." required value="${item ? item.name : ''}"></td>
            <td><input type="number" class="transit-item-qty" value="${item ? item.qty : 1}" min="1" oninput="window.Inventory.calculateTransitTotals()"></td>
            <td><input type="text" class="transit-item-fob" placeholder="0" inputmode="numeric" value="${item ? (item.unitFob || 0).toLocaleString('es-CO') : ''}" oninput="window.Inventory.formatNumberInput(this); window.Inventory.calculateTransitTotals()"></td>
            <td class="transit-item-total-fob text-right" style="font-weight:bold;">$0</td>
            <td class="transit-item-net-cost text-right" style="font-weight:bold; color:#10b981;">$0</td>
            <td><button type="button" class="btn btn-sm btn-outline text-danger" onclick="window.Inventory.removeTransitItemRow(this)"><i class="fas fa-trash"></i></button></td>
        `;
        tbody.appendChild(tr);
        this.calculateTransitTotals();
    },

    removeTransitItemRow(btn) {
        const tr = btn.closest('tr');
        if (tr) {
            tr.remove();
            this.calculateTransitTotals();
        }
    },

    calculateTransitTotals() {
        // Parse Form
        const maritime = parseFloat(document.getElementById('transit-maritime').value.replace(/\./g, '')) || 0;
        const local = parseFloat(document.getElementById('transit-local').value.replace(/\./g, '')) || 0;
        const additional = parseFloat(document.getElementById('transit-additional').value.replace(/\./g, '')) || 0;
        
        const logisticsTotal = maritime + local + additional;
        document.getElementById('transit-logistics-total').textContent = '$' + logisticsTotal.toLocaleString('es-CO');

        // Parse Items
        const rows = document.querySelectorAll('#transit-items-list tr');
        let fobTotal = 0;

        rows.forEach(row => {
            const qty = parseInt(row.querySelector('.transit-item-qty').value) || 0;
            const unitFob = parseFloat(row.querySelector('.transit-item-fob').value.replace(/\./g, '')) || 0;
            const rowFob = qty * unitFob;
            row.querySelector('.transit-item-total-fob').textContent = '$' + rowFob.toLocaleString('es-CO');
            fobTotal += rowFob;
        });

        document.getElementById('transit-fob-total').textContent = '$' + fobTotal.toLocaleString('es-CO');

        // Prorate Items
        rows.forEach(row => {
            const qty = parseInt(row.querySelector('.transit-item-qty').value) || 0;
            const unitFob = parseFloat(row.querySelector('.transit-item-fob').value.replace(/\./g, '')) || 0;
            const rowFob = qty * unitFob;
            
            let assignedLogistics = 0;
            if (fobTotal > 0) {
                assignedLogistics = logisticsTotal * (rowFob / fobTotal);
            }

            const netUnitCost = unitFob + (qty > 0 ? (assignedLogistics / qty) : 0);
            row.querySelector('.transit-item-net-cost').textContent = '$' + netUnitCost.toLocaleString('es-CO', {maximumFractionDigits:2});
        });
    },

    async saveTransitOrder() {
        const form = document.getElementById('transit-form');
        if (!form.reportValidity()) return;

        const id = document.getElementById('transit-id').value;
        const btn = document.getElementById('save-transit-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> GUARDANDO...';

        try {
            // Collect items
            const items = [];
            const rows = document.querySelectorAll('#transit-items-list tr');
            rows.forEach(row => {
                const name = row.querySelector('.transit-item-name').value.trim();
                if (name) {
                    items.push({
                        ref: row.querySelector('.transit-item-ref').value.trim(),
                        name: name,
                        qty: parseInt(row.querySelector('.transit-item-qty').value) || 0,
                        unitFob: parseFloat(row.querySelector('.transit-item-fob').value.replace(/\./g, '')) || 0
                    });
                }
            });

            // Calculate FOB
            const fobTotal = items.reduce((sum, item) => sum + (item.qty * item.unitFob), 0);

            const orderData = {
                company: form.elements['company'].value,
                concept: form.elements['concept'].value,
                date: form.elements['date'].value,
                initialPayment: parseFloat(form.elements['initialPayment'].value.replace(/\./g, '')) || 0,
                finalPayment: parseFloat(form.elements['finalPayment'].value.replace(/\./g, '')) || 0,
                maritimeFreight: parseFloat(form.elements['maritimeFreight'].value.replace(/\./g, '')) || 0,
                localFreight: parseFloat(form.elements['localFreight'].value.replace(/\./g, '')) || 0,
                additionalExpenses: parseFloat(form.elements['additionalExpenses'].value.replace(/\./g, '')) || 0,
                fobTotal: fobTotal,
                amount: fobTotal, // For backwards compatibility
                items: items,
                status: 'pending'
            };

            if (id) {
                orderData.id = id;
                await Storage.updateItem(STORAGE_KEYS.TRANSIT_ORDERS, id, orderData);
            } else {
                await Storage.addItem(STORAGE_KEYS.TRANSIT_ORDERS, orderData);
            }

            btn.innerHTML = '<i class="fas fa-check"></i> ¡GUARDADO!';
            btn.classList.replace('btn-primary', 'btn-success');

            setTimeout(() => {
                form.reset();
                document.getElementById('transit-modal').classList.remove('show');
                this.updateTransitList();
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> GUARDAR PROGRESO DE IMPORTACIÓN';
                btn.classList.replace('btn-success', 'btn-primary');
            }, 1000);
        } catch (err) {
            console.error("Error saving transit order", err);
            alert("Error al guardar: " + err.message);
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> GUARDAR PROGRESO DE IMPORTACIÓN';
        }
    }
};

