<?php
// Environment configuration loader for PTC System
class EnvLoader {
    private static $loaded = false;
    private static $config = [];

    public static function load($file = '.env') {
        if (self::$loaded) {
            return self::$config;
        }

        $envFile = __DIR__ . '/../' . $file;
        
        if (!file_exists($envFile)) {
            throw new Exception("Environment file not found: $file");
        }

        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        
        foreach ($lines as $line) {
            // Skip comments and empty lines
            if (strpos(trim($line), '#') === 0 || empty(trim($line))) {
                continue;
            }

            // Parse key=value pairs
            if (strpos($line, '=') !== false) {
                list($key, $value) = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value);
                
                // Remove quotes if present
                $value = trim($value, '"\'');
                
                // Set environment variable
                $_ENV[$key] = $value;
                putenv("$key=$value");
                
                // Store in config array
                self::$config[$key] = $value;
            }
        }
        
        self::$loaded = true;
        return self::$config;
    }

    public static function get($key, $default = null) {
        if (!self::$loaded) {
            self::load();
        }
        
        return $_ENV[$key] ?? $default;
    }

    public static function getBoolean($key, $default = false) {
        $value = self::get($key, $default);
        
        if (is_bool($value)) {
            return $value;
        }
        
        return in_array(strtolower($value), ['true', '1', 'yes', 'on']);
    }

    public static function getInt($key, $default = 0) {
        return (int) self::get($key, $default);
    }

    public static function getArray($key, $default = []) {
        $value = self::get($key, '');
        
        if (empty($value)) {
            return $default;
        }
        
        return array_map('trim', explode(',', $value));
    }
}

// Load environment variables
try {
    EnvLoader::load();
    
    // Set PHP configuration based on environment
    if (EnvLoader::getBoolean('DEBUG_MODE', false)) {
        error_reporting(E_ALL);
        ini_set('display_errors', 1);
    } else {
        error_reporting(0);
        ini_set('display_errors', 0);
    }
    
    // Set timezone
    $timezone = EnvLoader::get('APP_TIMEZONE', 'UTC');
    date_default_timezone_set($timezone);
    
    // Configure session
    $sessionTimeout = EnvLoader::getInt('SESSION_TIMEOUT', 120) * 60; // Convert to seconds
    ini_set('session.gc_maxlifetime', $sessionTimeout);
    ini_set('session.cookie_lifetime', $sessionTimeout);
    
    // Configure file uploads
    $maxFileSize = EnvLoader::getInt('MAX_FILE_SIZE', 10485760); // 10MB default
    ini_set('upload_max_filesize', $maxFileSize);
    ini_set('post_max_size', $maxFileSize * 2);
    
} catch (Exception $e) {
    die("Environment configuration error: " . $e->getMessage());
}

// Define database constants from environment
define('DB_HOST', EnvLoader::get('DB_HOST', 'localhost'));
define('DB_NAME', EnvLoader::get('DB_NAME'));
define('DB_USER', EnvLoader::get('DB_USER'));
define('DB_PASS', EnvLoader::get('DB_PASS'));
define('DB_CHARSET', EnvLoader::get('DB_CHARSET', 'utf8mb4'));

// Define application constants
define('APP_ENV', EnvLoader::get('APP_ENV', 'production'));
define('APP_URL', EnvLoader::get('APP_URL', 'http://localhost'));
define('APP_NAME', EnvLoader::get('APP_NAME', 'PTC Election System'));
define('DEBUG_MODE', EnvLoader::getBoolean('DEBUG_MODE', false));
define('UPLOAD_DIR', EnvLoader::get('UPLOAD_DIR', 'uploads') . '/');

// Validate required environment variables
$required = ['DB_NAME', 'DB_USER', 'DB_PASS'];
$missing = [];

foreach ($required as $var) {
    if (empty(EnvLoader::get($var))) {
        $missing[] = $var;
    }
}

if (!empty($missing)) {
    die("Missing required environment variables: " . implode(', ', $missing));
}
?>