/**
 * User Management Module (Security & Roles)
 */

window.UserManagement = {
    async init() {
        this.render();
        this.loadUsers();
    },

    render() {
        const container = document.getElementById('main-content');
        container.innerHTML = `
            <div id="user-management-panel" class="panel-fade-in">
                <div class="header-flex">
                    <div>
                        <h1 class="text-gradient">Seguridad y Usuarios</h1>
                        <p class="text-secondary">Gestiona quién tiene acceso de administrador al ERP.</p>
                    </div>
                </div>

                <div class="stats-grid" style="margin-bottom: 2rem;">
                    <div class="stat-card glass">
                        <i class="fas fa-shield-alt"></i>
                        <div class="stat-info">
                            <span id="total-admins">0</span>
                            <small>Administradores</small>
                        </div>
                    </div>
                    <div class="stat-card glass">
                        <i class="fas fa-users"></i>
                        <div class="stat-info">
                            <span id="total-users">0</span>
                            <small>Usuarios Registrados</small>
                        </div>
                    </div>
                </div>

                <div class="table-container glass">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Usuario / Email</th>
                                <th>Rol Actual</th>
                                <th>Fecha Registro</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="users-list">
                            <tr><td colspan="4" class="text-center">Cargando usuarios...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    async loadUsers() {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('createdAt', { ascending: false });

        if (error) {
            ERP_LOG('Error cargando usuarios: ' + error.message, 'error');
            return;
        }

        this.renderUsersList(data);
        this.updateStats(data);
    },

    renderUsersList(users) {
        const list = document.getElementById('users-list');
        if (!list) return;

        if (users.length === 0) {
            list.innerHTML = '<tr><td colspan="4" class="text-center">No hay usuarios registrados.</td></tr>';
            return;
        }

        list.innerHTML = users.map(user => `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 35px; height: 35px; background: var(--primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                            ${user.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <strong>${user.email}</strong>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge ${user.role === 'admin' ? 'bg-danger' : 'bg-success'}">
                        ${user.role === 'admin' ? 'ADMINISTRADOR' : 'CLIENTE / CONSULTA'}
                    </span>
                </td>
                <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                <td class="table-actions">
                    <button class="btn btn-sm ${user.role === 'admin' ? 'btn-outline' : 'btn-primary'}" 
                            onclick="UserManagement.toggleRole('${user.id}', '${user.role}')">
                        <i class="fas ${user.role === 'admin' ? 'fa-user-minus' : 'fa-user-shield'}"></i>
                        ${user.role === 'admin' ? 'Quitar Admin' : 'Hacer Admin'}
                    </button>
                </td>
            </tr>
        `).join('');
    },

    async toggleRole(userId, currentRole) {
        const newRole = currentRole === 'admin' ? 'customer' : 'admin';
        const confirmMsg = newRole === 'admin' 
            ? '¿Estás seguro de dar permisos de ADMINISTRADOR a este usuario?' 
            : '¿Estás seguro de quitar los permisos de administrador?';

        if (!confirm(confirmMsg)) return;

        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId);

        if (error) {
            alert('Error al actualizar rol: ' + error.message);
        } else {
            ERP_LOG(`Rol actualizado a ${newRole}`, 'success');
            this.loadUsers();
        }
    },

    updateStats(users) {
        document.getElementById('total-admins').innerText = users.filter(u => u.role === 'admin').length;
        document.getElementById('total-users').innerText = users.length;
    }
};
