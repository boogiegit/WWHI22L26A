<?php
declare(strict_types=1);
require __DIR__ . '/server/bootstrap.php';
require __DIR__ . '/server/onward.php';
require __DIR__ . '/server/resource-preview.php';

$getActions = ['session', 'get', 'list', 'analyticsSummary', 'privateFile'];
$postActions = ['login', 'logout', 'lockAdmin', 'set', 'delete', 'uploadPhoto', 'trackAnalytics', 'photoFeedback', 'resourcePreview'];
if (!in_array($action, $method === 'GET' ? $getActions : $postActions, true)) {
    respond(['error' => 'Unknown action or method.'], 405);
}
if ($action === 'session') respond(sessionInfo());
if ($action === 'resourcePreview') {
    requireAdmin();
    limitRequests('resource-preview', 120, 3600);
    $url = $input['url'] ?? '';
    if (!is_string($url) || previewUrl($url) === '') respond(['error'=>'Use a public http/https link.'], 400);
    respond(['preview'=>resourcePreview($url)]);
}
if ($action === 'login') {
    $role = $input['role'] ?? '';
    if ($role !== 'admin' || !is_string($input['password'] ?? null)
        || strlen($input['password']) > 1024) respond(['error' => 'Invalid sign-in request.'], 400);
    limitRequests('login:' . $role, 8, 900);
    if (!password_verify($input['password'], $config[$role . '_password_hash'])) {
        respond(['error' => 'Sign-in failed.'], 401);
    }
    // Clear failed-attempt budget after successful administrator authentication.
    $db->prepare('DELETE FROM rate_limits WHERE bucket=?')->execute([
        hash('sha256', 'login:' . $role . ':' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'))
    ]);
    session_regenerate_id(true);
    $_SESSION['role'] = $role;
    $_SESSION['owner'] ??= bin2hex(random_bytes(24));
    $_SESSION['expires'] = time() + min(86400, max(900, (int)($config['session_seconds'] ?? 43200)));
    $_SESSION['version'] = (string)($config['session_version'] ?? '1');
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
    respond(sessionInfo());
}
if ($action === 'logout') {
    $_SESSION = [];
    session_destroy();
    setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => $basePath,
        'secure' => !$localHttp, 'httponly' => true, 'samesite' => 'Strict']);
    respond(['ok' => true]);
}
if ($action === 'lockAdmin') {
    requireAdmin();
    session_regenerate_id(true);
    unset($_SESSION['role']);
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
    respond(sessionInfo());
}
if ($action === 'privateFile') {
    requireAdmin();
    $path = $_GET['path'] ?? '';
    if (!is_string($path) || str_contains($path, '..') || str_contains($path, '\\') || str_contains($path, "\0")
        || !preg_match('~^(?:(?:seating-plans|venice-passes|uploads/photos|colosseum-tickets|pantheon-tickets)/[^?]+|(?:moulin-rouge-)?menu-choices\.json|tour-data\.(?:json|js))$~D', $path)) {
        respond(['error' => 'File denied.'], 403);
    }
    $file = realpath(__DIR__ . '/' . $path);
    $types = ['pdf' => 'application/pdf', 'json' => 'application/json', 'js' => 'text/javascript',
        'png' => 'image/png', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'webp' => 'image/webp'];
    $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    if (!$file || !is_file($file) || !str_starts_with($file, __DIR__ . '/')
        || substr($file, strlen(__DIR__) + 1) !== $path || !isset($types[$extension])) {
        respond(['error' => 'File unavailable.'], 404);
    }
    if (str_starts_with($path, 'uploads/photos/') && !registeredPhotoPath($path)) {
        respond(['error' => 'Photo must be uploaded through the image processor.'], 404);
    }
    session_write_close();
    header('Content-Type: ' . $types[$extension]);
    header('Content-Length: ' . filesize($file));
    readfile($file);
    exit;
}
if ($action === 'uploadPhoto') {
    requireAdmin();
    if (empty($config['uploads_enabled'])) respond(['error' => 'Photo uploads are disabled.'], 403);
    limitRequests('upload', 40, 3600);
    $photo = $_FILES['photo'] ?? null;
    if (!$photo || ($photo['error'] ?? -1) !== UPLOAD_ERR_OK || !is_uploaded_file($photo['tmp_name'])) respond(['error' => 'Invalid photo upload.'], 400);
    if ($photo['size'] > 3000000) respond(['error' => 'Photo too large.'], 413);
    $info = @getimagesize($photo['tmp_name']);
    if (!$info || !in_array($info['mime'], ['image/jpeg', 'image/png', 'image/webp'], true)
        || $info[0] * $info[1] > 16000000 || $info[0] > 8000 || $info[1] > 8000) respond(['error' => 'Unsupported image.'], 415);
    if (!function_exists('imagecreatefromstring')) respond(['error' => 'Image processing is unavailable.'], 503);
    $image = @imagecreatefromstring(file_get_contents($photo['tmp_name']));
    if (!$image) respond(['error' => 'Invalid image.'], 415);
    ob_start();
    $encodedOk = imagejpeg($image, null, 85);
    $encoded = ob_get_clean();
    imagedestroy($image);
    if (!$encodedOk || !is_string($encoded) || $encoded === '') respond(['error' => 'Could not process image.'], 503);
    $encodedBytes = strlen($encoded);
    if ($encodedBytes > 3000000) respond(['error' => 'Processed photo too large.'], 413);
    $dir = __DIR__ . '/uploads/photos';
    if (!is_dir($dir)) mkdir($dir, 0700, true);
    // Serialize quota checks across upload sessions; GD re-encoding removes EXIF/GPS and appended payloads.
    $lock = fopen($privateDir . '/upload.lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX)) respond(['error' => 'Upload unavailable.'], 503);
    $used = array_sum(array_map('filesize', glob($dir . '/*') ?: []));
    $name = bin2hex(random_bytes(20)) . '.jpg';
    if ($used + $encodedBytes > (int)($config['upload_quota_bytes'] ?? 100000000)) respond(['error' => 'Photo storage limit reached.'], 413);
    $target = $dir . '/' . $name;
    $output = fopen($target, 'x');
    if (!$output) respond(['error' => 'Could not save image.'], 503);
    $written = fwrite($output, $encoded);
    fclose($output);
    if ($written !== $encodedBytes) {
        unlink($target); // Only the newly created, incomplete upload.
        respond(['error' => 'Could not save image.'], 503);
    }
    try {
        $db->prepare('INSERT INTO photo_uploads VALUES (?,?,?)')->execute([
            'uploads/photos/' . $name, $encodedBytes, hash('sha256', $encoded)
        ]);
    } catch (Throwable $error) {
        unlink($target); // Never leave an unregistered new upload after failure.
        throw $error;
    }
    flock($lock, LOCK_UN);
    fclose($lock);
    respond(['ok' => true, 'url' => './api.php?action=privateFile&path=' . rawurlencode('uploads/photos/' . $name)]);
}
if ($action === 'trackAnalytics') {
    if (empty($config['analytics_enabled'])) respond(['ok' => true]);
    $allowed = json_decode(file_get_contents(__DIR__ . '/config/analytics-events.json'), true, 512, JSON_THROW_ON_ERROR);
    $event = $input['event'] ?? '';
    if (!in_array($event, $allowed, true) || array_diff(array_keys($input), ['action', 'event'])) respond(['error' => 'Invalid analytics event.'], 400);
    limitRequests('analytics-ip', 20000, 3600);
    limitRequests('analytics:' . $_SESSION['owner'], 3600, 3600);
    if (in_array($event, ['open:load','open:resume','open:restore'], true)) {
        // Classify in memory; never persist a raw user agent, IP or identity.
        $ua = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 512);
        $device = preg_match('/iPhone/i', $ua) ? 'iPhone' : (preg_match('/iPad/i', $ua) ? 'iPad' : (preg_match('/Android/i', $ua) ? 'Android' : (preg_match('/Windows|Macintosh|Linux/i', $ua) ? 'Desktop' : 'Unknown')));
        // Only server GeoIP variables are trusted, never client country headers.
        $country = $_SERVER['GEOIP_COUNTRY_CODE'] ?? getenv('GEOIP_COUNTRY_CODE');
        if (!is_string($country) || !preg_match('/^[A-Z]{2}$/D', $country)) $country = 'Unknown';
        $prefix = ($_SESSION['role'] ?? null) === 'admin' ? 'admin:' : '';
        $dimension = $db->prepare('INSERT INTO analytics_breakdown VALUES (?,?,1) ON CONFLICT(day,label) DO UPDATE SET count=count+1');
        foreach (['device:' . $device, 'country:' . $country] as $label) $dimension->execute([gmdate('Y-m-d'), $prefix . $label]);
        $db->prepare('DELETE FROM analytics_breakdown WHERE day < ?')->execute([gmdate('Y-m-d', time() - 90 * 86400)]);
    }
    if (($_SESSION['role'] ?? null) === 'admin') $event = 'admin:' . $event;
    $stmt = $db->prepare('INSERT INTO analytics_counts VALUES (?,?,1) ON CONFLICT(day,event) DO UPDATE SET count=count+1');
    $stmt->execute([gmdate('Y-m-d'), $event]);
    $db->prepare('DELETE FROM analytics_counts WHERE day < ?')->execute([gmdate('Y-m-d', time() - 90 * 86400)]);
    respond(['ok' => true]);
}
if ($action === 'analyticsSummary') {
    requireAdmin();
    $rows = $db->query('SELECT event AS label, SUM(count) AS count FROM analytics_counts GROUP BY event ORDER BY count DESC')->fetchAll(PDO::FETCH_ASSOC);
    // Count saved forms, not submission clicks: updates replace the same record.
    // Only aggregate numbers leave this endpoint; guest details stay in protected storage.
    $onwardPeople = 0;
    $onward = ['total' => 0, 'flying' => 0, 'eurostar' => 0, 'staying' => 0];
    $forms = $db->prepare('SELECT value FROM storage WHERE substr(key,1,?)=?');
    foreach (array_unique($config['storage_slugs'] ?? []) as $slug) {
        $prefix = 'tour:' . $slug . ':shared:tool:onward:';
        $forms->execute([strlen($prefix), $prefix]);
        foreach ($forms as $form) {
            $record = json_decode($form['value'], true);
            if (!is_array($record) || !is_string($record['name'] ?? null) || trim($record['name']) === '') continue;
            $plan = $record['plan'] ?? null;
            if (!in_array($plan, ['flying', 'eurostar', 'staying'], true)) continue;
            $onward[$plan]++;
            $onward['total']++;
            $onwardPeople += ($record['partySize'] ?? 1) === 2 ? 2 : 1;
        }
    }
    $breakdown = $db->query('SELECT label, SUM(count) AS count FROM analytics_breakdown GROUP BY label ORDER BY count DESC')->fetchAll(PDO::FETCH_ASSOC);
    respond(['enabled' => !empty($config['analytics_enabled']), 'events' => $rows, 'onward' => $onward, 'onwardPeople' => $onwardPeople, 'breakdown' => $breakdown]);
}
if ($action === 'photoFeedback') {
    requireAdmin();
    limitRequests('feedback', 100, 3600);
    $key = (string)($input['key'] ?? '');
    $suffix = storageSuffix($key);
    if (!str_starts_with($suffix, 'tool:photo-meta:photo:')) respond(['error' => 'Invalid photo.'], 400);
    $photoKey = str_replace(':tool:photo-meta:', ':tool:', $key);
    $check = $db->prepare('SELECT 1 FROM storage WHERE key=?');
    $check->execute([$photoKey]);
    if (!$check->fetchColumn()) respond(['error' => 'Photo unavailable.'], 404);
    $reaction = $input['reaction'] ?? '';
    $text = $input['text'] ?? '';
    $name = $input['name'] ?? 'Guest';
    if ($reaction !== '' && !in_array($reaction, ['❤️', '👏', '😂', '😍', '👍'], true)) respond(['error' => 'Invalid reaction.'], 400);
    if (!is_string($text) || !is_string($name) || strlen($text) > 2000 || strlen($name) > 120
        || ($reaction === '' && trim($text) === '')) respond(['error' => 'Invalid comment.'], 400);
    if (containsInlineData($text) || containsInlineData($name)) respond(['error' => 'Inline images are not accepted in comments.'], 400);
    $db->exec('BEGIN IMMEDIATE');
    try {
        $stmt = $db->prepare('SELECT value FROM storage WHERE key=?');
        $stmt->execute([$key]);
        $meta = json_decode($stmt->fetchColumn() ?: '{}', true) ?: [];
        $meta['reactions'] ??= [];
        $meta['comments'] ??= [];
        if ($reaction !== '') $meta['reactions'][$reaction] = (int)($meta['reactions'][$reaction] ?? 0) + 1;
        else {
            $meta['comments'][] = ['name' => $name, 'text' => $text, 'ts' => time() * 1000];
            $meta['comments'] = array_slice($meta['comments'], -100);
        }
        $stmt = $db->prepare('INSERT INTO storage VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
        $stmt->execute([$key, json_encode($meta), 'server-feedback']);
        $db->exec('COMMIT');
    } catch (Throwable $e) { $db->exec('ROLLBACK'); throw $e; }
    respond(['ok' => true]);
}
if ($action === 'list') {
    $prefix = (string)($_GET['prefix'] ?? '');
    storageSuffix($prefix, true);
    $stmt = $db->prepare('SELECT key, owner FROM storage WHERE substr(key,1,?)=? ORDER BY key LIMIT 1000');
    $stmt->execute([strlen($prefix), $prefix]);
    $keys = [];
    foreach ($stmt as $row) if (readableRecord(storageSuffix($row['key']), $row['owner'])) $keys[] = $row['key'];
    respond(['keys' => $keys]);
}
$key = (string)($method === 'GET' ? ($_GET['key'] ?? '') : ($input['key'] ?? ''));
$suffix = storageSuffix($key);
$stmt = $db->prepare('SELECT value, owner FROM storage WHERE key=?');
$stmt->execute([$key]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if ($action === 'get') {
    if (!$row || !readableRecord($suffix, $row['owner'])) respond(['value' => null]);
    // Older inline-image records must be re-uploaded; never deliver their embedded bytes.
    if (containsInlineData($row['value']) || containsInlineData(json_decode($row['value'], true))) respond(['value' => null]);
    respond(['value' => $row['value']]);
}
limitRequests('storage-write', 300, 3600);
$isAdmin = ($_SESSION['role'] ?? null) === 'admin';
if (!$isAdmin && (!guestWritable($suffix) || ($row && !hash_equals($row['owner'], $_SESSION['owner'])))) {
    respond(['error' => 'You can only change your own shared submissions.'], 403);
}
if ($action === 'delete') {
    requireAdmin();
    $stmt = $db->prepare('DELETE FROM storage WHERE key=?');
    $stmt->execute([$key]);
    respond(['ok' => true]);
}
$value = $input['value'] ?? null;
if (!is_string($value) || strlen($value) > 1000000) respond(['error' => 'Invalid or oversized value.'], 413);
$record = json_decode($value, true);
// Applies to both roles and all storage keys, including nested image overrides.
if (containsInlineData($value) || containsInlineData($record)) {
    respond(['error' => 'Inline images are not accepted. Use the photo upload service.'], 400);
}
if (str_starts_with($suffix, 'tool:photo:')) {
    if (empty($config['uploads_enabled'])) respond(['error' => 'Photo sharing is disabled.'], 403);
    if (!is_array($record)) respond(['error' => 'Invalid submission.'], 400);
    foreach (['url', 'downloadUrl', 'thumbUrl'] as $field) {
        if (!validatedPhotoUrl($record[$field] ?? null)) {
            respond(['error' => 'Photo references must identify processed uploads.'], 400);
        }
    }
    // Store a fixed metadata schema, not arbitrary additional image payload fields.
    $record = ['id' => substr($suffix, strlen('tool:')), 'name' => 'Tour photo',
        'url' => $record['url'], 'downloadUrl' => $record['downloadUrl'], 'thumbUrl' => $record['thumbUrl'],
        'ts' => time() * 1000, 'lat' => null, 'lng' => null];
    $value = json_encode($record);
} elseif (str_starts_with($suffix, 'tool:onward:')) {
    $value = json_encode(validateOnwardRecord($record, $suffix), JSON_INVALID_UTF8_SUBSTITUTE);
} elseif (!$isAdmin && guestWritable($suffix)) {
    if (!is_array($record)) respond(['error' => 'Invalid submission.'], 400);
    if (strlen($value) > 20000) respond(['error' => 'Submission too large.'], 413);
    $record['sharedKey'] = substr($suffix, strlen('tool:'));
    $value = json_encode($record, JSON_INVALID_UTF8_SUBSTITUTE);
}
// Administrators can edit shared content across sessions. The guest UPSERT
// still enforces ownership atomically, including races to create the same key.
$stmt = $db->prepare('INSERT INTO storage(key,value,owner) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE storage.owner=excluded.owner OR ?=1');
$stmt->bindValue(1, $key, PDO::PARAM_STR);
$stmt->bindValue(2, $value, PDO::PARAM_STR);
$stmt->bindValue(3, $_SESSION['owner'], PDO::PARAM_STR);
$stmt->bindValue(4, (int)$isAdmin, PDO::PARAM_INT);
$stmt->execute();
if ($stmt->rowCount() === 0) respond(['error' => 'Record belongs to another session.'], 403);
respond(['ok' => true]);
