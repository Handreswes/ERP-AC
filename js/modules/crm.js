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
            balanceMillenio: 0,
            balanceVulcano: 0,
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
                <button type="button" class="btn btn-primary" style="padding: 0.75rem 1.5rem; font-weight: 600; background: #10b981; border-color: #10b981;" onclick="document.getElementById('client-modal').classList.add('show')">
                    <i class="fas fa-plus-circle" style="margin-right: 8px;"></i> Crear Nuevo Cliente
                </button>
            </div>

            <div class="search-filter-row">
                <input type="text" id="crm-search" placeholder="Buscar por nombre, celular o empresa..." class="form-control">
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

            <!-- Client Modal -->
            <div id="client-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 id="client-modal-title">Nuevo Cliente</h2>
                        <span class="close-modal" onclick="this.closest('.modal').classList.remove('show')">&times;</span>
                    </div>
                    <div class="modal-body">
                        <form id="client-form">
                            <div class="form-grid">
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
                                    <input type="text" name="city">
                                </div>
                                <div class="form-group">
                                    <label>Dirección</label>
                                    <input type="text" name="address">
                                </div>
                            </div>
                            <button type="button" id="save-client-manual-btn" class="btn btn-primary btn-block" style="margin-top: 1.5rem; padding: 1rem;" onclick="CRM.handleSaveClient()">Guardar Cliente</button>
                        </form>
                    </div>
                </div>
            </div>
        `;

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
                    <button class="icon-btn abono-btn" data-id="${c.id}" title="Registrar Abono" onclick="document.getElementById('payment-client-id').value = this.dataset.id; document.getElementById('payment-modal').classList.add('show');"><i class="fas fa-hand-holding-usd"></i></button>
                    <button class="icon-btn state-btn" data-id="${c.id}" title="Estado de Cuenta"><i class="fas fa-file-invoice-dollar"></i></button>
                    <button class="icon-btn edit-btn" data-id="${c.id}"><i class="fas fa-edit"></i></button>
                </td>
            </tr>
        `).join('');
    },

    getCompanyBanks(company) {
        return Storage.get(STORAGE_KEYS.ACCOUNTS).filter(a => a.company === company);
    },

    setupEventListeners() {
        const payModal = document.getElementById('payment-modal');
        const payForm = document.getElementById('payment-form');
        const payMethodSelect = document.getElementById('payment-method-select');
        const payAmountInput = document.getElementById('payment-amount-input');

        if (payAmountInput) {
            payAmountInput.oninput = (e) => {
                let value = e.target.value.replace(/\D/g, "");
                if (value) {
                    e.target.value = parseInt(value).toLocaleString('de-DE');
                }
            };
        }

        if (payMethodSelect) {
            payMethodSelect.onchange = (e) => {
                const bankGroup = document.getElementById('payment-bank-group');
                const coSelect = document.querySelector('#payment-form select[name="company"]');
                const co = coSelect ? coSelect.value : 'millenio';

                if (bankGroup) {
                    if (e.target.value === 'transfer') {
                        const banks = this.getCompanyBanks(co);
                        let html = '<label>Banco / Cuenta Destino</label><select name="accountId" class="form-control" required>';
                        html += banks.map(b => `<option value="${b.id}">${b.name}</option>`).join('');
                        if (banks.length === 0) html += '<option value="" disabled selected>No hay cuentas registradas</option>';
                        html += '</select>';
                        bankGroup.innerHTML = html;
                        bankGroup.style.display = 'block';
                    } else {
                        bankGroup.style.display = 'none';
                    }
                }
            };

            // Link company change to bank update if method is transfer
            const coSelect = document.querySelector('#payment-form select[name="company"]');
            if (coSelect) {
                coSelect.onchange = () => {
                    if (payMethodSelect.value === 'transfer') payMethodSelect.onchange({ target: payMethodSelect });
                };
            }
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
                const abonoBtn = tgt.closest('.abono-btn');
                if (abonoBtn) {
                    const modal = document.getElementById('payment-modal');
                    if (modal) {
                        document.getElementById('payment-client-id').value = abonoBtn.dataset.id;
                        modal.classList.add('show');
                    }
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
            const client = Object.fromEntries(formData.entries());

            await this.addClient(client);
            window.ERP_LOG('Cliente creado localmente', 'success');

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
            window.ERP_LOG('Iniciando registro de abono...');

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            const amount = parseFloat(data.amount.replace(/\./g, '')) || 0;
            const clientId = data.clientId;

            const client = Storage.getById(STORAGE_KEYS.CLIENTS, clientId);
            if (!client) throw new Error('Cliente no encontrado');

            if (data.company === 'millenio') client.balanceMillenio = (client.balanceMillenio || 0) - amount;
            else client.balanceVulcano = (client.balanceVulcano || 0) - amount;

            await Storage.updateItem(STORAGE_KEYS.CLIENTS, clientId, client);
            await Storage.addItem(STORAGE_KEYS.PAYMENTS, { ...data, amount, clientName: client.name });

            window.ERP_LOG('Abono registrado localmente', 'success');
            form.reset();
            document.getElementById('payment-modal').classList.remove('show');
            this.updateClientList();
            alert(`✅ Abono de $${amount.toLocaleString()} registrado.`);
        } catch (err) {
            window.ERP_LOG('Error Abono: ' + err.message, 'error');
            alert('❌ Error: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Registrar Pago / Abono';
        }
    }
};
