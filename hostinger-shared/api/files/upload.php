<?php
// File upload with OCR processing API endpoint
require_once '../../config/env.php';
require_once '../../config/database.php';
require_once '../../includes/auth.php';
require_once '../../includes/functions.php';

global $pdo;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if (!isAuthenticated()) {
    sendJsonError('Unauthorized', 401);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonError('Method not allowed', 405);
}

try {
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        sendJsonError('No file uploaded or upload error');
    }
    
    $file = $_FILES['file'];
    $result_id = $_POST['result_id'] ?? null;
    $enable_ocr = isset($_POST['enable_ocr']) && $_POST['enable_ocr'] === 'true';
    
    if (!$result_id) {
        sendJsonError('Result ID is required');
    }
    
    // Validate file type
    $allowed_types = ['jpg', 'jpeg', 'png', 'pdf'];
    $file_extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    
    if (!in_array($file_extension, $allowed_types)) {
        sendJsonError('File type not allowed. Allowed types: ' . implode(', ', $allowed_types));
    }
    
    // Upload file
    $file_path = uploadFile($file, $allowed_types);
    
    // Store file record in database
    $file_id = generateUUID();
    $stmt = $pdo->prepare("
        INSERT INTO result_files (id, result_id, file_path, file_name, file_size, mime_type, file_type, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    ");
    
    $file_type = in_array($file_extension, ['jpg', 'jpeg', 'png']) ? 'photo' : 'document';
    
    $stmt->execute([
        $file_id,
        $result_id,
        $file_path,
        $file['name'],
        $file['size'],
        $file['type'],
        $file_type
    ]);
    
    $response = [
        'id' => $file_id,
        'file_path' => $file_path,
        'file_name' => $file['name'],
        'file_size' => $file['size'],
        'mime_type' => $file['type'],
        'file_type' => $file_type
    ];
    
    // Process OCR if enabled and file is an image
    if ($enable_ocr && in_array($file_extension, ['jpg', 'jpeg', 'png'])) {
        $ocr_text = processOCRFile($file_path);
        if ($ocr_text) {
            $response['ocr_text'] = $ocr_text;
            
            // Update file record with OCR text
            $stmt = $pdo->prepare("
                UPDATE result_files 
                SET ocr_text = ? 
                WHERE id = ?
            ");
            $stmt->execute([$ocr_text, $file_id]);
        }
    }
    
    // Log activity
    logActivity($_SESSION['user_id'], 'file_upload', 'result_file', $file_id, [
        'file_name' => $file['name'],
        'result_id' => $result_id,
        'ocr_enabled' => $enable_ocr
    ]);
    
    jsonResponse($response);
    
} catch (Exception $e) {
    error_log("File upload error: " . $e->getMessage());
    sendJsonError('File upload failed: ' . $e->getMessage(), 500);
}

function processOCRFile($file_path) {
    try {
        // Check if Tesseract is available
        $tesseract_path = '/usr/bin/tesseract';
        if (!file_exists($tesseract_path)) {
            $tesseract_path = 'tesseract'; // Try system PATH
        }
        
        // Create temporary output file
        $output_file = tempnam(sys_get_temp_dir(), 'ocr_');
        
        // Run Tesseract OCR
        $command = escapeshellcmd($tesseract_path) . ' ' . 
                   escapeshellarg($file_path) . ' ' . 
                   escapeshellarg($output_file) . ' 2>&1';
        
        exec($command, $output, $return_code);
        
        if ($return_code === 0 && file_exists($output_file . '.txt')) {
            $ocr_text = file_get_contents($output_file . '.txt');
            unlink($output_file . '.txt'); // Clean up
            return trim($ocr_text);
        } else {
            error_log("OCR processing failed: " . implode("\n", $output));
            return null;
        }
        
    } catch (Exception $e) {
        error_log("OCR error: " . $e->getMessage());
        return null;
    }
}
?>