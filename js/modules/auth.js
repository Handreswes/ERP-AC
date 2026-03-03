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
        if (session) {
            this.currentUser = JSON.parse(session);
            document.body.classList.remove('logged-out');
            document.getElementById('login-overlay')?.classList.add('hidden');
            this.updateProfileUI();
        } else {
            document.body.classList.add('logged-out');
            document.getElementById('login-overlay')?.classList.remove('hidden');
        }
    },

    async login(username, password) {
        const supabase = window.supabaseClient;
        if (!supabase) return false;

        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('username', username.toLowerCase())
                .eq('password', password)
                .single();

            if (error || !data) {
                console.warn('Login failed:', error?.message || 'User not found');
                return false;
            }

            this.currentUser = {
                id: data.id,
                username: data.username,
                name: data.full_name,
                role: data.role
            };

            localStorage.setItem('erp_session', JSON.stringify(this.currentUser));
            this.checkSession();
            return true;
        } catch (err) {
            console.error('Auth Error:', err);
            return false;
        }
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

                const user = loginForm.elements['username'].value;
                const pass = loginForm.elements['password'].value;

                if (await this.login(user, pass)) {
                    window.location.reload();
                } else {
                    alert('Usuario o contraseña incorrectos');
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
