<?php
// WhatsApp Providers API endpoint
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
    
    $stmt = $pdo->prepare("SELECT * FROM whatsapp_providers WHERE is_active = 1 ORDER BY is_primary DESC, name");
    $stmt->execute();
    $providers = $stmt->fetchAll();
    
    // Decode JSON configuration for each provider
    foreach ($providers as &$provider) {
        if ($provider['configuration']) {
            $provider['configuration'] = json_decode($provider['configuration'], true);
        }
        // Convert tinyint to boolean
        $provider['is_primary'] = (bool)$provider['is_primary'];
        $provider['is_active'] = (bool)$provider['is_active'];
    }
    
    jsonResponse($providers);
    
} catch (Exception $e) {
    error_log("WhatsApp providers error: " . $e->getMessage());
    sendJsonError('Failed to fetch WhatsApp providers', 500);
}
?>