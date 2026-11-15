<?php
declare(strict_types=1);
// A separate broadcast store: guests cannot write announcements or read subscriptions.
function announcementSchema(): void {
    global $db;
    $db->exec('CREATE TABLE IF NOT EXISTS announcements (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, body TEXT NOT NULL, photo TEXT NOT NULL, created TEXT NOT NULL, request_id TEXT UNIQUE NOT NULL)');
    $db->exec('CREATE TABLE IF NOT EXISTS announcement_push (endpoint TEXT PRIMARY KEY, token TEXT NOT NULL, updated INTEGER NOT NULL, pending INTEGER NOT NULL DEFAULT 0, attempts INTEGER NOT NULL DEFAULT 0, next_try INTEGER NOT NULL DEFAULT 0)');
    $db->exec('CREATE TABLE IF NOT EXISTS announcement_keys (name TEXT PRIMARY KEY, value TEXT NOT NULL)');
}
function announcementBase64(string $value): string { return rtrim(strtr(base64_encode($value), '+/', '-_'), '='); }
function announcementPushReady(): bool { return function_exists('openssl_pkey_new') && function_exists('curl_multi_init'); }
function announcementKeys(): array {
    global $db;
    $value = $db->query("SELECT value FROM announcement_keys WHERE name='vapid'")->fetchColumn();
    if ($value) return json_decode($value, true, 8, JSON_THROW_ON_ERROR);
    $key = openssl_pkey_new(['private_key_type'=>OPENSSL_KEYTYPE_EC, 'curve_name'=>'prime256v1']);
    if (!$key || !openssl_pkey_export($key, $private)) throw new RuntimeException('Push key unavailable');
    $details = openssl_pkey_get_details($key);
    $keys = ['private'=>$private, 'public'=>announcementBase64("\x04" . $details['ec']['x'] . $details['ec']['y'])];
    // Concurrent first visitors must all receive the same winning key.
    $db->prepare('INSERT OR IGNORE INTO announcement_keys VALUES (?,?)')->execute(['vapid', json_encode($keys)]);
    return json_decode($db->query("SELECT value FROM announcement_keys WHERE name='vapid'")->fetchColumn(), true, 8, JSON_THROW_ON_ERROR);
}
function announcementEndpoint(string $endpoint): bool {
    if (strlen($endpoint)>2048 || preg_match('/[\x00-\x20\x7f]/', $endpoint)) return false;
    $p = parse_url($endpoint);
    if (!$p || ($p['scheme']??'')!=='https' || isset($p['user']) || isset($p['pass']) || isset($p['fragment']) || isset($p['query']) || isset($p['port'])) return false;
    $host = $p['host']??'';
    // Only browser push providers; no arbitrary URL fetching or redirects.
    return in_array($host, ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com'], true)
        && strlen($p['path']??'') > 5;
}
function announcementJwt(string $audience, array $keys): string {
    global $db, $origin;
    $name = 'jwt:' . $audience;
    $stmt=$db->prepare('SELECT value FROM announcement_keys WHERE name=?'); $stmt->execute([$name]);
    $cached=json_decode($stmt->fetchColumn() ?: '{}',true);
    if (($cached['until']??0)>time()) return $cached['jwt'];
    $unsigned=announcementBase64('{"typ":"JWT","alg":"ES256"}') . '.' . announcementBase64(json_encode(['aud'=>$audience,'exp'=>time()+43200,'sub'=>$origin]));
    if (!openssl_sign($unsigned,$der,$keys['private'],OPENSSL_ALGO_SHA256)) throw new RuntimeException('Push signing failed');
    // P-256 OpenSSL signatures use DER integers; JOSE requires exactly 32-byte R and S.
    if (ord($der[0])!==48 || ord($der[2])!==2) throw new RuntimeException('Invalid signature');
    $rlen=ord($der[3]); $r=substr($der,4,$rlen); $spos=4+$rlen;
    if (ord($der[$spos])!==2) throw new RuntimeException('Invalid signature');
    $s=substr($der,$spos+2,ord($der[$spos+1]));
    $raw=str_pad(ltrim($r,"\0"),32,"\0",STR_PAD_LEFT).str_pad(ltrim($s,"\0"),32,"\0",STR_PAD_LEFT);
    if(strlen($raw)!==64) throw new RuntimeException('Invalid signature');
    $jwt=$unsigned.'.'.announcementBase64($raw);
    $db->prepare('INSERT OR REPLACE INTO announcement_keys VALUES (?,?)')->execute([$name,json_encode(['until'=>time()+3600,'jwt'=>$jwt])]);
    return $jwt;
}
function announcementDelivery(): array {
    global $db;
    return ['devices'=>(int)$db->query('SELECT COUNT(*) FROM announcement_push')->fetchColumn(),
        'pending'=>(int)$db->query('SELECT COUNT(*) FROM announcement_push WHERE pending>0')->fetchColumn()];
}
function announcementSend(): array {
    global $db,$privateDir;
    if (!announcementPushReady()) return announcementDelivery();
    $lock=fopen($privateDir.'/announcement-push.lock','c');
    if (!$lock || !flock($lock,LOCK_EX|LOCK_NB)) { if($lock) fclose($lock); return announcementDelivery(); }
    try {
        $rows=$db->query('SELECT * FROM announcement_push WHERE pending>0 AND next_try<='.time().' LIMIT 100')->fetchAll(PDO::FETCH_ASSOC);
        if (!$rows) return announcementDelivery();
        $keys=announcementKeys(); $multi=curl_multi_init(); $handles=[];
        foreach($rows as $row) {
            if(!announcementEndpoint($row['endpoint'])) continue;
            $audience='https://'.parse_url($row['endpoint'],PHP_URL_HOST);
            $jwt=announcementJwt($audience,$keys);
            $ch=curl_init($row['endpoint']);
            curl_setopt_array($ch,[CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>'',CURLOPT_RETURNTRANSFER=>true,CURLOPT_FOLLOWLOCATION=>false,
                CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,CURLOPT_CONNECTTIMEOUT=>3,CURLOPT_TIMEOUT=>8,
                CURLOPT_HTTPHEADER=>['TTL: 86400','Urgency: normal','Topic: WWHI22L26A-announcement','Content-Length: 0','Authorization: vapid t='.$jwt.', k='.$keys['public']]]);
            curl_multi_add_handle($multi,$ch); $handles[]=[$ch,$row];
        }
        do { $status=curl_multi_exec($multi,$running); if($running) curl_multi_select($multi,0.25); } while($running && $status===CURLM_OK);
        foreach($handles as [$ch,$row]) {
            $code=curl_getinfo($ch,CURLINFO_HTTP_CODE);
            if(in_array($code,[404,410],true)) $db->prepare('DELETE FROM announcement_push WHERE endpoint=? AND pending=?')->execute([$row['endpoint'],$row['pending']]);
            elseif($code>=200 && $code<300) $db->prepare('UPDATE announcement_push SET pending=0,attempts=0 WHERE endpoint=? AND pending=?')->execute([$row['endpoint'],$row['pending']]);
            else $db->prepare('UPDATE announcement_push SET attempts=attempts+1,next_try=? WHERE endpoint=? AND pending=?')->execute([time()+min(3600,60*(2**min(6,(int)$row['attempts']))),$row['endpoint'],$row['pending']]);
            curl_multi_remove_handle($multi,$ch); curl_close($ch);
        }
        curl_multi_close($multi);
        return announcementDelivery();
    } finally { flock($lock,LOCK_UN); fclose($lock); }
}
function handleAnnouncements(string $action): void {
    global $db,$input;
    announcementSchema();
    announcementMediaSchema();
    if(in_array($action,['announcementMedia','announcementUploadMedia'],true)) handleAnnouncementMedia($action);
    if($action==='announcements') {
        $items=$db->query('SELECT id,title,body,created,photo,media FROM announcements ORDER BY id DESC LIMIT 100')->fetchAll(PDO::FETCH_ASSOC);
        foreach($items as &$item) { $item['id']=(int)$item['id']; $media=$db->prepare('SELECT mime FROM announcement_media WHERE id=?'); $media->execute([$item['media']]); $item['mediaType']=$media->fetchColumn()?:''; $item['media']=$item['media']!==''?'./api.php?action=announcementMedia&id='.$item['id']:''; $item['photo']=$item['photo']!==''?'./api.php?action=announcementPhoto&id='.$item['id']:''; } unset($item);
        $result=['items'=>$items,'pushAvailable'=>announcementPushReady()];
        if(($_SESSION['role']??'')==='admin') $result['delivery']=announcementDelivery();
        respond($result);
    }
    if($action==='announcementPhoto') {
        $stmt=$db->prepare('SELECT photo FROM announcements WHERE id=?'); $stmt->execute([(int)($_GET['id']??0)]);
        $path=$stmt->fetchColumn();
        if(!$path || !registeredPhotoPath($path)) respond(['error'=>'Photo unavailable.'],404);
        session_write_close(); header('Content-Type: image/jpeg'); readfile(dirname(__DIR__).'/'.$path); exit;
    }
    if($action==='announcementPushKey') {
        if(!announcementPushReady()) respond(['error'=>'Phone alerts are not available on this server yet.'],503);
        respond(['publicKey'=>announcementKeys()['public']]);
    }
    if($action==='announcementSubscribe') {
        limitRequests('announcement-subscribe',30,3600);
        $endpoint=$input['endpoint']??''; $token=$input['token']??'';
        if(!is_string($endpoint) || !announcementEndpoint($endpoint) || !is_string($token) || !preg_match('/^[a-f0-9]{64}$/D',$token)) respond(['error'=>'This browser’s notification service is not supported.'],400);
        $stmt=$db->prepare('SELECT token FROM announcement_push WHERE endpoint=?'); $stmt->execute([$endpoint]); $existing=$stmt->fetchColumn();
        if($existing && !hash_equals($existing,hash('sha256',$token))) respond(['error'=>'Turn alerts off, then enable them again.'],403);
        if(!$existing && (int)$db->query('SELECT COUNT(*) FROM announcement_push')->fetchColumn()>=300) respond(['error'=>'Notification device limit reached.'],429);
        $db->prepare('INSERT INTO announcement_push(endpoint,token,updated) VALUES (?,?,?) ON CONFLICT(endpoint) DO UPDATE SET updated=excluded.updated')->execute([$endpoint,hash('sha256',$token),time()]);
        respond(['ok'=>true]);
    }
    if($action==='announcementUnsubscribe') {
        $token=$input['token']??''; $endpoint=$input['endpoint']??'';
        if(!is_string($token)||!is_string($endpoint)) respond(['error'=>'Invalid request.'],400);
        $db->prepare('DELETE FROM announcement_push WHERE endpoint=? AND token=?')->execute([$endpoint,hash('sha256',$token)]);
        respond(['ok'=>true]);
    }
    requireAdmin();
    if($action==='announcementRetry') { limitRequests('announcement-retry',120,3600); respond(['delivery'=>announcementSend()]); }
    if($action==='announcementDelete') {
        $db->prepare('DELETE FROM announcements WHERE id=?')->execute([(int)($input['id']??0)]);
        $db->prepare('UPDATE announcement_push SET pending=0 WHERE pending=?')->execute([(int)($input['id']??0)]);
        respond(['ok'=>true]);
    }
    if($action==='announcementPublish') {
        $title=$input['title']??''; $body=$input['body']??''; $photo=$input['photo']??''; $request=$input['requestId']??'';
        if(!is_string($title)||!is_string($body)||!is_string($photo)||!is_string($request)||strlen($title)>480||strlen($body)>20000||!preg_match('/^[a-f0-9]{32}$/D',$request)) respond(['error'=>'Keep the heading under 120 and message under 5,000 characters.'],400);
        $media=$input['media']??'';
        if(!is_string($media))respond(['error'=>'Invalid media.'],400);
        if($media!==''){$check=$db->prepare('SELECT id FROM announcement_media WHERE id=?');$check->execute([$media]);if(!$check->fetchColumn())respond(['error'=>'Upload your clip again.'],400);}
        if(trim($body)==='' && $photo==='' && $media==='')respond(['error'=>'Write a message or add a photo or clip.'],400);
        if(trim($title)==='')$title='Update from Brendon';
        $photoPath='';
        if($photo!=='') {
            if(!validatedPhotoUrl($photo)) respond(['error'=>'Please upload the photo again.'],400);
            parse_str(parse_url($photo,PHP_URL_QUERY)??'',$params);
            $photoPath=$params['path']??'';
            if(!$photoPath || !registeredPhotoPath($photoPath)) respond(['error'=>'Please upload the photo again.'],400);
        }
        $stmt=$db->prepare('SELECT id FROM announcements WHERE request_id=?'); $stmt->execute([$request]);
        if($id=$stmt->fetchColumn()) respond(['ok'=>true,'id'=>(int)$id,'delivery'=>announcementDelivery()]);
        limitRequests('announcement-publish',30,3600);
        $db->beginTransaction();
        $db->prepare('INSERT INTO announcements(title,body,photo,created,request_id,media) VALUES (?,?,?,?,?,?)')->execute([trim($title),trim($body),$photoPath,gmdate('c'),$request,$media]);
        $id=(int)$db->lastInsertId();
        $db->prepare('UPDATE announcement_push SET pending=?,attempts=0,next_try=0')->execute([$id]);
        $db->commit();
        // The message is durable before attempting delivery. A network failure cannot lose it.
        try { $delivery=announcementSend(); } catch(Throwable $e) { $delivery=announcementDelivery(); }
        respond(['ok'=>true,'id'=>$id,'delivery'=>$delivery]);
    }
}
