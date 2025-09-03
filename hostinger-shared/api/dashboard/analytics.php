<?php
// Dashboard analytics API endpoint
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
    // Get basic statistics
    $stats = [];
    
    // Total polling centers
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM polling_centers WHERE is_active = 1");
    $stats['totalCenters'] = (int)$stmt->fetch()['count'];
    
    // Results received
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM results");
    $stats['resultsReceived'] = (int)$stmt->fetch()['count'];
    
    // Verified results
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM results WHERE status = 'verified'");
    $stats['verified'] = (int)$stmt->fetch()['count'];
    
    // Pending results
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM results WHERE status = 'pending'");
    $stats['pending'] = (int)$stmt->fetch()['count'];
    
    // Flagged results
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM results WHERE status = 'flagged'");
    $stats['flagged'] = (int)$stmt->fetch()['count'];
    
    // Active agents (users who logged in last 24 hours)
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM users WHERE last_login_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)");
    $stats['activeAgents'] = (int)$stmt->fetch()['count'];
    
    // Calculate rates
    $stats['completionRate'] = $stats['totalCenters'] > 0 ? ($stats['resultsReceived'] / $stats['totalCenters']) * 100 : 0;
    $stats['verificationRate'] = $stats['resultsReceived'] > 0 ? ($stats['verified'] / $stats['resultsReceived']) * 100 : 0;
    
    // Get submission trends (last 24 hours)
    $stmt = $pdo->query("
        SELECT 
            DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00') as hour,
            COUNT(*) as submissions,
            SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as verifications
        FROM results 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY hour
        ORDER BY hour
    ");
    $trends = $stmt->fetchAll();
    
    // Get top performing centers
    $stmt = $pdo->query("
        SELECT 
            pc.name,
            pc.code,
            COUNT(r.id) as submission_count,
            ROUND((COUNT(r.id) / pc.registered_voters) * 100, 1) as completion_rate
        FROM polling_centers pc
        LEFT JOIN results r ON pc.id = r.polling_center_id
        WHERE pc.is_active = 1 AND pc.registered_voters > 0
        GROUP BY pc.id
        ORDER BY completion_rate DESC
        LIMIT 10
    ");
    $topCenters = $stmt->fetchAll();
    
    // Get party performance data
    $stmt = $pdo->query("
        SELECT 
            pp.name as party,
            pp.abbreviation,
            pp.color,
            0 as presidential_votes,
            0 as mp_votes,
            0 as councilor_votes
        FROM political_parties pp
        WHERE pp.is_active = 1
        ORDER BY pp.name
    ");
    $partyPerformance = $stmt->fetchAll();
    
    // Calculate total votes and percentages for party performance
    $totalVotes = array_sum(array_column($partyPerformance, 'presidential_votes'));
    foreach ($partyPerformance as &$party) {
        $party['total_votes'] = $party['presidential_votes'] + $party['mp_votes'] + $party['councilor_votes'];
        $party['percentage'] = $totalVotes > 0 ? ($party['presidential_votes'] / $totalVotes) * 100 : 0;
    }
    
    // Get recent activity
    $stmt = $pdo->query("
        SELECT 
            al.action,
            al.entity_type,
            al.created_at,
            CONCAT(u.first_name, ' ', u.last_name) as user_name
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.created_at DESC
        LIMIT 20
    ");
    $recentActivity = $stmt->fetchAll();
    
    $response = [
        'stats' => $stats,
        'submissionTrends' => $trends,
        'topCenters' => $topCenters,
        'partyPerformance' => $partyPerformance,
        'recentActivity' => $recentActivity,
        'timestamp' => date('c')
    ];
    
    jsonResponse($response);
    
} catch (Exception $e) {
    error_log("Dashboard analytics error: " . $e->getMessage());
    sendJsonError('Failed to fetch analytics data', 500);
}
?>