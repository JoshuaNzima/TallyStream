<?php
// USSD Providers API endpoint
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
    requireAuth();
    
    $stmt = $pdo->prepare("SELECT * FROM ussd_providers WHERE is_active = 1 ORDER BY name");
    $stmt->execute();
    $providers = $stmt->fetchAll();
    
    // Decode JSON configuration for each provider
    foreach ($providers as &$provider) {
        if ($provider['configuration']) {
            $provider['configuration'] = json_decode($provider['configuration'], true);
        }
    }
    
    jsonResponse($providers);
    
} catch (Exception $e) {
    error_log("USSD providers error: " . $e->getMessage());
    sendJsonError('Failed to fetch USSD providers', 500);
}
?>