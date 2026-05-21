// Módulo Administración Web Site (Premium V111)
window.WebsiteAdmin = {
    settings: null,

    async init() {
        this.renderPanel();
        this.loadSettings();
    },

    async loadSettings() {
        const supabase = window.supabaseClient || (window.initSupabase ? window.initSupabase() : null);
        if (!supabase) return;
        
        try {
            const { data, error } = await supabase
                .from('website_settings')
                .select('*')
                .eq('id', 'default')
                .single();

            if (!error && data) {
                this.settings = data;
            } else {
                // Fallback / Initial Data
                this.settings = {
                    id: 'default',
                    whatsapp: '573167862554',
                    facebook_url: 'https://www.facebook.com/share/1RpydiVLKN/',
                    instagram_url: 'https://www.instagram.com/1tucompras?utm_source=qr&igsh=MWRybzZoNnF2ODZ6ZA==',
                    tiktok_url: 'https://www.tiktok.com/@tucomprascol?_r=1&_t=ZS-95oEWPXGCIC',
                    hero_title: 'En el 2025 vendimos más de 1.300 productos',
                    hero_subtitle: 'Más de 1.300 productos entregados y clientes 100% satisfechos en toda Colombia. Compra con seguridad y paga al recibir en tu puerta.',
                    hero_images: [],
                    wholesale_title: '¿Eres Comerciante o Ferretero?',
                    wholesale_text: 'En TuCompras Col somos importadores y distribuidores directos. Potencia tu negocio con nuestro catálogo mayorista, precios competitivos y envíos prioritarios a toda Colombia.',
                    wholesale_bg_image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837',
                    privacy_policy_text: 'Política estándar de privacidad...',
                    refund_policy_text: 'Política estándar de reembolsos...',
                    meta_title: 'TuCompras Col | Herramientas y Hogar con Envíos en Colombia',
                    meta_description: 'Distribuidora líder en herramientas de ferretería, protección y hogar. Más de 1.300 productos entregados en 2025. Pago contra entrega en toda Colombia.',
                    meta_pixel_id: '',
                    tiktok_pixel_id: '',
                    testimonials: []
                };
            }
            this.populateForms();
        } catch (e) {
            console.error('Error WebsiteAdmin.loadSettings:', e);
        }
    },

    populateForms() {
        if (!this.settings) return;
        const s = this.settings;
        
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
        };

        // Tab 1
        setVal('wa-whatsapp', s.whatsapp);
        setVal('wa-facebook', s.facebook_url);
        setVal('wa-instagram', s.instagram_url);
        setVal('wa-tiktok', s.tiktok_url);
        setVal('wa-meta-title', s.meta_title);
        setVal('wa-meta-desc', s.meta_description);
        setVal('wa-pixel-fb', s.meta_pixel_id);
        setVal('wa-pixel-tk', s.tiktok_pixel_id);

        // Tab 2
        setVal('wa-hero-title', s.hero_title);
        setVal('wa-hero-subtitle', s.hero_subtitle);
        this.renderHeroImagesPreview();

        // Tab 3
        setVal('wa-wholesale-title', s.wholesale_title);
        setVal('wa-wholesale-text', s.wholesale_text);
        setVal('wa-wholesale-bg', s.wholesale_bg_image);
        setVal('wa-privacy', s.privacy_policy_text);
        setVal('wa-refunds', s.refund_policy_text);
        
        // Tab 4
        this.renderTestimonialsList();
    },

    async saveSettings() {
        if (!this.settings) return;
        const btn = document.querySelector('#website_admin-panel .btn-primary');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

        try {
            const supabase = window.supabaseClient;
            this.settings.updated_at = new Date().toISOString();
            
            const { error } = await supabase
                .from('website_settings')
                .upsert(this.settings);

            if (error) throw error;
            
            btn.innerHTML = '<i class="fas fa-check"></i> ¡Guardado!';
            btn.classList.replace('btn-primary', 'btn-success');
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.classList.replace('btn-success', 'btn-primary');
                btn.disabled = false;
            }, 2000);

        } catch (error) {
            console.error('Error saving:', error);
            alert('Error al guardar: ' + error.message);
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    },

    renderPanel() {
        const contentArea = document.getElementById('content-area');
        if (!contentArea) return;

        let panel = document.getElementById('website_admin-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'website_admin-panel';
            panel.className = 'panel';
            contentArea.appendChild(panel);
        }

        panel.innerHTML = `
            <div class="panel-header">
                <div>
                    <h1 style="display:flex; align-items:center; gap:10px;">
                        <i class="fas fa-globe" style="color:var(--accent);"></i> Administración Web Site
                    </h1>
                    <p class="text-secondary" style="font-size: 0.9rem; margin-top: 5px;">Controla el contenido de TuComprasCol.com en tiempo real.</p>
                </div>
                <div class="actions">
                    <button class="btn btn-primary" onclick="WebsiteAdmin.saveSettings()">
                        <i class="fas fa-save"></i> Guardar Cambios en Vivo
                    </button>
                </div>
            </div>

            <div class="inventory-tabs">
                <button class="tab-btn active" onclick="WebsiteAdmin.switchTab('general')">1. General & Redes</button>
                <button class="tab-btn" onclick="WebsiteAdmin.switchTab('hero')">2. Inicio & Banners</button>
                <button class="tab-btn" onclick="WebsiteAdmin.switchTab('legal')">3. Legales & Mayoristas</button>
                <button class="tab-btn" onclick="WebsiteAdmin.switchTab('testimonials')">4. Testimonios</button>
            </div>

            <div id="wa-tab-general" class="wa-tab-content" style="margin-top: 2rem;">
                <div class="form-grid">
                    <div class="form-group glass" style="padding: 1.5rem; border-radius: 16px;">
                        <h3 style="margin-bottom:1rem;"><i class="fas fa-address-book"></i> Contacto</h3>
                        <label>WhatsApp Principal</label>
                        <input type="text" id="wa-whatsapp" class="form-control" onchange="WebsiteAdmin.updateSetting('whatsapp', this.value)">
                        <label>Facebook URL</label>
                        <input type="text" id="wa-facebook" class="form-control" onchange="WebsiteAdmin.updateSetting('facebook_url', this.value)">
                        <label>Instagram URL</label>
                        <input type="text" id="wa-instagram" class="form-control" onchange="WebsiteAdmin.updateSetting('instagram_url', this.value)">
                        <label>TikTok URL</label>
                        <input type="text" id="wa-tiktok" class="form-control" onchange="WebsiteAdmin.updateSetting('tiktok_url', this.value)">
                    </div>
                    <div class="form-group glass" style="padding: 1.5rem; border-radius: 16px;">
                        <h3 style="margin-bottom:1rem;"><i class="fas fa-search"></i> SEO & Marketing</h3>
                        <label>Título Google (SEO)</label>
                        <input type="text" id="wa-meta-title" class="form-control" onchange="WebsiteAdmin.updateSetting('meta_title', this.value)">
                        <label>Descripción Google</label>
                        <textarea id="wa-meta-desc" class="form-control" onchange="WebsiteAdmin.updateSetting('meta_description', this.value)"></textarea>
                        <label>Meta Pixel ID</label>
                        <input type="text" id="wa-pixel-fb" class="form-control" onchange="WebsiteAdmin.updateSetting('meta_pixel_id', this.value)">
                        <label>TikTok Pixel ID</label>
                        <input type="text" id="wa-pixel-tk" class="form-control" onchange="WebsiteAdmin.updateSetting('tiktok_pixel_id', this.value)">
                    </div>
                </div>
            </div>

            <div id="wa-tab-hero" class="wa-tab-content" style="display: none; margin-top: 2rem;">
                <div class="form-grid">
                    <div class="form-group glass" style="padding: 1.5rem; border-radius: 16px;">
                        <h3 style="margin-bottom:1rem;"><i class="fas fa-home"></i> Inicio</h3>
                        <label>Título H1</label>
                        <input type="text" id="wa-hero-title" class="form-control" onchange="WebsiteAdmin.updateSetting('hero_title', this.value)">
                        <label>Subtítulo</label>
                        <textarea id="wa-hero-subtitle" class="form-control" style="height:100px;" onchange="WebsiteAdmin.updateSetting('hero_subtitle', this.value)"></textarea>
                    </div>
                    <div class="form-group glass" style="padding: 1.5rem; border-radius: 16px;">
                        <h3 style="margin-bottom:1rem;"><i class="fas fa-images"></i> Carrusel</h3>
                        <input type="file" id="wa-hero-image-upload" multiple class="form-control" onchange="WebsiteAdmin.uploadHeroImages(event)">
                        <div id="wa-hero-images-preview" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 10px; margin-top: 1rem;"></div>
                    </div>
                </div>
            </div>

            <div id="wa-tab-legal" class="wa-tab-content" style="display: none; margin-top: 2rem;">
                <div class="form-grid">
                    <div class="form-group glass" style="padding: 1.5rem; border-radius: 16px;">
                        <h3 style="margin-bottom:1rem;"><i class="fas fa-store"></i> Mayoristas</h3>
                        <label>Título</label>
                        <input type="text" id="wa-wholesale-title" class="form-control" onchange="WebsiteAdmin.updateSetting('wholesale_title', this.value)">
                        <label>Texto</label>
                        <textarea id="wa-wholesale-text" class="form-control" onchange="WebsiteAdmin.updateSetting('wholesale_text', this.value)"></textarea>
                    </div>
                    <div class="form-group glass" style="padding: 1.5rem; border-radius: 16px;">
                        <h3 style="margin-bottom:1rem;"><i class="fas fa-gavel"></i> Legal</h3>
                        <label>Privacidad</label>
                        <textarea id="wa-privacy" class="form-control" style="height:100px;" onchange="WebsiteAdmin.updateSetting('privacy_policy_text', this.value)"></textarea>
                        <label>Reembolsos</label>
                        <textarea id="wa-refunds" class="form-control" style="height:100px;" onchange="WebsiteAdmin.updateSetting('refund_policy_text', this.value)"></textarea>
                    </div>
                </div>
            </div>

            <div id="wa-tab-testimonials" class="wa-tab-content" style="display: none; margin-top: 2rem;">
                <div class="form-group glass" style="padding: 1.5rem; border-radius: 16px;">
                    <h3 style="margin-bottom:1rem;"><i class="fas fa-star"></i> Testimonios</h3>
                    <div id="wa-testimonials-list" style="display: grid; gap: 1rem; margin-bottom: 2rem;"></div>
                    <div style="background: rgba(255,255,255,0.03); padding: 1.5rem; border-radius: 12px; border: 1px dashed var(--accent);">
                        <h4>Nuevo Testimonio</h4>
                        <input type="text" id="new-testim-name" placeholder="Nombre" class="form-control" style="margin-top:0.5rem;">
                        <input type="text" id="new-testim-city" placeholder="Ciudad" class="form-control" style="margin-top:0.5rem;">
                        <textarea id="new-testim-text" placeholder="Comentario" class="form-control" style="margin-top:0.5rem;"></textarea>
                        <input type="file" id="new-testim-img" class="form-control" style="margin-top:0.5rem;">
                        <button class="btn btn-primary" style="margin-top:1rem; width:100%;" onclick="WebsiteAdmin.addTestimonial()">Añadir Testimonio</button>
                    </div>
                </div>
            </div>
        `;
        if (this.settings) this.populateForms();
    },

    switchTab(tabId) {
        document.querySelectorAll('#website_admin-panel .tab-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = Array.from(document.querySelectorAll('#website_admin-panel .tab-btn')).find(b => b.textContent.toLowerCase().includes(tabId));
        if (activeBtn) activeBtn.classList.add('active');

        document.querySelectorAll('.wa-tab-content').forEach(c => c.style.display = 'none');
        const target = document.getElementById('wa-tab-' + tabId);
        if (target) target.style.display = 'block';
    },

    updateSetting(key, value) {
        if (!this.settings) this.settings = {};
        this.settings[key] = value;
    },

    async uploadHeroImages(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        const supabase = window.supabaseClient;
        
        try {
            for (let file of files) {
                const path = `website/hero_${Date.now()}_${file.name}`;
                const { error } = await supabase.storage.from('products').upload(path, file);
                if (error) throw error;
                const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(path);
                if (!this.settings.hero_images) this.settings.hero_images = [];
                this.settings.hero_images.push(publicUrl);
            }
            this.renderHeroImagesPreview();
            alert('Imágenes subidas');
        } catch (e) {
            alert('Error: ' + e.message);
        }
    },

    renderHeroImagesPreview() {
        const container = document.getElementById('wa-hero-images-preview');
        if (!container || !this.settings?.hero_images) return;
        container.innerHTML = this.settings.hero_images.map((url, i) => `
            <div style="position:relative;">
                <img src="${url}" style="width:80px; height:80px; object-fit:cover; border-radius:8px;">
                <button onclick="WebsiteAdmin.removeHeroImage(${i})" style="position:absolute; top:-5px; right:-5px; background:red; color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer;">×</button>
            </div>
        `).join('');
    },

    removeHeroImage(index) {
        this.settings.hero_images.splice(index, 1);
        this.renderHeroImagesPreview();
    },

    async addTestimonial() {
        const name = document.getElementById('new-testim-name').value;
        const city = document.getElementById('new-testim-city').value;
        const text = document.getElementById('new-testim-text').value;
        const file = document.getElementById('new-testim-img').files[0];
        
        if (!name || !text) return alert('Nombre y texto obligatorios');
        
        let imageUrl = '';
        if (file) {
            const path = `testimonials/${Date.now()}_${file.name}`;
            const { error } = await window.supabaseClient.storage.from('products').upload(path, file);
            if (!error) {
                const { data } = window.supabaseClient.storage.from('products').getPublicUrl(path);
                imageUrl = data.publicUrl;
            }
        }

        const newTestim = { id: Date.now(), name, city, text, image: imageUrl };
        if (!this.settings.testimonials) this.settings.testimonials = [];
        this.settings.testimonials.unshift(newTestim);
        this.renderTestimonialsList();
        
        // Reset
        document.getElementById('new-testim-name').value = '';
        document.getElementById('new-testim-city').value = '';
        document.getElementById('new-testim-text').value = '';
    },

    renderTestimonialsList() {
        const container = document.getElementById('wa-testimonials-list');
        if (!container || !this.settings?.testimonials) return;
        container.innerHTML = this.settings.testimonials.map(t => `
            <div class="glass" style="padding:1rem; border-radius:12px; display:flex; gap:1rem; align-items:center;">
                <img src="${t.image || 'https://via.placeholder.com/50'}" style="width:50px; height:50px; border-radius:50%; object-fit:cover;">
                <div style="flex:1;">
                    <strong>${t.name}</strong> <small>${t.city || ''}</small>
                    <p style="margin:5px 0; font-size:0.85rem; opacity:0.8;">${t.text}</p>
                </div>
                <button onclick="WebsiteAdmin.removeTestimonial(${t.id})" class="btn btn-sm btn-outline" style="color:red; border-color:red;">Eliminar</button>
            </div>
        `).join('');
    },

    removeTestimonial(id) {
        this.settings.testimonials = this.settings.testimonials.filter(t => t.id !== id);
        this.renderTestimonialsList();
    }
};
