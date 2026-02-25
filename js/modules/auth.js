/**
 * ERP AC Authentication Module
 */

export const Auth = {
    currentUser: null,

    init() {
        this.checkSession();
        this.setupEventListeners();
    },

    checkSession() {
        const session = localStorage.getItem('erp_session');
        if (session) {
            this.currentUser = JSON.parse(session);
            document.body.classList.remove('logged-out');
            document.getElementById('login-overlay').classList.add('hidden');
            this.updateProfileUI();
        } else {
            document.body.classList.add('logged-out');
            document.getElementById('login-overlay').classList.remove('hidden');
        }
    },

    login(username, password) {
        // Simplified auth for MVP
        if (username === 'admin' && password === 'admin') {
            this.currentUser = {
                id: '1',
                username: 'admin',
                name: 'Administrador',
                role: 'superadmin'
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
            loginForm.onsubmit = (e) => {
                e.preventDefault();
                console.log('Login attempt started...');

                const user = loginForm.elements['username'].value;
                const pass = loginForm.elements['password'].value;

                console.log('User entered:', user);

                if (this.login(user, pass)) {
                    console.log('Login successful, reloading...');
                    window.location.reload();
                } else {
                    console.warn('Login failed: Invalid credentials');
                    alert('Credenciales incorrectas (admin/admin)');
                }
            };
        }

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.onclick = () => this.logout();
        }
    },

    updateProfileUI() {
        const nameEl = document.querySelector('.user-profile span');
        if (nameEl && this.currentUser) {
            nameEl.textContent = this.currentUser.name;
        }
    }
};
