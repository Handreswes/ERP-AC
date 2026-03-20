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
                <div class="modal-content" style="max-width: 800px; background: #f8fafc;">
                    <div class="modal-header">
                        <h2 id="pdf-preview-title">Vista Previa de Documento</h2>
                        <span class="close-modal" onclick="this.closest('.modal').classList.remove('show')">&times;</span>
                    </div>
                    
                    <!-- Toolbar for Actions -->
                    <div style="display: flex; gap: 10px; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border); flex-wrap: wrap;">
                        <button id="pdf-btn-download" class="btn btn-primary" style="background: var(--accent); flex: 1; min-width: 150px;">
                            <i class="fas fa-file-pdf"></i> Descargar PDF
                        </button>
                        <button id="pdf-btn-whatsapp" class="btn btn-success" style="background: #25D366; border-color: #25D366; flex: 1; min-width: 150px;">
                            <i class="fab fa-whatsapp"></i> Generar link WhatsApp
                        </button>
                    </div>

                    <!-- The actual element to be converted to PDF -->
                    <div id="pdf-export-content" style="background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); color: #1e293b; font-family: 'Inter', sans-serif;">
                        <!-- Content injected dynamically -->
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }
    },

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            const tgt = e.target;
            
            // Download PDF
            const downloadBtn = tgt.closest('#pdf-btn-download');
            if (downloadBtn) {
                this.generatePDF();
                return;
            }

            // WhatsApp Share
            const waBtn = tgt.closest('#pdf-btn-whatsapp');
            if (waBtn) {
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
                return;
            }
        });
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
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px 0; font-size: 0.9rem;">${item.quantity}</td>
                <td style="padding: 12px 0; font-size: 0.9rem;">${item.name}</td>
                <td style="padding: 12px 0; text-align: right; font-size: 0.9rem;">$${(parseFloat(item.price) || 0).toLocaleString()}</td>
                <td style="padding: 12px 0; text-align: right; font-weight: 600; font-size: 0.9rem;">$${(parseFloat(item.price) * parseInt(item.quantity)).toLocaleString()}</td>
            </tr>
        `).join('');

        const html = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem;">
                <div>
                    <h1 style="margin: 0; font-size: 2rem; color: ${companyColor}; font-weight: 900; letter-spacing: -1px;">${companyName}</h1>
                    <p style="margin: 4px 0 0 0; color: #64748b; font-size: 0.85rem;">Documento Soporte Técnico / Inventario</p>
                </div>
                <div style="text-align: right;">
                    <h2 style="margin: 0; font-size: 1.5rem; color: #0f172a;">REMISIÓN</h2>
                    <p style="margin: 4px 0; font-size: 1rem; font-weight: bold; color: #475569;">N° ${saleNumber}</p>
                    <p style="margin: 0; font-size: 0.85rem; color: #64748b;">${dateStr}</p>
                </div>
            </div>

            <div style="background: #f8fafc; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem; border-left: 4px solid ${companyColor};">
                <h3 style="margin: 0 0 10px 0; font-size: 1rem; color: #0f172a;">Datos del Cliente</h3>
                <p style="margin: 2px 0; font-size: 0.95rem;"><strong>Nombre:</strong> ${sale.clientName || 'Cliente de Mostrador'}</p>
                ${sale.clientPhone ? `<p style="margin: 2px 0; font-size: 0.95rem;"><strong>Teléfono:</strong> ${sale.clientPhone}</p>` : ''}
                <p style="margin: 2px 0; font-size: 0.95rem;"><strong>Atendido por:</strong> ${sale.sellerName || 'Caja'}</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 2rem;">
                <thead>
                    <tr style="border-bottom: 2px solid #cbd5e1; text-align: left;">
                        <th style="padding: 0 0 10px 0; color: #475569; font-size: 0.85rem; text-transform: uppercase;">Cant</th>
                        <th style="padding: 0 0 10px 0; color: #475569; font-size: 0.85rem; text-transform: uppercase;">Descripción</th>
                        <th style="padding: 0 0 10px 0; text-align: right; color: #475569; font-size: 0.85rem; text-transform: uppercase;">V. Unitario</th>
                        <th style="padding: 0 0 10px 0; text-align: right; color: #475569; font-size: 0.85rem; text-transform: uppercase;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>

            <div style="display: flex; justify-content: flex-end;">
                <div style="width: 300px; background: #f1f5f9; padding: 1.5rem; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span style="color: #475569;">Subtotal:</span>
                        <span style="font-weight: 500;">$${sale.total.toLocaleString()}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 0.5rem; margin-top: 0.5rem;">
                        <strong style="font-size: 1.2rem; color: #0f172a;">Total Venta:</strong>
                        <strong style="font-size: 1.2rem; color: #0f172a;">$${sale.total.toLocaleString()}</strong>
                    </div>
                </div>
            </div>

            <div style="margin-top: 4rem; text-align: center; color: #94a3b8; font-size: 0.8rem; border-top: 1px dashed #cbd5e1; padding-top: 1rem;">
                <p style="margin: 0;">¡Gracias por su compra!</p>
                <p style="margin: 4px 0 0 0;">Esta remisión informativa no reemplaza ni sustituye una factura electrónica.</p>
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
                <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 10px 0; font-size: 0.85rem; color: #475569;">${new Date(mov.date).toLocaleDateString('es-CO')}</td>
                    <td style="padding: 10px 0; font-size: 0.85rem; max-width: 200px;">
                        <strong>${mov.type}</strong><br>
                        <span style="color: #64748b; font-size: 0.75rem;">${mov.description}</span>
                    </td>
                    <td style="padding: 10px 0; text-align: right; font-size: 0.85rem; color: ${mov.isCharge ? '#ef4444' : '#10b981'};">
                        ${mov.isCharge ? '+' : '-'}$${mov.amount.toLocaleString()}
                    </td>
                    <td style="padding: 10px 0; text-align: right; font-weight: 600; font-size: 0.85rem; color: ${runningBalance > 0 ? '#ef4444' : '#0f172a'};">
                        $${runningBalance.toLocaleString()}
                    </td>
                </tr>
                `;
            }).join('');
        }

        const html = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem;">
                <div>
                    <h1 style="margin: 0; font-size: 1.8rem; color: #0f172a; font-weight: 900; letter-spacing: -1px;">ESTADO DE CUENTA</h1>
                    <p style="margin: 4px 0 0 0; color: #64748b; font-size: 0.85rem;">Documento Informativo Comercial</p>
                </div>
                <div style="text-align: right;">
                    <p style="margin: 4px 0; font-size: 0.9rem; font-weight: bold; color: #475569;">Generado el:</p>
                    <p style="margin: 0; font-size: 0.85rem; color: #64748b;">${dateStr}</p>
                </div>
            </div>

            <div style="background: #f8fafc; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem; border-left: 4px solid #10b981; display: flex; justify-content: space-between;">
                <div>
                    <h3 style="margin: 0 0 10px 0; font-size: 0.9rem; color: #64748b; text-transform: uppercase;">Datos del Cliente</h3>
                    <p style="margin: 2px 0; font-size: 1.1rem;"><strong>${client.name}</strong></p>
                    ${client.address ? `<p style="margin: 2px 0; font-size: 0.85rem;"><strong>Dir:</strong> ${client.address}</p>` : ''}
                    <p style="margin: 2px 0; font-size: 0.85rem;"><strong>Tel:</strong> ${client.phone || 'N/A'}</p>
                </div>
                <div style="text-align: right;">
                    <h3 style="margin: 0 0 10px 0; font-size: 0.9rem; color: #64748b; text-transform: uppercase;">Periodo Reportado</h3>
                    <p style="margin: 2px 0; font-size: 1rem; font-weight: 600; color: #0f172a;">${dateRangeStr}</p>
                </div>
            </div>

            <!-- Summary Blocks -->
            <div style="display: flex; gap: 10px; margin-bottom: 2rem;">
                <div style="flex: 1; background: #f1f5f9; padding: 1rem; border-radius: 8px; text-align: center;">
                    <p style="margin: 0; font-size: 0.8rem; color: #64748b; text-transform: uppercase;">Saldo Anterior</p>
                    <p style="margin: 5px 0 0 0; font-size: 1.2rem; font-weight: bold; color: #0f172a;">$${saldoAnterior.toLocaleString()}</p>
                </div>
                <div style="flex: 1; background: ${saldoActual > 0 ? '#fef2f2' : '#ecfdf5'}; padding: 1rem; border-radius: 8px; text-align: center; border: 1px solid ${saldoActual > 0 ? '#fca5a5' : '#6ee7b7'};">
                    <p style="margin: 0; font-size: 0.8rem; color: ${saldoActual > 0 ? '#ef4444' : '#10b981'}; text-transform: uppercase;">Saldo Actual Total</p>
                    <p style="margin: 5px 0 0 0; font-size: 1.5rem; font-weight: bold; color: ${saldoActual > 0 ? '#ef4444' : '#10b981'};">$${saldoActual.toLocaleString()}</p>
                </div>
            </div>

            <h3 style="margin: 0 0 10px 0; font-size: 1.1rem; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px;">Detalle de Movimientos</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 2rem;">
                <thead>
                    <tr style="text-align: left; background: #f8fafc;">
                        <th style="padding: 10px; color: #475569; font-size: 0.8rem; text-transform: uppercase; border-bottom: 1px solid #cbd5e1;">Fecha</th>
                        <th style="padding: 10px; color: #475569; font-size: 0.8rem; text-transform: uppercase; border-bottom: 1px solid #cbd5e1;">Descripción</th>
                        <th style="padding: 10px; text-align: right; color: #475569; font-size: 0.8rem; text-transform: uppercase; border-bottom: 1px solid #cbd5e1;">Valor</th>
                        <th style="padding: 10px; text-align: right; color: #475569; font-size: 0.8rem; text-transform: uppercase; border-bottom: 1px solid #cbd5e1;">Saldo Acum.</th>
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
        const element = document.getElementById('pdf-export-content');
        if (!element) return;

        const opt = {
            margin:       10, // mm
            filename:     this.currentFilename || 'Documento_ERP.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, letterRendering: true, logging: false },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        const btn = document.getElementById('pdf-btn-download');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando PDF...';
        btn.disabled = true;

        html2pdf().set(opt).from(element).save().then(() => {
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
