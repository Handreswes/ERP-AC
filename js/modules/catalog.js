/**
 * ERP AC Catalog Generator Module
 */

window.Catalog = {
    currentCompany: 'all',
    currentPriceType: 'wholesale', // 'wholesale' or 'internet'

    init() {
        this.renderPanel();
    },

    formatCatalogDescription(descText) {
        if (!descText) return '';
        const lines = descText.split(/\r?\n/);
        const hasProperties = lines.some(line => line.includes(':'));
        
        if (hasProperties) {
            let html = '<div class="specs-table">';
            lines.forEach(line => {
                line = line.trim();
                if (!line) return;
                
                if (line.includes(':')) {
                    const colonIdx = line.indexOf(':');
                    const prop = line.substring(0, colonIdx).trim();
                    const val = line.substring(colonIdx + 1).trim();
                    
                    // Clean up markdown bold inside key/val if any, and any bullet symbol
                    const cleanProp = prop.replace(/\*\*/g, '').replace(/^[\*\-\u2022]\s*/, '');
                    const cleanVal = val.replace(/\*\*/g, '');
                    
                    html += `
                        <div class="spec-row">
                            <span class="spec-prop">${cleanProp}</span>
                            <span class="spec-dots"></span>
                            <span class="spec-val">${cleanVal}</span>
                        </div>
                    `;
                } else {
                    const cleanLine = line.replace(/^[\*\-\u2022]\s*/, '').replace(/\*\*/g, '');
                    html += `<div class="spec-text">${cleanLine}</div>`;
                }
            });
            html += '</div>';
            return html;
        }
        
        // Fallback: standard pre-line block
        return `<div class="standard-desc" style="white-space: pre-line;">${descText}</div>`;
    },

    getDisplayDescription(p) {
        const parts = (p.description || '').split('[CATALOGO]');
        if (parts[1] && parts[1].trim()) {
            return parts[1].trim();
        }
        
        // Fallback check: if there is no [CATALOGO] delimiter, check if the single description is technical
        const descText = parts[0].trim();
        if (!descText) return '';
        
        const lines = descText.split(/\r?\n/);
        const hasColons = lines.some(line => line.includes(':'));
        
        // Show if it's structured technically (has colons) or is brief (under 120 chars)
        if (hasColons || descText.length < 120) {
            return descText;
        }
        
        // Otherwise, it is a long commercial text. Hide it to keep cards neat!
        return '';
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
                <div style="margin-top: 1.5rem; display: flex; flex-direction: column; gap: 8px;">
                    <label style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary);"><i class="fas fa-link"></i> Enlace de Catálogo Compartible (Tiempo Real):</label>
                    <div style="display: flex; gap: 10px;">
                        <input type="text" id="shareable-catalog-url" class="form-control" readonly value="https://Handreswes.github.io/ERP-AC/catalogo.html?price=wholesale" style="background: var(--bg-body); color: var(--text-primary); border: 1px solid var(--border); font-family: monospace; font-size: 0.85rem; flex-grow: 1;">
                        <button class="btn btn-secondary" onclick="navigator.clipboard.writeText(document.getElementById('shareable-catalog-url').value); alert('¡Enlace de Catálogo copiado al portapapeles!');" style="white-space: nowrap;">
                            <i class="fas fa-copy"></i> Copiar Enlace
                        </button>
                    </div>
                    <small style="color: var(--text-secondary);">Envíale este enlace directo a tus clientes mayoristas. Se actualiza en tiempo real con los productos del ERP.</small>
                </div>
            </div>

            <div style="position: relative; max-width: 500px; width: 100%; margin-bottom: 1.5rem;">
                <i class="fas fa-search" style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: var(--text-secondary); font-size: 1.2rem;"></i>
                <input type="text" id="catalog-search" class="form-control" placeholder="Buscar productos para el catálogo..." style="padding-left: 45px !important; border-radius: 15px; border: 2px solid var(--border); transition: all 0.3s;" onfocus="this.style.borderColor='var(--accent)'; this.style.boxShadow='0 0 0 4px rgba(37,99,235,0.1)';" onblur="this.style.borderColor='var(--border)'; this.style.boxShadow='none';">
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
        this.updateShareableLink();
        this.setupEventListeners();
    },

    updatePreview() {
        const searchInput = document.getElementById('catalog-search');
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const products = Inventory.getProducts().filter(p => p.active !== false);
        let filtered = products;

        if (this.currentCompany !== 'all') {
            filtered = products.filter(p => p.company === 'both' || p.company === this.currentCompany);
        }

        if (searchTerm) {
            filtered = filtered.filter(p => 
                (p.name && p.name.toLowerCase().includes(searchTerm)) ||
                (p.category && p.category.toLowerCase().includes(searchTerm)) ||
                (p.description && p.description.toLowerCase().includes(searchTerm))
            );
        }

        const list = document.getElementById('catalog-preview-list');
        const mobileList = document.getElementById('catalog-mobile-list');

        if (list) {
            list.innerHTML = filtered.map(p => {
                const price = this.currentPriceType === 'wholesale' ? p.priceWholesale : (p.priceFinal || p.priceInternet);
                const displayDesc = this.getDisplayDescription(p);
                return `
                    <tr>
                        <td><img src="${(Array.isArray(p.image) ? p.image[0] : p.image) || 'https://via.placeholder.com/50'}" style="width: 50px; height:50px; object-fit: cover; border-radius: 8px;"></td>
                        <td>
                            <strong>${p.name}</strong>
                            ${displayDesc ? `<div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px; text-align: left;">${this.formatCatalogDescription(displayDesc)}</div>` : ''}
                        </td>
                        <td>${p.category}</td>
                        <td class="text-success" style="font-weight: 700;">$${parseFloat(price || 0).toLocaleString()}</td>
                    </tr>
                `;
            }).join('');
        }

        if (mobileList) {
            mobileList.innerHTML = filtered.map(p => {
                const price = this.currentPriceType === 'wholesale' ? p.priceWholesale : (p.priceFinal || p.priceInternet);
                const displayDesc = this.getDisplayDescription(p);
                return `
                    <div class="catalog-mobile-card">
                        <img src="${(Array.isArray(p.image) ? p.image[0] : p.image) || 'https://via.placeholder.com/70'}" class="catalog-mobile-img">
                        <div class="catalog-mobile-info">
                            <span class="catalog-mobile-name">${p.name}</span>
                            ${displayDesc ? `<div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px; text-align: left;">${this.formatCatalogDescription(displayDesc)}</div>` : ''}
                            <small style="color: var(--text-secondary); display:block; margin-top:3px;">${p.category}</small>
                            <div class="catalog-mobile-price">$${parseFloat(price || 0).toLocaleString()}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    },

    updateShareableLink() {
        const urlInput = document.getElementById('shareable-catalog-url');
        if (urlInput) {
            urlInput.value = `https://Handreswes.github.io/ERP-AC/catalogo.html?price=${this.currentPriceType}&company=${this.currentCompany}`;
        }
    },

    setupEventListeners() {
        const panel = document.getElementById('catalog-panel');
        if (!panel) return;

        panel.onchange = (e) => {
            if (e.target.id === 'catalog-company-filter') {
                this.currentCompany = e.target.value;
                this.updatePreview();
                this.updateShareableLink();
            }
            if (e.target.id === 'catalog-price-type') {
                this.currentPriceType = e.target.value;
                this.updatePreview();
                this.updateShareableLink();
            }
        };

        panel.oninput = (e) => {
            if (e.target.id === 'catalog-search') {
                this.updatePreview();
            }
        };

        const viewBtn = document.getElementById('view-catalog-btn');
        if (viewBtn) {
            viewBtn.onclick = () => this.openCatalogView();
        }
    },

    openCatalogView() {
        const searchInput = document.getElementById('catalog-search');
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const products = Inventory.getProducts().filter(p => p.active !== false);
        let filtered = products;

        if (this.currentCompany !== 'all') {
            filtered = products.filter(p => p.company === 'both' || p.company === this.currentCompany);
        }

        if (searchTerm) {
            filtered = filtered.filter(p => 
                (p.name && p.name.toLowerCase().includes(searchTerm)) ||
                (p.category && p.category.toLowerCase().includes(searchTerm)) ||
                (p.description && p.description.toLowerCase().includes(searchTerm))
            );
        }

        const catalogWindow = window.open('', '_blank');
        const title = this.currentCompany === 'all' ? 'Catálogo General' : 'Catálogo ' + this.currentCompany.toUpperCase();

        const htmlProducts = filtered.map(p => {
            const price = this.currentPriceType === 'wholesale' ? p.priceWholesale : (p.priceFinal || p.priceInternet);
            const displayDesc = this.getDisplayDescription(p);
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
                        ${displayDesc ? `<div class="desc">${this.formatCatalogDescription(displayDesc)}</div>` : ''}
                        <div class="price-tag">$${parseFloat(price).toLocaleString()}</div>
                    </div>
                </div>
            `;
        }).join('');

        // Resolve WhatsApp Wholesale Sales Phone (Strictly wholesale phone number per user request)
        const waPhone = '573113979396';

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
        body { font-family: "Outfit", sans-serif; background: var(--bg); margin: 0; padding: 0; overflow-x: hidden; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 3rem 1.5rem; text-align: center; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .header h1 { margin: 0; font-size: 2.2rem; }
        .container { max-width: 1200px; margin: -1.5rem auto 4rem; padding: 0 1rem; }
        .catalog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.5rem; }
        .product-card { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); transition: 0.3s; display: flex; flex-direction: column; border: 1px solid rgba(0,0,0,0.03); page-break-inside: avoid; break-inside: avoid; }
        .product-gallery { width: 100%; height: 250px; position: relative; display: flex; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; background: #f1f5f9; }
        .product-gallery::-webkit-scrollbar { display: none; }
        .product-img { min-width: 100%; height: 250px; object-fit: cover; scroll-snap-align: start; }
        .product-info { padding: 1.25rem; text-align: center; flex: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 0.5rem; }
        .category { font-size: 0.65rem; color: var(--accent); font-weight: 700; text-transform: uppercase; margin-bottom: 0.3rem; }
        .name { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.75rem; color: #1e293b; }
        .desc { font-size: 0.82rem !important; color: #64748b; margin-bottom: 0.75rem; line-height: 1.4; text-align: left; background: rgba(0,0,0,0.01); padding: 8px 12px; border-radius: 8px; border-left: 3px solid var(--accent); }
        .price-tag { background: var(--primary); color: white; padding: 0.4rem 1.2rem; border-radius: 50px; font-weight: 700; display: inline-block; align-self: center; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .print-btn { position: fixed; bottom: 1.5rem; right: 1.5rem; background: var(--accent); color: white; border: none; padding: 1rem 1.5rem; border-radius: 50px; cursor: pointer; box-shadow: 0 10px 20px rgba(59,130,246,0.3); z-index: 100; font-weight: 600; font-family: 'Outfit', sans-serif; transition: 0.2s; }
        .print-btn:hover { background: #2563eb; transform: scale(1.05); }

        /* Floating WhatsApp Button for Wholesale Sales */
        .whatsapp-float {
            position: fixed;
            bottom: 1.5rem;
            left: 1.5rem;
            background: #25d366;
            color: white;
            padding: 0.8rem 1.5rem;
            border-radius: 50px;
            display: flex;
            align-items: center;
            gap: 10px;
            text-decoration: none;
            font-weight: 700;
            font-size: 0.95rem;
            box-shadow: 0 10px 20px rgba(37,211,102,0.3);
            z-index: 10000;
            transition: 0.3s ease;
            font-family: 'Outfit', sans-serif;
            animation: pulse-whatsapp 2s infinite;
        }
        .whatsapp-float:hover {
            transform: scale(1.05);
            background: #128c7e;
        }
        .whatsapp-float i {
            font-size: 1.35rem;
        }
        @keyframes pulse-whatsapp {
            0% { box-shadow: 0 0 0 0 rgba(37,211,102,0.7); }
            70% { box-shadow: 0 0 0 12px rgba(37,211,102,0); }
            100% { box-shadow: 0 0 0 0 rgba(37,211,102,0); }
        }

        /* Specs table with dot leaders */
        .specs-table { display: flex; flex-direction: column; gap: 5px; margin-top: 8px; width: 100%; }
        .spec-row { display: flex; justify-content: space-between; align-items: baseline; font-size: 0.82rem; line-height: 1.4; }
        .spec-prop { font-weight: 600; color: #1e293b; padding-right: 6px; white-space: nowrap; }
        .spec-dots { flex-grow: 1; border-bottom: 1px dotted #cbd5e1; margin: 0 4px; position: relative; top: -3px; }
        .spec-val { color: #475569; text-align: right; padding-left: 6px; font-weight: 500; }
        .spec-text { font-size: 0.82rem; color: #64748b; margin-top: 4px; font-style: italic; text-align: left; }
        .standard-desc { font-size: 0.82rem; color: #475569; line-height: 1.45; text-align: left; }

        /* Cover Page Styling */
        .print-cover { display: none; }

        @media (max-width: 480px) {
            .catalog-grid { grid-template-columns: 1fr; }
            .header h1 { font-size: 1.8rem; }
            .product-gallery, .product-img { height: 300px; }
        }

        @media print {
            @page {
                size: portrait;
                margin: 20mm 15mm 20mm 15mm;
            }
            body { background: white !important; color: #0f172a !important; }
            .header, .print-btn, .whatsapp-float { display: none !important; }
            .container { margin-top: 0 !important; padding: 0 !important; }
            .catalog-grid {
                grid-template-columns: repeat(2, 1fr) !important;
                gap: 15mm !important;
            }
            .product-card {
                box-shadow: none !important;
                border: 1px solid #cbd5e1 !important;
                background: white !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                border-radius: 12px !important;
            }
            .product-gallery, .product-img {
                height: 220px !important;
            }
            .product-info {
                padding: 14px !important;
                gap: 5px !important;
            }
            .name {
                font-size: 1.1rem !important;
                margin-bottom: 4px !important;
                color: #0f172a !important;
                font-weight: 700 !important;
            }
            .category {
                font-size: 0.7rem !important;
                margin-bottom: 2px !important;
                color: #2563eb !important;
                font-weight: 700 !important;
            }
            .desc {
                font-size: 0.78rem !important;
                background: transparent !important;
                border-left: 2px solid #2563eb !important;
                padding: 4px 10px !important;
                margin-bottom: 8px !important;
            }
            .price-tag {
                font-size: 1.1rem !important;
                background: #0f172a !important;
                color: white !important;
                padding: 5px 15px !important;
                border-radius: 25px !important;
                align-self: center !important;
            }

            /* Specs details on printed page */
            .spec-row { font-size: 0.78rem !important; line-height: 1.4 !important; }
            .spec-prop { color: #0f172a !important; }
            .spec-val { color: #334155 !important; }
            .spec-text { font-size: 0.78rem !important; }
            .standard-desc { font-size: 0.78rem !important; }

            /* Printed Cover Page Layout */
            .print-cover {
                display: flex !important;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 94vh;
                box-sizing: border-box;
                padding: 15mm;
                page-break-after: always !important;
                break-after: page !important;
                background: #ffffff !important;
                color: #0f172a !important;
                position: relative;
                border: 8px double #1e293b;
            }
            .cover-border {
                border: 1px solid #2563eb;
                border-radius: 12px;
                padding: 15mm;
                width: 100%;
                height: 100%;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                align-items: center;
            }
            .cover-header {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 5px;
            }
            .cover-company-logo {
                font-size: 2.6rem;
                font-weight: 800;
                letter-spacing: 8px;
                color: #0f172a !important;
                text-align: center;
            }
            .cover-company-slogan {
                font-size: 0.75rem;
                letter-spacing: 4px;
                color: #475569 !important;
                font-weight: 700;
                text-transform: uppercase;
                margin-top: 5px;
                text-align: center;
            }
            .cover-body {
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                max-width: 85%;
            }
            .cover-catalog-label {
                font-size: 0.85rem;
                letter-spacing: 6px;
                color: #2563eb !important;
                font-weight: 800;
                text-transform: uppercase;
                margin-bottom: 20px;
                border-bottom: 2px solid #2563eb;
                padding-bottom: 5px;
            }
            .cover-title {
                font-size: 3.2rem !important;
                font-weight: 800;
                color: #0f172a !important;
                margin: 0 0 15px 0 !important;
                letter-spacing: 1px;
                line-height: 1.15;
            }
            .cover-description {
                font-size: 0.95rem;
                color: #475569 !important;
                line-height: 1.6;
                margin: 0;
            }
            .cover-footer {
                display: flex;
                flex-direction: column;
                gap: 8px;
                align-items: center;
                width: 100%;
                border-top: 1px solid #e2e8f0;
                padding-top: 20px;
            }
            .footer-meta-item {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 0.8rem;
                color: #475569 !important;
            }
            .footer-meta-item i {
                color: #2563eb !important;
                font-size: 0.9rem;
            }
            .footer-meta-item strong {
                color: #0f172a !important;
            }
        }
    </style>
</head>
<body>
    <!-- Beautiful Premium Cover Page (Visible ONLY in print) -->
    <div class="print-cover">
        <div class="cover-border">
            <div class="cover-header">
                <span class="cover-company-logo">TUCOMPRAS</span>
                <span class="cover-company-slogan">SOLUCIONES PARA EL HOGAR Y LA FERRETERÍA</span>
            </div>
            <div class="cover-body">
                <span class="cover-catalog-label">CATÁLOGO OFICIAL</span>
                <h1 class="cover-title">${title.toUpperCase()}</h1>
                <p class="cover-description">
                    Presentamos nuestra selección exclusiva de herramientas profesionales y artículos seleccionados de la más alta calidad, con precios competitivos y garantía respaldada por motor y defectos de fábrica.
                </p>
            </div>
            <div class="cover-footer">
                <div class="footer-meta-item">
                    <i class="fas fa-calendar-alt"></i>
                    <span><strong>FECHA DE EMISIÓN:</strong> ${new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div class="footer-meta-item">
                    <i class="fas fa-truck-fast"></i>
                    <span><strong>COBERTURA:</strong> ${this.currentPriceType === 'wholesale' ? 'ENVÍOS NACIONALES' : 'ENVÍOS NACIONALES + CONTRAENTREGA'}</span>
                </div>
                <div class="footer-meta-item">
                    <i class="fas fa-globe"></i>
                    <span><strong>SITIO WEB:</strong> www.tucomprascol.com</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Floating WhatsApp Button for Wholesale Sales -->
    <a href="https://wa.me/${waPhone}?text=Hola,%20quisiera%20consultar%20sobre%20ventas%20al%20por%20mayor%20del%20catálogo" target="_blank" class="whatsapp-float">
        <i class="fab fa-whatsapp"></i>
        <span>Ventas al por Mayor</span>
    </a>

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
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        catalogWindow.location.href = url;
    }
};
