<?php
// Logout API endpoint
require_once '../../config/env.php';
require_once '../../includes/auth.php';
require_once '../../includes/functions.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonError('Method not allowed', 405);
}

try {
    logout();
    jsonResponse(['message' => 'Logout successful']);
    
} catch (Exception $e) {
    error_log("Logout error: " . $e->getMessage());
    sendJsonError('An error occurred during logout', 500);
}
?>