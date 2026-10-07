<?php
declare(strict_types=1);

function previewUrl(string $url, string $base = ''): string {
    $url = trim(html_entity_decode($url, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
    if ($url === '' || strlen($url) > 4000 || preg_match('/[\x00-\x20\\\\]/', $url)) return '';
    if ($base !== '' && !preg_match('~^[a-z][a-z0-9+.-]*:~i', $url)) {
        $b = parse_url($base);
        $origin = ($b['scheme'] ?? 'https') . '://' . ($b['host'] ?? '');
        $url = str_starts_with($url, '//') ? ($b['scheme'] ?? 'https') . ':' . $url
            : $origin . (str_starts_with($url, '/') ? $url : rtrim(dirname($b['path'] ?? '/'), '/.') . '/' . $url);
    }
    $p = parse_url($url);
    if (!$p || !in_array(strtolower($p['scheme'] ?? ''), ['https','http'], true)
        || isset($p['user']) || isset($p['pass']) || isset($p['port'])
        || !preg_match('/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i', $p['host'] ?? '')
        || !str_contains($p['host'], '.') || filter_var($p['host'], FILTER_VALIDATE_IP)) return '';
    return $url;
}

function previewMetadata(string $html, string $url): array {
    $meta = [];
    preg_match_all('/<meta\b[^>]*>/i', $html, $tags);
    foreach ($tags[0] as $tag) {
        preg_match_all('/([\w:-]+)\s*=\s*(?:"([^"]*)"|\x27([^\x27]*)\x27|([^\s>]+))/', $tag, $attrs, PREG_SET_ORDER);
        $values = [];
        foreach ($attrs as $attr) $values[strtolower($attr[1])] = html_entity_decode(($attr[2] ?? '') !== '' ? $attr[2] : (($attr[3] ?? '') !== '' ? $attr[3] : ($attr[4] ?? '')), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $key = strtolower($values['property'] ?? $values['name'] ?? '');
        if (!isset($meta[$key]) && !empty($values['content'])) $meta[$key] = $values['content'];
    }
    preg_match('/<title\b[^>]*>(.*?)<\/title>/is', $html, $title);
    $text = static fn($s) => substr(trim(preg_replace('/\s+/', ' ', strip_tags(html_entity_decode($s, ENT_QUOTES | ENT_HTML5, 'UTF-8')))), 0, 500);
    return ['title'=>$text($meta['og:title'] ?? $meta['twitter:title'] ?? $title[1] ?? ''),
        'description'=>$text($meta['og:description'] ?? $meta['description'] ?? $meta['twitter:description'] ?? ''),
        'publisher'=>$text($meta['og:site_name'] ?? parse_url($url, PHP_URL_HOST)),
        'image'=>previewUrl($meta['og:image:secure_url'] ?? $meta['og:image'] ?? $meta['twitter:image'] ?? $meta['twitter:image:src'] ?? '', $url)];
}

function resourcePreview(string $url): array {
    if (!function_exists('curl_init')) return [];
    // Resolve and pin each hop to a public IPv4 address. Never forward cookies,
    // credentials or follow redirects to internal services.
    for ($hop = 0; $hop < 4; $hop++) {
        $url = previewUrl($url);
        if ($url === '') return [];
        $host = parse_url($url, PHP_URL_HOST);
        $ips = gethostbynamel($host) ?: [];
        if (!$ips) return [];
        foreach ($ips as $ip) if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 | FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) return [];
        $port = parse_url($url, PHP_URL_SCHEME) === 'https' ? 443 : 80;
        $body = ''; $location = ''; $bytes = 0;
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RESOLVE=>["$host:$port:" . $ips[0]], CURLOPT_PROXY=>'', CURLOPT_FOLLOWLOCATION=>false,
            CURLOPT_PROTOCOLS=>CURLPROTO_HTTP | CURLPROTO_HTTPS, CURLOPT_CONNECTTIMEOUT=>3, CURLOPT_TIMEOUT=>5,
            CURLOPT_USERAGENT=>'EuropeanWhirl-LinkPreview/1.0', CURLOPT_ENCODING=>'',
            CURLOPT_HEADERFUNCTION=>static function($ch, $line) use (&$location) { if (stripos($line, 'Location:') === 0) $location = trim(substr($line, 9)); return strlen($line); },
            CURLOPT_WRITEFUNCTION=>static function($ch, $chunk) use (&$body, &$bytes) { $bytes += strlen($chunk); if ($bytes > 1000000) return 0; $body .= $chunk; return strlen($chunk); }]);
        $ok = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $type = strtolower(curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: '');
        curl_close($ch);
        if ($status >= 300 && $status < 400 && $location !== '') { $url = previewUrl($location, $url); continue; }
        if ($ok === false || $status !== 200) return [];
        if (preg_match('~^image/(jpeg|png|webp|gif)\b~', $type)) return ['image'=>$url];
        if (!str_contains($type, 'text/html') && !str_contains($type, 'application/xhtml+xml')) return [];
        return previewMetadata($body, $url);
    }
    return [];
}
