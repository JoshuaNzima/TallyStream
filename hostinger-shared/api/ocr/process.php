<?php
// OCR processing API endpoint for existing files
require_once '../../config/env.php';
require_once '../../config/database.php';
require_once '../../includes/auth.php';
require_once '../../includes/functions.php';

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
    $input = getJsonInput();
    $file_id = $input['file_id'] ?? null;
    
    if (!$file_id) {
        sendJsonError('File ID is required');
    }
    
    // Get file information
    $stmt = $pdo->prepare("SELECT * FROM result_files WHERE id = ?");
    $stmt->execute([$file_id]);
    $file = $stmt->fetch();
    
    if (!$file) {
        sendJsonError('File not found', 404);
    }
    
    // Check if file is an image
    $image_types = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!in_array($file['mime_type'], $image_types)) {
        sendJsonError('OCR is only supported for image files');
    }
    
    // Process OCR
    $ocr_text = processOCRWithTesseract($file['file_path']);
    
    if ($ocr_text !== null) {
        // Update file record with OCR text
        $stmt = $pdo->prepare("
            UPDATE result_files 
            SET ocr_text = ?, ocr_processed_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$ocr_text, $file_id]);
        
        // Log activity
        logActivity($_SESSION['user_id'], 'ocr_process', 'result_file', $file_id, [
            'ocr_text_length' => strlen($ocr_text)
        ]);
        
        jsonResponse([
            'file_id' => $file_id,
            'ocr_text' => $ocr_text,
            'processed_at' => date('c')
        ]);
    } else {
        sendJsonError('OCR processing failed', 500);
    }
    
} catch (Exception $e) {
    error_log("OCR processing error: " . $e->getMessage());
    sendJsonError('OCR processing failed: ' . $e->getMessage(), 500);
}

function processOCRWithTesseract($file_path) {
    try {
        // Check if file exists
        if (!file_exists($file_path)) {
            throw new Exception("File not found: $file_path");
        }
        
        // Check if Tesseract is available
        $tesseract_path = '/usr/bin/tesseract';
        if (!file_exists($tesseract_path)) {
            // Try common alternative paths
            $alternative_paths = ['/usr/local/bin/tesseract', '/opt/bin/tesseract'];
            foreach ($alternative_paths as $path) {
                if (file_exists($path)) {
                    $tesseract_path = $path;
                    break;
                }
            }
            
            // If still not found, try system PATH
            if (!file_exists($tesseract_path)) {
                $tesseract_path = 'tesseract';
            }
        }
        
        // Create temporary output file
        $output_file = tempnam(sys_get_temp_dir(), 'ocr_');
        
        // Prepare command with better OCR parameters
        $command = sprintf(
            '%s %s %s -l eng --psm 6 --oem 3 2>&1',
            escapeshellcmd($tesseract_path),
            escapeshellarg($file_path),
            escapeshellarg($output_file)
        );
        
        // Execute OCR command
        exec($command, $output, $return_code);
        
        if ($return_code === 0 && file_exists($output_file . '.txt')) {
            $ocr_text = file_get_contents($output_file . '.txt');
            unlink($output_file . '.txt'); // Clean up
            
            // Clean and improve OCR text
            $ocr_text = cleanOCRText($ocr_text);
            
            return $ocr_text;
        } else {
            error_log("Tesseract OCR failed: " . implode("\n", $output));
            return null;
        }
        
    } catch (Exception $e) {
        error_log("OCR processing error: " . $e->getMessage());
        return null;
    }
}

function cleanOCRText($text) {
    // Remove extra whitespace and clean up common OCR artifacts
    $text = trim($text);
    $text = preg_replace('/\s+/', ' ', $text); // Multiple spaces to single space
    $text = preg_replace('/[^\w\s\-.,;:!?()\/]/', '', $text); // Remove special chars except common punctuation
    
    // Try to identify election-related data patterns
    $patterns = [
        'candidate' => '/candidate\s*[:\-]?\s*([a-zA-Z\s]+)/i',
        'votes' => '/votes?\s*[:\-]?\s*(\d+)/i',
        'party' => '/party\s*[:\-]?\s*([a-zA-Z\s]+)/i',
        'total' => '/total\s*[:\-]?\s*(\d+)/i'
    ];
    
    $extracted_data = [];
    foreach ($patterns as $type => $pattern) {
        if (preg_match_all($pattern, $text, $matches)) {
            $extracted_data[$type] = $matches[1];
        }
    }
    
    // Add structured data as JSON comment if patterns found
    if (!empty($extracted_data)) {
        $text .= "\n\n<!-- OCR Extracted Data: " . json_encode($extracted_data) . " -->";
    }
    
    return $text;
}
?>