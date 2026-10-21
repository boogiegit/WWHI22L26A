<?php
declare(strict_types=1);

function onwardNameKey(string $name): string {
    $name = preg_replace('/\(\s*[12]\s*(?:people|persons?)\s*\)/iu', '', $name);
    $name = str_replace(["'", '’'], '', (function_exists('mb_strtolower') ? mb_strtolower($name, 'UTF-8') : strtolower($name)));
    $tokens = preg_split('/[^\p{L}\p{N}]+/u', $name, -1, PREG_SPLIT_NO_EMPTY);
    $tokens = array_values(array_filter($tokens, static fn($word) => $word !== 'and'));
    sort($tokens, SORT_STRING);
    return implode(' ', $tokens);
}

function reconcileOnwardRecords(array $records, array $rules = []): array {
    $aliases = [];
    foreach ($rules as $index => $rule) {
        foreach (array_merge($rule['names'] ?? [], [$rule['name'] ?? '']) as $name) $aliases[onwardNameKey($name)] = $index;
    }
    $groups = [];
    foreach ($records as $record) {
        $key = onwardNameKey($record['name'] ?? '');
        if ($key === '') continue;
        $ruleIndex = $aliases[$key] ?? null;
        $id = $ruleIndex === null ? 'name:' . $key : 'review:' . $ruleIndex;
        $groups[$id]['rule'] = $ruleIndex === null ? [] : $rules[$ruleIndex];
        $groups[$id]['records'][] = $record;
    }
    $result = [];
    foreach ($groups as $group) {
        $rule = $group['rule'];
        $candidates = $group['records'];
        usort($candidates, static fn($a, $b) => strcmp($b['submittedAt'] ?? '', $a['submittedAt'] ?? ''));
        $selected = $candidates[0];
        // Director-confirmed corrections apply to the reviewed submissions only.
        // A subsequent guest update remains able to change their travel details.
        if ($rule && strcmp($selected['submittedAt'] ?? '', $rule['confirmedAt'] ?? '') <= 0) {
            $matching = array_values(array_filter($candidates, static function ($row) use ($rule) {
                foreach ($rule['prefer'] ?? [] as $field => $value) {
                    if (strtolower(trim((string)($row[$field] ?? ''))) !== strtolower(trim((string)$value))) return false;
                }
                return true;
            }));
            if ($matching) $selected = $matching[0];
            $selected = array_replace($selected, $rule['confirmed'] ?? []);
        }
        if (isset($rule['name'])) $selected['name'] = $rule['name'];
        if (isset($rule['partySize'])) $selected['partySize'] = $rule['partySize'];
        $result[] = $selected;
    }
    return $result;
}

function onwardSummary(): array {
    global $db, $config;
    $records = [];
    $forms = $db->prepare('SELECT value FROM storage WHERE substr(key,1,?)=?');
    foreach (array_unique($config['storage_slugs'] ?? []) as $slug) {
        $prefix = 'tour:' . $slug . ':shared:tool:onward:';
        $forms->execute([strlen($prefix), $prefix]);
        foreach ($forms as $form) {
            $record = json_decode($form['value'], true);
            if (is_array($record) && is_string($record['name'] ?? null) && trim($record['name']) !== ''
                && in_array($record['plan'] ?? '', ['flying','eurostar','staying'], true)) $records[] = $record;
        }
    }
    $path = dirname(__DIR__) . '/.private/onward-reconciliation.json';
    $rules = is_file($path) ? json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR) : [];
    return ['records' => reconcileOnwardRecords($records, $rules), 'submissionCount' => count($records)];
}

function validateOnwardRecord($input, string $suffix): array {
    if (!is_array($input)) respond(['error' => 'Invalid onward travel submission.'], 400);
    $record = ['sharedKey' => substr($suffix, strlen('tool:')), 'submittedAt' => gmdate('c')];
    $field = static function (string $key, bool $required = true) use ($input): string {
        $value = $input[$key] ?? '';
        if (!is_string($value) || strlen($value) > 200 || preg_match('/[\x00-\x1f]/', $value)) respond(['error' => 'Invalid onward travel field.'], 400);
        $value = trim($value);
        if ($required && $value === '') respond(['error' => 'Please complete the required travel fields.'], 400);
        return $value;
    };
    $date = static function (string $value): void {
        $parsed = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
        if (!$parsed || $parsed->format('Y-m-d') !== $value) respond(['error' => 'Invalid travel date.'], 400);
    };
    $time = static function (string $value): void {
        if (!preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/D', $value)) respond(['error' => 'Invalid travel time.'], 400);
    };
    $record['name'] = $field('name');
    $record['partySize'] = $input['partySize'] ?? 1;
    if (!in_array($record['partySize'], [1,2], true)) respond(['error' => 'Choose one or two people.'], 400);
    $record['plan'] = $field('plan');
    if (!in_array($record['plan'], ['flying','eurostar','staying'], true)) respond(['error' => 'Choose an onward travel plan.'], 400);
    if ($record['plan'] === 'flying') {
        foreach (['airport','flightDate','flightTime','terminal','airline','flightNumber','transferType'] as $key) $record[$key] = $field($key, false);
        if ($record['flightDate'] !== '') $date($record['flightDate']);
        if ($record['flightTime'] !== '') $time($record['flightTime']);
        if (!in_array($record['transferType'], ['','complimentary','private','own'], true)) respond(['error' => 'Choose your transfer arrangements.'], 400);
        if ($record['transferType'] === 'complimentary' && $record['flightTime'] !== '' && $record['flightTime'] <= '10:30') respond(['error' => 'The complimentary transfer is for flights departing after 10:30.'], 400);
    } elseif ($record['plan'] === 'eurostar') {
        $record['londonFlying'] = $field('londonFlying');
        if (!in_array($record['londonFlying'], ['yes','no'], true)) respond(['error' => 'Choose whether you have a London flight.'], 400);
        if ($record['londonFlying'] === 'yes') {
            foreach (['londonFlightDate','londonFlightTime','londonTerminal','londonFlightNumber'] as $key) $record[$key] = $field($key, false);
            if ($record['londonFlightDate'] !== '') $date($record['londonFlightDate']);
            if ($record['londonFlightTime'] !== '') $time($record['londonFlightTime']);
        }
    }
    return $record;
}
