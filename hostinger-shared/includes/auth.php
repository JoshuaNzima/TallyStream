<?php
// Authentication functions

function isAuthenticated() {
    return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
}

function requireAuth() {
    if (!isAuthenticated()) {
        http_response_code(401);
        echo json_encode(['message' => 'Unauthorized']);
        exit;
    }
}

function requireRole($required_role) {
    requireAuth();
    
    if ($_SESSION['user_role'] !== $required_role && $_SESSION['user_role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['message' => 'Insufficient permissions']);
        exit;
    }
}

function login($email_or_phone, $password) {
    global $pdo;
    
    try {
        $stmt = $pdo->prepare("
            SELECT id, email, phone, first_name, last_name, password_hash, role, is_active
            FROM users 
            WHERE (email = ? OR phone = ?) AND is_active = 1
        ");
        $stmt->execute([$email_or_phone, $email_or_phone]);
        $user = $stmt->fetch();
        
        if ($user && password_verify($password, $user['password_hash'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_email'] = $user['email'];
            $_SESSION['user_role'] = $user['role'];
            $_SESSION['user_name'] = $user['first_name'] . ' ' . $user['last_name'];
            
            // Update last login
            $update_stmt = $pdo->prepare("UPDATE users SET last_login_at = NOW() WHERE id = ?");
            $update_stmt->execute([$user['id']]);
            
            return $user;
        }
        
        return false;
    } catch (Exception $e) {
        error_log("Login error: " . $e->getMessage());
        return false;
    }
}

function logout() {
    session_destroy();
    session_start();
}

function getCurrentUser() {
    global $pdo;
    
    if (!isAuthenticated()) {
        return null;
    }
    
    try {
        $stmt = $pdo->prepare("
            SELECT id, email, phone, first_name, last_name, role, is_active
            FROM users 
            WHERE id = ?
        ");
        $stmt->execute([$_SESSION['user_id']]);
        return $stmt->fetch();
    } catch (Exception $e) {
        error_log("Get current user error: " . $e->getMessage());
        return null;
    }
}

function hashPassword($password) {
    return password_hash($password, PASSWORD_BCRYPT);
}
?>