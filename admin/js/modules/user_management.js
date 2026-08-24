/**
 * User Management Module (Security & Roles)
 */

window.UserManagement = {
    async init() {
        this.render();
        this.loadUsers();
        this.injectModals();
    },

    render() {
        const contentArea = document.getElementById('content-area');
        if (!contentArea) return;

        let panel = document.getElementById('user-management-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'user-management-panel';
            panel.className = 'panel';
            contentArea.appendChild(panel);
        }

        panel.innerHTML = `
            <div class="panel-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
                <div>
                    <h1 class="text-gradient" style="margin: 0;">Seguridad y Usuarios</h1>
                    <p class="text-secondary" style="margin: 4px 0 0 0;">Gestiona quién tiene acceso de administración y vende en el ERP.</p>
                </div>
                <div>
                    <button class="btn btn-primary" onclick="UserManagement.openUserModal()">
                        <i class="fas fa-user-plus"></i> Crear Nuevo Usuario
                    </button>
                </div>
            </div>

            <div class="stats-grid" style="margin-bottom: 2rem;">
                <div class="stat-card glass">
                    <i class="fas fa-shield-alt" style="font-size: 2rem; color: var(--accent); margin-bottom: 8px;"></i>
                    <div class="stat-info">
                        <span id="total-admins" style="font-size: 1.8rem; font-weight: 700;">0</span>
                        <small style="display: block; color: var(--text-secondary);">Administradores</small>
                    </div>
                </div>
                <div class="stat-card glass">
                    <i class="fas fa-users" style="font-size: 2rem; color: var(--success); margin-bottom: 8px;"></i>
                    <div class="stat-info">
                        <span id="total-users" style="font-size: 1.8rem; font-weight: 700;">0</span>
                        <small style="display: block; color: var(--text-secondary);">Usuarios Activos</small>
                    </div>
                </div>
            </div>

            <div class="table-container glass">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Usuario / Email</th>
                            <th>Nombre Completo</th>
                            <th>Rol / Permisos</th>
                            <th>Contraseña</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="users-list">
                        <tr><td colspan="5" class="text-center" style="padding: 2rem;">Cargando lista de usuarios...</td></tr>
                    </tbody>
                </table>
            </div>
        `;
    },

    async loadUsers() {
        let users = [];

        // 1. Load default system accounts
        const defaultUsers = [
            { id: 'usr-andres', username: 'andres', email: 'andres23124@gmail.com', full_name: 'Andrés (Administrador Principal)', role: 'principal', password_mask: '••••••••' },
            { id: 'usr-cindy', username: 'cindy', email: 'tucompras90@gmail.com', full_name: 'Cindy (Administrador TuCompras)', role: 'admin', password_mask: '••••••••' }
        ];

        // 2. Query Supabase 'users' table if available
        if (window.supabaseClient) {
            try {
                const { data: dbUsers } = await window.supabaseClient.from('users').select('*');
                if (dbUsers && dbUsers.length > 0) {
                    dbUsers.forEach(dbU => {
                        const existingIdx = defaultUsers.findIndex(d => d.username === dbU.username);
                        if (existingIdx !== -1) {
                            defaultUsers[existingIdx] = { ...defaultUsers[existingIdx], ...dbU };
                        } else {
                            users.push({
                                id: dbU.id || dbU.username,
                                username: dbU.username,
                                email: dbU.email || (dbU.username + '@tucomprascol.com'),
                                full_name: dbU.full_name || dbU.name || dbU.username,
                                role: dbU.role || 'admin',
                                password_mask: '••••••••'
                            });
                        }
                    });
                }
            } catch (e) {
                console.warn('Error loading Supabase users:', e.message);
            }
        }

        // 3. Load custom local users
        const localUsers = JSON.parse(localStorage.getItem('erp_custom_users') || '[]');
        localUsers.forEach(localU => {
            if (!defaultUsers.some(d => d.username === localU.username) && !users.some(u => u.username === localU.username)) {
                users.push({
                    id: localU.id || localU.username,
                    username: localU.username,
                    email: localU.email || localU.username,
                    full_name: localU.full_name || localU.name || localU.username,
                    role: localU.role || 'admin',
                    password_mask: '••••••••'
                });
            }
        });

        const allUsers = [...defaultUsers, ...users];
        this.renderUsersList(allUsers);
        this.updateStats(allUsers);
    },

    renderUsersList(users) {
        const list = document.getElementById('users-list');
        if (!list) return;

        if (!users || users.length === 0) {
            list.innerHTML = '<tr><td colspan="5" class="text-center" style="padding: 2rem;">No hay usuarios registrados.</td></tr>';
            return;
        }

        list.innerHTML = users.map(user => `
            <tr>
                <td data-label="Usuario / Email">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 36px; height: 36px; background: var(--accent); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem;">
                            ${(user.username || user.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <strong>${user.email || user.username}</strong><br>
                            <small class="text-secondary">Alias: ${user.username}</small>
                        </div>
                    </div>
                </td>
                <td data-label="Nombre Completo">
                    <strong>${user.full_name || user.name || user.username}</strong>
                </td>
                <td data-label="Rol / Permisos">
                    <span class="badge ${user.role === 'principal' ? 'bg-danger' : user.role === 'admin' ? 'bg-blue' : 'bg-success'}">
                        ${user.role === 'principal' ? 'SUPER ADMIN' : user.role === 'admin' ? 'ADMINISTRADOR' : 'VENDEDOR / CAJA'}
                    </span>
                </td>
                <td data-label="Contraseña">
                    <span style="font-family: monospace; letter-spacing: 2px;">${user.password_mask || '••••••••'}</span>
                </td>
                <td data-label="Acciones" class="table-actions">
                    <button class="btn btn-sm btn-outline" style="border-color: var(--accent); color: var(--accent);" 
                            onclick="UserManagement.openChangePasswordModal('${user.username}', '${user.full_name || user.username}')">
                        <i class="fas fa-key"></i> Cambiar Clave
                    </button>
                </td>
            </tr>
        `).join('');
    },

    injectModals() {
        if (document.getElementById('user-modal')) return;

        const modalHtml = `
        <!-- Create / Edit User Modal -->
        <div id="user-modal" class="modal">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2 id="user-modal-title"><i class="fas fa-user-plus"></i> Crear Nuevo Usuario</h2>
                    <span class="close-modal" onclick="document.getElementById('user-modal').classList.remove('show')">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="user-form" onsubmit="UserManagement.handleSaveUser(event)">
                        <div class="form-group" style="margin-bottom: 1rem;">
                            <label style="font-weight: 600;">Nombre Completo</label>
                            <input type="text" id="user-fullname" class="form-control" placeholder="Ej: Cindy María" required>
                        </div>
                        <div class="form-group" style="margin-bottom: 1rem;">
                            <label style="font-weight: 600;">Nombre de Usuario / Alias</label>
                            <input type="text" id="user-username" class="form-control" placeholder="Ej: cindy" required>
                        </div>
                        <div class="form-group" style="margin-bottom: 1rem;">
                            <label style="font-weight: 600;">Correo Electrónico</label>
                            <input type="email" id="user-email" class="form-control" placeholder="Ej: tucompras90@gmail.com" required>
                        </div>
                        <div class="form-group" style="margin-bottom: 1rem;">
                            <label style="font-weight: 600;">Contraseña de Acceso</label>
                            <input type="text" id="user-password" class="form-control" placeholder="Ingresa la contraseña" required>
                        </div>
                        <div class="form-group" style="margin-bottom: 1.5rem;">
                            <label style="font-weight: 600;">Rol de Usuario</label>
                            <select id="user-role" class="form-control">
                                <option value="admin">Administrador (Acceso Total)</option>
                                <option value="principal">Super Admin (Acceso Total + Seguridad)</option>
                                <option value="vendedor">Vendedor / Caja</option>
                            </select>
                        </div>
                        <button type="submit" class="btn btn-primary btn-block" style="padding: 0.85rem;">
                            <i class="fas fa-save"></i> Guardar Usuario
                        </button>
                    </form>
                </div>
            </div>
        </div>

        <!-- Change Password Modal -->
        <div id="change-pass-modal" class="modal">
            <div class="modal-content" style="max-width: 450px;">
                <div class="modal-header">
                    <h2><i class="fas fa-key"></i> Cambiar Contraseña</h2>
                    <span class="close-modal" onclick="document.getElementById('change-pass-modal').classList.remove('show')">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="change-pass-form" onsubmit="UserManagement.handleChangePassword(event)">
                        <input type="hidden" id="change-pass-target-username">
                        <p id="change-pass-user-label" style="font-weight: 600; color: var(--accent); margin-bottom: 1rem;"></p>
                        
                        <div class="form-group" style="margin-bottom: 1.5rem;">
                            <label style="font-weight: 600;">Nueva Contraseña</label>
                            <input type="text" id="change-pass-new" class="form-control" placeholder="Escribe la nueva contraseña" required>
                        </div>
                        
                        <button type="submit" class="btn btn-success btn-block" style="padding: 0.85rem;">
                            <i class="fas fa-check-circle"></i> Actualizar Contraseña
                        </button>
                    </form>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    openUserModal() {
        this.injectModals();
        document.getElementById('user-form').reset();
        document.getElementById('user-modal').classList.add('show');
    },

    async handleSaveUser(e) {
        e.preventDefault();
        const fullName = document.getElementById('user-fullname').value.trim();
        const username = document.getElementById('user-username').value.trim().toLowerCase();
        const email = document.getElementById('user-email').value.trim().toLowerCase();
        const password = document.getElementById('user-password').value.trim();
        const role = document.getElementById('user-role').value;

        if (!username || !password) {
            alert('Por favor completa el usuario y la contraseña.');
            return;
        }

        const newUser = {
            id: 'usr-' + username,
            username,
            email,
            full_name: fullName,
            password,
            role
        };

        // 1. Try to save to Supabase 'users' table
        if (window.supabaseClient) {
            try {
                await window.supabaseClient.from('users').upsert([
                    { username, password, full_name: fullName, role }
                ]);
            } catch (err) {
                console.warn('Supabase upsert user error:', err.message);
            }
        }

        // 2. Save to local storage custom users
        let customUsers = JSON.parse(localStorage.getItem('erp_custom_users') || '[]');
        customUsers = customUsers.filter(u => u.username !== username);
        customUsers.push(newUser);
        localStorage.setItem('erp_custom_users', JSON.stringify(customUsers));

        alert(`✅ Usuario "${username}" guardado con éxito.`);
        document.getElementById('user-modal').classList.remove('show');
        this.loadUsers();
    },

    openChangePasswordModal(username, fullName) {
        this.injectModals();
        document.getElementById('change-pass-target-username').value = username;
        document.getElementById('change-pass-user-label').textContent = `Usuario: ${fullName} (${username})`;
        document.getElementById('change-pass-new').value = '';
        document.getElementById('change-pass-modal').classList.add('show');
    },

    async handleChangePassword(e) {
        e.preventDefault();
        const username = document.getElementById('change-pass-target-username').value;
        const newPassword = document.getElementById('change-pass-new').value.trim();

        if (!newPassword) {
            alert('Por favor ingresa la nueva contraseña.');
            return;
        }

        // 1. Update in Supabase
        if (window.supabaseClient) {
            try {
                await window.supabaseClient
                    .from('users')
                    .update({ password: newPassword })
                    .eq('username', username);
            } catch (err) {
                console.warn('Supabase pass update error:', err.message);
            }
        }

        // 2. Update local custom users
        let customUsers = JSON.parse(localStorage.getItem('erp_custom_users') || '[]');
        const idx = customUsers.findIndex(u => u.username === username);
        if (idx !== -1) {
            customUsers[idx].password = newPassword;
        } else {
            customUsers.push({ username, password: newPassword });
        }
        localStorage.setItem('erp_custom_users', JSON.stringify(customUsers));

        alert(`✅ Contraseña de "${username}" actualizada a "${newPassword}" con éxito.`);
        document.getElementById('change-pass-modal').classList.remove('show');
        this.loadUsers();
    },

    updateStats(users) {
        const totalAdmins = users.filter(u => u.role === 'admin' || u.role === 'principal').length;
        document.getElementById('total-admins').innerText = totalAdmins;
        document.getElementById('total-users').innerText = users.length;
    }
};
