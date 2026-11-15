<?php
declare(strict_types=1);
function announcementMediaSchema(): void {
    global $db;
    $db->exec('CREATE TABLE IF NOT EXISTS announcement_media (id TEXT PRIMARY KEY, mime TEXT NOT NULL, bytes INTEGER NOT NULL, created INTEGER NOT NULL)');
    $columns=$db->query('PRAGMA table_info(announcements)')->fetchAll(PDO::FETCH_COLUMN,1);
    if(!in_array('media',$columns,true))$db->exec("ALTER TABLE announcements ADD COLUMN media TEXT NOT NULL DEFAULT ''");
}
function announcementMediaFile(string $id): string {
    global $privateDir;
    return preg_match('/^[a-f0-9]{40}$/D',$id)?$privateDir.'/announcement-media/'.$id:'';
}
function handleAnnouncementMedia(string $action): void {
    global $db,$input,$config,$privateDir;
    if($action==='announcementMedia') {
        $stmt=$db->prepare('SELECT m.* FROM announcement_media m JOIN announcements a ON a.media=m.id WHERE a.id=?');$stmt->execute([(int)($_GET['id']??0)]);$media=$stmt->fetch(PDO::FETCH_ASSOC);
        if(!$media)respond(['error'=>'Media unavailable.'],404);
        $file=announcementMediaFile($media['id']);if(!$file||!is_file($file))respond(['error'=>'Media unavailable.'],404);
        $size=filesize($file);$start=0;$end=$size-1;
        if(isset($_SERVER['HTTP_RANGE'])) {
            if(!preg_match('/^bytes=(\d*)-(\d*)$/D',$_SERVER['HTTP_RANGE'],$range)||($range[1]===''&&$range[2]==='')){header('Content-Range: bytes */'.$size);respond(['error'=>'Invalid range.'],416);}
            if($range[1]==='')$start=max(0,$size-(int)$range[2]);
            else {$start=(int)$range[1];if($range[2]!=='')$end=min($end,(int)$range[2]);}
            if($start>$end||$start>=$size){header('Content-Range: bytes */'.$size);respond(['error'=>'Invalid range.'],416);}
            http_response_code(206);header("Content-Range: bytes $start-$end/$size");
        }
        session_write_close();header('Content-Type: '.$media['mime']);header('Content-Disposition: inline');header('Accept-Ranges: bytes');header('Content-Length: '.($end-$start+1));
        $handle=fopen($file,'rb');fseek($handle,$start);$left=$end-$start+1;
        while($left>0&&!feof($handle)){ $chunk=fread($handle,min(65536,$left));echo $chunk;$left-=strlen($chunk); }fclose($handle);exit;
    }
    if($action!=='announcementUploadMedia')return;
    requireAdmin();if(empty($config['uploads_enabled']))respond(['error'=>'Uploads are disabled for this tour.'],403);
    limitRequests('announcement-media',30,3600);
    $file=$_FILES['media']??null;
    if(!$file||($file['error']??-1)!==UPLOAD_ERR_OK||!is_uploaded_file($file['tmp_name']))respond(['error'=>'Upload failed. Try a smaller clip or share a YouTube link.'],400);
    if($file['size']>20000000||$file['size']<12)respond(['error'=>'Use a video or voice clip smaller than 20 MB.'],413);
    $mime=(new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    if(!in_array($mime,['video/mp4','video/quicktime','video/webm','audio/mp4','audio/mpeg','audio/ogg','audio/webm','audio/x-wav','audio/wav'],true))respond(['error'=>'Use an MP4, MOV or WebM video, or an M4A, MP3, Ogg, WebM or WAV voice clip.'],415);
    if(str_starts_with($file['type']??'','audio/') && in_array($mime,['video/mp4','video/webm'],true))$mime=str_replace('video/','audio/',$mime);
    $dir=$privateDir.'/announcement-media';if(!is_dir($dir))mkdir($dir,0700,true);
    $lock=fopen($privateDir.'/announcement-media.lock','c');if(!$lock||!flock($lock,LOCK_EX))respond(['error'=>'Upload unavailable.'],503);
    // Reclaim abandoned drafts after a day; never remove media from published announcements.
    $stale=$db->query('SELECT id FROM announcement_media WHERE created<'.(time()-86400)." AND id NOT IN (SELECT media FROM announcements WHERE media<>'')")->fetchAll(PDO::FETCH_COLUMN);
    foreach($stale as $id){$path=announcementMediaFile($id);if($path&&is_file($path))unlink($path);$db->prepare('DELETE FROM announcement_media WHERE id=?')->execute([$id]);}
    $used=(int)$db->query('SELECT COALESCE(SUM(bytes),0) FROM announcement_media')->fetchColumn();
    if($used+$file['size']>500000000)respond(['error'=>'Media storage is full. Remove older announcements or share a video link.'],413);
    $id=bin2hex(random_bytes(20));$target=announcementMediaFile($id);
    if(!move_uploaded_file($file['tmp_name'],$target))respond(['error'=>'Could not save this clip.'],503);
    try{$db->prepare('INSERT INTO announcement_media VALUES (?,?,?,?)')->execute([$id,$mime,$file['size'],time()]);}catch(Throwable $e){unlink($target);throw $e;}
    flock($lock,LOCK_UN);fclose($lock);respond(['ok'=>true,'media'=>$id,'mime'=>$mime]);
}
