// Dashboard Module
window.Dashboard = {
    async init() {
        this.currentRange = 'today';
        await this.renderFilters();
        this.updateStats();
    },

    renderFilters() {
        const selector = document.getElementById('dashboard-date-range');
        const customInputs = document.getElementById('custom-date-inputs');
        if (!selector) return;

        selector.onchange = (e) => {
            this.currentRange = e.target.value;
            customInputs.style.display = this.currentRange === 'custom' ? 'flex' : 'none';
            if (this.currentRange !== 'custom') this.updateStats();
        };

        const startInput = document.getElementById('date-start');
        const endInput = document.getElementById('date-end');

        [startInput, endInput].forEach(input => {
            if (input) input.onchange = () => {
                if (startInput.value && endInput.value) this.updateStats();
            };
        });

        // Click listeners for stat cards
        document.addEventListener('click', (e) => {
            const card = e.target.closest('.stat-card.clickable');
            if (card) {
                const id = card.id;
                if (id === 'stat-sales') this.showSalesDetail();
                if (id === 'stat-stock') this.showCriticalStockDetail();
                if (id === 'stat-credits-millenio' || id === 'stat-credits-vulcano') this.showCreditsDetail();
                if (id === 'stat-commissions') {
                    // Navigate to Vendedores settlements tab
                    const btn = document.querySelector('.nav-item[data-panel="vendedores"]');
                    if (btn) {
                        btn.click();
                        Vendedores.activeTab = 'settlements';
                        Vendedores.renderPanel();
                    }
                }
            }
        });
    },

    updateStats() {
        const sales = Storage.get(STORAGE_KEYS.SALES);
        const products = Storage.get(STORAGE_KEYS.PRODUCTS);
        const clients = Storage.get(STORAGE_KEYS.CLIENTS);
        const expenses = Storage.get(STORAGE_KEYS.EXPENSES);
        const movements = Storage.get(STORAGE_KEYS.MOVEMENTS);

        // Date logic - Always use local day boundaries for consistency
        let startDate, endDate;
        const now = new Date();

        if (this.currentRange === 'today') {
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date();
            endDate.setHours(23, 59, 59, 999);
        } else if (this.currentRange === 'week') {
            const firstDay = now.getDate() - now.getDay();
            startDate = new Date(now.setDate(firstDay));
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date();
            endDate.setHours(23, 59, 59, 999);
        } else if (this.currentRange === 'month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date();
            endDate.setHours(23, 59, 59, 999);
        } else if (this.currentRange === 'custom') {
            const startVal = document.getElementById('date-start').value;
            const endVal = document.getElementById('date-end').value;
            startDate = startVal ? new Date(startVal + 'T00:00:00') : new Date(0);
            endDate = endVal ? new Date(endVal + 'T23:59:59') : new Date();
        }

        const filteredSales = sales.filter(s => {
            const saleDate = new Date(s.date);
            return saleDate >= startDate && saleDate <= endDate;
        });

        // Update card titles based on range
        let rangeText = "Hoy";
        if (this.currentRange === 'week') rangeText = "Semana";
        if (this.currentRange === 'month') rangeText = "Mes";
        if (this.currentRange === 'custom') rangeText = "Rango";

        const salesHeader = document.getElementById('stat-sales-title');
        if (salesHeader) salesHeader.textContent = `Ventas ${rangeText}`;

        this.lastFilteredSales = filteredSales; // Store for modal
        this.renderFilteredStats(filteredSales, products, clients, expenses, movements, startDate, endDate);
    },

    renderFilteredStats(filteredSales, products, clients, expenses, movements, startDate, endDate) {
        // Global POS Totals
        const totalFilteredPOS = filteredSales.reduce((sum, s) => sum + (s.total || 0), 0);
        
        // Calculate POS COGS
        const posCOGS = filteredSales.reduce((sum, s) => {
            let cost = 0;
            if (s.items && Array.isArray(s.items)) {
                s.items.forEach(item => {
                    const product = products.find(p => p.id === item.id);
                    const costPrice = product ? (parseFloat(product.costPrice) || 0) : 0;
                    cost += costPrice * (parseFloat(item.quantity) || 0);
                });
            }
            return sum + cost;
        }, 0);
        const criticalCount = products.filter(p => p.stockMillenio < 5 || p.stockVulcano < 5).length;
        const pendingCreditsMillenio = clients.reduce((sum, c) => sum + (c.balanceMillenio || 0), 0);
        const pendingCreditsVulcano = clients.reduce((sum, c) => sum + (c.balanceVulcano || 0), 0);

        // Millenio Breakdown
        const mSales = filteredSales.reduce((acc, s) => {
            const val = s.totalM || 0;
            acc.total += val;
            if (s.method === 'cash') acc.cash += val;
            if (s.method === 'credit') acc.credit += val;
            if (s.method === 'transfer') acc.consignment += val;
            return acc;
        }, { total: 0, cash: 0, credit: 0, consignment: 0 });

        let mExpenses = expenses.filter(e => {
            const d = new Date(e.createdAt);
            return d >= startDate && d <= endDate && e.company === 'millenio';
        }).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

        // Add manual outflows (salidas) to expenses
        mExpenses += movements.filter(m => {
            const d = new Date(m.date);
            return d >= startDate && d <= endDate && m.company === 'millenio' && m.type === 'outflow';
        }).reduce((sum, m) => sum + parseFloat(m.amount || 0), 0);

        // Vulcano Breakdown
        const vSales = filteredSales.reduce((acc, s) => {
            const val = s.totalV || 0;
            acc.total += val;
            if (s.method === 'cash') acc.cash += val;
            if (s.method === 'credit') acc.credit += val;
            if (s.method === 'transfer') acc.consignment += val;
            return acc;
        }, { total: 0, cash: 0, credit: 0, consignment: 0 });

        let vExpenses = expenses.filter(e => {
            const d = new Date(e.createdAt);
            return d >= startDate && d <= endDate && e.company === 'vulcano';
        }).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

        // Add manual outflows (salidas) to expenses
        vExpenses += movements.filter(m => {
            const d = new Date(m.date);
            return d >= startDate && d <= endDate && m.company === 'vulcano' && m.type === 'outflow';
        }).reduce((sum, m) => sum + parseFloat(m.amount || 0), 0);

        // TUCOMPRAS Sales & Utilities
        const tcSales = Storage.get(STORAGE_KEYS.TUCOMPRAS_SALES) || [];
        const pendingCommissions = tcSales.filter(s =>
            s.status === 'recibido' &&
            s.money_confirmed === true &&
            s.is_commission_paid !== true
        ).reduce((sum, s) => sum + (parseFloat(s.commission_paid) || 0), 0);

        const tcFiltered = tcSales.filter(s => {
            const d = new Date(s.date);
            return d >= startDate && d <= endDate;
        });

        const tcRevenue = tcFiltered.reduce((sum, s) => s.status === 'recibido' ? sum + parseFloat(s.sale_price || 0) : sum, 0);
        const tcCogsAndExpenses = tcFiltered.reduce((sum, s) => {
            if (s.status === 'recibido') {
                return sum + parseFloat(s.cost_price || 0) + parseFloat(s.commission_paid || 0) + parseFloat(s.shipping_cost || 0);
            }
            if (s.status === 'devuelto') {
                return sum + parseFloat(s.shipping_loss || 0);
            }
            return sum;
        }, 0);

        // MASTER FINANCIAL CALCULATIONS
        const totalRevenue = totalFilteredPOS + tcRevenue;
        const totalCOGS = posCOGS + tcCogsAndExpenses;
        const grossProfit = totalRevenue - totalCOGS;
        const totalOPEX = mExpenses + vExpenses;
        const netProfit = grossProfit - totalOPEX;
        const netMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

        // Update Top Level Financial KPIs
        this.updateElText('stat-revenue .stat-value', `$${totalRevenue.toLocaleString()}`);
        this.updateElText('stat-gross-profit .stat-value', `$${grossProfit.toLocaleString()}`);
        this.updateElText('stat-opex .stat-value', `$${totalOPEX.toLocaleString()}`);
        
        const netEl = document.querySelector('#stat-net-profit .stat-value');
        if (netEl) {
            netEl.textContent = `$${netProfit.toLocaleString()}`;
            netEl.style.color = netProfit >= 0 ? '#8b5cf6' : '#ef4444';
        }

        const marginEl = document.querySelector('#stat-margin .stat-value');
        if (marginEl) {
            marginEl.textContent = `${netMargin}%`;
            marginEl.className = `stat-value ${netMargin >= 10 ? 'text-success' : (netMargin > 0 ? 'text-warning' : 'text-danger')}`;
        }

        const elStock = document.querySelector('#stat-stock .stat-value');
        if (elStock) elStock.textContent = criticalCount;

        const elCredMillenio = document.querySelector('#stat-credits-millenio .stat-value');
        if (elCredMillenio) elCredMillenio.textContent = `$${pendingCreditsMillenio.toLocaleString()}`;

        const elCredVulcano = document.querySelector('#stat-credits-vulcano .stat-value');
        if (elCredVulcano) elCredVulcano.textContent = `$${pendingCreditsVulcano.toLocaleString()}`;

        // Update UI - Millenio Details
        this.updateElText('millenio-sales-today-detail', `$${mSales.total.toLocaleString()}`);
        this.updateElText('millenio-cash-today', `$${mSales.cash.toLocaleString()}`);
        this.updateElText('millenio-consignment-today', `$${mSales.consignment.toLocaleString()}`);
        this.updateElText('millenio-expenses-today', `$${mExpenses.toLocaleString()}`);

        // Update UI - Vulcano Details
        this.updateElText('vulcano-sales-today-detail', `$${vSales.total.toLocaleString()}`);
        this.updateElText('vulcano-cash-today', `$${vSales.cash.toLocaleString()}`);
        this.updateElText('vulcano-consignment-today', `$${vSales.consignment.toLocaleString()}`);
        this.updateElText('vulcano-expenses-today', `$${vExpenses.toLocaleString()}`);

        // Add TUCOMPRAS to Dashboard Summary
        console.log(`[Dashboard] TUCOMPRAS Utility for period: $${(tcRevenue - tcCogsAndExpenses).toLocaleString()}`);

        // Render Charts
        this.renderCharts(totalRevenue, totalOPEX, grossProfit, netProfit, tcFiltered, filteredSales, startDate, endDate);

        // Credits Lists
        const mCredits = filteredSales.filter(s => s.method === 'credit' && (s.totalM || 0) > 0)
            .map(s => ({ clientName: s.clientName, displayTotal: s.totalM }));
        const vCredits = filteredSales.filter(s => s.method === 'credit' && (s.totalV || 0) > 0)
            .map(s => ({ clientName: s.clientName, displayTotal: s.totalV }));

        this.renderCreditsList('millenio-credits-today', mCredits);
        this.renderCreditsList('vulcano-credits-today', vCredits);

        // Product Rotation
        this.renderRotation(filteredSales, products);
    },

    renderCharts(totalRevenue, totalOPEX, grossProfit, netProfit, tcFiltered, filteredSales, startDate, endDate) {
        // Destroy existing charts to prevent memory leaks / overlap
        if (this.trendChart) this.trendChart.destroy();
        if (this.distChart) this.distChart.destroy();

        const trendCtx = document.getElementById('dashboard-trend-chart');
        const distCtx = document.getElementById('dashboard-distribution-chart');
        if (!trendCtx || !distCtx) return;

        // Data preparation for Trend Chart (By Date/Day)
        // We will group by Day if range <= 31 days, else by Month.
        const daysDiff = (endDate - startDate) / (1000 * 60 * 60 * 24);
        const labels = [];
        const revenueData = [];
        const opexData = [];
        
        if (daysDiff <= 31) {
            // Daily grouping
            const grouped = {};
            let curr = new Date(startDate);
            curr.setHours(0,0,0,0);
            while (curr <= endDate) {
                const dateStr = curr.toISOString().split('T')[0];
                grouped[dateStr] = { rev: 0, exp: 0 };
                curr.setDate(curr.getDate() + 1);
            }

            filteredSales.forEach(s => {
                const d = new Date(s.date).toISOString().split('T')[0];
                if (grouped[d]) grouped[d].rev += (s.total || 0);
            });
            tcFiltered.forEach(s => {
                const d = new Date(s.date).toISOString().split('T')[0];
                if (grouped[d] && s.status === 'recibido') grouped[d].rev += (parseFloat(s.sale_price) || 0);
            });
            
            // OPEX (Generic expenses from STORAGE_KEYS.EXPENSES and MOVEMENTS)
            const expenses = Storage.get(STORAGE_KEYS.EXPENSES);
            const movements = Storage.get(STORAGE_KEYS.MOVEMENTS);
            expenses.forEach(e => {
                const d = new Date(e.createdAt).toISOString().split('T')[0];
                if (grouped[d]) grouped[d].exp += parseFloat(e.amount || 0);
            });
            movements.forEach(m => {
                if (m.type === 'outflow') {
                    const d = new Date(m.date).toISOString().split('T')[0];
                    if (grouped[d]) grouped[d].exp += parseFloat(m.amount || 0);
                }
            });

            Object.keys(grouped).sort().forEach(date => {
                labels.push(date.split('-').slice(1).join('/'));
                revenueData.push(grouped[date].rev);
                opexData.push(grouped[date].exp);
            });
        } else {
            // Fallback: simple bar chart of total
            labels.push('Periodo Completo');
            revenueData.push(totalRevenue);
            opexData.push(totalOPEX);
        }

        this.trendChart = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Ingresos Brutos',
                        data: revenueData,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Gastos (OPEX)',
                        data: opexData,
                        borderColor: '#ef4444',
                        backgroundColor: 'transparent',
                        tension: 0.4,
                        borderDash: [5, 5]
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: { y: { beginAtZero: true } }
            }
        });

        // Data preparation for Distribution Chart (Doughnut)
        const mSalesTot = filteredSales.reduce((sum, s) => sum + (s.totalM || 0), 0);
        const vSalesTot = filteredSales.reduce((sum, s) => sum + (s.totalV || 0), 0);
        const tcSalesTot = tcFiltered.reduce((sum, s) => s.status === 'recibido' ? sum + parseFloat(s.sale_price || 0) : sum, 0);

        this.distChart = new Chart(distCtx, {
            type: 'doughnut',
            data: {
                labels: ['Millenio', 'Vulcano', 'TuCompras'],
                datasets: [{
                    data: [mSalesTot, vSalesTot, tcSalesTot],
                    backgroundColor: ['#3b82f6', '#f59e0b', '#10b981'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    },

    renderRotation(filteredSales, products) {
        const rotationMap = {};

        // Initialize all active products with 0
        products.filter(p => p.active !== false).forEach(p => {
            rotationMap[p.id] = { name: p.name, qty: 0 };
        });

        // Sum quantities from filtered sales
        filteredSales.forEach(s => {
            if (s.items && Array.isArray(s.items)) {
                s.items.forEach(item => {
                    if (rotationMap[item.id]) {
                        rotationMap[item.id].qty += (item.quantity || 0);
                    } else {
                        // In case product was deleted but exists in sales
                        rotationMap[item.id] = { name: item.name, qty: item.quantity || 0 };
                    }
                });
            }
        });

        const sorted = Object.values(rotationMap).sort((a, b) => b.qty - a.qty);

        const top5 = sorted.slice(0, 5).filter(i => i.qty > 0);
        const bottom5 = sorted.slice(-5).reverse();

        this.renderRotationList('top-products-rotation', top5, 'fire');
        this.renderRotationList('bottom-products-rotation', bottom5, 'snowflake');
    },

    renderRotationList(id, list, icon) {
        const container = document.getElementById(id);
        if (!container) return;

        if (list.length === 0) {
            container.innerHTML = '<p class="text-secondary">No hay datos suficientes</p>';
            return;
        }

        container.innerHTML = list.map(item => `
            <div class="credit-item">
                <span title="${item.name}">${item.name}</span>
                <strong class="${icon === 'fire' ? 'text-success' : 'text-secondary'}">${item.qty} uni.</strong>
            </div>
        `).join('');
    },

    updateElText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    },

    renderCreditsList(id, credits) {
        const container = document.getElementById(id);
        if (!container) return;
        if (credits.length === 0) {
            container.innerHTML = '<p class="text-secondary">Sin créditos en este periodo</p>';
            return;
        }
        container.innerHTML = credits.map(c => `
            <div class="credit-item">
                <span>${c.clientName}</span>
                <strong>$${c.displayTotal.toLocaleString()}</strong>
            </div>
        `).join('');
    },

    showSalesDetail() {
        const modal = document.getElementById('dashboard-detail-modal');
        const title = document.getElementById('dashboard-detail-title');
        const sidebar = document.getElementById('dashboard-detail-summary-content');
        const list = document.getElementById('dashboard-detail-list-container');

        const sales = this.lastFilteredSales || [];
        const total = sales.reduce((sum, s) => sum + (s.total || 0), 0);

        title.textContent = 'Detalle de Ventas';
        sidebar.innerHTML = `
            <h4 style="margin:0; color:var(--accent);">Resumen de Ventas</h4>
            <div style="margin-top:1rem;">
                <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:0.25rem;">Total Transacciones:</p>
                <h2 style="margin:0; font-size:1.8rem;">${sales.length}</h2>
            </div>
            <div style="margin-top:1rem;">
                <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:0.25rem;">Monto Total:</p>
                <h2 style="margin:0; font-size:1.8rem; color:var(--success);">$${total.toLocaleString()}</h2>
            </div>
            <p style="margin-top:auto; font-size:0.75rem; color:var(--text-secondary);">Mostrando resultados filtrados por el rango seleccionado en el panel.</p>
        `;

        list.innerHTML = `
            <table class="data-table">
                <thead style="position: sticky; top:0; z-index:10;">
                    <tr>
                        <th style="width:100px;">Fecha</th>
                        <th>Cliente</th>
                        <th>Método</th>
                        <th class="text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${sales.map(s => `
                        <tr>
                            <td style="font-size:0.8rem;">${new Date(s.date).toLocaleDateString()}</td>
                            <td>${s.clientName}</td>
                            <td><span class="badge ${s.method === 'cash' ? 'bg-green' : (s.method === 'credit' ? 'bg-red' : 'bg-blue')}">${s.method}</span></td>
                            <td class="text-right"><strong>$${(s.total || 0).toLocaleString()}</strong></td>
                        </tr>
                    `).join('')}
                    ${sales.length === 0 ? '<tr><td colspan="4" class="text-center">No hay ventas registradas</td></tr>' : ''}
                </tbody>
            </table>
        `;

        modal.classList.add('show');
    },

    showCriticalStockDetail() {
        const modal = document.getElementById('dashboard-detail-modal');
        const title = document.getElementById('dashboard-detail-title');
        const sidebar = document.getElementById('dashboard-detail-summary-content');
        const list = document.getElementById('dashboard-detail-list-container');

        const products = Storage.get(STORAGE_KEYS.PRODUCTS).filter(p => (p.stockMillenio || 0) < 5 || (p.stockVulcano || 0) < 5);

        title.textContent = 'Stock Crítico (Bajo)';
        sidebar.innerHTML = `
            <h4 style="margin:0; color:var(--danger);">Alerta de Inventario</h4>
            <div style="margin-top:1rem;">
                <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:0.25rem;">Productos en Riesgo:</p>
                <h2 style="margin:0; font-size:1.8rem;">${products.length}</h2>
            </div>
            <p style="margin-top:1rem; font-size:0.85rem;">Se muestran los productos con stock menor a 5 unidades en cualquiera de las empresas.</p>
            <p style="margin-top:auto; font-size:0.75rem; color:var(--text-secondary);">Realice pedidos pronto para evitar quiebres de stock.</p>
        `;

        list.innerHTML = `
            <table class="data-table">
                <thead style="position: sticky; top:0; z-index:10;">
                    <tr>
                        <th>Producto</th>
                        <th class="text-center">Millenio</th>
                        <th class="text-center">Vulcano</th>
                        <th class="text-center">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(p => {
            const mStock = p.stockMillenio || 0;
            const vStock = p.stockVulcano || 0;
            return `
                            <tr>
                                <td>${p.name}</td>
                                <td class="text-center ${mStock < 5 ? 'text-danger fw-bold' : ''}">${mStock}</td>
                                <td class="text-center ${vStock < 5 ? 'text-danger fw-bold' : ''}">${vStock}</td>
                                <td class="text-center">${mStock + vStock}</td>
                            </tr>
                        `;
        }).join('')}
                    ${products.length === 0 ? '<tr><td colspan="4" class="text-center">Todo el stock está en niveles óptimos</td></tr>' : ''}
                </tbody>
            </table>
        `;

        modal.classList.add('show');
    },

    showCreditsDetail() {
        const modal = document.getElementById('dashboard-detail-modal');
        const title = document.getElementById('dashboard-detail-title');
        const sidebar = document.getElementById('dashboard-detail-summary-content');
        const list = document.getElementById('dashboard-detail-list-container');

        const clients = Storage.get(STORAGE_KEYS.CLIENTS).filter(c => (c.balanceMillenio || 0) > 0 || (c.balanceVulcano || 0) > 0);
        const total = clients.reduce((sum, c) => sum + (c.balanceMillenio || 0) + (c.balanceVulcano || 0), 0);

        title.textContent = 'Créditos Pendientes (Deudores)';
        sidebar.innerHTML = `
            <h4 style="margin:0; color:var(--warning);">Cartera de Clientes</h4>
            <div style="margin-top:1rem;">
                <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:0.25rem;">Clientes con Deuda:</p>
                <h2 style="margin:0; font-size:1.8rem;">${clients.length}</h2>
            </div>
            <div style="margin-top:1rem;">
                <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:0.25rem;">Cartera Total:</p>
                <h2 style="margin:0; font-size:1.8rem; color:var(--danger);">$${total.toLocaleString()}</h2>
            </div>
            <p style="margin-top:auto; font-size:0.75rem; color:var(--text-secondary);">Este listado incluye todos los clientes que tienen un saldo pendiente mayor a cero.</p>
        `;

        list.innerHTML = `
            <table class="data-table">
                <thead style="position: sticky; top:0; z-index:10;">
                    <tr>
                        <th>Cliente</th>
                        <th class="text-right">Millenio</th>
                        <th class="text-right">Vulcano</th>
                        <th class="text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${clients.map(c => `
                        <tr>
                            <td>${c.name}</td>
                            <td class="text-right">$${(c.balanceMillenio || 0).toLocaleString()}</td>
                            <td class="text-right">$${(c.balanceVulcano || 0).toLocaleString()}</td>
                            <td class="text-right"><strong>$${((c.balanceMillenio || 0) + (c.balanceVulcano || 0)).toLocaleString()}</strong></td>
                        </tr>
                    `).join('')}
                    ${clients.length === 0 ? '<tr><td colspan="4" class="text-center">No hay créditos pendientes</td></tr>' : ''}
                </tbody>
            </table>
        `;

        modal.classList.add('show');
    }
};
