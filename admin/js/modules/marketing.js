/**
 * ERP AC Marketing & Meta Ads (CAPI) Module
 */

window.MetaAPI = {
    getSettings() {
        try {
            const raw = localStorage.getItem('erp_meta_config');
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return {
            pixelId: '1765263381138535',
            accessToken: 'EAAaDmZC6MvwYBSMGfLBYZAZCLbTT8kUZA1X88mJdUtxcMgchSYZAMyi8Hlo2rWTDgiFDVwg4rKB8ZCOTNKxZBdZCA7CSNeRPjxCr4EkUxxDNLVZCYUANXeHDbkBqakybMTHagYprjKJg87dZC9t7LLiZAOr7NFp4Wi2vTiUHIBRp2yOUYk1vLTQM6bycsvvB9kzQTsURQZDZD',
            testEventCode: '',
            enabled: true
        };
    },

    saveSettings(config) {
        localStorage.setItem('erp_meta_config', JSON.stringify(config));
    },

    async hashSHA256(str) {
        if (!str) return null;
        const cleanStr = String(str).trim().toLowerCase();
        const encoder = new TextEncoder();
        const data = encoder.encode(cleanStr);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    async sendPurchaseEvent({ sale, customerName, customerPhone, customerCity, totalValue, items }) {
        const config = this.getSettings();
        if (!config || !config.enabled || !config.pixelId || !config.accessToken) {
            console.warn('[Meta CAPI] Meta Ads disabled or credentials missing.');
            return { success: false, reason: 'credentials_missing' };
        }

        try {
            let fnHash = null;
            let lnHash = null;
            if (customerName) {
                const parts = customerName.trim().split(' ');
                fnHash = await this.hashSHA256(parts[0]);
                if (parts.length > 1) {
                    lnHash = await this.hashSHA256(parts.slice(1).join(' '));
                }
            }

            let rawPhone = customerPhone ? String(customerPhone).replace(/\D/g, '') : '';
            if (rawPhone && !rawPhone.startsWith('57') && rawPhone.length === 10) {
                rawPhone = '57' + rawPhone;
            }
            const phHash = rawPhone ? await this.hashSHA256(rawPhone) : null;
            const ctHash = customerCity ? await this.hashSHA256(customerCity) : null;
            const countryHash = await this.hashSHA256('co');

            const eventTime = Math.floor(Date.now() / 1000);
            const eventId = sale && sale.id ? sale.id : ('sale_' + Date.now());

            const contentList = (items || []).map(i => ({
                id: i.product_id || i.id || 'prod',
                quantity: parseInt(i.qty) || 1,
                item_price: parseFloat(i.sale_price || i.price || 0)
            }));

            const eventData = {
                event_name: 'Purchase',
                event_time: eventTime,
                event_id: eventId,
                action_source: 'system',
                user_data: {
                    fn: fnHash ? [fnHash] : undefined,
                    ln: lnHash ? [lnHash] : undefined,
                    ph: phHash ? [phHash] : undefined,
                    ct: ctHash ? [ctHash] : undefined,
                    country: [countryHash]
                },
                custom_data: {
                    currency: 'COP',
                    value: parseFloat(totalValue) || 0,
                    contents: contentList.length > 0 ? contentList : undefined,
                    content_type: 'product'
                }
            };

            const payload = {
                data: [eventData]
            };

            if (config.testEventCode && config.testEventCode.trim().length > 0) {
                payload.test_event_code = config.testEventCode.trim();
            }

            const url = `https://graph.facebook.com/v19.0/${config.pixelId.trim()}/events?access_token=${config.accessToken.trim()}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const resData = await response.json();
            console.log('[Meta CAPI Response]:', resData);

            this.logEvent({
                timestamp: new Date().toISOString(),
                eventName: 'Purchase',
                customerName: customerName || 'Cliente',
                value: totalValue,
                status: response.ok ? '200 OK (Éxito)' : 'Error: ' + (resData.error?.message || 'Falló'),
                response: resData
            });

            return { success: response.ok, response: resData };
        } catch (err) {
            console.error('[Meta CAPI Error]:', err);
            this.logEvent({
                timestamp: new Date().toISOString(),
                eventName: 'Purchase',
                customerName: customerName || 'Cliente',
                value: totalValue,
                status: 'Error de Red: ' + err.message
            });
            return { success: false, error: err };
        }
    },

    logEvent(logEntry) {
        try {
            let logs = [];
            const raw = localStorage.getItem('erp_meta_logs');
            if (raw) logs = JSON.parse(raw);
            logs.unshift(logEntry);
            if (logs.length > 50) logs = logs.slice(0, 50);
            localStorage.setItem('erp_meta_logs', JSON.stringify(logs));
        } catch (e) {}
    },

    getLogs() {
        try {
            const raw = localStorage.getItem('erp_meta_logs');
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return [];
    }
};

window.Marketing = {
    async init() {
        // Initial setup
    },

    async renderPanel() {
        const contentArea = document.getElementById('content-area');
        
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        
        if (!document.getElementById('marketing-panel')) {
            const panel = document.createElement('div');
            panel.id = 'marketing-panel';
            panel.className = 'panel';
            contentArea.appendChild(panel);
        }

        const panel = document.getElementById('marketing-panel');
        panel.classList.add('active');
        
        const metaConfig = MetaAPI.getSettings();
        const logs = MetaAPI.getLogs();

        panel.innerHTML = `
            <div class="panel-header">
                <h1>Marketing & Meta Ads (Conversions API)</h1>
                <div class="actions">
                    <button class="btn btn-primary" onclick="Marketing.showNotificationModal()">
                        <i class="fas fa-paper-plane"></i> Nueva Notificación Web
                    </button>
                </div>
            </div>

            <!-- META ADS INTEGRATION CARD -->
            <div class="stat-card" style="margin-top: 1.5rem; background: var(--card-bg, #1e293b); border-radius: 12px; padding: 1.5rem; border: 1px solid rgba(255,255,255,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.8rem;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fab fa-facebook-square" style="font-size: 2rem; color: #1877f2;"></i>
                        <div>
                            <h3 style="margin:0;">Conexión Meta Ads / Conversions API (CAPI)</h3>
                            <small class="text-secondary">Cuenta Publicitaria: <strong>Tucomprascol COP</strong></small>
                        </div>
                    </div>
                    <div>
                        <span class="badge ${metaConfig.enabled ? 'bg-success' : 'bg-secondary'}" style="font-size: 0.9rem; padding: 6px 12px;">
                            ${metaConfig.enabled ? '🟢 CONECTADO (Activo)' : '⚪ DESCONECTADO'}
                        </span>
                    </div>
                </div>

                <form id="meta-config-form" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem;">
                    <div class="form-group">
                        <label style="font-weight: 600;">ID del Píxel / Conjunto de Datos (Meta Pixel ID) *</label>
                        <input type="text" id="meta-pixel-id" class="form-control" value="${metaConfig.pixelId || ''}" required placeholder="Ej: 1765263381138535">
                    </div>

                    <div class="form-group">
                        <label style="font-weight: 600;">Código de Evento de Prueba (Opcional - Test Event Code)</label>
                        <input type="text" id="meta-test-code" class="form-control" value="${metaConfig.testEventCode || ''}" placeholder="Ej: TEST12345 (Dejar vacío en producción)">
                    </div>

                    <div class="form-group" style="grid-column: 1 / -1;">
                        <label style="font-weight: 600;">Token de Acceso de la API de Conversiones (CAPI Token) *</label>
                        <textarea id="meta-access-token" class="form-control" rows="3" required placeholder="EAAa...">${metaConfig.accessToken || ''}</textarea>
                    </div>

                    <div style="grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" id="meta-enabled-toggle" ${metaConfig.enabled ? 'checked' : ''}>
                            <span>Activar envío automático de ventas de TuCompras a Meta Ads</span>
                        </label>
                        <div style="display: flex; gap: 10px;">
                            <button type="button" class="btn btn-outline" onclick="Marketing.testMetaConversion()">
                                <i class="fas fa-vial"></i> Enviar Conversión de Prueba
                            </button>
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> Guardar Configuración
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            <!-- LOGS TABLE -->
            <div class="table-container" style="margin-top: 2rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                    <h3><i class="fas fa-chart-line" style="color: #1877f2;"></i> Historial de Conversiones Enviadas a Meta (CAPI)</h3>
                    <button class="btn btn-outline btn-sm" onclick="Marketing.renderPanel()"><i class="fas fa-sync"></i> Actualizar</button>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Evento</th>
                            <th>Cliente</th>
                            <th>Valor Venta (COP)</th>
                            <th>Respuesta Meta (CAPI)</th>
                        </tr>
                    </thead>
                    <tbody id="meta-logs-tbody">
                        ${logs.length === 0 ? '<tr><td colspan="5" class="text-center">Aún no se han enviado conversiones. Al registrar despachos en TuCompras aparecerán aquí en tiempo real.</td></tr>' : 
                            logs.map(l => `
                                <tr>
                                    <td>${new Date(l.timestamp).toLocaleString()}</td>
                                    <td><span class="badge bg-blue">${l.eventName}</span></td>
                                    <td>${l.customerName}</td>
                                    <td><strong>$${parseFloat(l.value || 0).toLocaleString()} COP</strong></td>
                                    <td><span class="badge ${l.status.includes('200') ? 'bg-success' : 'bg-danger'}">${l.status}</span></td>
                                </tr>
                            `).join('')
                        }
                    </tbody>
                </table>
            </div>

            <!-- NOTIFICATIONS HISTORIAL -->
            <div class="table-container" style="margin-top: 2rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                    <h3>Historial de Notificaciones Web</h3>
                    <button class="btn btn-outline btn-sm" onclick="Marketing.fetchNotifications()"><i class="fas fa-sync"></i></button>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Cliente (ID)</th>
                            <th>Título</th>
                            <th>Mensaje</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody id="notif-history">
                        <tr><td colspan="5" class="text-center">Cargando historial...</td></tr>
                    </tbody>
                </table>
            </div>
        `;

        document.getElementById('meta-config-form').onsubmit = (e) => {
            e.preventDefault();
            const config = {
                pixelId: document.getElementById('meta-pixel-id').value.trim(),
                accessToken: document.getElementById('meta-access-token').value.trim(),
                testEventCode: document.getElementById('meta-test-code').value.trim(),
                enabled: document.getElementById('meta-enabled-toggle').checked
            };
            MetaAPI.saveSettings(config);
            alert('✅ Configuración de Meta Ads guardada con éxito.');
            this.renderPanel();
        };

        this.fetchNotifications();
    },

    async testMetaConversion() {
        const btn = document.activeElement;
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando a Meta...';
        }
        try {
            const res = await MetaAPI.sendPurchaseEvent({
                sale: { id: 'test_' + Date.now() },
                customerName: 'Cliente Prueba ERP',
                customerPhone: '573000000000',
                customerCity: 'Bogotá',
                totalValue: 150000,
                items: [{ product_id: 'test_prod', qty: 1, sale_price: 150000 }]
            });

            if (res.success) {
                alert('🎉 ¡Prueba Exitosa! Meta Ads (CAPI) recibió la conversión de prueba correctamente (200 OK).');
            } else {
                alert('⚠️ Meta devolvió un aviso o error:\n\n' + JSON.stringify(res.response || res.error));
            }
        } catch (e) {
            alert('❌ Error al probar envío: ' + e.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-vial"></i> Enviar Conversión de Prueba';
            }
            this.renderPanel();
        }
    },

    async fetchNotifications() {
        const { data, error } = await window.supabaseClient.from('marketing_notifications').select('*').order('createdAt', { ascending: false });
        const tbody = document.getElementById('notif-history');
        
        if (error || !data) {
            if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error al cargar historial</td></tr>';
            return;
        }

        if (tbody) {
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay notificaciones enviadas</td></tr>';
                return;
            }

            tbody.innerHTML = data.map(n => `
                <tr>
                    <td>${new Date(n.createdAt).toLocaleString()}</td>
                    <td><small>${n.customer_id || 'Global'}</small></td>
                    <td><strong>${n.title}</strong></td>
                    <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${n.message}</td>
                    <td><span class="badge ${n.is_read ? 'bg-success' : 'bg-warning'}">${n.is_read ? 'Leída' : 'Pendiente'}</span></td>
                </tr>
            `).join('');
        }
    },

    async showNotificationModal() {
        const modalId = 'marketing-notif-modal';
        let modal = document.getElementById(modalId);
        
        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal';
            document.body.appendChild(modal);
        }

        const { data: customers } = await window.supabaseClient.from('tucompras_customers').select('id, name');

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>Nueva Notificación</h2>
                    <span class="close-modal" onclick="document.getElementById('${modalId}').style.display='none'">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="marketing-notif-form">
                        <div class="form-group">
                            <label>Cliente Destino</label>
                            <select id="notif-customer" class="form-select" required>
                                <option value="all">Todos los clientes</option>
                                ${customers?.map(c => `<option value="${c.id}">${c.name}</option>`).join('') || ''}
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Título</label>
                            <input type="text" id="notif-title" class="form-control" required placeholder="Ej: ¡Oferta Flash!">
                        </div>
                        <div class="form-group">
                            <label>Mensaje</label>
                            <textarea id="notif-message" class="form-control" required rows="4" placeholder="Escribe el contenido..."></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary btn-block" style="margin-top: 1.5rem; height: 50px;">ENVIAR NOTIFICACIÓN</button>
                    </form>
                </div>
            </div>
        `;

        modal.style.display = 'flex';

        document.getElementById('marketing-notif-form').onsubmit = async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

            const payload = {
                customer_id: document.getElementById('notif-customer').value === 'all' ? null : document.getElementById('notif-customer').value,
                title: document.getElementById('notif-title').value,
                message: document.getElementById('notif-message').value
            };

            const { error } = await window.supabaseClient.from('marketing_notifications').insert([payload]);

            if (error) {
                alert('Error al enviar: ' + error.message);
                btn.disabled = false;
                btn.innerHTML = 'ENVIAR NOTIFICACIÓN';
            } else {
                alert('Notificación enviada con éxito');
                modal.style.display = 'none';
                this.fetchNotifications();
            }
        };
    }
};
