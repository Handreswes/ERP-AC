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
                <div class="actions">
                    <button id="add-client-btn" class="btn btn-primary">Nuevo Cliente</button>
                </div>
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
                        <span class="close-modal">&times;</span>
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
                            <button type="button" id="save-client-manual-btn" class="btn btn-primary btn-block" style="margin-top: 1.5rem; padding: 1rem;">Guardar Cliente</button>
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

        const filtered = clients.filter(c =>
            c.name.toLowerCase().includes(filter.toLowerCase()) ||
            c.phone.includes(filter) ||
            (c.businessName && c.businessName.toLowerCase().includes(filter.toLowerCase()))
        );

        list.innerHTML = filtered.map(c => `
            <tr>
                <td>
                    <div class="client-info">
                        <strong>${c.name}</strong>
                        <span>${c.businessName || 'Persona Natural'}</span>
                    </div>
                </td>
                <td><span class="badge ${c.type === 'wholesale' ? 'bg-orange' : 'bg-blue'}">${c.type === 'wholesale' ? 'Mayorista' : 'Final'}</span></td>
                <td>${c.phone}</td>
                <td class="text-danger">$${(c.balanceMillenio || 0).toLocaleString()}</td>
                <td class="text-danger">$${(c.balanceVulcano || 0).toLocaleString()}</td>
                <td><strong>$${((c.balanceMillenio || 0) + (c.balanceVulcano || 0)).toLocaleString()}</strong></td>
                <td class="table-actions">
                    <button class="icon-btn abono-btn" data-id="${c.id}" title="Registrar Abono"><i class="fas fa-hand-holding-usd"></i></button>
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
        const addBtn = document.getElementById('add-client-btn');
        const modal = document.getElementById('client-modal');
        const form = document.getElementById('client-form');
        const searchInput = document.getElementById('crm-search');

        const payModal = document.getElementById('payment-modal');
        const payForm = document.getElementById('payment-form');
        const payMethodSelect = document.getElementById('payment-method-select');
        const payAmountInput = document.getElementById('payment-amount-input');

        if (addBtn) addBtn.onclick = () => modal.classList.add('show');
        if (searchInput) searchInput.oninput = (e) => this.updateClientList(e.target.value);

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

        // Delegate clicks
        document.addEventListener('click', async (e) => {
            const tgt = e.target;

            // Manual Save: Client
            if (tgt.id === 'save-client-manual-btn') {
                this.handleSaveClient();
                return;
            }

            // Manual Save: Payment
            if (tgt.id === 'save-payment-manual-btn') {
                this.handleSavePayment();
                return;
            }

            if (tgt.classList.contains('close-modal')) {
                tgt.closest('.modal').classList.remove('show');
            }

            const abonoBtn = tgt.closest('.abono-btn');
            if (abonoBtn) {
                const modal = document.getElementById('payment-modal');
                if (modal) {
                    document.getElementById('payment-client-id').value = abonoBtn.dataset.id;
                    modal.classList.add('show');
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
