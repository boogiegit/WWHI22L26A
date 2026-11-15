<?php
declare(strict_types=1);
function handleExperienceInterest(string $action): void {
    global $db, $input;
    $db->exec('CREATE TABLE IF NOT EXISTS experience_interest (owner TEXT NOT NULL, experience TEXT NOT NULL, name TEXT NOT NULL, people INTEGER NOT NULL, updated TEXT NOT NULL, PRIMARY KEY(owner,experience))');
    if ($action === 'interestSummary') {
        requireAdmin();
        respond(['items'=>$db->query('SELECT experience,name,people,updated FROM experience_interest ORDER BY experience,name')->fetchAll(PDO::FETCH_ASSOC)]);
    }
    $token=$input['token']??'';
    if (!is_string($token) || !preg_match('/^[a-f0-9]{64}$/D',$token)) respond(['error'=>'Please reload and try again.'],400);
    $owner=hash('sha256',$token);
    if ($action === 'interestMine') {
        $stmt=$db->prepare('SELECT experience,name,people FROM experience_interest WHERE owner=?'); $stmt->execute([$owner]);
        respond(['items'=>$stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }
    limitRequests('interest-save',100,3600);
    $experience=$input['experience']??''; $name=$input['name']??''; $people=$input['people']??null;
    $catalog=json_decode(file_get_contents(dirname(__DIR__).'/tours/WWHI22L26A/experiences.json'),true);
    $ids=[]; foreach($catalog['days']??[] as $day) foreach($day['optionals']??[] as $item) $ids[]=$item['experienceId']??'';
    if (!is_string($experience) || !in_array($experience,$ids,true) || $experience==='') respond(['error'=>'This experience is unavailable.'],400);
    if (!is_int($people) || $people<0 || $people>12 || !is_string($name) || strlen($name)>320 || ($people>0 && trim($name)==='')) respond(['error'=>'Add your name and choose 1–12 people.'],400);
    if ($people===0) $db->prepare('DELETE FROM experience_interest WHERE owner=? AND experience=?')->execute([$owner,$experience]);
    else {
        if ((int)$db->query('SELECT COUNT(*) FROM experience_interest')->fetchColumn()>=5000) respond(['error'=>'Please tell Brendon your interest directly.'],429);
        $db->prepare('INSERT INTO experience_interest VALUES (?,?,?,?,?) ON CONFLICT(owner,experience) DO UPDATE SET name=excluded.name,people=excluded.people,updated=excluded.updated')->execute([$owner,$experience,trim($name),$people,gmdate('c')]);
    }
    respond(['ok'=>true]);
}
