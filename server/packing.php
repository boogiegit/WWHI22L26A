<?php
declare(strict_types=1);
function handlePacking(string $action): void {
    global $db,$input;
    $db->exec('CREATE TABLE IF NOT EXISTS packing_content (id INTEGER PRIMARY KEY, sections TEXT NOT NULL)');
    if($action==='getPacking') { $raw=$db->query('SELECT sections FROM packing_content WHERE id=1')->fetchColumn();respond(['sections'=>$raw?json_decode($raw,true):null]); }
    requireAdmin();$sections=$input['sections']??null;
    if(!is_array($sections)||!array_is_list($sections)||count($sections)<1||count($sections)>20)respond(['error'=>'Use 1–20 sections.'],400);
    $count=0;
    foreach($sections as $section){
        if(!is_array($section)||!is_string($section['category']??null)||trim($section['category'])===''||strlen($section['category'])>160||!is_array($section['items']??null)||!array_is_list($section['items']))respond(['error'=>'Check the section headings and items.'],400);
        foreach($section['items'] as $item){$count++;if(!is_array($item)||!is_string($item['title']??null)||trim($item['title'])===''||strlen($item['title'])>320||!is_string($item['note']??'')||strlen($item['note']??'')>1000)respond(['error'=>'Keep item names and notes concise.'],400);}
    }
    if($count<1||$count>200)respond(['error'=>'Use 1–200 packing items.'],400);
    $db->prepare('INSERT OR REPLACE INTO packing_content VALUES (1,?)')->execute([json_encode($sections)]);respond(['ok'=>true]);
}
