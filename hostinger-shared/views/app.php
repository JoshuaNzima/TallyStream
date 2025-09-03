<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo EnvLoader::get('APP_NAME', 'PTC Election System'); ?></title>
    
    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="assets/favicon.ico">
    
    <!-- CSS -->
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    
    <!-- Custom CSS -->
    <style>
        .ptc-gradient {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .card-hover:hover {
            transform: translateY(-2px);
            transition: transform 0.2s ease-in-out;
        }
    </style>
</head>
<body class="bg-gray-100 min-h-screen">
    <!-- Navigation -->
    <nav class="ptc-gradient text-white shadow-lg" id="navbar" style="display: none;">
        <div class="container mx-auto px-4">
            <div class="flex justify-between items-center py-4">
                <div class="flex items-center space-x-4">
                    <h1 class="text-xl font-bold">PTC System</h1>
                    <span class="text-sm opacity-75" id="user-info"></span>
                </div>
                <div class="flex items-center space-x-4">
                    <button onclick="showProfile()" class="hover:bg-white hover:bg-opacity-20 px-3 py-2 rounded">
                        <i class="fas fa-user mr-2"></i>Profile
                    </button>
                    <button onclick="logout()" class="hover:bg-white hover:bg-opacity-20 px-3 py-2 rounded">
                        <i class="fas fa-sign-out-alt mr-2"></i>Logout
                    </button>
                </div>
            </div>
        </div>
    </nav>

    <!-- Main Content -->
    <div class="container mx-auto px-4 py-8" id="app-content">
        <!-- Login Form (shown when not authenticated) -->
        <div id="login-form" class="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
            <div class="text-center mb-6">
                <h2 class="text-2xl font-bold text-gray-800">PTC Election System</h2>
                <p class="text-gray-600 mt-2">Please sign in to continue</p>
            </div>
            
            <form onsubmit="login(event)">
                <div class="mb-4">
                    <label class="block text-gray-700 text-sm font-bold mb-2">Email or Phone</label>
                    <input type="text" id="login-identifier" required
                           class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                           placeholder="Enter email or phone number">
                </div>
                
                <div class="mb-6">
                    <label class="block text-gray-700 text-sm font-bold mb-2">Password</label>
                    <input type="password" id="login-password" required
                           class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                           placeholder="Enter password">
                </div>
                
                <button type="submit" id="login-btn"
                        class="w-full ptc-gradient text-white font-bold py-2 px-4 rounded hover:opacity-90">
                    <i class="fas fa-sign-in-alt mr-2"></i>Sign In
                </button>
            </form>
            
            <div id="login-error" class="mt-4 text-red-600 text-sm hidden"></div>
            
            <div class="mt-6 text-center text-sm text-gray-600">
                <p>Default Admin: admin@ptcsystem.com / admin123!</p>
            </div>
        </div>

        <!-- Dashboard (shown when authenticated) -->
        <div id="dashboard" class="hidden">
            <div class="mb-8">
                <h1 class="text-3xl font-bold text-gray-800">Election Management Dashboard</h1>
                <p class="text-gray-600 mt-2">Welcome to the Parallel Tally Center System</p>
            </div>

            <!-- Dashboard Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div class="bg-white rounded-lg shadow p-6 card-hover">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-600 text-sm">Total Results</p>
                            <p class="text-2xl font-bold text-blue-600" id="total-results">0</p>
                        </div>
                        <i class="fas fa-chart-bar text-3xl text-blue-600"></i>
                    </div>
                </div>

                <div class="bg-white rounded-lg shadow p-6 card-hover">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-600 text-sm">Verified Results</p>
                            <p class="text-2xl font-bold text-green-600" id="verified-results">0</p>
                        </div>
                        <i class="fas fa-check-circle text-3xl text-green-600"></i>
                    </div>
                </div>

                <div class="bg-white rounded-lg shadow p-6 card-hover">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-600 text-sm">Pending Results</p>
                            <p class="text-2xl font-bold text-yellow-600" id="pending-results">0</p>
                        </div>
                        <i class="fas fa-clock text-3xl text-yellow-600"></i>
                    </div>
                </div>

                <div class="bg-white rounded-lg shadow p-6 card-hover">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-gray-600 text-sm">Active Agents</p>
                            <p class="text-2xl font-bold text-purple-600" id="active-agents">0</p>
                        </div>
                        <i class="fas fa-users text-3xl text-purple-600"></i>
                    </div>
                </div>
            </div>

            <!-- Navigation to Advanced Dashboard -->
            <div class="mb-8">
                <div class="bg-white rounded-lg shadow p-6">
                    <h2 class="text-xl font-bold mb-4">Advanced Features</h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <a href="views/dashboard.php" target="_blank" 
                           class="flex items-center p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                            <i class="fas fa-chart-line text-2xl text-blue-600 mr-4"></i>
                            <div>
                                <h3 class="font-semibold text-blue-900">Advanced Analytics</h3>
                                <p class="text-sm text-blue-700">Real-time charts and OCR processing</p>
                            </div>
                        </a>
                        
                        <div class="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg">
                            <i class="fas fa-eye text-2xl text-green-600 mr-4"></i>
                            <div>
                                <h3 class="font-semibold text-green-900">OCR Analysis</h3>
                                <p class="text-sm text-green-700">Extract text from election documents</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Admin Features -->
            <div id="admin-section" class="hidden">
                <div class="bg-white rounded-lg shadow p-6">
                    <h2 class="text-xl font-bold mb-4">API & Integration Settings</h2>
                    
                    <!-- USSD Providers -->
                    <div class="mb-6">
                        <h3 class="text-lg font-semibold mb-3 flex items-center">
                            <i class="fas fa-mobile-alt mr-2 text-blue-600"></i>
                            USSD Providers
                        </h3>
                        <div id="ussd-providers" class="space-y-3">
                            <!-- Dynamic content loaded here -->
                        </div>
                    </div>

                    <!-- WhatsApp Providers -->
                    <div class="mb-6">
                        <h3 class="text-lg font-semibold mb-3 flex items-center">
                            <i class="fab fa-whatsapp mr-2 text-green-600"></i>
                            WhatsApp Providers
                        </h3>
                        <div id="whatsapp-providers" class="space-y-3">
                            <!-- Dynamic content loaded here -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- JavaScript -->
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
    <script src="assets/js/app.js"></script>
</body>
</html>