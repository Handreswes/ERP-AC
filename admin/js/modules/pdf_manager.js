// ========================================================
// PDF MANAGER MODULE - Handles Remissions and Account Statements
// Requires: html2pdf.js loaded globally
// ========================================================

window.PDFManager = {
    init() {
        console.log("[PDFManager] Inicializando...");
        this.injectModals();
        this.setupEventListeners();
        console.log("[PDFManager] Listo.");
    },

    injectModals() {
        // Inject the base HTML for the PDF Preview Modal if it doesn't exist
        if (!document.getElementById('pdf-preview-modal')) {
            const modalHtml = `
            <div id="pdf-preview-modal" class="modal">
                <div class="modal-content" style="max-width: 800px; max-height: 90vh; display: flex; flex-direction: column; background: #f8fafc; border: 1px solid #cbd5e1; box-shadow: var(--shadow-premium);">
                    <div class="modal-header" style="background: #f1f5f9; border-bottom: 1px solid #cbd5e1; color: #0f172a; padding: 1.25rem 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                        <h2 id="pdf-preview-title" style="color: #0f172a; margin: 0; font-size: 1.25rem; font-weight: 700;">Vista Previa de Documento</h2>
                        <span class="close-modal" style="color: #475569; cursor: pointer; font-size: 1.75rem; font-weight: bold;" onclick="this.closest('.modal').classList.remove('show')">&times;</span>
                    </div>
                    <div class="modal-body" style="padding: 1.5rem; overflow: hidden; flex: 1; display: flex; flex-direction: column; background: #f8fafc;">
                        <!-- Toolbar for Actions -->
                        <div style="display: flex; gap: 10px; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border); flex-wrap: wrap; flex-shrink: 0;">
                            <button id="pdf-btn-download" class="btn btn-primary" style="background: var(--accent); flex: 1; min-width: 150px;">
                                <i class="fas fa-file-pdf"></i> Descargar PDF
                            </button>
                            <button id="pdf-btn-whatsapp" class="btn btn-success" style="background: #25D366; border-color: #25D366; flex: 1; min-width: 150px;">
                                <i class="fab fa-whatsapp"></i> Generar link WhatsApp
                            </button>
                        </div>

                        <!-- The actual element to be converted to PDF (Scrollable) -->
                        <div style="flex: 1; overflow-y: auto; padding-right: 5px;">
                            <div id="pdf-export-content" style="background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); color: #1e293b; font-family: 'Inter', sans-serif;">
                                <!-- Content injected dynamically -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }
    },

    setupEventListeners() {
        const downloadBtn = document.getElementById('pdf-btn-download');
        if (downloadBtn) {
            downloadBtn.onclick = (e) => {
                e.preventDefault();
                this.generatePDF();
            };
        }

        const waBtn = document.getElementById('pdf-btn-whatsapp');
        if (waBtn) {
            waBtn.onclick = (e) => {
                e.preventDefault();
                const phone = this.currentWaPhone;
                const text = this.currentWaText;
                if (!phone || !text) {
                    alert("Por favor, ingrese el celular del cliente para enviar.");
                } else {
                    const cleanPhone = phone.replace(/[^0-9]/g, '');
                    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
                    window.open(url, '_blank');
                    // Add instructions
                    setTimeout(() => alert("El PDF debe enviarse manualmente descargándolo primero. El link de WhatsApp ya incluye el mensaje resumen."), 500);
                }
            };
        }
    },

    /**
     * Generates and shows a Remission (Sales Receipt)
     */
    showRemission(sale, saleNumber) {
        if (!sale) return;

        const dateStr = sale.date ? new Date(sale.date).toLocaleString('es-CO') : new Date().toLocaleString('es-CO');
        const companyColor = sale.company === 'vulcano' ? '#f59e0b' : '#3b82f6';
        const companyName = sale.company === 'vulcano' ? 'VULCANO' : 'MILLENIO';

        const itemsHtml = sale.items.map(item => `
            <tr style="border-bottom: 1px solid #e2e8f0; page-break-inside: avoid; break-inside: avoid;">
                <td style="padding: 8px 0; font-size: 0.88rem;">${item.quantity}</td>
                <td style="padding: 8px 0; font-size: 0.88rem;">${item.name}</td>
                <td style="padding: 8px 0; text-align: right; font-size: 0.88rem;">$${(parseFloat(item.price) || 0).toLocaleString()}</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 0.88rem;">$${(parseFloat(item.price) * parseInt(item.quantity)).toLocaleString()}</td>
            </tr>
        `).join('');

        const html = `
            <style>
                .no-break { page-break-inside: avoid !important; break-inside: avoid !important; }
                tr { page-break-inside: avoid !important; break-inside: avoid !important; }
            </style>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem;">
                <div>
                    <h1 style="margin: 0; font-size: 1.8rem; color: ${companyColor}; font-weight: 900; letter-spacing: -1px;">${companyName}</h1>
                    <p style="margin: 3px 0 0 0; color: #64748b; font-size: 0.82rem;">Documento Soporte Técnico / Inventario</p>
                </div>
                <div style="text-align: right;">
                    <h2 style="margin: 0; font-size: 1.35rem; color: #0f172a;">REMISIÓN</h2>
                    <p style="margin: 2px 0; font-size: 0.95rem; font-weight: bold; color: #475569;">N° ${saleNumber}</p>
                    <p style="margin: 0; font-size: 0.82rem; color: #64748b;">${dateStr}</p>
                </div>
            </div>

            <div class="no-break" style="background: #f8fafc; padding: 1rem 1.25rem; border-radius: 8px; margin-bottom: 1.25rem; border-left: 4px solid ${companyColor}; page-break-inside: avoid; break-inside: avoid;">
                <h3 style="margin: 0 0 6px 0; font-size: 0.9rem; color: #0f172a;">Datos del Cliente</h3>
                <p style="margin: 2px 0; font-size: 0.9rem;"><strong>Nombre:</strong> ${sale.clientName || 'Cliente de Mostrador'}</p>
                ${sale.clientPhone ? `<p style="margin: 2px 0; font-size: 0.9rem;"><strong>Teléfono:</strong> ${sale.clientPhone}</p>` : ''}
                <p style="margin: 2px 0; font-size: 0.9rem;"><strong>Atendido por:</strong> ${sale.sellerName || 'Caja'}</p>
            </div>

            ${sale.notes ? `
            <div class="no-break" style="background: #fffbeb; padding: 10px 1.25rem; border-radius: 8px; margin-bottom: 1.25rem; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; page-break-inside: avoid; break-inside: avoid;">
                <p style="margin: 0; font-size: 0.85rem; color: #78350f; text-align: left;"><strong>Observaciones:</strong> ${sale.notes}</p>
            </div>
            ` : ''}

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 1.25rem;">
                <thead>
                    <tr style="border-bottom: 2px solid #cbd5e1; text-align: left; page-break-inside: avoid; break-inside: avoid;">
                        <th style="padding: 0 0 8px 0; color: #475569; font-size: 0.8rem; text-transform: uppercase;">Cant</th>
                        <th style="padding: 0 0 8px 0; color: #475569; font-size: 0.8rem; text-transform: uppercase;">Descripción</th>
                        <th style="padding: 0 0 8px 0; text-align: right; color: #475569; font-size: 0.8rem; text-transform: uppercase;">V. Unitario</th>
                        <th style="padding: 0 0 8px 0; text-align: right; color: #475569; font-size: 0.8rem; text-transform: uppercase;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>

            <div class="no-break" style="display: flex; justify-content: flex-end; margin-top: 1rem; page-break-inside: avoid; break-inside: avoid;">
                <div style="width: 280px; background: #f1f5f9; padding: 1.25rem; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;">
                        <span style="color: #475569; font-size: 0.9rem;">Subtotal:</span>
                        <span style="font-weight: 500; font-size: 0.9rem;">$${sale.total.toLocaleString()}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 0.4rem; margin-top: 0.4rem;">
                        <strong style="font-size: 1.15rem; color: #0f172a;">Total Venta:</strong>
                        <strong style="font-size: 1.15rem; color: #0f172a;">$${sale.total.toLocaleString()}</strong>
                    </div>
                </div>
            </div>

            <div class="no-break" style="margin-top: 2rem; text-align: center; color: #94a3b8; font-size: 0.78rem; border-top: 1px dashed #cbd5e1; padding-top: 0.8rem; page-break-inside: avoid; break-inside: avoid;">
                <p style="margin: 0;">¡Gracias por su compra!</p>
                <p style="margin: 3px 0 0 0;">Esta remisión informativa no reemplaza ni sustituye una factura electrónica.</p>
            </div>
        `;

        document.getElementById('pdf-export-content').innerHTML = html;
        document.getElementById('pdf-preview-title').textContent = `Remisión N° ${saleNumber}`;
        
        this.currentFilename = `Remision_${saleNumber}_${sale.clientName.replace(/\s+/g, '_')}.pdf`;
        
        // Prepare WhatsApp Text
        this.currentWaPhone = sale.clientPhone || '';
        this.currentWaText = `Hola ${sale.clientName || ''}, adjunto enviamos el recibo (Remisión N° ${saleNumber}) por su reciente compra de $${sale.total.toLocaleString()}. ¡Gracias por su preferencia!`;

        document.getElementById('pdf-preview-modal').classList.add('show');
    },

    /**
     * Generates and shows an Account Statement (Estado de Cuenta)
     */
    showStatement(client, saldoAnterior, saldoActual, movimientos, dateRangeStr) {
        if (!client) return;

        const dateStr = new Date().toLocaleString('es-CO');
        
        let movsHtml = '';
        if (movimientos.length === 0) {
            movsHtml = `<tr><td colspan="4" style="text-align: center; padding: 15px; color: #64748b;">No hay movimientos en este periodo</td></tr>`;
        } else {
            // Calculate running balance to show on each row
            let runningBalance = saldoAnterior;
            movsHtml = movimientos.map(mov => {
                if (mov.isCharge) runningBalance += mov.amount;
                else runningBalance -= mov.amount;
                
                return `
                <tr style="border-bottom: 1px solid #e2e8f0; page-break-inside: avoid; break-inside: avoid;">
                    <td style="padding: 8px 0; font-size: 0.85rem; color: #475569;">${new Date(mov.date).toLocaleDateString('es-CO')}</td>
                    <td style="padding: 8px 0; font-size: 0.85rem; max-width: 200px;">
                        <strong>${mov.type}</strong><br>
                        <span style="color: #64748b; font-size: 0.75rem;">${mov.description}</span>
                    </td>
                    <td style="padding: 8px 0; text-align: right; font-size: 0.85rem; color: ${mov.isCharge ? '#ef4444' : '#10b981'};">
                        ${mov.isCharge ? '+' : '-'}$${mov.amount.toLocaleString()}
                    </td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 0.85rem; color: ${runningBalance > 0 ? '#ef4444' : '#0f172a'};">
                        $${runningBalance.toLocaleString()}
                    </td>
                </tr>
                `;
            }).join('');
        }

        const html = `
            <style>
                .no-break { page-break-inside: avoid !important; break-inside: avoid !important; }
                tr { page-break-inside: avoid !important; break-inside: avoid !important; }
            </style>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem;">
                <div>
                    <h1 style="margin: 0; font-size: 1.8rem; color: #0f172a; font-weight: 900; letter-spacing: -1px;">ESTADO DE CUENTA</h1>
                    <p style="margin: 3px 0 0 0; color: #64748b; font-size: 0.82rem;">Documento Informativo Comercial</p>
                </div>
                <div style="text-align: right;">
                    <p style="margin: 2px 0; font-size: 0.85rem; font-weight: bold; color: #475569;">Generado el:</p>
                    <p style="margin: 0; font-size: 0.82rem; color: #64748b;">${dateStr}</p>
                </div>
            </div>

            <div class="no-break" style="background: #f8fafc; padding: 1rem 1.25rem; border-radius: 8px; margin-bottom: 1.25rem; border-left: 4px solid #10b981; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; page-break-inside: avoid; break-inside: avoid;">
                <div>
                    <h3 style="margin: 0 0 6px 0; font-size: 0.85rem; color: #64748b; text-transform: uppercase;">Datos del Cliente</h3>
                    <p style="margin: 2px 0; font-size: 1.05rem;"><strong>${client.name}</strong></p>
                    ${client.address ? `<p style="margin: 2px 0; font-size: 0.85rem;"><strong>Dir:</strong> ${client.address}</p>` : ''}
                    <p style="margin: 2px 0; font-size: 0.85rem;"><strong>Tel:</strong> ${client.phone || 'N/A'}</p>
                </div>
                <div style="text-align: right;">
                    <h3 style="margin: 0 0 6px 0; font-size: 0.85rem; color: #64748b; text-transform: uppercase;">Periodo Reportado</h3>
                    <p style="margin: 2px 0; font-size: 0.95rem; font-weight: 600; color: #0f172a;">${dateRangeStr}</p>
                </div>
            </div>

            <!-- Summary Blocks -->
            <div class="no-break" style="display: flex; gap: 10px; margin-bottom: 1.25rem; page-break-inside: avoid; break-inside: avoid;">
                <div style="flex: 1; background: #f1f5f9; padding: 0.85rem; border-radius: 8px; text-align: center;">
                    <p style="margin: 0; font-size: 0.78rem; color: #64748b; text-transform: uppercase;">Saldo Anterior</p>
                    <p style="margin: 4px 0 0 0; font-size: 1.15rem; font-weight: bold; color: #0f172a;">$${saldoAnterior.toLocaleString()}</p>
                </div>
                <div style="flex: 1; background: ${saldoActual > 0 ? '#fef2f2' : '#ecfdf5'}; padding: 0.85rem; border-radius: 8px; text-align: center; border: 1px solid ${saldoActual > 0 ? '#fca5a5' : '#6ee7b7'};">
                    <p style="margin: 0; font-size: 0.78rem; color: ${saldoActual > 0 ? '#ef4444' : '#10b981'}; text-transform: uppercase;">Saldo Actual Total</p>
                    <p style="margin: 4px 0 0 0; font-size: 1.35rem; font-weight: bold; color: ${saldoActual > 0 ? '#ef4444' : '#10b981'};">$${saldoActual.toLocaleString()}</p>
                </div>
            </div>

            <h3 style="margin: 0 0 8px 0; font-size: 1rem; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px;">Detalle de Movimientos</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 1.25rem;">
                <thead>
                    <tr style="text-align: left; background: #f8fafc; page-break-inside: avoid; break-inside: avoid;">
                        <th style="padding: 8px; color: #475569; font-size: 0.78rem; text-transform: uppercase; border-bottom: 1px solid #cbd5e1;">Fecha</th>
                        <th style="padding: 8px; color: #475569; font-size: 0.78rem; text-transform: uppercase; border-bottom: 1px solid #cbd5e1;">Descripción</th>
                        <th style="padding: 8px; text-align: right; color: #475569; font-size: 0.78rem; text-transform: uppercase; border-bottom: 1px solid #cbd5e1;">Valor</th>
                        <th style="padding: 8px; text-align: right; color: #475569; font-size: 0.78rem; text-transform: uppercase; border-bottom: 1px solid #cbd5e1;">Saldo Acum.</th>
                    </tr>
                </thead>
                <tbody>
                    ${movsHtml}
                </tbody>
            </table>

            <div style="margin-top: 3rem; text-align: center; color: #94a3b8; font-size: 0.8rem; border-top: 1px dashed #cbd5e1; padding-top: 1rem;">
                <p style="margin: 0;">Si tiene dudas sobre su estado de cuenta, comuníquese con nuestro equipo de cartera.</p>
                <p style="margin: 4px 0 0 0;">Documento impreso desde ERP Multinegocio</p>
            </div>
        `;

        document.getElementById('pdf-export-content').innerHTML = html;
        document.getElementById('pdf-preview-title').textContent = `Estado de Cuenta - ${client.name}`;
        
        this.currentFilename = `Estado_Cuenta_${client.name.replace(/\s+/g, '_')}.pdf`;
        
        // Prepare WhatsApp Text
        this.currentWaPhone = client.phone || '';
        this.currentWaText = `Hola ${client.name}, te enviamos el resumen de tu Estado de Cuenta (${dateRangeStr}). Al momento, presenta un saldo total de $${saldoActual.toLocaleString()}. Quedamos atentos a cualquier inquietud.`;

        // Switch to the PDF Modal
        const stmtModal = document.getElementById('statement-modal');
        if (stmtModal) stmtModal.classList.remove('show');
        
        document.getElementById('pdf-preview-modal').classList.add('show');
    },

    /**
     * Triggers the html2pdf save process
     */
    generatePDF() {
        const originalElement = document.getElementById('pdf-export-content');
        if (!originalElement) return;

        const opt = {
            margin:       [8, 10, 8, 10],
            filename:     this.currentFilename || 'Documento_ERP.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            pagebreak:    { mode: ['css', 'legacy'], avoid: ['.no-break', 'tr'] },
            html2canvas:  { 
                scale: 2, 
                useCORS: true, 
                letterRendering: true, 
                logging: false,
                scrollY: 0,
                scrollX: 0,
                backgroundColor: '#ffffff',
                onclone: (clonedDoc) => {
                    // Force light theme and reset dark theme styles on cloned document elements
                    const docEl = clonedDoc.documentElement;
                    if (docEl) {
                        docEl.style.colorScheme = 'light';
                        docEl.style.background = 'white';
                        docEl.style.color = '#1e293b';
                    }
                    
                    const body = clonedDoc.body;
                    if (body) {
                        body.style.colorScheme = 'light';
                        body.style.background = 'white';
                        body.style.color = '#1e293b';
                        body.classList.remove('dark-theme');
                        body.className = ''; // Strip all body classes
                    }

                    const clonedElement = clonedDoc.getElementById('pdf-export-content');
                    if (clonedElement) {
                        clonedElement.style.background = 'white';
                        clonedElement.style.color = '#1e293b';
                        clonedElement.style.colorScheme = 'light';
                        
                        // Aseguramos que los textos hereden el color oscuro si no tienen color explícito
                        const allTexts = clonedElement.querySelectorAll('*');
                        allTexts.forEach(el => {
                            el.style.colorScheme = 'light';
                            const styleAttr = el.getAttribute('style') || '';
                            if (!styleAttr.includes('color:')) {
                                el.style.color = '#1e293b';
                            }
                        });
                    }
                }
            },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        const btn = document.getElementById('pdf-btn-download');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando PDF...';
        btn.disabled = true;

        html2pdf().set(opt).from(originalElement).save().then(() => {
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }, 1000);
        }).catch(err => {
            console.error("Error generating PDF:", err);
            alert("Hubo un error al generar el PDF.");
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
    }
};

// Auto-init logic if script loaded
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if(window.PDFManager) window.PDFManager.init();
        });
    } else {
        // DOM already loaded
        if(window.PDFManager) window.PDFManager.init();
    }
}
