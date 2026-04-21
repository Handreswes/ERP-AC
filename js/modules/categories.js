// Category Management Module
window.CategoriesModule = {
    categories: [],

    async init() {
        console.log('CategoriesModule: Initializing...');
        await this.fetchCategories();
        this.setupEventListeners();
        this.render();
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
            if (window.InventoryModule && window.InventoryModule.loadCategories) {
                await window.InventoryModule.loadCategories();
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
    }
};

// Initialize when the panel is shown or app starts
document.addEventListener('DOMContentLoaded', () => {
    // Initialization is usually handled by app.js when switching panels
});
