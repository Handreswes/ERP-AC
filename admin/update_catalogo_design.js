const fs = require('fs');
const path = require('path');

const erpDir = 'c:/Users/ANDRES/OneDrive/Desktop/PROYECTOS ANTIGRAVITY/ERP AC';
const websiteDir = 'c:/Users/ANDRES/OneDrive/Desktop/PROYECTOS ANTIGRAVITY/ERP AC Website';

const tucomprasLogoPath = path.join(erpDir, 'logo_tucompras.png.jpg');
const vulcanoLogoPath = path.join(erpDir, 'logo Vulcano.jpeg');

const b64TuCompras = 'data:image/jpeg;base64,' + fs.readFileSync(tucomprasLogoPath).toString('base64');
const b64Vulcano = 'data:image/jpeg;base64,' + fs.readFileSync(vulcanoLogoPath).toString('base64');

console.log('TuCompras base64 length:', b64TuCompras.length);
console.log('Vulcano base64 length:', b64Vulcano.length);

function updateFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let html = fs.readFileSync(filePath, 'utf8');

    // 1. Replace print-cover HTML
    const oldCoverRegex = /<div class="print-cover">[\s\S]*?<\/div>\s*<\/div>/i;
    
    const newCoverHtml = `
    <!-- Cover Page Layout (Print only) -->
    <div class="print-cover">
        <div class="cover-border">
            <div class="cover-header-logos">
                <div class="cover-logo-item">
                    <img src="${b64TuCompras}" alt="TuCompras Col" class="cover-logo-img">
                </div>
                <div class="cover-logo-item">
                    <img src="${b64Vulcano}" alt="Vulcano" class="cover-logo-img">
                </div>
            </div>
            <div class="cover-header-text">
                <span class="cover-company-slogan">DISTRIBUIDORA LÍDER EN HERRAMIENTAS Y HOGAR EN COLOMBIA</span>
            </div>
            <div class="cover-body">
                <span class="cover-catalog-label">EDICIÓN OFICIAL 2026</span>
                <h1 class="cover-title" id="cover-catalog-title">CATÁLOGO GENERAL</h1>
                <p class="cover-description">
                    Presentamos nuestra selección exclusiva de herramientas profesionales y artículos seleccionados de la más alta calidad, con precios competitivos y garantía respaldada por motor y defectos de fábrica.
                </p>
                <div class="cover-highlights">
                    <div class="highlight-badge"><i class="fas fa-shield-alt"></i> Garantía Directa de Fábrica</div>
                    <div class="highlight-badge"><i class="fas fa-truck-fast"></i> Envíos Nacionales a Todo el País</div>
                    <div class="highlight-badge"><i class="fas fa-boxes-stacked"></i> Stock Inmediato Millenio & Vulcano</div>
                </div>
            </div>
            <div class="cover-footer">
                <div class="footer-meta-item">
                    <i class="fas fa-calendar-alt"></i>
                    <span><strong>FECHA DE EMISIÓN:</strong> <span id="cover-date">-</span></span>
                </div>
                <div class="footer-meta-item" id="cover-shipping-item">
                    <i class="fas fa-truck-fast"></i>
                    <span><strong>COBERTURA:</strong> <span id="cover-shipping-text">ENVÍOS NACIONALES</span></span>
                </div>
                <div class="footer-meta-item">
                    <i class="fab fa-whatsapp"></i>
                    <span><strong>VENTAS & ASESORÍA:</strong> +57 311 397 9396 / +57 316 786 2554</span>
                </div>
                <div class="footer-meta-item">
                    <i class="fas fa-globe"></i>
                    <span><strong>SITIO WEB:</strong> www.tucomprascol.com</span>
                </div>
            </div>
        </div>
    </div>`;

    html = html.replace(oldCoverRegex, newCoverHtml.trim());

    // 2. Add corporate print CSS styles
    const printCssStyle = `
            /* Printed Cover Page Corporate Layout */
            .print-cover {
                display: flex !important;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 94vh;
                box-sizing: border-box;
                padding: 12mm;
                page-break-after: always !important;
                break-after: page !important;
                background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%) !important;
                color: #0f172a !important;
                position: relative;
                border: 6px double #0f172a;
            }

            .cover-border {
                border: 2px solid #2563eb;
                border-radius: 16px;
                padding: 12mm;
                width: 100%;
                height: 100%;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                align-items: center;
                background: #ffffff;
                box-shadow: inset 0 0 20px rgba(37, 99, 235, 0.05);
            }

            .cover-header-logos {
                display: flex;
                justify-content: space-between;
                align-items: center;
                width: 100%;
                padding-bottom: 15px;
                border-bottom: 2px solid #e2e8f0;
                gap: 20px;
            }

            .cover-logo-img {
                height: 65px;
                max-width: 180px;
                object-fit: contain;
            }

            .cover-header-text {
                margin-top: 10px;
                text-align: center;
            }

            .cover-company-slogan {
                font-size: 0.75rem;
                letter-spacing: 3px;
                color: #2563eb !important;
                font-weight: 800;
                text-transform: uppercase;
            }

            .cover-body {
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                max-width: 88%;
                margin: 20px 0;
            }

            .cover-catalog-label {
                font-size: 0.85rem;
                letter-spacing: 5px;
                background: #0f172a !important;
                color: #ffffff !important;
                font-weight: 800;
                text-transform: uppercase;
                padding: 6px 18px;
                border-radius: 50px;
                margin-bottom: 20px;
                display: inline-block;
            }

            .cover-title {
                font-size: 3rem !important;
                font-weight: 900;
                color: #0f172a !important;
                margin: 0 0 15px 0 !important;
                letter-spacing: -0.5px;
                line-height: 1.1;
                text-transform: uppercase;
            }

            .cover-description {
                font-size: 0.95rem;
                color: #475569 !important;
                line-height: 1.6;
                margin: 0 0 25px 0;
            }

            .cover-highlights {
                display: flex;
                gap: 12px;
                justify-content: center;
                flex-wrap: wrap;
            }

            .highlight-badge {
                background: #f1f5f9;
                border: 1px solid #cbd5e1;
                color: #0f172a;
                font-weight: 700;
                font-size: 0.78rem;
                padding: 6px 12px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .highlight-badge i {
                color: #ff8c00;
            }

            .cover-footer {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
                width: 100%;
                border-top: 2px solid #e2e8f0;
                padding-top: 15px;
                margin-top: 15px;
            }

            .footer-meta-item {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 0.78rem;
                color: #475569 !important;
            }

            .footer-meta-item i {
                color: #2563eb !important;
                font-size: 0.9rem;
            }

            .footer-meta-item strong {
                color: #0f172a !important;
            }
`;

    // Replace old print-cover styles in CSS block
    const oldCssRegex = /\/\*\s*Printed Cover Page Layout\s*\*\/[\s\S]*?\.footer-meta-item strong \{\s*color: #0f172a !important;\s*\}/i;
    html = html.replace(oldCssRegex, printCssStyle.trim());

    fs.writeFileSync(filePath, html, 'utf8');
    console.log("Updated design in:", filePath);
}

updateFile(path.join(websiteDir, 'catalogo.html'));
updateFile(path.join(erpDir, 'catalogo.html'));
