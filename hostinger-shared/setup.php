<?php
// PTC Election Management System - Installation Setup
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PTC System Setup</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        .ptc-gradient { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    </style>
</head>
<body class="bg-gray-100 min-h-screen py-8">
    <div class="container mx-auto px-4 max-w-4xl">
        <div class="bg-white rounded-lg shadow-lg overflow-hidden">
            <div class="ptc-gradient text-white p-6">
                <h1 class="text-3xl font-bold"><i class="fas fa-cogs mr-3"></i>PTC System Setup</h1>
                <p class="mt-2 opacity-90">Complete the installation of your Election Management System</p>
            </div>

            <div class="p-6">
                <?php
                $step = $_GET['step'] ?? 1;
                $error = '';
                $success = '';

                // Process form submissions
                if ($_POST) {
                    if (isset($_POST['test_db'])) {
                        // Test database connection
                        try {
                            $dsn = "mysql:host={$_POST['db_host']};dbname={$_POST['db_name']}";
                            $pdo = new PDO($dsn, $_POST['db_user'], $_POST['db_pass'], [
                                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
                            ]);
                            $success = "✅ Database connection successful!";
                        } catch (PDOException $e) {
                            $error = "❌ Database connection failed: " . $e->getMessage();
                        }
                    }
                    
                    if (isset($_POST['create_env'])) {
                        // Create .env file
                        $env_content = "# PTC Election Management System - Environment Configuration\n";
                        $env_content .= "DB_HOST={$_POST['db_host']}\n";
                        $env_content .= "DB_NAME={$_POST['db_name']}\n";
                        $env_content .= "DB_USER={$_POST['db_user']}\n";
                        $env_content .= "DB_PASS={$_POST['db_pass']}\n";
                        $env_content .= "APP_ENV=production\n";
                        $env_content .= "APP_URL={$_POST['app_url']}\n";
                        $env_content .= "APP_NAME=\"{$_POST['app_name']}\"\n";
                        $env_content .= "SESSION_SECRET=" . bin2hex(random_bytes(32)) . "\n";
                        $env_content .= "DEBUG_MODE=false\n";
                        $env_content .= "FORCE_HTTPS=true\n";
                        
                        if (file_put_contents('.env', $env_content)) {
                            $success = "✅ Environment file created successfully!";
                            $step = 2;
                        } else {
                            $error = "❌ Failed to create .env file. Check file permissions.";
                        }
                    }
                    
                    if (isset($_POST['setup_db'])) {
                        // Setup database
                        try {
                            require_once 'config/env.php';
                            require_once 'config/database.php';
                            
                            // Read and execute database setup
                            $sql = file_get_contents('sql/database_setup.sql');
                            $pdo->exec($sql);
                            
                            // Insert seed data
                            $seed_sql = file_get_contents('sql/seed_data.sql');
                            $pdo->exec($seed_sql);
                            
                            $success = "✅ Database setup completed successfully!";
                            $step = 3;
                        } catch (Exception $e) {
                            $error = "❌ Database setup failed: " . $e->getMessage();
                        }
                    }
                }
                ?>

                <?php if ($error): ?>
                    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                        <?php echo htmlspecialchars($error); ?>
                    </div>
                <?php endif; ?>

                <?php if ($success): ?>
                    <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
                        <?php echo htmlspecialchars($success); ?>
                    </div>
                <?php endif; ?>

                <!-- Step 1: Database Configuration -->
                <?php if ($step == 1): ?>
                    <div class="mb-8">
                        <h2 class="text-2xl font-bold text-gray-800 mb-4">
                            <span class="bg-blue-500 text-white rounded-full w-8 h-8 inline-flex items-center justify-center mr-3">1</span>
                            Database Configuration
                        </h2>
                        
                        <form method="POST" class="space-y-4">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-gray-700 font-bold mb-2">Database Host</label>
                                    <input type="text" name="db_host" value="localhost" required
                                           class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500">
                                </div>
                                <div>
                                    <label class="block text-gray-700 font-bold mb-2">Database Name</label>
                                    <input type="text" name="db_name" placeholder="your_database_name" required
                                           class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500">
                                </div>
                            </div>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-gray-700 font-bold mb-2">Database Username</label>
                                    <input type="text" name="db_user" placeholder="your_username" required
                                           class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500">
                                </div>
                                <div>
                                    <label class="block text-gray-700 font-bold mb-2">Database Password</label>
                                    <input type="password" name="db_pass" placeholder="your_password" required
                                           class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500">
                                </div>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-gray-700 font-bold mb-2">Application URL</label>
                                    <input type="url" name="app_url" value="https://<?php echo $_SERVER['HTTP_HOST'] ?? 'yourdomain.com'; ?>" required
                                           class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500">
                                </div>
                                <div>
                                    <label class="block text-gray-700 font-bold mb-2">Application Name</label>
                                    <input type="text" name="app_name" value="PTC Election Management System" required
                                           class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500">
                                </div>
                            </div>

                            <div class="flex space-x-4">
                                <button type="submit" name="test_db" 
                                        class="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded">
                                    <i class="fas fa-plug mr-2"></i>Test Connection
                                </button>
                                <button type="submit" name="create_env"
                                        class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                                    <i class="fas fa-cog mr-2"></i>Create Configuration
                                </button>
                            </div>
                        </form>
                    </div>

                <!-- Step 2: Database Setup -->
                <?php elseif ($step == 2): ?>
                    <div class="mb-8">
                        <h2 class="text-2xl font-bold text-gray-800 mb-4">
                            <span class="bg-blue-500 text-white rounded-full w-8 h-8 inline-flex items-center justify-center mr-3">2</span>
                            Database Setup
                        </h2>
                        
                        <div class="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                            <div class="flex">
                                <div class="flex-shrink-0">
                                    <i class="fas fa-info-circle text-blue-400"></i>
                                </div>
                                <div class="ml-3">
                                    <p class="text-sm text-blue-700">
                                        This will create all necessary database tables and insert sample data including a default admin user.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <form method="POST">
                            <button type="submit" name="setup_db"
                                    class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">
                                <i class="fas fa-database mr-2"></i>Setup Database
                            </button>
                        </form>
                    </div>

                <!-- Step 3: Completion -->
                <?php else: ?>
                    <div class="text-center">
                        <div class="mb-8">
                            <div class="mx-auto w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center mb-4">
                                <i class="fas fa-check text-2xl"></i>
                            </div>
                            <h2 class="text-2xl font-bold text-gray-800 mb-4">Setup Complete!</h2>
                            <p class="text-gray-600 mb-6">Your PTC Election Management System is ready to use.</p>
                        </div>

                        <div class="bg-gray-50 rounded-lg p-6 mb-6">
                            <h3 class="font-bold text-gray-800 mb-3">Default Admin Credentials:</h3>
                            <div class="text-left max-w-md mx-auto">
                                <p><strong>Email:</strong> admin@ptcsystem.com</p>
                                <p><strong>Password:</strong> admin123!</p>
                                <p class="text-sm text-red-600 mt-2">⚠️ Change these credentials immediately after first login!</p>
                            </div>
                        </div>

                        <div class="space-y-4">
                            <a href="index.php" 
                               class="inline-block bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded">
                                <i class="fas fa-sign-in-alt mr-2"></i>Access System
                            </a>
                            
                            <div class="text-sm text-gray-600">
                                <p>🔒 Remember to delete this setup.php file after installation for security!</p>
                            </div>
                        </div>
                    </div>
                <?php endif; ?>
            </div>
        </div>

        <!-- System Requirements -->
        <div class="mt-8 bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4">System Status</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div class="flex items-center justify-between">
                    <span>PHP Version (7.4+ required)</span>
                    <span class="<?php echo version_compare(PHP_VERSION, '7.4.0', '>=') ? 'text-green-600' : 'text-red-600'; ?>">
                        <?php echo PHP_VERSION; ?>
                        <i class="fas fa-<?php echo version_compare(PHP_VERSION, '7.4.0', '>=') ? 'check' : 'times'; ?> ml-1"></i>
                    </span>
                </div>
                
                <div class="flex items-center justify-between">
                    <span>PDO MySQL Extension</span>
                    <span class="<?php echo extension_loaded('pdo_mysql') ? 'text-green-600' : 'text-red-600'; ?>">
                        <?php echo extension_loaded('pdo_mysql') ? 'Available' : 'Missing'; ?>
                        <i class="fas fa-<?php echo extension_loaded('pdo_mysql') ? 'check' : 'times'; ?> ml-1"></i>
                    </span>
                </div>
                
                <div class="flex items-center justify-between">
                    <span>File Write Permissions</span>
                    <span class="<?php echo is_writable('.') ? 'text-green-600' : 'text-red-600'; ?>">
                        <?php echo is_writable('.') ? 'Writable' : 'Not Writable'; ?>
                        <i class="fas fa-<?php echo is_writable('.') ? 'check' : 'times'; ?> ml-1"></i>
                    </span>
                </div>
                
                <div class="flex items-center justify-between">
                    <span>JSON Extension</span>
                    <span class="<?php echo extension_loaded('json') ? 'text-green-600' : 'text-red-600'; ?>">
                        <?php echo extension_loaded('json') ? 'Available' : 'Missing'; ?>
                        <i class="fas fa-<?php echo extension_loaded('json') ? 'check' : 'times'; ?> ml-1"></i>
                    </span>
                </div>
            </div>
        </div>
    </div>
</body>
</html>