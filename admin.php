<?php
header('Cache-Control: no-store');
header('Content-Type: text/html; charset=utf-8');
$html = file_get_contents(__DIR__ . '/app.html');
$html = preg_replace('~<link rel="manifest"[^>]*>~', '<link rel="manifest" href="./admin-manifest.json">', $html);
$html = preg_replace('~<title>.*?</title>~', '<title>Xmas Whirl Admin</title>', $html);
$html = preg_replace('~<meta name="apple-mobile-web-app-title"[^>]*>~', '<meta name="apple-mobile-web-app-title" content="Whirl Admin">', $html);
echo $html;
