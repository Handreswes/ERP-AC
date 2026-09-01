// TUCOMPRAS Module
window.TuCompras = {
    activeMainTab: 'pedidos',
    activeStatus: 'despachado',
    specialAlertFilter: null,
    searchQuery: '',
    monthFilter: new Date().toISOString().slice(0, 7),
    cart: [],
    selectedLiquidations: new Set(),
    activeStep: 1,
    activeCompanyFilter: 'all',
    pendingImportOrders: [],
    hideImported: true,
    hideCancelled: true,
    statusFilter: 'active',

    returnCategories: {
        'cliente_no_recibio': '❌ Cliente no recibió',
        'cliente_rechazo': '🚫 Cliente rechazó producto',
        'cliente_no_reclamo': '🏢 Cliente no reclamó en oficina',
        'direccion_incorrecta': '📍 Dirección incorrecta / incompleta',
        'cliente_no_contesto': '📞 Cliente no contestó llamadas/mensajes',
        'producto_equivocado': '📦 Producto equivocado enviado',
        'problema_transporte': '🚚 Problema de transporte / logística',
        'producto_averiado': '⚠️ Producto averiado en transporte',
        'pedido_duplicado': '🔁 Pedido duplicado',
        'otra_causa': '❓ Otra causa / Especificar'
    },

    async init() {
        await this.ensureWalletAccount();
        this.renderPanel();

        // Escuchar sincronización en segundo plano de ventas de TuCompras
        window.addEventListener('erp_table_updated_tucompras_sales', () => {
            console.log('[TuCompras] Ventas actualizadas desde Supabase en segundo plano, refrescando UI...');
            if (document.getElementById('tucompras-panel')) {
                this.updateSalesList();
            }
        });

        // Disparar sincronización inmediata de la tabla al cargar el módulo
        if (window.Storage && window.Storage.syncTable) {
            window.Storage.syncTable(window.STORAGE_KEYS.TUCOMPRAS_SALES).then(() => {
                if (document.getElementById('tucompras-panel')) {
                    this.updateSalesList();
                }
            }).catch(e => console.warn('[TuCompras] Error al sincronizar ventas:', e.message));
        }
    },

    async ensureWalletAccount() {
        const accounts = Storage.get(STORAGE_KEYS.ACCOUNTS) || [];
        const wallet = accounts.find(a => a.id === 'wallet_tucompras' || a.accountNumber === 'WALLET-TC');
        if (!wallet) {
            await Storage.addItem(STORAGE_KEYS.ACCOUNTS, {
                id: 'wallet_tucompras',
                name: 'Billetera TuCompras / Dropi',
                bankName: 'Billetera Digital',
                accountNumber: 'WALLET-TC',
                balance: 0,
                company: 'tucompras'
            });
        }
    },

    getSales() {
        return Storage.get(STORAGE_KEYS.TUCOMPRAS_SALES);
    },

    isOrderImported(order) {
        const sales = this.getSales();
        return sales.find(s => 
            (s.id === 'TC-DR-' + order.id) || 
            (order.tracking_number && s.tracking_number === order.tracking_number)
        );
    },

    parseDropiDateStr(dateStr, timeStr = '') {
        if (!dateStr) return new Date().toISOString();
        const dateParts = dateStr.split(/[-/]/);
        if (dateParts.length === 3) {
            let day, month, year;
            if (dateParts[2].length === 4) {
                day = parseInt(dateParts[0]);
                month = parseInt(dateParts[1]) - 1;
                year = parseInt(dateParts[2]);
            } else if (dateParts[0].length === 4) {
                year = parseInt(dateParts[0]);
                month = parseInt(dateParts[1]) - 1;
                day = parseInt(dateParts[2]);
            } else {
                return new Date().toISOString();
            }
            let hours = 12, minutes = 0;
            if (timeStr) {
                const timeParts = timeStr.split(':');
                if (timeParts.length >= 2) {
                    hours = parseInt(timeParts[0]) || 12;
                    minutes = parseInt(timeParts[1]) || 0;
                }
            }
            try {
                return new Date(year, month, day, hours, minutes).toISOString();
            } catch (e) {
                return new Date().toISOString();
            }
        }
        return new Date().toISOString();
    },

    renderPanel() {
        const contentArea = document.getElementById('content-area');
        let panel = document.getElementById('tucompras-panel');

        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'tucompras-panel';
            panel.className = 'panel';
            contentArea.appendChild(panel);
        }

        panel.innerHTML = `
            <div class="panel-header" style="margin-bottom: 1rem;">
                <h1>E-commerce TUCOMPRAS</h1>
            </div>

            <!-- ARCHITECTURE: TOP 4 MAIN TABS -->
            <div class="inventory-tabs" style="margin-bottom: 1.5rem; gap: 8px; flex-wrap: wrap;">
                <button class="tab-btn ${this.activeMainTab === 'pedidos' ? 'active' : ''}" data-main-tab="pedidos" style="font-weight: 700;">
                    <i class="fas fa-boxes"></i> 1. Gestión de Pedidos
                </button>
                <button class="tab-btn ${this.activeMainTab === 'vendedores' ? 'active' : ''}" data-main-tab="vendedores" style="font-weight: 700; border-color: #f59e0b; color: ${this.activeMainTab === 'vendedores' ? '#fff' : '#f59e0b'};">
                    <i class="fas fa-user-tag"></i> 2. Vendedores & Comisiones
                </button>
                <button class="tab-btn ${this.activeMainTab === 'rentabilidad' ? 'active' : ''}" data-main-tab="rentabilidad" style="font-weight: 700; border-color: #10b981; color: ${this.activeMainTab === 'rentabilidad' ? '#fff' : '#10b981'};">
                    <i class="fas fa-chart-pie"></i> 3. Rentabilidad por Producto
                </button>
                <button class="tab-btn ${this.activeMainTab === 'finanzas' ? 'active' : ''}" data-main-tab="finanzas" style="font-weight: 700; border-color: #a855f7; color: ${this.activeMainTab === 'finanzas' ? '#fff' : '#a855f7'};">
                    <i class="fas fa-university"></i> 4. Wallet, Bodegas & Gastos
                </button>
            </div>

            <div id="tc-alerts-container" style="margin-bottom: 1rem;">
                <!-- Critical Alerts Banner loads here -->
            </div>

            <div id="tucompras-main-content">
                <!-- Main Tab Content loads here -->
            </div>

            <!-- New Sale Modal - WIZARD STYLE -->
            <div id="tucompras-sale-modal" class="modal">
                <div class="modal-content" style="max-width: 900px; width: 95%; border-radius: 24px; overflow: hidden; background: var(--bg-dark);">
                    <div class="modal-header" style="background: var(--bg-sidebar); border-bottom: 1px solid var(--border); padding: 1.5rem 2rem;">
                        <h2 id="tc-wizard-title" style="margin:0; font-size: 1.25rem; display: flex; align-items: center; gap: 10px;">
                            <span class="step-indicator" style="background: var(--accent); color: white; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 0.9rem;">1</span>
                            Información del Cliente
                        </h2>
                        <span class="close-modal">&times;</span>
                    </div>
                    
                    <div class="modal-body" style="padding: 2rem;">
                        
                        <!-- STEP 1: CLIENTE -->
                        <div id="tc-step-1" class="wizard-step">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label>Nombre Completo *</label>
                                    <input type="text" id="tc-cust-name" class="form-control" placeholder="Nombre completo" required>
                                </div>
                                <div class="form-group">
                                    <label>Teléfono *</label>
                                    <input type="text" id="tc-cust-phone" class="form-control" placeholder="300 000 0000" required>
                                </div>
                                <div class="form-group">
                                    <label>Departamento</label>
                                    <select id="tc-cust-dept" class="form-control"></select>
                                </div>
                                <div class="form-group">
                                    <label>Ciudad *</label>
                                    <select id="tc-cust-city" class="form-control" required>
                                        <option value="">Seleccione Departamento primero...</option>
                                    </select>
                                </div>
                                <div class="form-group" style="grid-column: span 2;">
                                    <label>Dirección (Opcional)</label>
                                    <input type="text" id="tc-cust-address" class="form-control" placeholder="Calle, Carrera, Apto...">
                                </div>
                                <div class="form-group" id="tc-cust-city-other-group" style="display: none; grid-column: span 2;">
                                    <label>Escriba Ciudad Manualmente *</label>
                                    <input type="text" id="tc-cust-city-other" class="form-control" placeholder="Nombre de la ciudad o municipio">
                                </div>
                            </div>
                        </div>

                        <!-- STEP 2: PRODUCTOS -->
                        <div id="tc-step-2" class="wizard-step" style="display: none;">
                            <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                                <div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;">
                                    <div style="flex: 1; min-width: 250px; position: relative;">
                                        <i class="fas fa-search" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-secondary); font-size: 1rem;"></i>
                                        <input type="text" id="tc-product-search" class="form-control" placeholder="🔍 Buscar producto por nombre..." style="padding-left: 40px !important; border-radius: 12px; height: 42px; font-size: 0.9rem;">
                                    </div>
                                    <div class="filter-group" style="display: flex; gap: 5px; background: var(--bg-card); padding: 5px; border-radius: 12px; border: 1px solid var(--border);">
                                        <button class="tab-btn btn-sm tc-filter-btn active" data-filter="all">Todas</button>
                                        <button class="tab-btn btn-sm tc-filter-btn" data-filter="millenio">Millenio</button>
                                        <button class="tab-btn btn-sm tc-filter-btn" data-filter="vulcano">Vulcano</button>
                                    </div>
                                </div>

                                <div id="tc-product-grid" class="product-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 15px; max-height: 450px; overflow-y: auto; padding-right: 10px;">
                                    <!-- Dynamic products -->
                                </div>
                            </div>
                        </div>

                        <!-- STEP 3: LOGÍSTICA & RESUMEN -->
                        <div id="tc-step-3" class="wizard-step" style="display: none;">
                            <form id="tucompras-sale-form" class="form-grid">
                                <div class="logistics-section" style="display: flex; flex-direction: column; gap: 1.25rem;">
                                    <h4 style="margin: 0 0 0.5rem 0; font-size: 0.9rem; color: var(--text-secondary);">LOGÍSTICA Y FECHA</h4>
                                    <div class="form-group">
                                        <label style="font-weight: 700; color: #4ade80;"><i class="fas fa-calendar-alt"></i> Fecha del Despacho / Venta *</label>
                                        <input type="datetime-local" id="tc-sale-date-input" name="date" class="form-control" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Vendedor *</label>
                                        <select id="tc-seller-select" name="seller_id" class="form-control" required></select>
                                    </div>
                                    <div class="form-group">
                                        <label>Transportadora</label>
                                        <select name="carrier" class="form-control">
                                            <option value="Interrapidisimo">Interrapidisimo</option>
                                            <option value="Servientrega">Servientrega</option>
                                            <option value="Envía">Envía</option>
                                            <option value="Coordinadora">Coordinadora</option>
                                            <option value="TCC">TCC</option>
                                        </select>
                                    </div>
                                    <div class="form-group">
                                        <label>Número de Guía</label>
                                        <input type="text" name="tracking_number" class="form-control" placeholder="Guía #">
                                    </div>
                                    <div class="form-group">
                                         <label>Flete (Valor Cobrado por Dropi)</label>
                                         <input type="number" name="shipping_cost" class="form-control" required value="0">
                                     </div>
                                     <div class="form-group">
                                         <label style="font-weight: 700; color: #38bdf8;"><i class="fab fa-facebook" style="color: #1877f2;"></i> Campaña de Origen (Meta Ads)</label>
                                         <select id="tc-campaign-select" name="campaign_name" class="form-control">
                                             <option value="">-- Sin campaña / Orgánico / Directo --</option>
                                             <option value="campaña impacto metalica">🔫 campaña impacto metalica (Pistola)</option>
                                             <option value="PACHA Luisa">📦 PACHA Luisa</option>
                                         </select>
                                     </div>
                                </div>

                                <div class="summary-section" style="display: flex; flex-direction: column; gap: 1.25rem;">
                                    <h4 style="margin: 0 0 0.5rem 0; font-size: 0.9rem; color: var(--text-secondary);">RESUMEN DE PRODUCTOS</h4>
                                    <div id="tc-cart-items" style="background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border); padding: 1rem; display: flex; flex-direction: column; gap: 10px; max-height: 250px; overflow-y: auto;">
                                        <!-- Items -->
                                    </div>
                                    <div class="totals-card" style="background: var(--bg-sidebar); border: 1px solid var(--accent); border-radius: 16px; padding: 1.25rem;">
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                            <span>Subtotal Venta:</span>
                                            <strong id="tc-total-sale-text" style="color: var(--accent-vibrant);">$0</strong>
                                        </div>
                                        <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--border); padding-top: 8px;">
                                            <span>Comisión:</span>
                                            <strong id="tc-total-commission-text" style="color: var(--warning);">$0</strong>
                                        </div>
                                    </div>
                                    <button type="submit" class="btn btn-primary btn-block btn-lg" style="height: 56px; border-radius: 16px;">
                                        REGISTRAR DESPACHO
                                    </button>
                                </div>
                            </form>
                        </div>

                    </div>

                    <div class="modal-footer" style="background: var(--bg-sidebar); border-top: 1px solid var(--border); padding: 1.5rem 2rem; display: flex; justify-content: space-between;">
                        <button id="tc-wizard-prev" class="btn btn-outline" style="border-radius: 12px; display: none;">Anterior</button>
                        <div style="flex: 1;"></div>
                        <button id="tc-wizard-next" class="btn btn-primary" style="border-radius: 12px; min-width: 120px;">Siguiente</button>
                    </div>
                </div>
            </div>

            <!-- Update Status Modal -->
            <div id="tc-status-modal" class="modal">
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h2>Actualizar Estado</h2>
                        <span class="close-modal">&times;</span>
                    </div>
                    <div class="modal-body" id="tc-status-modal-body">
                        <!-- Dynamic content -->
                    </div>
                </div>
            </div>
        `;

        this.renderCriticalAlerts();

        if (this.activeMainTab === 'pedidos') {
            this.renderOrdersTab();
        } else if (this.activeMainTab === 'vendedores') {
            this.renderSellerCommissionsView();
        } else if (this.activeMainTab === 'rentabilidad') {
            this.renderProductProfitabilityView();
        } else if (this.activeMainTab === 'finanzas') {
            this.renderFinancesTab();
        }

        this.setupEventListeners();
    },

    renderCriticalAlerts() {
        const container = document.getElementById('tc-alerts-container');
        if (!container) return;

        const sales = this.getSales() || [];
        const now = new Date();

        const uncollectedSales = sales.filter(s => {
            if (s.status !== 'recibido' || s.money_confirmed === true) return false;
            const refDate = s.money_confirmed_at || s.date;
            const days = (now - new Date(refDate)) / (1000 * 60 * 60 * 24);
            return days >= 5;
        });

        const stuckReturns = sales.filter(s => {
            if (s.status !== 'proceso_devolucion') return false;
            const days = (now - new Date(s.date)) / (1000 * 60 * 60 * 24);
            return days >= 10;
        });

        const discrepancySales = sales.filter(s => s.money_confirmed === true && s.reconciliation_status === 'discrepancy');

        if (uncollectedSales.length === 0 && stuckReturns.length === 0 && discrepancySales.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 14px; padding: 12px 16px; margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-exclamation-triangle" style="color: #ef4444; font-size: 1.2rem;"></i>
                    <strong style="color: #f87171; font-size: 0.95rem;">Alertas Críticas de Control Financiero:</strong>
                </div>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    ${uncollectedSales.length > 0 ? `
                        <button class="btn btn-sm tc-alert-trigger" data-alert="uncollected" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid #ef4444; border-radius: 8px; font-size: 0.8rem; cursor: pointer;">
                            🔴 ${uncollectedSales.length} Entregados sin cobro (>5 días)
                        </button>
                    ` : ''}
                    ${stuckReturns.length > 0 ? `
                        <button class="btn btn-sm tc-alert-trigger" data-alert="stuck_returns" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid #f59e0b; border-radius: 8px; font-size: 0.8rem; cursor: pointer;">
                            🟡 ${stuckReturns.length} Devoluciones retenidas (>10 días)
                        </button>
                    ` : ''}
                    ${discrepancySales.length > 0 ? `
                        <button class="btn btn-sm tc-alert-trigger" data-alert="discrepancy" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid #ef4444; border-radius: 8px; font-size: 0.8rem; cursor: pointer;">
                            🔴 ${discrepancySales.length} Discrepancias de dinero en Wallet
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    },

    renderOrdersTab() {
        const container = document.getElementById('tucompras-main-content');
        if (!container) return;

        container.innerHTML = `
            <div class="actions-block" style="margin-bottom: 1.25rem; background: var(--bg-card); padding: 1.25rem 1.5rem; border-radius: 14px; border: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <div>
                    <h3 style="margin: 0; color: var(--text-primary); font-size: 1.1rem;">📦 Control de Pedidos y Despachos TuCompras</h3>
                    <p style="margin: 4px 0 0 0; color: var(--text-secondary); font-size: 0.85rem;">Filtra por estado, busca por cliente o guía y registra nuevos despachos.</p>
                </div>
                <div>
                    <button id="new-tucompras-sale-btn" class="btn btn-primary" style="font-weight: 600;">
                        <i class="fas fa-plus"></i> Nueva Venta
                    </button>
                </div>
            </div>

            <!-- SUB-STATUS TABS -->
            <div class="inventory-tabs" style="margin-bottom: 1.25rem;">
                <button class="tab-btn ${this.activeStatus === 'despachado' ? 'active' : ''}" data-status="despachado">Despachados</button>
                <button class="tab-btn ${this.activeStatus === 'recibido' ? 'active' : ''}" data-status="recibido">Entregados</button>
                <button class="tab-btn ${this.activeStatus === 'proceso_devolucion' ? 'active' : ''}" data-status="proceso_devolucion">En Proceso Dev.</button>
                <button class="tab-btn ${this.activeStatus === 'devolucion_recibida' ? 'active' : ''}" data-status="devolucion_recibida">Devueltos</button>
            </div>

            <!-- BUSCADOR EN TIEMPO REAL -->
            <div style="margin-bottom: 1rem; display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
                <div style="flex: 1; min-width: 280px; position: relative;">
                    <i class="fas fa-search" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-secondary);"></i>
                    <input type="text" id="tc-order-search" class="form-control" placeholder="🔍 Buscar por cliente, guía #, teléfono, vendedor, producto o ciudad..." value="${this.searchQuery || ''}" style="padding-left: 40px; height: 44px; border-radius: 12px; font-size: 0.9rem;">
                </div>
                ${this.searchQuery ? `
                    <button class="btn btn-outline btn-sm" id="tc-clear-search-btn" style="border-radius: 10px; height: 44px;"><i class="fas fa-times"></i> Limpiar Búsqueda</button>
                ` : ''}
            </div>

            ${this.specialAlertFilter === 'uncollected' ? `
                <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; padding: 10px 16px; border-radius: 12px; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <span style="color: #f87171; font-weight: 600;">
                        <i class="fas fa-exclamation-circle"></i> Filtrando: 🔴 Pedidos entregados sin cobro (>5 días)
                    </span>
                    <button class="btn btn-outline btn-sm" id="tc-clear-alert-filter-btn" style="border-color: #ef4444; color: #f87171; border-radius: 8px;">Ver Todos los Entregados</button>
                </div>
            ` : ''}

            ${this.specialAlertFilter === 'stuck_returns' ? `
                <div style="background: rgba(245, 158, 11, 0.15); border: 1px solid #f59e0b; padding: 10px 16px; border-radius: 12px; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <span style="color: #fbbf24; font-weight: 600;">
                        <i class="fas fa-exclamation-triangle"></i> Filtrando: 🟡 Devoluciones retenidas (>10 días)
                    </span>
                    <button class="btn btn-outline btn-sm" id="tc-clear-alert-filter-btn" style="border-color: #f59e0b; color: #fbbf24; border-radius: 8px;">Ver Todas las Devoluciones</button>
                </div>
            ` : ''}

            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Cliente / Logística</th>
                            <th>Productos</th>
                            <th>Vendedor</th>
                            <th>${this.activeStatus === 'proceso_devolucion' || this.activeStatus === 'devolucion_recibida' ? 'Causa / Observaciones' : 'Precio Venta'}</th>
                            <th>${this.activeStatus === 'proceso_devolucion' || this.activeStatus === 'devolucion_recibida' ? 'Flete Perdido' : 'Comisión'}</th>
                            <th>${this.activeStatus === 'proceso_devolucion' || this.activeStatus === 'devolucion_recibida' ? 'Estado Físico' : 'Utilidad'}</th>
                            <th>Estado Pago</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="tucompras-sales-list"></tbody>
                </table>
            </div>
        `;

        this.updateSalesList();

        const searchInput = document.getElementById('tc-order-search');
        if (searchInput) {
            searchInput.oninput = (e) => {
                this.searchQuery = e.target.value;
                this.updateSalesList();
            };
        }

        const clearSearchBtn = document.getElementById('tc-clear-search-btn');
        if (clearSearchBtn) {
            clearSearchBtn.onclick = () => {
                this.searchQuery = '';
                this.renderOrdersTab();
            };
        }

        const clearAlertBtn = document.getElementById('tc-clear-alert-filter-btn');
        if (clearAlertBtn) {
            clearAlertBtn.onclick = () => {
                this.specialAlertFilter = null;
                this.renderOrdersTab();
            };
        }
    },

    renderSellerCommissionsView() {
        const container = document.getElementById('tucompras-main-content');
        if (!container) return;

        const allSales = this.getSales() || [];
        const month = this.monthFilter || new Date().toISOString().slice(0, 7);

        let sales = allSales;
        if (month !== 'all') {
            sales = sales.filter(s => {
                const d = s.date || s.createdAt;
                return d && d.startsWith(month);
            });
        }

        const sellers = this.getSellersList() || [];
        const sellerStatsMap = {};

        sales.forEach(s => {
            const sId = s.seller_id || 'vendedor_general';
            const sellerObj = sellers.find(sel => sel.id === sId);
            const sellerName = sellerObj ? sellerObj.name : 'Vendedor General';

            if (!sellerStatsMap[sId]) {
                sellerStatsMap[sId] = {
                    id: sId,
                    name: sellerName,
                    totalSalesCount: 0,
                    deliveredCount: 0,
                    totalRevenue: 0,
                    pendingCommission: 0,
                    paidCommission: 0
                };
            }

            const totalSale = s.items ? s.items.reduce((sum, i) => sum + (parseFloat(i.sale_price || 0) * (parseInt(i.qty) || 1)), 0) : parseFloat(s.sale_price || 0);
            const totalComm = s.items ? s.items.reduce((sum, i) => sum + (parseFloat(i.commission_paid || 0) * (parseInt(i.qty) || 1)), 0) : parseFloat(s.commission_paid || 0);

            sellerStatsMap[sId].totalSalesCount += 1;
            if (s.status === 'recibido') {
                sellerStatsMap[sId].deliveredCount += 1;
                sellerStatsMap[sId].totalRevenue += totalSale;
            }

            if (s.is_commission_paid) {
                sellerStatsMap[sId].paidCommission += totalComm;
            } else {
                sellerStatsMap[sId].pendingCommission += totalComm;
            }
        });

        const sellerStatsList = Object.values(sellerStatsMap).sort((a, b) => b.totalRevenue - a.totalRevenue);

        container.innerHTML = `
            <div style="background: var(--bg-card); border-radius: 16px; padding: 1.5rem; border: 1px solid var(--border);">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
                    <div>
                        <h3 style="margin:0; color: #f59e0b;"><i class="fas fa-user-tag"></i> Liquidación de Rendimiento y Comisiones por Vendedor</h3>
                        <p style="margin: 4px 0 0 0; color: var(--text-secondary); font-size: 0.85rem;">Filtra por mes para calcular y liquidar los pagos de fin de mes a Cindy, Luisa, Laura, etc.</p>
                    </div>
                    <div style="display:flex; align-items:center; gap: 10px;">
                        <label style="font-weight: 600; font-size: 0.9rem;">Período:</label>
                        <input type="month" id="tc-seller-month-select" class="form-control" value="${month === 'all' ? '' : month}" style="max-width: 170px;">
                        <button class="btn btn-outline btn-sm" id="tc-seller-all-months-btn" style="border-radius: 8px;">Ver Todo el Histórico</button>
                    </div>
                </div>

                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Vendedor</th>
                                <th>Despachos Totales</th>
                                <th>Entregas Exitosas</th>
                                <th>Facturado Real ($)</th>
                                <th>Comisión Pendiente ($)</th>
                                <th>Comisión Pagada ($)</th>
                                <th>Comisión Total ($)</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sellerStatsList.map(v => `
                                <tr>
                                    <td><strong>${v.name}</strong></td>
                                    <td>${v.totalSalesCount} pedidos</td>
                                    <td><span class="badge bg-success">${v.deliveredCount} entregados</span></td>
                                    <td>$${v.totalRevenue.toLocaleString('es-CO')}</td>
                                    <td><strong style="color: #f59e0b; font-size: 1rem;">$${v.pendingCommission.toLocaleString('es-CO')} COP</strong></td>
                                    <td><span style="color: #10b981;">$${v.paidCommission.toLocaleString('es-CO')} COP</span></td>
                                    <td><strong>$${(v.pendingCommission + v.paidCommission).toLocaleString('es-CO')} COP</strong></td>
                                    <td>
                                        ${v.pendingCommission > 0 ? `
                                            <button class="btn btn-primary btn-sm tc-pay-seller-comm-btn" data-seller-id="${v.id}" style="border-radius: 8px;">
                                                <i class="fas fa-hand-holding-usd"></i> Pagar Comisión
                                            </button>
                                        ` : '<span class="badge bg-success">Al Día</span>'}
                                    </td>
                                </tr>
                            `).join('')}
                            ${sellerStatsList.length === 0 ? '<tr><td colspan="8" class="text-center text-secondary">No hay ventas registradas en el período seleccionado.</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        const monthSelect = document.getElementById('tc-seller-month-select');
        if (monthSelect) {
            monthSelect.onchange = (e) => {
                this.monthFilter = e.target.value || 'all';
                this.renderPanel();
            };
        }

        const allMonthsBtn = document.getElementById('tc-seller-all-months-btn');
        if (allMonthsBtn) {
            allMonthsBtn.onclick = () => {
                this.monthFilter = 'all';
                this.renderPanel();
            };
        }
    },

    renderProductProfitabilityView() {
        const container = document.getElementById('tucompras-main-content');
        if (!container) return;

        const allSales = this.getSales() || [];
        const month = this.monthFilter || new Date().toISOString().slice(0, 7);

        let sales = allSales;
        if (month !== 'all') {
            sales = sales.filter(s => {
                const d = s.date || s.createdAt;
                return d && d.startsWith(month);
            });
        }

        const products = Inventory.getProducts() || [];
        const productStatsMap = {};

        sales.forEach(s => {
            const isDelivered = s.status === 'recibido';
            const isReturn = s.status === 'proceso_devolucion' || s.status === 'devolucion_recibida' || s.status === 'devuelto';
            const items = s.items && s.items.length > 0 ? s.items : [{ product_id: s.product_id, qty: 1, sale_price: s.sale_price, cost_price: s.cost_price, commission_paid: s.commission_paid }];

            items.forEach(item => {
                const prod = products.find(p => p.id === item.product_id);
                const pName = prod ? prod.name : (item.name || 'Producto Desconocido');
                const pId = item.product_id || pName;

                if (!productStatsMap[pId]) {
                    productStatsMap[pId] = {
                        name: pName,
                        shippedQty: 0,
                        deliveredQty: 0,
                        returnedQty: 0,
                        revenue: 0,
                        cogs: 0,
                        shippingLoss: 0,
                        commissions: 0
                    };
                }

                const qty = parseInt(item.qty) || 1;
                productStatsMap[pId].shippedQty += qty;

                if (isDelivered) {
                    productStatsMap[pId].deliveredQty += qty;
                    productStatsMap[pId].revenue += parseFloat(item.sale_price || 0) * qty;
                    productStatsMap[pId].cogs += parseFloat(item.cost_price || 0) * qty;
                    productStatsMap[pId].commissions += parseFloat(item.commission_paid || 0) * qty;
                } else if (isReturn) {
                    productStatsMap[pId].returnedQty += qty;
                    productStatsMap[pId].shippingLoss += (parseFloat(s.shipping_loss || 0) / items.length);
                }
            });
        });

        // FILTER OUT PRODUCTS WITH 0 MOVEMENTS! Only show products with shippedQty > 0
        const productStatsList = Object.values(productStatsMap)
            .filter(p => p.shippedQty > 0)
            .map(p => {
                const netMargin = p.revenue - p.cogs - p.shippingLoss - p.commissions;
                const marginRate = p.revenue > 0 ? Math.round((netMargin / p.revenue) * 100) : 0;
                const deliveryRate = p.shippedQty > 0 ? Math.round((p.deliveredQty / p.shippedQty) * 100) : 0;
                return { ...p, netMargin, marginRate, deliveryRate };
            }).sort((a, b) => b.revenue - a.revenue);

        container.innerHTML = `
            <div style="background: var(--bg-card); border-radius: 16px; padding: 1.5rem; border: 1px solid var(--border);">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
                    <div>
                        <h3 style="margin:0; color: #10b981;"><i class="fas fa-boxes"></i> Comparativo de Rentabilidad Real por Producto</h3>
                        <p style="margin: 4px 0 0 0; color: var(--text-secondary); font-size: 0.85rem;">Analiza el margen neto real descontando costos, fletes de devolución y comisiones. Mostrando solo productos con ventas.</p>
                    </div>
                    <div style="display:flex; align-items:center; gap: 10px;">
                        <label style="font-weight: 600; font-size: 0.9rem;">Período Evaluado:</label>
                        <input type="month" id="tc-product-month-select" class="form-control" value="${month === 'all' ? '' : month}" style="max-width: 170px;">
                        <button class="btn btn-outline btn-sm" id="tc-product-all-months-btn" style="border-radius: 8px;">Ver Todo el Histórico</button>
                    </div>
                </div>

                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Despachados</th>
                                <th>Efectividad Entregas</th>
                                <th>Ingreso Bruto</th>
                                <th>Costo (COGS)</th>
                                <th>Fletes Dev.</th>
                                <th>Comisiones</th>
                                <th>Utilidad Neta Producto</th>
                                <th>Margen %</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${productStatsList.map(p => `
                                <tr>
                                    <td><strong>${p.name}</strong></td>
                                    <td>${p.shippedQty} unids.</td>
                                    <td>
                                        <span class="badge ${p.deliveryRate >= 70 ? 'bg-success' : 'bg-warning'}">
                                            ${p.deliveredQty}✅ / ${p.returnedQty}❌ (${p.deliveryRate}%)
                                        </span>
                                    </td>
                                    <td>$${p.revenue.toLocaleString('es-CO')}</td>
                                    <td>$${p.cogs.toLocaleString('es-CO')}</td>
                                    <td><span style="color:#ef4444;">$${p.shippingLoss.toLocaleString('es-CO')}</span></td>
                                    <td><span style="color:#f59e0b;">$${p.commissions.toLocaleString('es-CO')}</span></td>
                                    <td><strong style="color: ${p.netMargin >= 0 ? '#10b981' : '#ef4444'}; font-size: 0.9rem;">$${p.netMargin.toLocaleString('es-CO')} COP</strong></td>
                                    <td><span class="badge ${p.marginRate >= 20 ? 'bg-success' : (p.marginRate > 0 ? 'bg-warning' : 'bg-danger')}">${p.marginRate}%</span></td>
                                </tr>
                            `).join('')}
                            ${productStatsList.length === 0 ? '<tr><td colspan="9" class="text-center text-secondary">No hay productos con movimientos en el período seleccionado.</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        const monthSelect = document.getElementById('tc-product-month-select');
        if (monthSelect) {
            monthSelect.onchange = (e) => {
                this.monthFilter = e.target.value || 'all';
                this.renderPanel();
            };
        }

        const allMonthsBtn = document.getElementById('tc-product-all-months-btn');
        if (allMonthsBtn) {
            allMonthsBtn.onclick = () => {
                this.monthFilter = 'all';
                this.renderPanel();
            };
        }
    },

    renderFinancesTab() {
        const container = document.getElementById('tucompras-main-content');
        if (!container) return;

        if (!['liquidacion', 'conciliacion', 'retiros', 'importar_dropi', 'gastos'].includes(this.activeStatus)) {
            this.activeStatus = 'liquidacion';
        }

        container.innerHTML = `
            <div class="inventory-tabs" style="margin-bottom: 1.5rem; gap: 8px; flex-wrap: wrap;">
                <button class="tab-btn ${this.activeStatus === 'liquidacion' ? 'active' : ''}" data-status="liquidacion" style="border: 1px solid var(--accent);">Liquidación Bodegas</button>
                <button class="tab-btn ${this.activeStatus === 'conciliacion' ? 'active' : ''}" data-status="conciliacion" style="border: 1px solid #10b981; color: #10b981;"><i class="fas fa-coins"></i> Conciliación Wallet</button>
                <button class="tab-btn ${this.activeStatus === 'retiros' ? 'active' : ''}" data-status="retiros" style="border: 1px solid #a855f7; color: #a855f7;"><i class="fas fa-hand-holding-usd"></i> Retiro Utilidades</button>
                <button class="tab-btn ${this.activeStatus === 'importar_dropi' ? 'active' : ''}" data-status="importar_dropi" style="border: 1px solid var(--success);"><i class="fas fa-cloud-download-alt"></i> Importar Dropi</button>
                <button class="tab-btn ${this.activeStatus === 'gastos' ? 'active' : ''}" data-status="gastos" style="border: 1px solid var(--warning);"><i class="fas fa-wallet"></i> Gastos TuCompras</button>
            </div>
            <div id="tc-finances-subcontent"></div>
        `;

        if (this.activeStatus === 'liquidacion') {
            this.renderLiquidationView();
        } else if (this.activeStatus === 'conciliacion') {
            this.renderConciliationView();
        } else if (this.activeStatus === 'retiros') {
            this.renderWithdrawalsView();
        } else if (this.activeStatus === 'importar_dropi') {
            this.renderImportDropiView();
        } else if (this.activeStatus === 'gastos') {
            this.renderExpensesView();
        }
    },

    async paySellerCommissions(sellerId) {
        const month = this.monthFilter || new Date().toISOString().slice(0, 7);
        const sellers = this.getSellersList() || [];
        const seller = sellers.find(s => s.id === sellerId);
        const sellerName = seller ? seller.name : 'Vendedor';

        const sales = (this.getSales() || []).filter(s => {
            const matchesSeller = (s.seller_id || 'vendedor_general') === sellerId;
            const matchesMonth = month === 'all' || (s.date && s.date.startsWith(month));
            return matchesSeller && matchesMonth && !s.is_commission_paid;
        });

        if (sales.length === 0) {
            alert('No hay comisiones pendientes por pagar para este vendedor en el período.');
            return;
        }

        const totalToPay = sales.reduce((sum, s) => {
            const comm = s.items ? s.items.reduce((ss, i) => ss + (parseFloat(i.commission_paid || 0) * (parseInt(i.qty) || 1)), 0) : parseFloat(s.commission_paid || 0);
            return sum + comm;
        }, 0);

        if (!confirm(`¿Confirmas registrar el pago de $${totalToPay.toLocaleString('es-CO')} COP en comisiones a "${sellerName}" para el período (${month})?`)) {
            return;
        }

        for (const sale of sales) {
            sale.is_commission_paid = true;
            sale.commission_paid_at = new Date().toISOString();
            await Storage.updateItem(STORAGE_KEYS.TUCOMPRAS_SALES, sale.id, sale);
        }

        alert(`✅ Comisiones de "${sellerName}" marcadas como PAGADAS exitosamente.`);
        this.renderPanel();
    },

    renderConciliationView() {
        const container = document.getElementById('tucompras-main-content');
        if (!container) return;

        const sales = this.getSales() || [];

        let totalExpectedNet = 0;
        let totalReceivedReal = 0;
        let totalDiscrepancies = 0;

        sales.forEach(s => {
            if (s.status === 'cancelado') return;
            const totalSale = s.items ? s.items.reduce((sum, i) => sum + (parseFloat(i.sale_price || 0) * (parseInt(i.qty) || 1)), 0) : parseFloat(s.sale_price || 0);
            const shippingCost = parseFloat(s.shipping_cost || 0);
            const netExp = Math.max(0, totalSale - shippingCost);

            totalExpectedNet += netExp;

            if (s.money_confirmed) {
                const netRec = parseFloat(s.money_received_value !== undefined ? s.money_received_value : netExp);
                totalReceivedReal += netRec;
                if (s.discrepancy_value) {
                    totalDiscrepancies += Math.abs(parseFloat(s.discrepancy_value) || 0);
                }
            }
        });

        container.innerHTML = `
            <div style="margin-bottom: 1.5rem;">
                <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                    <div class="stat-card" style="background: var(--bg-card); border-left: 4px solid var(--accent);">
                        <h3>Total Neto Esperado</h3>
                        <p class="stat-value" style="color: var(--accent-vibrant);">$${totalExpectedNet.toLocaleString('es-CO')}</p>
                        <span style="font-size: 0.75rem; color: var(--text-secondary);">Ventas activas (Valor venta - Flete)</span>
                    </div>
                    <div class="stat-card" style="background: var(--bg-card); border-left: 4px solid #10b981;">
                        <h3>Total Ingresado a Wallet</h3>
                        <p class="stat-value" style="color: #10b981;">$${totalReceivedReal.toLocaleString('es-CO')}</p>
                        <span style="font-size: 0.75rem; color: var(--text-secondary);">Dinero confirmado en billetera</span>
                    </div>
                    <div class="stat-card" style="background: var(--bg-card); border-left: 4px solid ${totalDiscrepancies > 0 ? '#ef4444' : '#10b981'};">
                        <h3>Discrepancias / Fletes Extra</h3>
                        <p class="stat-value" style="color: ${totalDiscrepancies > 0 ? '#ef4444' : '#10b981'};">$${totalDiscrepancies.toLocaleString('es-CO')}</p>
                        <span style="font-size: 0.75rem; color: var(--text-secondary);">Diferencias entre esperado vs recibido</span>
                    </div>
                </div>

                <div class="table-container">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; padding: 0 5px;">
                        <h3 style="margin:0;"><i class="fas fa-coins" style="color:#10b981;"></i> Conciliación de Wallet y Billetera Digital</h3>
                        <button class="btn btn-outline btn-sm" onclick="TuCompras.renderPanel()"><i class="fas fa-sync"></i> Actualizar</button>
                    </div>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Guía / Transp.</th>
                                <th>Cliente</th>
                                <th>Valor Venta</th>
                                <th>Flete Est.</th>
                                <th>Neto Esperado</th>
                                <th>Neto Recibido</th>
                                <th>Diferencia</th>
                                <th>Estado Conciliación</th>
                                <th>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sales.map(s => {
                                const totalSale = s.items ? s.items.reduce((sum, i) => sum + (parseFloat(i.sale_price || 0) * (parseInt(i.qty) || 1)), 0) : parseFloat(s.sale_price || 0);
                                const shippingCost = parseFloat(s.shipping_cost || 0);
                                const netExp = Math.max(0, totalSale - shippingCost);
                                const netRec = s.money_confirmed ? parseFloat(s.money_received_value !== undefined ? s.money_received_value : netExp) : 0;
                                const diff = s.money_confirmed ? (netRec - netExp) : 0;

                                let statusBadge = '';
                                if (!s.money_confirmed) {
                                    statusBadge = '<span class="badge bg-warning">🟡 Pendiente Cobro</span>';
                                } else if (Math.abs(diff) < 1) {
                                    statusBadge = '<span class="badge bg-success">🟢 Recibido OK</span>';
                                } else {
                                    statusBadge = `<span class="badge bg-danger">🔴 Diferencia ($${diff.toLocaleString('es-CO')})</span>`;
                                }

                                return `
                                    <tr>
                                        <td>${new Date(s.date).toLocaleDateString()}</td>
                                        <td><strong>${s.carrier || '-'}</strong><br><span style="font-size:0.75rem; color:var(--text-secondary);">${s.tracking_number || '-'}</span></td>
                                        <td><strong>${s.customer_name || 'N/A'}</strong><br><span style="font-size:0.75rem; color:var(--text-secondary);">${s.customer_phone || ''}</span></td>
                                        <td>$${totalSale.toLocaleString('es-CO')}</td>
                                        <td>$${shippingCost.toLocaleString('es-CO')}</td>
                                        <td><strong style="color: var(--accent-vibrant);">$${netExp.toLocaleString('es-CO')}</strong></td>
                                        <td><strong style="color: #10b981;">${s.money_confirmed ? '$' + netRec.toLocaleString('es-CO') : '-'}</strong></td>
                                        <td><strong style="color: ${diff < 0 ? '#ef4444' : '#10b981'};">${s.money_confirmed ? (diff >= 0 ? '+' : '') + '$' + diff.toLocaleString('es-CO') : '-'}</strong></td>
                                        <td>${statusBadge}</td>
                                        <td>
                                            <button class="btn btn-sm btn-outline" onclick="TuCompras.openStatusModal('${s.id}')">
                                                <i class="fas ${s.money_confirmed ? 'fa-edit' : 'fa-check'}"></i> ${s.money_confirmed ? 'Editar' : 'Conciliar'}
                                            </button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                            ${sales.length === 0 ? '<tr><td colspan="10" class="text-center">No hay ventas registradas para conciliar</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    updateStats() {
        const sales = this.getSales() || [];
        const container = document.getElementById('tc-stats-container');
        if (!container) return;

        // Executive Financial Calculations
        let grossSales = 0;
        let totalCOGS = 0;
        let totalShippingCostDelivered = 0;
        let totalShippingLosses = 0;
        let totalCommissions = 0;

        sales.forEach(s => {
            const totalSale = s.items ? s.items.reduce((sum, i) => sum + (parseFloat(i.sale_price || 0) * (parseInt(i.qty) || 1)), 0) : parseFloat(s.sale_price || 0);
            const totalCost = s.items ? s.items.reduce((sum, i) => sum + (parseFloat(i.cost_price || 0) * (parseInt(i.qty) || 1)), 0) : parseFloat(s.cost_price || 0);
            const totalComm = s.items ? s.items.reduce((sum, i) => sum + (parseFloat(i.commission_paid || 0) * (parseInt(i.qty) || 1)), 0) : parseFloat(s.commission_paid || 0);

            if (s.status === 'recibido') {
                grossSales += totalSale;
                totalCOGS += totalCost;
                totalShippingCostDelivered += parseFloat(s.shipping_cost || 0);
                totalCommissions += totalComm;
            } else if (s.status === 'proceso_devolucion' || s.status === 'devolucion_recibida' || s.status === 'devuelto') {
                totalShippingLosses += parseFloat(s.shipping_loss || 0);
            }
        });

        const tcExpenses = (Storage.get(STORAGE_KEYS.EXPENSES) || []).filter(e => e.company === 'tucompras');
        const totalExpenses = tcExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        const netUtility = grossSales - totalCOGS - totalShippingCostDelivered - totalShippingLosses - totalCommissions - totalExpenses;
        const netMarginRate = grossSales > 0 ? Math.round((netUtility / grossSales) * 100) : 0;

        const debtMillenio = sales
            .filter(s => s.status === 'recibido' && s.money_confirmed && !s.is_paid_to_inventory && s.inventory_source === 'millenio')
            .reduce((sum, s) => sum + (s.items ? s.items.reduce((ss, i) => ss + (parseFloat(i.cost_price) * i.qty), 0) : s.cost_price), 0);

        const debtVulcano = sales
            .filter(s => s.status === 'recibido' && s.money_confirmed && !s.is_paid_to_inventory && s.inventory_source === 'vulcano')
            .reduce((sum, s) => sum + (s.items ? s.items.reduce((ss, i) => ss + (parseFloat(i.cost_price) * i.qty), 0) : s.cost_price), 0);

        // Product Breakdown Metrics (Pachas vs. Pistolas, etc.)
        const products = Inventory.getProducts() || [];
        const productStatsMap = {};

        sales.forEach(s => {
            const isDelivered = s.status === 'recibido';
            const isReturn = s.status === 'proceso_devolucion' || s.status === 'devolucion_recibida' || s.status === 'devuelto';
            const items = s.items && s.items.length > 0 ? s.items : [{ product_id: s.product_id, qty: 1, sale_price: s.sale_price, cost_price: s.cost_price, commission_paid: s.commission_paid }];

            items.forEach(item => {
                const prod = products.find(p => p.id === item.product_id);
                const pName = prod ? prod.name : (item.name || 'Producto Desconocido');
                const pId = item.product_id || pName;

                if (!productStatsMap[pId]) {
                    productStatsMap[pId] = {
                        name: pName,
                        shippedQty: 0,
                        deliveredQty: 0,
                        returnedQty: 0,
                        revenue: 0,
                        cogs: 0,
                        shippingLoss: 0,
                        commissions: 0
                    };
                }

                const qty = parseInt(item.qty) || 1;
                productStatsMap[pId].shippedQty += qty;

                if (isDelivered) {
                    productStatsMap[pId].deliveredQty += qty;
                    productStatsMap[pId].revenue += parseFloat(item.sale_price || 0) * qty;
                    productStatsMap[pId].cogs += parseFloat(item.cost_price || 0) * qty;
                    productStatsMap[pId].commissions += parseFloat(item.commission_paid || 0) * qty;
                } else if (isReturn) {
                    productStatsMap[pId].returnedQty += qty;
                    productStatsMap[pId].shippingLoss += (parseFloat(s.shipping_loss || 0) / items.length);
                }
            });
        });

        const productStatsList = Object.values(productStatsMap).map(p => {
            const netMargin = p.revenue - p.cogs - p.shippingLoss - p.commissions;
            const marginRate = p.revenue > 0 ? Math.round((netMargin / p.revenue) * 100) : 0;
            const deliveryRate = p.shippedQty > 0 ? Math.round((p.deliveredQty / p.shippedQty) * 100) : 0;
            return { ...p, netMargin, marginRate, deliveryRate };
        }).sort((a, b) => b.revenue - a.revenue);

        // Seller Breakdown Metrics (Cindy, Andrés, Web, etc.)
        const sellers = this.getSellersList() || [];
        const sellerStatsMap = {};

        sales.forEach(s => {
            const sId = s.seller_id || 'vendedor_general';
            const sellerObj = sellers.find(sel => sel.id === sId);
            const sellerName = sellerObj ? sellerObj.name : 'Vendedor General';

            if (!sellerStatsMap[sId]) {
                sellerStatsMap[sId] = {
                    name: sellerName,
                    totalSalesCount: 0,
                    deliveredCount: 0,
                    totalRevenue: 0,
                    pendingCommission: 0,
                    paidCommission: 0
                };
            }

            const totalSale = s.items ? s.items.reduce((sum, i) => sum + (parseFloat(i.sale_price || 0) * (parseInt(i.qty) || 1)), 0) : parseFloat(s.sale_price || 0);
            const totalComm = s.items ? s.items.reduce((sum, i) => sum + (parseFloat(i.commission_paid || 0) * (parseInt(i.qty) || 1)), 0) : parseFloat(s.commission_paid || 0);

            sellerStatsMap[sId].totalSalesCount += 1;
            if (s.status === 'recibido') {
                sellerStatsMap[sId].deliveredCount += 1;
                sellerStatsMap[sId].totalRevenue += totalSale;
            }

            if (s.is_commission_paid) {
                sellerStatsMap[sId].paidCommission += totalComm;
            } else {
                sellerStatsMap[sId].pendingCommission += totalComm;
            }
        });

        const sellerStatsList = Object.values(sellerStatsMap).sort((a, b) => b.totalRevenue - a.totalRevenue);

        container.innerHTML = `
            <div style="margin-bottom: 1.5rem;">
                <h3 style="margin: 0 0 1rem 0; font-size: 1rem; color: var(--text-secondary);"><i class="fas fa-chart-line" style="color: var(--accent);"></i> Dashboard Ejecutivo & Rentabilidad Neta Real</h3>
                
                <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                    <div class="stat-card" style="border-left: 4px solid #3b82f6;">
                        <h3>Ventas Brutas</h3>
                        <p class="stat-value" style="color: #3b82f6; font-size: 1.5rem;">$${grossSales.toLocaleString('es-CO')}</p>
                        <span style="font-size: 0.72rem; color: var(--text-secondary);">Pedidos entregados</span>
                    </div>
                    <div class="stat-card" style="border-left: 4px solid #64748b;">
                        <h3>Costo Mercancía (COGS)</h3>
                        <p class="stat-value" style="color: #64748b; font-size: 1.5rem;">$${totalCOGS.toLocaleString('es-CO')}</p>
                        <span style="font-size: 0.72rem; color: var(--text-secondary);">Costo de inventario</span>
                    </div>
                    <div class="stat-card" style="border-left: 4px solid #ef4444;">
                        <h3>Fletes & Pérdidas Dev.</h3>
                        <p class="stat-value" style="color: #ef4444; font-size: 1.5rem;">$${(totalShippingCostDelivered + totalShippingLosses).toLocaleString('es-CO')}</p>
                        <span style="font-size: 0.72rem; color: var(--text-secondary);">Fletes exitosos + fallidos</span>
                    </div>
                    <div class="stat-card" style="border-left: 4px solid #f59e0b;">
                        <h3>Comisiones Vendedores</h3>
                        <p class="stat-value" style="color: #f59e0b; font-size: 1.5rem;">$${totalCommissions.toLocaleString('es-CO')}</p>
                        <span style="font-size: 0.72rem; color: var(--text-secondary);">Pagadas / Liquidadas</span>
                    </div>
                    <div class="stat-card" style="border-left: 4px solid #a855f7;">
                        <h3>Gastos OPEX & Ads</h3>
                        <p class="stat-value" style="color: #a855f7; font-size: 1.5rem;">$${totalExpenses.toLocaleString('es-CO')}</p>
                        <span style="font-size: 0.72rem; color: var(--text-secondary);">Publicidad y varios</span>
                    </div>
                    <div class="stat-card" style="background: linear-gradient(135deg, rgba(16,185,129,0.12), transparent); border-left: 4px solid #10b981;">
                        <h3>Utilidad Neta Real (${netMarginRate}%)</h3>
                        <p class="stat-value" style="color: #10b981; font-size: 1.6rem;">$${netUtility.toLocaleString('es-CO')}</p>
                        <span style="font-size: 0.72rem; color: var(--text-secondary);">Cindy (50%): $${Math.max(0, netUtility / 2).toLocaleString('es-CO')} | Andrés: $${Math.max(0, netUtility / 2).toLocaleString('es-CO')}</span>
                    </div>
                </div>

                <!-- Product Profitability Table -->
                <div class="table-container" style="background: var(--bg-card); border-radius: 16px; padding: 1.25rem; margin-top: 1rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
                        <h4 style="margin:0; color: var(--accent-vibrant); font-size: 0.95rem;"><i class="fas fa-boxes"></i> Comparativo de Rentabilidad Real por Producto (Pachas vs. Pistolas, etc.)</h4>
                        <span class="badge bg-secondary" style="font-size: 0.75rem;">${productStatsList.length} Productos Evaluados</span>
                    </div>
                    <table class="data-table" style="font-size: 0.82rem;">
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Despachados</th>
                                <th>Efectividad Entregas</th>
                                <th>Ingreso Bruto</th>
                                <th>Costo (COGS)</th>
                                <th>Fletes Dev.</th>
                                <th>Comisiones</th>
                                <th>Utilidad Neta Producto</th>
                                <th>Margen %</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${productStatsList.map(p => `
                                <tr>
                                    <td><strong>${p.name}</strong></td>
                                    <td>${p.shippedQty} unids.</td>
                                    <td>
                                        <span class="badge ${p.deliveryRate >= 70 ? 'bg-success' : 'bg-warning'}">
                                            ${p.deliveredQty}✅ / ${p.returnedQty}❌ (${p.deliveryRate}%)
                                        </span>
                                    </td>
                                    <td>$${p.revenue.toLocaleString('es-CO')}</td>
                                    <td>$${p.cogs.toLocaleString('es-CO')}</td>
                                    <td><span style="color:#ef4444;">$${p.shippingLoss.toLocaleString('es-CO')}</span></td>
                                    <td><span style="color:#f59e0b;">$${p.commissions.toLocaleString('es-CO')}</span></td>
                                    <td><strong style="color: ${p.netMargin >= 0 ? '#10b981' : '#ef4444'}; font-size: 0.9rem;">$${p.netMargin.toLocaleString('es-CO')} COP</strong></td>
                                    <td><span class="badge ${p.marginRate >= 20 ? 'bg-success' : (p.marginRate > 0 ? 'bg-warning' : 'bg-danger')}">${p.marginRate}%</span></td>
                                </tr>
                            `).join('')}
                            ${productStatsList.length === 0 ? '<tr><td colspan="9" class="text-center text-secondary">No hay datos suficientes de ventas para productos</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>

                <!-- Seller Breakdown Table -->
                <div class="table-container" style="background: var(--bg-card); border-radius: 16px; padding: 1.25rem; margin-top: 1rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 1rem;">
                        <h4 style="margin:0; color: #f59e0b; font-size: 0.95rem;"><i class="fas fa-user-tag"></i> Rendimiento y Comisiones por Vendedor (Cindy, Andrés, Web, etc.)</h4>
                        <span class="badge bg-secondary" style="font-size: 0.75rem;">${sellerStatsList.length} Vendedores</span>
                    </div>
                    <table class="data-table" style="font-size: 0.82rem;">
                        <thead>
                            <tr>
                                <th>Vendedor</th>
                                <th>Despachos Totales</th>
                                <th>Entregas Exitosas</th>
                                <th>Facturado Real</th>
                                <th>Comisión Pendiente</th>
                                <th>Comisión Pagada</th>
                                <th>Comisión Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sellerStatsList.map(sel => `
                                <tr>
                                    <td><strong>${sel.name}</strong></td>
                                    <td>${sel.totalSalesCount} pedidos</td>
                                    <td><span class="badge bg-success">${sel.deliveredCount} entregas</span></td>
                                    <td><strong style="color: var(--accent-vibrant);">$${sel.totalRevenue.toLocaleString('es-CO')} COP</strong></td>
                                    <td><strong style="color: #f59e0b;">$${sel.pendingCommission.toLocaleString('es-CO')} COP</strong></td>
                                    <td><strong style="color: #10b981;">$${sel.paidCommission.toLocaleString('es-CO')} COP</strong></td>
                                    <td>$${(sel.pendingCommission + sel.paidCommission).toLocaleString('es-CO')} COP</td>
                                </tr>
                            `).join('')}
                            ${sellerStatsList.length === 0 ? '<tr><td colspan="7" class="text-center text-secondary">No hay vendedores registrados</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderSalesView() {
        const container = document.getElementById('tucompras-main-content');
        const isReturnView = this.activeStatus === 'proceso_devolucion' || this.activeStatus === 'devolucion_recibida';

        let returnStatsHTML = '';
        if (isReturnView) {
            const allSales = this.getSales() || [];
            const returnSales = allSales.filter(s => s.status === 'proceso_devolucion' || s.status === 'devolucion_recibida' || s.status === 'devuelto');
            const totalLoss = returnSales.reduce((sum, s) => sum + (parseFloat(s.shipping_loss) || 0), 0);
            const pendingPhysical = returnSales.filter(s => s.physical_return_status !== 'received').length;
            const receivedPhysical = returnSales.filter(s => s.physical_return_status === 'received').length;

            const reasonCounts = {};
            returnSales.forEach(s => {
                if (s.return_reason_category) {
                    reasonCounts[s.return_reason_category] = (reasonCounts[s.return_reason_category] || 0) + 1;
                }
            });
            const topReasonKey = Object.keys(reasonCounts).sort((a, b) => reasonCounts[b] - reasonCounts[a])[0];
            const topReasonLabel = topReasonKey && this.returnCategories[topReasonKey] ? this.returnCategories[topReasonKey] : 'Sin Categorizar';

            returnStatsHTML = `
                <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                    <div class="stat-card" style="background: var(--bg-card); border-left: 4px solid #ef4444;">
                        <h3>Pérdida Total Fletes Devueltos</h3>
                        <p class="stat-value" style="color: #ef4444;">$${totalLoss.toLocaleString('es-CO')}</p>
                        <span style="font-size: 0.75rem; color: var(--text-secondary);">Cargos por fletes fallidos</span>
                    </div>
                    <div class="stat-card" style="background: var(--bg-card); border-left: 4px solid #f59e0b;">
                        <h3>En Camino (Pendientes Bodega)</h3>
                        <p class="stat-value" style="color: #f59e0b;">${pendingPhysical} Paquetes</p>
                        <span style="font-size: 0.75rem; color: var(--text-secondary);">Pendiente recepción física</span>
                    </div>
                    <div class="stat-card" style="background: var(--bg-card); border-left: 4px solid #10b981;">
                        <h3>Recibidos Físicamente</h3>
                        <p class="stat-value" style="color: #10b981;">${receivedPhysical} Paquetes</p>
                        <span style="font-size: 0.75rem; color: var(--text-secondary);">Stock reingresado a bodega</span>
                    </div>
                    <div class="stat-card" style="background: var(--bg-card); border-left: 4px solid #3b82f6;">
                        <h3>Principal Motivo</h3>
                        <p class="stat-value" style="font-size: 1.1rem; color: var(--text-primary); margin-top: 5px;">${topReasonLabel}</p>
                        <span style="font-size: 0.75rem; color: var(--text-secondary);">Causa más frecuente</span>
                    </div>
                </div>
            `;
        }

        container.innerHTML = `
            ${returnStatsHTML}
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Cliente / Logística</th>
                            <th>Productos</th>
                            <th>Vendedor</th>
                            <th>${isReturnView ? 'Causa / Observaciones' : 'Precio Venta'}</th>
                            <th>${isReturnView ? 'Flete Perdido' : 'Comisión'}</th>
                            <th>${isReturnView ? 'Estado Físico' : 'Utilidad'}</th>
                            <th>Estado Pago</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="tucompras-sales-list"></tbody>
                </table>
            </div>
        `;
        this.updateSalesList();
    },

    updateSalesList() {
        let sales = this.getSales().filter(s => s.status === this.activeStatus);

        // Special Alert Filter
        if (this.specialAlertFilter === 'uncollected') {
            const now = new Date();
            sales = sales.filter(s => {
                if (s.status !== 'recibido' || s.money_confirmed === true) return false;
                const refDate = s.money_confirmed_at || s.date;
                const days = (now - new Date(refDate)) / (1000 * 60 * 60 * 24);
                return days >= 5;
            });
        } else if (this.specialAlertFilter === 'stuck_returns') {
            const now = new Date();
            sales = sales.filter(s => {
                if (s.status !== 'proceso_devolucion') return false;
                const days = (now - new Date(s.date)) / (1000 * 60 * 60 * 24);
                return days >= 10;
            });
        }

        // Live Search Query Filter
        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase().trim();
            const sellers = this.getSellersList() || [];
            const products = Inventory.getProducts() || [];

            sales = sales.filter(s => {
                const customer = (s.customer_name || '').toLowerCase();
                const phone = (s.customer_phone || '').toLowerCase();
                const tracking = (s.tracking_number || '').toLowerCase();
                const carrier = (s.carrier || '').toLowerCase();
                const city = (s.customer_city || '').toLowerCase();
                const sellerName = (sellers.find(sel => sel.id === s.seller_id)?.name || '').toLowerCase();
                const itemNames = (s.items || []).map(i => {
                    const pName = products.find(p => p.id === i.product_id)?.name || i.name || '';
                    return pName.toLowerCase();
                }).join(' ');

                return customer.includes(q) || 
                       phone.includes(q) || 
                       tracking.includes(q) || 
                       carrier.includes(q) || 
                       city.includes(q) || 
                       sellerName.includes(q) || 
                       itemNames.includes(q);
            });
        }

        sales.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
        const list = document.getElementById('tucompras-sales-list');
        if (!list) return;

        const isReturnView = this.activeStatus === 'proceso_devolucion' || this.activeStatus === 'devolucion_recibida';

        if (sales.length === 0) {
            list.innerHTML = '<tr><td colspan="9" class="text-center">No hay registros</td></tr>';
            return;
        }

        const sellers = this.getSellersList();
        const products = Inventory.getProducts();

        list.innerHTML = sales.map(s => {
            const seller = sellers.find(sel => sel.id === s.seller_id)?.name || 'N/A';
            const customer = s.customer_name || 'Sin Cliente';

            let productNames = "";
            if (s.items && s.items.length > 0) {
                productNames = s.items.map(i => {
                    const pName = products.find(p => p.id === i.product_id)?.name || 'Producto Elimi.';
                    return `${i.qty}x ${pName}`;
                }).join('<br>');
            } else {
                productNames = products.find(p => p.id === s.product_id)?.name || 'Prod. Antiguo';
            }

            const totalSaleValue = s.items ? s.items.reduce((sum, i) => sum + (parseFloat(i.sale_price) * i.qty), 0) : s.sale_price;
            const totalCostValue = s.items ? s.items.reduce((sum, i) => sum + (parseFloat(i.cost_price) * i.qty), 0) : s.cost_price;
            const totalCommValue = s.items ? s.items.reduce((sum, i) => sum + (parseFloat(i.commission_paid) * i.qty), 0) : s.commission_paid;

            let utility = 0;
            if (s.status === 'recibido') {
                utility = totalSaleValue - totalCostValue - totalCommValue - parseFloat(s.shipping_cost);
            } else if (s.status === 'proceso_devolucion' || s.status === 'devolucion_recibida') {
                utility = -(parseFloat(s.shipping_loss) || 0);
            }

            let col5 = `<strong>$${parseFloat(totalSaleValue).toLocaleString()}</strong>`;
            let col6 = `<strong class="text-orange">$${parseFloat(totalCommValue).toLocaleString()}</strong>`;
            let col7 = `<strong class="${utility >= 0 ? 'text-success' : 'text-danger'}">$${utility.toLocaleString()}</strong>`;

            if (isReturnView) {
                const causeLabel = s.return_reason_category && this.returnCategories[s.return_reason_category] ? this.returnCategories[s.return_reason_category] : 'Sin Causa';
                col5 = `<strong style="font-size: 0.8rem; color: #f59e0b;">${causeLabel}</strong>${s.return_observations ? `<br><span style="font-size:0.75rem; color:var(--text-secondary);">${s.return_observations}</span>` : ''}`;
                col6 = `<strong class="text-danger">$${parseFloat(s.shipping_loss || 0).toLocaleString('es-CO')}</strong>`;
                col7 = `<span class="badge ${s.physical_return_status === 'received' ? 'bg-success' : 'bg-warning'}">${s.physical_return_status === 'received' ? '📦 En Bodega' : '🚚 En Camino'}</span>`;
            }

            return `
                <tr class="${s.status === 'proceso_devolucion' ? 'highlight-return' : ''}">
                    <td data-label="Fecha"><span>${new Date(s.date).toLocaleDateString()}</span></td>
                    <td data-label="Cliente">
                        <div style="font-size: 0.85rem;">
                            <strong>${customer}</strong><br>
                            <span class="text-secondary">
                                ${s.carrier || 'N/A'}: 
                                <a href="${Locations.getTrackingUrl(s.carrier, s.tracking_number)}" target="_blank" class="tracking-link">
                                    ${s.tracking_number || '-'}
                                </a>
                            </span>
                        </div>
                    </td>
                    <td data-label="Productos"><span style="font-size: 0.8rem;">${productNames}</span></td>
                    <td data-label="Vendedor"><span>${seller}</span></td>
                    <td data-label="${isReturnView ? 'Causa' : 'Precio Venta'}">${col5}</td>
                    <td data-label="${isReturnView ? 'Flete Perdido' : 'Comisión'}">${col6}</td>
                    <td data-label="${isReturnView ? 'Estado Físico' : 'Utilidad'}">${col7}</td>
                    <td data-label="Estado Pago">
                        <span class="badge ${s.money_confirmed ? 'bg-success' : 'bg-secondary'}">
                            ${s.money_confirmed ? 'PAGADA' : 'PENDIENTE'}
                        </span>
                    </td>
                    <td data-label="Acciones" class="tc-table-actions">
                        ${isReturnView ? `
                            <button class="btn btn-sm btn-warning" onclick="TuCompras.openReturnModal('${s.id}')" title="Gestionar Causa y Trámite"><i class="fas fa-undo-alt"></i> Devolución</button>
                        ` : `
                            <button class="btn btn-sm btn-outline tc-update-btn" data-id="${s.id}" title="Cambiar Estado"><i class="fas fa-sync-alt"></i> Estado</button>
                        `}
                        <button class="btn btn-sm btn-outline tc-edit-btn" data-id="${s.id}" style="color: var(--accent); border-color: var(--accent);" title="Editar Venta"><i class="fas fa-edit"></i> Editar</button>
                        <button class="btn btn-sm btn-outline tc-delete-sale-btn" data-id="${s.id}" style="color: #ef4444; border-color: rgba(239,68,68,0.3);" title="Eliminar Venta"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    getSellersList() {
        let sellers = [];
        if (window.Vendedores && typeof window.Vendedores.getSellers === 'function') {
            sellers = Vendedores.getSellers() || [];
        }
        if (!sellers || sellers.length === 0) {
            sellers = Storage.get(STORAGE_KEYS.SELLERS) || [];
        }
        if (!sellers || sellers.length === 0) {
            sellers = [
                { id: 'vendedor_cindy', name: 'Cindy', status: 'activo' },
                { id: 'vendedor_andres', name: 'Andrés', status: 'activo' },
                { id: 'vendedor_web', name: 'Vendedor Web / Meta Ads', status: 'activo' },
                { id: 'vendedor_general', name: 'Vendedor General', status: 'activo' }
            ];
            Storage.set(STORAGE_KEYS.SELLERS, sellers);
        }
        return sellers;
    },

    populateSellersDropdown(selectId = 'tc-seller-select') {
        const select = document.getElementById(selectId);
        if (!select) return;

        const sellers = this.getSellersList();
        const activeSellers = sellers.filter(s => 
            s && s.name && (
                s.status === 'active' || 
                s.status === 'activo' || 
                s.active === true || 
                (!s.status && s.active !== false) ||
                (s.status !== 'inactive' && s.status !== 'inactivo')
            )
        );

        const listToRender = activeSellers.length > 0 ? activeSellers : sellers;

        select.innerHTML = '<option value="">Seleccione Vendedor...</option>' + 
            listToRender.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    },

    renderLiquidationView() {
        const container = document.getElementById('tucompras-main-content');
        this.selectedLiquidations.clear();

        container.innerHTML = `
            <div class="actions-row" style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
                <div class="alert alert-info" style="margin:0;">
                    <i class="fas fa-check-double"></i> Selecciona una o varias ventas para liquidar el pago a bodega.
                </div>
                <button id="tc-batch-pay-btn" class="btn btn-success" disabled>Pagar Seleccionados ($0)</button>
            </div>

            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th style="width: 40px;"><input type="checkbox" id="tc-select-all-liq"></th>
                            <th>Fecha</th>
                            <th>Bodega</th>
                            <th>Productos / Cliente</th>
                            <th>Valor a Pagar</th>
                            <th>Guía</th>
                        </tr>
                    </thead>
                    <tbody id="tucompras-liquidation-list"></tbody>
                </table>
            </div>
        `;
        this.updateLiquidationList();
    },

    updateLiquidationList() {
        const sales = this.getSales().filter(s => s.status === 'recibido' && s.money_confirmed && !s.is_paid_to_inventory);
        const list = document.getElementById('tucompras-liquidation-list');
        if (!list) return;

        if (sales.length === 0) {
            list.innerHTML = '<tr><td colspan="6" class="text-center">No hay liquidaciones pendientes</td></tr>';
            return;
        }

        const products = Inventory.getProducts();

        list.innerHTML = sales.map(s => {
            let totalCostValue = 0;
            let productSummary = "";
            if (s.items) {
                totalCostValue = s.items.reduce((sum, i) => sum + (parseFloat(i.cost_price) * i.qty), 0);
                productSummary = s.items.map(i => `${i.qty}x ${products.find(p => p.id === i.product_id)?.name || 'Prod'}`).join(', ');
            } else {
                totalCostValue = parseFloat(s.cost_price);
            }

            return `
                <tr>
                    <td data-label="Seleccionar"><input type="checkbox" class="tc-liq-checkbox" data-id="${s.id}" data-amount="${totalCostValue}" ${this.selectedLiquidations.has(s.id) ? 'checked' : ''}></td>
                    <td data-label="Fecha">${new Date(s.date).toLocaleDateString()}</td>
                    <td data-label="Bodega"><span class="badge ${s.inventory_source === 'millenio' ? 'bg-blue' : 'bg-orange'}">${s.inventory_source}</span></td>
                    <td data-label="Productos / Cliente" style="font-size: 0.8rem;">
                        <strong>${productSummary}</strong><br>
                        <span class="text-secondary">Cli: ${s.customer_name || 'N/A'}</span>
                    </td>
                    <td data-label="Valor a Pagar"><strong>$${totalCostValue.toLocaleString()}</strong></td>
                    <td data-label="Guía">${s.tracking_number || '-'}</td>
                </tr>
            `;
        }).join('');
    },

    setupEventListeners() {
        const panel = document.getElementById('tucompras-panel');
        if (!panel) return;

        panel.onclick = async (e) => {
            const mainTabBtn = e.target.closest('[data-main-tab]');
            if (mainTabBtn) {
                this.activeMainTab = mainTabBtn.dataset.mainTab;
                this.specialAlertFilter = null;
                this.renderPanel();
                return;
            }

            const alertBtn = e.target.closest('.tc-alert-trigger');
            if (alertBtn) {
                const alertType = alertBtn.dataset.alert;
                if (alertType === 'uncollected') {
                    this.activeMainTab = 'pedidos';
                    this.activeStatus = 'recibido';
                    this.specialAlertFilter = 'uncollected';
                } else if (alertType === 'stuck_returns') {
                    this.activeMainTab = 'pedidos';
                    this.activeStatus = 'proceso_devolucion';
                    this.specialAlertFilter = 'stuck_returns';
                } else if (alertType === 'discrepancy') {
                    this.activeMainTab = 'finanzas';
                    this.activeStatus = 'conciliacion';
                    this.specialAlertFilter = 'discrepancy';
                }
                this.renderPanel();
                return;
            }

            const payCommBtn = e.target.closest('.tc-pay-seller-comm-btn');
            if (payCommBtn) {
                await this.paySellerCommissions(payCommBtn.dataset.sellerId);
                return;
            }

            const tabBtn = e.target.closest('.inventory-tabs .tab-btn');
            if (tabBtn && tabBtn.dataset.status) {
                this.activeStatus = tabBtn.dataset.status;
                this.renderPanel();
                return;
            }

            const newSaleBtn = e.target.closest('#new-tucompras-sale-btn');
            if (newSaleBtn) {
                this.openNewSaleModal();
                return;
            }

            const wizardNextBtn = e.target.closest('#tc-wizard-next');
            if (wizardNextBtn) {
                this.navigateWizard(1);
                return;
            }

            const wizardPrevBtn = e.target.closest('#tc-wizard-prev');
            if (wizardPrevBtn) {
                this.navigateWizard(-1);
                return;
            }

            const filterBtn = e.target.closest('.tc-filter-btn');
            if (filterBtn) {
                document.querySelectorAll('.tc-filter-btn').forEach(b => b.classList.remove('active'));
                filterBtn.classList.add('active');
                this.activeCompanyFilter = filterBtn.dataset.filter;
                this.renderProductGrid(document.getElementById('tc-product-search')?.value || '');
                return;
            }

            const updateBtn = e.target.closest('.tc-update-btn');
            if (updateBtn) {
                this.openStatusModal(updateBtn.dataset.id);
                return;
            }

            const editBtn = e.target.closest('.tc-edit-btn');
            if (editBtn) {
                this.openEditSaleModal(editBtn.dataset.id);
                return;
            }

            const delSaleBtn = e.target.closest('.tc-delete-sale-btn');
            if (delSaleBtn) {
                this.deleteSale(delSaleBtn.dataset.id);
                return;
            }

            if (e.target.id === 'tc-batch-pay-btn') {
                this.processBatchPayment();
                return;
            }

            const addToCartBtn = e.target.closest('.tc-add-btn');
            if (addToCartBtn) {
                this.addToCart(addToCartBtn.dataset.id);
                return;
            }

            const removeFromCartBtn = e.target.closest('.tc-remove-item');
            if (removeFromCartBtn) {
                this.removeFromCart(removeFromCartBtn.dataset.id);
                return;
            }

            if (e.target.id === 'tc-add-expense-btn') {
                const modal = document.getElementById('tc-expense-modal');
                if (modal) modal.classList.add('show');
                return;
            }

            const delExpenseBtn = e.target.closest('.tc-delete-expense-btn');
            if (delExpenseBtn) {
                if (confirm('¿Seguro que deseas eliminar este gasto?')) {
                    await Storage.deleteItem(STORAGE_KEYS.EXPENSES, delExpenseBtn.dataset.id);
                    this.renderPanel();
                }
                return;
            }

            if (e.target.classList.contains('close-modal') || e.target.classList.contains('tc-close-modal')) {
                document.querySelectorAll('.modal').forEach(m => m.classList.remove('show'));
                return;
            }

            // --- Dropi Import click handlers ---
            if (e.target.id === 'tc-save-dropi-key-btn') {
                const keyInput = document.getElementById('tc-dropi-key');
                if (keyInput) {
                    localStorage.setItem('erp_dropi_integration_key', keyInput.value.trim());
                    alert('Token de Dropi guardado.');
                    this.renderPanel();
                }
                return;
            }

            if (e.target.id === 'tc-process-dropi-btn') {
                const text = document.getElementById('tc-dropi-raw')?.value;
                if (!text) {
                    alert('Por favor pega el texto de Dropi primero.');
                    return;
                }
                const parsed = this.parseDropiData(text);
                if (parsed.length > 0) {
                    this.pendingImportOrders = parsed;
                    this.renderPanel();
                    alert(`Se procesaron ${parsed.length} pedidos. Por favor verifícalos abajo.`);
                } else {
                    alert('No se encontraron pedidos válidos. Verifica el formato pegado.');
                }
                return;
            }

            if (e.target.id === 'tc-clear-pending-import-btn') {
                if (confirm('¿Deseas vaciar la lista de pedidos pendientes de importación?')) {
                    this.pendingImportOrders = [];
                    this.renderPanel();
                }
                return;
            }

            if (e.target.id === 'tc-batch-assign-seller-btn') {
                const sellerId = document.getElementById('tc-batch-seller-select')?.value;
                if (!sellerId) {
                    alert('Por favor selecciona un vendedor.');
                    return;
                }
                const checked = document.querySelectorAll('.tc-import-check:checked');
                if (checked.length === 0) {
                    alert('Selecciona al menos un pedido marcando la casilla a la izquierda.');
                    return;
                }
                checked.forEach(cb => {
                    const idx = parseInt(cb.dataset.index);
                    this.pendingImportOrders[idx].seller_id = sellerId;
                    const row = document.getElementById(`tc-pending-row-${idx}`);
                    if (row) {
                        row.classList.remove('highlight-warning');
                        const sel = row.querySelector('.tc-order-seller-select');
                        if (sel) {
                            sel.value = sellerId;
                            sel.style.borderColor = 'var(--border)';
                        }
                    }
                });
                alert(`Vendedor asignado a ${checked.length} pedidos.`);
                return;
            }

            const importSingleBtn = e.target.closest('.tc-import-single-btn');
            if (importSingleBtn) {
                const idx = parseInt(importSingleBtn.dataset.index);
                this.handleImportOrders([idx]);
                return;
            }

            if (e.target.id === 'tc-batch-import-submit-btn') {
                const checked = document.querySelectorAll('.tc-import-check:checked');
                if (checked.length === 0) {
                    alert('Selecciona al menos un pedido para importar.');
                    return;
                }
                const indices = Array.from(checked).map(cb => parseInt(cb.dataset.index));
                this.handleImportOrders(indices);
                return;
            }
            // --- End Dropi Import click handlers ---
        };

        panel.onchange = (e) => {
            if (e.target.id === 'tc-filter-hide-imported') {
                this.hideImported = e.target.checked;
                this.renderPanel();
                return;
            }

            if (e.target.id === 'tc-filter-hide-cancelled') {
                this.hideCancelled = e.target.checked;
                this.renderPanel();
                return;
            }

            if (e.target.id === 'tc-filter-dropi-status') {
                this.statusFilter = e.target.value;
                this.renderPanel();
                return;
            }

            if (e.target.id === 'tc-cust-dept') {
                Locations.populateCities(e.target.value, 'tc-cust-city');
                const otherGroup = document.getElementById('tc-cust-city-other-group');
                if (otherGroup) otherGroup.style.display = 'none';
            }

            if (e.target.id === 'tc-cust-city') {
                const otherGroup = document.getElementById('tc-cust-city-other-group');
                if (otherGroup) {
                    otherGroup.style.display = (e.target.value === 'OTRO' || e.target.value.includes('OTRO')) ? 'block' : 'none';
                }
            }

            if (e.target.id === 'tc-select-all-liq') {
                const checkboxes = document.querySelectorAll('.tc-liq-checkbox');
                checkboxes.forEach(cb => {
                    cb.checked = e.target.checked;
                    if (cb.checked) this.selectedLiquidations.add(cb.dataset.id);
                    else this.selectedLiquidations.delete(cb.dataset.id);
                });
                this.updateBatchButton();
            }

            if (e.target.classList.contains('tc-liq-checkbox')) {
                if (e.target.checked) this.selectedLiquidations.add(e.target.dataset.id);
                else this.selectedLiquidations.delete(e.target.dataset.id);
                this.updateBatchButton();
            }

            // --- Dropi Import change handlers ---
            if (e.target.id === 'tc-import-select-all') {
                const checked = e.target.checked;
                document.querySelectorAll('.tc-import-check').forEach(cb => cb.checked = checked);
                return;
            }

            if (e.target.classList.contains('tc-item-product-select')) {
                const orderIdx = parseInt(e.target.dataset.orderIdx);
                const itemIdx = parseInt(e.target.dataset.itemIdx);
                const prodId = e.target.value;
                this.pendingImportOrders[orderIdx].items[itemIdx].mapped_product_id = prodId;
                e.target.style.borderColor = prodId ? 'var(--border)' : '#ef4444';
                const icon = e.target.nextElementSibling;
                if (icon) {
                    icon.className = prodId ? 'fas fa-check-circle text-success' : 'fas fa-exclamation-circle text-danger';
                }
                return;
            }

            if (e.target.classList.contains('tc-item-warehouse-select')) {
                const orderIdx = parseInt(e.target.dataset.orderIdx);
                const itemIdx = parseInt(e.target.dataset.itemIdx);
                this.pendingImportOrders[orderIdx].items[itemIdx].inventory_source = e.target.value;
                return;
            }

            if (e.target.classList.contains('tc-order-seller-select')) {
                const orderIdx = parseInt(e.target.dataset.orderIdx);
                const sellerId = e.target.value;
                this.pendingImportOrders[orderIdx].seller_id = sellerId;
                e.target.style.borderColor = sellerId ? 'var(--border)' : '#f59e0b';
                
                const row = document.getElementById(`tc-pending-row-${orderIdx}`);
                if (row) row.classList.toggle('highlight-warning', !sellerId);
                return;
            }
            // --- End Dropi Import change handlers ---
        };

        const prodSearch = document.getElementById('tc-product-search');
        if (prodSearch) prodSearch.oninput = (e) => this.renderProductGrid(e.target.value);

        const form = document.getElementById('tucompras-sale-form');
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                await this.handleNewSale(new FormData(form));
            };
        }

        const expForm = document.getElementById('tc-expense-form');
        if (expForm) {
            expForm.onsubmit = async (e) => {
                e.preventDefault();
                const formData = new FormData(expForm);
                const data = {
                    company: 'tucompras',
                    category: formData.get('category'),
                    concept: formData.get('concept'),
                    amount: parseFloat(formData.get('amount')) || 0,
                    date: new Date().toISOString(),
                    notes: formData.get('notes') || '',
                    originAccount: 'cash'
                };
                await Storage.addItem(STORAGE_KEYS.EXPENSES, data);
                alert('Gasto registrado con éxito.');
                this.renderPanel();
            };
        }

        // --- File input & API Sync button listeners ---
        const fileInput = document.getElementById('tc-dropi-file');
        if (fileInput) {
            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        const textarea = document.getElementById('tc-dropi-raw');
                        if (textarea) textarea.value = evt.target.result;
                    };
                    reader.readAsText(file);
                }
            };
        }

        const syncApiBtn = document.getElementById('tc-sync-dropi-api-btn');
        if (syncApiBtn) {
            syncApiBtn.onclick = async () => {
                const key = localStorage.getItem('erp_dropi_integration_key');
                if (!key) { alert('No hay token de Dropi guardado.'); return; }
                
                try {
                    syncApiBtn.disabled = true;
                    syncApiBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sincronizando...';
                    
                    const response = await fetch('https://api.dropi.co/orders/myorders', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'dropi-integration-key': key
                        },
                        body: JSON.stringify({
                            limit: 50,
                            offset: 0
                        })
                    });
                    
                    if (!response.ok) throw new Error(`Status: ${response.status}`);
                    const json = await response.json();
                    
                    if (json && json.data) {
                        const parsed = this.parseDropiData(JSON.stringify(json.data));
                        if (parsed.length > 0) {
                            this.pendingImportOrders = parsed;
                            this.renderPanel();
                            alert(`Sincronización exitosa: ${parsed.length} pedidos cargados.`);
                        } else {
                            alert('No se encontraron pedidos nuevos en la respuesta de Dropi.');
                        }
                    } else {
                        alert('Respuesta inesperada de Dropi: ' + JSON.stringify(json));
                    }
                } catch (err) {
                    console.error('[TUCOMPRAS] Dropi API Sync Error:', err);
                    alert(`❌ Error de Sincronización: ${err.message}\n\nNota: Esto puede deberse a restricciones de CORS en tu navegador local. Te recomendamos exportar el reporte CSV de Dropi y pegarlo en el cuadro de texto para una importación directa y segura sin dependencias.`);
                } finally {
                    syncApiBtn.disabled = false;
                    syncApiBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Sincronizar API Dropi';
                }
            };
        }
    },

    updateBatchButton() {
        const btn = document.getElementById('tc-batch-pay-btn');
        if (!btn) return;

        let totalVal = 0;
        const sales = this.getSales();
        this.selectedLiquidations.forEach(id => {
            const s = sales.find(x => x.id === id);
            if (s) {
                totalVal += s.items ? s.items.reduce((sum, i) => sum + (parseFloat(i.cost_price) * i.qty), 0) : s.cost_price;
            }
        });

        btn.disabled = this.selectedLiquidations.size === 0;
        btn.textContent = `Pagar Seleccionados ($${totalVal.toLocaleString()})`;
    },

    async processBatchPayment() {
        const sales = this.getSales();
        const millenioSales = [];
        const vulcanoSales = [];
        let millenioAmount = 0;
        let vulcanoAmount = 0;

        this.selectedLiquidations.forEach(id => {
            const s = sales.find(x => x.id === id);
            if (s) {
                const cost = s.items ? s.items.reduce((sum, i) => sum + (parseFloat(i.cost_price) * i.qty), 0) : parseFloat(s.cost_price || 0);
                if (s.inventory_source === 'millenio') {
                    millenioSales.push(s);
                    millenioAmount += cost;
                } else if (s.inventory_source === 'vulcano') {
                    vulcanoSales.push(s);
                    vulcanoAmount += cost;
                }
            }
        });

        if (millenioSales.length === 0 && vulcanoSales.length === 0) {
            alert('No se encontraron ventas seleccionadas válidas.');
            return;
        }

        let confirmMsg = '¿Confirmas el pago de las siguientes liquidaciones?\n';
        if (millenioAmount > 0) confirmMsg += `- Millenio: $${millenioAmount.toLocaleString()} (${millenioSales.length} ventas)\n`;
        if (vulcanoAmount > 0) confirmMsg += `- Vulcano: $${vulcanoAmount.toLocaleString()} (${vulcanoSales.length} ventas)\n`;
        if (!confirm(confirmMsg)) return;

        // Process Millenio Destination Account
        let millenioDestAccount = 'cash';
        if (millenioAmount > 0) {
            const millenioAccounts = Storage.get(STORAGE_KEYS.ACCOUNTS).filter(a => a.company === 'millenio');
            let optionsText = "Selecciona la cuenta de destino para MILLENIO (escribe el número correspondiente):\n\n0: Caja Efectivo\n";
            millenioAccounts.forEach((acc, index) => {
                optionsText += `${index + 1}: ${acc.bankName} - ${acc.name} ($${parseFloat(acc.balance || 0).toLocaleString()})\n`;
            });
            
            const selection = prompt(optionsText, "0");
            if (selection === null) return; // cancelled
            
            if (selection !== "0") {
                const idx = parseInt(selection) - 1;
                if (millenioAccounts[idx]) {
                    millenioDestAccount = millenioAccounts[idx].id;
                } else {
                    alert('Selección de cuenta Millenio inválida. Proceso cancelado.');
                    return;
                }
            }
        }

        // Process Vulcano Destination Account
        let vulcanoDestAccount = 'cash';
        if (vulcanoAmount > 0) {
            const vulcanoAccounts = Storage.get(STORAGE_KEYS.ACCOUNTS).filter(a => a.company === 'vulcano');
            let optionsText = "Selecciona la cuenta de destino para VULCANO (escribe el número correspondiente):\n\n0: Caja Efectivo\n";
            vulcanoAccounts.forEach((acc, index) => {
                optionsText += `${index + 1}: ${acc.bankName} - ${acc.name} ($${parseFloat(acc.balance || 0).toLocaleString()})\n`;
            });
            
            const selection = prompt(optionsText, "0");
            if (selection === null) return; // cancelled
            
            if (selection !== "0") {
                const idx = parseInt(selection) - 1;
                if (vulcanoAccounts[idx]) {
                    vulcanoDestAccount = vulcanoAccounts[idx].id;
                } else {
                    alert('Selección de cuenta Vulcano inválida. Proceso cancelado.');
                    return;
                }
            }
        }

        // Save Inflow Movements
        if (millenioAmount > 0) {
            await Storage.addItem(STORAGE_KEYS.MOVEMENTS, {
                company: 'millenio',
                type: 'inflow',
                originAccount: 'tucompras',
                destinationAccount: millenioDestAccount,
                amount: millenioAmount,
                concept: `Liquidación Bodega TuCompras (${millenioSales.length} ventas)`,
                date: new Date().toISOString(),
                notes: `Guías: ${millenioSales.map(s => s.tracking_number || s.id).join(', ')}`
            });
        }

        if (vulcanoAmount > 0) {
            await Storage.addItem(STORAGE_KEYS.MOVEMENTS, {
                company: 'vulcano',
                type: 'inflow',
                originAccount: 'tucompras',
                destinationAccount: vulcanoDestAccount,
                amount: vulcanoAmount,
                concept: `Liquidación Bodega TuCompras (${vulcanoSales.length} ventas)`,
                date: new Date().toISOString(),
                notes: `Guías: ${vulcanoSales.map(s => s.tracking_number || s.id).join(', ')}`
            });
        }

        // Update Sales status in Storage
        for (const sale of [...millenioSales, ...vulcanoSales]) {
            sale.is_paid_to_inventory = true;
            sale.inventory_paid_at = new Date().toISOString();
            await Storage.updateItem(STORAGE_KEYS.TUCOMPRAS_SALES, sale.id, sale);
        }

        alert('Liquidación a bodegas procesada y registrada en Finanzas con éxito.');
        this.selectedLiquidations.clear();
        this.renderPanel();
    },

    openNewSaleModal() {
        this.editingSaleId = null;
        this.cart = [];
        this.activeStep = 1;
        this.activeCompanyFilter = 'all';
        this.updateCartUI();
        this.renderProductGrid();
        this.updateWizardUI();

        // Location Data
        Locations.populateDepartments('tc-cust-dept');
        Locations.populateCities('', 'tc-cust-city');
        const otherGrp = document.getElementById('tc-cust-city-other-group');
        if (otherGrp) otherGrp.style.display = 'none';

        // Sellers Dropdown
        this.populateSellersDropdown('tc-seller-select');

        const form = document.getElementById('tucompras-sale-form');
        if (form) form.reset();
        
        document.getElementById('tc-cust-name').value = '';
        document.getElementById('tc-cust-phone').value = '';
        const searchInput = document.getElementById('tc-product-search');
        if (searchInput) searchInput.value = '';

        // Default sale date to current local datetime
        const dateInput = document.getElementById('tc-sale-date-input');
        if (dateInput) {
            const now = new Date();
            const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
            dateInput.value = localIso;
        }

        const wizardTitle = document.getElementById('tc-wizard-title');
        if (wizardTitle) {
            wizardTitle.innerHTML = `<span class="step-indicator" style="background: var(--accent); color: white; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 0.9rem;">1</span> Información del Cliente`;
        }

        document.getElementById('tucompras-sale-modal').classList.add('show');
    },

    openEditSaleModal(saleId) {
        const sale = this.getSales().find(s => s.id === saleId);
        if (!sale) return;

        this.openNewSaleModal();
        this.editingSaleId = saleId;
        this.cart = sale.items ? JSON.parse(JSON.stringify(sale.items)) : [];
        this.updateCartUI();
        this.renderProductGrid();

        document.getElementById('tc-cust-name').value = sale.customer_name || '';
        document.getElementById('tc-cust-phone').value = sale.customer_phone || '';

        const dateInput = document.getElementById('tc-sale-date-input');
        if (dateInput && sale.date) {
            try {
                const d = new Date(sale.date);
                const localIso = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                dateInput.value = localIso;
            } catch(e) {}
        }

        const citySelect = document.getElementById('tc-cust-city');
        if (citySelect && sale.customer_city) citySelect.value = sale.customer_city;

        const sellerSelect = document.getElementById('tc-seller-select');
        if (sellerSelect && sale.seller_id) sellerSelect.value = sale.seller_id;

        const carrierSelect = document.querySelector('#tucompras-sale-form select[name="carrier"]');
        if (carrierSelect && sale.carrier) carrierSelect.value = sale.carrier;

        const trackingInput = document.querySelector('#tucompras-sale-form input[name="tracking_number"]');
        if (trackingInput) trackingInput.value = sale.tracking_number || '';

        const shippingInput = document.querySelector('#tucompras-sale-form input[name="shipping_cost"]');
        if (shippingInput) shippingInput.value = sale.shipping_cost || 0;

        const campaignSelect = document.getElementById('tc-campaign-select');
        if (campaignSelect) campaignSelect.value = sale.campaign_name || '';

        const wizardTitle = document.getElementById('tc-wizard-title');
        if (wizardTitle) {
            wizardTitle.innerHTML = `<span class="step-indicator" style="background: var(--accent); color: white; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 0.9rem;">1</span> Editando Venta #${sale.tracking_number || sale.id.substring(0,6)}`;
        }
    },

    async deleteSale(saleId) {
        const sale = this.getSales().find(s => s.id === saleId);
        if (!sale) return;

        if (!confirm(`¿Seguro que deseas eliminar la venta de "${sale.customer_name || 'este cliente'}"?\n\nEsta acción restaurará la cantidad de productos a sus bodegas.`)) {
            return;
        }

        try {
            // Restore stock to inventory
            if (sale.items && Array.isArray(sale.items)) {
                for (const item of sale.items) {
                    const product = Inventory.getProducts().find(p => p.id === item.product_id);
                    if (product) {
                        const itemSource = item.inventory_source || sale.inventory_source || 'millenio';
                        if (itemSource === 'millenio') {
                            product.stockMillenio = (parseInt(product.stockMillenio) || 0) + item.qty;
                        } else {
                            product.stockVulcano = (parseInt(product.stockVulcano) || 0) + item.qty;
                        }
                        await Storage.updateItem(STORAGE_KEYS.PRODUCTS, product.id, product);
                    }
                }
            }

            // Delete from STORAGE_KEYS.TUCOMPRAS_SALES
            await Storage.deleteItem(STORAGE_KEYS.TUCOMPRAS_SALES, saleId);
            this.renderPanel();
            alert('Venta eliminada con éxito y stock restaurado.');
        } catch (err) {
            console.error('[TUCOMPRAS] Error al eliminar venta:', err);
            alert('❌ Error al eliminar la venta: ' + err.message);
        }
    },

    navigateWizard(stepChange) {
        if (stepChange === 1) {
            // Validation
            if (this.activeStep === 1) {
                if (!document.getElementById('tc-cust-name').value || !document.getElementById('tc-cust-phone').value || !document.getElementById('tc-cust-city').value) {
                    alert("Por favor complete los datos obligatorios del cliente.");
                    return;
                }
            }
            if (this.activeStep === 2 && this.cart.length === 0) {
                alert("Seleccione al menos un producto.");
                return;
            }
        }

        const newStep = this.activeStep + stepChange;
        if (newStep >= 1 && newStep <= 3) {
            this.activeStep = newStep;
            this.updateWizardUI();
        }
    },

    updateWizardUI() {
        // Steps visibility
        document.querySelectorAll('.wizard-step').forEach((s, idx) => {
            s.style.display = (idx + 1 === this.activeStep) ? 'block' : 'none';
        });

        // Title and Indicator
        const title = document.getElementById('tc-wizard-title');
        const indicator = title.querySelector('.step-indicator');
        indicator.textContent = this.activeStep;
        
        const titles = ["Información del Cliente", "Selección de Productos", "Logística y Resumen"];
        title.innerHTML = `<span class="step-indicator" style="background: var(--accent); color: white; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 0.9rem; margin-right: 10px;">${this.activeStep}</span> ${titles[this.activeStep - 1]}`;

        // Buttons
        document.getElementById('tc-wizard-prev').style.display = (this.activeStep === 1) ? 'none' : 'block';
        document.getElementById('tc-wizard-next').style.display = (this.activeStep === 3) ? 'none' : 'block';
        
        if (this.activeStep === 2) this.renderProductGrid(document.getElementById('tc-product-search')?.value || '');
        if (this.activeStep === 3) this.populateSellersDropdown('tc-seller-select');
    },

    renderProductGrid(query = '') {
        const grid = document.getElementById('tc-product-grid');
        if (!grid) return;

        let products = Inventory.getProducts().filter(p => p.active !== false && p.name.toLowerCase().includes(query.toLowerCase()));
        
        if (this.activeCompanyFilter !== 'all') {
            products = products.filter(p => {
                if (this.activeCompanyFilter === 'millenio') return (parseInt(p.stockMillenio) || 0) > 0 || p.company === 'millenio';
                if (this.activeCompanyFilter === 'vulcano') return (parseInt(p.stockVulcano) || 0) > 0 || p.company === 'vulcano';
                return true;
            });
        }

        if (products.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-secondary);"><i class="fas fa-box-open" style="font-size: 2rem; margin-bottom: 10px;"></i><br>No se encontraron productos que coincidan.</div>';
            return;
        }

        grid.innerHTML = products.map(p => {
            const stockM = parseInt(p.stockMillenio) || 0;
            const stockV = parseInt(p.stockVulcano) || 0;
            const totalStock = stockM + stockV;
            const inCart = this.cart.find(item => item.product_id === p.id);
            const qtyInCart = inCart ? inCart.qty : 0;

            return `
                <div class="product-item" style="background: var(--bg-card); padding: 12px; border-radius: 14px; border: 1px solid ${qtyInCart > 0 ? 'var(--accent)' : 'var(--border)'}; display: flex; flex-direction: column; gap: 8px; transition: all 0.2s ease; position: relative;">
                    ${qtyInCart > 0 ? `<span style="position: absolute; top: -8px; right: -8px; background: var(--accent); color: white; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">${qtyInCart}</span>` : ''}
                    <img src="${(Array.isArray(p.image) ? p.image[0] : p.image) || 'https://via.placeholder.com/100'}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 8px;">
                    <h4 style="font-size: 0.85rem; margin:0; line-height: 1.2; height: 2.4rem; overflow: hidden; color: var(--text-primary);" title="${p.name}">${p.name}</h4>
                    <div style="display: flex; gap: 4px; flex-wrap: wrap; align-items: center;">
                        <span class="badge ${totalStock > 0 ? 'bg-success' : 'bg-danger'}" style="font-size: 0.65rem; padding: 2px 6px;">
                            ${totalStock > 0 ? `Stock Total: ${totalStock}` : 'SIN STOCK'}
                        </span>
                        ${stockM > 0 ? `<span class="badge bg-blue" style="font-size: 0.6rem; padding: 2px 5px;" title="Stock Millenio">M: ${stockM}</span>` : ''}
                        ${stockV > 0 ? `<span class="badge bg-orange" style="font-size: 0.6rem; padding: 2px 5px;" title="Stock Vulcano">V: ${stockV}</span>` : ''}
                    </div>
                    <div style="margin-top: auto; display: flex; justify-content: space-between; align-items: center; padding-top: 4px;">
                        <span style="font-size: 0.9rem; font-weight: 700; color: var(--accent-vibrant);">$${parseFloat(p.priceFinal || p.priceInternet || 0).toLocaleString()}</span>
                        <button class="btn btn-sm ${qtyInCart > 0 ? 'btn-success' : 'btn-primary'} tc-add-btn" data-id="${p.id}" style="height: 32px; padding: 0 12px; border-radius: 8px; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                            <i class="fas ${qtyInCart > 0 ? 'fa-plus' : 'fa-cart-plus'}"></i> ${qtyInCart > 0 ? 'Agregar +1' : 'Agregar'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    addToCart(productId) {
        const product = Inventory.getProducts().find(p => p.id === productId);
        if (!product) return;

        // Auto-determine source based on stock
        const stockM = parseInt(product.stockMillenio) || 0;
        const stockV = parseInt(product.stockVulcano) || 0;
        let source = 'millenio';
        if (stockV > 0 && stockM <= 0) source = 'vulcano';
        else if (stockM > 0) source = 'millenio';
        else if (product.company === 'vulcano') source = 'vulcano';

        const existing = this.cart.find(i => i.product_id === productId);
        if (existing) {
            existing.qty++;
        } else {
            this.cart.push({
                product_id: productId,
                name: product.name,
                qty: 1,
                cost_price: product.priceWholesale || product.cost || 0,
                sale_price: product.priceFinal || product.priceInternet || 0,
                commission_paid: product.commissionBase || 0,
                inventory_source: source
            });
        }
        this.updateCartUI();
        this.renderProductGrid(document.getElementById('tc-product-search')?.value || '');
    },

    removeFromCart(productId) {
        this.cart = this.cart.filter(i => i.product_id !== productId);
        this.updateCartUI();
        this.renderProductGrid(document.getElementById('tc-product-search')?.value || '');
    },

    updateCartUI() {
        const container = document.getElementById('tc-cart-items');
        if (!container) return;

        container.innerHTML = this.cart.length === 0 ? '<p class="text-center text-secondary">Elegir productos de la izquierda</p>' :
            this.cart.map(i => `
                <div class="cart-item" style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 10px; border: 1px solid var(--border); font-size: 0.8rem; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <strong style="color: var(--text-primary); font-size: 0.85rem;">${i.name}</strong>
                        <button type="button" class="tc-remove-item icon-btn" data-id="${i.product_id}" style="width:22px; height:22px; font-size: 0.7rem; background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); border-radius: 50%; cursor: pointer;">&times;</button>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; align-items: center;">
                        <div class="form-group" style="margin:0;">
                            <label style="font-size: 0.65rem; color: var(--text-secondary);">Cantidad</label>
                            <input type="number" min="1" value="${i.qty}" onchange="TuCompras.updateCartValue('${i.product_id}', 'qty', this.value)" style="width: 100%; height: 28px; font-size: 0.8rem; font-weight: 700; text-align: center; border-radius: 6px; border: 1px solid var(--accent); background: var(--bg-body); color: var(--accent-vibrant);">
                        </div>
                        <div class="form-group" style="margin:0;">
                            <label style="font-size: 0.65rem; color: var(--text-secondary);">P. Venta ($)</label>
                            <input type="number" value="${i.sale_price}" onchange="TuCompras.updateCartValue('${i.product_id}', 'sale_price', this.value)" style="width: 100%; height: 28px; font-size: 0.8rem; font-weight: 600; border-radius: 6px; background: var(--bg-body); color: var(--text-primary);">
                        </div>
                        <div class="form-group" style="margin:0;">
                            <label style="font-size: 0.65rem; color: var(--text-secondary);">Comisión ($)</label>
                            <input type="number" value="${i.commission_paid}" onchange="TuCompras.updateCartValue('${i.product_id}', 'commission_paid', this.value)" style="width: 100%; height: 28px; font-size: 0.8rem; font-weight: 600; border-radius: 6px; background: rgba(245,158,11,0.05); color: #f59e0b;">
                        </div>
                    </div>
                </div>
            `).join('');

        const totalSale = this.cart.reduce((sum, i) => sum + (parseFloat(i.sale_price) * i.qty), 0);
        const totalComm = this.cart.reduce((sum, i) => sum + (parseFloat(i.commission_paid) * i.qty), 0);
        document.getElementById('tc-total-sale-text').textContent = `$${totalSale.toLocaleString()}`;
        document.getElementById('tc-total-commission-text').textContent = `$${totalComm.toLocaleString()}`;
    },

    updateCartValue(productId, field, value) {
        const item = this.cart.find(i => i.product_id === productId);
        if (item) {
            const val = parseFloat(value) || 0;
            if (field === 'qty') {
                item.qty = Math.max(1, parseInt(val) || 1);
            } else {
                item[field] = val;
            }
            this.updateCartUI();
            this.renderProductGrid(document.getElementById('tc-product-search')?.value || '');
        }
    },

    async handleNewSale(formData) {
        if (this.isSubmittingSale) return;
        this.isSubmittingSale = true;

        const submitBtn = document.querySelector('#tucompras-sale-form button[type="submit"]');
        const origBtnText = submitBtn ? submitBtn.innerHTML : 'REGISTRAR DESPACHO';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        }

        try {
            const cityEl = document.getElementById('tc-cust-city');
            let city = cityEl ? cityEl.value.trim() : '';
            if (city === 'OTRO' || city.includes('OTRO')) {
                const otherEl = document.getElementById('tc-cust-city-other');
                city = otherEl ? otherEl.value.trim() : '';
            }
            const nameEl = document.getElementById('tc-cust-name');
            const name = nameEl ? nameEl.value.trim() : '';
            const phoneEl = document.getElementById('tc-cust-phone');
            const phone = phoneEl ? phoneEl.value.trim() : '';

            if (!name || !phone || !city) {
                alert('Faltan datos obligatorios del cliente (Nombre, Teléfono y Ciudad)');
                return;
            }

            if (!this.cart || this.cart.length === 0) {
                alert('Debe agregar al menos un producto al despacho');
                return;
            }

            const sellerSelect = document.getElementById('tc-seller-select');
            const sellerId = formData && typeof formData.get === 'function' ? formData.get('seller_id') : (sellerSelect ? sellerSelect.value : '');

            if (!sellerId) {
                alert('⚠️ Debes seleccionar un Vendedor antes de registrar el despacho.');
                return;
            }

            const carrierSelect = document.querySelector('#tucompras-sale-form select[name="carrier"]');
            const carrier = formData && typeof formData.get === 'function' ? formData.get('carrier') : (carrierSelect ? carrierSelect.value : 'Interrapidisimo');

            const trackingInput = document.querySelector('#tucompras-sale-form input[name="tracking_number"]');
            const tracking_number = formData && typeof formData.get === 'function' ? (formData.get('tracking_number') || '') : (trackingInput ? trackingInput.value : '');

            const shippingInput = document.querySelector('#tucompras-sale-form input[name="shipping_cost"]');
            const shipping_cost = formData && typeof formData.get === 'function' ? (parseFloat(formData.get('shipping_cost')) || 0) : (shippingInput ? (parseFloat(shippingInput.value) || 0) : 0);

            // FIX: Smart Stock Validation per Product Item (only for new sales)
            if (!this.editingSaleId) {
                const stockErrors = [];
                for (const item of this.cart) {
                    const product = Inventory.getProducts().find(p => p.id === item.product_id);
                    if (!product) {
                        stockErrors.push(`"${item.name}" ya no existe en inventario.`);
                        continue;
                    }
                    const stockM = parseInt(product.stockMillenio) || 0;
                    const stockV = parseInt(product.stockVulcano) || 0;
                    const totalStock = stockM + stockV;

                    let itemSource = item.inventory_source || (stockM > 0 ? 'millenio' : 'vulcano');
                    let available = itemSource === 'millenio' ? stockM : stockV;

                    if (item.qty > available) {
                        const altSource = itemSource === 'millenio' ? 'vulcano' : 'millenio';
                        const altAvailable = altSource === 'millenio' ? stockM : stockV;
                        if (item.qty <= altAvailable) {
                            item.inventory_source = altSource; // Auto switch
                        } else {
                            stockErrors.push(`"${product.name}": Solicitados ${item.qty}, disponible total en bodegas: ${totalStock} (Millenio: ${stockM}, Vulcano: ${stockV}).`);
                        }
                    }
                }

                if (stockErrors.length > 0) {
                    alert('❌ Stock insuficiente:\n\n' + stockErrors.join('\n'));
                    return;
                }
            }

            const campaignSelect = document.getElementById('tc-campaign-select');
            const campaign_name = formData && typeof formData.get === 'function' ? (formData.get('campaign_name') || '') : (campaignSelect ? campaignSelect.value : '');

            const dateInput = document.getElementById('tc-sale-date-input');
            let saleDate = new Date().toISOString();
            if (dateInput && dateInput.value) {
                try {
                    saleDate = new Date(dateInput.value).toISOString();
                } catch(e) {}
            }

            const totalCommission = this.cart.reduce((sum, i) => sum + (parseFloat(i.commission_paid || 0) * (i.qty || 1)), 0);

            let sale;
            if (this.editingSaleId) {
                const existing = this.getSales().find(s => s.id === this.editingSaleId);
                sale = {
                    ...(existing || {}),
                    id: this.editingSaleId,
                    date: saleDate,
                    customer_name: name,
                    customer_phone: phone,
                    seller_id: sellerId,
                    carrier: carrier,
                    tracking_number: tracking_number,
                    shipping_cost: shipping_cost,
                    campaign_name: campaign_name,
                    commission_paid: totalCommission,
                    items: this.cart
                };
                delete sale.customer_city;
                await Storage.updateItem(STORAGE_KEYS.TUCOMPRAS_SALES, this.editingSaleId, sale);
                this.editingSaleId = null;
                alert('Venta actualizada con éxito.');
            } else {
                sale = {
                    date: saleDate,
                    customer_name: name,
                    customer_phone: phone,
                    seller_id: sellerId,
                    carrier: carrier,
                    tracking_number: tracking_number,
                    inventory_source: this.cart[0].inventory_source || 'millenio',
                    status: 'despachado',
                    shipping_cost: shipping_cost,
                    campaign_name: campaign_name,
                    commission_paid: totalCommission,
                    items: this.cart,
                    money_confirmed: false,
                    is_paid_to_inventory: false
                };
                await Storage.addItem(STORAGE_KEYS.TUCOMPRAS_SALES, sale);

                // Discount Inventory
                for (const item of this.cart) {
                    const product = Inventory.getProducts().find(p => p.id === item.product_id);
                    if (product) {
                        const itemSource = item.inventory_source || 'millenio';
                        if (itemSource === 'millenio') product.stockMillenio = Math.max(0, (parseInt(product.stockMillenio) || 0) - item.qty);
                        else product.stockVulcano = Math.max(0, (parseInt(product.stockVulcano) || 0) - item.qty);
                        await Storage.updateItem(STORAGE_KEYS.PRODUCTS, product.id, product);
                    }
                }
                alert('Despacho registrado con éxito.');
            }

            // DEPENDENT DATA (Customer CRM & Custom Locations Persistence)
            const deptEl = document.getElementById('tc-cust-dept');
            const deptName = deptEl ? deptEl.value : '';
            const addressEl = document.getElementById('tc-cust-address');

            if (city && window.Locations && typeof window.Locations.addCustomCity === 'function') {
                Locations.addCustomCity(deptName, city);
            }

            await TuComprasCRM.addCustomer({
                name, phone,
                dept: deptName,
                city: city,
                address: addressEl ? addressEl.value : ''
            });

            // AUTOMATIC META ADS CONVERSION API TRIGGER
            if (window.MetaAPI && typeof window.MetaAPI.sendPurchaseEvent === 'function') {
                const totalValue = this.cart.reduce((sum, i) => sum + (parseFloat(i.sale_price || 0) * (parseInt(i.qty) || 1)), 0);
                MetaAPI.sendPurchaseEvent({
                    sale: sale,
                    customerName: name,
                    customerPhone: phone,
                    customerCity: city,
                    totalValue: totalValue,
                    items: this.cart
                });
            }

            document.getElementById('tucompras-sale-modal').classList.remove('show');
            this.renderPanel();
        } catch (err) {
            console.error('[TUCOMPRAS] Error al registrar/editar venta:', err);
            alert('❌ Error: ' + err.message);
        } finally {
            this.isSubmittingSale = false;
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = origBtnText;
            }
        }
    },

    openStatusModal(saleId) {
        const sale = this.getSales().find(s => s.id === saleId);
        if (!sale) return;

        const modalBody = document.getElementById('tc-status-modal-body');
        const accounts = (Storage.get(STORAGE_KEYS.ACCOUNTS) || []).filter(a => a.company === 'tucompras' || a.company === 'millenio' || a.company === 'vulcano');

        const totalSale = sale.items ? sale.items.reduce((sum, i) => sum + (parseFloat(i.sale_price || 0) * (parseInt(i.qty) || 1)), 0) : parseFloat(sale.sale_price || 0);
        const netExp = Math.max(0, totalSale - parseFloat(sale.shipping_cost || 0));

        modalBody.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <p style="margin:0;">Estado actual: <strong>${sale.status.toUpperCase()}</strong> ${sale.money_confirmed ? '<span class="badge bg-success">Dinero Confirmado</span>' : ''}</p>
                <div class="card" style="padding:12px; font-size: 0.85rem; background: rgba(0,0,0,0.15); border-radius: 10px;">
                    <strong>Cliente:</strong> ${sale.customer_name}<br>
                    <strong>Guía:</strong> ${sale.carrier} - ${sale.tracking_number || 'Sin Guía'}<br>
                    <strong>Valor Venta Total:</strong> $${totalSale.toLocaleString('es-CO')} COP
                </div>
                
                ${sale.status === 'despachado' ? `
                    <button class="btn btn-success btn-block" onclick="TuCompras.updateStatus('${saleId}', 'recibido')">Confirmar ENTREGA</button>
                    <button class="btn btn-warning btn-block" onclick="TuCompras.openReturnModal('${saleId}')">Venta DEVUELTA (En Camino / Causa)</button>
                ` : ''}

                ${sale.status === 'proceso_devolucion' ? `
                    <button class="btn btn-warning btn-block" onclick="TuCompras.openReturnModal('${saleId}')"><i class="fas fa-undo-alt"></i> Gestionar Causa & Trámite Devolución</button>
                    <button class="btn btn-primary btn-block" onclick="TuCompras.saveReturnManagement('${saleId}', true)"><i class="fas fa-boxes"></i> Confirmar Recibida físicamente en Bodega</button>
                ` : ''}

                ${(sale.status === 'recibido' || sale.money_confirmed || this.activeStatus === 'conciliacion') ? `
                    <div style="border-top: 1px solid var(--border); padding-top: 1rem; display: flex; flex-direction: column; gap: 0.8rem;">
                        <h4 style="margin:0; color:#10b981;"><i class="fas fa-wallet"></i> Conciliación de Dinero en Wallet</h4>
                        <div class="form-group" style="margin:0;">
                            <label>Valor Debitado Real Flete ($ COP):</label>
                            <input type="number" id="tc-final-shipping" class="form-control" value="${sale.shipping_cost || 0}">
                        </div>
                        <div class="form-group" style="margin:0;">
                            <label>Valor Neto Ingresado a la Billetera ($ COP):</label>
                            <input type="number" id="tc-net-received" class="form-control" value="${sale.money_received_value !== undefined ? sale.money_received_value : netExp}" placeholder="${netExp}">
                            <small class="text-secondary">Sugerido (Venta - Flete): $${netExp.toLocaleString('es-CO')} COP</small>
                        </div>
                        <div class="form-group" style="margin:0;">
                            <label>Cuenta / Wallet de Destino:</label>
                            <select id="tc-target-account" class="form-control">
                                ${accounts.map(a => `<option value="${a.id}" ${a.id === 'wallet_tucompras' || a.id === sale.received_account_id ? 'selected' : ''}>${a.name} (${a.bankName || a.company})</option>`).join('')}
                            </select>
                        </div>
                        <button class="btn btn-success btn-block" style="margin-top: 5px; font-weight: 700;" onclick="TuCompras.confirmMoney('${saleId}')">
                            <i class="fas fa-check-circle"></i> ${sale.money_confirmed ? 'Actualizar Conciliación' : 'Confirmar e Ingresar a Wallet'}
                        </button>
                    </div>
                ` : ''}

                ${sale.status_history && sale.status_history.length > 0 ? `
                    <div style="border-top: 1px solid var(--border); padding-top: 1rem; margin-top: 0.5rem;">
                        <h4 style="margin: 0 0 0.8rem 0; font-size: 0.85rem; color: var(--text-secondary);"><i class="fas fa-history"></i> Historial de Auditoría de Estados</h4>
                        <div style="display: flex; flex-direction: column; gap: 8px; max-height: 180px; overflow-y: auto; padding-right: 5px;">
                            ${sale.status_history.map(h => `
                                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; font-size: 0.75rem;">
                                    <div style="display: flex; justify-content: space-between; font-weight: 600; color: var(--text-primary);">
                                        <span>${(h.previous_status || 'Inicio').toUpperCase()} ➔ ${(h.new_status || '').toUpperCase()}</span>
                                        <span style="color: var(--text-secondary);">${new Date(h.changed_at).toLocaleString()}</span>
                                    </div>
                                    <div style="color: var(--text-secondary); margin-top: 3px;">Responsable: ${h.changed_by || 'Admin'} ${h.notes ? `| ${h.notes}` : ''}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        document.getElementById('tc-status-modal').classList.add('show');
    },

    openReturnModal(saleId) {
        const sale = this.getSales().find(s => s.id === saleId);
        if (!sale) return;

        const modalBody = document.getElementById('tc-status-modal-body');
        const accounts = (Storage.get(STORAGE_KEYS.ACCOUNTS) || []).filter(a => a.company === 'tucompras' || a.company === 'millenio' || a.company === 'vulcano');

        modalBody.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 1.2rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 0.8rem;">
                    <h3 style="margin:0; color: #f59e0b;"><i class="fas fa-undo-alt"></i> Gestión Integral de Devolución</h3>
                    <span class="badge ${sale.physical_return_status === 'received' ? 'bg-success' : 'bg-warning'}">
                        ${sale.physical_return_status === 'received' ? '📦 Recibido en Bodega' : '🚚 En Camino (Pendiente)'}
                    </span>
                </div>

                <div class="card" style="padding:10px; font-size: 0.85rem; background: rgba(0,0,0,0.15); border-radius: 10px;">
                    <strong>Cliente:</strong> ${sale.customer_name}<br>
                    <strong>Guía:</strong> ${sale.carrier} - ${sale.tracking_number || 'Sin Guía'}
                </div>

                <!-- SECCIÓN 1: CAUSA DE DEVOLUCIÓN -->
                <div style="display: flex; flex-direction: column; gap: 0.6rem;">
                    <h4 style="margin:0; font-size: 0.9rem; color: var(--accent-vibrant);">1. Causa Estandarizada de Devolución</h4>
                    <div class="form-group" style="margin:0;">
                        <label>Categoría de Causa *</label>
                        <select id="tc-return-reason" class="form-control">
                            <option value="">-- Seleccionar Causa --</option>
                            ${Object.entries(this.returnCategories).map(([key, label]) => `<option value="${key}" ${sale.return_reason_category === key ? 'selected' : ''}>${label}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label>Observaciones de Devolución</label>
                        <textarea id="tc-return-obs" class="form-control" rows="2" placeholder="Detalles de llamadas, dirección o motivo del cliente...">${sale.return_observations || ''}</textarea>
                    </div>
                </div>

                <!-- SECCIÓN 2: DÉBITO DE FLETE & ASIENTO CONTABLE -->
                <div style="display: flex; flex-direction: column; gap: 0.6rem; border-top: 1px solid var(--border); padding-top: 0.8rem;">
                    <h4 style="margin:0; font-size: 0.9rem; color: #ef4444;">2. Cobro de Flete Devuelto & Asiento Contable</h4>
                    <div class="form-group" style="margin:0;">
                        <label>Valor Debitado por Flete Devuelto ($ COP):</label>
                        <input type="number" id="tc-return-loss" class="form-control" value="${sale.shipping_loss || sale.shipping_cost || 0}">
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label>Cuenta de donde se debitó el flete:</label>
                        <select id="tc-return-account" class="form-control">
                            ${accounts.map(a => `<option value="${a.id}" ${a.id === 'wallet_tucompras' || a.id === sale.financial_loss_account_id ? 'selected' : ''}>${a.name} (${a.bankName || a.company})</option>`).join('')}
                        </select>
                    </div>
                    <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; cursor: pointer;">
                        <input type="checkbox" id="tc-return-expense-check" checked>
                        <span>Registrar gasto de flete perdido en Finanzas (Disminuye utilidad)</span>
                    </label>
                </div>

                <!-- SECCIÓN 3: TRÁMITES Y BOTONES -->
                <div style="display: flex; flex-direction: column; gap: 0.6rem; border-top: 1px solid var(--border); padding-top: 0.8rem;">
                    <h4 style="margin:0; font-size: 0.9rem; color: var(--text-secondary);">3. Trámite del Producto Físico</h4>
                    <button class="btn btn-warning btn-block" style="font-weight: 600;" onclick="TuCompras.saveReturnManagement('${saleId}', false)">
                        <i class="fas fa-save"></i> Guardar Causa y Débito (Producto Sigue en Camino)
                    </button>
                    <button class="btn btn-success btn-block" style="font-weight: 700;" onclick="TuCompras.saveReturnManagement('${saleId}', true)">
                        <i class="fas fa-boxes"></i> Confirmar Recepción Física en Bodega (Reingresar Stock)
                    </button>
                </div>
            </div>
        `;
        document.getElementById('tc-status-modal').classList.add('show');
    },

    addAuditLog(sale, oldStatus, newStatus, notes = '') {
        if (!sale.status_history) sale.status_history = [];
        sale.status_history.push({
            previous_status: oldStatus || 'despachado',
            new_status: newStatus,
            changed_at: new Date().toISOString(),
            changed_by: 'Cindy / Andrés (Admin)',
            notes: notes
        });
    },

    async saveReturnManagement(saleId, confirmPhysicalArrival) {
        const sale = this.getSales().find(s => s.id === saleId);
        if (!sale) return;

        const reasonVal = document.getElementById('tc-return-reason')?.value;
        const obsVal = document.getElementById('tc-return-obs')?.value || '';
        const lossVal = parseFloat(document.getElementById('tc-return-loss')?.value || 0);
        const accountVal = document.getElementById('tc-return-account')?.value || 'wallet_tucompras';
        const createExpense = document.getElementById('tc-return-expense-check')?.checked;

        const oldStatus = sale.status;
        sale.shipping_loss = lossVal;
        sale.return_reason_category = reasonVal;
        sale.return_observations = obsVal;
        sale.financial_loss_debited_at = new Date().toISOString();
        sale.financial_loss_account_id = accountVal;

        if (confirmPhysicalArrival) {
            if (sale.physical_return_status !== 'received') {
                for (const item of (sale.items || [])) {
                    const product = Inventory.getProducts().find(p => p.id === item.product_id);
                    if (product) {
                        if (sale.inventory_source === 'millenio') product.stockMillenio = (parseInt(product.stockMillenio) || 0) + item.qty;
                        else product.stockVulcano = (parseInt(product.stockVulcano) || 0) + item.qty;
                        await Storage.updateItem(STORAGE_KEYS.PRODUCTS, product.id, product);
                    }
                }
            }
            sale.status = 'devolucion_recibida';
            sale.physical_return_status = 'received';
            sale.physical_returned_at = new Date().toISOString();
        } else {
            sale.status = 'proceso_devolucion';
            sale.physical_return_status = 'pending';
        }

        this.addAuditLog(sale, oldStatus, sale.status, `Causa: ${this.returnCategories[reasonVal] || reasonVal} | Flete: $${lossVal.toLocaleString()}`);
        await Storage.updateItem(STORAGE_KEYS.TUCOMPRAS_SALES, saleId, sale);

        // Auto Expense Accounting Entry in Finanzas
        if (createExpense && lossVal > 0) {
            await Storage.addItem(STORAGE_KEYS.EXPENSES, {
                company: 'tucompras',
                category: 'Devoluciones (Cargos Flete)',
                concept: `Cargo Flete por Devolución Guía #${sale.tracking_number || sale.id}`,
                amount: lossVal,
                date: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                originAccount: accountVal,
                notes: `Causa: ${this.returnCategories[reasonVal] || reasonVal} | Cliente: ${sale.customer_name}`
            });
        }

        document.getElementById('tc-status-modal').classList.remove('show');
        alert(`✅ Devolución de la venta #${sale.tracking_number || sale.id} registrada con éxito.`);
        this.renderPanel();
    },

    async updateStatus(id, newStatus) {
        const sale = this.getSales().find(s => s.id === id);
        if (!sale) return;

        if (newStatus === 'proceso_devolucion') {
            this.openReturnModal(id);
            return;
        }

        if (newStatus === 'devolucion_recibida') {
            await this.saveReturnManagement(id, true);
            return;
        }

        const oldStatus = sale.status;
        sale.status = newStatus;
        this.addAuditLog(sale, oldStatus, newStatus, 'Cambio manual de estado');
        await Storage.updateItem(STORAGE_KEYS.TUCOMPRAS_SALES, id, sale);
        document.getElementById('tc-status-modal').classList.remove('show');
        this.renderPanel();
    },

    renderWithdrawalsView() {
        const container = document.getElementById('tucompras-main-content');
        if (!container) return;

        const movements = Storage.get(STORAGE_KEYS.MOVEMENTS) || [];
        const accounts = (Storage.get(STORAGE_KEYS.ACCOUNTS) || []).filter(a => a.company === 'tucompras' || a.company === 'millenio' || a.company === 'vulcano');
        const withdrawals = movements.filter(m => m.type === 'withdrawal' && (m.company === 'tucompras' || m.concept?.includes('Retiro')));

        const totalWithdrawals = withdrawals.reduce((sum, w) => sum + (parseFloat(w.amount) || 0), 0);
        const cindyWithdrawals = withdrawals.filter(w => (w.notes || '').includes('Cindy') || (w.concept || '').includes('Cindy')).reduce((sum, w) => sum + (parseFloat(w.amount) || 0), 0);
        const andresWithdrawals = withdrawals.filter(w => (w.notes || '').includes('Andrés') || (w.concept || '').includes('Andrés')).reduce((sum, w) => sum + (parseFloat(w.amount) || 0), 0);

        container.innerHTML = `
            <div style="margin-bottom: 1.5rem;">
                <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                    <div class="stat-card" style="background: var(--bg-card); border-left: 4px solid #a855f7;">
                        <h3>Total Retiros de Utilidad</h3>
                        <p class="stat-value" style="color: #a855f7;">$${totalWithdrawals.toLocaleString('es-CO')}</p>
                        <span style="font-size: 0.75rem; color: var(--text-secondary);">Dividendos y retiros personales</span>
                    </div>
                    <div class="stat-card" style="background: var(--bg-card); border-left: 4px solid #ec4899;">
                        <h3>Retirado por Cindy</h3>
                        <p class="stat-value" style="color: #ec4899;">$${cindyWithdrawals.toLocaleString('es-CO')}</p>
                        <span style="font-size: 0.75rem; color: var(--text-secondary);">Participación 50%</span>
                    </div>
                    <div class="stat-card" style="background: var(--bg-card); border-left: 4px solid #3b82f6;">
                        <h3>Retirado por Andrés</h3>
                        <p class="stat-value" style="color: #3b82f6;">$${andresWithdrawals.toLocaleString('es-CO')}</p>
                        <span style="font-size: 0.75rem; color: var(--text-secondary);">Participación 50%</span>
                    </div>
                </div>

                <div class="actions-row" style="margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin:0;"><i class="fas fa-hand-holding-usd" style="color:#a855f7;"></i> Registro de Retiro de Utilidades / Dividendos</h3>
                    <button id="tc-add-withdrawal-btn" class="btn btn-primary" onclick="document.getElementById('tc-withdrawal-modal').classList.add('show')" style="background: #a855f7; border-color: #a855f7;">
                        <i class="fas fa-plus"></i> Registrar Nuevo Retiro
                    </button>
                </div>

                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Beneficiario / Socio</th>
                                <th>Monto Retirado ($ COP)</th>
                                <th>Cuenta de Salida</th>
                                <th>Motivo / Detalle</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${withdrawals.map(w => {
                                const acc = accounts.find(a => a.id === w.originAccount)?.name || w.originAccount || 'Billetera TuCompras';
                                return `
                                    <tr>
                                        <td>${new Date(w.date || w.createdAt).toLocaleDateString()}</td>
                                        <td><span class="badge" style="background: rgba(168,85,247,0.15); color: #a855f7; border: 1px solid rgba(168,85,247,0.3);">${w.notes ? w.notes.split('|')[0] : 'Socio'}</span></td>
                                        <td><strong style="color: #a855f7;">$${parseFloat(w.amount).toLocaleString('es-CO')} COP</strong></td>
                                        <td>${acc}</td>
                                        <td>${w.concept || '-'}</td>
                                        <td>
                                            <button class="icon-btn" onclick="TuCompras.deleteWithdrawal('${w.id}')" style="color: #ef4444;" title="Eliminar Retiro"><i class="fas fa-trash"></i></button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                            ${withdrawals.length === 0 ? '<tr><td colspan="6" class="text-center text-secondary" style="padding: 2rem;">No hay retiros de utilidades registrados</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Add Withdrawal Modal -->
            <div id="tc-withdrawal-modal" class="modal">
                <div class="modal-content" style="max-width: 480px; border-radius: 20px;">
                    <div class="modal-header">
                        <h2><i class="fas fa-hand-holding-usd" style="color: #a855f7;"></i> Registrar Retiro de Utilidades</h2>
                        <span class="close-modal" onclick="document.getElementById('tc-withdrawal-modal').classList.remove('show')">&times;</span>
                    </div>
                    <div class="modal-body" style="padding: 1.5rem;">
                        <form id="tc-withdrawal-form" onsubmit="event.preventDefault(); TuCompras.saveWithdrawal();">
                            <div class="form-grid" style="display: flex; flex-direction: column; gap: 1.25rem;">
                                <div class="form-group">
                                    <label>Socio / Beneficiario *</label>
                                    <select id="tc-with-partner" class="form-control" required>
                                        <option value="Cindy (50%)">Cindy (50%)</option>
                                        <option value="Andrés (50%)">Andrés (50%)</option>
                                        <option value="Reinversión Negocio">Reinversión Negocio</option>
                                        <option value="Pago Deuda">Pago Deuda</option>
                                        <option value="Otro Destino">Otro Destino</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Monto Retirado ($ COP) *</label>
                                    <input type="number" id="tc-with-amount" class="form-control" placeholder="0" required min="1">
                                </div>
                                <div class="form-group">
                                    <label>Cuenta / Caja de Salida *</label>
                                    <select id="tc-with-account" class="form-control" required>
                                        ${accounts.map(a => `<option value="${a.id}">${a.name} (${a.bankName || a.company})</option>`).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Motivo / Detalle *</label>
                                    <input type="text" id="tc-with-concept" class="form-control" placeholder="ej. Retiro de dividendos mes actual" required>
                                </div>
                            </div>
                            <button type="submit" class="btn btn-primary btn-block" style="margin-top: 1.5rem; background: #a855f7; border-color: #a855f7; height: 48px; font-weight: 700;">
                                Guardar Retiro de Utilidad
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        `;
    },

    async saveWithdrawal() {
        const partner = document.getElementById('tc-with-partner')?.value || 'Socio';
        const amount = parseFloat(document.getElementById('tc-with-amount')?.value || 0);
        const accountId = document.getElementById('tc-with-account')?.value || 'wallet_tucompras';
        const concept = document.getElementById('tc-with-concept')?.value || 'Retiro de Utilidades';

        if (amount <= 0) {
            alert('Ingrese un monto válido para el retiro.');
            return;
        }

        await Storage.addItem(STORAGE_KEYS.MOVEMENTS, {
            company: 'tucompras',
            type: 'withdrawal',
            originAccount: accountId,
            amount: amount,
            concept: concept,
            date: new Date().toISOString(),
            notes: `${partner} | ${concept}`
        });

        document.getElementById('tc-withdrawal-modal')?.classList.remove('show');
        alert('✅ Retiro de utilidades registrado con éxito.');
        this.renderPanel();
    },

    async deleteWithdrawal(id) {
        if (!confirm('¿Seguro que deseas eliminar este registro de retiro?')) return;
        await Storage.deleteItem(STORAGE_KEYS.MOVEMENTS, id);
        this.renderPanel();
    },

    async confirmMoney(id) {
        const sale = this.getSales().find(s => s.id === id);
        if (!sale) return;

        await this.ensureWalletAccount();

        const fleteVal = parseFloat(document.getElementById('tc-final-shipping')?.value) || sale.shipping_cost || 0;
        const netReceivedValInput = document.getElementById('tc-net-received')?.value;
        const targetAccountId = document.getElementById('tc-target-account')?.value || 'wallet_tucompras';

        const totalSale = sale.items ? sale.items.reduce((sum, i) => sum + (parseFloat(i.sale_price || 0) * (parseInt(i.qty) || 1)), 0) : parseFloat(sale.sale_price || 0);
        const netExpected = Math.max(0, totalSale - fleteVal);
        const netReceived = netReceivedValInput !== undefined && netReceivedValInput !== '' ? parseFloat(netReceivedValInput) : netExpected;
        const discrepancy = netReceived - netExpected;

        sale.shipping_cost = fleteVal;
        sale.money_confirmed = true;
        sale.money_confirmed_at = new Date().toISOString();
        sale.money_received_value = netReceived;
        sale.received_account_id = targetAccountId;
        sale.discrepancy_value = discrepancy;
        sale.reconciliation_status = (Math.abs(discrepancy) < 1) ? 'reconciled' : 'discrepancy';

        await Storage.updateItem(STORAGE_KEYS.TUCOMPRAS_SALES, id, sale);

        // Record Inflow Movement in Finances
        await Storage.addItem(STORAGE_KEYS.MOVEMENTS, {
            company: 'tucompras',
            type: 'inflow',
            originAccount: 'dropi_carrier',
            destinationAccount: targetAccountId,
            amount: netReceived,
            concept: `Ingreso Liquidación Venta TuCompras (${sale.tracking_number || sale.id})`,
            date: new Date().toISOString(),
            notes: `Cliente: ${sale.customer_name} | Venta: $${totalSale.toLocaleString()} | Flete: $${fleteVal.toLocaleString()}`
        });

        document.getElementById('tc-status-modal').classList.remove('show');
        alert(`✅ Dinero de venta #${sale.tracking_number || sale.id} conciliado e ingresado a la Wallet.`);
        this.renderPanel();
    },

    renderExpensesView() {
        const container = document.getElementById('tucompras-main-content');
        const expenses = Storage.get(STORAGE_KEYS.EXPENSES).filter(e => e.company === 'tucompras');

        container.innerHTML = `
            <div class="actions-row" style="margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <h2 style="margin:0;"><i class="fas fa-wallet" style="color:var(--warning);"></i> Listado de Gastos TuCompras</h2>
                <button id="tc-add-expense-btn" class="btn btn-warning" style="border-radius: 12px;">
                    <i class="fas fa-plus"></i> Registrar Gasto
                </button>
            </div>

            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Categoría</th>
                            <th>Concepto</th>
                            <th class="text-right">Monto</th>
                            <th>Notas</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody id="tc-expenses-list-body">
                        ${expenses.map(e => `
                            <tr>
                                <td data-label="Fecha">${new Date(e.date || e.createdAt).toLocaleDateString()}</td>
                                <td data-label="Categoría"><span class="badge" style="background: rgba(245,158,11,0.15); color: var(--warning); border: 1px solid rgba(245,158,11,0.3); font-size: 0.75rem;">${e.category || 'General'}</span></td>
                                <td data-label="Concepto"><strong>${e.concept}</strong></td>
                                <td data-label="Monto" class="text-right text-danger"><strong>$${parseFloat(e.amount).toLocaleString()}</strong></td>
                                <td data-label="Notas" style="font-size: 0.8rem; color: var(--text-secondary); max-width: 250px; overflow: hidden; text-overflow: ellipsis;">${e.notes || '-'}</td>
                                <td data-label="Acciones" class="table-actions">
                                    <button class="icon-btn tc-delete-expense-btn" data-id="${e.id}" style="color:var(--danger);" title="Eliminar Gasto">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                        ${expenses.length === 0 ? '<tr><td colspan="6" class="text-center text-secondary" style="padding: 2rem;">No hay gastos registrados</td></tr>' : ''}
                    </tbody>
                </table>
            </div>

            <!-- Add Expense Modal -->
            <div id="tc-expense-modal" class="modal">
                <div class="modal-content" style="max-width: 450px; border-radius: 20px;">
                    <div class="modal-header">
                        <h2>Registrar Gasto TuCompras</h2>
                        <span class="close-modal tc-close-modal">&times;</span>
                    </div>
                    <div class="modal-body" style="padding: 1.5rem 2rem;">
                        <form id="tc-expense-form">
                            <div class="form-grid" style="display: flex; flex-direction: column; gap: 1.25rem;">
                                <div class="form-group">
                                    <label>Categoría</label>
                                    <select name="category" class="form-control" required>
                                        <option value="Publicidad">Publicidad / Marketing</option>
                                        <option value="Fletes">Fletes</option>
                                        <option value="Devoluciones">Devoluciones (Cargos)</option>
                                        <option value="Operativo">Gasto Operativo</option>
                                        <option value="General">Otro / General</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Concepto / Detalle *</label>
                                    <input type="text" name="concept" class="form-control" placeholder="Ej: Publicidad Facebook Junio" required>
                                </div>
                                <div class="form-group">
                                    <label>Monto ($) *</label>
                                    <input type="number" name="amount" class="form-control" placeholder="Monto del gasto" required>
                                </div>
                                <div class="form-group">
                                    <label>Notas Adicionales</label>
                                    <textarea name="notes" class="form-control" placeholder="Detalles extra..." rows="3"></textarea>
                                </div>
                            </div>
                            <button type="submit" class="btn btn-primary btn-block btn-lg" style="margin-top: 1.5rem; height: 50px; border-radius: 12px;">
                                GUARDAR GASTO
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        `;
    },

    renderImportDropiView() {
        const container = document.getElementById('tucompras-main-content');
        const key = localStorage.getItem('erp_dropi_integration_key') || '';
        const sellers = Vendedores.getSellers().filter(s => s.status === 'active' || s.active !== false);

        // Filter pending orders
        const totalCount = this.pendingImportOrders.length;
        const filtered = this.pendingImportOrders.map((order, idx) => ({ order, idx })).filter(({ order }) => {
            const isImported = !!this.isOrderImported(order);
            const dropiStatus = (order.status || '').toUpperCase();
            
            if (this.hideImported && isImported) return false;
            
            const isCancelledStatus = dropiStatus === 'RECHAZADO' || dropiStatus === 'CANCELADO';
            if (this.hideCancelled && isCancelledStatus) return false;
            
            if (this.statusFilter === 'active') {
                const activeStatuses = ['GUIA_GENERADA', 'EN BODEGA ORIGEN', 'EN PROCESAMIENTO', 'EN REPARTO', 'NOVEDAD', 'INTENTO DE ENTREGA', 'EN BODEGA TRANSPORTADORA', 'DESPACHADA'];
                if (!activeStatuses.includes(dropiStatus) && dropiStatus !== 'DESPACHADO' && dropiStatus !== '') {
                    return false;
                }
            } else if (this.statusFilter === 'delivered') {
                if (dropiStatus !== 'ENTREGADO' && dropiStatus !== 'RECIBIDO') return false;
            } else if (this.statusFilter === 'returned') {
                if (dropiStatus !== 'DEVOLUCION' && dropiStatus !== 'DEVUELTO') return false;
            } else if (this.statusFilter === 'cancelled') {
                if (dropiStatus !== 'RECHAZADO' && dropiStatus !== 'CANCELADO') return false;
            }
            
            return true;
        });
        const filteredCount = filtered.length;

        container.innerHTML = `
            <div class="card" style="padding: 1.5rem; margin-bottom: 1.5rem; background: var(--bg-sidebar); border-radius: 16px; border: 1px solid var(--border);">
                <div style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="document.getElementById('tc-dropi-settings').classList.toggle('hidden')">
                    <h3 style="margin:0; font-size:1.1rem; display:flex; align-items:center; gap:8px;"><i class="fas fa-cog text-blue"></i> Configuración de Integración Dropi (API)</h3>
                    <span style="font-size: 0.8rem; color: var(--text-secondary);"><i class="fas fa-chevron-down"></i></span>
                </div>
                <div id="tc-dropi-settings" class="hidden" style="margin-top: 1rem; border-top: 1px solid var(--border); padding-top: 1rem;">
                    <div style="display: flex; gap: 1rem; align-items: flex-end;">
                        <div class="form-group" style="margin:0; flex: 1;">
                            <label style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:4px;">Token de Integración (Dropi Integration Key)</label>
                            <input type="text" id="tc-dropi-key" class="form-control" value="${key}" placeholder="Pegar token de integraciones de Dropi" autocomplete="off" style="-webkit-text-security: disc; background: var(--bg-dark); color: var(--text);">
                        </div>
                        <button id="tc-save-dropi-key-btn" class="btn btn-primary" style="height: 42px; border-radius:10px;">Guardar Token</button>
                    </div>
                    <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 5px; margin-bottom: 0;">
                        * Puedes obtener este token en tu cuenta de Dropi -> Configuración -> Integraciones -> Token de Integración.
                    </p>
                </div>
            </div>

            <div class="card" style="padding: 1.5rem 2rem; border-radius: 16px; margin-bottom: 1.5rem; border: 1px solid var(--border);">
                <h3 style="margin:0 0 1rem 0; font-size:1.2rem; display:flex; align-items:center; gap:8px;"><i class="fas fa-file-import text-success"></i> Cargar Ventas de Dropi</h3>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">
                    <strong>Método Recomendado (CORS-Safe):</strong> Copia la tabla de pedidos o el reporte CSV de Dropi y pégalo abajo, o arrastra el archivo CSV.
                </p>

                <div style="display: flex; flex-direction: column; gap: 1rem;">
                    <textarea id="tc-dropi-raw" class="form-control" style="height: 120px; font-family: monospace; font-size: 0.8rem; border-radius:12px; background: rgba(0,0,0,0.15);" placeholder="Pega el texto CSV o JSON de tu reporte de pedidos de Dropi aquí..."></textarea>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                        <div style="display:flex; gap:10px;">
                            <input type="file" id="tc-dropi-file" accept=".csv,.txt" style="display: none;">
                            <button class="btn btn-outline" onclick="document.getElementById('tc-dropi-file').click()" style="border-radius:10px;">
                                <i class="fas fa-file-upload"></i> Subir Archivo CSV
                            </button>
                            <button id="tc-process-dropi-btn" class="btn btn-success" style="min-width: 140px; border-radius:10px;">Procesar Datos</button>
                        </div>
                        
                        <div style="display:flex; gap:10px;">
                            <button id="tc-sync-dropi-api-btn" class="btn btn-primary" ${key ? '' : 'disabled'} title="Sincronizar directamente vía API de Dropi" style="border-radius:10px;">
                                <i class="fas fa-sync-alt"></i> Sincronizar API Dropi
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div id="tc-pending-import-area" class="${this.pendingImportOrders.length === 0 ? 'hidden' : ''}">
                <div class="card" style="padding: 1.5rem; border-radius: 16px; margin-bottom: 2rem; border: 1px solid var(--border);">
                    <div class="panel-header" style="padding:0; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                        <h2 style="margin:0; font-size:1.2rem;"><i class="fas fa-tasks text-blue"></i> Pedidos Pendientes de Confirmar (${filteredCount} de ${totalCount})</h2>
                        
                        <div style="display: flex; gap: 10px; align-items: center; background: rgba(255,255,255,0.03); padding: 5px 12px; border-radius: 12px; border:1px solid var(--border);">
                            <label style="font-size:0.8rem; white-space:nowrap; color: var(--text-secondary); margin:0;">Asignar Vendedor Masivo:</label>
                            <select id="tc-batch-seller-select" class="form-control" style="width: 150px; height: 30px; padding: 2px 5px; font-size:0.8rem; border-radius:6px; background:var(--bg-dark);">
                                <option value="">Seleccione...</option>
                                ${sellers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                            </select>
                            <button id="tc-batch-assign-seller-btn" class="btn btn-primary btn-sm" style="border-radius:6px; height:30px; padding: 0 10px; font-size:0.8rem;">Asignar</button>
                        </div>
                    </div>

                    <!-- Filtros Inteligentes -->
                    <div style="display: flex; gap: 15px; align-items: center; flex-wrap: wrap; margin-bottom: 1.25rem; background: rgba(255,255,255,0.02); padding: 10px 15px; border-radius: 12px; border: 1px solid var(--border);">
                        <span style="font-size: 0.8rem; font-weight: bold; color: var(--text-secondary);"><i class="fas fa-filter text-blue"></i> Filtros de Vista:</span>
                        <label style="font-size:0.8rem; display: flex; align-items: center; gap: 6px; cursor: pointer; margin:0;">
                            <input type="checkbox" id="tc-filter-hide-imported" ${this.hideImported ? 'checked' : ''}>
                            Ocultar Ya Importados
                        </label>
                        <label style="font-size:0.8rem; display: flex; align-items: center; gap: 6px; cursor: pointer; margin:0;">
                            <input type="checkbox" id="tc-filter-hide-cancelled" ${this.hideCancelled ? 'checked' : ''}>
                            Ocultar Cancelados/Rechazados
                        </label>
                        <div style="display: flex; align-items: center; gap: 6px; margin-left: auto;">
                            <label style="font-size:0.8rem; margin:0; color: var(--text-secondary);">Estado Dropi:</label>
                            <select id="tc-filter-dropi-status" class="form-control" style="width: 160px; height: 28px; padding: 2px 5px; font-size: 0.75rem; border-radius: 6px; background: var(--bg-dark); color: var(--text);">
                                <option value="active" ${this.statusFilter === 'active' ? 'selected' : ''}>Activos / Pendientes</option>
                                <option value="delivered" ${this.statusFilter === 'delivered' ? 'selected' : ''}>Entregados</option>
                                <option value="returned" ${this.statusFilter === 'returned' ? 'selected' : ''}>Devoluciones</option>
                                <option value="cancelled" ${this.statusFilter === 'cancelled' ? 'selected' : ''}>Cancelados / Rechazados</option>
                                <option value="all" ${this.statusFilter === 'all' ? 'selected' : ''}>Todos los Estados</option>
                            </select>
                        </div>
                    </div>

                    <div style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items:center;">
                        <div class="alert alert-info" style="margin: 0; padding: 8px 12px; font-size:0.8rem; border-radius:8px;">
                            <i class="fas fa-info-circle"></i> Selecciona los pedidos, asigna el vendedor e impórtalos al ERP.
                        </div>
                        <button id="tc-clear-pending-import-btn" class="btn btn-outline-danger btn-sm" style="border-radius:8px;">Limpiar Lista</button>
                    </div>

                    <div class="table-container" style="overflow-x: auto; margin:0;">
                        <table class="data-table" style="font-size: 0.85rem;">
                            <thead>
                                <tr>
                                    <th style="width: 40px;"><input type="checkbox" id="tc-import-select-all"></th>
                                    <th>Pedido / Cliente</th>
                                    <th>Logística / Flete</th>
                                    <th>Artículos de Dropi</th>
                                    <th>Mapear Producto ERP</th>
                                    <th>Bodega</th>
                                    <th>Vendedor</th>
                                    <th>Precio Venta</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody id="tc-pending-import-list">
                                ${this.renderPendingImportListRows(filtered)}
                            </tbody>
                        </table>
                    </div>

                    <div style="margin-top: 1.5rem; text-align: right;">
                        <button id="tc-batch-import-submit-btn" class="btn btn-success btn-lg" style="border-radius: 12px; height: 50px; font-size:1rem; padding: 0 2rem;">
                            <i class="fas fa-check-circle"></i> CONFIRMAR E IMPORTAR SELECCIONADOS
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    renderPendingImportListRows(filtered) {
        const erpProducts = Inventory.getProducts().filter(p => p.active !== false);
        const sellers = Vendedores.getSellers().filter(s => s.status === 'active' || s.active !== false);

        return filtered.map(({ order, idx: orderIdx }) => {
            const isImported = this.isOrderImported(order);
            const dropiStatus = (order.status || 'despachado').toUpperCase();

            let statusBadge = '';
            if (dropiStatus === 'ENTREGADO' || dropiStatus === 'RECIBIDO') {
                statusBadge = `<span class="badge bg-success" style="font-size:0.6rem; padding: 2px 4px; margin-left: 5px;">${dropiStatus}</span>`;
            } else if (dropiStatus === 'RECHAZADO' || dropiStatus === 'CANCELADO' || dropiStatus === 'DEVOLUCION' || dropiStatus === 'DEVUELTO') {
                statusBadge = `<span class="badge bg-danger" style="font-size:0.6rem; padding: 2px 4px; margin-left: 5px;">${dropiStatus}</span>`;
            } else {
                statusBadge = `<span class="badge bg-warning" style="font-size:0.6rem; padding: 2px 4px; margin-left: 5px; color: black;">${dropiStatus}</span>`;
            }

            let importBadge = '';
            if (isImported) {
                importBadge = `<div style="margin-top: 4px;"><span class="badge bg-secondary" style="font-size:0.65rem; padding: 2px 6px;"><i class="fas fa-check-double"></i> Importado (ID: ${isImported.id})</span></div>`;
            }

            const customerStr = `
                <div>
                    <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: bold;">ID: ${order.id}</span> ${statusBadge}<br>
                    <strong>${order.customer_name || 'N/A'}</strong><br>
                    <span class="text-secondary" style="font-size:0.75rem;">Tel: ${order.customer_phone || '-'}<br>
                    ${order.customer_city || ''} (${order.customer_dept || ''})</span>
                    ${importBadge}
                </div>
            `;

            const logisticsStr = `
                <div>
                    <span class="badge bg-blue" style="font-size: 0.65rem; padding: 2px 6px;">${order.carrier || 'N/A'}</span><br>
                    <span style="font-size:0.75rem; display:block; margin-top:2px;">Guía: <strong>${order.tracking_number || '-'}</strong><br>
                    Flete: <span class="text-orange">$${(order.shipping_cost || 0).toLocaleString()}</span></span>
                </div>
            `;

            // Render mapping cells
            let itemsHtml = "";
            let mapHtml = "";
            let warehouseHtml = "";

            order.items.forEach((item, itemIdx) => {
                // Auto-match
                let matchedId = item.mapped_product_id || "";
                if (!matchedId) {
                    // Try exact or substring match in ERP products
                    const match = erpProducts.find(p => 
                        p.name.toLowerCase() === item.name.toLowerCase() || 
                        p.ref && item.name.toLowerCase().includes(p.ref.toLowerCase()) ||
                        p.name.toLowerCase().includes(item.name.toLowerCase()) ||
                        item.name.toLowerCase().includes(p.name.toLowerCase())
                    );
                    if (match) {
                        matchedId = match.id;
                        item.mapped_product_id = match.id; // Save in object
                    }
                }

                // Default warehouse source based on stock
                let matchedProd = erpProducts.find(p => p.id === matchedId);
                let defaultSource = item.inventory_source || "millenio";
                if (matchedProd) {
                    if (matchedProd.stockVulcano > 0 && matchedProd.stockMillenio <= 0) defaultSource = "vulcano";
                }
                item.inventory_source = item.inventory_source || defaultSource;

                itemsHtml += `<div style="margin-bottom: 5px; font-size:0.8rem; font-weight:600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">
                    ${item.qty}x ${item.name}
                </div>`;

                const disabledMapAttr = isImported ? 'disabled' : '';

                mapHtml += `
                    <div style="margin-bottom: 5px; display:flex; gap: 4px; align-items:center;">
                        <select class="form-control tc-item-product-select" data-order-idx="${orderIdx}" data-item-idx="${itemIdx}" ${disabledMapAttr} style="height:26px; padding: 2px; font-size: 0.75rem; width: 140px; border-color: ${matchedId ? 'var(--border)' : '#ef4444'};">
                            <option value="">-- Mapear... --</option>
                            ${erpProducts.map(p => `<option value="${p.id}" ${p.id === matchedId ? 'selected' : ''}>${p.name}</option>`).join('')}
                        </select>
                        ${matchedId ? '<i class="fas fa-check-circle text-success" title="Mapeado"></i>' : '<i class="fas fa-exclamation-circle text-danger" title="Falta mapear"></i>'}
                    </div>
                `;

                warehouseHtml += `
                    <div style="margin-bottom: 5px;">
                        <select class="form-control tc-item-warehouse-select" data-order-idx="${orderIdx}" data-item-idx="${itemIdx}" ${disabledMapAttr} style="height:26px; padding: 2px; font-size: 0.75rem; width: 85px;">
                            <option value="millenio" ${item.inventory_source === 'millenio' ? 'selected' : ''}>Millenio</option>
                            <option value="vulcano" ${item.inventory_source === 'vulcano' ? 'selected' : ''}>Vulcano</option>
                        </select>
                    </div>
                `;
            });

            // Seller selection
            const selectedSellerId = order.seller_id || "";
            const disabledSellerAttr = isImported ? 'disabled' : '';
            const sellerDropdown = `
                <select class="form-control tc-order-seller-select" data-order-idx="${orderIdx}" ${disabledSellerAttr} style="height:30px; padding: 2px 5px; font-size: 0.75rem; width: 120px; border-color: ${selectedSellerId ? 'var(--border)' : '#f59e0b'};">
                    <option value="">-- Seleccione... --</option>
                    ${sellers.map(s => `<option value="${s.id}" ${s.id === selectedSellerId ? 'selected' : ''}>${s.name}</option>`).join('')}
                </select>
            `;

            const disabledRowStyle = isImported ? 'style="opacity: 0.6; background: rgba(255,255,255,0.015);"' : '';
            const checkboxHtml = isImported ? 
                `<input type="checkbox" class="tc-import-check" data-index="${orderIdx}" disabled>` : 
                `<input type="checkbox" class="tc-import-check" data-index="${orderIdx}">`;

            const actionBtnHtml = isImported ? 
                `<button class="btn btn-sm btn-outline tc-import-single-btn" data-index="${orderIdx}" disabled style="opacity: 0.5; border-color: var(--border);">Listo</button>` : 
                `<button class="btn btn-sm btn-outline tc-import-single-btn" data-index="${orderIdx}" style="border-radius:6px; font-size:0.75rem; padding: 4px 8px;">Importar</button>`;

            return `
                <tr id="tc-pending-row-${orderIdx}" class="${!order.seller_id && !isImported ? 'highlight-warning' : ''}" ${disabledRowStyle}>
                    <td data-label="Seleccionar">${checkboxHtml}</td>
                    <td data-label="Cliente">${customerStr}</td>
                    <td data-label="Logística">${logisticsStr}</td>
                    <td data-label="Productos" style="vertical-align: top;">${itemsHtml}</td>
                    <td data-label="Mapeo M/V" style="vertical-align: top;">${mapHtml}</td>
                    <td data-label="Bodega Origen" style="vertical-align: top;">${warehouseHtml}</td>
                    <td data-label="Vendedor" style="vertical-align: middle;">${sellerDropdown}</td>
                    <td data-label="Precio Venta" style="vertical-align: middle;"><strong>$${(order.sale_price || 0).toLocaleString()}</strong></td>
                    <td data-label="Acciones" class="tc-table-actions" style="vertical-align: middle;">
                        ${actionBtnHtml}
                    </td>
                </tr>
            `;
        }).join('');
    },

    parseDropiData(rawText) {
        if (!rawText || !rawText.trim()) return [];

        const cleanText = rawText.trim();
        let orders = [];

        // 0. Detect if it's direct copy-paste from Dropi screen
        if (cleanText.includes('Estatus de la Orden') || cleanText.includes('GUIA_GENERADA') || cleanText.includes('RECHAZADO') || (/\b\d{8}\b/.test(cleanText) && cleanText.includes('Tel:'))) {
            console.log('[TUCOMPRAS] Detectado copiado directo de pantalla de Dropi. Procesando...');
            const lines = cleanText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
            
            const orderBlocks = [];
            let currentBlock = null;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (/^\d{8,10}\b/.test(line)) {
                    if (currentBlock) orderBlocks.push(currentBlock);
                    currentBlock = { header: line, contentLines: [] };
                } else if (currentBlock) {
                    currentBlock.contentLines.push(line);
                }
            }
            if (currentBlock) orderBlocks.push(currentBlock);

            orderBlocks.forEach(block => {
                const parts = block.header.split('\t');
                const orderId = parts[0];
                const productName = parts[1] || 'Producto Dropi';
                const orderDate = this.parseDropiDateStr(parts[2] || '', '');
                let customerName = parts[3] || '';

                let address = '';
                let phone = '';
                let status = 'despachado';
                let carrier = '';
                let trackingNumber = '';

                block.contentLines.forEach(line => {
                    if (line.toLowerCase().includes('tel:') || /^\d{7,10}$/.test(line.replace(/\D/g, ''))) {
                        const match = line.match(/Tel:\s*(\d+)/i) || line.match(/(\d{7,10})/);
                        if (match) phone = match[1];
                        
                        if (line.includes('\t')) {
                            const p = line.split('\t');
                            const possibleStatus = p[1]?.trim()?.toLowerCase();
                            if (possibleStatus) {
                                if (possibleStatus.includes('generada')) status = 'despachado';
                                else if (possibleStatus.includes('rechazado')) status = 'devuelto';
                                else if (possibleStatus.includes('entregado')) status = 'recibido';
                            }
                        }
                    }
                    else if (line.includes('#') || line.includes('CL') || line.includes('Calle') || line.includes('Carrera') || line.includes('Av') || line.includes('Avenida')) {
                        address = line;
                    }
                    else if (/^\d{10,15}$/.test(line.split('\t')[0])) {
                        const p = line.split('\t');
                        trackingNumber = p[0];
                        if (p[1]) carrier = p[1].trim();
                    }
                    else {
                        const p = line.split('\t');
                        p.forEach(term => {
                            term = term.trim();
                            if (/^(envia|interrapidisimo|coordinadora|servientrega|tcc)$/i.test(term)) {
                                carrier = term;
                            } else if (/^(guia_generada|rechazado|devuelto|entregado)$/i.test(term)) {
                                if (term.toLowerCase().includes('generada')) status = 'despachado';
                                else if (term.toLowerCase().includes('rechazado')) status = 'devuelto';
                                else if (term.toLowerCase().includes('entregado')) status = 'recibido';
                            }
                        });
                    }
                });

                let city = '';
                let dept = '';
                if (address) {
                    const lastCommaIdx = address.lastIndexOf(',');
                    let locationStr = lastCommaIdx !== -1 ? address.substring(lastCommaIdx + 1).trim() : address;
                    if (locationStr.includes('-')) {
                        const p = locationStr.split('-');
                        city = p[0].trim();
                        dept = p[1].trim();
                    } else {
                        city = locationStr;
                    }
                }

                if (orderId && (customerName || phone)) {
                    orders.push({
                        id: orderId,
                        date: orderDate,
                        customer_name: customerName || 'Cliente Dropi',
                        customer_phone: phone,
                        customer_address: address,
                        customer_city: city,
                        customer_dept: dept,
                        carrier: carrier || 'ENVIA',
                        tracking_number: trackingNumber,
                        shipping_cost: 0,
                        sale_price: 0,
                        items: [{
                            name: productName,
                            qty: 1,
                            mapped_product_id: '',
                            inventory_source: 'millenio'
                        }],
                        seller_id: '',
                        status: status
                    });
                }
            });

            if (orders.length > 0) {
                return orders;
            }
        }

        // 1. Check if it's JSON
        if (cleanText.startsWith('[') || cleanText.startsWith('{')) {
            try {
                let parsed = JSON.parse(cleanText);
                if (!Array.isArray(parsed)) parsed = [parsed];
                
                // Map JSON properties to our standard pending orders
                parsed.forEach(o => {
                    const name = o.customer_name || o.nombreRecibe || (o.cliente && o.cliente.nombre) || o.nombre_recibe || '';
                    const phone = o.customer_phone || o.celularRecibe || (o.cliente && o.cliente.telefono) || o.telefono_recibe || '';
                    const address = o.customer_address || o.direccionRecibe || (o.cliente && o.cliente.direccion) || o.direccion_recibe || '';
                    const city = o.customer_city || o.ciudadRecibe || (o.cliente && o.cliente.ciudad) || o.ciudad_recibe || '';
                    const dept = o.customer_dept || o.departamentoRecibe || (o.cliente && o.cliente.departamento) || o.departamento_recibe || '';
                    const carrier = o.carrier || o.nombreTransportadora || o.transportadora || '';
                    const tracking = o.tracking_number || o.guia || o.tracking || o.numero_guia || '';
                    const shipping = parseFloat(o.shipping_cost || o.costo_envio || o.valorFlete || o.flete_recaudo || 0);
                    const totalVal = parseFloat(o.sale_price || o.total || o.valorTotal || o.recaudo || 0);
                    
                    let items = [];
                    const jsonItems = o.items || o.productos || o.detalles || [];
                    if (Array.isArray(jsonItems)) {
                        jsonItems.forEach(item => {
                            items.push({
                                name: item.name || item.nombre || item.producto || 'Producto Dropi',
                                qty: parseInt(item.qty || item.cantidad || item.cantidad_producto || 1),
                                mapped_product_id: item.mapped_product_id || item.product_id || '',
                                inventory_source: item.inventory_source || 'millenio'
                            });
                        });
                    } else if (typeof jsonItems === 'string') {
                        items.push({ name: jsonItems, qty: 1, mapped_product_id: '', inventory_source: 'millenio' });
                    }

                    if (name && phone && items.length > 0) {
                        orders.push({
                            id: o.id || o.id_orden || o.idPedido || 'DR-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                            date: o.date || o.fecha || new Date().toISOString(),
                            customer_name: name,
                            customer_phone: phone,
                            customer_address: address,
                            customer_city: city,
                            customer_dept: dept,
                            carrier: carrier,
                            tracking_number: tracking,
                            shipping_cost: shipping,
                            sale_price: totalVal,
                            items: items,
                            seller_id: o.seller_id || '',
                            status: o.status || o.estado || o.estatus || 'despachado'
                        });
                    }
                });
            } catch (e) {
                console.warn('[TUCOMPRAS] Failed to parse Dropi data as JSON, falling back to CSV parser.', e.message);
            }
        }

        // 2. CSV Parser (either fallback or primary)
        if (orders.length === 0) {
            const lines = cleanText.split(/\r?\n/).filter(l => l.trim().length > 0);
            if (lines.length > 1) {
                // Detect delimiter
                const headerLine = lines[0];
                let delim = ',';
                const commaCount = (headerLine.match(/,/g) || []).length;
                const semiCount = (headerLine.match(/;/g) || []).length;
                const tabCount = (headerLine.match(/\t/g) || []).length;
                
                if (semiCount > commaCount && semiCount > tabCount) delim = ';';
                else if (tabCount > commaCount && tabCount > semiCount) delim = '\t';

                const parseCsvRow = (rowText) => {
                    let fields = [];
                    let insideQuote = false;
                    let current = '';
                    for (let i = 0; i < rowText.length; i++) {
                        const char = rowText[i];
                        if (char === '"') {
                            insideQuote = !insideQuote;
                        } else if (char === delim && !insideQuote) {
                            fields.push(current.trim());
                            current = '';
                        } else {
                            current += char;
                        }
                    }
                    fields.push(current.trim());
                    return fields;
                };

                const headers = parseCsvRow(headerLine).map(h => h.toLowerCase()
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                    .replace(/[^a-z0-9_]/g, '_')
                    .replace(/_+/g, '_')
                    .replace(/(^_|_$)/g, '')
                );

                console.log('[TUCOMPRAS] Normalized CSV headers:', headers);

                const getHeaderIdx = (synonyms) => {
                    const exactIdx = headers.findIndex(h => synonyms.some(syn => h === syn));
                    if (exactIdx !== -1) return exactIdx;
                    return headers.findIndex(h => synonyms.some(syn => h.includes(syn)));
                };

                const idxId = getHeaderIdx(['id', 'pedido', 'orden', 'consecutivo', 'numero']);
                const idxName = getHeaderIdx(['cliente', 'recibe', 'nombre', 'destinatario', 'nombre_recibe']);
                const idxPhone = getHeaderIdx(['telefono', 'celular', 'movil', 'contacto', 'celular_recibe']);
                const idxAddress = getHeaderIdx(['direccion', 'nomenclatura', 'direccion_recibe']);
                const idxCity = getHeaderIdx(['ciudad', 'municipio', 'ciudad_recibe']);
                const idxDept = getHeaderIdx(['departamento', 'estado', 'departamento_recibe']);
                const idxCarrier = getHeaderIdx(['transportadora', 'courier', 'carrier', 'nombre_transportadora']);
                const idxTracking = getHeaderIdx(['guia', 'rastrear', 'tracking', 'codigo_rastreo', 'numero_guia']);
                const idxShipping = getHeaderIdx(['flete', 'costo_envio', 'valor_envio', 'flete_recaudo']);
                const idxTotal = getHeaderIdx(['total', 'recaudo', 'valor_cobrar', 'cobro', 'valor_total']);
                const idxProductName = getHeaderIdx(['producto', 'item', 'descripcion', 'articulo', 'detalle']);
                const idxProductQty = getHeaderIdx(['cantidad', 'unidades', 'qty', 'cantidad_producto']);
                const idxDate = getHeaderIdx(['fecha', 'date']);
                const idxTime = getHeaderIdx(['hora', 'time']);
                const idxStatus = getHeaderIdx(['estatus', 'estado', 'status']);

                const groupedOrders = {};

                for (let i = 1; i < lines.length; i++) {
                    const cols = parseCsvRow(lines[i]);
                    if (cols.length < 2) continue;

                    const id = idxId !== -1 ? cols[idxId] : '';
                    const name = idxName !== -1 ? cols[idxName] : '';
                    const phone = idxPhone !== -1 ? cols[idxPhone] : '';
                    
                    if (!name && !phone) continue;

                    const groupKey = id || `${name}_${phone}`;

                    const address = idxAddress !== -1 ? cols[idxAddress] : '';
                    const city = idxCity !== -1 ? cols[idxCity] : '';
                    const dept = idxDept !== -1 ? cols[idxDept] : '';
                    const carrier = idxCarrier !== -1 ? cols[idxCarrier] : '';
                    const tracking = idxTracking !== -1 ? cols[idxTracking] : '';
                    const shipping = idxShipping !== -1 ? parseFloat(cols[idxShipping].replace(/[^\d.-]/g, '')) || 0 : 0;
                    const totalVal = idxTotal !== -1 ? parseFloat(cols[idxTotal].replace(/[^\d.-]/g, '')) || 0 : 0;
                    
                    const prodName = idxProductName !== -1 ? cols[idxProductName] : 'Producto Dropi';
                    const prodQty = idxProductQty !== -1 ? parseInt(cols[idxProductQty].replace(/[^\d]/g, '')) || 1 : 1;
                    const rawDate = idxDate !== -1 ? cols[idxDate] : '';
                    const rawTime = idxTime !== -1 ? cols[idxTime] : '';
                    const parsedDate = this.parseDropiDateStr(rawDate, rawTime);
                    const status = idxStatus !== -1 ? cols[idxStatus] : 'despachado';

                    if (!groupedOrders[groupKey]) {
                        groupedOrders[groupKey] = {
                            id: id || 'DR-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                            date: parsedDate,
                            customer_name: name,
                            customer_phone: phone,
                            customer_address: address,
                            customer_city: city,
                            customer_dept: dept,
                            carrier: carrier,
                            tracking_number: tracking,
                            shipping_cost: shipping,
                            sale_price: totalVal,
                            items: [],
                            seller_id: '',
                            status: status
                        };
                    }

                    groupedOrders[groupKey].items.push({
                        name: prodName,
                        qty: prodQty,
                        mapped_product_id: '',
                        inventory_source: 'millenio'
                    });
                }

                orders = Object.values(groupedOrders);
            }
        }

        return orders;
    },

    async handleImportOrders(indices) {
        if (!indices || indices.length === 0) {
            alert('Por favor seleccione al menos un pedido para importar.');
            return;
        }

        const erpProducts = Inventory.getProducts().filter(p => p.active !== false);
        let successCount = 0;

        for (const idx of indices) {
            const order = this.pendingImportOrders[idx];
            if (!order) continue;

            // 1. Validation
            if (!order.seller_id) {
                alert(`⚠️ El pedido de "${order.customer_name}" no tiene Vendedor asignado.`);
                return;
            }

            const missingMap = order.items.some(item => !item.mapped_product_id);
            if (missingMap) {
                alert(`⚠️ El pedido de "${order.customer_name}" tiene artículos sin mapear a productos del ERP.`);
                return;
            }

            // Validate stock availability
            const stockErrors = [];
            for (const item of order.items) {
                const product = erpProducts.find(p => p.id === item.mapped_product_id);
                if (!product) {
                    stockErrors.push(`El producto mapeado para "${item.name}" no existe.`);
                    continue;
                }
                const source = item.inventory_source || 'millenio';
                const available = source === 'millenio' ? (product.stockMillenio || 0) : (product.stockVulcano || 0);
                if (item.qty > available) {
                    stockErrors.push(`"${product.name}": solicitados ${item.qty}, disponibles ${available} en ${source}.`);
                }
            }
            if (stockErrors.length > 0) {
                alert(`❌ Stock insuficiente para el pedido de "${order.customer_name}":\n\n` + stockErrors.join('\n'));
                return;
            }

            // 2. Process stock discount
            for (const item of order.items) {
                const product = erpProducts.find(p => p.id === item.mapped_product_id);
                if (product) {
                    const source = item.inventory_source || 'millenio';
                    if (source === 'millenio') product.stockMillenio -= item.qty;
                    else product.stockVulcano -= item.qty;
                    await Storage.updateItem(STORAGE_KEYS.PRODUCTS, product.id, product);
                }
            }

            // 3. Create items list for ERP TuCompras sale
            const finalSaleItems = order.items.map(item => {
                const prod = erpProducts.find(p => p.id === item.mapped_product_id);
                return {
                    product_id: item.mapped_product_id,
                    name: prod.name,
                    qty: item.qty,
                    cost_price: prod.priceWholesale || prod.cost || 0,
                    sale_price: order.sale_price ? (order.sale_price / order.items.length) : (prod.priceFinal || 0), // Fallback if price is not in screen copy-paste
                    commission_paid: prod.commissionBase || 0,
                    inventory_source: item.inventory_source
                };
            });

            const totalCommission = finalSaleItems.reduce((sum, i) => sum + (parseFloat(i.commission_paid) * i.qty), 0);

            // Construct sale object
            const sale = {
                id: 'TC-DR-' + order.id,
                date: order.date || new Date().toISOString(),
                customer_name: order.customer_name,
                customer_phone: order.customer_phone,
                seller_id: order.seller_id,
                carrier: order.carrier,
                tracking_number: order.tracking_number,
                inventory_source: order.items[0].inventory_source,
                status: 'despachado',
                shipping_cost: order.shipping_cost,
                commission_paid: totalCommission,
                items: finalSaleItems,
                money_confirmed: false,
                is_paid_to_inventory: false
            };

            // Save sale
            await Storage.addItem(STORAGE_KEYS.TUCOMPRAS_SALES, sale);

            // CRM Sync
            await TuComprasCRM.addCustomer({
                name: order.customer_name,
                phone: order.customer_phone,
                dept: order.customer_dept || '',
                city: order.customer_city || '',
                address: order.customer_address || ''
            });

            successCount++;
        }

        // Clean imported items from list
        this.pendingImportOrders = this.pendingImportOrders.filter((_, idx) => !indices.includes(idx));

        alert(`¡Se importaron ${successCount} pedidos al ERP exitosamente!`);
        this.renderPanel();
    }
};
