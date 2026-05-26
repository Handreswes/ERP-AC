// Supabase Web Configuration
const SUPABASE_URL = 'https://zuondbguopirimvfuehu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1b25kYmd1b3BpcmltdmZ1ZWh1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjAzMjk2NiwiZXhwIjoyMDg3NjA4OTY2fQ.9Zja0di6OMtWwFyigiZiWnXo0burILHTVAuBOf6EhUE';
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// State
let products = [];
let cart = JSON.parse(localStorage.getItem('tc-cart')) || [];
let activeCategory = 'all';
let currentSearchQuery = '';
let checkoutSource = 'cart';
let checkoutItem = null;
let currentUser = null;

window.filterBySearch = function(keyword) {
    currentSearchQuery = keyword.toLowerCase().trim();
    renderProducts(products);
};

window.clearFilters = function() {
    activeCategory = 'all';
    currentSearchQuery = '';
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    renderProducts(products);
    const prodSec = document.getElementById('productos');
    if (prodSec) prodSec.scrollIntoView({ behavior: 'smooth' });
};

// DOM Elements
const productGrid = document.getElementById('product-grid');
const categoryGrid = document.getElementById('category-grid');
const cartCount = document.getElementById('cart-count');
const navbar = document.getElementById('navbar');

// Initialize
// Auth Functions
function setupAuthForms() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-pass').value;
            const btn = loginForm.querySelector('button');
            btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';

            const { data, error } = await _supabase.auth.signInWithPassword({ email, password: pass });
            if (error) {
                alert('Error: ' + error.message);
                btn.disabled = false; btn.innerHTML = 'INICIAR SESIÓN';
            } else {
                await fetchUserProfile(data.user);
                showView('home');
            }
        };
    }

    const regForm = document.getElementById('register-form');
    if (regForm) {
        regForm.onsubmit = async (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value;
            const phone = document.getElementById('reg-phone').value;
            const email = document.getElementById('reg-email').value;
            const pass = document.getElementById('reg-pass').value;
            const btn = regForm.querySelector('button');
            btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';

            const { data, error } = await _supabase.auth.signUp({ email, password: pass, options: { data: { full_name: name, phone: phone } } });
            if (error) {
                alert('Error: ' + error.message);
                btn.disabled = false; btn.innerHTML = 'CREAR CUENTA';
            } else {
                await syncCustomerToCRM(data.user, { name, phone, email });
                alert('Cuenta creada. Por favor verifica tu correo.');
                currentUser = { id: data.user.id, name, email, phone };
                showView('home');
            }
        };
    }
}

// Social Login removed for simplicity

async function fetchUserProfile(user) {
    if (!user) return;
    const { data, error } = await _supabase.from('tucompras_customers').select('*').eq('auth_id', user.id).single();
    if (data) {
        currentUser = { ...data };
    } else {
        currentUser = { id: user.id, name: user.user_metadata.full_name || 'Usuario', email: user.email };
    }
}

async function logout() {
    await _supabase.auth.signOut();
    currentUser = null;
    showView('home');
    location.reload();
}

async function syncCustomerToCRM(user, profile) {
    const customerData = {
        id: user.id,
        auth_id: user.id,
        name: profile.name,
        phone: profile.phone,
        email: profile.email,
        created_at: new Date().toISOString()
    };
    await _supabase.from('tucompras_customers').upsert([customerData]);
}

async function fetchOrderHistory() {
    if (!currentUser) return;
    const list = document.getElementById('order-history-list');
    const { data, error } = await _supabase.from('orders').select('*').eq('customerPhone', currentUser.phone).order('createdAt', { ascending: false });
    
    if (error || !data || data.length === 0) {
        list.innerHTML = '<p style="text-align:center; padding:2rem;">No tienes pedidos aún.</p>';
        return;
    }

    list.innerHTML = data.map(o => `
        <div class="glass" style="padding:1.5rem; margin-bottom:1rem; border-left: 4px solid var(--primary);">
            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                <strong>${o.id}</strong>
                <span class="badge" style="background:var(--primary); color:white; padding:2px 10px; border-radius:10px; font-size:0.8rem;">${o.status}</span>
            </div>
            <div style="font-size:0.9rem; color:var(--text-secondary);">
                ${new Date(o.createdAt).toLocaleDateString()} - $${o.total.toLocaleString()}
            </div>
            <div style="margin-top:0.5rem; font-size:0.85rem;">
                ${o.items.map(i => `${i.qty}x ${i.name}`).join(', ')}
            </div>
        </div>
    `).join('');
}

// Check initial session
async function checkSession() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (session) {
        await fetchUserProfile(session.user);
        updateBottomNav();
    }
}

async function init() {
    console.log('INIT START');
    setupEventListeners();
    await checkSession();
    await loadWebsiteSettings();
    await fetchProducts();
    subscribeToProducts();
    updateCartUI();
}

async function loadWebsiteSettings() {
    try {
        const { data, error } = await _supabase.from('website_settings').select('*').eq('id', 'default').single();
        if (error || !data) return; // Fallback to hardcoded HTML if not found

        // 1. Meta Tags (SEO)
        if (data.meta_title) {
            document.title = data.meta_title;
            const metaTitleTag = document.getElementById('meta-title-tag');
            if (metaTitleTag) metaTitleTag.innerText = data.meta_title;
        }
        if (data.meta_description) {
            const metaDesc = document.getElementById('meta-description-tag');
            if (metaDesc) metaDesc.content = data.meta_description;
        }

        // 2. Hero Section
        if (data.hero_title) {
            const el = document.getElementById('hero-title-text');
            if (el) el.innerText = data.hero_title;
        }
        if (data.hero_subtitle) {
            const el = document.getElementById('hero-subtitle-text');
            if (el) el.innerText = data.hero_subtitle;
        }
        if (data.hero_images && Array.isArray(data.hero_images) && data.hero_images.length > 0) {
            const wrap = document.getElementById('hero-cylinder-wrap');
            if (wrap) {
                wrap.innerHTML = data.hero_images.map(url => `
                    <div class="cylinder-item"><img src="${url}" alt="Banner"></div>
                `).join('');
            }
        }

        // 3. Wholesale Section
        if (data.wholesale_title) {
            const el = document.getElementById('wholesale-title-text');
            if (el) el.innerText = data.wholesale_title;
        }
        if (data.wholesale_text) {
            const el = document.getElementById('wholesale-desc-text');
            if (el) el.innerText = data.wholesale_text;
        }
        if (data.wholesale_bg_image) {
            const sec = document.getElementById('mayoristas');
            if (sec) sec.style.backgroundImage = `linear-gradient(rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.9)), url('${data.wholesale_bg_image}')`;
        }

        // 4. Legal Policies
        if (data.privacy_policy_text) {
            const el = document.getElementById('privacy-policy-content');
            if (el) el.innerHTML = data.privacy_policy_text;
        }
        if (data.refund_policy_text) {
            const el = document.getElementById('refunds-policy-content');
            if (el) el.innerHTML = data.refund_policy_text;
        }

        // 5. Contact & Social Links
        if (data.whatsapp) {
            document.querySelectorAll('.wa-dynamic-link').forEach(link => {
                try {
                    const url = new URL(link.href);
                    url.pathname = '/' + data.whatsapp;
                    link.href = url.toString();
                } catch(e) {
                    link.href = `https://wa.me/${data.whatsapp}`;
                }
            });
        }
        if (data.facebook_url) {
            const el = document.getElementById('social-fb-link');
            if (el) el.href = data.facebook_url;
        }
        if (data.instagram_url) {
            const el = document.getElementById('social-ig-link');
            if (el) el.href = data.instagram_url;
        }
        if (data.tiktok_url) {
            const el = document.getElementById('social-tk-link');
            if (el) el.href = data.tiktok_url;
        }
        
        // 7. Testimonials
        if (data.testimonials && Array.isArray(data.testimonials) && data.testimonials.length > 0) {
            const container = document.querySelector('.testimonials-grid');
            if (container) {
                container.innerHTML = data.testimonials.map(t => `
                    <div class="glass testimonial-card" style="padding: 2.5rem; border-radius: 25px; position: relative;">
                        <div style="color: #ffc145; margin-bottom: 1rem;">
                            <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>
                        </div>
                        <p style="font-style: italic; color: var(--text-secondary); margin-bottom: 1.5rem;">"${t.text}"</p>
                        <div style="display: flex; align-items: center; gap: 15px;">
                            ${t.image ? `<img src="${t.image}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover;">` : `<div style="width: 45px; height: 45px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700;">${t.name.charAt(0)}</div>`}
                            <div>
                                <h4 style="margin: 0; font-size: 1rem;">${t.name}</h4>
                                <small style="color: #94a3b8;">Cliente Verificado - ${t.city || 'Colombia'}</small>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        }

        // 6. Pixels (Dynamic Injection)
        if (data.google_analytics_id) {
            gtag('js', new Date());
            gtag('config', data.google_analytics_id);
        }
        if (data.google_ads_id) {
            gtag('config', data.google_ads_id);
        }
        if (data.meta_pixel_id && window.fbq) {
            fbq('init', data.meta_pixel_id);
            fbq('track', 'PageView');
        }
        if (data.tiktok_pixel_id && window.ttq) {
            ttq.load(data.tiktok_pixel_id);
            ttq.page();
        }
    } catch (e) {
        console.error('Error loading website settings:', e);
    }
}

function subscribeToProducts() {
    _supabase
        .channel('public:products')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
            fetchProducts();
        })
        .subscribe();
}

// Router & View Management
function showView(viewId, productId = null) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    const target = document.getElementById(`${viewId}-view`);
    if (target) {
        target.style.display = 'block';
        window.scrollTo(0, 0);
    }

    if (viewId === 'product' && productId) {
        renderProductLanding(productId);
    }
    if (viewId === 'checkout') {
        renderCheckoutSummary();
        const prompt = document.getElementById('checkout-login-prompt');
        if (prompt) prompt.style.display = currentUser ? 'none' : 'block';
    }
    if (viewId === 'success') {
        const prompt = document.getElementById('guest-register-prompt');
        if (prompt) prompt.style.display = currentUser ? 'none' : 'block';
    }
    if (viewId === 'privacy' || viewId === 'refunds') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (viewId === 'account') {
        renderAccountView();
    }
    updateBottomNav();
}

function handleRouting() {
    const hash = window.location.hash || '#home';
    const [view, params] = hash.substring(1).split('?');
    const urlParams = new URLSearchParams(params || window.location.search);

    if (view === 'product' || urlParams.has('p')) {
        const id = urlParams.get('id') || urlParams.get('p');
        showView('product', id);
    } else if (view === 'checkout') {
        showView('checkout');
    } else if (view === 'account') {
        showView('account');
    } else {
        showView('home');
    }
    updateBottomNav();
}

// Fetch Products from Supabase
async function fetchProducts() {
    try {
        console.log('Fetching products from Supabase...');
        const { data, error } = await _supabase
            .from('products')
            .select('*')
            .eq('active', true)
            .order('name', { ascending: true });

        if (error) {
            console.error('Supabase query error:', error);
            throw error;
        }
        
        console.log('Raw products fetched:', data ? data.length : 0);

        // Filter out ghost products (no price)
        products = data.filter(p => (p.priceInternet || p.priceFinal || p.priceWholesale) > 0);
        
        console.log('Filtered products:', products.length);

        renderProducts(products);
        renderCategories();
        populateCylinder();
        handleRouting();
    } catch (err) {
        console.error('Error fetching products:', err.message);
        productGrid.innerHTML = '<p class="error">Error al cargar productos. Por favor intente más tarde.</p>';
    }
}

function populateCylinder() {
    const wrap = document.querySelector('.cylinder-wrap');
    if (!wrap) return;

    const customerPhotos = [
        'fotos clientes/cliente 1.jpeg',
        'fotos clientes/cliente 2.jpeg',
        'fotos clientes/cleinte 3.jpeg',
        'fotos clientes/cliente 4.jpeg',
        'fotos clientes/cliente 5.jpeg',
        'fotos clientes/cliente 1.jpeg',
        'fotos clientes/cliente 2.jpeg',
        'fotos clientes/cleinte 3.jpeg'
    ];

    wrap.innerHTML = customerPhotos.map((img, i) => `
        <div class="cylinder-item">
            <img src="${img}" alt="Cliente satisfecho" style="filter: blur(1px); object-fit: cover;">
        </div>
    `).join('');
}

// Render Products
function renderProducts(items) {
    productGrid.innerHTML = '';
    let filtered = activeCategory === 'all' ? items : items.filter(p => p.category === activeCategory);

    if (currentSearchQuery) {
        filtered = filtered.filter(p => (p.name || '').toLowerCase().includes(currentSearchQuery));
    }

    const clearBtn = document.getElementById('btn-clear-filter');
    if (clearBtn) {
        clearBtn.style.display = (activeCategory !== 'all' || currentSearchQuery !== '') ? 'inline-block' : 'none';
    }

    if (filtered.length === 0) {
        productGrid.innerHTML = '<p class="text-center" style="grid-column: 1/-1;">No se encontraron productos.</p>';
        return;
    }

    filtered.forEach(p => {
        const card = document.createElement('div');
        card.className = 'glass product-card animate';
        const img = (Array.isArray(p.image) ? p.image[0] : (p.image || p.imageUrl)) || 'https://via.placeholder.com/300';
        const price = (p.priceFinal || p.priceInternet || 0).toLocaleString();

        card.innerHTML = `
            <div class="product-img" onclick="showView('product', '${p.id}')">
                <img src="${img}" alt="${p.name}">
                <div class="product-overlay"><span>Ver Detalles</span></div>
            </div>
            <div class="product-info">
                <h3>${p.name}</h3>
                <p style="color:var(--text-secondary); font-size:0.9rem; margin-bottom:1rem;">${p.category || 'General'}</p>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="product-price">$${price}</span>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 1rem; align-items: center; justify-content: center;">
                    <button class="btn btn-primary btn-sm" onclick="quickBuy('${p.id}')" style="flex: 1; height: 45px; border-radius: 25px; white-space: nowrap;">Compra Rápida</button>
                    <button class="btn btn-outline btn-sm" onclick="addToCart('${p.id}')" title="Añadir al carrito" style="width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; padding: 0; flex-shrink: 0;">
                        <i class="fas fa-cart-plus"></i>
                    </button>
                </div>
            </div>
        `;
        productGrid.appendChild(card);
    });
}

// Helper to parse basic markdown to HTML
function parseMarkdown(text) {
    if (!text) return '';
    
    const lines = text.split(/\r?\n/);
    let html = '';
    let inList = false;

    for (let line of lines) {
        line = line.trim();
        if (!line) {
            if (inList) {
                html += '</ul>';
                inList = false;
            }
            continue;
        }

        // Check if it's a list item starting with * or -
        const listMatch = line.match(/^[\*\-]\s+(.*)/);
        if (listMatch) {
            if (!inList) {
                html += '<ul style="margin-left: 20px; margin-bottom: 1.5rem; list-style-type: disc; padding-left: 15px;">';
                inList = true;
            }
            let itemContent = listMatch[1];
            // Format bold and italic in item content
            itemContent = itemContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            itemContent = itemContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
            html += `<li style="margin-bottom: 0.5rem; line-height: 1.6; color: var(--text-secondary);">${itemContent}</li>`;
        } else {
            if (inList) {
                html += '</ul>';
                inList = false;
            }
            // Format bold and italic in normal paragraph
            let paragraphContent = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            paragraphContent = paragraphContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
            html += `<p style="margin-bottom: 1.25rem; line-height: 1.6; color: var(--text-secondary);">${paragraphContent}</p>`;
        }
    }

    if (inList) {
        html += '</ul>';
    }

    return html;
}

// Render Product Landing
function renderProductLanding(id) {
    const p = products.find(prod => prod.id === id);
    const content = document.getElementById('product-landing-content');
    if (!p) {
        content.innerHTML = '<div class="glass" style="padding:4rem; text-align:center;"><h2>Producto no encontrado</h2><button class="btn btn-primary" onclick="showView(\'home\')">Volver al Inicio</button></div>';
        return;
    }

    const images = Array.isArray(p.image) ? p.image : (p.image || p.imageUrl ? [p.image || p.imageUrl] : ['https://via.placeholder.com/600']);
    const mainImg = images[0];
    const price = (p.priceFinal || p.priceInternet || 0).toLocaleString();
    
    let galleryHtml = '';
    if (images.length > 1) {
        galleryHtml = '<div style="display: flex; gap: 10px; margin-top: 15px; overflow-x: auto; padding-bottom: 10px;">';
        images.forEach((imgSrc, idx) => {
            galleryHtml += `<img src="${imgSrc}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 10px; cursor: pointer; border: ${idx === 0 ? '2px solid var(--accent)' : '2px solid transparent'}" onclick="document.getElementById('main-product-img').src=this.src; document.querySelectorAll('.prod-thumb').forEach(t=>t.style.border='2px solid transparent'); this.style.border='2px solid var(--accent)';" class="prod-thumb">`;
        });
        galleryHtml += '</div>';
    }

    // Urgency & Social Proof Generators
    const viewers = Math.floor(Math.random() * (25 - 8 + 1)) + 8;
    const stockLeft = Math.floor(Math.random() * (12 - 3 + 1)) + 3;

    content.innerHTML = `
        <div style="margin-bottom: 2rem;">
            <a href="#home" style="color: var(--text-secondary); text-decoration: none; display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-arrow-left"></i> Volver al Catálogo
            </a>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 4rem; align-items: start;">
            <div class="animate">
                <img id="main-product-img" src="${mainImg}" style="width: 100%; border-radius: 30px; box-shadow: var(--shadow-lg); object-fit: cover; aspect-ratio: 1/1;">
                ${galleryHtml}
            </div>
            <div class="animate" style="animation-delay: 0.1s;">
                <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 1rem;">
                    <span class="badge" style="background: var(--accent); color: var(--bg-dark); padding: 5px 15px; border-radius: 20px; font-weight: 700;">${p.category || 'General'}</span>
                    <span style="font-size: 0.8rem; color: #ef4444; font-weight: 700; display: flex; align-items: center; gap: 5px;">
                        <i class="fas fa-fire"></i> ${viewers} personas viendo ahora
                    </span>
                </div>
                <h1 style="font-size: 3.5rem; line-height: 1.1; margin-bottom: 1.5rem;">${p.name}</h1>
                
                <div style="font-size: 1.1rem; color: var(--text-secondary); margin-bottom: 2.5rem; line-height: 1.6;">${parseMarkdown(p.description) || 'Experimenta la máxima calidad y rendimiento con este producto diseñado para los estándares más exigentes. Ideal para uso industrial y profesional.'}</div>
                
                <div class="glass" style="padding: 2.5rem; border-radius: 25px; margin-bottom: 3rem; border: 2px solid var(--accent);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <span style="font-size: 1.1rem; color: var(--text-secondary);">Precio para Ti:</span>
                        <span style="font-size: 3rem; font-weight: 800; color: var(--accent);">$${price}</span>
                    </div>
                    
                    <div style="background: rgba(239, 68, 68, 0.1); color: #ef4444; padding: 10px; border-radius: 10px; text-align: center; font-size: 0.9rem; font-weight: 700; margin-bottom: 1.5rem;">
                        ⚡ ¡Solo quedan ${stockLeft} unidades disponibles!
                    </div>

                    <div style="display: flex; align-items: center; gap: 15px; color: var(--success); font-weight: 600; margin-bottom: 2rem;">
                        <i class="fas fa-truck-fast" style="font-size: 1.5rem;"></i> Envío a Nivel Nacional + Pago Contra Entrega
                    </div>

                    <button class="btn btn-primary btn-block btn-lg" onclick="quickBuy('${p.id}')" style="width: 100%; height: 70px; font-size: 1.25rem; margin-bottom: 1.5rem; box-shadow: 0 10px 30px rgba(255, 140, 0, 0.4);">
                        COMPRAR AHORA <i class="fas fa-arrow-right" style="margin-left: 10px;"></i>
                    </button>
                    
                    <button class="btn btn-outline btn-block" onclick="showView('home')" style="width: 100%; padding: 1.2rem; font-weight: 700; border-width: 2px;">
                        <i class="fas fa-plus-circle"></i> AGREGAR MÁS PRODUCTOS
                    </button>

                    <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid rgba(0,0,0,0.05); text-align: center;">
                        <p style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 12px;">Paga en cuotas con:</p>
                        <a href="https://wa.me/573167862554?text=Hola,%20quisiera%20pagar%20mi%20pedido%20con%20Addi%20o%20Sistecrédito" target="_blank" style="text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 25px; transition: var(--transition);">
                            <img src="payment_methods_combined.jpeg" alt="Addi y Sistecredito" style="height: 35px; background: white; padding: 5px; border-radius: 8px;">
                        </a>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; text-align: center;">
                    <div class="glass" style="padding: 1rem; border-radius: 15px; border-bottom: 4px solid var(--accent);">
                        <i class="fas fa-shield-alt" style="display: block; font-size: 1.5rem; margin-bottom: 8px; color: var(--accent);"></i>
                        <small style="font-weight: 700;">Garantía 3 Meses<br><span style="font-size: 0.65rem; opacity: 0.8;">(Motor / Fábrica)</span></small>
                    </div>
                    <div class="glass" style="padding: 1rem; border-radius: 15px; border-bottom: 4px solid var(--success);">
                        <i class="fas fa-certificate" style="display: block; font-size: 1.5rem; margin-bottom: 8px; color: var(--success);"></i>
                        <small style="font-weight: 700;">100% Original</small>
                    </div>
                    <div class="glass" style="padding: 1rem; border-radius: 15px; border-bottom: 4px solid #6366f1;">
                        <i class="fas fa-lock" style="display: block; font-size: 1.5rem; margin-bottom: 8px; color: #6366f1;"></i>
                        <small style="font-weight: 700;">Compra Segura</small>
                    </div>
                </div>
            </div>
        </div>
    `;
    if (window.fbq) fbq('track', 'ViewContent', { content_ids: [id], content_type: 'product', content_name: p.name, value: p.priceFinal, currency: 'COP' });
    if (window.ttq) ttq.track('ViewContent', { content_id: id, content_name: p.name, value: p.priceFinal, currency: 'COP' });
    if (typeof gtag === 'function') gtag('event', 'view_item', { currency: 'COP', value: p.priceFinal, items: [{ item_id: id, item_name: p.name, item_category: p.category, price: p.priceFinal }] });
}

// Render Categories
async function renderCategories() {
    try {
        let { data, error } = await _supabase.from('categories').select('*').order('name', { ascending: true });

        // Fallback for immediate reorganization
        if (!data || data.length === 0) {
            data = [
                { id: 'inalambricas', name: 'Herramientas Inalámbricas' },
                { id: 'electricas', name: 'Herramientas Eléctricas' },
                { id: 'cuadros', name: 'Cuadros' },
                { id: 'agro', name: 'Agro' }
            ];
        }

        const icons = {
            'Herramientas Inalámbricas': 'fa-battery-full',
            'Herramientas Eléctricas': 'fa-plug',
            'Cuadros': 'fa-palette',
            'Agro': 'fa-leaf'
        };
        categoryGrid.innerHTML = '';
        data.forEach(cat => {
            const card = document.createElement('div');
            card.className = 'glass product-card animate';
            card.style = 'cursor: pointer; padding: 2.5rem; text-align: center;';
            card.onclick = () => { 
                activeCategory = cat.name; 
                renderProducts(products); 
                window.location.hash = 'productos'; 
                const prodSec = document.getElementById('productos');
                if (prodSec) prodSec.scrollIntoView({ behavior: 'smooth' });
            };
            card.innerHTML = `<i class="fas ${icons[cat.name] || 'fa-tag'}" style="font-size: 3rem; color: var(--accent); margin-bottom: 1.2rem;"></i><h3>${cat.name}</h3>`;
            categoryGrid.appendChild(card);
        });
    } catch (err) { console.error('Error categories:', err.message); }
}

// Purchase Functions
window.quickBuy = (id) => { checkoutSource = 'landing'; checkoutItem = products.find(p => p.id === id); showView('checkout'); };
window.addToCart = (id) => {
    const p = products.find(prod => prod.id === id);
    if (!p) return;
    const existing = cart.find(item => item.id === id);
    if (existing) existing.qty++; else cart.push({ ...p, qty: 1 });
    updateCartUI();
    showToast(`¡${p.name} añadido!`);
    
    if (window.fbq) fbq('track', 'AddToCart', { content_ids: [p.id], content_type: 'product', content_name: p.name, value: p.priceFinal, currency: 'COP' });
    if (window.ttq) ttq.track('AddToCart', { content_id: p.id, content_name: p.name, value: p.priceFinal, currency: 'COP' });
    if (typeof gtag === 'function') gtag('event', 'add_to_cart', { currency: 'COP', value: p.priceFinal, items: [{ item_id: p.id, item_name: p.name, price: p.priceFinal, quantity: 1 }] });
};

function updateCartUI() {
    cartCount.innerText = cart.reduce((sum, i) => sum + i.qty, 0);
    localStorage.setItem('tc-cart', JSON.stringify(cart));
}

function renderCheckoutSummary() {
    const summary = document.getElementById('checkout-summary');
    let html = ''; let total = 0;
    const items = checkoutSource === 'landing' ? [{ ...checkoutItem, qty: 1 }] : cart;

    items.forEach(i => {
        const p = i.priceFinal || i.priceInternet || 0;
        total += p * i.qty;
        html += `<div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><span>${i.qty}x ${i.name}</span><span>$${(p * i.qty).toLocaleString()}</span></div>`;
    });

    summary.innerHTML = `
        <h4 style="margin-bottom: 15px; border-bottom: 1px solid var(--border); padding-bottom: 10px;">Resumen del Pedido</h4>
        ${html}
        <div style="display: flex; justify-content: space-between; font-size: 1.5rem; margin-top: 15px; border-top: 2px solid var(--accent); padding-top: 10px;">
            <strong>TOTAL:</strong><strong style="color: var(--accent);">$${total.toLocaleString()}</strong>
        </div>
        <div style="margin-top: 1rem; font-size: 0.8rem; color: var(--success); font-weight: 700; text-align: center; background: rgba(16, 185, 129, 0.1); padding: 8px; border-radius: 8px;">
            <i class="fas fa-shield-alt"></i> Tu compra incluye 3 meses de garantía por motor o defectos de fábrica.
        </div>
    `;

    // Auto-fill form if logged in
    if (currentUser) {
        if (document.getElementById('cust-name')) document.getElementById('cust-name').value = currentUser.name || '';
        if (document.getElementById('cust-phone')) document.getElementById('cust-phone').value = currentUser.phone || '';
        if (document.getElementById('cust-address')) document.getElementById('cust-address').value = currentUser.address || '';
        if (document.getElementById('cust-city')) document.getElementById('cust-city').value = currentUser.city || '';
        if (document.getElementById('cust-dept')) document.getElementById('cust-dept').value = currentUser.dept || '';
    }
}

// Account View Rendering
async function renderAccountView() {
    const container = document.getElementById('account-content');
    if (!currentUser) {
        container.innerHTML = `
            <div style="max-width: 450px; margin: 0 auto;">
                <div class="glass" style="padding: 3rem; border-radius: 30px;">
                    <div style="display: flex; gap: 1rem; margin-bottom: 2rem;">
                        <button class="btn btn-primary" onclick="toggleAuthTab('login')" id="tab-login" style="flex:1">Entrar</button>
                        <button class="btn btn-outline" onclick="toggleAuthTab('register')" id="tab-register" style="flex:1">Registrar</button>
                    </div>

                    <div style="text-align: center; margin-bottom: 2rem;">
                        <h2 style="margin-bottom: 0.5rem;">Bienvenido</h2>
                        <p style="color: var(--text-secondary);">Inicia sesión o crea una cuenta para gestionar tus pedidos.</p>
                    </div>
                    
                    <form id="login-form">
                        <div class="form-group">
                            <label>Correo Electrónico</label>
                            <input type="email" id="login-email" class="form-control" required placeholder="tu@email.com">
                        </div>
                        <div class="form-group">
                            <label>Contraseña</label>
                            <input type="password" id="login-pass" class="form-control" required placeholder="••••••••">
                        </div>
                        <button type="submit" class="btn btn-primary" style="width:100%; margin-top: 1rem;">INICIAR SESIÓN</button>
                    </form>

                    <form id="register-form" style="display:none">
                        <div class="form-group">
                            <label>Nombre Completo</label>
                            <input type="text" id="reg-name" class="form-control" required placeholder="Juan Perez">
                        </div>
                        <div class="form-group">
                            <label>Teléfono</label>
                            <input type="tel" id="reg-phone" class="form-control" required placeholder="300 000 0000">
                        </div>
                        <div class="form-group">
                            <label>Correo Electrónico</label>
                            <input type="email" id="reg-email" class="form-control" required placeholder="tu@email.com">
                        </div>
                        <div class="form-group">
                            <label>Contraseña</label>
                            <input type="password" id="reg-pass" class="form-control" required placeholder="••••••••">
                        </div>
                        <button type="submit" class="btn btn-primary" style="width:100%; margin-top: 1rem;">CREAR CUENTA</button>
                    </form>
                </div>
            </div>
        `;
        setupAuthForms();
        
        // Pre-fill if coming from checkout
        if (window.lastOrderData) {
            toggleAuthTab('register');
            setTimeout(() => {
                if (document.getElementById('reg-name')) document.getElementById('reg-name').value = window.lastOrderData.customerName || '';
                if (document.getElementById('reg-phone')) document.getElementById('reg-phone').value = window.lastOrderData.customerPhone || '';
                if (document.getElementById('reg-email')) document.getElementById('reg-email').value = window.lastOrderData.customerEmail || '';
            }, 100);
        }
    } else {
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 2rem;">
                <div class="glass" style="padding: 2rem; border-radius: 30px; height: fit-content;">
                    <div style="text-align: center; margin-bottom: 2rem;">
                        <div style="width: 80px; height: 80px; background: var(--primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 1rem;">
                            ${currentUser.name.charAt(0)}
                        </div>
                        <h3>${currentUser.name}</h3>
                        <p style="color: var(--text-secondary); font-size: 0.9rem;">${currentUser.email}</p>
                    </div>
                    <button class="btn btn-outline btn-block" onclick="logout()" style="width: 100%; border-color: var(--danger); color: var(--danger);">Cerrar Sesión</button>
                </div>
                <div class="glass" style="padding: 2rem; border-radius: 30px;">
                    <h3 style="margin-bottom: 1.5rem;">Mis Pedidos</h3>
                    <div id="order-history-list">Cargando pedidos...</div>
                </div>
            </div>
        `;
        fetchOrderHistory();
    }
}

window.toggleAuthTab = (tab) => {
    const isLogin = tab === 'login';
    document.getElementById('login-form').style.display = isLogin ? 'block' : 'none';
    document.getElementById('register-form').style.display = isLogin ? 'none' : 'block';
    document.getElementById('tab-login').className = isLogin ? 'btn btn-primary' : 'btn btn-outline';
    document.getElementById('tab-register').className = isLogin ? 'btn btn-outline' : 'btn btn-primary';
};

// Submit Order
document.getElementById('checkout-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESANDO...';

    const phone = document.getElementById('cust-phone').value.replace(/\s/g, '');
    if (!/^3[0-9]{9}$/.test(phone)) { alert('Ingresa un teléfono válido de Colombia (10 dígitos).'); btn.disabled = false; btn.innerHTML = 'CONFIRMAR PEDIDO <i class="fas fa-check"></i>'; return; }

    const items = checkoutSource === 'landing' ? [{ product_id: checkoutItem.id, name: checkoutItem.name, qty: 1, price: checkoutItem.priceFinal }] : cart.map(i => ({ product_id: i.id, name: i.name, qty: i.qty, price: i.priceFinal }));
    
    const shippingType = document.querySelector('input[name="shipping-type"]:checked').value;
    const carrier = shippingType === 'oficina' ? document.getElementById('cust-carrier').value : null;

    const orderData = {
        id: 'TC-' + Date.now().toString().slice(-8), 
        customerName: document.getElementById('cust-name').value, 
        customerPhone: phone, 
        customerEmail: document.getElementById('cust-email').value,
        customerAddress: shippingType === 'domicilio' ? document.getElementById('cust-address').value : ('Oficina Principal ' + carrier),
        customerCity: document.getElementById('cust-city').value, 
        customerDept: document.getElementById('cust-dept').value, 
        shippingType,
        carrier,
        items, 
        total: items.reduce((s, i) => s + (i.price * i.qty), 0),
        status: 'Pendiente por Confirmar', 
        source: checkoutSource,
        hasAccount: !!currentUser,
        acceptNotifications: document.getElementById('accept-notifications').checked,
        createdAt: new Date().toISOString()
    };

    try {
        const { error } = await _supabase.from('orders').insert([orderData]);
        if (error) throw error;

        // Update Customer Stats and Shipping Info in CRM if logged in
        if (currentUser) {
            const newTotalSpent = (Number(currentUser.totalSpent) || 0) + orderData.total;
            const newTotalPurchases = (Number(currentUser.totalPurchases) || 0) + 1;
            
            const updateData = {
                totalSpent: newTotalSpent,
                totalPurchases: newTotalPurchases,
                lastPurchase: new Date().toISOString(),
                // Update shipping info if it changed or was empty
                phone: orderData.customerPhone,
                address: orderData.customerAddress,
                city: orderData.customerCity,
                dept: orderData.customerDept
            };

            await _supabase.from('tucompras_customers').update(updateData).eq('id', currentUser.id);
            
            // Refresh local state
            Object.assign(currentUser, updateData);
        }

        if (checkoutSource === 'cart') { cart = []; updateCartUI(); }
        
        // Show success and set data for possible registration
        document.getElementById('guest-register-prompt').style.display = currentUser ? 'none' : 'block';
        window.lastOrderData = orderData; 
        
        showView('success');

        if (window.fbq) fbq('track', 'Purchase', { value: orderData.total, currency: 'COP', content_ids: orderData.items.map(i => i.product_id), content_type: 'product' });
        if (window.ttq) ttq.track('CompletePayment', { value: orderData.total, currency: 'COP', content_id: orderData.items.map(i => i.product_id) });
        if (typeof gtag === 'function') gtag('event', 'purchase', { transaction_id: orderData.id, value: orderData.total, currency: 'COP', items: orderData.items.map(i => ({ item_id: i.product_id, item_name: i.name, price: i.price, quantity: i.qty })) });
    } catch (err) { alert('Error: ' + err.message); btn.disabled = false; btn.innerHTML = 'CONFIRMAR PEDIDO <i class="fas fa-check"></i>'; }
};

window.toggleShippingFields = (type) => {
    const addressField = document.getElementById('address-field');
    const carrierField = document.getElementById('carrier-field');
    const addressInput = document.getElementById('cust-address');
    
    if (type === 'domicilio') {
        addressField.style.display = 'block';
        carrierField.style.display = 'none';
        addressInput.required = true;
    } else {
        addressField.style.display = 'none';
        carrierField.style.display = 'block';
        addressInput.required = false;
    }
};

function showToast(msg) {
    const t = document.createElement('div'); t.className = 'glass';
    t.style = 'position:fixed; bottom:30px; left:30px; padding:15px 25px; border-radius:15px; border:1px solid var(--accent); z-index:10000; animation: slideIn 0.3s ease;';
    t.innerHTML = `<i class="fas fa-check-circle" style="color:var(--accent); margin-right:10px;"></i> ${msg}`;
    document.body.appendChild(t); setTimeout(() => t.remove(), 3000);
}

function setupEventListeners() {
    window.onscroll = () => { if (window.scrollY > 50) navbar.classList.add('scrolled'); else navbar.classList.remove('scrolled'); };
    window.showView = showView;
    window.addEventListener('hashchange', handleRouting);
    
    // Mobile Menu
    document.getElementById('menu-toggle').onclick = () => document.getElementById('mobile-menu').classList.add('active');
    document.getElementById('close-menu').onclick = () => document.getElementById('mobile-menu').classList.remove('active');
    document.querySelectorAll('.mobile-links a').forEach(a => {
        a.onclick = () => document.getElementById('mobile-menu').classList.remove('active');
    });

    handleRouting(); // Call once on start
}

function updateBottomNav() {
    const hash = window.location.hash || '#home';
    const view = hash.split('?')[0];
    document.querySelectorAll('.bottom-nav a').forEach(a => {
        a.classList.toggle('active', a.getAttribute('href') === view);
    });
}

init();
