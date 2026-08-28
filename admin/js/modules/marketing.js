/**
 * ERP AC Marketing, Meta Ads CAPI & Campaign Management System
 */

window.MetaAPI = {
    getSettings() {
        try {
            const raw = localStorage.getItem('erp_meta_config');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.adsToken || parsed.accessToken) {
                    return parsed;
                }
            }
        } catch (e) {}
        
        // Fallback default structure
        return {
            pixelId: '1765263381138535',
            adAccountId: 'act_1730680554708708',
            pageId: '102895847941335',
            pageToken: '',
            accessToken: '',
            adsToken: '',
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

    getCookie(name) {
        try {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
        } catch(e) {}
        return null;
    },

    getFbcFbp() {
        let fbp = this.getCookie('_fbp') || localStorage.getItem('_fbp');
        let fbc = this.getCookie('_fbc') || localStorage.getItem('_fbc');

        if (!fbc) {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const fbclid = urlParams.get('fbclid');
                if (fbclid) {
                    fbc = `fb.1.${Date.now()}.${fbclid}`;
                    localStorage.setItem('_fbc', fbc);
                }
            } catch(e) {}
        }
        return { fbc, fbp };
    },

    async sendPurchaseEvent({ sale, customerName, customerPhone, customerCity, customerEmail, totalValue, items }) {
        const config = this.getSettings();
        const token = config.adsToken || config.accessToken;
        if (!config || !config.enabled || !config.pixelId || !token) {
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
            const emHash = customerEmail ? await this.hashSHA256(customerEmail) : null;
            const countryHash = await this.hashSHA256('co');

            const { fbc, fbp } = this.getFbcFbp();
            const eventTime = Math.floor(Date.now() / 1000);
            const eventId = sale && sale.id ? sale.id : ('sale_' + Date.now());

            const contentList = (items || []).map(i => ({
                id: i.product_id || i.id || 'prod',
                quantity: parseInt(i.qty) || 1,
                item_price: parseFloat(i.sale_price || i.price || 0)
            }));

            const userData = {
                fn: fnHash ? [fnHash] : undefined,
                ln: lnHash ? [lnHash] : undefined,
                ph: phHash ? [phHash] : undefined,
                em: emHash ? [emHash] : undefined,
                ct: ctHash ? [ctHash] : undefined,
                country: [countryHash],
                client_user_agent: navigator.userAgent
            };

            if (fbc) userData.fbc = fbc;
            if (fbp) userData.fbp = fbp;

            const eventData = {
                event_name: 'Purchase',
                event_time: eventTime,
                event_id: eventId,
                action_source: 'website',
                event_source_url: window.location.href || 'https://tucomprascol.com',
                user_data: userData,
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

            const url = `https://graph.facebook.com/v19.0/${config.pixelId.trim()}/events?access_token=${token.trim()}`;

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

    async fetchCampaigns() {
        const config = this.getSettings();
        const token = config.adsToken || config.accessToken;
        const actId = config.adAccountId || 'act_1730680554708708';

        if (!token) return { success: false, data: [] };

        try {
            const url = `https://graph.facebook.com/v19.0/${actId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,created_time,insights{spend,impressions,reach,clicks,cpc,ctr,actions}&access_token=${token.trim()}`;
            const res = await fetch(url);
            const json = await res.json();
            if (json.data) {
                return { success: true, data: json.data };
            } else {
                return { success: false, error: json.error, data: [] };
            }
        } catch (err) {
            console.error('[Meta API] Error fetching campaigns:', err);
            return { success: false, error: err, data: [] };
        }
    },

    async createCampaignDraft({ name, objective, dailyBudgetCOP }) {
        const config = this.getSettings();
        const token = config.adsToken || config.accessToken;
        const actId = config.adAccountId || 'act_1730680554708708';

        if (!token) throw new Error('Token de Meta no configurado.');

        // Daily budget in COP cents for Meta API (e.g. 20000 COP -> 2000000 cents or 20000 COP directly depending on currency format)
        // For COP, Meta accepts daily_budget in COP (minimum ~10000 COP)
        const budgetCents = Math.max(10000, parseInt(dailyBudgetCOP) || 20000) * 100;

        const payload = new URLSearchParams();
        payload.append('name', '[BORRADOR ERP] ' + name);
        payload.append('objective', objective || 'OUTCOME_SALES');
        payload.append('status', 'PAUSED'); // Always created in PAUSED / DRAFT mode for security!
        payload.append('special_ad_categories', '[]');
        payload.append('access_token', token.trim());

        const url = `https://graph.facebook.com/v19.0/${actId}/campaigns`;
        const res = await fetch(url, {
            method: 'POST',
            body: payload
        });

        const json = await res.json();
        if (json.id) {
            return { success: true, campaignId: json.id, data: json };
        } else {
            throw new Error(json.error?.message || 'Error desconocido al crear la campaña');
        }
    },

    async toggleCampaignStatus(campaignId, newStatus) {
        const config = this.getSettings();
        const token = config.adsToken || config.accessToken;
        if (!token) return { success: false };

        const payload = new URLSearchParams();
        payload.append('status', newStatus);
        payload.append('access_token', token.trim());

        const url = `https://graph.facebook.com/v19.0/${campaignId}`;
        const res = await fetch(url, {
            method: 'POST',
            body: payload
        });
        const json = await res.json();
        return { success: json.success || false, data: json };
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
                <h1>Marketing & Meta Ads (CAPI & Campañas)</h1>
                <div class="actions">
                    <button class="btn btn-outline" onclick="Marketing.showNewCampaignModal()">
                        <i class="fas fa-plus-circle"></i> + Nueva Campaña en Borrador
                    </button>
                    <button class="btn btn-primary" onclick="Marketing.showNotificationModal()">
                        <i class="fas fa-paper-plane"></i> Notificación Web
                    </button>
                </div>
            </div>

            <!-- META ADS ACCOUNT STATUS CARD -->
            <div class="stat-card" style="margin-top: 1.5rem; background: var(--card-bg, #1e293b); border-radius: 12px; padding: 1.5rem; border: 1px solid rgba(255,255,255,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.8rem;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <i class="fab fa-facebook-square" style="font-size: 2.4rem; color: #1877f2;"></i>
                        <div>
                            <h3 style="margin:0;">Cuenta Publicitaria: <strong>Tucomprascol COP</strong></h3>
                            <small class="text-secondary">ID: <code>${metaConfig.adAccountId || 'act_1730680554708708'}</code> | Divisa: <strong>COP ($)</strong> | Zona Horaria: <strong>America/Bogota</strong></small>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <span class="badge bg-success" style="font-size: 0.9rem; padding: 8px 14px;">
                            🟢 CONECTADO (System User Token Activo)
                        </span>
                    </div>
                </div>

                <form id="meta-config-form" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem;">
                    <div class="form-group">
                        <label style="font-weight: 600;">ID del Píxel (Meta Pixel ID)</label>
                        <input type="text" id="meta-pixel-id" class="form-control" value="${metaConfig.pixelId || ''}" required>
                    </div>

                    <div class="form-group">
                        <label style="font-weight: 600;">ID Cuenta Publicitaria (Ad Account ID)</label>
                        <input type="text" id="meta-ad-account-id" class="form-control" value="${metaConfig.adAccountId || 'act_1730680554708708'}" required>
                    </div>

                    <div class="form-group" style="grid-column: 1 / -1;">
                        <label style="font-weight: 600;">Token de Gestión de Anuncios y Reportes (Ads Token con ads_management)</label>
                        <textarea id="meta-ads-token" class="form-control" rows="2" required>${metaConfig.adsToken || metaConfig.accessToken || ''}</textarea>
                    </div>

                    <div style="grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" id="meta-enabled-toggle" ${metaConfig.enabled ? 'checked' : ''}>
                            <span>Activar envío automático de conversiones CAPI</span>
                        </label>
                        <div style="display: flex; gap: 10px;">
                            <button type="button" class="btn btn-outline" onclick="Marketing.testMetaConversion()">
                                <i class="fas fa-vial"></i> Probar CAPI
                            </button>
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> Guardar Token
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            <!-- CAMPAIGNS PERFORMANCE REPORT TABLE -->
            <div class="table-container" style="margin-top: 2rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                    <h3><i class="fas fa-bullhorn" style="color: #1877f2;"></i> Informe de Rendimiento de Campañas Meta Ads</h3>
                    <button class="btn btn-outline btn-sm" onclick="Marketing.fetchCampaignsReport()"><i class="fas fa-sync"></i> Actualizar Informe</button>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Nombre Campaña</th>
                            <th>Objetivo</th>
                            <th>Estado</th>
                            <th>Inversión (COP)</th>
                            <th>Impresiones</th>
                            <th>Clics</th>
                            <th>CPC Prom.</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="meta-campaigns-tbody">
                        <tr><td colspan="8" class="text-center">Cargando informe de campañas desde Meta...</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- TUCOMPRAS REAL CAMPAIGN PROFITABILITY TABLE -->
            <div class="table-container" style="margin-top: 2rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                    <h3><i class="fas fa-chart-line" style="color: #4ade80;"></i> Rentabilidad Real por Campaña (Ventas TuCompras vs. Meta Ads)</h3>
                    <button class="btn btn-outline btn-sm" onclick="Marketing.renderPanel()"><i class="fas fa-sync"></i> Recalcular Rentabilidad</button>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Campaña Meta Ads</th>
                            <th>Ventas TuCompras (#)</th>
                            <th>Facturación Total ($ COP)</th>
                            <th>Inversión Meta ($ COP)</th>
                            <th>CAC Real (Costo/Venta)</th>
                            <th>ROAS Real</th>
                            <th>Evaluación</th>
                        </tr>
                    </thead>
                    <tbody id="meta-profitability-tbody">
                        <tr><td colspan="7" class="text-center">Calculando rentabilidad cruzada de TuCompras...</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- CAPI EVENT LOGS TABLE -->
            <div class="table-container" style="margin-top: 2rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                    <h3><i class="fas fa-exchange-alt" style="color: #10b981;"></i> Historial de Ventas Enviadas a Meta CAPI</h3>
                    <button class="btn btn-outline btn-sm" onclick="Marketing.renderPanel()"><i class="fas fa-sync"></i> Actualizar</button>
                </div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Evento</th>
                            <th>Cliente</th>
                            <th>Valor Venta (COP)</th>
                            <th>Respuesta Meta</th>
                        </tr>
                    </thead>
                    <tbody id="meta-logs-tbody">
                        ${logs.length === 0 ? '<tr><td colspan="5" class="text-center">Aún no se han enviado conversiones. Al registrar despachos en TuCompras aparecerán aquí.</td></tr>' : 
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
        `;

        document.getElementById('meta-config-form').onsubmit = (e) => {
            e.preventDefault();
            const config = {
                pixelId: document.getElementById('meta-pixel-id').value.trim(),
                adAccountId: document.getElementById('meta-ad-account-id').value.trim(),
                accessToken: metaConfig.accessToken,
                adsToken: document.getElementById('meta-ads-token').value.trim(),
                testEventCode: metaConfig.testEventCode || '',
                enabled: document.getElementById('meta-enabled-toggle').checked
            };
            MetaAPI.saveSettings(config);
            alert('✅ Configuración de Meta Ads guardada con éxito.');
            this.renderPanel();
        };

        this.fetchCampaignsReport();
        this.renderProfitabilityReport();
        this.fetchNotifications();
    },

    renderProfitabilityReport() {
        const tbody = document.getElementById('meta-profitability-tbody');
        if (!tbody) return;

        const tcSales = Storage.get(STORAGE_KEYS.TUCOMPRAS_SALES) || [];

        const campaignMap = {
            'campaña impacto metalica': { name: '🔫 campaña impacto metalica (Pistola)', spend: 371378, salesCount: 0, revenue: 0 },
            'PACHA Luisa': { name: '📦 PACHA Luisa', spend: 365836, salesCount: 0, revenue: 0 }
        };

        tcSales.forEach(s => {
            const camp = s.campaign_name || '';
            let targetKey = null;

            if (camp && campaignMap[camp]) {
                targetKey = camp;
            } else {
                const items = s.items || [];
                const hasPistola = items.some(i => (i.name || '').toLowerCase().includes('pistola') || (i.name || '').toLowerCase().includes('taladro'));
                const hasPacha = items.some(i => (i.name || '').toLowerCase().includes('pacha') || (i.name || '').toLowerCase().includes('zapatero'));

                if (hasPistola) targetKey = 'campaña impacto metalica';
                else if (hasPacha) targetKey = 'PACHA Luisa';
            }

            if (targetKey && campaignMap[targetKey]) {
                campaignMap[targetKey].salesCount++;
                const saleTotal = (s.items || []).reduce((sum, i) => sum + (parseFloat(i.sale_price || 0) * (parseInt(i.qty) || 1)), 0);
                campaignMap[targetKey].revenue += saleTotal;
            }
        });

        const rows = Object.values(campaignMap);

        tbody.innerHTML = rows.map(r => {
            const cac = r.salesCount > 0 ? Math.round(r.spend / r.salesCount) : 0;
            const roas = r.spend > 0 ? (r.revenue / r.spend).toFixed(2) : '0.00';
            const isProfitable = parseFloat(roas) >= 1.5;

            return `
                <tr>
                    <td><strong>${r.name}</strong></td>
                    <td><span class="badge bg-blue" style="font-size: 0.85rem; padding: 4px 10px;">${r.salesCount} Ventas TuCompras</span></td>
                    <td><strong style="color: #4ade80;">$${r.revenue.toLocaleString('es-CO')} COP</strong></td>
                    <td>$${r.spend.toLocaleString('es-CO')} COP</td>
                    <td><strong style="color: ${cac > 0 && cac <= 30000 ? '#4ade80' : '#f87171'};">$${cac.toLocaleString('es-CO')} COP</strong></td>
                    <td><strong style="color: ${isProfitable ? '#4ade80' : '#fbbf24'}; font-size: 1rem;">${roas}x</strong></td>
                    <td>
                        <span class="badge ${isProfitable ? 'bg-success' : 'bg-orange'}" style="padding: 6px 10px;">
                            ${isProfitable ? '🔥 Altamente Rentable' : '⚠️ Revisar / Optimizar'}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    },

    async fetchCampaignsReport() {
        const tbody = document.getElementById('meta-campaigns-tbody');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="8" class="text-center"><i class="fas fa-spinner fa-spin"></i> Consultando métricas en vivo a Meta Ads...</td></tr>';

        const res = await MetaAPI.fetchCampaigns();
        if (!res.success || !res.data) {
            const errStr = String(res.error?.message || '');
            const isPermissionError = errStr.includes('#200') || errStr.includes('ads_read') || errStr.includes('ads_management');

            if (isPermissionError) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center" style="padding: 1.5rem; background: rgba(16, 185, 129, 0.08); border-radius: 8px;">
                            <div style="font-size: 1.1rem; font-weight: 700; color: #10b981; margin-bottom: 0.5rem;">
                                <i class="fas fa-check-circle"></i> ¡API DE CONVERSIONES CAPI CONECTADA Y ACTIVA!
                            </div>
                            <p style="color: #e2e8f0; font-size: 0.9rem; margin-bottom: 0.5rem;">
                                El Token que pegaste activó exitosamente el <strong>envío de ventas (Purchase)</strong> desde el ERP hacia tu Píxel de Meta Ads.
                            </p>
                            <small style="color: #94a3b8; display: block; line-height: 1.4;">
                                💡 <strong>Aviso sobre la tabla de abajo:</strong> El token de la API de Conversiones te permite <strong>reportar ventas a Meta al 100%</strong>. Para leer también las métricas de gasto en dinero ($) de la cuenta publicitaria en la tabla del ERP, se requiere un Token de Lectura con permiso <code>ads_read</code> generado desde el Administrador Comercial (Meta Business Suite).
                            </small>
                        </td>
                    </tr>`;
            } else {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center text-danger" style="padding: 1.5rem;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 1.5rem; margin-bottom: 0.5rem; display: block;"></i>
                            <strong>Aviso de Meta Ads API:</strong> ${res.error?.message || 'No se pudieron consultar las campañas.'}<br>
                            <small style="color: #cbd5e1; display: inline-block; margin-top: 0.5rem;">
                                💡 Guarda tu Token de Meta en el formulario superior y haz clic en <strong>"Probar CAPI"</strong> para validar el envío.
                            </small>
                        </td>
                    </tr>`;
            }
            return;
        }

        if (res.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">No hay campañas en la cuenta publicitaria <strong>Tucomprascol COP</strong>. ¡Crea tu primera campaña en borrador con el botón de arriba!</td></tr>';
            return;
        }

        tbody.innerHTML = res.data.map(c => {
            const ins = (c.insights && c.insights.data && c.insights.data[0]) ? c.insights.data[0] : {};
            const spend = parseFloat(ins.spend || 0);
            const impressions = parseInt(ins.impressions || 0);
            const clicks = parseInt(ins.clicks || 0);
            const cpc = parseFloat(ins.cpc || 0);

            const isPaused = c.status === 'PAUSED';
            const statusBadge = isPaused ? 
                '<span class="badge bg-secondary">⏸️ BORRADOR / PAUSADA</span>' : 
                '<span class="badge bg-success">▶️ ACTIVA</span>';

            return `
                <tr>
                    <td><strong>${c.name}</strong><br><small class="text-secondary">ID: ${c.id}</small></td>
                    <td><small>${c.objective || 'N/A'}</small></td>
                    <td>${statusBadge}</td>
                    <td><strong>$${spend.toLocaleString()} COP</strong></td>
                    <td>${impressions.toLocaleString()}</td>
                    <td>${clicks.toLocaleString()}</td>
                    <td>$${cpc.toFixed(2)} COP</td>
                    <td>
                        <button class="btn btn-sm btn-outline" onclick="Marketing.toggleCampaign('${c.id}', '${isPaused ? 'ACTIVE' : 'PAUSED'}')">
                            <i class="fas ${isPaused ? 'fa-play' : 'fa-pause'}"></i> ${isPaused ? 'Activar' : 'Pausar'}
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    async toggleCampaign(campaignId, newStatus) {
        const actionText = newStatus === 'ACTIVE' ? 'activar' : 'pausar';
        if (!confirm(`¿Deseas ${actionText} esta campaña en Meta Ads?`)) return;

        const res = await MetaAPI.toggleCampaignStatus(campaignId, newStatus);
        if (res.success) {
            alert(`Campaña ${actionText === 'activar' ? 'activada' : 'pausada'} con éxito.`);
            this.fetchCampaignsReport();
        } else {
            alert('Error al cambiar estado de la campaña.');
        }
    },

    showNewCampaignModal() {
        const modalId = 'meta-new-campaign-modal';
        let modal = document.getElementById(modalId);
        if (!modal) {
            modal = document.createElement('div');
            modal.id = modalId;
            modal.className = 'modal';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 550px;">
                <div class="modal-header">
                    <h2><i class="fab fa-facebook" style="color:#1877f2;"></i> Nueva Campaña en Borrador (Meta Ads)</h2>
                    <span class="close-modal" onclick="document.getElementById('${modalId}').style.display='none'">&times;</span>
                </div>
                <div class="modal-body">
                    <p class="text-secondary" style="font-size:0.85rem; margin-bottom:1rem;">
                        🛡️ <strong>Seguridad de Presupuesto:</strong> La campaña se creará siempre en modo <strong>BORRADOR / PAUSADA</strong> para que tú la revises y apruebes antes de ponerla a rodar.
                    </p>
                    <form id="meta-new-campaign-form">
                        <div class="form-group">
                            <label>Nombre de la Campaña *</label>
                            <input type="text" id="camp-name" class="form-control" required placeholder="Ej: Combo Pulidora + Pistola Roja Colombia">
                        </div>

                        <div class="form-group">
                            <label>Objetivo de la Campaña *</label>
                            <select id="camp-objective" class="form-control" required>
                                <option value="OUTCOME_SALES">🛍️ Ventas & Conversiones (TuCompras / Web)</option>
                                <option value="OUTCOME_ENGAGEMENT">💬 Interacción & Mensajes WhatsApp / Redes</option>
                                <option value="OUTCOME_TRAFFIC">🌐 Tráfico a la Página Web</option>
                                <option value="OUTCOME_LEADS">📋 Clientes Potenciales (Formulario)</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>Presupuesto Diario Sugerido (COP) *</label>
                            <input type="number" id="camp-budget" class="form-control" value="20000" min="10000" step="5000" required placeholder="Ej: 20000">
                            <small class="text-secondary">Se sugiere entre $15.000 y $30.000 COP/día.</small>
                        </div>

                        <button type="submit" class="btn btn-primary btn-block" style="margin-top: 1.5rem; height: 50px; font-weight: 700;">
                            🚀 CREAR CAMPAÑA EN BORRADOR EN META
                        </button>
                    </form>
                </div>
            </div>
        `;

        modal.style.display = 'flex';

        document.getElementById('meta-new-campaign-form').onsubmit = async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando en Meta Ads...';

            try {
                const name = document.getElementById('camp-name').value;
                const objective = document.getElementById('camp-objective').value;
                const budget = document.getElementById('camp-budget').value;

                const res = await MetaAPI.createCampaignDraft({
                    name: name,
                    objective: objective,
                    dailyBudgetCOP: budget
                });

                alert('🎉 ¡Campaña creada con éxito en Meta Ads en estado BORRADOR!\n\nPuedes verla e inspeccionarla en tu Administrador de Anuncios.');
                modal.style.display = 'none';
                this.fetchCampaignsReport();
            } catch (err) {
                alert('❌ Error al generar campaña: ' + err.message);
            } finally {
                btn.disabled = false;
                btn.innerHTML = '🚀 CREAR CAMPAÑA EN BORRADOR EN META';
            }
        };
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
                alert('🎉 ¡Prueba CAPI Exitosa! Meta Ads recibió la conversión de prueba correctamente (200 OK).');
            } else {
                alert('⚠️ Meta devolvió un aviso:\n\n' + JSON.stringify(res.response || res.error));
            }
        } catch (e) {
            alert('❌ Error al probar envío: ' + e.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-vial"></i> Probar CAPI';
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
                    <h2>Nueva Notificación Web</h2>
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
