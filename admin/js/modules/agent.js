// ========================================================
// AGENT MODULE - AI and Local Query Assistant
// ========================================================
window.Agent = {
    init() {
        this.renderAgentContainer();
        this.setupEventListeners();
        this.checkApiKeyStatus();
    },

    renderAgentContainer() {
        // Create container if not exists
        if (document.getElementById('ai-chat-container')) return;

        const container = document.createElement('div');
        container.id = 'ai-chat-container';
        container.innerHTML = `
            <button id="ai-chat-bubble" title="Asistente de Consultas">
                <i class="fas fa-robot"></i>
                <span class="pulse-dot"></span>
            </button>
            
            <div id="ai-chat-window" class="chat-window">
                <div class="chat-header">
                    <div class="chat-header-info">
                        <i class="fas fa-robot chat-avatar"></i>
                        <div>
                            <h4 style="margin: 0; font-size: 0.95rem; font-weight: 600; color: white;">Asistente ERP</h4>
                            <span class="status-indicator"><span class="dot"></span> En línea</span>
                        </div>
                    </div>
                    <button id="close-chat-btn"><i class="fas fa-times"></i></button>
                </div>
                
                <div id="chat-no-key-alert" style="display: none; padding: 10px; background: rgba(6, 182, 212, 0.1); border: 1px dashed rgba(6, 182, 212, 0.3); border-radius: 8px; margin: 10px 16px 0 16px; font-size: 0.75rem; text-align: center; color: #93c5fd;">
                    ¿Preguntas avanzadas? <a href="#" id="chat-set-key-link" style="color: #22d3ee; text-decoration: underline; font-weight: bold;">Configura tu API Key de Gemini</a>
                </div>
                
                <div id="ai-chat-messages" class="chat-messages">
                    <div class="chat-msg bot">
                        ¡Hola! 👋 Soy tu Asistente ERP Inteligente.
                        Puedo responder consultas rápidas sobre tus ventas, gastos y stock local, o responder en lenguaje natural si configuras tu API Key.
                    </div>
                    <div class="quick-chips">
                        <button class="chip-btn" data-query="¿Cuánto llevo vendido en Millenio este mes?">📊 Ventas Millenio Mes</button>
                        <button class="chip-btn" data-query="¿Cuánto llevo vendido en Vulcano este mes?">📈 Ventas Vulcano Mes</button>
                        <button class="chip-btn" data-query="Resumen de ventas de hoy">💰 Resumen Hoy</button>
                        <button class="chip-btn" data-query="¿Qué productos tienen bajo stock?">⚠️ Bajo Stock</button>
                    </div>
                </div>
                
                <div class="chat-input-area">
                    <input type="text" id="chat-input" placeholder="Escribe tu consulta..." autocomplete="off">
                    <button id="send-chat-btn"><i class="fas fa-paper-plane"></i></button>
                </div>
            </div>
        `;
        document.body.appendChild(container);
    },

    setupEventListeners() {
        const bubble = document.getElementById('ai-chat-bubble');
        const windowEl = document.getElementById('ai-chat-window');
        const closeBtn = document.getElementById('close-chat-btn');
        const sendBtn = document.getElementById('send-chat-btn');
        const input = document.getElementById('chat-input');
        const messagesContainer = document.getElementById('ai-chat-messages');
        const setKeyLink = document.getElementById('chat-set-key-link');

        if (bubble) {
            bubble.onclick = (e) => {
                e.stopPropagation();
                windowEl.classList.toggle('active');
                if (windowEl.classList.contains('active')) {
                    input.focus();
                }
            };
        }

        if (closeBtn) {
            closeBtn.onclick = (e) => {
                e.stopPropagation();
                windowEl.classList.remove('active');
            };
        }

        // Close on escape key or outside click
        document.addEventListener('click', (e) => {
            if (windowEl && windowEl.classList.contains('active') && !e.target.closest('#ai-chat-container')) {
                windowEl.classList.remove('active');
            }
        });

        if (sendBtn) {
            sendBtn.onclick = () => this.handleSendMessage();
        }

        if (input) {
            input.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    this.handleSendMessage();
                }
            };
        }

        if (messagesContainer) {
            messagesContainer.onclick = (e) => {
                const chip = e.target.closest('.chip-btn');
                if (chip) {
                    const query = chip.dataset.query;
                    this.sendUserMessage(query);
                    this.processQuery(query);
                }
            };
        }

        if (setKeyLink) {
            setKeyLink.onclick = (e) => {
                e.preventDefault();
                const key = prompt('Ingresa tu API Key de Google Gemini (Empieza con AIza...):');
                if (key) {
                    localStorage.setItem('GEMINI_API_KEY', key.trim());
                    this.checkApiKeyStatus();
                    alert('API Key de Gemini configurada con éxito.');
                }
            };
        }
    },

    checkApiKeyStatus() {
        const key = localStorage.getItem('GEMINI_API_KEY');
        const alertEl = document.getElementById('chat-no-key-alert');
        if (alertEl) {
            alertEl.style.display = key ? 'none' : 'block';
        }
    },

    sendUserMessage(text) {
        const messagesContainer = document.getElementById('ai-chat-messages');
        if (!messagesContainer) return;

        const msg = document.createElement('div');
        msg.className = 'chat-msg user';
        msg.textContent = text;
        
        // Remove existing chips before appending new user message to keep it clean
        const chips = messagesContainer.querySelector('.quick-chips');
        if (chips) chips.remove();

        messagesContainer.appendChild(msg);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },

    sendBotMessage(text, isHTML = false) {
        const messagesContainer = document.getElementById('ai-chat-messages');
        if (!messagesContainer) return;

        const msg = document.createElement('div');
        msg.className = 'chat-msg bot';
        if (isHTML) {
            msg.innerHTML = text;
        } else {
            msg.textContent = text;
        }
        messagesContainer.appendChild(msg);
        
        // Append quick chips at the end of the bot message for easy followups
        this.appendQuickChips(messagesContainer);

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    },

    appendQuickChips(container) {
        const existing = container.querySelector('.quick-chips');
        if (existing) existing.remove();

        const chips = document.createElement('div');
        chips.className = 'quick-chips';
        chips.innerHTML = `
            <button class="chip-btn" data-query="¿Cuánto llevo vendido en Millenio este mes?">📊 Ventas Millenio Mes</button>
            <button class="chip-btn" data-query="¿Cuánto llevo vendido en Vulcano este mes?">📈 Ventas Vulcano Mes</button>
            <button class="chip-btn" data-query="Resumen de ventas de hoy">💰 Resumen Hoy</button>
            <button class="chip-btn" data-query="¿Qué productos tienen bajo stock?">⚠️ Bajo Stock</button>
        `;
        container.appendChild(chips);
    },

    handleSendMessage() {
        const input = document.getElementById('chat-input');
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        this.sendUserMessage(text);
        this.processQuery(text);
    },

    async processQuery(query) {
        const cleaned = query.toLowerCase();
        const ctx = this.getContextData();

        // 1. Check local rule-based matchers first for instant offline response
        // Match Millenio Month
        if (cleaned.includes('millenio') && (cleaned.includes('mes') || cleaned.includes('junio'))) {
            this.sendBotMessage(`Llevas vendido en Millenio este mes (${ctx.month}) un total de $${ctx.mSalesMonth.toLocaleString()} COP.`);
            return;
        }
        
        // Match Vulcano Month
        if (cleaned.includes('vulcano') && (cleaned.includes('mes') || cleaned.includes('junio'))) {
            this.sendBotMessage(`Llevas vendido en Vulcano este mes (${ctx.month}) un total de $${ctx.vSalesMonth.toLocaleString()} COP.`);
            return;
        }

        // Match Today Summary
        if (cleaned.includes('hoy') || (cleaned.includes('resumen') && cleaned.includes('ventas'))) {
            const html = `
                <strong>Resumen Financiero de Hoy:</strong><br>
                <hr style="margin: 5px 0; border-color: rgba(255,255,255,0.1); border-style: solid;">
                <strong>🏢 Millenio:</strong><br>
                • Ventas: $${ctx.mSalesToday.toLocaleString()} COP<br>
                • Gastos/Salidas: $${ctx.mExpensesToday.toLocaleString()} COP<br>
                • Flujo: $${(ctx.mSalesToday - ctx.mExpensesToday).toLocaleString()} COP<br><br>
                <strong>🏢 Vulcano:</strong><br>
                • Ventas: $${ctx.vSalesToday.toLocaleString()} COP<br>
                • Gastos/Salidas: $${ctx.vExpensesToday.toLocaleString()} COP<br>
                • Flujo: $${(ctx.vSalesToday - ctx.vExpensesToday).toLocaleString()} COP
            `;
            this.sendBotMessage(html, true);
            return;
        }

        // Match Low Stock
        if (cleaned.includes('stock') || cleaned.includes('bajo') || cleaned.includes('critico') || cleaned.includes('inventario')) {
            if (ctx.criticalStockCount === 0) {
                this.sendBotMessage("¡Excelente! Todos tus productos tienen stock saludable (mayor o igual a 5 unidades).");
            } else {
                let html = `<strong>Tienes ${ctx.criticalStockCount} producto(s) con stock crítico:</strong><br><br>`;
                ctx.criticalStockList.forEach(p => {
                    html += `• ${p}<br>`;
                });
                if (ctx.criticalStockCount > 10) {
                    html += `<br><em>... y ${ctx.criticalStockCount - 10} productos más. Revisa la pestaña de Stock Crítico en el panel principal.</em>`;
                }
                this.sendBotMessage(html, true);
            }
            return;
        }

        // Match Debt/Credits
        if (cleaned.includes('credito') || cleaned.includes('deuda') || cleaned.includes('deudores') || cleaned.includes('cobrar')) {
            const html = `
                <strong>Créditos Pendientes por Cobrar:</strong><br>
                • <strong>Millenio:</strong> $${ctx.pendingCreditsMillenio.toLocaleString()} COP<br>
                • <strong>Vulcano:</strong> $${ctx.pendingCreditsVulcano.toLocaleString()} COP<br>
                • <strong>Total Cartera:</strong> $${(ctx.pendingCreditsMillenio + ctx.pendingCreditsVulcano).toLocaleString()} COP
            `;
            this.sendBotMessage(html, true);
            return;
        }

        // 2. If no local match, try calling Gemini API if Key exists
        const apiKey = localStorage.getItem('GEMINI_API_KEY');
        if (apiKey) {
            // Show typing indicator
            const typingId = this.showTypingIndicator();
            try {
                const answer = await this.callGeminiAPI(query, apiKey, ctx);
                this.removeTypingIndicator(typingId);
                this.sendBotMessage(answer);
            } catch (err) {
                console.error(err);
                this.removeTypingIndicator(typingId);
                this.sendBotMessage(`Error consultando a la IA: ${err.message}. Por favor intenta de nuevo.`);
            }
        } else {
            // Local fallback message for unmatched queries
            this.sendBotMessage("No encontré una respuesta específica para tu consulta local. Si deseas hacer preguntas libres en lenguaje natural, por favor ingresa tu API Key de Gemini arriba.");
        }
    },

    showTypingIndicator() {
        const messagesContainer = document.getElementById('ai-chat-messages');
        if (!messagesContainer) return null;

        const id = 'typing-' + Date.now();
        const msg = document.createElement('div');
        msg.id = id;
        msg.className = 'chat-msg bot';
        msg.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Pensando...';
        messagesContainer.appendChild(msg);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return id;
    },

    removeTypingIndicator(id) {
        if (!id) return;
        const el = document.getElementById(id);
        if (el) el.remove();
    },

    async callGeminiAPI(query, apiKey, ctx) {
        const systemPrompt = `Eres el Asistente Inteligente del ERP de Ferretería y Hogar Millenio y Vulcano.
Tu rol es responder a las preguntas del administrador sobre ventas, gastos, stock e inventario con tono profesional, claro y amigable.
Te proveemos a continuación un resumen de las métricas clave de la base de datos actual:
- Mes en curso: ${ctx.month}
- Ventas Totales Millenio este mes: $${ctx.mSalesMonth.toLocaleString()} COP
- Ventas Totales Vulcano este mes: $${ctx.vSalesMonth.toLocaleString()} COP
- Ventas Millenio hoy: $${ctx.mSalesToday.toLocaleString()} COP
- Ventas Vulcano hoy: $${ctx.vSalesToday.toLocaleString()} COP
- Gastos Millenio hoy: $${ctx.mExpensesToday.toLocaleString()} COP
- Gastos Vulcano hoy: $${ctx.vExpensesToday.toLocaleString()} COP
- Cantidad de productos con bajo stock: ${ctx.criticalStockCount}
- Algunos productos bajo stock: ${ctx.criticalStockList.join(', ')}
- Créditos pendientes Millenio (Cartera): $${ctx.pendingCreditsMillenio.toLocaleString()} COP
- Créditos pendientes Vulcano (Cartera): $${ctx.pendingCreditsVulcano.toLocaleString()} COP

Responde la pregunta del usuario basándote únicamente en estos datos verdaderos. Si te preguntan cosas no contenidas en estos datos o no relacionadas con las finanzas/inventario, responde amablemente que solo estás facultado para asistir en las operaciones comerciales y financieras del negocio.
Utiliza negritas y formato de texto limpio en español.`;

        const endpoints = [
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`
        ];

        let lastError = null;
        for (const url of endpoints) {
            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: `${systemPrompt}\n\nPregunta del usuario: "${query}"`
                            }]
                        }]
                    })
                });

                if (!res.ok) {
                    const errBody = await res.json().catch(() => ({}));
                    throw new Error(errBody.error?.message || `HTTP error! status: ${res.status}`);
                }

                const data = await res.json();
                if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                    return data.candidates[0].content.parts[0].text.trim();
                } else {
                    throw new Error('Formato de respuesta de Gemini inválido');
                }
            } catch (err) {
                lastError = err;
            }
        }
        throw lastError || new Error('No se pudo comunicar con Gemini');
    },

    getContextData() {
        const sales = Storage.get(STORAGE_KEYS.SALES) || [];
        const products = Storage.get(STORAGE_KEYS.PRODUCTS) || [];
        const clients = Storage.get(STORAGE_KEYS.CLIENTS) || [];
        const expenses = Storage.get(STORAGE_KEYS.EXPENSES) || [];
        const movements = Storage.get(STORAGE_KEYS.MOVEMENTS) || [];

        const now = new Date();
        const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endDayMonth = new Date();
        endDayMonth.setHours(23, 59, 59, 999);

        const startToday = new Date();
        startToday.setHours(0, 0, 0, 0);
        const endToday = new Date();
        endToday.setHours(23, 59, 59, 999);

        // Filter Sales
        const mSalesMonth = sales.filter(s => {
            const d = new Date(s.date);
            return d >= firstDayMonth && d <= endDayMonth;
        }).reduce((sum, s) => sum + (s.totalM || 0), 0);

        const vSalesMonth = sales.filter(s => {
            const d = new Date(s.date);
            return d >= firstDayMonth && d <= endDayMonth;
        }).reduce((sum, s) => sum + (s.totalV || 0), 0);

        const mSalesToday = sales.filter(s => {
            const d = new Date(s.date);
            return d >= startToday && d <= endToday;
        }).reduce((sum, s) => sum + (s.totalM || 0), 0);

        const vSalesToday = sales.filter(s => {
            const d = new Date(s.date);
            return d >= startToday && d <= endToday;
        }).reduce((sum, s) => sum + (s.totalV || 0), 0);

        const mExpensesToday = expenses.filter(e => {
            const d = new Date(e.createdAt);
            return d >= startToday && d <= endToday && e.company === 'millenio';
        }).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) +
        movements.filter(m => {
            const d = new Date(m.date);
            return d >= startToday && d <= endToday && m.company === 'millenio' && m.type === 'outflow';
        }).reduce((sum, m) => sum + parseFloat(m.amount || 0), 0);

        const vExpensesToday = expenses.filter(e => {
            const d = new Date(e.createdAt);
            return d >= startToday && d <= endToday && e.company === 'vulcano';
        }).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) +
        movements.filter(m => {
            const d = new Date(m.date);
            return d >= startToday && d <= endToday && m.company === 'vulcano' && m.type === 'outflow';
        }).reduce((sum, m) => sum + parseFloat(m.amount || 0), 0);

        const criticalStock = products.filter(p => (p.stockMillenio || 0) < 5 || (p.stockVulcano || 0) < 5).map(p => `${p.name} (M: ${p.stockMillenio || 0}, V: ${p.stockVulcano || 0})`);
        
        const pendingCreditsMillenio = clients.reduce((sum, c) => sum + (c.balanceMillenio || 0), 0);
        const pendingCreditsVulcano = clients.reduce((sum, c) => sum + (c.balanceVulcano || 0), 0);

        return {
            month: now.toLocaleString('es-ES', { month: 'long', year: 'numeric' }),
            mSalesMonth,
            vSalesMonth,
            mSalesToday,
            vSalesToday,
            mExpensesToday,
            vExpensesToday,
            criticalStockCount: criticalStock.length,
            criticalStockList: criticalStock.slice(0, 10),
            pendingCreditsMillenio,
            pendingCreditsVulcano
        };
    }
};
