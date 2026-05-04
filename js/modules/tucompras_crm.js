// Utility for Colombian Location Data
window.Locations = {
    departments: {
        "Amazonas": ["Leticia", "Puerto Nariño"],
        "Antioquia": ["Medellín", "Bello", "Itagüí", "Envigado", "Rionegro", "Apartadó"],
        "Arauca": ["Arauca", "Tame", "Saravena"],
        "Atlántico": ["Barranquilla", "Soledad", "Malambo", "Sabanalarga"],
        "Bolívar": ["Cartagena", "Magangué", "Turbaco"],
        "Boyacá": ["Tunja", "Duitama", "Sogamoso", "Chiquinquirá"],
        "Caldas": ["Manizales", "La Dorada", "Riosucio"],
        "Caquetá": ["Florencia", "San Vicente del Caguán"],
        "Casanare": ["Yopal", "Aguazul", "Paz de Ariporo"],
        "Cauca": ["Popayán", "Santander de Quilichao"],
        "Cesar": ["Valledupar", "Aguachica", "Codazzi"],
        "Chocó": ["Quibdó", "Istmina"],
        "Córdoba": ["Montería", "Cereté", "Sahagún", "Lorica"],
        "Cundinamarca": ["Bogotá", "Soacha", "Facatativá", "Chía", "Zipaquirá", "Fusagasugá"],
        "Guainía": ["Inírida"],
        "Guaviare": ["San José del Guaviare"],
        "Huila": ["Neiva", "Pitalito", "Garzón"],
        "La Guajira": ["Riohacha", "Maicao", "Uribia"],
        "Magdalena": ["Santa Marta", "Ciénaga", "Fundación"],
        "Meta": ["Villavicencio", "Acacías", "Granada"],
        "Nariño": ["Pasto", "Ipiales", "Tumaco"],
        "Norte de Santander": ["Cúcuta", "Ocaña", "Pamplona"],
        "Putumayo": ["Mocoa", "Puerto Asís"],
        "Quindío": ["Armenia", "Calarcá"],
        "Risaralda": ["Pereira", "Dosquebradas"],
        "San Andrés y Providencia": ["San Andrés"],
        "Santander": ["Bucaramanga", "Floridablanca", "Girón", "Piedecuesta", "Barrancabermeja"],
        "Sucre": ["Sincelejo", "Corozal"],
        "Tolima": ["Ibagué", "Espinal", "Melgar"],
        "Valle del Cauca": ["Cali", "Buenaventura", "Palmira", "Tuluá", "Buga", "Cartago"],
        "Vaupés": ["Mitú"],
        "Vichada": ["Puerto Carreño"]
    },

    populateDepartments(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return;
        select.innerHTML = '<option value="">Seleccione Departamento...</option>' +
            Object.keys(this.departments).sort().map(d => `<option value="${d}">${d}</option>`).join('');
    },

    populateCities(deptName, selectId) {
        const select = document.getElementById(selectId);
        if (!select) return;
        if (!deptName || !this.departments[deptName]) {
            select.innerHTML = '<option value="">Primero seleccione depto...</option>';
            return;
        }
        const cities = [...this.departments[deptName].sort(), "OTRO (Escribir manualmente)"];
        select.innerHTML = '<option value="">Seleccione Ciudad...</option>' +
            cities.map(c => `<option value="${c}">${c}</option>`).join('');
    },

    getTrackingUrl(carrier, trackingNumber) {
        if (!trackingNumber) return "#";
        const urls = {
            "Interrapidisimo": `https://servicios.interrapidisimo.com/SrvRastreoGuias/RastreoGuia.aspx?guia=${trackingNumber}`,
            "Servientrega": `https://www.servientrega.com/wps/portal/Colombia/transaccional/rastreo-envios?id=${trackingNumber}`,
            "Envía": `https://envia.co/seguimiento-de-envio?guia=${trackingNumber}`,
            "Coordinadora": `https://www.coordinadora.com/rastreo/rastreo-de-guia/detalle-de-rastreo/?guia=${trackingNumber}`,
            "TCC": `https://www.tcc.com.co/logistica/rastreo-de-envios/?guia=${trackingNumber}`
        };
        // Fallback for Interrapidisimo sometimes uses a different portal
        if (carrier === 'Interrapidisimo' && trackingNumber.length > 0) {
            return `https://servicios.interrapidisimo.com/SrvRastreoGuias/RastreoGuia.aspx?guia=${trackingNumber}`;
        }
        return urls[carrier] || `https://www.google.com/search?q=rastreo+${carrier}+${trackingNumber}`;
    }
};

window.TuComprasCRM = {
    async init() {
        this.customers = await this.getCustomers();
    },

    async renderPanel() {
        this.customers = await this.getCustomers();
        const contentArea = document.getElementById('content-area');
        if (!document.getElementById('tucompras-crm-panel')) {
            const panel = document.createElement('div');
            panel.id = 'tucompras-crm-panel';
            panel.className = 'panel';
            contentArea.appendChild(panel);
        }

        const panel = document.getElementById('tucompras-crm-panel');
        panel.innerHTML = `
            <div class="panel-header">
                <h1>CRM Clientes eCommerce</h1>
                <div class="actions">
                    <button class="btn btn-primary" onclick="alert('Funcionalidad de exportación próximamente')">Exportar Clientes</button>
                </div>
            </div>

            <div class="stats-grid" style="margin-top: 1rem;">
                <div class="stat-card">
                    <h3>Total Clientes</h3>
                    <p class="stat-value" id="tc-crm-total-count">${this.customers.length}</p>
                </div>
            </div>

            <div class="search-bar" style="margin-top: 1.5rem; background: var(--bg-card); border: 1px solid var(--accent); border-radius: 12px; padding: 0.75rem 1rem; display: flex; align-items: center; gap: 10px; box-shadow: 0 0 15px rgba(59,130,246,0.1);">
                <i class="fas fa-search" style="color: var(--accent);"></i>
                <input type="text" id="tc-crm-search" placeholder="Buscar por nombre, teléfono, ciudad o depto..." style="background: none; border: none; color: white; width: 100%; outline: none; font-size: 1rem;">
            </div>

            <div class="table-container" style="margin-top: 1.5rem;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Teléfono</th>
                            <th>Ubicación</th>
                            <th>Dirección</th>
                            <th>Último Pedido</th>
                        </tr>
                    </thead>
                    <tbody id="tc-crm-list">
                        ${this.renderListItems(this.customers)}
                    </tbody>
                </table>
            </div>
        `;

        this.setupEventListeners();
    },

    renderListItems(customers) {
        return customers.map(c => `
            <tr>
                <td><strong>${c.name}</strong></td>
                <td>${c.phone}</td>
                <td>${c.city || '-'}, ${c.dept || '-'}</td>
                <td>${c.address || '-'}</td>
                <td>${c.created_at ? new Date(c.created_at).toLocaleDateString() : 'N/A'}</td>
            </tr>
        `).join('') || '<tr><td colspan="5" class="text-center">No hay clientes registrados</td></tr>';
    },

    setupEventListeners() {
        const searchInput = document.getElementById('tc-crm-search');
        if (searchInput) {
            searchInput.oninput = (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = this.customers.filter(c => 
                    (c.name || '').toLowerCase().includes(term) ||
                    (c.phone || '').toLowerCase().includes(term) ||
                    (c.city || '').toLowerCase().includes(term) ||
                    (c.dept || '').toLowerCase().includes(term)
                );
                document.getElementById('tc-crm-list').innerHTML = this.renderListItems(filtered);
                document.getElementById('tc-crm-total-count').textContent = filtered.length;
            };
        }
    },

    async getCustomers() {
        const { data, error } = await window.supabaseClient.from('tucompras_customers').select('*').order('created_at', { ascending: false });
        return error ? [] : data;
    },

    async addCustomer(customer) {
        if (!customer.name || !customer.phone) {
            throw new Error('Nombre y Teléfono son obligatorios');
        }
        return await Storage.addItem(STORAGE_KEYS.TUCOMPRAS_CUSTOMERS, {
            ...customer,
            created_at: new Date().toISOString()
        });
    }
};
