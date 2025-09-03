// PTC Election Management System - JavaScript Client
class PTCApp {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        await this.checkAuth();
    }

    async checkAuth() {
        try {
            const response = await axios.get('index.php?route=api/auth/user');
            this.currentUser = response.data;
            this.showDashboard();
        } catch (error) {
            this.showLogin();
        }
    }

    showLogin() {
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('dashboard').classList.add('hidden');
        document.getElementById('navbar').style.display = 'none';
        this.hideError();
    }

    showDashboard() {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('dashboard').classList.remove('hidden');
        document.getElementById('navbar').style.display = 'block';
        
        // Update user info
        const userInfo = document.getElementById('user-info');
        if (userInfo && this.currentUser) {
            userInfo.textContent = `${this.currentUser.first_name} ${this.currentUser.last_name} (${this.currentUser.role})`;
        }

        // Show admin section for admin users
        if (this.currentUser && this.currentUser.role === 'admin') {
            document.getElementById('admin-section').classList.remove('hidden');
            this.loadProviders();
        }

        this.loadDashboardData();
    }

    showError(message) {
        const errorDiv = document.getElementById('login-error');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }

    hideError() {
        const errorDiv = document.getElementById('login-error');
        errorDiv.classList.add('hidden');
    }

    async loadProviders() {
        try {
            // Load USSD providers
            const ussdResponse = await axios.get('index.php?route=api/ussd-providers');
            this.renderUSSDProviders(ussdResponse.data);

            // Load WhatsApp providers
            const whatsappResponse = await axios.get('index.php?route=api/whatsapp-providers');
            this.renderWhatsAppProviders(whatsappResponse.data);
        } catch (error) {
            console.error('Error loading providers:', error);
        }
    }

    renderUSSDProviders(providers) {
        const container = document.getElementById('ussd-providers');
        container.innerHTML = '';

        providers.forEach(provider => {
            const div = document.createElement('div');
            div.className = 'bg-blue-50 border border-blue-200 rounded p-4';
            div.innerHTML = `
                <div class="flex items-center justify-between mb-2">
                    <div>
                        <h4 class="font-medium text-blue-900">${provider.name}</h4>
                        <p class="text-sm text-blue-700">${provider.configuration?.description || provider.type + ' USSD service'}</p>
                        ${provider.configuration?.supportedCountries ? 
                            `<p class="text-xs text-blue-600 mt-1">Countries: ${provider.configuration.supportedCountries.join(', ')}</p>` : 
                            ''}
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="px-2 py-1 text-xs rounded ${provider.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                            ${provider.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <button onclick="app.configureProvider('ussd', '${provider.id}')" 
                                class="text-blue-700 hover:text-blue-800 text-sm">
                            <i class="fas fa-cog mr-1"></i>Configure
                        </button>
                    </div>
                </div>
                ${provider.configuration?.webhookUrl ? 
                    `<div class="text-xs text-blue-700 bg-blue-100 p-2 rounded">
                        <strong>Webhook:</strong> ${provider.configuration.webhookUrl}
                    </div>` : 
                    ''}
            `;
            container.appendChild(div);
        });
    }

    renderWhatsAppProviders(providers) {
        const container = document.getElementById('whatsapp-providers');
        container.innerHTML = '';

        providers.forEach(provider => {
            const div = document.createElement('div');
            div.className = 'bg-green-50 border border-green-200 rounded p-4';
            div.innerHTML = `
                <div class="flex items-center justify-between mb-2">
                    <div>
                        <h4 class="font-medium text-green-900">${provider.name}</h4>
                        <p class="text-sm text-green-700">${provider.configuration?.description || provider.type + ' WhatsApp service'}</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="px-2 py-1 text-xs rounded ${provider.is_primary ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}">
                            ${provider.is_primary ? 'Primary' : 'Alternative'}
                        </span>
                        <span class="px-2 py-1 text-xs rounded ${provider.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                            ${provider.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <button onclick="app.configureProvider('whatsapp', '${provider.id}')" 
                                class="text-green-700 hover:text-green-800 text-sm">
                            <i class="fas fa-cog mr-1"></i>Configure
                        </button>
                    </div>
                </div>
                ${provider.configuration?.features ? 
                    `<div class="text-xs text-green-700">
                        <strong>Features:</strong> ${provider.configuration.features.join(', ')}
                    </div>` : 
                    ''}
            `;
            container.appendChild(div);
        });
    }

    async loadDashboardData() {
        // Load dashboard statistics
        // This would typically fetch from various API endpoints
        // For now, showing placeholder data
        document.getElementById('total-results').textContent = '0';
        document.getElementById('verified-results').textContent = '0';
        document.getElementById('pending-results').textContent = '0';
        document.getElementById('active-agents').textContent = '1';
    }

    configureProvider(type, id) {
        alert(`Configure ${type} provider ${id} - This would open a configuration dialog`);
        // TODO: Implement provider configuration dialog
    }
}

// Global functions for HTML onclick events
async function login(event) {
    event.preventDefault();
    
    const identifier = document.getElementById('login-identifier').value;
    const password = document.getElementById('login-password').value;
    const loginBtn = document.getElementById('login-btn');
    
    if (!identifier || !password) {
        app.showError('Please enter both email/phone and password');
        return;
    }

    // Disable button and show loading
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Signing in...';

    try {
        const response = await axios.post('index.php?route=api/auth/login', {
            identifier: identifier,
            password: password
        });

        if (response.data && response.data.user) {
            app.currentUser = response.data.user;
            app.showDashboard();
        } else {
            app.showError('Invalid response from server');
        }
    } catch (error) {
        console.error('Login error:', error);
        const message = error.response?.data?.error || 'Login failed. Please check your credentials.';
        app.showError(message);
    } finally {
        // Re-enable button
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Sign In';
    }
}

async function logout() {
    try {
        await axios.post('index.php?route=api/auth/logout');
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    app.currentUser = null;
    app.showLogin();
}

function showProfile() {
    alert('Profile management would be implemented here');
    // TODO: Implement profile management
}

// Initialize the app
const app = new PTCApp();