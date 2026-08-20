const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function generatePDF() {
    console.log("Iniciando generación de PDF del catálogo mayorista con logos...");

    const erpDir = 'c:/Users/ANDRES/OneDrive/Desktop/PROYECTOS ANTIGRAVITY/ERP AC';
    const jsonPath = path.join(erpDir, 'products.json');
    if (!fs.existsSync(jsonPath)) {
        console.error("No se encontró products.json");
        return;
    }

    // Load Logos
    const tucomprasLogoPath = path.join(erpDir, 'logo_tucompras.png.jpg');
    const vulcanoLogoPath = path.join(erpDir, 'logo Vulcano.jpeg');

    const b64TuCompras = fs.existsSync(tucomprasLogoPath) ? ('data:image/jpeg;base64,' + fs.readFileSync(tucomprasLogoPath).toString('base64')) : '';
    const b64Vulcano = fs.existsSync(vulcanoLogoPath) ? ('data:image/jpeg;base64,' + fs.readFileSync(vulcanoLogoPath).toString('base64')) : '';

    const products = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    // Filter active wholesale products with stock > 0
    let wholesaleProds = products.filter(p => {
        const stockM = parseInt(p.stockMillenio) || 0;
        const stockV = parseInt(p.stockVulcano) || 0;
        const hasStock = (stockM + stockV) > 0;
        const hasPrice = parseFloat(p.priceWholesale) > 0;
        return p.active !== false && hasStock && hasPrice;
    });

    // Sort products: Tools / General FIRST, Cuadros LAST
    wholesaleProds.sort((a, b) => {
        const catA = (a.category || '').toLowerCase();
        const catB = (b.category || '').toLowerCase();
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();

        const isCuadroA = catA.includes('cuadro') || nameA.includes('cuadro');
        const isCuadroB = catB.includes('cuadro') || nameB.includes('cuadro');

        if (isCuadroA && !isCuadroB) return 1;
        if (!isCuadroA && isCuadroB) return -1;
        return 0;
    });

    console.log(`Procesando ${wholesaleProds.length} productos mayoristas para PDF...`);

    const dateStr = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

    // Format products HTML
    const productsCardsHtml = wholesaleProds.map(p => {
        const price = parseFloat(p.priceWholesale || 0).toLocaleString();
        let rawImg = (Array.isArray(p.image) ? p.image[0] : p.image) || '';
        let imgSrc = '';

        if (rawImg && typeof rawImg === 'string') {
            if (rawImg.startsWith('data:image')) {
                imgSrc = rawImg;
            } else if (rawImg.startsWith('http')) {
                // If it points to tucomprascol.com/images/products/... try local file first
                const filename = path.basename(rawImg);
                const localImgPath = path.join(erpDir, 'images', 'products', filename);
                if (fs.existsSync(localImgPath)) {
                    const ext = filename.endsWith('.png') ? 'png' : 'jpeg';
                    imgSrc = 'data:image/' + ext + ';base64,' + fs.readFileSync(localImgPath).toString('base64');
                } else {
                    imgSrc = rawImg;
                }
            } else {
                // Relative path
                const localImgPath = path.join(erpDir, rawImg.replace('./', ''));
                if (fs.existsSync(localImgPath)) {
                    const ext = rawImg.endsWith('.png') ? 'png' : 'jpeg';
                    imgSrc = 'data:image/' + ext + ';base64,' + fs.readFileSync(localImgPath).toString('base64');
                } else {
                    imgSrc = rawImg;
                }
            }
        }

        if (!imgSrc) {
            imgSrc = 'https://via.placeholder.com/200?text=TuCompras';
        }

        let desc = p.description || '';
        if (desc.includes('[CATALOGO]')) {
            desc = desc.split('[CATALOGO]')[1] || desc.split('[CATALOGO]')[0];
        }
        const shortDesc = desc.replace(/\*\*/g, '').replace(/[\r\n]+/g, ' ').substring(0, 100);

        return `
        <div class="product-card">
            <div class="card-image-wrap">
                <img src="${imgSrc}" class="product-img" />
            </div>
            <div class="card-content">
                <div class="category">${(p.category || 'GENERAL').toUpperCase()}</div>
                <div class="product-title">${p.name}</div>
                ${p.ref ? `<div class="ref">REF: ${p.ref}</div>` : ''}
                ${shortDesc ? `<div class="short-desc">${shortDesc}...</div>` : ''}
                <div class="price-box">
                    <span class="price-label">PRECIO MAYORISTA</span>
                    <span class="price-value">$${price} COP</span>
                </div>
            </div>
        </div>
        `;
    }).join('');

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Catálogo Mayorista TuCompras Col & Vulcano</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
            
            @page {
                size: A4 portrait;
                margin: 10mm 8mm 12mm 8mm;
            }

            * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }

            body {
                font-family: 'Outfit', sans-serif;
                background: #ffffff;
                color: #0f172a;
                margin: 0;
                padding: 0;
            }

            .header-banner {
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                color: white;
                padding: 16px 20px;
                border-radius: 12px;
                margin-bottom: 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 15px;
            }

            .logo-box {
                height: 55px;
                display: flex;
                align-items: center;
            }

            .logo-box img {
                height: 100%;
                max-width: 140px;
                object-fit: contain;
                border-radius: 6px;
                background: white;
                padding: 3px;
            }

            .header-center {
                text-align: center;
                flex: 1;
            }

            .header-center h1 {
                margin: 0;
                font-size: 20px;
                font-weight: 900;
                letter-spacing: -0.5px;
                color: #ffffff;
            }

            .header-center h1 span {
                color: #ff8c00;
            }

            .header-center p {
                margin: 4px 0 0 0;
                color: #94a3b8;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.5px;
            }

            .header-contacts {
                text-align: right;
                font-size: 10.5px;
                color: #cbd5e1;
            }

            .header-contacts strong {
                color: #10b981;
                font-size: 12.5px;
                display: block;
                margin-top: 2px;
            }

            .catalog-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 10px;
            }

            .product-card {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                box-shadow: 0 2px 5px rgba(0,0,0,0.03);
            }

            .card-image-wrap {
                width: 100%;
                height: 135px;
                background: #ffffff;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                border-bottom: 1px solid #f1f5f9;
                padding: 6px;
            }

            .product-img {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
            }

            .card-content {
                padding: 8px 10px;
                display: flex;
                flex-direction: column;
                flex: 1;
                justify-content: space-between;
            }

            .category {
                font-size: 8.5px;
                font-weight: 800;
                color: #2563eb;
                letter-spacing: 0.5px;
                margin-bottom: 2px;
            }

            .product-title {
                font-size: 11.5px;
                font-weight: 800;
                color: #0f172a;
                line-height: 1.2;
                margin-bottom: 3px;
                height: 28px;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }

            .ref {
                font-size: 8.5px;
                color: #64748b;
                font-weight: 600;
                margin-bottom: 3px;
            }

            .short-desc {
                font-size: 9px;
                color: #475569;
                line-height: 1.2;
                margin-bottom: 6px;
                height: 22px;
                overflow: hidden;
            }

            .price-box {
                background: #f0fdf4;
                border: 1.5px solid #bbf7d0;
                border-radius: 6px;
                padding: 5px;
                text-align: center;
                margin-top: auto;
            }

            .price-label {
                display: block;
                font-size: 7.5px;
                font-weight: 800;
                color: #166534;
                letter-spacing: 0.5px;
            }

            .price-value {
                display: block;
                font-size: 13.5px;
                font-weight: 900;
                color: #15803d;
            }

            .footer-bar {
                margin-top: 15px;
                padding-top: 10px;
                border-top: 1px solid #cbd5e1;
                display: flex;
                justify-content: space-between;
                font-size: 9.5px;
                color: #64748b;
            }
        </style>
    </head>
    <body>

        <div class="header-banner">
            <div class="logo-box">
                ${b64TuCompras ? `<img src="${b64TuCompras}" alt="TuCompras Col" />` : ''}
            </div>
            <div class="header-center">
                <h1>CATÁLOGO MAYORISTA</h1>
                <p>HERRAMIENTAS & HOGAR | ${dateStr}</p>
            </div>
            <div class="logo-box">
                ${b64Vulcano ? `<img src="${b64Vulcano}" alt="Vulcano" />` : ''}
            </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 4px; font-size: 11px; color: #475569; font-weight: 600;">
            <div>Ventas al por Mayor - Envíos a todo el país</div>
            <div>WhatsApp Pedidos: <strong style="color: #10b981;">+57 311 397 9396</strong></div>
        </div>

        <div class="catalog-grid">
            ${productsCardsHtml}
        </div>

        <div class="footer-bar">
            <div>TuCompras Col & Vulcano - Distribuidora Líder en Herramientas en Colombia</div>
            <div>https://tucomprascol.com</div>
        </div>

    </body>
    </html>
    `;

    const htmlPath = path.join(erpDir, 'catalogo_mayorista.html');
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');

    console.log("Abriendo navegador headless para generar PDF...");
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto('file://' + htmlPath.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });

    const pdfPath = path.join(erpDir, 'catalogo_mayorista.pdf');
    const websitePdfPath = 'c:/Users/ANDRES/OneDrive/Desktop/PROYECTOS ANTIGRAVITY/ERP AC Website/catalogo_mayorista.pdf';

    await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '8mm', right: '6mm', bottom: '10mm', left: '6mm' }
    });

    fs.copyFileSync(pdfPath, websitePdfPath);

    console.log("PDF generado exitosamente:");
    console.log("  Ruta local ERP AC:", pdfPath);
    console.log("  Ruta Website:", websitePdfPath);
    console.log("  Tamaño (MB):", (fs.statSync(pdfPath).size / 1024 / 1024).toFixed(2));

    await browser.close();
}

generatePDF().catch(console.error);
