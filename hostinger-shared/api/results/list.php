<?php
// Results list API endpoint
require_once '../../config/env.php';
require_once '../../config/database.php';
require_once '../../includes/auth.php';
require_once '../../includes/functions.php';

global $pdo;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

if (!isAuthenticated()) {
    sendJsonError('Unauthorized', 401);
}

try {
    $stmt = $pdo->prepare("
        SELECT 
            r.*,
            pc.name as polling_center_name,
            pc.code as polling_center_code,
            CONCAT(u.first_name, ' ', u.last_name) as submitted_by_name,
            CONCAT(v.first_name, ' ', v.last_name) as verified_by_name
        FROM results r
        LEFT JOIN polling_centers pc ON r.polling_center_id = pc.id
        LEFT JOIN users u ON r.submitted_by = u.id
        LEFT JOIN users v ON r.verified_by = v.id
        ORDER BY r.created_at DESC
    ");
    
    $stmt->execute();
    $results = $stmt->fetchAll();
    
    // Process vote data
    foreach ($results as &$result) {
        if ($result['presidential_votes']) {
            $result['presidential_votes'] = json_decode($result['presidential_votes'], true);
        }
        if ($result['mp_votes']) {
            $result['mp_votes'] = json_decode($result['mp_votes'], true);
        }
        if ($result['councilor_votes']) {
            $result['councilor_votes'] = json_decode($result['councilor_votes'], true);
        }
    }
    
    jsonResponse($results);
    
} catch (Exception $e) {
    error_log("Results list error: " . $e->getMessage());
    sendJsonError('Failed to fetch results', 500);
}
?>