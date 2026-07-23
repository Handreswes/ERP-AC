// CRM Module
window.CRM = {
    init() {
        this.renderPanel();
        this.setupEventListeners();

        // Listen to cloud updates for clients and refresh the UI list in real time
        if (this._handleCloudUpdate) {
            window.removeEventListener('erp_table_updated_clients', this._handleCloudUpdate);
        }
        this._handleCloudUpdate = () => {
            const searchInput = document.getElementById('crm-search');
            this.updateClientList(searchInput ? searchInput.value : '');
        };
        window.addEventListener('erp_table_updated_clients', this._handleCloudUpdate);
    },

    getClients() {
        return Storage.get(STORAGE_KEYS.CLIENTS);
    },

    async forceSync(btn) {
        if (!btn) btn = document.getElementById('crm-sync-btn');
        const icon = btn ? btn.querySelector('i') : null;
        if (icon) icon.classList.add('fa-spin');
        if (btn) btn.disabled = true;

        try {
            window.ERP_LOG('Iniciando sincronización manual de cartera...');
            await Storage.syncTable(STORAGE_KEYS.CLIENTS);
            window.ERP_LOG('Sincronización de clientes completada', 'success');
            const searchInput = document.getElementById('crm-search');
            this.updateClientList(searchInput ? searchInput.value : '');
            alert('✅ Sincronización con la nube completada con éxito.');
        } catch (e) {
            window.ERP_LOG('Error de sincronización: ' + e.message, 'error');
            alert('❌ Error al sincronizar: ' + e.message);
        } finally {
            if (icon) icon.classList.remove('fa-spin');
            if (btn) btn.disabled = false;
        }
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
                <div style="display: flex; gap: 0.5rem;">
                    <button type="button" id="crm-sync-btn" class="btn btn-outline" style="padding: 0.75rem 1.2rem; font-weight: 600; display: flex; align-items: center; gap: 8px; border: 1px solid var(--border); color: var(--text-primary); background: transparent; border-radius: 8px; cursor: pointer;" onclick="window.CRM.forceSync(this);">
                        <i class="fas fa-sync-alt"></i> Sincronizar Nube
                    </button>
                    <button type="button" class="btn btn-primary" style="padding: 0.75rem 1.5rem; font-weight: 600; background: #10b981; border-color: #10b981;" onclick="window.CRM.editingId = null; document.getElementById('client-form').reset(); document.getElementById('client-modal-title').textContent = 'Nuevo Cliente'; document.getElementById('client-modal').classList.add('show');">
                        <i class="fas fa-plus-circle" style="margin-right: 8px;"></i> Crear Nuevo Cliente
                    </button>
                </div>
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
                    <button class="icon-btn refund-btn" data-id="${c.id}" title="Registrar Devolución" onclick="window.CRM.openReturnModal(this.dataset.id);" style="color: #f87171;"><i class="fas fa-undo"></i></button>
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

    async openPaymentModal(clientId) {
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

        // Fetch fresh real-time balance from Supabase!
        const latest = await Storage.getLatestFields(STORAGE_KEYS.CLIENTS, clientId, ['balanceMillenio', 'balanceVulcano']);
        if (latest) {
            client.balanceMillenio = parseFloat(latest.balanceMillenio) || 0;
            client.balanceVulcano = parseFloat(latest.balanceVulcano) || 0;
            
            // Update UI with real-time balance
            document.getElementById('payment-debt-millenio').textContent = `$${client.balanceMillenio.toLocaleString('es-CO')}`;
            document.getElementById('payment-debt-vulcano').textContent = `$${client.balanceVulcano.toLocaleString('es-CO')}`;
            
            // Also update local cache for consistency
            const idx = this.getClients().findIndex(c => c.id === clientId);
            if (idx !== -1) {
                this.getClients()[idx].balanceMillenio = client.balanceMillenio;
                this.getClients()[idx].balanceVulcano = client.balanceVulcano;
                Storage.save(STORAGE_KEYS.CLIENTS, this.getClients());
                this.updateClientList();
            }
        }
        
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

            // Manual Save: Return
            if (tgt.id === 'save-return-btn') {
                this.handleSaveReturn();
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
                        const showModal = (c) => {
                            const mDebt = parseFloat(c.balanceMillenio) || 0;
                            const vDebt = parseFloat(c.balanceVulcano) || 0;
                            const total = mDebt + vDebt;
                            
                            document.getElementById('statement-modal-body').innerHTML = `
                                <div style="text-align: center; margin-bottom: 1.5rem;">
                                    <h3 style="margin: 0; font-size: 1.3rem;">${c.name}</h3>
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

                                <button id="generate-statement-pdf-btn" data-client="${c.id}" class="btn btn-primary btn-block" style="padding: 1rem; margin-top: 1.5rem;">
                                    <i class="fas fa-file-pdf"></i> Construir y Previsualizar PDF
                                </button>
                            `;
                            document.getElementById('statement-modal').classList.add('show');
                        };

                        showModal(client);

                        // Fetch fresh real-time balance from Supabase!
                        Storage.getLatestFields(STORAGE_KEYS.CLIENTS, id, ['balanceMillenio', 'balanceVulcano']).then(latest => {
                            if (latest) {
                                client.balanceMillenio = parseFloat(latest.balanceMillenio) || 0;
                                client.balanceVulcano = parseFloat(latest.balanceVulcano) || 0;
                                
                                // Update local cache for consistency
                                const idx = this.getClients().findIndex(c => c.id === id);
                                if (idx !== -1) {
                                    this.getClients()[idx].balanceMillenio = client.balanceMillenio;
                                    this.getClients()[idx].balanceVulcano = client.balanceVulcano;
                                    Storage.save(STORAGE_KEYS.CLIENTS, this.getClients());
                                    this.updateClientList();
                                }
                                showModal(client);
                            }
                        });
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
                    return;
                }

                const refundBtn = tgt.closest('.refund-btn');
                if (refundBtn) {
                    this.openReturnModal(refundBtn.dataset.id);
                    return;
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
            const latest = await Storage.getLatestFields(STORAGE_KEYS.CLIENTS, clientId, ['balanceMillenio', 'balanceVulcano']);
            const currentBalM = latest ? parseFloat(latest.balanceMillenio || 0) : (parseFloat(client.balanceMillenio) || 0);
            const currentBalV = latest ? parseFloat(latest.balanceVulcano || 0) : (parseFloat(client.balanceVulcano) || 0);

            const newBalM = currentBalM - amountM;
            const newBalV = currentBalV - amountV;

            // 3. Guardar cliente actualizado
            await Storage.updateItem(STORAGE_KEYS.CLIENTS, clientId, {\n                balanceMillenio: newBalM,\n                balanceVulcano: newBalV\n            });\n            client.balanceMillenio = newBalM;\n            client.balanceVulcano = newBalV;\n\n            // 4. Registrar abonos en tabla de payments\n            if (amountM > 0) {\n                const bankSelectM = document.getElementById('payment-bank-select-millenio');\n                const accountIdM = method === 'transfer' ? (bankSelectM ? bankSelectM.value : null) : null;\n                \n                await Storage.addItem(STORAGE_KEYS.PAYMENTS, {\n                    clientId,\n                    clientName: client.name,\n                    company: 'millenio',\n                    amount: amountM,\n                    method,\n                    accountId: accountIdM,\n                    notes: notes || 'Abono Millenio',\n                    date: new Date().toISOString()\n                });\n            }\n\n            if (amountV > 0) {\n                const bankSelectV = document.getElementById('payment-bank-select-vulcano');\n                const accountIdV = method === 'transfer' ? (bankSelectV ? bankSelectV.value : null) : null;\n                \n                await Storage.addItem(STORAGE_KEYS.PAYMENTS, {\n                    clientId,\n                    clientName: client.name,\n                    company: 'vulcano',\n                    amount: amountV,\n                    method,\n                    accountId: accountIdV,\n                    notes: notes || 'Abono Vulcano',\n                    date: new Date().toISOString()\n                });\n            }\n\n            window.ERP_LOG('Abono(s) registrado(s) con éxito', 'success');\n            form.reset();\n            document.getElementById('payment-modal').classList.remove('show');\n            \n            // Actualizar vistas\n            this.updateClientList();\n            if (window.Finances && window.Finances.updateDebtUI) window.Finances.updateDebtUI();\n            if (window.Finances && window.Finances.updateBalancesUI) window.Finances.updateBalancesUI();\n            \n            alert(`✅ Abono(s) registrado(s) con éxito.`);\n        } catch (err) {\n            window.ERP_LOG('Error Abono: ' + err.message, 'error');\n            alert('❌ Error: ' + err.message);\n        } finally {\n            btn.disabled = false;\n            btn.innerHTML = 'Registrar Pago / Abono';\n        }\n    },\n\n    buildAccountStatement(clientId, periodDays) {\n        const client = this.getClients().find(c => c.id === clientId);\n        if (!client) return;\n\n        // Current Final Balance (The absolute truth for the current state)\n        const saldoActual = (parseFloat(client.balanceMillenio) || 0) + (parseFloat(client.balanceVulcano) || 0);\n\n        // Date Range logic\n        const now = new Date();\n        let startDate = new Date(1970, 0, 1); // \"all\"\n        let dateRangeStr = \"Todo el histórico comercial\";\n        \n        if (periodDays !== 'all') {\n            startDate = new Date();\n            startDate.setDate(now.getDate() - parseInt(periodDays));\n            startDate.setHours(0,0,0,0);\n            dateRangeStr = `Últimos ${periodDays} días (${startDate.toLocaleDateString('es-CO')} - ${now.toLocaleDateString('es-CO')})`;\n        }\n\n        // Fetch Sales & Payments\n        const allSales = (Storage.get(STORAGE_KEYS.SALES) || []).filter(s => s.clientId === clientId);\n        const allPayments = (Storage.get(STORAGE_KEYS.PAYMENTS) || []).filter(p => p.clientId === clientId);\n\n        let movimientos = [];\n        let salesInRange = 0;\n        let paymentsInRange = 0;\n\n        // Process Sales (Charges)\n        allSales.forEach(s => {\n            const date = new Date(s.date);\n            const amt = parseFloat(s.total) || 0;\n            if (date >= startDate) {\n                movimientos.push({\n                    date: s.date,\n                    type: `Compra (Remisión POS)`,\n                    description: `${s.items ? s.items.map(i => `${i.qty || i.quantity || 1}x ${i.name}`).join(', ') : 'Sin productos'} | Facturado: ${s.company === 'vulcano' ? 'Vulcano' : 'Millenio'}`,\n                    amount: amt,\n                    isCharge: true\n                });\n                salesInRange += amt;\n            }\n        });\n\n        // Process Payments (Credits)\n        allPayments.forEach(p => {\n            const date = new Date(p.date || p.createdAt || Date.now());\n            const amt = parseFloat(p.amount) || 0;\n            if (date >= startDate) {\n                const methodStr = p.method === 'cash' ? 'Efectivo' : 'Banco';\n                movimientos.push({\n                    date: date.toISOString(),\n                    type: 'Abono Recibido',\n                    description: `Vía ${methodStr} - ${p.notes || 'Aplicado a cartera'}`,\n                    amount: amt,\n                    isCharge: false\n                });\n                paymentsInRange += amt;\n            }\n        });\n\n        // Sort movements chronologically (oldest first)\n        movimientos.sort((a, b) => new Date(a.date) - new Date(b.date));\n\n        // Calculate Saldo Anterior\n        // Saldo Actual = Saldo Anterior + Cargos(Sales in range) - Abonos(Payments in range)\n        // Por lo tanto: Saldo Anterior = Saldo Actual - Cargos + Abonos\n        const saldoAnterior = saldoActual - salesInRange + paymentsInRange;\n\n        if (window.PDFManager) {\n            window.PDFManager.showStatement(client, saldoAnterior, saldoActual, movimientos, dateRangeStr);\n        } else {\n            alert(\"Error: PDFManager no está cargado. Actualice la página e intente nuevamente.\");\n        }\n    },\n\n    openReturnModal(clientId) {\n        const client = this.getClients().find(c => c.id === clientId);\n        if (!client) return;\n\n        document.getElementById('return-client-id').value = clientId;\n\n        // Mostrar deudas actuales\n        const mDebt = parseFloat(client.balanceMillenio) || 0;\n        const vDebt = parseFloat(client.balanceVulcano) || 0;\n        document.getElementById('return-debt-millenio').textContent = `$${mDebt.toLocaleString('es-CO')}`;\n        document.getElementById('return-debt-vulcano').textContent = `$${vDebt.toLocaleString('es-CO')}`;\n\n        // Resetear inputs\n        document.getElementById('return-quantity').value = '1';\n        document.getElementById('return-unit-value').value = '';\n        document.getElementById('return-notes').value = '';\n        document.getElementById('return-company-select').value = 'millenio';\n\n        // Cargar productos\n        const productSelect = document.getElementById('return-product-select');\n        const unitValueInput = document.getElementById('return-unit-value');\n        const companySelect = document.getElementById('return-company-select');\n\n        const products = (window.Inventory && window.Inventory.getProducts ? window.Inventory.getProducts() : [])\n            .filter(p => p.active !== false)\n            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));\n\n        productSelect.innerHTML = '<option value=\"\">Seleccione un producto...</option>' +\n            products.map(p => `<option value=\"${p.id}\">${p.name} (${p.ref || 'Sin Ref'})</option>`).join('');\n\n        // Listener cambio producto\n        productSelect.onchange = () => {\n            const prod = products.find(p => p.id === productSelect.value);\n            if (prod) {\n                const defaultPrice = client.type === 'wholesale' ? (prod.priceWholesale || 0) : (prod.priceFinal || prod.priceInternet || 0);\n                unitValueInput.value = parseInt(defaultPrice).toLocaleString('de-DE');\n                if (prod.company && prod.company !== 'both') {\n                    companySelect.value = prod.company;\n                }\n            } else {\n                unitValueInput.value = '';\n            }\n        };\n\n        // Formateador moneda unitario\n        unitValueInput.oninput = (e) => {\n            let val = e.target.value.replace(/\\D/g, \"\");\n            if (val) {\n                e.target.value = parseInt(val).toLocaleString('de-DE');\n            }\n        };\n\n        document.getElementById('return-modal').classList.add('show');\n    },\n\n    async handleSaveReturn() {\n        const btn = document.getElementById('save-return-btn');\n        if (!btn) return;\n\n        try {\n            btn.disabled = true;\n            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESANDO...';\n            window.ERP_LOG('Iniciando registro de devolución...');\n\n            const clientId = document.getElementById('return-client-id').value;\n            const productId = document.getElementById('return-product-select').value;\n            const quantity = parseInt(document.getElementById('return-quantity').value) || 0;\n            const company = document.getElementById('return-company-select').value;\n            const unitValueRaw = document.getElementById('return-unit-value').value;\n            const unitValue = parseFloat(unitValueRaw.replace(/\\./g, '').replace(/,/g, '')) || 0;\n            const notes = document.getElementById('return-notes').value;\n\n            if (!clientId) throw new Error('Cliente inválido');\n            if (!productId) throw new Error('Debe seleccionar un producto');\n            if (quantity <= 0) throw new Error('La cantidad debe ser mayor a 0');\n            if (unitValue < 0) throw new Error('El valor unitario no puede ser negativo');\n\n            const client = Storage.getById(STORAGE_KEYS.CLIENTS, clientId);\n            if (!client) throw new Error('Cliente no encontrado');\n\n            const product = Storage.getById(STORAGE_KEYS.PRODUCTS, productId);\n            if (!product) throw new Error('Producto no encontrado');\n\n            const totalRefund = quantity * unitValue;\n\n            // 1. Aplicar descuento de deuda\n            const latest = await Storage.getLatestFields(STORAGE_KEYS.CLIENTS, clientId, ['balanceMillenio', 'balanceVulcano']);\n            const currentBalM = latest ? parseFloat(latest.balanceMillenio || 0) : (parseFloat(client.balanceMillenio) || 0);\n            const currentBalV = latest ? parseFloat(latest.balanceVulcano || 0) : (parseFloat(client.balanceVulcano) || 0);\n\n            let newBalM = currentBalM;\n            let newBalV = currentBalV;\n            if (company === 'millenio') {\n                newBalM = currentBalM - totalRefund;\n            } else {\n                newBalV = currentBalV - totalRefund;\n            }\n\n            // 2. Incrementar stock del producto\n            if (company === 'millenio') {\n                product.stockMillenio = (parseInt(product.stockMillenio) || 0) + quantity;\n            } else {\n                product.stockVulcano = (parseInt(product.stockVulcano) || 0) + quantity;\n            }\n\n            // 3. Guardar en Base de Datos (Cloud + Cache)\n            await Storage.updateItem(STORAGE_KEYS.CLIENTS, clientId, {\n                balanceMillenio: newBalM,\n                balanceVulcano: newBalV\n            });\n            client.balanceMillenio = newBalM;\n            client.balanceVulcano = newBalV;\n            await Storage.updateItem(STORAGE_KEYS.PRODUCTS, productId, product);\n\n            // 4. Crear registro en payments (Abonos)\n            await Storage.addItem(STORAGE_KEYS.PAYMENTS, {\n                clientId,\n                clientName: client.name,\n                company: company,\n                amount: totalRefund,\n                method: 'devolucion',\n                accountId: null,\n                paymentDetails: JSON.stringify({ productId: product.id, quantity: quantity }),\n                notes: notes ? `Devolución: ${quantity}x ${product.name}. Motivo: ${notes}` : `Devolución: ${quantity}x ${product.name}`,\n                date: new Date().toISOString()\n            });\n\n            // 5. Crear registro de entrada de stock\n            await Storage.addItem(STORAGE_KEYS.STOCK_ENTRIES, {\n                date: new Date().toISOString(),\n                productId: product.id,\n                productName: product.name,\n                quantity: quantity,\n                company: company,\n                source: 'Devolución Cliente',\n                notes: `Cruce saldo cliente: ${client.name}. ${notes || ''}`\n            });\n\n            window.ERP_LOG('Devolución registrada con éxito', 'success');\n            document.getElementById('return-form').reset();\n            document.getElementById('return-modal').classList.remove('show');\n\n            // Actualizar vistas\n            this.updateClientList();\n            if (window.Inventory && window.Inventory.updateInventoryList) window.Inventory.updateInventoryList();\n            if (window.Finances && window.Finances.updateDebtUI) window.Finances.updateDebtUI();\n            if (window.Finances && window.Finances.updateBalancesUI) window.Finances.updateBalancesUI();\n\n            alert('✅ Devolución registrada con éxito.');\n        } catch (err) {\n            window.ERP_LOG('Error Devolución: ' + err.message, 'error');\n            alert('❌ Error: ' + err.message);\n        } finally {\n            btn.disabled = false;\n            btn.innerHTML = 'Registrar Devolución';\n        }\n    }\n};