// Módulo Administración Web Site
window.WebsiteAdmin = {
    settings: null,

    init() {
        this.renderPanel();
        this.loadSettings();
    },

    async loadSettings() {
        try {
            const { data, error } = await supabaseClient
                .from('website_settings')
                .select('*')
                .eq('id', 'default')
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error cargando website settings:', error);
                return;
            }

            this.settings = data || {
                id: 'default',
                whatsapp: '573167862554',
                facebook_url: '',
                instagram_url: '',
                tiktok_url: '',
                hero_title: 'En el 2025 vendimos más de 1.300 productos',
                hero_subtitle: 'Más de 1.300 productos entregados y clientes 100% satisfechos en toda Colombia. Compra con seguridad y paga al recibir en tu puerta.',
                hero_images: [],
                wholesale_title: '¿Eres Comerciante o Ferretero?',
                wholesale_text: 'En TuCompras Col somos importadores y distribuidores directos. Potencia tu negocio con nuestro catálogo mayorista, precios competitivos y envíos prioritarios a toda Colombia.',
                wholesale_bg_image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837',
                privacy_policy_text: 'Política estándar de privacidad...',
                refund_policy_text: 'Política estándar de reembolsos...',
                meta_title: 'TuCompras Col | Herramientas y Hogar con Envíos en Colombia',
                meta_description: 'Distribuidora líder en herramientas de ferretería, protección y hogar.',
                meta_pixel_id: '',
                tiktok_pixel_id: ''
            };

            this.populateForms();
        } catch (e) {
            console.error('Error:', e);
        }
    },

    async saveSettings() {
        if (!this.settings) return;

        try {
            this.settings.updated_at = new Date().toISOString();
            
            const { error } = await supabaseClient
                .from('website_settings')
                .upsert(this.settings, { onConflict: 'id' });

            if (error) throw error;
            
            alert('✅ Configuración del sitio web guardada exitosamente. Los cambios ya están en vivo.');
        } catch (error) {
            console.error('Error guardando configuraciones:', error);
            alert('❌ Error al guardar configuraciones: ' + error.message);
        }
    },

    renderPanel() {
        const contentArea = document.getElementById('content-area');
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
                    <p class="text-secondary" style="font-size: 0.9rem; margin-top: 5px;">Controla el contenido de tu página web (TuComprasCol.com) en tiempo real, sin usar WordPress.</p>
                </div>
                <div class="actions">
                    <button class="btn btn-primary" onclick="WebsiteAdmin.saveSettings()">
                        <i class="fas fa-save"></i> Guardar Cambios en Vivo
                    </button>
                    <a href="https://tucomprascol.com" target="_blank" class="btn btn-outline">
                        <i class="fas fa-external-link-alt"></i> Ver Sitio Web
                    </a>
                </div>
            </div>

            <div class="inventory-tabs">
                <button class="tab-btn active" onclick="WebsiteAdmin.switchTab('general')">1. Configuración General & Redes</button>
                <button class="tab-btn" onclick="WebsiteAdmin.switchTab('hero')">2. Textos de Inicio & Banners</button>
                <button class="tab-btn" onclick="WebsiteAdmin.switchTab('legal')">3. Páginas Legales & Mayoristas</button>
            </div>

            <!-- Tab 1: General & Redes -->
            <div id="wa-tab-general" class="wa-tab-content" style="margin-top: 2rem;">
                <div class="form-grid">
                    <div class="form-group glass" style="padding: 1.5rem; border-radius: 16px;">
                        <h3 style="margin-bottom: 1rem; color: var(--accent);"><i class="fas fa-address-book"></i> Datos de Contacto</h3>
                        <label>Número de WhatsApp Principal (ej: 573167862554)</label>
                        <input type="text" id="wa-whatsapp" class="form-control" onchange="WebsiteAdmin.updateSetting('whatsapp', this.value)">
                        
                        <label style="margin-top: 1rem;">Link de Facebook</label>
                        <input type="url" id="wa-facebook" class="form-control" onchange="WebsiteAdmin.updateSetting('facebook_url', this.value)">
                        
                        <label style="margin-top: 1rem;">Link de Instagram</label>
                        <input type="url" id="wa-instagram" class="form-control" onchange="WebsiteAdmin.updateSetting('instagram_url', this.value)">
                        
                        <label style="margin-top: 1rem;">Link de TikTok</label>
                        <input type="url" id="wa-tiktok" class="form-control" onchange="WebsiteAdmin.updateSetting('tiktok_url', this.value)">
                    </div>

                    <div class="form-group glass" style="padding: 1.5rem; border-radius: 16px;">
                        <h3 style="margin-bottom: 1rem; color: #10b981;"><i class="fas fa-bullseye"></i> SEO y Rastreo (Marketing)</h3>
                        <label>Título SEO (Aparece en Google)</label>
                        <input type="text" id="wa-meta-title" class="form-control" onchange="WebsiteAdmin.updateSetting('meta_title', this.value)">
                        
                        <label style="margin-top: 1rem;">Descripción SEO</label>
                        <textarea id="wa-meta-desc" class="form-control" style="height: 60px;" onchange="WebsiteAdmin.updateSetting('meta_description', this.value)"></textarea>

                        <div style="margin: 1rem 0; border-top: 1px solid rgba(255,255,255,0.1);"></div>

                        <label>ID Pixel de Meta (Facebook)</label>
                        <input type="text" id="wa-pixel-fb" class="form-control" placeholder="Ej: 123456789012345" onchange="WebsiteAdmin.updateSetting('meta_pixel_id', this.value)">
                        
                        <label style="margin-top: 1rem;">ID Pixel de TikTok</label>
                        <input type="text" id="wa-pixel-tk" class="form-control" placeholder="Ej: CQ123456789ABCD" onchange="WebsiteAdmin.updateSetting('tiktok_pixel_id', this.value)">
                    </div>
                </div>
            </div>

            <!-- Tab 2: Inicio & Banners -->
            <div id="wa-tab-hero" class="wa-tab-content" style="display: none; margin-top: 2rem;">
                <div class="form-grid">
                    <div class="form-group glass" style="padding: 1.5rem; border-radius: 16px;">
                        <h3 style="margin-bottom: 1rem; color: var(--accent);"><i class="fas fa-home"></i> Sección Principal (Arriba)</h3>
                        <label>Título Principal (H1)</label>
                        <input type="text" id="wa-hero-title" class="form-control" onchange="WebsiteAdmin.updateSetting('hero_title', this.value)">
                        
                        <label style="margin-top: 1rem;">Subtítulo o Descripción corta</label>
                        <textarea id="wa-hero-subtitle" class="form-control" style="height: 100px;" onchange="WebsiteAdmin.updateSetting('hero_subtitle', this.value)"></textarea>
                    </div>

                    <div class="form-group glass" style="padding: 1.5rem; border-radius: 16px;">
                        <h3 style="margin-bottom: 1rem; color: #f59e0b;"><i class="fas fa-images"></i> Imágenes del Carrusel</h3>
                        <p class="text-secondary" style="font-size: 0.8rem; margin-bottom: 1rem;">Sube las imágenes que rotan en el lado derecho de la página de inicio (Se recomiendan 3 a 5 imágenes).</p>
                        
                        <input type="file" id="wa-hero-image-upload" accept="image/*" multiple class="form-control" onchange="WebsiteAdmin.uploadHeroImages(event)">
                        
                        <div id="wa-hero-images-preview" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 10px; margin-top: 1rem;">
                            <!-- Previews generados aquí -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tab 3: Legales & Mayoristas -->
            <div id="wa-tab-legal" class="wa-tab-content" style="display: none; margin-top: 2rem;">
                <div class="form-grid">
                    <div class="form-group glass" style="padding: 1.5rem; border-radius: 16px;">
                        <h3 style="margin-bottom: 1rem; color: #ec4899;"><i class="fas fa-store-alt"></i> Sección Mayoristas (B2B)</h3>
                        <label>Título Mayoristas</label>
                        <input type="text" id="wa-wholesale-title" class="form-control" onchange="WebsiteAdmin.updateSetting('wholesale_title', this.value)">
                        
                        <label style="margin-top: 1rem;">Texto Mayoristas</label>
                        <textarea id="wa-wholesale-text" class="form-control" style="height: 80px;" onchange="WebsiteAdmin.updateSetting('wholesale_text', this.value)"></textarea>

                        <label style="margin-top: 1rem;">URL de la Imagen de Fondo</label>
                        <input type="text" id="wa-wholesale-bg" class="form-control" placeholder="https://images.unsplash.com/..." onchange="WebsiteAdmin.updateSetting('wholesale_bg_image', this.value)">
                    </div>

                    <div class="form-group glass" style="padding: 1.5rem; border-radius: 16px;">
                        <h3 style="margin-bottom: 1rem; color: #64748b;"><i class="fas fa-gavel"></i> Textos Legales</h3>
                        <label>Política de Privacidad (Acepta HTML)</label>
                        <textarea id="wa-privacy" class="form-control" style="height: 120px;" onchange="WebsiteAdmin.updateSetting('privacy_policy_text', this.value)"></textarea>
                        
                        <label style="margin-top: 1rem;">Política de Reembolsos (Acepta HTML)</label>
                        <textarea id="wa-refunds" class="form-control" style="height: 120px;" onchange="WebsiteAdmin.updateSetting('refund_policy_text', this.value)"></textarea>
                    </div>
                </div>
            </div>
        `;
    },

    switchTab(tabId) {
        document.querySelectorAll('#website_admin-panel .tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(\`#website_admin-panel .tab-btn[onclick="WebsiteAdmin.switchTab('\${tabId}')"]\`).classList.add('active');

        document.querySelectorAll('.wa-tab-content').forEach(content => content.style.display = 'none');
        document.getElementById(\`wa-tab-\${tabId}\`).style.display = 'block';
    },

    updateSetting(key, value) {
        if (!this.settings) return;
        this.settings[key] = value;
    },

    populateForms() {
        if (!this.settings) return;
        const s = this.settings;
        
        // Tab 1
        this.setVal('wa-whatsapp', s.whatsapp);
        this.setVal('wa-facebook', s.facebook_url);
        this.setVal('wa-instagram', s.instagram_url);
        this.setVal('wa-tiktok', s.tiktok_url);
        this.setVal('wa-meta-title', s.meta_title);
        this.setVal('wa-meta-desc', s.meta_description);
        this.setVal('wa-pixel-fb', s.meta_pixel_id);
        this.setVal('wa-pixel-tk', s.tiktok_pixel_id);

        // Tab 2
        this.setVal('wa-hero-title', s.hero_title);
        this.setVal('wa-hero-subtitle', s.hero_subtitle);
        this.renderHeroImagesPreview();

        // Tab 3
        this.setVal('wa-wholesale-title', s.wholesale_title);
        this.setVal('wa-wholesale-text', s.wholesale_text);
        this.setVal('wa-wholesale-bg', s.wholesale_bg_image);
        this.setVal('wa-privacy', s.privacy_policy_text);
        this.setVal('wa-refunds', s.refund_policy_text);
    },

    setVal(id, value) {
        const el = document.getElementById(id);
        if (el && value) el.value = value;
    },

    async uploadHeroImages(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const uploadBtn = document.getElementById('wa-hero-image-upload');
        uploadBtn.disabled = true;
        
        const newUrls = [];
        const originalText = uploadBtn.previousElementSibling.textContent;
        uploadBtn.previousElementSibling.textContent = '⏳ Subiendo imágenes...';

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileExt = file.name.split('.').pop();
                const fileName = \`hero_\${Math.random().toString(36).substring(2, 15)}_\${Date.now()}.\${fileExt}\`;
                const filePath = \`website/\${fileName}\`;

                const { error: uploadError } = await supabaseClient.storage
                    .from('products') // Reuse products bucket for simplicity, or we can create 'website' bucket if it exists. Using 'products' is safer as it's already configured.
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabaseClient.storage
                    .from('products')
                    .getPublicUrl(filePath);

                newUrls.push(publicUrl);
            }

            // Append to existing or replace
            if (!this.settings.hero_images) this.settings.hero_images = [];
            this.settings.hero_images = [...this.settings.hero_images, ...newUrls];
            
            this.renderHeroImagesPreview();
            alert('✅ Imágenes subidas exitosamente. Recuerda Guardar los Cambios.');

        } catch (error) {
            console.error('Error uploading:', error);
            alert('❌ Error al subir imágenes: ' + error.message);
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.previousElementSibling.textContent = originalText;
            uploadBtn.value = ''; // Reset input
        }
    },

    removeHeroImage(index) {
        if (!this.settings.hero_images) return;
        this.settings.hero_images.splice(index, 1);
        this.renderHeroImagesPreview();
    },

    renderHeroImagesPreview() {
        const container = document.getElementById('wa-hero-images-preview');
        if (!container) return;

        const images = this.settings?.hero_images || [];
        
        if (images.length === 0) {
            container.innerHTML = '<p class="text-secondary" style="grid-column: 1/-1;">No hay imágenes cargadas.</p>';
            return;
        }

        container.innerHTML = images.map((url, index) => \`
            <div style="position: relative; aspect-ratio: 1; border-radius: 8px; overflow: hidden; border: 1px solid var(--border);">
                <img src="\${url}" style="width: 100%; height: 100%; object-fit: cover;">
                <button onclick="WebsiteAdmin.removeHeroImage(\${index})" style="position: absolute; top: 4px; right: 4px; background: rgba(239, 68, 68, 0.9); color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.7rem;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        \`).join('');
    }
};
