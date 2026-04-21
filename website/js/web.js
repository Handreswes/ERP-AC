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

// DOM Elements
const productGrid = document.getElementById('product-grid');
const categoryGrid = document.getElementById('category-grid');
const cartCount = document.getElementById('cart-count');
const navbar = document.getElementById('navbar');

// Initialize
async function init() {
    setupEventListeners();
    await fetchProducts();
    updateCartUI();
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
    }
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
    } else {
        showView('home');
    }
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
                </div>

                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; text-align: center;">
                    <div class="glass" style="padding: 1rem; border-radius: 15px;"><i class="fas fa-shield-check" style="display: block; font-size: 1.5rem; margin-bottom: 8px; color: var(--accent);"></i><small>Garantía</small></div>
                    <div class="glass" style="padding: 1rem; border-radius: 15px;"><i class="fas fa-box-open" style="display: block; font-size: 1.5rem; margin-bottom: 8px; color: var(--accent);"></i><small>Original</small></div>
                    <div class="glass" style="padding: 1rem; border-radius: 15px;"><i class="fas fa-headset" style="display: block; font-size: 1.5rem; margin-bottom: 8px; color: var(--accent);"></i><small>Soporte 24/7</small></div>
                </div>
            </div>
        </div>
    `;
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
}

// Submit Order
document.getElementById('checkout-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESANDO...';

    const phone = document.getElementById('cust-phone').value.replace(/\s/g, '');
    if (!/^3[0-9]{9}$/.test(phone)) { alert('Ingresa un teléfono válido de Colombia (10 dígitos).'); btn.disabled = false; btn.innerHTML = 'CONFIRMAR PEDIDO <i class="fas fa-check"></i>'; return; }

    const items = checkoutSource === 'landing' ? [{ product_id: checkoutItem.id, name: checkoutItem.name, qty: 1, price: checkoutItem.priceFinal }] : cart.map(i => ({ product_id: i.id, name: i.name, qty: i.qty, price: i.priceFinal }));
    const orderData = {
        id: 'TC-' + Date.now().toString().slice(-8), customerName: document.getElementById('cust-name').value, customerPhone: phone, customerAddress: document.getElementById('cust-address').value,
        customerCity: document.getElementById('cust-city').value, customerDept: document.getElementById('cust-dept').value, items, total: items.reduce((s, i) => s + (i.price * i.qty), 0),
        status: 'Pendiente por Confirmar', source: checkoutSource
    };

    try {
        const { error } = await _supabase.from('orders').insert([orderData]);
        if (error) throw error;
        if (checkoutSource === 'cart') { cart = []; updateCartUI(); }
        showView('success');
    } catch (err) { alert('Error: ' + err.message); btn.disabled = false; btn.innerHTML = 'CONFIRMAR PEDIDO <i class="fas fa-check"></i>'; }
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
    handleRouting(); // Call once on start
}

init();
