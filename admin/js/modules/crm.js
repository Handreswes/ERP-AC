// CRM Module
window.CRM = {
    init() {
        this.renderPanel();
        this.setupEventListeners();
    },

    getClients() {
        return Storage.get(STORAGE_KEYS.CLIENTS);
    },

    async addClient(client) {
        return await Storage.addItem(STORAGE_KEYS.CLIENTS, {
            ...client,
            balanceMillenio: parseFloat(client.balanceMillenio) || 0,
            balanceVulcano: parseFloat(client.balanceVulcano) || 0,
            totalPurchases: 0
        });
    },

    renderPanel() {
        const contentArea = document.getElementById('content-area');

        if (!document.getElementById('crm-panel')) {
            const panel = document.createElement('div');
            panel.id = 'crm-panel';
            panel.className = 'panel';
            contentArea.appendChild(panel);
        }

        const panel = document.getElementById('crm-panel');
        panel.innerHTML = `
            <div class="panel-header">
                <h1>Clientes / CRM</h1>
            </div>

            <div class="actions-block" style="margin-bottom: 1.5rem; display: flex; gap: 1rem; background: var(--bg-card); padding: 1.5rem; border-radius: 14px; border: 1px solid var(--border); align-items: center;">
                <div style="flex: 1;">
                    <h3 style="margin: 0; color: var(--text-primary); font-size: 1.1rem;">Gestión de Clientes</h3>
                    <p style="margin: 4px 0 0 0; color: var(--text-secondary); font-size: 0.85rem;">Agrega nuevos clientes para llevar su control de cartera y facturación.</p>
                </div>
                <button type="button" class="btn btn-primary" style="padding: 0.75rem 1.5rem; font-weight: 600; background: #10b981; border-color: #10b981;" onclick="window.CRM.editingId = null; document.getElementById('client-form').reset(); document.getElementById('client-modal-title').textContent = 'Nuevo Cliente'; document.getElementById('client-modal').classList.add('show');">
                    <i class="fas fa-plus-circle" style="margin-right: 8px;"></i> Crear Nuevo Cliente
                </button>
            </div>
            <div style="position: relative; max-width: 500px; width: 100%; margin-bottom: 1.5rem;">
                <i class="fas fa-search" style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: var(--text-secondary); font-size: 1.2rem;"></i>
                <input type="text" id="crm-search" class="form-control" placeholder="Buscar clientes..." style="padding-left: 45px !important; border-radius: 15px; border: 2px solid var(--border); transition: all 0.3s;" onfocus="this.style.borderColor='var(--accent)'; this.style.boxShadow='0 0 0 4px rgba(37,99,235,0.1)';" onblur="this.style.borderColor='var(--border)'; this.style.boxShadow='none';">
            </div>

            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Cliente</th>
                            <th>Tipo</th>
                            <th>Celular</th>
                            <th>Deuda Millenio</th>
                            <th>Deuda Vulcano</th>
                            <th>Total Deuda</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="crm-list"></tbody>
                </table>
            </div>


            <div id="client-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="client-modal-title">Nuevo Cliente</h2>
                        <span class="close-modal" onclick="this.closest('.modal').classList.remove('show')">&times;</span>
                    </div>
                    <div class="modal-body">
                        <form id="client-form">
                            <div class="crm-responsive-grid">
                                <div class="form-group">
                                    <label>Nombre Completo</label>
                                    <input type="text" name="name" required>
                                </div>
                                <div class="form-group">
                                    <label>Celular</label>
                                    <input type="text" name="phone" required>
                                </div>
                                <div class="form-group">
                                    <label>Tipo de Cliente</label>
                                    <select name="type">
                                        <option value="wholesale">Mayorista</option>
                                        <option value="retail">Cliente Final</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Empresa/Negocio</label>
                                    <input type="text" name="businessName">
                                </div>
                                <div class="form-group">
                                    <label>Ciudad</label>
                                    <input type="text" name="city" class="form-control">
                                </div>
                                <div class="form-group">
                                    <label>Dirección</label>
                                    <input type="text" name="address" class="form-control">
                                </div>
                                <div class="form-group" style="grid-column: span 2; padding-top: 1rem; border-top: 1px solid var(--border); margin-top: 0.5rem;">
                                    <h4 style="margin: 0 0 0.5rem 0; color: var(--accent);">Deudas Anteriores (Opcional)</h4>
                                </div>
                                <div class="form-group">
                                    <label>Saldo Deuda Millenio</label>
                                    <input type="number" name="balanceMillenio" class="form-control" placeholder="0">
                                </div>
                                <div class="form-group">
                                    <label>Saldo Deuda Vulcano</label>
                                    <input type="number" name="balanceVulcano" class="form-control" placeholder="0">
                                </div>
                            </div>
                            <button type="button" id="save-client-manual-btn" class="btn btn-primary btn-block" style="margin-top: 1.5rem; padding: 1rem;">Guardar Cliente</button>
                        </form>
                    </div>
                </div>
            </div>
            <!-- Statement Modal -->
            <div id="statement-modal" class="modal">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h2>Generar Estado de Cuenta</h2>
                        <span class="close-modal" onclick="this.closest('.modal').classList.remove('show')">&times;</span>
                    </div>
                    <div class="modal-body" id="statement-modal-body">
                        <!-- Content injected via JS -->
                    </div>
                </div>
            </div>
        `;

        this.editingId = null;
        this.updateClientList();
    },

    updateClientList(filter = '') {
        const clients = this.getClients();
        const list = document.getElementById('crm-list');
        if (!list) return;

        const safeLower = (val) => (val || '').toString().toLowerCase();
        const term = filter.toLowerCase();
        
        const filtered = clients.filter(c =>
            safeLower(c.name).includes(term) ||
            safeLower(c.phone).includes(term) ||
            safeLower(c.businessName).includes(term)
        );

        list.innerHTML = filtered.map(c => `
            <tr>
                <td data-label="Cliente">
                    <div class="client-info">
                        <strong>${c.name}</strong>
                        <span>${c.businessName || 'Persona Natural'}</span>
                    </div>
                </td>
                <td data-label="Tipo"><span class="badge ${c.type === 'wholesale' ? 'bg-orange' : 'bg-blue'}">${c.type === 'wholesale' ? 'Mayorista' : 'Final'}</span></td>
                <td data-label="Celular">${c.phone}</td>
                <td data-label="Deuda Millenio" class="text-danger">$${(c.balanceMillenio || 0).toLocaleString()}</td>
                <td data-label="Deuda Vulcano" class="text-danger">$${(c.balanceVulcano || 0).toLocaleString()}</td>
                <td data-label="Total Deuda"><strong>$${((c.balanceMillenio || 0) + (c.balanceVulcano || 0)).toLocaleString()}</strong></td>
                <td class="table-actions">
                    <button class="icon-btn abono-btn" data-id="${c.id}" title="Registrar Abono" onclick="window.CRM.openPaymentModal(this.dataset.id);"><i class="fas fa-hand-holding-usd"></i></button>
                    <button class="icon-btn state-btn" data-id="${c.id}" title="Estado de Cuenta"><i class="fas fa-file-invoice-dollar"></i></button>
                    <button class="icon-btn edit-btn" data-id="${c.id}" title="Editar Cliente"><i class="fas fa-edit"></i></button>
                    <button class="icon-btn delete-btn" data-id="${c.id}" title="Eliminar Cliente" style="color: var(--danger);"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    },

    getCompanyBanks(company) {
        return Storage.get(STORAGE_KEYS.ACCOUNTS).filter(a => a.company === company);
    },

    openPaymentModal(clientId) {
        const client = this.getClients().find(c => c.id === clientId);
        if (!client) return;

        document.getElementById('payment-client-id').value = clientId;
        
        // Mostrar deudas actuales
        const mDebt = parseFloat(client.balanceMillenio) || 0;
        const vDebt = parseFloat(client.balanceVulcano) || 0;
        document.getElementById('payment-debt-millenio').textContent = `$${mDebt.toLocaleString('es-CO')}`;
        document.getElementById('payment-debt-vulcano').textContent = `$${vDebt.toLocaleString('es-CO')}`;

        // Resetear inputs a cero/vacíos
        document.getElementById('payment-amount-millenio').value = '';
        document.getElementById('payment-amount-vulcano').value = '';
        document.getElementById('payment-notes').value = '';
        document.getElementById('payment-method-select').value = 'cash';
        
        // Ocultar selectores de bancos
        document.getElementById('payment-bank-group-millenio').style.display = 'none';
        document.getElementById('payment-bank-group-vulcano').style.display = 'none';

        document.getElementById('payment-modal').classList.add('show');
    },

    updateBankSelectorVisibility() {
        const method = document.getElementById('payment-method-select').value;
        const amountRawM = document.getElementById('payment-amount-millenio').value;
        const amountRawV = document.getElementById('payment-amount-vulcano').value;

        const amountM = parseFloat(amountRawM.replace(/\./g, '').replace(/,/g, '')) || 0;
        const amountV = parseFloat(amountRawV.replace(/\./g, '').replace(/,/g, '')) || 0;

        const bankGroupM = document.getElementById('payment-bank-group-millenio');
        const bankGroupV = document.getElementById('payment-bank-group-vulcano');

        if (method === 'transfer') {
            // Bancos de Millenio
            if (amountM > 0) {
                const banks = this.getCompanyBanks('millenio');
                let html = '<label>Banco Destino Millenio</label><select id="payment-bank-select-millenio" class="form-control" required>';
                html += banks.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
                if (banks.length === 0) html += '<option value="" disabled selected>No hay cuentas de Millenio registradas</option>';
                html += '</select>';
                bankGroupM.innerHTML = html;
                bankGroupM.style.display = 'block';
            } else {
                bankGroupM.style.display = 'none';
            }

            // Bancos de Vulcano
            if (amountV > 0) {
                const banks = this.getCompanyBanks('vulcano');
                let html = '<label>Banco Destino Vulcano</label><select id="payment-bank-select-vulcano" class="form-control" required>';
                html += banks.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
                if (banks.length === 0) html += '<option value="" disabled selected>No hay cuentas de Vulcano registradas</option>';
                html += '</select>';
                bankGroupV.innerHTML = html;
                bankGroupV.style.display = 'block';
            } else {
                bankGroupV.style.display = 'none';
            }
        } else {
            bankGroupM.style.display = 'none';
            bankGroupV.style.display = 'none';
        }
    },

    setupEventListeners() {
        const payModal = document.getElementById('payment-modal');
        const payForm = document.getElementById('payment-form');
        const payMethodSelect = document.getElementById('payment-method-select');

        // Formateador de moneda en tiempo real para abonos split y actualización de bancos
        const setupAmountInput = (input) => {
            if (input) {
                input.oninput = (e) => {
                    let value = e.target.value.replace(/\D/g, "");
                    if (value) {
                        e.target.value = parseInt(value).toLocaleString('de-DE');
                    }
                    this.updateBankSelectorVisibility();
                };
            }
        };

        setupAmountInput(document.getElementById('payment-amount-millenio'));
        setupAmountInput(document.getElementById('payment-amount-vulcano'));

        if (payMethodSelect) {
            payMethodSelect.onchange = () => {
                this.updateBankSelectorVisibility();
            };
        }
        
        // Delegate inputs
        document.addEventListener('input', (e) => {
            if (e.target.id === 'crm-search') {
                this.updateClientList(e.target.value);
            }
        });

        // Delegate clicks for elements that don't have inline handlers
        document.addEventListener('click', async (e) => {
            const tgt = e.target;
            
            // Note: add-client-btn and close-modal now use inline onclick handlers
            // defined directly in the HTML template for reliability.
            
            // Manual Save: Client (if not using inline onclick, though we are)
            if (tgt.id === 'save-client-manual-btn') {
                this.handleSaveClient();
                return;
            }

            // Manual Save: Payment (if not using inline onclick)
            if (tgt.id === 'save-payment-manual-btn') {
                this.handleSavePayment();
                return;
            }

            // Safe check for closest to avoid errors on Document/Window clicks
            if (tgt && typeof tgt.closest === 'function') {
                const editBtn = tgt.closest('.edit-btn');
                if (editBtn) {
                    const id = editBtn.dataset.id;
                    const client = this.getClients().find(c => c.id === id);
                    if (client) {
                        this.editingId = id;
                        document.getElementById('client-modal-title').textContent = 'Editar Cliente';
                        const form = document.getElementById('client-form');
                        Object.keys(client).forEach(key => {
                            if (form.elements[key]) form.elements[key].value = client[key];
                        });
                        document.getElementById('client-modal').classList.add('show');
                    }
                    return;
                }

                const deleteBtn = tgt.closest('.delete-btn');
                if (deleteBtn) {
                    const id = deleteBtn.dataset.id;
                    if (confirm('¿Estás seguro de eliminar este cliente permanentemente? Serán eliminados sus registros locales.')) {
                        try {
                            await Storage.deleteItem(STORAGE_KEYS.CLIENTS, id);
                            alert('✅ Cliente eliminado correctamente.');
                            this.updateClientList();
                        } catch (e) {
                            alert('❌ Error eliminando cliente: ' + e.message);
                        }
                    }
                    return;
                }
                
                const stateBtn = tgt.closest('.state-btn');
                if (stateBtn) {
                    const id = stateBtn.dataset.id;
                    const client = this.getClients().find(c => c.id === id);
                    if (client) {
                        const mDebt = parseFloat(client.balanceMillenio) || 0;
                        const vDebt = parseFloat(client.balanceVulcano) || 0;
                        const total = mDebt + vDebt;
                        
                        document.getElementById('statement-modal-body').innerHTML = `
                            <div style="text-align: center; margin-bottom: 1.5rem;">
                                <h3 style="margin: 0; font-size: 1.3rem;">${client.name}</h3>
                                <p class="text-secondary" style="margin: 5px 0 0 0;">Saldo Actual: <strong style="color: ${total > 0 ? 'var(--danger)' : 'var(--success)'};">$${total.toLocaleString()}</strong></p>
                            </div>
                            
                            <div class="form-group" style="background: rgba(59,130,246,0.05); padding: 15px; border-radius: 8px; border: 1px solid rgba(59,130,246,0.2);">
                                <label style="font-weight: 600; color: var(--accent);">Rango de Periodo a Reportar</label>
                                <select id="statement-period" class="form-control" style="margin-top: 5px;">
                                    <option value="30">Últimos 30 días</option>
                                    <option value="60">Últimos 60 días</option>
                                    <option value="90">Últimos 90 días</option>
                                    <option value="365">Último año</option>
                                    <option value="all">Todo el Historial</option>
                                </select>
                            </div>

                            <button id="generate-statement-pdf-btn" data-client="${client.id}" class="btn btn-primary btn-block" style="padding: 1rem; margin-top: 1.5rem;">
                                <i class="fas fa-file-pdf"></i> Construir y Previsualizar PDF
                            </button>
                        `;
                        document.getElementById('statement-modal').classList.add('show');
                    }
                    return;
                }

                if (tgt.id === 'generate-statement-pdf-btn') {
                    const clientId = tgt.dataset.client;
                    const periodDays = document.getElementById('statement-period').value;
                    const btn = tgt;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESANDO...';
                    btn.disabled = true;
                    setTimeout(() => {
                        this.buildAccountStatement(clientId, periodDays);
                        btn.innerHTML = '<i class="fas fa-file-pdf"></i> Construir y Previsualizar PDF';
                        btn.disabled = false;
                    }, 500); // UI breathing room
                    return;
                }

                const abonoBtn = tgt.closest('.abono-btn');
                if (abonoBtn) {
                    this.openPaymentModal(abonoBtn.dataset.id);
                }
            }
        });
    },

    async handleSaveClient() {
        const form = document.getElementById('client-form');
        const btn = document.getElementById('save-client-manual-btn');
        if (!form || !btn) return;

        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESANDO...';
            window.ERP_LOG('Iniciando creación de cliente...');

            const formData = new FormData(form);
            const clientData = Object.fromEntries(formData.entries());

            if (this.editingId) {
                await Storage.updateItem(STORAGE_KEYS.CLIENTS, this.editingId, {
                    ...clientData,
                    balanceMillenio: parseFloat(clientData.balanceMillenio) || 0,
                    balanceVulcano: parseFloat(clientData.balanceVulcano) || 0
                });
                window.ERP_LOG('Cliente actualizado localmente', 'success');
                this.editingId = null;
            } else {
                await this.addClient(clientData);
                window.ERP_LOG('Cliente creado localmente', 'success');
            }

            form.reset();
            document.getElementById('client-modal').classList.remove('show');
            this.updateClientList();
            alert('✅ Cliente registrado con éxito.');
        } catch (err) {
            window.ERP_LOG('Error Cliente: ' + err.message, 'error');
            alert('❌ Error: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Guardar Cliente';
        }
    },

    async handleSavePayment() {
        const form = document.getElementById('payment-form');
        const btn = document.getElementById('save-payment-manual-btn');
        if (!form || !btn) return;

        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESANDO...';
            window.ERP_LOG('Iniciando registro de abono split...');

            const clientId = document.getElementById('payment-client-id').value;
            const method = document.getElementById('payment-method-select').value;
            const notes = document.getElementById('payment-notes').value;

            const amountRawM = document.getElementById('payment-amount-millenio').value;
            const amountRawV = document.getElementById('payment-amount-vulcano').value;

            const amountM = parseFloat(amountRawM.replace(/\./g, '').replace(/,/g, '')) || 0;
            const amountV = parseFloat(amountRawV.replace(/\./g, '').replace(/,/g, '')) || 0;

            if (amountM <= 0 && amountV <= 0) {
                throw new Error('Por favor ingrese un monto de abono para Millenio o Vulcano.');
            }

            const client = Storage.getById(STORAGE_KEYS.CLIENTS, clientId);
            if (!client) throw new Error('Cliente no encontrado');

            // 1. Validaciones antiduplicados
            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
            const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
            
            const todayPayments = (Storage.get(STORAGE_KEYS.PAYMENTS) || []).filter(p => {
                const dateVal = p.date || p.createdAt;
                if (!dateVal) return false;
                const d = new Date(dateVal);
                return d >= startOfDay && d <= endOfDay;
            });

            if (amountM > 0) {
                const isDupM = todayPayments.some(p => p.clientId === clientId && p.company === 'millenio' && Math.abs(parseFloat(p.amount) - amountM) < 0.01);
                if (isDupM) {
                    const ok = confirm(`⚠️ ALERTA DE POSIBLE DUPLICADO MILLENIO\n\nYa existe hoy un abono de Millenio para "${client.name}" por $${amountM.toLocaleString('es-CO')}.\n\n¿Quieres registrarlo de todas formas como un nuevo abono?`);
                    if (!ok) {
                        window.ERP_LOG('Abono Millenio cancelado por posible duplicado.');
                        return;
                    }
                }
            }

            if (amountV > 0) {
                const isDupV = todayPayments.some(p => p.clientId === clientId && p.company === 'vulcano' && Math.abs(parseFloat(p.amount) - amountV) < 0.01);
                if (isDupV) {
                    const ok = confirm(`⚠️ ALERTA DE POSIBLE DUPLICADO VULCANO\n\nYa existe hoy un abono de Vulcano para "${client.name}" por $${amountV.toLocaleString('es-CO')}.\n\n¿Quieres registrarlo de todas formas como un nuevo abono?`);
                    if (!ok) {
                        window.ERP_LOG('Abono Vulcano cancelado por posible duplicado.');
                        return;
                    }
                }
            }

            // 2. Aplicar deducción de saldos
            if (amountM > 0) client.balanceMillenio = (client.balanceMillenio || 0) - amountM;
            if (amountV > 0) client.balanceVulcano = (client.balanceVulcano || 0) - amountV;

            // 3. Guardar cliente actualizado
            await Storage.updateItem(STORAGE_KEYS.CLIENTS, clientId, client);

            // 4. Registrar abonos en tabla de payments
            if (amountM > 0) {
                const bankSelectM = document.getElementById('payment-bank-select-millenio');
                const accountIdM = method === 'transfer' ? (bankSelectM ? bankSelectM.value : null) : null;
                
                await Storage.addItem(STORAGE_KEYS.PAYMENTS, {
                    clientId,
                    clientName: client.name,
                    company: 'millenio',
                    amount: amountM,
                    method,
                    accountId: accountIdM,
                    notes: notes || 'Abono Millenio',
                    date: new Date().toISOString()
                });
            }

            if (amountV > 0) {
                const bankSelectV = document.getElementById('payment-bank-select-vulcano');
                const accountIdV = method === 'transfer' ? (bankSelectV ? bankSelectV.value : null) : null;
                
                await Storage.addItem(STORAGE_KEYS.PAYMENTS, {
                    clientId,
                    clientName: client.name,
                    company: 'vulcano',
                    amount: amountV,
                    method,
                    accountId: accountIdV,
                    notes: notes || 'Abono Vulcano',
                    date: new Date().toISOString()
                });
            }

            window.ERP_LOG('Abono(s) registrado(s) con éxito', 'success');
            form.reset();
            document.getElementById('payment-modal').classList.remove('show');
            
            // Actualizar vistas
            this.updateClientList();
            if (window.Finances && window.Finances.updateDebtUI) window.Finances.updateDebtUI();
            if (window.Finances && window.Finances.updateBalancesUI) window.Finances.updateBalancesUI();
            
            alert(`✅ Abono(s) registrado(s) con éxito.`);
        } catch (err) {
            window.ERP_LOG('Error Abono: ' + err.message, 'error');
            alert('❌ Error: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Registrar Pago / Abono';
        }
    },

    buildAccountStatement(clientId, periodDays) {
        const client = this.getClients().find(c => c.id === clientId);
        if (!client) return;

        // Current Final Balance (The absolute truth for the current state)
        const saldoActual = (parseFloat(client.balanceMillenio) || 0) + (parseFloat(client.balanceVulcano) || 0);

        // Date Range logic
        const now = new Date();
        let startDate = new Date(1970, 0, 1); // "all"
        let dateRangeStr = "Todo el histórico comercial";
        
        if (periodDays !== 'all') {
            startDate = new Date();
            startDate.setDate(now.getDate() - parseInt(periodDays));
            startDate.setHours(0,0,0,0);
            dateRangeStr = `Últimos ${periodDays} días (${startDate.toLocaleDateString('es-CO')} - ${now.toLocaleDateString('es-CO')})`;
        }

        // Get all Sales for this client
        const allSales = Storage.get(STORAGE_KEYS.SALES).filter(s => s.clientId === clientId && s.method === 'credit');
        
        // Get all Payments for this client
        const allPayments = Storage.get(STORAGE_KEYS.PAYMENTS).filter(p => p.clientId === clientId);

        // Filter and Build Movements
        let movimientos = [];
        let salesInRange = 0;
        let paymentsInRange = 0;

        // Process Sales (Charges)
        allSales.forEach(s => {
            const date = new Date(s.date);
            const amt = parseFloat(s.total) || 0;
            if (date >= startDate) {
                movimientos.push({
                    date: s.date,
                    type: `Compra (Remisión POS)`,
                    description: `${s.items ? s.items.map(i => `${i.qty || i.quantity || 1}x ${i.name}`).join(', ') : 'Sin productos'} | Facturado: ${s.company === 'vulcano' ? 'Vulcano' : 'Millenio'}`,
                    amount: amt,
                    isCharge: true
                });
                salesInRange += amt;
            }
        });

        // Process Payments (Credits)
        allPayments.forEach(p => {
            const date = new Date(p.date || p.createdAt || Date.now());
            const amt = parseFloat(p.amount) || 0;
            if (date >= startDate) {
                const methodStr = p.method === 'cash' ? 'Efectivo' : 'Banco';
                movimientos.push({
                    date: date.toISOString(),
                    type: 'Abono Recibido',
                    description: `Vía ${methodStr} - ${p.notes || 'Aplicado a cartera'}`,
                    amount: amt,
                    isCharge: false
                });
                paymentsInRange += amt;
            }
        });

        // Sort movements chronologically (oldest first)
        movimientos.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Calculate Saldo Anterior
        // Saldo Actual = Saldo Anterior + Cargos(Sales in range) - Abonos(Payments in range)
        // Por lo tanto: Saldo Anterior = Saldo Actual - Cargos + Abonos
        const saldoAnterior = saldoActual - salesInRange + paymentsInRange;

        if (window.PDFManager) {
            window.PDFManager.showStatement(client, saldoAnterior, saldoActual, movimientos, dateRangeStr);
        } else {
            alert("Error: PDFManager no está cargado. Actualice la página e intente nuevamente.");
        }
    }
};
