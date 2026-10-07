<?php
declare(strict_types=1);

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
        foreach (['airport','flightDate','flightTime','terminal','airline','flightNumber','transferType'] as $key) $record[$key] = $field($key);
        $date($record['flightDate']); $time($record['flightTime']);
        if (!in_array($record['transferType'], ['complimentary','private','own'], true)) respond(['error' => 'Choose your transfer arrangements.'], 400);
        if ($record['transferType'] === 'complimentary' && $record['flightTime'] <= '10:30') respond(['error' => 'The complimentary transfer is for flights departing after 10:30.'], 400);
    } elseif ($record['plan'] === 'eurostar') {
        $record['londonFlying'] = $field('londonFlying');
        if (!in_array($record['londonFlying'], ['yes','no'], true)) respond(['error' => 'Choose whether you have a London flight.'], 400);
        if ($record['londonFlying'] === 'yes') {
            foreach (['londonFlightDate','londonFlightTime','londonTerminal','londonFlightNumber'] as $key) $record[$key] = $field($key);
            $date($record['londonFlightDate']); $time($record['londonFlightTime']);
        }
    }
    return $record;
}
