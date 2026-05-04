// Category Management Module
window.CategoriesModule = {
    categories: [],

    async init() {
        console.log('CategoriesModule: Initializing...');
        await this.fetchCategories();
        this.setupEventListeners();
        this.render();
    },

    async seedBaseCategories() {
        if (!confirm('¿Desea cargar las categorías base (Inalámbricas, Eléctricas, Cuadros, Agro)?')) return;
        
        const base = [
            { id: 'cat_inalambricas', name: 'Herramientas Inalámbricas' },
            { id: 'cat_electricas', name: 'Herramientas Eléctricas' },
            { id: 'cat_cuadros', name: 'Cuadros' },
            { id: 'cat_agro', name: 'Agro' },
            { id: 'cat_anclaje', name: 'Anclaje o Fijacion' }
        ];

        try {
            const supabase = window.initSupabase();
            const { error } = await supabase.from('categories').upsert(base);
            if (error) throw error;
            
            await this.fetchCategories();
            this.render();
            alert('Categorías base cargadas con éxito.');
        } catch (err) {
            alert('Error al sembrar: ' + err.message);
        }
    },

    async fetchCategories() {
        try {
            const supabase = window.initSupabase();
            if (!supabase) return;

            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            this.categories = data || [];
        } catch (err) {
            console.error('Error fetching categories:', err.message);
        }
    },

    setupEventListeners() {
        const addBtn = document.getElementById('add-category-btn');
        if (addBtn) {
            addBtn.onclick = () => this.showAddDialog();
        }
        const seedBtn = document.getElementById('seed-categories-btn');
        if (seedBtn) {
            seedBtn.onclick = () => this.seedBaseCategories();
        }
    },

    async showAddDialog() {
        const name = prompt('Ingrese el nombre de la nueva categoría:');
        if (!name || name.trim() === '') return;

        try {
            const supabase = window.initSupabase();
            const id = 'cat_' + Date.now();

            const { error } = await supabase
                .from('categories')
                .insert([{ id, name: name.trim() }]);

            if (error) throw error;

            await this.fetchCategories();
            this.render();

            // Notify other modules if needed
            if (window.Inventory && window.Inventory.loadCategoryOptions) {
                await window.Inventory.loadCategoryOptions();
            }
        } catch (err) {
            alert('Error al crear categoría: ' + err.message);
        }
    },

    async deleteCategory(id) {
        if (!confirm('¿Está seguro de eliminar esta categoría?')) return;

        try {
            const supabase = window.initSupabase();
            const { error } = await supabase
                .from('categories')
                .delete()
                .eq('id', id);

            if (error) throw error;

            await this.fetchCategories();
            this.render();
        } catch (err) {
            alert('Error al eliminar categoría: ' + err.message);
        }
    },

    render() {
        const list = document.getElementById('categories-list');
        if (!list) return;

        list.innerHTML = '';
        this.categories.forEach(cat => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${cat.name}</strong></td>
                <td><code style="font-size:0.75rem; color:var(--text-secondary);">${cat.id}</code></td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="CategoriesModule.deleteCategory('${cat.id}')" style="color:var(--danger); border-color:rgba(239,68,68,0.2);">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            list.appendChild(tr);
        });
    },

    renderPanel() {
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = `
            <div id="categories-panel" class="panel animate">
                <div class="panel-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                    <h1>Gestión de Categorías</h1>
                    <div style="display: flex; gap: 10px;">
                        <button id="seed-categories-btn" class="btn btn-outline" style="border-color: var(--accent); color: var(--accent);"><i class="fas fa-seedling"></i> Sembrar Base</button>
                        <button id="add-category-btn" class="btn btn-primary"><i class="fas fa-plus"></i> Nueva Categoría</button>
                    </div>
                </div>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>ID</th>
                                <th style="width: 100px;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="categories-list">
                            <!-- Categories will be rendered here -->
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        this.init();
    }
};

// Initialize when the panel is shown or app starts
document.addEventListener('DOMContentLoaded', () => {
    // Initialization is usually handled by app.js when switching panels
});
