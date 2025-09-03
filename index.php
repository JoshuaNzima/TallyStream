<?php
/**
 * PTC System - PHP Wrapper for Hostinger Shared Hosting
 * This file serves the React build and proxies API requests to Node.js backend
 */

// Configuration
$NODEJS_BACKEND_URL = 'http://localhost:3000'; // Your Node.js backend URL
$BUILD_DIR = __DIR__ . '/dist';

// Get the requested path
$requestUri = $_SERVER['REQUEST_URI'];
$requestPath = parse_url($requestUri, PHP_URL_PATH);

// Handle API requests - proxy to Node.js backend
if (strpos($requestPath, '/api/') === 0) {
    proxyToNodeJS($requestPath, $NODEJS_BACKEND_URL);
    exit;
}

// Handle static files from React build
if (preg_match('/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)$/', $requestPath)) {
    serveStaticFile($requestPath, $BUILD_DIR);
    exit;
}

// Serve index.html for all other requests (React Router)
serveReactApp($BUILD_DIR);

function proxyToNodeJS($path, $backendUrl) {
    $url = $backendUrl . $path;
    if (!empty($_SERVER['QUERY_STRING'])) {
        $url .= '?' . $_SERVER['QUERY_STRING'];
    }
    
    $options = [
        'http' => [
            'method' => $_SERVER['REQUEST_METHOD'],
            'header' => getProxyHeaders(),
            'content' => file_get_contents('php://input')
        ]
    ];
    
    $context = stream_context_create($options);
    $response = @file_get_contents($url, false, $context);
    
    if ($response === false) {
        http_response_code(502);
        echo json_encode(['error' => 'Backend service unavailable']);
        return;
    }
    
    // Forward response headers
    if (isset($http_response_header)) {
        foreach ($http_response_header as $header) {
            if (strpos($header, 'HTTP/') === 0) {
                header($header);
            } elseif (!preg_match('/^(Transfer-Encoding|Connection):/i', $header)) {
                header($header);
            }
        }
    }
    
    echo $response;
}

function getProxyHeaders() {
    $headers = [];
    foreach ($_SERVER as $key => $value) {
        if (strpos($key, 'HTTP_') === 0) {
            $headerName = str_replace('_', '-', substr($key, 5));
            $headers[] = $headerName . ': ' . $value;
        }
    }
    $headers[] = 'Content-Type: ' . ($_SERVER['CONTENT_TYPE'] ?? 'application/json');
    return implode("\r\n", $headers);
}

function serveStaticFile($path, $buildDir) {
    $filePath = $buildDir . $path;
    
    if (!file_exists($filePath) || !is_file($filePath)) {
        http_response_code(404);
        echo '404 - File not found';
        return;
    }
    
    $mimeType = getMimeType($filePath);
    header('Content-Type: ' . $mimeType);
    header('Cache-Control: public, max-age=31536000'); // 1 year cache for static assets
    
    readfile($filePath);
}

function serveReactApp($buildDir) {
    $indexPath = $buildDir . '/index.html';
    
    if (!file_exists($indexPath)) {
        http_response_code(500);
        echo 'Build files not found. Please run "npm run build" first.';
        return;
    }
    
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    
    readfile($indexPath);
}

function getMimeType($filePath) {
    $extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
    
    $mimeTypes = [
        'html' => 'text/html',
        'css' => 'text/css',
        'js' => 'application/javascript',
        'json' => 'application/json',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif' => 'image/gif',
        'svg' => 'image/svg+xml',
        'ico' => 'image/x-icon',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
        'ttf' => 'font/ttf',
        'eot' => 'application/vnd.ms-fontobject'
    ];
    
    return $mimeTypes[$extension] ?? 'application/octet-stream';
}
?>