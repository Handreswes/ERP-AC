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
                    <button class="tab-btn ${this.activeTab === 'limbo' ? 'active' : ''}" data-tab="limbo">🌪️ El Limbo (Agotados)</button>
                    <button class="tab-btn ${this.activeTab === 'transit' ? 'active' : ''}" data-tab="transit">📦 En Tránsito / Importaciones</button>
                </div>
            </div>

            <div id="inventory-stock-view" style="display: ${this.activeTab === 'stock' || this.activeTab === 'limbo' ? 'block' : 'none'};">
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
                                    <input type="text" name="category" required>
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
                                     <input type="text" name="priceInternet" placeholder="0" inputmode="numeric"
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
        `;

        this.activeTab === 'transit' ? this.updateTransitList() : this.updateInventoryList();
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
                priceFinal: cleanCurrency(formData.get('priceInternet')),
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

            form.reset();
            this.editingId = null;
            const modal = document.getElementById('product-modal');
            if (modal) modal.classList.remove('show');
            this.updateInventoryList();

            // Final verification log
            console.log('DEBUG: Inventory List Updated. Search for "soldador" now.');
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

