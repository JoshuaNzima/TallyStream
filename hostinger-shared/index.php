<?php
// PTC Election Management System - Hostinger Shared Hosting Version

// Load environment configuration first
require_once 'config/env.php';

// Start session with secure configuration
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.cookie_secure', EnvLoader::getBoolean('FORCE_HTTPS', true));
session_start();

// Include required files
require_once 'config/database.php';
require_once 'includes/auth.php';
require_once 'includes/functions.php';

// Get the requested route
$request = $_GET['route'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

// Handle API routes
if (strpos($request, 'api/') === 0) {
    header('Content-Type: application/json');
    
    // Remove 'api/' prefix
    $apiRoute = substr($request, 4);
    
    switch ($apiRoute) {
        case 'auth/login':
            if ($method === 'POST') {
                require_once 'api/auth/login.php';
            }
            break;
            
        case 'auth/user':
            if ($method === 'GET') {
                require_once 'api/auth/user.php';
            }
            break;
            
        case 'auth/logout':
            if ($method === 'POST') {
                require_once 'api/auth/logout.php';
            }
            break;
            
        case 'candidates':
            if ($method === 'GET') {
                require_once 'api/candidates/list.php';
            } elseif ($method === 'POST') {
                require_once 'api/candidates/create.php';
            }
            break;
            
        case 'polling-centers':
            if ($method === 'GET') {
                require_once 'api/polling-centers/list.php';
            } elseif ($method === 'POST') {
                require_once 'api/polling-centers/create.php';
            }
            break;
            
        case 'results':
            if ($method === 'GET') {
                require_once 'api/results/list.php';
            } elseif ($method === 'POST') {
                require_once 'api/results/create.php';
            }
            break;
            
        case 'ussd-providers':
            if ($method === 'GET') {
                require_once 'api/providers/ussd-list.php';
            }
            break;
            
        case 'whatsapp-providers':
            if ($method === 'GET') {
                require_once 'api/providers/whatsapp-list.php';
            }
            break;
            
        case 'dashboard/analytics':
            if ($method === 'GET') {
                require_once 'api/dashboard/analytics.php';
            }
            break;
            
        case 'files/upload':
            if ($method === 'POST') {
                require_once 'api/files/upload.php';
            }
            break;
            
        case 'ocr/process':
            if ($method === 'POST') {
                require_once 'api/ocr/process.php';
            }
            break;
            
        default:
            http_response_code(404);
            echo json_encode(['error' => 'API endpoint not found']);
            break;
    }
} else {
    // Serve the main application
    require_once 'views/app.php';
}
?>