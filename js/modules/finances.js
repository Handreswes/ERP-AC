// Finances Module
window.Finances = {
    init() {
        this.renderPanel();
        this.setupEventListeners();
    },

    renderPanel() {
        const contentArea = document.getElementById('content-area');

        if (!document.getElementById('finances-panel')) {
            const panel = document.createElement('div');
            panel.id = 'finances-panel';
            panel.className = 'panel';
            contentArea.appendChild(panel);
        }

        const panel = document.getElementById('finances-panel');
        panel.innerHTML = `
            <div class="panel-header">
                <h1>Finanzas y Estados de Cuenta</h1>
            </div>


            <div id="finance-content" style="display: block;">
                <div class="stats-grid">
                    <div class="stat-card clickable-account" data-id="cash-millenio" style="cursor:pointer;" title="Clic para ver historial de efectivo">
                        <h3>Efectivo Millenio</h3>
                        <p id="cash-millenio" class="stat-value">$0.00</p>
                        <button class="btn btn-outline btn-sm movement-btn" data-company="millenio" data-type="outflow">Nueva Salida</button>
                        <button class="btn btn-outline btn-sm movement-btn" data-company="millenio" data-type="transfer">Consignar</button>
                        <button class="btn btn-secondary btn-sm reconcile-btn" data-company="millenio">Cerrar Caja</button>
                    </div>
                    </div>
                    <div class="stat-card clickable-account" data-id="cash-vulcano" style="cursor:pointer;" title="Clic para ver historial de efectivo">
                        <h3>Efectivo Vulcano</h3>
                        <p id="cash-vulcano" class="stat-value">$0.00</p>
                        <button class="btn btn-outline btn-sm movement-btn" data-company="vulcano" data-type="outflow">Nueva Salida</button>
                        <button class="btn btn-outline btn-sm movement-btn" data-company="vulcano" data-type="transfer">Consignar</button>
                        <button class="btn btn-secondary btn-sm reconcile-btn" data-company="vulcano">Cerrar Caja</button>
                    </div>
                    </div>
                    <div class="stat-card">
                        <h3>Cuentas Bancarias</h3>
                        <div id="bank-accounts-summary" style="font-size: 0.9rem; text-align: left; margin: 0.5rem 0;">
                            <!-- Dynamic summary -->
                        </div>
                        <button id="manage-accounts-btn" class="btn btn-primary btn-sm btn-block">Gestionar Cuentas</button>
                    </div>
                    <div class="stat-card" style="grid-column: span 1;">
                        <h3>Salud Financiera (Mes)</h3>
                        <div style="height: 180px; position: relative;">
                            <canvas id="pl-chart"></canvas>
                        </div>
                    </div>
                </div>

                <div class="panel-header" style="margin-top: 2rem;">
                    <h2>Pagos Programados (Gastos Fijos)</h2>
                    <button id="add-recurring-btn" class="btn btn-outline btn-sm">Programar Nuevo</button>
                </div>
                <div class="stats-grid" id="recurring-list" style="grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));">
                    <!-- Dynamic recurring items -->
                </div>

                <div class="panel-header" style="margin-top: 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                    <h2 style="margin:0">Estados de Cuenta Clientes</h2>
                    <div class="search-container" style="display: flex; gap: 0.5rem; align-items: center; min-width: 300px;">
                        <label style="white-space: nowrap; font-size: 0.9rem;">Filtrar:</label>
                        <select id="finance-client-select" class="form-control">
                            <option value="all">-- Todos los deudores --</option>
                            ${CRM.getClients().sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(c => `<option value="${c.id}">${c.name || 'Sin Nombre'}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Cliente</th>
                                <th>Millenio</th>
                                <th>Vulcano</th>
                                <th>Total</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="debt-list"></tbody>
                    </table>
                </div>
            </div>

            <!-- Accounts Modal -->
            <div id="account-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Registrar Cuenta Bancaria</h2>
                        <span class="close-modal">&times;</span>
                    </div>
                    <div class="modal-body">
                        <form id="account-form">
                            <div class="form-group">
                                <label>Empresa</label>
                                <select name="company" required>
                                    <option value="millenio">Millenio</option>
                                    <option value="vulcano">Vulcano</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Nombre Personalizado</label>
                                <input type="text" name="name" placeholder="Ej: Cuenta Nomina" required>
                            </div>
                            <div class="form-group">
                                <label>Saldo Inicial</label>
                                <input type="text" name="balance" class="currency-input" placeholder="0" required>
                            </div>
                        </div>
                        <button type="button" id="save-account-manual-btn" class="btn btn-primary btn-block" style="margin-top: 1rem;">Agregar Cuenta</button>
                    </form>
                    <hr style="margin: 1.5rem 0;">
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Empresa</th>
                                    <th>Banco</th>
                                    <th>Nro Cuenta</th>
                                    <th>Tipo</th>
                                    <th>Nombre Personalizado</th>
                                    <th>Saldo</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody id="accounts-list"></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Movement History Modal -->
            <div id="history-modal" class="modal">
                <div class="modal-content" style="max-width: 1100px;">
                    <div class="modal-header">
                        <h2 id="history-modal-title">Historial de Movimientos</h2>
                        <span class="close-modal">&times;</span>
                    </div>
                    <div class="modal-body" style="display: flex; gap: 1.5rem; padding: 1.5rem; overflow: hidden;">
                        <!-- Sidebar: Filters (approx 5cm / 250px) -->
                        <div class="history-sidebar" style="width: 250px; flex-shrink: 0; background: rgba(0,0,0,0.1); padding: 1.25rem; border-radius: var(--radius); border: 1px solid var(--border); display: flex; flex-direction: column; gap: 1.25rem;">
                            <input type="hidden" id="history-account-id">
                            
                            <div class="form-group" style="margin:0">
                                <label style="display:block; font-size: 0.8rem; margin-bottom: 0.5rem; color: var(--text-secondary);">Desde:</label>
                                <input type="date" id="history-from" class="form-control" style="width: 100%;">
                            </div>

                            <div class="form-group" style="margin:0">
                                <label style="display:block; font-size: 0.8rem; margin-bottom: 0.5rem; color: var(--text-secondary);">Hasta:</label>
                                <input type="date" id="history-to" class="form-control" style="width: 100%;">
                            </div>

                            <button id="filter-history-btn" class="btn btn-primary btn-block">
                                <i class="fas fa-filter"></i> Filtrar rResultados
                            </button>

                            <hr style="border: 0; border-top: 1px solid var(--border); margin: 0.5rem 0;">

                            <button id="export-history-btn" class="btn btn-outline btn-block">
                                <i class="fas fa-file-export"></i> Descargar CSV
                            </button>

                            <div style="margin-top: auto; padding-top: 1rem; border-top: 1px solid var(--border);">
                                <label style="display:block; font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Balance Periodo:</label>
                                <h3 id="history-total" style="margin:0; font-size: 1.4rem;">$0</h3>
                            </div>
                        </div>

                        <!-- Main Area: Table (approx 15cm / Flexible) -->
                        <div class="history-main" style="flex: 1; display: flex; flex-direction: column; overflow: hidden; background: rgba(0,0,0,0.05); border-radius: var(--radius); border: 1px solid var(--border);">
                            <div class="table-container" style="flex: 1; margin: 0; border: none; border-radius: 0; overflow-y: auto;">
                                <table class="data-table">
                                    <thead style="position: sticky; top: 0; z-index: 10;">
                                        <tr>
                                            <th style="width: 100px;">Fecha</th>
                                            <th style="width: 110px;">Tipo</th>
                                            <th style="min-width: 200px;">Concepto</th>
                                            <th class="text-right" style="width: 130px;">Monto</th>
                                            <th style="min-width: 250px;">Notas</th>
                                        </tr>
                                    </thead>
                                    <tbody id="history-list"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Recurring Expense Modal -->
            <div id="recurring-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Programar Gasto Fijo</h2>
                        <span class="close-modal">&times;</span>
                    </div>
                    <div class="modal-body">
                        <form id="recurring-form">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Empresa</label>
                                    <select name="company" required>
                                        <option value="millenio">Millenio</option>
                                        <option value="vulcano">Vulcano</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Concepto</label>
                                    <input type="text" name="concept" placeholder="Ej: Arriendo Local" required>
                                </div>
                                <div class="form-group">
                                    <label>Monto</label>
                                    <input type="text" name="amount" class="currency-input" placeholder="0" required>
                                </div>
                                <div class="form-group">
                                    <label>Día de Pago (1-31)</label>
                                    <input type="number" name="dueDay" min="1" max="31" required>
                                </div>
                            </div>
                            <button type="button" id="save-recurring-manual-btn" class="btn btn-primary btn-block" style="margin-top: 1rem;">Guardar Programación</button>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Cash Closing Modal -->
            <div id="reconcile-modal" class="modal">
                <div class="modal-content" style="max-width: 450px;">
                    <div class="modal-header">
                        <h2>Cierre de Caja (Arqueo)</h2>
                        <span class="close-modal">&times;</span>
                    </div>
                    <div class="modal-body">
                        <form id="reconcile-form">
                            <input type="hidden" name="company" id="reconcile-company">
                            <div class="form-group">
                                <label>Saldo en Sistema</label>
                                <input type="text" id="reconcile-system-balance" class="form-control" style="font-weight: 700; color: var(--accent); background: rgba(59,130,246,0.05);" readonly>
                            </div>
                            <div class="form-group" style="margin-top: 1rem;">
                                <label>Efectivo Físico Contado</label>
                                <input type="text" name="physicalAmount" id="reconcile-physical-input" class="form-control currency-input" style="font-size: 1.25rem; font-weight: 700;" placeholder="0" required>
                            </div>
                            <div id="reconcile-diff-area" style="margin-top: 1.5rem; padding: 1rem; border-radius: 12px; text-align: center; border: 1px solid var(--border); background: rgba(0,0,0,0.2);">
                                <span id="reconcile-diff-label" style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-secondary);">Diferencia (Sobrante/Faltante)</span>
                                <h2 id="reconcile-diff-value" style="font-size: 2.2rem; margin: 0.25rem 0; font-weight: 800;">$0</h2>
                            </div>
                            <button type="button" id="save-reconcile-manual-btn" class="btn btn-primary btn-block" style="margin-top: 1.5rem; padding: 1.25rem; font-size: 1.1rem;">Confirmar y Cerrar Caja</button>
                        </form>
                    </div>
                </div>
            </div>
        `;

        this.updateBalancesUI();
        this.updateDebtUI();
        this.updateRecurringList();
        this.renderChart();
    },

    getBalances() {
        const sales = Storage.get(STORAGE_KEYS.SALES);
        const expenses = Storage.get(STORAGE_KEYS.EXPENSES);
        const payments = Storage.get(STORAGE_KEYS.PAYMENTS);
        const accounts = Storage.get(STORAGE_KEYS.ACCOUNTS);
        const movements = Storage.get(STORAGE_KEYS.MOVEMENTS);

        const balances = {
            millenio: { cash: 0, banks: {} },
            vulcano: { cash: 0, banks: {} }
        };

        // Initialize bank balances from account registration
        accounts.forEach(acc => {
            if (!balances[acc.company].banks[acc.id]) {
                balances[acc.company].banks[acc.id] = { name: acc.name, balance: parseFloat(acc.balance || 0) };
            }
        });

        // 1. Sales (Cash + Transfers)
        sales.forEach(s => {
            if (s.method === 'cash') {
                if (s.totalM) balances.millenio.cash += s.totalM;
                if (s.totalV) balances.vulcano.cash += s.totalV;
            } else if (s.method === 'transfer') {
                // Historically we didn't have accountId, so we might skip or put in 'other'
                // For now, if no bank assigned, it's just recorded in history
            }
        });

        // 2. Payments (Abonos)
        payments.forEach(p => {
            if (p.method === 'cash') {
                balances[p.company].cash += parseFloat(p.amount);
            } else if (p.method === 'transfer') {
                if (p.accountId && balances[p.company].banks[p.accountId]) {
                    balances[p.company].banks[p.accountId].balance += parseFloat(p.amount);
                }
            }
        });

        // 3. Movements (Transfers & Outflows)
        movements.forEach(m => {
            const amount = parseFloat(m.amount);
            if (m.type === 'transfer') {
                // Always from cash to bank for now
                balances[m.company].cash -= amount;
                if (m.destinationAccount && balances[m.company].banks[m.destinationAccount]) {
                    balances[m.company].banks[m.destinationAccount].balance += amount;
                }
            } else if (m.type === 'outflow') {
                if (m.originAccount === 'cash') {
                    balances[m.company].cash -= amount;
                } else if (balances[m.company].banks[m.originAccount]) {
                    balances[m.company].banks[m.originAccount].balance -= amount;
                }
            }
        });

        // 4. Expenses (They are essentially outflows)
        expenses.forEach(e => {
            const amount = parseFloat(e.amount);
            // Historically we didn't specify origin, assume cash if not specified
            if (!e.originAccount || e.originAccount === 'cash') {
                if (balances[e.company]) balances[e.company].cash -= amount;
            } else if (balances[e.company] && balances[e.company].banks[e.originAccount]) {
                balances[e.company].banks[e.originAccount].balance -= amount;
            }
        });

        return balances;
    },

    updateBalancesUI() {
        const balances = this.getBalances();

        const cashM = document.getElementById('cash-millenio');
        if (cashM) cashM.textContent = `$${balances.millenio.cash.toLocaleString()}`;

        const cashV = document.getElementById('cash-vulcano');
        if (cashV) cashV.textContent = `$${balances.vulcano.cash.toLocaleString()}`;

        const summary = document.getElementById('bank-accounts-summary');
        if (summary) {
            let html = '';
            ['millenio', 'vulcano'].forEach(co => {
                const banks = balances[co].banks;
                Object.keys(banks).forEach(id => {
                    html += `<div class="account-summary-item clickable-account" data-id="${id}" style="display:flex; justify-content:between; margin-bottom:4px; padding: 4px; border-radius:4px; cursor:pointer;" title="Clic para ver historial">
                        <span style="font-size: 0.85rem;">${banks[id].name} (${co[0].toUpperCase()}):</span>
                        <strong style="margin-left:auto">$${banks[id].balance.toLocaleString()}</strong>
                    </div>`;
                });
            });
            summary.innerHTML = html || '<p class="text-secondary">No hay cuentas bancarias</p>';
        }

        // Update list in accounts modal
        const accountList = document.getElementById('accounts-list');
        if (accountList) {
            const accounts = Storage.get(STORAGE_KEYS.ACCOUNTS);
            accountList.innerHTML = accounts.map(acc => `
                <tr>
                    <td>${acc.company}</td>
                    <td>${acc.bankName || 'N/A'}</td>
                    <td>${acc.accountNumber || 'N/A'}</td>
                    <td>${acc.accountType === 'savings' ? 'Ahorros' : 'Corriente'}</td>
                    <td>${acc.name}</td>
                    <td><strong>$${(balances[acc.company].banks[acc.id]?.balance || 0).toLocaleString()}</strong></td>
                    <td><button class="icon-btn delete-account-btn" data-id="${acc.id}"><i class="fas fa-trash"></i></button></td>
                </tr>
            `).join('');
        }
    },

    updateDebtUI(selectedClientId = 'all') {
        const financeContent = document.getElementById('finance-content');
        if (!financeContent) return;

        const allClients = CRM.getClients();
        const list = document.getElementById('debt-list');
        if (!list) return;

        let clientsToDisplay = [];
        let message = '';

        if (selectedClientId === 'all') {
            // Existing logic: show only those with debt
            clientsToDisplay = allClients.filter(c => ((c.balanceMillenio || 0) > 0 || (c.balanceVulcano || 0) > 0));
        } else {
            const client = allClients.find(c => c.id === selectedClientId);
            if (client) {
                const total = (client.balanceMillenio || 0) + (client.balanceVulcano || 0);
                if (total <= 0) {
                    message = `<div style="text-align:center; padding: 2rem; background: #10b98111; border-radius: 8px; border: 1px solid #10b98144; margin: 1rem 0;">
                        <i class="fas fa-check-circle" style="font-size: 2rem; color: #10b981; margin-bottom: 0.5rem; display: block;"></i>
                        <h3 style="margin:0; color: #10b981;">Este cliente está en 0</h3>
                        <p style="color: #64748b; margin-top: 5px;">No tiene saldos pendientes en Millenio ni Vulcano.</p>
                    </div>`;
                } else {
                    clientsToDisplay = [client];
                }
            }
        }

        financeContent.style.display = 'block';

        if (message) {
            list.innerHTML = `<tr><td colspan="5">${message}</td></tr>`;
        } else {
            list.innerHTML = clientsToDisplay.map(c => {
                const total = (c.balanceMillenio || 0) + (c.balanceVulcano || 0);
                return `
                    <tr>
                        <td><strong>${c.name}</strong></td>
                        <td class="text-danger">$${(c.balanceMillenio || 0).toLocaleString()}</td>
                        <td class="text-danger">$${(c.balanceVulcano || 0).toLocaleString()}</td>
                        <td><strong>$${total.toLocaleString()}</strong></td>
                        <td>
                            <button class="icon-btn abono-btn" data-id="${c.id}" title="Registrar Abono"><i class="fas fa-hand-holding-usd"></i></button>
                            <button class="icon-btn whatsapp-btn" data-id="${c.id}" title="Enviar por WhatsApp"><i class="fab fa-whatsapp"></i></button>
                        </td>
                    </tr>
                `;
            }).join('');

            if (clientsToDisplay.length === 0 && selectedClientId === 'all') {
                list.innerHTML = '<tr><td colspan="5" class="text-center text-secondary" style="padding: 2rem;">No hay clientes con deuda actualmente</td></tr>';
            }
        }

        // Summary stats for the view
        let totalM = 0;
        let totalV = 0;
        clientsToDisplay.forEach(c => {
            totalM += (c.balanceMillenio || 0);
            totalV += (c.balanceVulcano || 0);
        });

        const totalDebtEl = document.getElementById('total-debt');
        const debtMEl = document.getElementById('debt-millenio');
        const debtVEl = document.getElementById('debt-vulcano');

        if (totalDebtEl) totalDebtEl.textContent = `$${(totalM + totalV).toLocaleString()}`;
        if (debtMEl) debtMEl.textContent = `$${totalM.toLocaleString()}`;
        if (debtVEl) debtVEl.textContent = `$${totalV.toLocaleString()}`;
    },

    setupEventListeners() {
        // 1. Delegated Clicks (Buttons, Close, etc.)
        document.addEventListener('click', async (e) => {
            // Close Modals
            if (e.target.classList.contains('close-modal')) {
                e.target.closest('.modal').classList.remove('show');
                return;
            }

            // Movement Buttons (Salida / Consignación)
            const movementBtn = e.target.closest('.movement-btn');
            if (movementBtn) {
                const { company, type } = movementBtn.dataset;
                const moveModal = document.getElementById('movement-modal');
                const moveType = document.getElementById('movement-type');
                const moveCompany = document.getElementById('movement-company');

                if (moveModal && moveType && moveCompany) {
                    moveType.value = type;
                    moveCompany.value = company;

                    // Setup internal modal logic (these don't change on re-render)
                    moveType.onchange = () => {
                        const isTransfer = moveType.value === 'transfer';
                        document.getElementById('origin-account-group').style.display = isTransfer ? 'none' : 'block';
                        document.getElementById('destination-account-group').style.display = isTransfer ? 'block' : 'none';
                        document.getElementById('transit-group').style.display = isTransfer ? 'none' : 'flex';
                        this.updateMoveAccountOptions();
                    };
                    moveCompany.onchange = () => this.updateMoveAccountOptions();

                    moveType.onchange(); // Trigger UI updates
                    moveModal.classList.add('show');
                }
                return;
            }

            // Other Action Buttons
            if (e.target.id === 'manage-accounts-btn') {
                const modal = document.getElementById('accounts-modal');
                if (modal) modal.classList.add('show');
                return;
            }

            if (e.target.id === 'add-expense-btn') {
                const modal = document.getElementById('expense-modal');
                if (modal) modal.classList.add('show');
                return;
            }

            const delAccBtn = e.target.closest('.delete-account-btn');
            if (delAccBtn) {
                if (confirm('¿Eliminar esta cuenta?')) {
                    await Storage.deleteItem(STORAGE_KEYS.ACCOUNTS, delAccBtn.dataset.id);
                    this.updateBalancesUI();
                }
                return;
            }

            const waBtn = e.target.closest('.whatsapp-btn');
            if (waBtn) {
                const client = CRM.getClients().find(c => c.id === waBtn.dataset.id);
                const text = `Hola ${client.name}, tu estado de cuenta actual en ERP AC es:\nMillenio: $${(client.balanceMillenio || 0).toLocaleString()}\nVulcano: $${(client.balanceVulcano || 0).toLocaleString()}\nTotal: $${((client.balanceMillenio || 0) + (client.balanceVulcano || 0)).toLocaleString()}`;
                window.open(`https://wa.me/${client.phone}/?text=${encodeURIComponent(text)}`, '_blank');
                return;
            }

            const abonoBtn = e.target.closest('.abono-btn');
            if (abonoBtn) {
                const modal = document.getElementById('payment-modal');
                if (modal) {
                    const clientIdInput = document.getElementById('payment-client-id');
                    if (clientIdInput) clientIdInput.value = abonoBtn.dataset.id;
                    modal.classList.add('show');
                }
                return;
            }

            const accClick = e.target.closest('.clickable-account');
            if (accClick) {
                this.showAccountHistory(accClick.dataset.id);
                return;
            }

            if (e.target.id === 'filter-history-btn') {
                const id = document.getElementById('history-account-id').value;
                this.showAccountHistory(id);
                return;
            }

            if (e.target.id === 'export-history-btn') {
                this.exportToCSV();
                return;
            }

            if (e.target.id === 'add-recurring-btn') {
                const modal = document.getElementById('recurring-modal');
                if (modal) modal.classList.add('show');
                return;
            }

            const delRecBtn = e.target.closest('.delete-recurring-btn');
            if (delRecBtn) {
                if (confirm('¿Eliminar esta programación?')) {
                    await Storage.deleteItem(STORAGE_KEYS.RECURRING_EXPENSES, delRecBtn.dataset.id);
                    this.updateRecurringList();
                }
                return;
            }

            const payRecBtn = e.target.closest('.pay-recurring-btn');
            if (payRecBtn) {
                const item = Storage.getById(STORAGE_KEYS.RECURRING_EXPENSES, payRecBtn.dataset.id);
                const movementBtn = document.querySelector(`.movement-btn[data-company="${item.company}"][data-type="outflow"]`);
                if (movementBtn) {
                    movementBtn.click();
                    setTimeout(() => {
                        const amountInput = document.getElementById('movement-amount-input');
                        const notesInput = document.querySelector('#movement-form [name="notes"]');
                        if (amountInput) amountInput.value = parseFloat(item.amount).toLocaleString('de-DE');
                        if (notesInput) notesInput.value = `Pago Programado: ${item.concept}`;
                    }, 100);
                }
                return;
            }
        });

        // 2. Manual Save Buttons (V66 Protection)
        document.addEventListener('click', async (e) => {
            const tgt = e.target;
            if (tgt.id === 'save-movement-manual-btn') this.handleSaveMovement();
            if (tgt.id === 'save-account-manual-btn') this.handleSaveAccount();
            if (tgt.id === 'save-recurring-manual-btn') this.handleSaveRecurring();
            if (tgt.id === 'save-reconcile-manual-btn') this.handleSaveReconcile();

            // We could also do others like account, recurring, etc. if needed
        });

        // 3. Delegated Inputs (Formatting, Search)
        document.addEventListener('input', (e) => {
            if (e.target.id === 'finance-client-select') {
                this.updateDebtUI(e.target.value);
                return;
            }

            if (e.target.id === 'movement-amount-input' || e.target.classList.contains('currency-input')) {
                let value = e.target.value.replace(/\D/g, "");
                if (value) {
                    e.target.value = parseInt(value).toLocaleString('de-DE');
                }
            }
        });
    },

    async handleSaveMovement() {
        const form = document.getElementById('movement-form');
        const btn = document.getElementById('save-movement-manual-btn');
        if (!form || !btn) return;

        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESANDO...';
            window.ERP_LOG('Iniciando registro de movimiento...');

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            data.amount = parseFloat(data.amount.replace(/\./g, '')) || 0;
            data.date = new Date().toISOString();

            // Transit Logic
            if (data.isTransit === 'on') {
                await Storage.addItem(STORAGE_KEYS.TRANSIT_ORDERS, {
                    id: 'TRANS-' + Date.now(),
                    company: data.company,
                    concept: data.notes,
                    amount: data.amount,
                    date: data.date,
                    status: 'pending'
                });
                data.notes = `[EN TRÁNSITO] ${data.notes}`;
            }

            await Storage.addItem(STORAGE_KEYS.MOVEMENTS, data);
            window.ERP_LOG('Movimiento registrado localmente', 'success');

            form.reset();
            form.closest('.modal').classList.remove('show');
            this.updateBalancesUI();
            this.renderChart();
            alert('✅ Movimiento registrado con éxito.');
        } catch (err) {
            window.ERP_LOG('Error Movimiento: ' + err.message, 'error');
            alert('❌ Error: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Registrar Movimiento';
        }
    },

    async handleSaveAccount() {
        const form = document.getElementById('account-form');
        const btn = document.getElementById('save-account-manual-btn');
        if (!form || !btn) return;
        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESANDO...';
            const data = Object.fromEntries(new FormData(form));
            data.balance = parseFloat(data.balance.replace(/\./g, '')) || 0;
            await Storage.addItem(STORAGE_KEYS.ACCOUNTS, data);
            form.reset();
            this.updateBalancesUI();
            alert('✅ Cuenta agregada.');
        } catch (err) {
            window.ERP_LOG('Error Cuenta: ' + err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Agregar Cuenta';
        }
    },

    async handleSaveRecurring() {
        const form = document.getElementById('recurring-form');
        const btn = document.getElementById('save-recurring-manual-btn');
        if (!form || !btn) return;
        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESANDO...';
            const data = Object.fromEntries(new FormData(form));
            data.amount = parseFloat(data.amount.replace(/\./g, '')) || 0;
            await Storage.addItem(STORAGE_KEYS.RECURRING_EXPENSES, data);
            form.reset();
            form.closest('.modal').classList.remove('show');
            this.updateRecurringList();
            alert('✅ Programación guardada.');
        } catch (err) {
            window.ERP_LOG('Error Gasto Fijo: ' + err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Guardar Programación';
        }
    },

    async handleSaveReconcile() {
        const form = document.getElementById('reconcile-form');
        const btn = document.getElementById('save-reconcile-manual-btn');
        if (!form || !btn) return;
        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESANDO...';
            const data = Object.fromEntries(new FormData(form));
            const company = data.company;
            const physical = parseFloat(data.physicalAmount.replace(/\./g, '')) || 0;
            const system = this.getBalances()[company].cash;
            const diff = physical - system;

            if (diff !== 0) {
                await Storage.addItem(STORAGE_KEYS.MOVEMENTS, {
                    company: company,
                    type: 'outflow',
                    originAccount: 'cash',
                    amount: Math.abs(diff),
                    concept: `Ajuste por Arqueo (${diff > 0 ? 'Sobrante' : 'Faltante'})`,
                    date: new Date().toISOString(),
                    notes: `Arqueo: Sistema $${system.toLocaleString()}, Físico $${physical.toLocaleString()}`
                });
            }

            await Storage.addItem(STORAGE_KEYS.CASH_CLOSINGS, {
                company, system, physical, diff, date: new Date().toISOString()
            });

            form.closest('.modal').classList.remove('show');
            this.updateBalancesUI();
            this.renderChart();
            alert(`✅ Cierre completado. Diferencia: $${diff.toLocaleString()}`);
        } catch (err) {
            window.ERP_LOG('Error Cierre: ' + err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Confirmar y Cerrar Caja';
        }
    },

    showAccountHistory(accountId) {
        const modal = document.getElementById('history-modal');
        const list = document.getElementById('history-list');
        const title = document.getElementById('history-modal-title');
        const totalEl = document.getElementById('history-total');
        const fromInput = document.getElementById('history-from');
        const toInput = document.getElementById('history-to');

        document.getElementById('history-account-id').value = accountId;

        let logs = [];
        let viewTitle = "";
        const fromDate = fromInput.value ? new Date(fromInput.value) : new Date(0);
        const toDate = toInput.value ? new Date(toInput.value) : new Date();
        toDate.setHours(23, 59, 59, 999);

        const isCash = accountId.startsWith('cash-');
        const targetCo = isCash ? accountId.split('-')[1] : null;

        if (isCash) {
            viewTitle = `Historial de Efectivo: ${targetCo[0].toUpperCase()}${targetCo.slice(1)}`;
        } else {
            const account = Storage.get(STORAGE_KEYS.ACCOUNTS).find(a => a.id === accountId);
            if (!account) return;
            viewTitle = `Historial: ${account.bankName} - ${account.name}`;
        }

        title.textContent = viewTitle;

        const sales = Storage.get(STORAGE_KEYS.SALES);
        const payments = Storage.get(STORAGE_KEYS.PAYMENTS);
        const movements = Storage.get(STORAGE_KEYS.MOVEMENTS);
        const expenses = Storage.get(STORAGE_KEYS.EXPENSES);

        // 1. Sales
        sales.forEach(s => {
            if (isCash) {
                if (s.method === 'cash') {
                    const amount = targetCo === 'millenio' ? (s.totalM || 0) : (s.totalV || 0);
                    if (amount > 0) logs.push({ date: s.date, type: 'Venta', concept: `Venta Efectivo - ${s.clientName}`, notes: s.notes || '', amount });
                }
            } else if (s.accountId === accountId) {
                logs.push({ date: s.date, type: 'Venta', concept: `Venta POS - ${s.clientName}`, notes: s.notes || '', amount: s.total });
            }
        });

        // 2. Payments (Abonos)
        payments.forEach(p => {
            if (isCash) {
                if (p.method === 'cash' && p.company === targetCo) {
                    logs.push({ date: p.date, type: 'Abono', concept: `Abono Cliente - ${p.clientName}`, notes: p.notes || '', amount: parseFloat(p.amount) });
                }
            } else if (p.accountId === accountId) {
                logs.push({ date: p.date, type: 'Abono', concept: `Abono Cliente - ${p.clientName}`, notes: p.notes || '', amount: parseFloat(p.amount) });
            }
        });

        // 3. Movements (Transfers & Outflows)
        movements.forEach(m => {
            if (isCash) {
                if (m.company === targetCo) {
                    if (m.type === 'transfer') {
                        // Consignación: Cash -> Bank
                        logs.push({ date: m.date || new Date().toISOString(), type: 'Consignación', concept: 'Salida a Banco', notes: m.notes || '', amount: -parseFloat(m.amount) });
                    } else if (m.type === 'outflow' && m.originAccount === 'cash') {
                        logs.push({ date: m.date || new Date().toISOString(), type: 'Salida', concept: m.concept || 'Gasto Efectivo', notes: m.notes || '', amount: -parseFloat(m.amount) });
                    }
                }
            } else {
                if (m.destinationAccount === accountId) {
                    logs.push({ date: m.date || new Date().toISOString(), type: 'Consignación', concept: 'Entrada desde Efectivo', notes: m.notes || '', amount: parseFloat(m.amount) });
                }
                if (m.originAccount === accountId) {
                    logs.push({ date: m.date || new Date().toISOString(), type: 'Salida', concept: m.concept || 'Movimiento de Salida', notes: m.notes || '', amount: -parseFloat(m.amount) });
                }
            }
        });

        // 4. Expenses
        expenses.forEach(e => {
            if (isCash) {
                if (e.company === targetCo && (!e.originAccount || e.originAccount === 'cash')) {
                    logs.push({ date: e.createdAt || e.date || new Date().toISOString(), type: 'Gasto', concept: e.concept, notes: e.notes || '', amount: -parseFloat(e.amount) });
                }
            } else if (e.originAccount === accountId) {
                logs.push({ date: e.createdAt || e.date || new Date().toISOString(), type: 'Gasto', concept: e.concept, notes: e.notes || '', amount: -parseFloat(e.amount) });
            }
        });

        // Filter and Sort
        const filtered = logs.filter(l => {
            const d = new Date(l.date);
            return d >= fromDate && d <= toDate;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));

        let total = 0;
        list.innerHTML = filtered.map(l => {
            total += l.amount;
            return `
                <tr>
                    <td style="font-size: 0.8rem; white-space: nowrap;">${new Date(l.date).toLocaleDateString()}</td>
                    <td><span class="badge ${l.amount > 0 ? 'bg-green' : 'bg-red'}" style="font-size: 0.7rem; padding: 2px 6px;">${l.type}</span></td>
                    <td style="font-size: 0.85rem;">${l.concept}</td>
                    <td class="text-right ${l.amount > 0 ? 'text-success' : 'text-danger'}"><strong>$${Math.abs(l.amount).toLocaleString()}</strong></td>
                    <td style="font-size: 0.8rem; color: var(--text-secondary); max-width: 250px; overflow: hidden; text-overflow: ellipsis;">${l.notes || '-'}</td>
                </tr>
            `;
        }).join('');

        if (filtered.length === 0) list.innerHTML = '<tr><td colspan="5" class="text-center">No hay movimientos en este periodo</td></tr>';

        totalEl.textContent = `Total Movimientos: $${total.toLocaleString()}`;
        totalEl.className = total >= 0 ? 'text-success' : 'text-danger';

        modal.classList.add('show');
    },

    updateMoveAccountOptions() {
        // ... previous implementation ...
    },

    renderChart() {
        const canvas = document.getElementById('pl-chart');
        if (!canvas) return;

        const sales = Storage.get(STORAGE_KEYS.SALES);
        const payments = Storage.get(STORAGE_KEYS.PAYMENTS);
        const movements = Storage.get(STORAGE_KEYS.MOVEMENTS);

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        let income = 0;
        let expenses = 0;

        // 1. Sales (Historical & New)
        sales.forEach(s => {
            if (new Date(s.date) >= startOfMonth) {
                income += (s.total || s.totalM || 0) + (s.totalV || 0);
            }
        });

        // 2. Payments
        payments.forEach(p => {
            if (new Date(p.date) >= startOfMonth) income += parseFloat(p.amount);
        });

        // 3. Outflows (Expenses)
        movements.filter(m => m.type === 'outflow').forEach(m => {
            if (new Date(m.date || m.createdAt) >= startOfMonth) expenses += parseFloat(m.amount);
        });

        // Legacy expenses if any
        Storage.get(STORAGE_KEYS.EXPENSES).forEach(e => {
            if (new Date(e.createdAt) >= startOfMonth) expenses += parseFloat(e.amount);
        });

        // Destroy old chart if exists to avoid hover issues
        if (window.myPLChart) window.myPLChart.destroy();

        const ctx = canvas.getContext('2d');
        window.myPLChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Ingresos', 'Egresos'],
                datasets: [{
                    data: [income, expenses],
                    backgroundColor: ['#10b981', '#ef4444'],
                    borderWidth: 0,
                    cutout: '70%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#94a3b8', boxWidth: 12, usePointStyle: true } }
                }
            }
        });
    },

    updateRecurringList() {
        const list = document.getElementById('recurring-list');
        if (!list) return;

        const recurring = Storage.get(STORAGE_KEYS.RECURRING_EXPENSES);
        const today = new Date().getDate();

        list.innerHTML = recurring.map(item => {
            const isDue = Math.abs(item.dueDay - today) <= 2;
            return `
                <div class="stat-card" style="border-left: 4px solid ${isDue ? '#ef4444' : '#2563eb'}">
                    <div style="display:flex; justify-content:space-between; align-items:start;">
                        <div>
                            <h4 style="margin:0">${item.concept}</h4>
                            <span class="badge ${item.company === 'millenio' ? 'bg-blue' : 'bg-orange'}">${item.company}</span>
                        </div>
                        <strong class="text-danger">$${parseFloat(item.amount).toLocaleString()}</strong>
                    </div>
                    <p style="font-size: 0.8rem; margin: 8px 0;">Día de pago: <strong>${item.dueDay}</strong></p>
                    <div style="display:flex; gap: 8px; margin-top: 10px;">
                        <button class="btn btn-primary btn-sm pay-recurring-btn" data-id="${item.id}">Pagar Ahora</button>
                        <button class="btn btn-outline btn-sm delete-recurring-btn" data-id="${item.id}"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        }).join('');

        if (recurring.length === 0) list.innerHTML = '<p class="text-secondary" style="grid-column: 1/-1; text-align:center;">No hay gastos programados</p>';
    },

    updateMoveAccountOptions() {
        const typeInput = document.getElementById('movement-type');
        const companyInput = document.getElementById('movement-company');
        if (!typeInput || !companyInput) return;

        const type = typeInput.value;
        const company = companyInput.value;
        const accounts = Storage.get(STORAGE_KEYS.ACCOUNTS).filter(a => a.company === company);

        if (type === 'transfer') {
            const destSelect = document.getElementById('movement-destination');
            if (destSelect) destSelect.innerHTML = accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
        } else {
            const originSelect = document.getElementById('movement-origin');
            if (originSelect) {
                let html = '<option value="cash">Caja Efectivo</option>';
                html += accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
                originSelect.innerHTML = html;
            }
        }
    },

    exportToCSV() {
        const title = document.getElementById('history-modal-title').textContent;
        const rows = document.querySelectorAll('#history-list tr');
        let csv = 'Fecha;Tipo;Concepto;Monto\n';

        rows.forEach(tr => {
            const cols = tr.querySelectorAll('td');
            if (cols.length >= 4) {
                const row = Array.from(cols).map(c => c.textContent.replace(/;/g, ',').trim());
                csv += row.join(';') + '\n';
            }
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `Reporte_${title.replace(/\s/g, '_')}.csv`);
        link.click();
    }
};
