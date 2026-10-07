<?php
// Copy to config.local.php (ignored). Never put plaintext passwords here.
return [
    'origin' => 'https://brendonbush.com', // Exact HTTPS origin, no path.
    'base_path' => '/WWHI22L26A/',
    'admin_password_hash' => '', // password_hash() output for a NEW strong password.
    'session_version' => '1', // Change to revoke all existing sessions after rotation.
    'session_seconds' => 43200,
    'allow_http_localhost' => false, // Development only; never enable on a live server.
    'tour_code' => 'WWHI22L26A',
    'storage_slugs' => ['WWHI22L26A', 'xmas-whirl-2026'],
    'whatsapp_community_url' => '', // Delivered only to administrators; never public.
    'tomtom_browser_key' => '', // Optional public, origin-restricted browser key.
    'analytics_enabled' => false,
    'uploads_enabled' => false, // Requires PHP GD; images are decoded and re-encoded.
    'upload_quota_bytes' => 100000000,
];
