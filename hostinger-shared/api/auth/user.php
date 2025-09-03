<?php
// Get current user API endpoint
require_once '../../config/env.php';
require_once '../../config/database.php';
require_once '../../includes/auth.php';
require_once '../../includes/functions.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonError('Method not allowed', 405);
}

try {
    $user = getCurrentUser();
    
    if ($user) {
        jsonResponse($user);
    } else {
        sendJsonError('Unauthorized', 401);
    }
    
} catch (Exception $e) {
    error_log("Get user error: " . $e->getMessage());
    sendJsonError('An error occurred', 500);
}
?>