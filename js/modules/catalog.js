/**
 * ERP AC Catalog Generator Module
 */

window.Catalog = {
    currentCompany: 'all',
    currentPriceType: 'wholesale', // 'wholesale' or 'internet'

    init() {
        // This will be called via Navigation
    },

    renderPanel() {
        const contentArea = document.getElementById('content-area');
        let panel = document.getElementById('catalog-panel');

        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'catalog-panel';
            panel.className = 'panel';
            contentArea.appendChild(panel);
        }

        panel.innerHTML = `
            <div class="panel-header">
                <h1>Generador de Catálogos Premium</h1>
                <div class="actions">
                    <button id="view-catalog-btn" class="btn btn-primary btn-lg">
                        <i class="fas fa-eye"></i> Ver Catálogo Elegante
                    </button>
                </div>
            </div>

            <div class="card" style="margin-bottom: 2rem; padding: 1.5rem; background: var(--bg-card); border-radius: var(--radius); border: 1px solid var(--border);">
                <div class="form-grid">
                    <div class="form-group">
                        <label><i class="fas fa-building"></i> Filtrar por Empresa</label>
                        <select id="catalog-company-filter" class="form-control">
                            <option value="all" ${this.currentCompany === 'all' ? 'selected' : ''}>Todas las Empresas (Ambas)</option>
                            <option value="millenio" ${this.currentCompany === 'millenio' ? 'selected' : ''}>Millenio</option>
                            <option value="vulcano" ${this.currentCompany === 'vulcano' ? 'selected' : ''}>Vulcano</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-tags"></i> Tipo de Precio a Mostrar</label>
                        <select id="catalog-price-type" class="form-control">
                            <option value="wholesale" ${this.currentPriceType === 'wholesale' ? 'selected' : ''}>Precios al POR MAYOR</option>
                            <option value="internet" ${this.currentPriceType === 'internet' ? 'selected' : ''}>Precios Venta INTERNET / FINAL</option>
                        </select>
                    </div>
                </div>
                <div class="alert alert-info" style="margin-top: 1.5rem; background: rgba(59,130,246,0.1); border: 1px solid var(--accent); padding: 1rem; border-radius: 12px; font-size: 0.85rem;">
                    <i class="fas fa-magic"></i> El catálogo se genera automáticamente con todos los productos activos. El diseño es responsive y elegante.
                </div>
            </div>

            <div id="catalog-preview-container" class="catalog-preview">
                <div class="desktop-only table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Imagen</th>
                                <th>Producto</th>
                                <th>Categoría</th>
                                <th>Precio Seleccionado</th>
                            </tr>
                        </thead>
                        <tbody id="catalog-preview-list"></tbody>
                    </table>
                </div>
                <div class="mobile-only" id="catalog-mobile-list">
                    <!-- Mobile cards load here -->
                </div>
            </div>
        `;

        this.updatePreview();
        this.setupEventListeners();
    },

    updatePreview() {
        const products = Inventory.getProducts().filter(p => p.active !== false);
        let filtered = products;

        if (this.currentCompany !== 'all') {
            filtered = products.filter(p => p.company === 'both' || p.company === this.currentCompany);
        }

        const list = document.getElementById('catalog-preview-list');
        const mobileList = document.getElementById('catalog-mobile-list');

        if (list) {
            list.innerHTML = filtered.map(p => {
                const price = this.currentPriceType === 'wholesale' ? p.priceWholesale : (p.priceFinal || p.priceInternet);
                return `
                    <tr>
                        <td><img src="${(Array.isArray(p.image) ? p.image[0] : p.image) || 'https://via.placeholder.com/50'}" style="width: 50px; height:50px; object-fit: cover; border-radius: 8px;"></td>
                        <td><strong>${p.name}</strong></td>
                        <td>${p.category}</td>
                        <td class="text-success" style="font-weight: 700;">$${parseFloat(price || 0).toLocaleString()}</td>
                    </tr>
                `;
            }).join('');
        }

        if (mobileList) {
            mobileList.innerHTML = filtered.map(p => {
                const price = this.currentPriceType === 'wholesale' ? p.priceWholesale : (p.priceFinal || p.priceInternet);
                return `
                    <div class="catalog-mobile-card">
                        <img src="${(Array.isArray(p.image) ? p.image[0] : p.image) || 'https://via.placeholder.com/70'}" class="catalog-mobile-img">
                        <div class="catalog-mobile-info">
                            <span class="catalog-mobile-name">${p.name}</span>
                            <small style="color: var(--text-secondary)">${p.category}</small>
                            <div class="catalog-mobile-price">$${parseFloat(price || 0).toLocaleString()}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    },

    setupEventListeners() {
        const panel = document.getElementById('catalog-panel');
        if (!panel) return;

        panel.onchange = (e) => {
            if (e.target.id === 'catalog-company-filter') {
                this.currentCompany = e.target.value;
                this.updatePreview();
            }
            if (e.target.id === 'catalog-price-type') {
                this.currentPriceType = e.target.value;
                this.updatePreview();
            }
        };

        const viewBtn = document.getElementById('view-catalog-btn');
        if (viewBtn) {
            viewBtn.onclick = () => this.openCatalogView();
        }
    },

    openCatalogView() {
        const products = Inventory.getProducts().filter(p => p.active !== false);
        let filtered = products;

        if (this.currentCompany !== 'all') {
            filtered = products.filter(p => p.company === 'both' || p.company === this.currentCompany);
        }

        const catalogWindow = window.open('', '_blank');
        const title = this.currentCompany === 'all' ? 'Catálogo General' : 'Catálogo ' + this.currentCompany.toUpperCase();

        const htmlProducts = filtered.map(p => {
            const price = this.currentPriceType === 'wholesale' ? p.priceWholesale : (p.priceFinal || p.priceInternet);
            return `
                <div class="product-card">
                    <div class="product-gallery">
                        ${(Array.isArray(p.image) ? p.image : [p.image || 'https://via.placeholder.com/300?text=Premium+Product']).map((img, idx) => `
                            <img src="${img}" class="product-img ${idx === 0 ? 'active' : ''}" data-index="${idx}">
                        `).join('')}
                    </div>
                    <div class="product-info">
                        <div class="category">${p.category || 'General'}</div>
                        <div class="name">${p.name}</div>
                        <div class="price-tag">$${parseFloat(price).toLocaleString()}</div>
                    </div>
                </div>
            `;
        }).join('');

        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        :root { --primary: #0f172a; --accent: #3b82f6; --bg: #f8fafc; }
        body { font-family: "Outfit", sans-serif; background: var(--bg); margin: 0; padding: 0; overflow-x: hidden; }
        .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 3rem 1.5rem; text-align: center; }
        .header h1 { margin: 0; font-size: 2.2rem; }
        .container { max-width: 1200px; margin: -1.5rem auto 4rem; padding: 0 1rem; }
        .catalog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1.5rem; }
        .product-card { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); transition: 0.3s; display: flex; flex-direction: column; }
        .product-gallery { width: 100%; height: 250px; position: relative; display: flex; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; background: #f1f5f9; }
        .product-gallery::-webkit-scrollbar { display: none; }
        .product-img { min-width: 100%; height: 250px; object-fit: cover; scroll-snap-align: start; }
        .product-info { padding: 1.25rem; text-align: center; flex: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 0.5rem; }
        .category { font-size: 0.65rem; color: var(--accent); font-weight: 700; text-transform: uppercase; margin-bottom: 0.3rem; }
        .name { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.75rem; color: #1e293b; }
        .price-tag { background: var(--primary); color: white; padding: 0.4rem 1.2rem; border-radius: 50px; font-weight: 700; display: inline-block; align-self: center; }
        .print-btn { position: fixed; bottom: 1.5rem; right: 1.5rem; background: var(--accent); color: white; border: none; padding: 1rem 1.5rem; border-radius: 50px; cursor: pointer; box-shadow: 0 10px 20px rgba(59,130,246,0.3); z-index: 100; }
        @media (max-width: 480px) {
            .catalog-grid { grid-template-columns: 1fr; }
            .header h1 { font-size: 1.8rem; }
            .product-gallery, .product-img { height: 300px; }
        }
        @media print { .print-btn { display: none; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>${title}</h1>
        <p>Catálogo Premium - Edición Digital</p>
    </div>
    <div class="container">
        <div class="catalog-grid">${htmlProducts}</div>
    </div>
    <button class="print-btn" onclick="window.print()">
        <i class="fas fa-print"></i> Guardar PDF / Imprimir
    </button>
</body>
</html>`;

        catalogWindow.document.write(html);
        catalogWindow.document.close();
    }
};
