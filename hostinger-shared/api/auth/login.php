<?php
// Login API endpoint
require_once '../../config/env.php';
require_once '../../config/database.php';
require_once '../../includes/auth.php';
require_once '../../includes/functions.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonError('Method not allowed', 405);
}

try {
    $input = getJsonInput();
    
    if (!$input) {
        sendJsonError('Invalid JSON input');
    }
    
    $identifier = $input['identifier'] ?? '';
    $password = $input['password'] ?? '';
    
    if (empty($identifier) || empty($password)) {
        sendJsonError('Email/phone and password are required');
    }
    
    // Rate limiting check
    $maxAttempts = EnvLoader::getInt('MAX_LOGIN_ATTEMPTS', 5);
    $lockoutDuration = EnvLoader::getInt('LOGIN_LOCKOUT_DURATION', 15);
    
    // TODO: Implement rate limiting logic here
    
    $user = login($identifier, $password);
    
    if ($user) {
        // Remove sensitive information
        unset($user['password_hash']);
        
        jsonResponse([
            'message' => 'Login successful',
            'user' => $user
        ]);
    } else {
        // Log failed login attempt
        error_log("Failed login attempt for: $identifier from IP: " . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
        
        sendJsonError('Invalid credentials', 401);
    }
    
} catch (Exception $e) {
    error_log("Login error: " . $e->getMessage());
    sendJsonError('An error occurred during login', 500);
}
?>