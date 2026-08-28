// ========================================================
// AGENT MODULE - AI, Local Query Assistant & Voice Payment Agent
// ========================================================
window.Agent = {
    pendingPaymentContext: null,

    init() {
        this.renderAgentContainer();
        this.setupEventListeners();
        this.checkApiKeyStatus();
        this.setupVoiceRecognition();
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
                        Puedes hacer consultas de ventas o <strong>dictarme abonos por voz o texto</strong> (ej: <em>"Carlos me abonó 50 mil"</em>).
                    </div>
                    <div class="quick-chips">
                        <button class="chip-btn" data-query="¿Cuánto llevo vendido en Millenio este mes?">📊 Ventas Millenio Mes</button>
                        <button class="chip-btn" data-query="¿Cuánto llevo vendido en Vulcano este mes?">📈 Ventas Vulcano Mes</button>
                        <button class="chip-btn" data-query="Resumen de ventas de hoy">💰 Resumen Hoy</button>
                        <button class="chip-btn" data-query="¿Qué productos tienen bajo stock?">⚠️ Bajo Stock</button>
                    </div>
                </div>
                
                <div class="chat-input-area">
                    <button id="mic-chat-btn" title="Dictar por voz" type="button"><i class="fas fa-microphone"></i></button>
                    <input type="text" id="chat-input" placeholder="Escribe o dicta tu consulta o abono..." autocomplete="off">
                    <button id="send-chat-btn" title="Enviar" type="button"><i class="fas fa-paper-plane"></i></button>
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
                // Quick Query Chips
                const chip = e.target.closest('.chip-btn');
                if (chip) {
                    const query = chip.dataset.query;
                    this.sendUserMessage(query);
                    this.processQuery(query);
                    return;
                }

                // Interactive Payment Company Choice Buttons
                const choiceBtn = e.target.closest('.payment-choice-btn');
                if (choiceBtn && this.pendingPaymentContext) {
                    const company = choiceBtn.dataset.company;
                    const { client, amount } = this.pendingPaymentContext;
                    this.sendUserMessage(choiceBtn.innerText.trim());
                    this.executePaymentRecord({ client, amount, company });
                    return;
                }

                // Interactive Client Choice Buttons
                const clientBtn = e.target.closest('.client-choice-btn');
                if (clientBtn && this.pendingPaymentContext) {
                    const clientId = clientBtn.dataset.clientId;
                    const clients = Storage.get(STORAGE_KEYS.CLIENTS) || [];
                    const client = clients.find(c => c.id === clientId);
                    if (client) {
                        this.sendUserMessage(`Cliente: ${client.name}`);
                        this.pendingPaymentContext.client = client;
                        delete this.pendingPaymentContext.step;
                        this.resolveNextPaymentStep();
                    }
                    return;
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

    setupVoiceRecognition() {
        const micBtn = document.getElementById('mic-chat-btn');
        const input = document.getElementById('chat-input');
        if (!micBtn || !input) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            micBtn.title = "Dictado de voz no soportado en este navegador (usa Chrome o Edge)";
            micBtn.onclick = () => {
                alert("El reconocimiento de voz en tiempo real está disponible en Google Chrome o Microsoft Edge.");
            };
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'es-CO';
        recognition.continuous = false;
        recognition.interimResults = true;

        let isRecording = false;

        recognition.onstart = () => {
            isRecording = true;
            micBtn.classList.add('recording');
            micBtn.innerHTML = '<i class="fas fa-stop"></i>';
            input.placeholder = 'Escuchando tu voz... habla ahora...';
        };

        recognition.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            input.value = transcript;
        };

        recognition.onerror = (event) => {
            console.warn('Error en reconocimiento de voz:', event.error);
            stopRecording();
        };

        recognition.onend = () => {
            stopRecording();
            if (input.value.trim()) {
                this.handleSendMessage();
            }
        };

        const stopRecording = () => {
            isRecording = false;
            micBtn.classList.remove('recording');
            micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            input.placeholder = 'Escribe o dicta tu consulta o abono...';
        };

        micBtn.onclick = (e) => {
            e.stopPropagation();
            if (isRecording) {
                recognition.stop();
            } else {
                input.value = '';
                try {
                    recognition.start();
                } catch (err) {
                    console.error("Error al iniciar dictado de voz:", err);
                }
            }
        };
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
        
        // Remove existing chips before appending new user message
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
        
        // Append quick chips at the end of the bot message
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
        const cleaned = query.toLowerCase().trim();

        // 1. If we are waiting for clarification on a pending payment
        if (this.pendingPaymentContext) {
            const handled = this.handlePendingPayment(query);
            if (handled) return;
        }

        // 2. Check if this message is a payment intent
        const paymentParsed = this.parsePaymentIntent(query);
        if (paymentParsed && paymentParsed.isPayment) {
            this.handlePaymentIntent(paymentParsed);
            return;
        }

        // 3. Local rule-based matchers for queries
        const ctx = this.getContextData();

        // Match Millenio Month
        if (cleaned.includes('millenio') && (cleaned.includes('mes') || cleaned.includes('junio'))) {
            this.sendBotMessage(`Llevas vendido en Millenio este mes (${ctx.month}) un total de $${ctx.mSalesMonth.toLocaleString('es-CO')} COP.`);
            return;
        }
        
        // Match Vulcano Month
        if (cleaned.includes('vulcano') && (cleaned.includes('mes') || cleaned.includes('junio'))) {
            this.sendBotMessage(`Llevas vendido en Vulcano este mes (${ctx.month}) un total de $${ctx.vSalesMonth.toLocaleString('es-CO')} COP.`);
            return;
        }

        // Match Today Summary
        if (cleaned.includes('hoy') || (cleaned.includes('resumen') && cleaned.includes('ventas'))) {
            const html = `
                <strong>Resumen Financiero de Hoy:</strong><br>
                <hr style="margin: 5px 0; border-color: rgba(255,255,255,0.1); border-style: solid;">
                <strong>🏢 Millenio:</strong><br>
                • Ventas: $${ctx.mSalesToday.toLocaleString('es-CO')} COP<br>
                • Gastos/Salidas: $${ctx.mExpensesToday.toLocaleString('es-CO')} COP<br>
                • Flujo: $${(ctx.mSalesToday - ctx.mExpensesToday).toLocaleString('es-CO')} COP<br><br>
                <strong>🏢 Vulcano:</strong><br>
                • Ventas: $${ctx.vSalesToday.toLocaleString('es-CO')} COP<br>
                • Gastos/Salidas: $${ctx.vExpensesToday.toLocaleString('es-CO')} COP<br>
                • Flujo: $${(ctx.vSalesToday - ctx.vExpensesToday).toLocaleString('es-CO')} COP
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
                • <strong>Millenio:</strong> $${ctx.pendingCreditsMillenio.toLocaleString('es-CO')} COP<br>
                • <strong>Vulcano:</strong> $${ctx.pendingCreditsVulcano.toLocaleString('es-CO')} COP<br>
                • <strong>Total Cartera:</strong> $${(ctx.pendingCreditsMillenio + ctx.pendingCreditsVulcano).toLocaleString('es-CO')} COP
            `;
            this.sendBotMessage(html, true);
            return;
        }

        // 4. Try Gemini API if Key exists
        const apiKey = localStorage.getItem('GEMINI_API_KEY');
        if (apiKey) {
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
            this.sendBotMessage("No entendí tu consulta. Para registrar un abono di algo como <em>'Carlos me abonó 50 mil'</em>. Para preguntas libres, configura tu API Key de Gemini.");
        }
    },

    // ========================================================
    // PAYMENT AGENT & DISAMBIGUATION LOGIC
    // ========================================================

    parsePaymentIntent(text) {
        const cleaned = text.toLowerCase().trim();

        // Keywords for abonos
        const keywords = ['abono', 'abonó', 'abonar', 'pago', 'pagó', 'pagar', 'consigno', 'consignó', 'transfirió', 'transferio', 'dio', 'nos dio', 'le abono', 'se abonó', 'se abono'];
        const isPayment = keywords.some(k => cleaned.includes(k));

        if (!isPayment) return null;

        const amount = this.extractAmountFromText(cleaned);

        let company = null;
        if (cleaned.includes('millenio')) company = 'millenio';
        else if (cleaned.includes('vulcano')) company = 'vulcano';
        else if (cleaned.includes('ambas') || cleaned.includes('mitad') || cleaned.includes('dividir') || cleaned.includes('50/50')) company = 'split';

        const clients = Storage.get(STORAGE_KEYS.CLIENTS) || [];
        const matchedClients = this.findMatchingClients(cleaned, clients);

        return {
            isPayment: true,
            amount,
            company,
            matchedClients,
            rawText: text
        };
    },

    extractAmountFromText(text) {
        // 1. Numerical patterns: $50000, 50.000, 50,000, 50k, 50 mil, 1.5m
        const numMatches = text.match(/\$?\s*(\d{1,3}(?:[.,]\d{3})+|\d+)\s*(k|mil|millon|millón|m)?/i);
        if (numMatches) {
            let numStr = numMatches[1].replace(/[.,]/g, '');
            let val = parseFloat(numStr);
            const multiplier = (numMatches[2] || '').toLowerCase();
            if (multiplier === 'k' || multiplier === 'mil') val *= 1000;
            if (multiplier === 'm' || multiplier === 'millon' || multiplier === 'millón') val *= 1000000;
            if (val > 0) return val;
        }

        // 2. Written Spanish numbers
        const spanishTextMap = {
            'cincuenta mil': 50000, 'cien mil': 100000, 'ciento cincuenta mil': 150000,
            'doscientos mil': 200000, 'trescientos mil': 300000, 'cuatrocientos mil': 400000,
            'quinientos mil': 500000, 'seiscientos mil': 600000, 'setecientos mil': 700000,
            'ochocientos mil': 800000, 'novecientos mil': 900000, 'un millon': 1000000,
            'un millón': 1000000, 'medio millon': 500000, 'medio millón': 500000,
            'diez mil': 10000, 'veinte mil': 20000, 'treinta mil': 30000, 'cuarenta mil': 40000
        };

        for (const [key, val] of Object.entries(spanishTextMap)) {
            if (text.includes(key)) return val;
        }

        return null;
    },

    findMatchingClients(text, clients) {
        if (!clients || clients.length === 0) return [];

        const stopWords = ['abono', 'abonó', 'abonar', 'pago', 'pagó', 'pagar', 'consigno', 'consignó', 'transfirió', 'dio', 'nos dio', 'millenio', 'vulcano', 'pesos', 'cop', 'el', 'la', 'un', 'una', 'cliente', 'me', 'le', 'se', 'por'];
        
        const textWords = text.toLowerCase()
            .replace(/[^\w\sáéíóúñ]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 2 && !stopWords.includes(w) && isNaN(w));

        const activeClients = clients.filter(c => c.active !== false);
        const matches = [];

        for (const client of activeClients) {
            const nameLower = (client.name || '').toLowerCase();
            const businessLower = (client.businessName || '').toLowerCase();

            // Direct substring match
            if (nameLower && text.toLowerCase().includes(nameLower)) {
                matches.push({ client, score: 100 });
                continue;
            }

            // Word level match
            const nameWords = nameLower.split(/\s+/).filter(w => w.length > 2);
            let score = 0;
            for (const tw of textWords) {
                if (nameWords.some(nw => nw.includes(tw) || tw.includes(nw))) {
                    score += 40;
                }
            }

            if (businessLower && text.toLowerCase().includes(businessLower)) {
                score += 50;
            }

            if (score >= 40) {
                matches.push({ client, score });
            }
        }

        return matches.sort((a, b) => b.score - a.score).map(m => m.client);
    },

    handlePaymentIntent(intent) {
        const { amount, company, matchedClients } = intent;

        // If no client matched
        if (!matchedClients || matchedClients.length === 0) {
            this.pendingPaymentContext = {
                step: 'AWAITING_CLIENT',
                amount,
                company
            };
            this.askForClientName();
            return;
        }

        // If multiple clients matched ambiguously
        if (matchedClients.length > 1 && matchedClients[0].score === matchedClients[1].score) {
            this.askClientChoice(matchedClients, amount, company);
            return;
        }

        // Single matched client
        const client = matchedClients[0];
        this.pendingPaymentContext = { client, amount, company };
        this.resolveNextPaymentStep();
    },

    handlePendingPayment(query) {
        if (!this.pendingPaymentContext) return false;

        const cleaned = query.toLowerCase().trim();
        const ctx = this.pendingPaymentContext;

        if (ctx.step === 'AWAITING_COMPANY') {
            if (cleaned.includes('millenio')) {
                this.executePaymentRecord({ client: ctx.client, amount: ctx.amount, company: 'millenio' });
                return true;
            }
            if (cleaned.includes('vulcano')) {
                this.executePaymentRecord({ client: ctx.client, amount: ctx.amount, company: 'vulcano' });
                return true;
            }
            if (cleaned.includes('ambas') || cleaned.includes('mitad') || cleaned.includes('dividir') || cleaned.includes('50')) {
                this.executePaymentRecord({ client: ctx.client, amount: ctx.amount, company: 'split' });
                return true;
            }
        }

        if (ctx.step === 'AWAITING_AMOUNT') {
            const amount = this.extractAmountFromText(cleaned);
            if (amount && amount > 0) {
                ctx.amount = amount;
                delete ctx.step;
                this.resolveNextPaymentStep();
                return true;
            } else {
                this.sendBotMessage(`No pude entender el monto. Por favor dime el valor abonado para <strong>${ctx.client.name}</strong> en números (ej: 50000 o 50 mil).`);
                return true;
            }
        }

        if (ctx.step === 'AWAITING_CLIENT') {
            const clients = Storage.get(STORAGE_KEYS.CLIENTS) || [];
            const matches = this.findMatchingClients(query, clients);
            if (matches.length === 1) {
                ctx.client = matches[0];
                delete ctx.step;
                this.resolveNextPaymentStep();
                return true;
            } else if (matches.length > 1) {
                this.askClientChoice(matches, ctx.amount, ctx.company);
                return true;
            } else {
                this.sendBotMessage(`No encontré ningún cliente llamado "${query}". Por favor escríbelo o díctalo nuevamente.`);
                return true;
            }
        }

        return false;
    },

    resolveNextPaymentStep() {
        const ctx = this.pendingPaymentContext;
        if (!ctx || !ctx.client) return;

        // 1. Missing Amount
        if (!ctx.amount || ctx.amount <= 0) {
            ctx.step = 'AWAITING_AMOUNT';
            this.sendBotMessage(`¿De cuánto fue el abono recibido para el cliente <strong>${ctx.client.name}</strong>?`);
            return;
        }

        // 2. Check Balances & Company
        const client = ctx.client;
        const balM = parseFloat(client.balanceMillenio || 0);
        const balV = parseFloat(client.balanceVulcano || 0);

        // Case A: Explicit company preference provided by user
        if (ctx.company) {
            this.executePaymentRecord({ client, amount: ctx.amount, company: ctx.company });
            return;
        }

        // Case B: Client only owes in Millenio
        if (balM > 0 && balV <= 0) {
            this.executePaymentRecord({ client, amount: ctx.amount, company: 'millenio' });
            return;
        }

        // Case C: Client only owes in Vulcano
        if (balV > 0 && balM <= 0) {
            this.executePaymentRecord({ client, amount: ctx.amount, company: 'vulcano' });
            return;
        }

        // Case D: CLIENT OWES MONEY IN BOTH COMPANIES! (Explicit User Requirement)
        if (balM > 0 && balV > 0) {
            this.askCompanyChoice(client, ctx.amount);
            return;
        }

        // Default fallback if no active debt found
        this.executePaymentRecord({ client, amount: ctx.amount, company: 'millenio' });
    },

    askForClientName() {
        const clientsWithDebt = (Storage.get(STORAGE_KEYS.CLIENTS) || []).filter(c => ((c.balanceMillenio || 0) + (c.balanceVulcano || 0)) > 0);
        let html = `<strong>¿A qué cliente deseas aplicarle el abono?</strong><br>Por favor dime el nombre del cliente.`;
        
        if (clientsWithDebt.length > 0) {
            html += `<br><br><em>Clientes con deuda pendiente actual:</em><div class="client-choices" style="margin-top:8px;">`;
            clientsWithDebt.slice(0, 5).forEach(c => {
                const total = (c.balanceMillenio || 0) + (c.balanceVulcano || 0);
                html += `
                    <button class="client-choice-btn" data-client-id="${c.id}" style="background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(255,255,255,0.15); color: white; padding: 6px 10px; border-radius: 6px; cursor: pointer; text-align: left; font-size: 0.8rem; margin-bottom: 4px; display: block; width: 100%;">
                        👤 <strong>${c.name}</strong> <span style="font-size:0.75rem; color:#94a3b8;">(Deuda: $${total.toLocaleString('es-CO')})</span>
                    </button>
                `;
            });
            html += `</div>`;
        }

        this.sendBotMessage(html, true);
    },

    askClientChoice(matchedClients, amount, company) {
        this.pendingPaymentContext = {
            step: 'AWAITING_CLIENT',
            amount,
            company
        };

        let choicesHtml = '';
        matchedClients.slice(0, 5).forEach(c => {
            const total = (parseFloat(c.balanceMillenio || 0) + parseFloat(c.balanceVulcano || 0));
            choicesHtml += `
                <button class="client-choice-btn" data-client-id="${c.id}" style="background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(255,255,255,0.15); color: white; padding: 6px 10px; border-radius: 6px; cursor: pointer; text-align: left; font-size: 0.8rem; margin-bottom: 4px; display: block; width: 100%;">
                    👤 <strong>${c.name}</strong> <span style="font-size:0.75rem; color:#94a3b8;">(Deuda: $${total.toLocaleString('es-CO')})</span>
                </button>
            `;
        });

        const html = `
            <div style="padding: 4px 0;">
                <div style="font-weight: 600; color: #38bdf8; margin-bottom: 6px;">
                    <i class="fas fa-user-tag"></i> Encontré varios clientes coincidentes:
                </div>
                Por favor selecciona a cuál cliente pertenece el abono:
                <div class="client-choices" style="margin-top: 8px;">
                    ${choicesHtml}
                </div>
            </div>
        `;

        this.sendBotMessage(html, true);
    },

    askCompanyChoice(client, amount) {
        const balM = parseFloat(client.balanceMillenio || 0);
        const balV = parseFloat(client.balanceVulcano || 0);
        const total = balM + balV;

        this.pendingPaymentContext = {
            step: 'AWAITING_COMPANY',
            client,
            amount
        };

        const html = `
            <div style="padding: 4px 0;">
                <div style="font-weight: 600; color: #fbbf24; margin-bottom: 6px;">
                    <i class="fas fa-question-circle"></i> ¿A cuál empresa aplicar el abono?
                </div>
                El cliente <strong>${client.name}</strong> tiene deudas activas en ambas empresas:<br>
                • 🏢 <strong>Millenio:</strong> $${balM.toLocaleString('es-CO')} COP<br>
                • 🏢 <strong>Vulcano:</strong> $${balV.toLocaleString('es-CO')} COP<br>
                • 💰 <strong>Deuda Total:</strong> $${total.toLocaleString('es-CO')} COP<br><br>
                Abono a ingresar: <strong>$${amount.toLocaleString('es-CO')} COP</strong><br><br>
                <em>Haz clic en una opción o dime el nombre de la empresa:</em>
                <div class="payment-choices" style="display: flex; flex-direction: column; gap: 6px; margin-top: 10px;">
                    <button class="payment-choice-btn" data-company="millenio" style="background: rgba(59, 130, 246, 0.2); border: 1px solid #3b82f6; color: #60a5fa; padding: 7px 12px; border-radius: 6px; cursor: pointer; text-align: left; font-size: 0.8rem; font-weight: 600;">
                        🏢 Aplicar a Millenio (Deuda: $${balM.toLocaleString('es-CO')})
                    </button>
                    <button class="payment-choice-btn" data-company="vulcano" style="background: rgba(249, 115, 22, 0.2); border: 1px solid #f97316; color: #fb923c; padding: 7px 12px; border-radius: 6px; cursor: pointer; text-align: left; font-size: 0.8rem; font-weight: 600;">
                        🏢 Aplicar a Vulcano (Deuda: $${balV.toLocaleString('es-CO')})
                    </button>
                    <button class="payment-choice-btn" data-company="split" style="background: rgba(168, 85, 247, 0.2); border: 1px solid #a855f7; color: #c084fc; padding: 7px 12px; border-radius: 6px; cursor: pointer; text-align: left; font-size: 0.8rem; font-weight: 600;">
                        🔀 Dividir entre ambas empresas (50% / 50%)
                    </button>
                </div>
            </div>
        `;

        this.sendBotMessage(html, true);
    },

    async executePaymentRecord({ client, amount, company, notes }) {
        const balM = parseFloat(client.balanceMillenio || 0);
        const balV = parseFloat(client.balanceVulcano || 0);

        let amountM = 0;
        let amountV = 0;

        if (company === 'millenio') {
            amountM = amount;
        } else if (company === 'vulcano') {
            amountV = amount;
        } else if (company === 'split') {
            if (balM > 0 && balV > 0) {
                const half = Math.round(amount / 2);
                amountM = Math.min(balM, half);
                amountV = amount - amountM;
            } else if (balM > 0) {
                amountM = amount;
            } else {
                amountV = amount;
            }
        } else {
            if (balM > 0 && balV <= 0) amountM = amount;
            else if (balV > 0 && balM <= 0) amountV = amount;
            else amountM = amount;
        }

        const newBalM = balM - amountM;
        const newBalV = balV - amountV;

        // 1. Save updated client balances
        await Storage.updateItem(STORAGE_KEYS.CLIENTS, client.id, {
            balanceMillenio: newBalM,
            balanceVulcano: newBalV
        });

        client.balanceMillenio = newBalM;
        client.balanceVulcano = newBalV;

        // 2. Record payments
        if (amountM > 0) {
            await Storage.addItem(STORAGE_KEYS.PAYMENTS, {
                clientId: client.id,
                clientName: client.name,
                company: 'millenio',
                amount: amountM,
                method: 'efectivo',
                notes: notes || 'Abono registrado por Asistente IA',
                date: new Date().toISOString()
            });
        }

        if (amountV > 0) {
            await Storage.addItem(STORAGE_KEYS.PAYMENTS, {
                clientId: client.id,
                clientName: client.name,
                company: 'vulcano',
                amount: amountV,
                method: 'efectivo',
                notes: notes || 'Abono registrado por Asistente IA',
                date: new Date().toISOString()
            });
        }

        // 3. Clear pending state
        this.pendingPaymentContext = null;

        // 4. Trigger UI updates across modules
        if (window.CRM && typeof window.CRM.updateClientList === 'function') {
            window.CRM.updateClientList();
        }
        if (window.Finances && typeof window.Finances.updateDebtUI === 'function') {
            window.Finances.updateDebtUI();
        }
        window.dispatchEvent(new CustomEvent('erp_table_updated_payments'));

        // 5. Send rich response message
        let companyLabel = 'Millenio';
        if (company === 'vulcano') companyLabel = 'Vulcano';
        if (amountM > 0 && amountV > 0) companyLabel = 'Dividido (Millenio + Vulcano)';

        const html = `
            <div style="padding: 4px 0;">
                <div style="font-weight: 700; color: #4ade80; margin-bottom: 6px; font-size: 0.9rem;">
                    <i class="fas fa-check-circle"></i> ¡Abono registrado con éxito!
                </div>
                • <strong>Cliente:</strong> ${client.name}<br>
                • <strong>Valor Abonado:</strong> $${amount.toLocaleString('es-CO')} COP<br>
                • <strong>Empresa:</strong> ${companyLabel}<br>
                <hr style="margin: 8px 0; border-color: rgba(255,255,255,0.1); border-style: solid;">
                <strong>Nuevos Saldos del Cliente:</strong><br>
                • <strong>Millenio:</strong> $${newBalM.toLocaleString('es-CO')} COP<br>
                • <strong>Vulcano:</strong> $${newBalV.toLocaleString('es-CO')} COP<br>
                • <strong>Deuda Total Restante:</strong> <strong style="color: ${newBalM + newBalV > 0 ? '#f87171' : '#4ade80'};">$${(newBalM + newBalV).toLocaleString('es-CO')} COP</strong>
            </div>
        `;

        this.sendBotMessage(html, true);
        if (window.ERP_LOG) window.ERP_LOG(`Abono de $${amount.toLocaleString()} registrado para ${client.name}`, 'success');
    },

    // ========================================================
    // GENERAL UTILITIES & GEMINI API FALLBACK
    // ========================================================

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
- Ventas Totales Millenio este mes: $${ctx.mSalesMonth.toLocaleString('es-CO')} COP
- Ventas Totales Vulcano este mes: $${ctx.vSalesMonth.toLocaleString('es-CO')} COP
- Ventas Millenio hoy: $${ctx.mSalesToday.toLocaleString('es-CO')} COP
- Ventas Vulcano hoy: $${ctx.vSalesToday.toLocaleString('es-CO')} COP
- Gastos Millenio hoy: $${ctx.mExpensesToday.toLocaleString('es-CO')} COP
- Gastos Vulcano hoy: $${ctx.vExpensesToday.toLocaleString('es-CO')} COP
- Cantidad de productos con bajo stock: ${ctx.criticalStockCount}
- Algunos productos bajo stock: ${ctx.criticalStockList.join(', ')}
- Créditos pendientes Millenio (Cartera): $${ctx.pendingCreditsMillenio.toLocaleString('es-CO')} COP
- Créditos pendientes Vulcano (Cartera): $${ctx.pendingCreditsVulcano.toLocaleString('es-CO')} COP

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
