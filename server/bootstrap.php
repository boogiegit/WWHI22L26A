<?php
declare(strict_types=1);

function respond(array $data, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

header('Cache-Control: no-store, private, max-age=0');
header('Pragma: no-cache');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('X-Frame-Options: SAMEORIGIN');
ini_set('display_errors', '0');
set_exception_handler(static function (Throwable $error): void {
    // Do not echo exception text, paths, request contents or configuration.
    respond(['error' => 'Server unavailable. Check server configuration.'], 503);
});

$configPath = __DIR__ . '/config.local.php';
if (!is_file($configPath)) respond(['error' => 'Server configuration is required.'], 503);
$config = require $configPath;
if (!is_array($config)) respond(['error' => 'Invalid server configuration.'], 503);
$origin = rtrim((string)($config['origin'] ?? ''), '/');
$originParts = parse_url($origin);
$localHttp = !empty($config['allow_http_localhost'])
    && in_array($originParts['host'] ?? '', ['localhost', '127.0.0.1', '[::1]'], true)
    && in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true);
if (!$originParts || !empty($originParts['path']) || !empty($originParts['query'])
    || !empty($originParts['fragment']) || !empty($originParts['user'])
    || (!str_starts_with($origin, 'https://') && !$localHttp)) {
    respond(['error' => 'A valid HTTPS origin is required.'], 503);
}
$https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
if (!$https && !$localHttp) respond(['error' => 'HTTPS is required.'], 403);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (($requestOrigin !== '' && !hash_equals($origin, $requestOrigin))
    || ($method === 'POST' && !hash_equals($origin, $requestOrigin))
    || ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site') {
    respond(['error' => 'Cross-origin request denied.'], 403);
}
if (!in_array($method, ['GET', 'POST'], true)) respond(['error' => 'Method not allowed.'], 405);
if (empty(password_get_info((string)($config['admin_password_hash'] ?? ''))['algo'])) {
    respond(['error' => 'Administrator password must be configured.'], 503);
}
$basePath = (string)($config['base_path'] ?? '/WWHI22L26A/');
if (!preg_match('~^/(?:[A-Za-z0-9_-]+/)*$~D', $basePath)) respond(['error' => 'Invalid base path.'], 503);

umask(0077);
$privateDir = dirname(__DIR__) . '/.private';
if (!is_dir($privateDir . '/sessions') && !mkdir($privateDir . '/sessions', 0700, true)) {
    respond(['error' => 'Private runtime directory unavailable.'], 503);
}
ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
ini_set('session.gc_maxlifetime', (string)(int)($config['session_seconds'] ?? 43200));
session_save_path($privateDir . '/sessions');
session_name('tour_' . substr(hash('sha256', $basePath), 0, 12));
session_set_cookie_params(['lifetime' => 0, 'path' => $basePath, 'secure' => !$localHttp,
    'httponly' => true, 'samesite' => 'Strict']);
session_start();
if (($_SESSION['expires'] ?? PHP_INT_MAX) < time()
    || ($_SESSION['version'] ?? (string)($config['session_version'] ?? '1')) !== (string)($config['session_version'] ?? '1')) {
    $_SESSION = [];
    session_regenerate_id(true);
}
$_SESSION['csrf'] ??= bin2hex(random_bytes(32));
// Anonymous session ownership supports write-only submissions, never privileged reads.
$_SESSION['owner'] ??= bin2hex(random_bytes(24));

$input = [];
if ($method === 'POST') {
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 4000000) respond(['error' => 'Request too large.'], 413);
    if (str_starts_with($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data')) {
        $input = $_POST;
    } else {
        if (!str_starts_with($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')) respond(['error' => 'JSON required.'], 415);
        $raw = file_get_contents('php://input', false, null, 0, 1200001);
        if (strlen($raw) > 1200000) respond(['error' => 'Request too large.'], 413);
        $input = json_decode($raw, true);
        if (!is_array($input)) respond(['error' => 'Invalid JSON.'], 400);
    }
    if (!hash_equals($_SESSION['csrf'], (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? ''))) {
        respond(['error' => 'Session verification failed. Reload and sign in again.'], 403);
    }
}
$action = $method === 'POST' ? ($input['action'] ?? '') : ($_GET['action'] ?? '');
if (!is_string($action)) respond(['error' => 'Invalid action.'], 400);

// New runtime database: the recovered data/storage.db is never opened or migrated automatically.
$db = new PDO('sqlite:' . $privateDir . '/runtime.db', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$db->exec('PRAGMA busy_timeout=5000');
$db->exec('CREATE TABLE IF NOT EXISTS storage (key TEXT PRIMARY KEY, value TEXT NOT NULL, owner TEXT NOT NULL)');
$db->exec('CREATE TABLE IF NOT EXISTS rate_limits (bucket TEXT PRIMARY KEY, started INTEGER NOT NULL, attempts INTEGER NOT NULL)');
$db->exec('CREATE TABLE IF NOT EXISTS analytics_counts (day TEXT NOT NULL, event TEXT NOT NULL, count INTEGER NOT NULL, PRIMARY KEY(day,event))');
$db->exec('CREATE TABLE IF NOT EXISTS analytics_breakdown (day TEXT NOT NULL, label TEXT NOT NULL, count INTEGER NOT NULL, PRIMARY KEY(day,label))');
$db->exec('CREATE TABLE IF NOT EXISTS photo_uploads (path TEXT PRIMARY KEY, bytes INTEGER NOT NULL, sha256 TEXT NOT NULL)');

function containsInlineData($value): bool {
    // Browsers remove tabs and line breaks while parsing URL schemes.
    if (is_string($value)) return (bool)preg_match('/(?<![a-z0-9_])(?:data|blob)\s*:/i', str_replace(["\t", "\r", "\n"], '', $value));
    if (is_array($value)) {
        foreach ($value as $key => $item) {
            if (containsInlineData((string)$key) || containsInlineData($item)) return true;
        }
    }
    return false;
}

function registeredPhotoPath(string $path): bool {
    global $db;
    if (!preg_match('~^uploads/photos/[a-f0-9]{40}\.jpg$~D', $path)) return false;
    $file = dirname(__DIR__) . '/' . $path;
    if (!is_file($file) || realpath($file) !== $file) return false;
    $stmt = $db->prepare('SELECT bytes, sha256 FROM photo_uploads WHERE path=?');
    $stmt->execute([$path]);
    $upload = $stmt->fetch(PDO::FETCH_ASSOC);
    return $upload && (int)$upload['bytes'] === filesize($file)
        && hash_equals($upload['sha256'], hash_file('sha256', $file));
}

function validatedPhotoUrl($url): bool {
    if (!is_string($url) || !preg_match('~^\./api\.php\?action=privateFile&path=(uploads%2Fphotos%2F[a-f0-9]{40}\.jpg)$~D', $url, $match)) return false;
    return registeredPhotoPath(rawurldecode($match[1]));
}

function limitRequests(string $kind, int $maximum, int $seconds): void {
    global $db;
    // IP addresses are used only as short-lived hashed abuse-control buckets, not analytics.
    $bucket = hash('sha256', $kind . ':' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
    $now = time();
    $db->beginTransaction();
    try {
        $stmt = $db->prepare('INSERT INTO rate_limits VALUES (?, ?, 1) ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN started < ? THEN 1 ELSE attempts+1 END, started=CASE WHEN started < ? THEN excluded.started ELSE started END');
        $stmt->execute([$bucket, $now, $now - $seconds, $now - $seconds]);
        $stmt = $db->prepare('SELECT attempts FROM rate_limits WHERE bucket=?');
        $stmt->execute([$bucket]);
        $attempts = (int)$stmt->fetchColumn();
        $db->prepare('DELETE FROM rate_limits WHERE started < ?')->execute([$now - 86400]);
        $db->commit();
    } catch (Throwable $e) { $db->rollBack(); throw $e; }
    if ($attempts > $maximum) {
        header('Retry-After: ' . $seconds);
        respond(['error' => 'Too many requests. Try again later.'], 429);
    }
}

function requireAdmin(): void {
    if (($_SESSION['role'] ?? null) !== 'admin') respond(['error' => 'Administrator sign-in required.'], 401);
}
function sessionInfo(): array {
    global $config;
    $role = ($_SESSION['role'] ?? null) === 'admin' ? 'admin' : null;
    return ['role' => $role, 'csrfToken' => $_SESSION['csrf'], 'config' => [
        'whatsappCommunityUrl' => $role === 'admin' ? (string)($config['whatsapp_community_url'] ?? '') : '',
        'tomTomBrowserKey' => (string)($config['tomtom_browser_key'] ?? ''),
        'analyticsEnabled' => !empty($config['analytics_enabled']),
        'uploadsEnabled' => $role === 'admin' && !empty($config['uploads_enabled']),
    ]];
}
function storageSuffix(string $key, bool $prefix = false): string {
    global $config;
    if (!preg_match('/^[a-zA-Z0-9:_-]{1,200}$/D', $key)) respond(['error' => 'Invalid storage key.'], 400);
    foreach ($config['storage_slugs'] ?? [] as $slug) {
        $base = 'tour:' . $slug . ':shared:';
        if (str_starts_with($key, $base)) {
            $suffix = substr($key, strlen($base));
            if ($suffix !== '') return $suffix;
        }
    }
    respond(['error' => 'Storage namespace denied.'], 403);
}
function guestWritable(string $suffix): bool {
    // Anonymous guests can submit/update only their own validated onward form.
    return (bool)preg_match('/^tool:onward:.+$/D', $suffix);
}
function readableRecord(string $suffix, string $owner): bool {
    if (($_SESSION['role'] ?? null) === 'admin') return true;
    // Only director-published tour content is public. All operational records,
    // introductions, photo metadata and onward submissions remain admin-only.
    return (bool)preg_match('/^(?:admin-note:|admin-brief:|admin-day-content:|optional-content:|optional-image:|meeting-points:|day-resource-links:|city-guide-links:|host-content$)/', $suffix);
}
