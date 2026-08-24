/**
 * ERP AC Authentication Module
 */

window.Auth = {
    currentUser: null,

    async init() {
        this.checkSession();
        this.setupEventListeners();
    },

    checkSession() {
        const session = localStorage.getItem('erp_session');
        if (session && session !== 'undefined' && session !== 'null') {
            try {
                this.currentUser = JSON.parse(session);
                document.body.classList.remove('logged-out');

                const modal = document.getElementById('login-modal');
                if (modal) modal.style.display = 'none';

                const overlay = document.getElementById('login-overlay');
                if (overlay) overlay.style.display = 'none';

                this.updateProfileUI();
            } catch (e) {
                console.warn('Invalid session format, clearing...');
                this.logout();
            }
        } else {
            document.body.classList.add('logged-out');

            const modal = document.getElementById('login-modal');
            if (modal) modal.style.display = 'flex';

            const overlay = document.getElementById('login-overlay');
            if (overlay) overlay.style.display = 'flex';
        }
    },

    async login(usernameOrEmail, password) {
        const supabase = window.supabaseClient;

        if (supabase) {
            try {
                // 1. Try custom 'users' table lookup
                const { data: dbUsers } = await supabase
                    .from('users')
                    .select('*')
                    .or(`username.eq.${usernameOrEmail.toLowerCase()},email.eq.${usernameOrEmail.toLowerCase()}`);

                if (dbUsers && dbUsers.length > 0) {
                    const found = dbUsers.find(u => u.password === password || u.pass === password);
                    if (found) {
                        this.currentUser = {
                            id: found.id || found.username,
                            email: found.email || found.username,
                            name: found.full_name || found.name || found.username,
                            role: found.role || 'principal'
                        };
                        localStorage.setItem('erp_session', JSON.stringify(this.currentUser));
                        this.checkSession();
                        return true;
                    }
                }

                // 2. Try Supabase Auth
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: usernameOrEmail,
                    password: password
                });

                if (data && data.user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', data.user.id)
                        .single();

                    this.currentUser = {
                        id: data.user.id,
                        email: data.user.email,
                        name: data.user.user_metadata?.full_name || usernameOrEmail.split('@')[0],
                        role: profile?.role || 'principal'
                    };

                    localStorage.setItem('erp_session', JSON.stringify(this.currentUser));
                    this.checkSession();
                    return true;
                }
            } catch (err) {
                console.error('Auth Supabase Error:', err);
            }
        }

        // 3. Admin / Fallback Accounts
        const cleanUser = (usernameOrEmail || '').trim().toLowerCase();
        if (
            (cleanUser === 'admin' && (password === 'admin' || password === '123456' || password === 'admin123')) ||
            ((cleanUser === 'andres' || cleanUser === 'andres23124@gmail.com') && (password === '123456' || password === 'admin' || password === 'andres' || password === 'andres123')) ||
            ((cleanUser === 'cindy' || cleanUser === 'tucompras90@gmail.com') && (password === '123456' || password === 'cindy' || password === 'cindy123'))
        ) {
            this.currentUser = {
                id: 'admin-local-' + cleanUser,
                email: cleanUser,
                name: cleanUser.toUpperCase(),
                role: 'principal'
            };
            localStorage.setItem('erp_session', JSON.stringify(this.currentUser));
            this.checkSession();
            return true;
        }

        return false;
    },

    logout() {
        localStorage.removeItem('erp_session');
        this.currentUser = null;
        window.location.reload();
    },

    setupEventListeners() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.onsubmit = async (e) => {
                e.preventDefault();
                const btn = loginForm.querySelector('button');
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';

                const user = (loginForm.elements['username']?.value || loginForm.elements['login-username']?.value || '').trim();
                const pass = (loginForm.elements['password']?.value || loginForm.elements['login-password']?.value || '').trim();

                const result = await this.login(user, pass);
                if (result) {
                    window.location.reload();
                } else {
                    const errorMsg = !window.supabaseClient ? 'Error de conexión con la base de datos' : 'Usuario o contraseña incorrectos';
                    alert(errorMsg);
                    btn.disabled = false;
                    btn.innerHTML = 'Iniciar Sesión';
                }
            };
        }

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.onclick = () => this.logout();
        }

        const togglePass = document.getElementById('toggle-password');
        const passInput = document.getElementById('login-password');
        if (togglePass && passInput) {
            togglePass.onclick = () => {
                const isPass = passInput.type === 'password';
                passInput.type = isPass ? 'text' : 'password';
                togglePass.classList.toggle('fa-eye');
                togglePass.classList.toggle('fa-eye-slash');
            };
        }
    },

    updateProfileUI() {
        const nameEl = document.querySelector('.user-profile span');
        const roleEl = document.querySelector('.user-profile small');
        if (nameEl && this.currentUser) {
            nameEl.textContent = this.currentUser.name;
        }
    },

    isAdmin() {
        return this.currentUser?.role === 'principal' || this.currentUser?.role === 'admin';
    },

    isPrincipal() {
        return this.currentUser?.role === 'principal';
    },

    async getUsers() {
        const supabase = window.supabaseClient;
        if (!supabase) return [];
        const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: true });
        if (error) {
            console.error('Error fetching users:', error);
            return [];
        }
        return data;
    },

    async createUser(username, password, fullName, role) {
        const supabase = window.supabaseClient;
        if (!supabase) return { success: false };
        const { data, error } = await supabase.from('users').insert([{
            username: username.toLowerCase(),
            password,
            full_name: fullName,
            role
        }]);
        if (error) return { success: false, error: error.message };
        return { success: true };
    },

    async deleteUser(userId) {
        if (!this.isPrincipal()) return { success: false, error: 'No tienes permisos' };
        const supabase = window.supabaseClient;
        if (!supabase) return { success: false };
        const { error } = await supabase.from('users').delete().eq('id', userId);
        if (error) return { success: false, error: error.message };
        return { success: true };
    }
};
