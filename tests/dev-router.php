<?php
// Local PHP development only. Mirrors the production private-path rules; never deploy tests/.
$root = dirname(__DIR__);
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/');
if (str_contains($path, '..') || str_contains($path, '\\') || str_contains($path, "\0")) {
    http_response_code(403); exit;
}
$path = ltrim($path, '/');
if ($path === '') $path = 'index.html';
if ($path === 'api.php') { require $root . '/api.php'; exit; }
if (preg_match('~^(?:(?:seating-plans|venice-passes|uploads)/|(?:colosseum-tickets|pantheon-tickets)/(?!index\.html$)|(?:moulin-rouge-)?menu-choices\.json$|tour-data\.(?:json|js)$)~', $path)) {
    $_GET = ['action' => 'privateFile', 'path' => $path];
    require $root . '/api.php'; exit;
}
if (preg_match('~(^|/)\.|^(?:data|server|tests|private|imports|exports|backups|logs|tmp|node_modules|vendor|dist|build|operational-data|guest-data|guest-lists|passenger-data|rooming-lists)/|\.local\.~i', $path)) {
    http_response_code(403); exit;
}
$types = ['html' => 'text/html', 'json' => 'application/json', 'js' => 'text/javascript', 'css' => 'text/css',
    'png' => 'image/png', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'ico' => 'image/x-icon', 'pdf' => 'application/pdf'];
$file = realpath($root . '/' . $path);
$type = $types[strtolower(pathinfo($path, PATHINFO_EXTENSION))] ?? null;
if (!$type || !$file || !is_file($file) || $file !== $root . '/' . $path) { http_response_code(404); exit; }
header('Content-Type: ' . $type);
header('Cache-Control: no-store');
header('Referrer-Policy: no-referrer');
header('X-Content-Type-Options: nosniff');
readfile($file);
