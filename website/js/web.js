// Supabase Web Configuration
const SUPABASE_URL = 'https://zuondbguopirimvfuehu.supabase.co';
const SUPABASE_KEY = 'sb_publishable_29SdlPI3zzDkNvvEO38kOQ_2NTwiTC_';
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// State
let products = [];
let cart = JSON.parse(localStorage.getItem('tc-cart')) || [];
let activeCategory = 'all';
let checkoutSource = 'cart';
let checkoutItem = null;
let currentUser = null;

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
    setupEventListeners();
    await checkSession();
    await fetchProducts();
    subscribeToProducts();
    updateCartUI();
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
        const { data, error } = await _supabase
            .from('products')
            .select('*')
            .eq('active', true)
            .order('name', { ascending: true });

        if (error) throw error;
        products = data;
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
    if (!wrap || products.length === 0) return;

    // Filter products with images
    const withImages = products.filter(p => p.image && (Array.isArray(p.image) ? p.image.length > 0 : true));

    // Select 2 Cuadros
    const cuadros = withImages.filter(p => (p.category || '').toLowerCase().includes('cuadros')).slice(0, 2);

    // Select 4 Tools (Inalambricas or Electricas)
    const herramientas = withImages.filter(p => (p.category || '').toLowerCase().includes('herramienta')).slice(0, 4);

    // Combine
    let featured = [...cuadros, ...herramientas];

    // Fill if not enough
    if (featured.length < 6) {
        const others = withImages.filter(p => !featured.find(f => f.id === p.id)).slice(0, 6 - featured.length);
        featured = [...featured, ...others];
    }

    // Take exactly 6 and shuffle slightly or just use
    featured = featured.slice(0, 6);

    wrap.innerHTML = featured.map((p, i) => {
        const img = Array.isArray(p.image) ? p.image[0] : p.image;
        return `<div class="cylinder-item" onclick="window.location.hash = 'product?id=${p.id}'" style="cursor:pointer">
            <img src="${img}" alt="${p.name}">
        </div>`;
    }).join('');
}

// Render Products
function renderProducts(items) {
    productGrid.innerHTML = '';
    const filtered = activeCategory === 'all' ? items : items.filter(p => p.category === activeCategory);

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

// Render Product Landing
function renderProductLanding(id) {
    const p = products.find(prod => prod.id === id);
    const content = document.getElementById('product-landing-content');
    if (!p) {
        content.innerHTML = '<div class="glass" style="padding:4rem; text-align:center;"><h2>Producto no encontrado</h2><button class="btn btn-primary" onclick="showView(\'home\')">Volver al Inicio</button></div>';
        return;
    }

    const img = (Array.isArray(p.image) ? p.image[0] : (p.image || p.imageUrl)) || 'https://via.placeholder.com/600';
    const price = (p.priceFinal || p.priceInternet || 0).toLocaleString();

    content.innerHTML = `
        <div style="margin-bottom: 2rem;">
            <a href="#home" style="color: var(--text-secondary); text-decoration: none; display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-arrow-left"></i> Volver al Catálogo
            </a>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 4rem; align-items: center;">
            <div class="animate">
                <img src="${img}" style="width: 100%; border-radius: 30px; box-shadow: var(--shadow-lg);">
            </div>
            <div class="animate" style="animation-delay: 0.1s;">
                <span class="badge" style="background: var(--accent); color: var(--bg-dark); padding: 5px 15px; border-radius: 20px; font-weight: 700; margin-bottom: 1.5rem; display: inline-block;">${p.category || 'General'}</span>
                <h1 style="font-size: 3.5rem; line-height: 1.1; margin-bottom: 1.5rem;">${p.name}</h1>
                <p style="font-size: 1.2rem; color: var(--text-secondary); margin-bottom: 2.5rem; line-height: 1.6;">${p.description || 'Experimenta la máxima calidad y rendimiento con este producto diseñado para los estándares más exigentes. Ideal para uso industrial y profesional.'}</p>
                
                <div class="glass" style="padding: 2.5rem; border-radius: 25px; margin-bottom: 3rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                        <span style="font-size: 1.1rem; color: var(--text-secondary);">Precio para Ti:</span>
                        <span style="font-size: 3rem; font-weight: 800; color: var(--accent);">$${price}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 15px; color: var(--success); font-weight: 600; margin-bottom: 2rem;">
                        <i class="fas fa-truck-fast" style="font-size: 1.5rem;"></i> Envío a Nivel Nacional + Pago Contra Entrega
                    </div>
                    <button class="btn btn-primary btn-block btn-lg" onclick="quickBuy('${p.id}')" style="width: 100%; height: 70px; font-size: 1.25rem; margin-bottom: 1.5rem;">
                        COMPRAR AHORA <i class="fas fa-arrow-right" style="margin-left: 10px;"></i>
                    </button>
                    <button class="btn btn-outline btn-block" onclick="showView('home')" style="width: 100%; padding: 1.2rem; font-weight: 700; border-width: 2px;">
                        <i class="fas fa-plus-circle"></i> AGREGAR MÁS PRODUCTOS A ESTA COMPRA
                    </button>

                    <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
                        <p style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 12px;">Paga en cuotas con:</p>
                        <a href="https://wa.me/573167862554?text=Hola,%20quisiera%20pagar%20mi%20pedido%20con%20Addi%20o%20Sistecrédito" target="_blank" style="text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 25px; transition: var(--transition);">
                            <img src="https://logodownload.org/wp-content/uploads/2021/06/addi-logo.png" alt="Addi" style="height: 22px;">
                            <img src="https://seeklogo.com/images/S/sistecredito-logo-4E38A3A401-seeklogo.com.png" alt="Sistecrédito" style="height: 22px;">
                        </a>
                        <p style="font-size: 0.7rem; color: var(--primary); font-weight: 700; margin-top: 10px;">
                             <a href="https://wa.me/573167862554?text=Hola,%20quisiera%20información%20sobre%20pagos%20con%20crédito" target="_blank" style="color: inherit; text-decoration: none;">
                                ¿Quieres crédito? Habla con un asesor <i class="fab fa-whatsapp"></i>
                             </a>
                        </p>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; text-align: center;">
                    <div class="glass" style="padding: 1rem; border-radius: 15px;"><i class="fas fa-shield-check" style="display: block; font-size: 1.5rem; margin-bottom: 8px; color: var(--accent);"></i><small>Garantía</small></div>
                    <div class="glass" style="padding: 1rem; border-radius: 15px;"><i class="fas fa-box-open" style="display: block; font-size: 1.5rem; margin-bottom: 8px; color: var(--accent);"></i><small>Original</small></div>
                    <div class="glass" style="padding: 1rem; border-radius: 15px;"><i class="fas fa-headset" style="display: block; font-size: 1.5rem; margin-bottom: 8px; color: var(--accent);"></i><small>Soporte 24/7</small></div>
                </div>
            </div>
        </div>
    `;
    if (window.fbq) fbq('track', 'ViewContent', { content_ids: [id], content_type: 'product', content_name: p.name, value: p.priceFinal, currency: 'COP' });
    if (window.ttq) ttq.track('ViewContent', { content_id: id, content_name: p.name, value: p.priceFinal, currency: 'COP' });
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
            card.onclick = () => { activeCategory = cat.name; renderProducts(products); window.location.hash = 'productos'; };
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

    summary.innerHTML = `<h4 style="margin-bottom: 15px; border-bottom: 1px solid var(--border); padding-bottom: 10px;">Resumen del Pedido</h4>${html}<div style="display: flex; justify-content: space-between; font-size: 1.5rem; margin-top: 15px; border-top: 2px solid var(--accent); padding-top: 10px;"><strong>TOTAL:</strong><strong style="color: var(--accent);">$${total.toLocaleString()}</strong></div>`;

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
