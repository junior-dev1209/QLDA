<?php
declare(strict_types=1);

const PASSWORD_HASH_ALGORITHM = 'pbkdf2-sha256-v1';
const PASSWORD_HASH_ITERATIONS = 310000;
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_HASH_BYTES = 32;
const SYNC_DEPLOYMENT_VERSION = '2026.11.11.3';

/*
 * Shared state API for the Phuc Thinh workforce application.
 * Deploy this file on the same HTTPS origin as index.html.
 */

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()');
header('X-Frame-Options: SAMEORIGIN');
header("Content-Security-Policy: default-src 'none'; base-uri 'none'; frame-ancestors 'none'");

$secureCookie = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
ini_set('session.use_strict_mode', '1');
ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_samesite', 'Lax');
session_name('phuc_thinh_kpi_session');
session_set_cookie_params([
    'path' => '/',
    'httponly' => true,
    'secure' => $secureCookie,
    'samesite' => 'Lax',
]);
session_start();

$dataDirectory = __DIR__ . DIRECTORY_SEPARATOR . 'data';
$filesDirectory = $dataDirectory . DIRECTORY_SEPARATOR . 'files';
$stateFile = $dataDirectory . DIRECTORY_SEPARATOR . 'shared-state.json';
$lockFile = $dataDirectory . DIRECTORY_SEPARATOR . 'shared-state.lock';

if (!is_dir($filesDirectory) && !mkdir($filesDirectory, 0770, true) && !is_dir($filesDirectory)) {
    respond(['error' => 'Cannot create the shared data directory.'], 500);
}

set_exception_handler(static function (Throwable $error): void {
    respond(['error' => 'Server error.'], 500);
});

$action = (string) ($_GET['action'] ?? '');

if ($action === 'status') {
    $snapshot = readSnapshot($stateFile);
    respond([
        'available' => true,
        'initialized' => $snapshot['revision'] > 0,
        'revision' => $snapshot['revision'],
        'updatedAt' => $snapshot['updatedAt'],
        'deploymentVersion' => SYNC_DEPLOYMENT_VERSION,
        'recurringTaskCleanup' => true,
    ]);
}

if ($action === 'login' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $payload = readJsonBody();
    $username = trim((string) ($payload['username'] ?? ''));
    $password = (string) ($payload['password'] ?? '');
    $snapshot = readSnapshot($stateFile);
    $account = accountByUsername($snapshot['state'], $username);

    if (!$account) {
        respond(['error' => 'Invalid username or password.'], 401);
    }
    if (!empty($account['disabled'])) {
        respond(['error' => 'This account has been disabled by an administrator.'], 403);
    }
    if (!accountPasswordMatches($account, $password)) {
        respond(['error' => 'Invalid username or password.'], 401);
    }
    if ($snapshot['revision'] > 0 && !hasPasswordHash($account)) {
        $snapshot = migrateLegacyAccountPassword($stateFile, $lockFile, (string) $account['id'], $password);
        $account = accountByUsername($snapshot['state'], $username);
        if (!$account || !accountPasswordMatches($account, $password)) {
            respond(['error' => 'Invalid username or password.'], 401);
        }
    }

    session_regenerate_id(true);
    $_SESSION['accountId'] = (string) $account['id'];
    respond([
        'revision' => $snapshot['revision'],
        'updatedAt' => $snapshot['updatedAt'],
        'state' => sanitizedState($snapshot['state']),
    ]);
}

if ($action === 'change-password' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $payload = readJsonBody();
    $currentPassword = (string) ($payload['currentPassword'] ?? '');
    $newPassword = (string) ($payload['newPassword'] ?? '');
    $newPasswordLength = function_exists('mb_strlen') ? mb_strlen($newPassword, 'UTF-8') : strlen($newPassword);
    if ($currentPassword === '' || $newPassword === '' || $newPasswordLength > 128 || strlen($newPassword) > 512) {
        respond(['error' => 'A current password and a new password of at most 128 characters are required.'], 422);
    }

    $lock = fopen($lockFile, 'c+');
    if ($lock === false) {
        respond(['error' => 'Cannot lock shared state.'], 503);
    }
    $locked = flock($lock, LOCK_EX);
    if (!$locked) {
        fclose($lock);
        respond(['error' => 'Cannot lock shared state.'], 503);
    }

    $responsePayload = [];
    $responseStatus = 200;
    try {
        $snapshot = readSnapshot($stateFile);
        $actorId = (string) ($_SESSION['accountId'] ?? '');
        $accountIndex = null;
        foreach (($snapshot['state']['accounts'] ?? []) as $index => $candidate) {
            if ($actorId !== '' && is_array($candidate) && hash_equals((string) ($candidate['id'] ?? ''), $actorId)) {
                $accountIndex = $index;
                break;
            }
        }
        if ($accountIndex === null) {
            $responsePayload = ['error' => 'Authentication required.'];
            $responseStatus = 401;
        } else {
            $account = $snapshot['state']['accounts'][$accountIndex];
            if (!empty($account['disabled'])) {
                $responsePayload = ['error' => 'Authentication required.'];
                $responseStatus = 401;
            } elseif (!accountPasswordMatches($account, $currentPassword)) {
                $responsePayload = ['error' => 'Current password is incorrect.'];
                $responseStatus = 400;
            } else {
                setAccountPasswordCredential($account, $newPassword);
                $snapshot['state']['accounts'][$accountIndex] = $account;
                $snapshot['revision'] = max(0, (int) $snapshot['revision']) + 1;
                $snapshot['updatedAt'] = gmdate('c');
                writeSnapshot($stateFile, $snapshot);
                $responsePayload = ['ok' => true, 'revision' => $snapshot['revision'], 'updatedAt' => $snapshot['updatedAt']];
            }
        }
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
    respond($responsePayload, $responseStatus);
}

if ($action === 'logout' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], (bool) $params['secure'], (bool) $params['httponly']);
    }
    session_destroy();
    respond(['ok' => true]);
}

if ($action === 'state' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    requireSessionAccount($stateFile);
    $snapshot = readSnapshot($stateFile);
    $cleanup = phpCleanupStoppedRecurringTaskInstances($snapshot['state']);
    if ($cleanup['deletedTaskIds']) {
        $lock = fopen($lockFile, 'c+');
        if ($lock === false || !flock($lock, LOCK_EX)) {
            if (is_resource($lock)) fclose($lock);
            respond(['error' => 'Cannot lock shared state.'], 503);
        }
        try {
            $snapshot = readSnapshot($stateFile);
            requireSessionAccountFromState($snapshot['state']);
            $cleanup = phpCleanupStoppedRecurringTaskInstances($snapshot['state']);
            if ($cleanup['deletedTaskIds']) {
                $snapshot = [
                    'revision' => $snapshot['revision'] + 1,
                    'updatedAt' => gmdate('c'),
                    'state' => $cleanup['state'],
                ];
                writeSnapshot($stateFile, $snapshot);
            }
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }
    respond([
        'revision' => $snapshot['revision'],
        'updatedAt' => $snapshot['updatedAt'],
        'state' => sanitizedState($snapshot['state']),
    ]);
}

if ($action === 'state' && in_array($_SERVER['REQUEST_METHOD'], ['PUT', 'POST'], true)) {
    $payload = readJsonBody();
    $expectedRevision = isset($payload['revision']) ? (int) $payload['revision'] : -1;
    $nextState = $payload['state'] ?? null;
    if (!is_array($nextState) || !validState($nextState)) {
        respond(['error' => 'Invalid state payload.'], 422);
    }

    $lock = fopen($lockFile, 'c+');
    if ($lock === false || !flock($lock, LOCK_EX)) {
        respond(['error' => 'Cannot lock shared state.'], 503);
    }

    $responsePayload = [];
    $responseStatus = 200;
    try {
        $current = readSnapshot($stateFile);
        $actor = requireSessionAccountFromState($current['state']);
        $nextState = mergeAccountCredentials($current['state'], $nextState);
        $nextState = preserveStoppedRecurringTasks($current['state'], $nextState);
        if ($current['revision'] === 0 && !isAdminAccount($actor)) {
            $responsePayload = ['error' => 'Permission denied.'];
            $responseStatus = 403;
        } elseif ($current['revision'] === 0 && !isViableInitialState($nextState)) {
            $responsePayload = ['error' => 'Central data is not initialized. Restore a complete verified backup as Admin.'];
            $responseStatus = 409;
        } elseif (stateReplacementRemovesUnsafeAmountOfData($current['state'], $nextState)) {
            $responsePayload = ['error' => 'Unsafe bulk deletion was blocked.'];
            $responseStatus = 409;
        } elseif ($expectedRevision !== $current['revision']) {
            $responsePayload = [
                'error' => 'Revision conflict.',
                'revision' => $current['revision'],
                'updatedAt' => $current['updatedAt'],
            ];
            $responseStatus = 409;
        } else {
            $departmentStopEffects = phpStopRecurringTasksForDepartmentChanges($current['state'], $nextState, $actor);
            $cleanup = phpCleanupStoppedRecurringTaskInstances($departmentStopEffects['state']);
            $nextState = $cleanup['state'];
            $nextSnapshot = [
                'revision' => $current['revision'] + 1,
                'updatedAt' => gmdate('c'),
                'state' => $nextState,
            ];
            writeSnapshot($stateFile, $nextSnapshot);
            $responsePayload = [
                'revision' => $nextSnapshot['revision'],
                'updatedAt' => $nextSnapshot['updatedAt'],
                'state' => sanitizedState($nextSnapshot['state']),
            ];
        }
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
    respond($responsePayload, $responseStatus);
}

if ($action === 'stop-recurring-task' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $payload = readJsonBody();
    $taskId = trim((string) ($payload['taskId'] ?? ''));
    if ($taskId === '' || strlen($taskId) > 128) {
        respond(['error' => 'Invalid recurring task reference.'], 422);
    }
    $actor = requireSessionAccount($stateFile);
    $lock = fopen($lockFile, 'c+');
    if ($lock === false || !flock($lock, LOCK_EX)) {
        if (is_resource($lock)) fclose($lock);
        respond(['error' => 'Cannot lock shared state.'], 503);
    }

    $responsePayload = [];
    $responseStatus = 200;
    try {
        $current = readSnapshot($stateFile);
        $actor = requireSessionAccountFromState($current['state']);
        $result = stopRecurringTaskInState($current['state'], $actor, $taskId);
        if (isset($result['error'])) {
            $responsePayload = ['error' => $result['error']];
            $responseStatus = (int) ($result['status'] ?? 403);
        } else {
            $cleanup = phpCleanupStoppedRecurringTaskInstances($result['state']);
            $nextSnapshot = [
                'revision' => $current['revision'] + 1,
                'updatedAt' => gmdate('c'),
                'state' => $cleanup['state'],
            ];
            writeSnapshot($stateFile, $nextSnapshot);
            $responsePayload = [
                'revision' => $nextSnapshot['revision'],
                'updatedAt' => $nextSnapshot['updatedAt'],
                'state' => sanitizedState($nextSnapshot['state']),
                'stoppedOccurrences' => $result['stoppedOccurrences'],
                'removedLateOccurrences' => count($cleanup['deletedTaskIds']),
            ];
        }
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
    respond($responsePayload, $responseStatus);
}

if ($action === 'file' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    requireSessionAccount($stateFile);
    $key = safeFileKey((string) ($_POST['key'] ?? ''));
    $upload = $_FILES['file'] ?? null;
    if ($key === '' || !is_array($upload) || (int) ($upload['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        respond(['error' => 'Invalid file upload.'], 422);
    }
    if ((int) ($upload['size'] ?? 0) > 10 * 1024 * 1024) {
        respond(['error' => 'File exceeds the 10 MB server limit.'], 413);
    }

    $target = remoteFilePath($filesDirectory, $key);
    if (!move_uploaded_file((string) $upload['tmp_name'], $target)) {
        respond(['error' => 'Cannot save uploaded file.'], 500);
    }
    @chmod($target, 0660);
    respond(['key' => $key]);
}

if ($action === 'file' && $_SERVER['REQUEST_METHOD'] === 'GET') {
    requireSessionAccount($stateFile);
    $key = safeFileKey((string) ($_GET['key'] ?? ''));
    $file = remoteFilePath($filesDirectory, $key);
    if ($key === '' || !is_file($file)) {
        respond(['error' => 'File not found.'], 404);
    }

    $type = trim((string) ($_GET['type'] ?? 'application/octet-stream'));
    if (!preg_match('/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i', $type)) {
        $type = 'application/octet-stream';
    }
    header('Content-Type: ' . $type);
    header('Content-Length: ' . (string) filesize($file));
    readfile($file);
    exit;
}

if ($action === 'file' && $_SERVER['REQUEST_METHOD'] === 'DELETE') {
    requireSessionAccount($stateFile);
    $key = safeFileKey((string) ($_GET['key'] ?? ''));
    $file = remoteFilePath($filesDirectory, $key);
    if ($key !== '' && is_file($file)) {
        @unlink($file);
    }
    respond(['ok' => true]);
}

respond(['error' => 'Unknown endpoint.'], 404);

function stopRecurringTaskInState(array $state, array $actor, string $taskId, string $automaticReason = ''): array
{
    $tasks = is_array($state['tasks'] ?? null) ? $state['tasks'] : [];
    $clicked = null;
    foreach ($tasks as $task) {
        if (is_array($task) && (string) ($task['id'] ?? '') === $taskId) {
            $clicked = $task;
            break;
        }
    }
    if (!$clicked) return ['error' => 'The recurring task was not found.', 'status' => 404];

    $sourceId = trim((string) ($clicked['recurrenceSourceId'] ?? ''))
        ?: trim((string) ($clicked['recurrenceSeriesId'] ?? ''))
        ?: trim((string) ($clicked['id'] ?? ''));
    $source = null;
    foreach ($tasks as $task) {
        if (!is_array($task) || !empty($task['recurrenceSourceId'])) continue;
        if ((string) ($task['id'] ?? '') === $sourceId || phpTaskRecurrenceSeriesKey($task) === phpTaskRecurrenceSeriesKey($clicked)) {
            $source = $task;
            break;
        }
    }
    if (!$source || !phpTaskHasRecurrence($source) || !empty($source['recurrenceStoppedAt'])) {
        return ['error' => 'This recurring series is already stopped or no longer active.', 'status' => 409];
    }
    if ($automaticReason === '' && !phpCanStopRecurringSeries($state, $actor, $source)) {
        return ['error' => 'Permission denied.', 'status' => 403];
    }

    $today = (new DateTimeImmutable('now', new DateTimeZone('Asia/Ho_Chi_Minh')))->format('Y-m-d');
    $timestamp = gmdate('c');
    $actorId = (string) ($actor['id'] ?? '');
    $actorName = trim((string) ($actor['displayName'] ?? $actor['username'] ?? 'Tài khoản'));
    $seriesKey = phpTaskRecurrenceSeriesKey($source);
    $stoppedOccurrences = 0;
    $updatedCount = 0;

    foreach ($tasks as &$task) {
        if (!is_array($task) || phpTaskRecurrenceSeriesKey($task) !== $seriesKey) continue;
        $status = trim((string) ($task['status'] ?? 'Chuẩn bị thực hiện'));
        $dueOrStart = trim((string) ($task['due'] ?? $task['startDate'] ?? ''));
        $futureUnstarted = (string) ($task['id'] ?? '') !== (string) ($source['id'] ?? '')
            && $dueOrStart > $today
            && $status === 'Chuẩn bị thực hiện'
            && (float) ($task['progress'] ?? 0) === 0.0;
        $task['recurrenceStoppedAt'] = $timestamp;
        $task['recurrenceStoppedById'] = $actorId;
        $task['recurrenceStoppedByName'] = $actorName;
        $task['recurrenceStopDate'] = $today;
        $task['updatedAt'] = $timestamp;
        $task['updatedBy'] = $actorName;
        $task['updatedById'] = $actorId;
        if ($futureUnstarted) {
            $stoppedOccurrences++;
            $task['status'] = 'Đã ngừng';
            $reports = is_array($task['progressReports'] ?? null) ? $task['progressReports'] : [];
            $reports[] = [
                'id' => 'task-report-' . bin2hex(random_bytes(12)),
                'progress' => 0,
                'status' => 'Đã ngừng',
                'previousStatus' => $status,
                'action' => 'Dừng kỳ định kỳ',
                'note' => $automaticReason !== ''
                    ? 'Kỳ công việc tự động ngừng do ' . $automaticReason . ' từ ' . $today . '.'
                    : 'Kỳ công việc được ngừng khi dừng chuỗi định kỳ từ ' . $today . '.',
                'createdAt' => $timestamp,
                'createdById' => $actorId,
                'createdBy' => $actorName,
            ];
            $task['progressReports'] = $reports;
        }
        $updatedCount++;
    }
    unset($task);
    $state['tasks'] = $tasks;

    $owner = phpTaskResponsiblePerson($state, $source, $today) ?? phpTaskPersonForReference($state, (string) ($source['ownerId'] ?? ''));
    $activityLog = is_array($state['activityLog'] ?? null) ? $state['activityLog'] : [];
    $activityLog[] = [
        'id' => 'server-sync-' . bin2hex(random_bytes(12)),
        'action' => $automaticReason !== '' ? 'Tự dừng định kỳ' : 'Dừng định kỳ',
        'module' => 'Công việc',
        'targetType' => 'task-recurrence',
        'targetId' => $seriesKey,
        'personId' => (string) ($owner['id'] ?? $source['ownerId'] ?? ''),
        'departmentId' => (string) ($owner['departmentId'] ?? ''),
        'period' => substr((string) ($source['due'] ?? ''), 0, 7),
        'title' => (string) ($source['title'] ?? 'Chuỗi công việc định kỳ'),
        'details' => 'Đã dừng sinh kỳ mới; ' . $stoppedOccurrences . ' kỳ tương lai chưa bắt đầu được đánh dấu Đã ngừng. ' . $updatedCount . ' bản ghi trong chuỗi đã lưu dấu vết dừng.' . ($automaticReason !== '' ? ' Lý do: ' . $automaticReason . '.' : ''),
        'createdAt' => $timestamp,
        'createdBy' => $actorName,
        'createdById' => $actorId,
    ];
    $state['activityLog'] = array_slice($activityLog, -5000);
    return ['state' => $state, 'stoppedOccurrences' => $stoppedOccurrences];
}

function phpTaskRecurrenceSeriesKey(array $task): string
{
    return trim((string) ($task['recurrenceSeriesId'] ?? ''))
        ?: trim((string) ($task['recurrenceSourceId'] ?? ''))
        ?: trim((string) ($task['id'] ?? ''));
}

function phpTaskAuditTimestamp(mixed $value): ?int
{
    $raw = trim((string) ($value ?? ''));
    if ($raw === '') return null;
    try {
        if (preg_match('/^\d{4}-\d{2}-\d{2}(?:T|$)/', $raw)) {
            return (new DateTimeImmutable($raw, new DateTimeZone('UTC')))->getTimestamp();
        }
        if (preg_match('/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/', $raw, $match)) {
            $day = (int) $match[1];
            $month = (int) $match[2];
            $year = (int) $match[3];
            $hour = (int) ($match[4] ?? 0);
            $minute = (int) ($match[5] ?? 0);
            $second = (int) ($match[6] ?? 0);
            if (!checkdate($month, $day, $year) || $hour > 23 || $minute > 59 || $second > 59) return null;
            return (new DateTimeImmutable(
                sprintf('%04d-%02d-%02d %02d:%02d:%02d', $year, $month, $day, $hour, $minute, $second),
                new DateTimeZone('Asia/Ho_Chi_Minh'),
            ))->getTimestamp();
        }
    } catch (Throwable) {
        return null;
    }
    return null;
}

function phpTaskStopTimestamp(mixed $value): ?int
{
    $raw = trim((string) ($value ?? ''));
    if ($raw === '') return null;
    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $raw)) return phpTaskAuditTimestamp($raw . 'T23:59:59.999+07:00');
    if (preg_match('/^\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{4}$/', $raw)) return phpTaskAuditTimestamp($raw . ' 23:59:59');
    return phpTaskAuditTimestamp($raw);
}

function phpCleanupStoppedRecurringTaskInstances(array $state): array
{
    $tasks = is_array($state['tasks'] ?? null) ? $state['tasks'] : [];
    $sourcesById = [];
    $sourcesBySeries = [];
    foreach ($tasks as $task) {
        if (!is_array($task) || !empty($task['recurrenceSourceId']) || phpTaskIsAssigned($task) || !phpTaskHasRecurrence($task) || empty($task['recurrenceStoppedAt'] ?? $task['recurrenceStopDate'] ?? '')) continue;
        $id = (string) ($task['id'] ?? '');
        $series = phpTaskRecurrenceSeriesKey($task);
        if ($id !== '') $sourcesById[$id] = $task;
        if ($series !== '') $sourcesBySeries[$series] = $task;
    }
    if (!$sourcesById && !$sourcesBySeries) {
        return ['state' => $state, 'deletedTaskIds' => [], 'deletedNotificationIds' => [], 'activityIds' => []];
    }

    $generationTimes = [];
    foreach (($state['activityLog'] ?? []) as $entry) {
        if (!is_array($entry) || (string) ($entry['action'] ?? '') !== 'Tự tạo định kỳ' || empty($entry['targetId'])) continue;
        $createdAt = phpTaskAuditTimestamp($entry['createdAt'] ?? $entry['timestamp'] ?? '');
        if ($createdAt !== null) {
            $targetId = (string) $entry['targetId'];
            $generationTimes[$targetId] = max($generationTimes[$targetId] ?? PHP_INT_MIN, $createdAt);
        }
    }

    $deletedBySeries = [];
    foreach ($tasks as $task) {
        if (!is_array($task)) continue;
        $sourceId = trim((string) ($task['recurrenceSourceId'] ?? ''));
        if ($sourceId === '') continue;
        $source = $sourcesById[$sourceId] ?? $sourcesBySeries[phpTaskRecurrenceSeriesKey($task)] ?? null;
        if (!is_array($source)) continue;
        $stoppedAt = phpTaskStopTimestamp($source['recurrenceStoppedAt'] ?? '')
            ?? phpTaskStopTimestamp($source['recurrenceStopDate'] ?? '');
        $taskId = (string) ($task['id'] ?? '');
        $createdAt = phpTaskAuditTimestamp($task['createdAt'] ?? '') ?? ($generationTimes[$taskId] ?? null);
        if ($stoppedAt === null || $createdAt === null || $createdAt <= $stoppedAt || $taskId === '') continue;
        $series = phpTaskRecurrenceSeriesKey($source);
        if (!isset($deletedBySeries[$series])) $deletedBySeries[$series] = ['source' => $source, 'ids' => []];
        $deletedBySeries[$series]['ids'][] = $taskId;
    }

    $deletedTaskIds = [];
    foreach ($deletedBySeries as $group) {
        $deletedTaskIds = array_merge($deletedTaskIds, $group['ids']);
    }
    $deletedTaskIds = array_values(array_unique($deletedTaskIds));
    if (!$deletedTaskIds) {
        return ['state' => $state, 'deletedTaskIds' => [], 'deletedNotificationIds' => [], 'activityIds' => []];
    }
    $deletedSet = array_fill_keys($deletedTaskIds, true);
    $next = $state;
    $next['tasks'] = array_values(array_filter($tasks, static fn ($task): bool => !is_array($task) || !isset($deletedSet[(string) ($task['id'] ?? '')])));
    $notifications = is_array($next['notifications'] ?? null) ? $next['notifications'] : [];
    $deletedNotificationIds = [];
    $next['notifications'] = array_values(array_filter($notifications, static function ($notification) use ($deletedSet, &$deletedNotificationIds): bool {
        if (!is_array($notification)) return true;
        $targetId = (string) (($notification['targetId'] ?? '') ?: ($notification['taskId'] ?? ''));
        if ($targetId === '' || !isset($deletedSet[$targetId])) return true;
        if (!empty($notification['id'])) $deletedNotificationIds[] = (string) $notification['id'];
        return false;
    }));
    $deletedIds = is_array($next['deletedIds'] ?? null) ? array_map('strval', $next['deletedIds']) : [];
    $next['deletedIds'] = array_slice(array_values(array_unique(array_merge($deletedIds, $deletedTaskIds))), -2000);
    $activityLog = is_array($next['activityLog'] ?? null) ? $next['activityLog'] : [];
    $activityIds = [];
    foreach ($deletedBySeries as $series => $group) {
        $id = 'server-sync-' . bin2hex(random_bytes(12));
        $activityLog[] = [
            'id' => $id,
            'action' => 'Dọn kỳ định kỳ phát sinh sau khi dừng',
            'module' => 'Công việc',
            'targetType' => 'task-recurrence',
            'targetId' => (string) $series,
            'title' => (string) ($group['source']['title'] ?? 'Chuỗi công việc định kỳ'),
            'details' => 'Đã xóa ' . count($group['ids']) . ' công việc tự sinh sau thời điểm dừng định kỳ.',
            'createdAt' => gmdate('c'),
            'createdBy' => 'Hệ thống',
            'createdById' => 'system',
        ];
        $activityIds[] = $id;
    }
    $next['activityLog'] = array_slice($activityLog, -5000);
    return [
        'state' => $next,
        'deletedTaskIds' => $deletedTaskIds,
        'deletedNotificationIds' => array_values(array_unique($deletedNotificationIds)),
        'activityIds' => $activityIds,
    ];
}

function preserveStoppedRecurringTasks(array $currentState, array $nextState): array
{
    $currentById = [];
    $stoppedBySeries = [];
    foreach (($currentState['tasks'] ?? []) as $task) {
        if (!is_array($task)) continue;
        $id = (string) ($task['id'] ?? '');
        if ($id !== '') $currentById[$id] = $task;
        if (!empty($task['recurrenceStoppedAt'])) {
            $stoppedBySeries[phpTaskRecurrenceSeriesKey($task)] = $task;
        }
    }
    foreach (($nextState['tasks'] ?? []) as $task) {
        if (!is_array($task) || empty($task['recurrenceStoppedAt'])) continue;
        $key = phpTaskRecurrenceSeriesKey($task);
        if ($key !== '' && !isset($stoppedBySeries[$key])) $stoppedBySeries[$key] = $task;
    }

    $blockedIds = [];
    $tasks = [];
    foreach (($nextState['tasks'] ?? []) as $task) {
        if (!is_array($task)) {
            $tasks[] = $task;
            continue;
        }
        $id = (string) ($task['id'] ?? '');
        $previous = $currentById[$id] ?? null;
        $seriesKey = phpTaskRecurrenceSeriesKey($task);
        $stopped = $stoppedBySeries[$seriesKey] ?? null;
        $isOccurrence = !empty($task['recurrenceSourceId'])
            || ($id !== '' && $seriesKey !== $id && phpTaskHasRecurrence($task));
        if (!$previous && $stopped && $isOccurrence) {
            if ($id !== '') $blockedIds[$id] = true;
            continue;
        }
        if ($previous && $stopped) {
            foreach (['recurrenceStoppedAt', 'recurrenceStoppedById', 'recurrenceStoppedByName', 'recurrenceStopDate'] as $field) {
                if (array_key_exists($field, $stopped)) $task[$field] = $stopped[$field];
            }
        }
        $tasks[] = $task;
    }
    $nextState['tasks'] = $tasks;
    if ($blockedIds) {
        $nextState['activityLog'] = array_values(array_filter(
            $nextState['activityLog'] ?? [],
            static fn ($entry): bool => !is_array($entry)
                || (string) ($entry['action'] ?? '') !== 'Tự tạo định kỳ'
                || !isset($blockedIds[(string) ($entry['targetId'] ?? '')]),
        ));
    }
    return $nextState;
}

function phpTaskHasRecurrence(array $task): bool
{
    if (strtolower(trim((string) ($task['kind'] ?? 'regular'))) !== 'regular') return false;
    $recurrence = strtolower(trim((string) ($task['recurrence'] ?? $task['periodicity'] ?? '')));
    return in_array($recurrence, ['daily', 'weekly', 'monthly', 'quarterly', 'hàng ngày', 'hàng tuần', 'hàng tháng', 'hàng quý', 'hang ngay', 'hang tuan', 'hang thang', 'hang quy'], true);
}

function phpTaskIsAssigned(array $task): bool
{
    $kind = strtolower(trim((string) ($task['kind'] ?? $task['taskKind'] ?? '')));
    return in_array($kind, ['assigned', 'giao việc', 'giao viec'], true)
        || ($kind === '' && (!empty($task['assignedById']) || !empty($task['assignedAt']) || !empty($task['responseStatus']) || !empty($task['responseAt'])));
}

function phpTaskPersonForReference(array $state, string $reference): ?array
{
    foreach (($state['people'] ?? []) as $person) {
        if (is_array($person) && (string) ($person['id'] ?? '') === $reference) return $person;
    }
    foreach (($state['accounts'] ?? []) as $account) {
        if (!is_array($account) || (string) ($account['id'] ?? '') !== $reference) continue;
        $personId = (string) ($account['personId'] ?? '');
        foreach (($state['people'] ?? []) as $person) {
            if (is_array($person) && (string) ($person['id'] ?? '') === $personId) return $person;
        }
    }
    return null;
}

function phpTaskResponsiblePerson(array $state, array $source, string $date): ?array
{
    $ownerReference = trim((string) ($source['ownerId'] ?? ''));
    $history = is_array($source['recurrenceHandoverHistory'] ?? null) ? $source['recurrenceHandoverHistory'] : [];
    usort($history, static fn($left, $right) => strcmp((string) ($left['effectiveDate'] ?? ''), (string) ($right['effectiveDate'] ?? '')));
    foreach ($history as $entry) {
        if (!is_array($entry) || (string) ($entry['effectiveDate'] ?? '') > $date || empty($entry['toPersonId'])) continue;
        $ownerReference = (string) $entry['toPersonId'];
    }
    return phpTaskPersonForReference($state, $ownerReference);
}

function phpCanStopRecurringSeries(array $state, array $actor, array $source): bool
{
    $role = strtolower(trim((string) ($actor['role'] ?? '')));
    if (in_array($role, ['admin', 'director'], true)) return true;
    $today = (new DateTimeImmutable('now', new DateTimeZone('Asia/Ho_Chi_Minh')))->format('Y-m-d');
    $owner = phpTaskResponsiblePerson($state, $source, $today);
    if (!$owner) return false;
    $actorPersonId = (string) ($actor['personId'] ?? '');
    $actorPerson = phpTaskPersonForReference($state, (string) ($actor['id'] ?? ''));
    if ($actorPersonId === '') $actorPersonId = (string) ($actorPerson['id'] ?? '');
    if ($actorPersonId !== '' && $actorPersonId === (string) ($owner['id'] ?? '')) return true;
    $positionId = strtolower((string) ($actorPerson['roleId'] ?? ''));
    $managesDepartment = in_array($role, ['manager', 'deputy_manager'], true)
        || str_starts_with($positionId, 'truong-phong-')
        || str_starts_with($positionId, 'pho-phong-');
    if (!$managesDepartment) return false;
    $actorDepartment = (string) ($actor['departmentId'] ?? phpTaskPersonForReference($state, (string) ($actor['id'] ?? ''))['departmentId'] ?? '');
    return $actorDepartment !== '' && $actorDepartment === (string) ($owner['departmentId'] ?? '');
}

function phpCanManagePeopleForDepartmentChange(array $actor): bool
{
    $role = strtolower(trim((string) ($actor['role'] ?? '')));
    $grants = is_array($actor['accessGrants'] ?? null) ? $actor['accessGrants'] : [];
    return in_array($role, ['admin', 'director'], true)
        || (($grants['peopleWrite'] ?? false) === true);
}

function phpStopRecurringTasksForDepartmentChanges(array $previousState, array $nextState, array $actor): array
{
    if (!phpCanManagePeopleForDepartmentChange($actor)) {
        return ['state' => $nextState, 'taskIds' => [], 'activityIds' => [], 'stoppedSeriesCount' => 0, 'stoppedOccurrences' => 0];
    }
    $previousPeople = [];
    foreach (($previousState['people'] ?? []) as $person) {
        if (is_array($person) && !empty($person['id'])) $previousPeople[(string) $person['id']] = $person;
    }
    $departments = [];
    foreach (($nextState['departments'] ?? []) as $department) {
        if (is_array($department) && !empty($department['id'])) $departments[(string) $department['id']] = (string) ($department['name'] ?? '');
    }
    $today = (new DateTimeImmutable('now', new DateTimeZone('Asia/Ho_Chi_Minh')))->format('Y-m-d');
    $movedPeople = [];
    foreach (($nextState['people'] ?? []) as $person) {
        if (!is_array($person) || empty($person['id'])) continue;
        $id = (string) $person['id'];
        $previous = $previousPeople[$id] ?? null;
        if ($previous && (string) ($previous['departmentId'] ?? '') !== (string) ($person['departmentId'] ?? '')) {
            $movedPeople[] = [$previous, $person];
        }
    }
    if (!$movedPeople) {
        return ['state' => $nextState, 'taskIds' => [], 'activityIds' => [], 'stoppedSeriesCount' => 0, 'stoppedOccurrences' => 0];
    }

    $taskIds = [];
    $activityIds = [];
    $stoppedSeriesCount = 0;
    $stoppedOccurrences = 0;
    foreach ($movedPeople as [$previous, $person]) {
        $personId = (string) $person['id'];
        $previousDepartment = $departments[(string) ($previous['departmentId'] ?? '')] ?? 'phòng cũ';
        $nextDepartment = $departments[(string) ($person['departmentId'] ?? '')] ?? 'phòng mới';
        $reason = 'nhân sự ' . (string) ($person['name'] ?? 'được giao') . ' chuyển từ ' . $previousDepartment . ' sang ' . $nextDepartment;
        $sources = [];
        foreach (($nextState['tasks'] ?? []) as $task) {
            if (!is_array($task) || !empty($task['recurrenceSourceId']) || !phpTaskHasRecurrence($task) || !empty($task['recurrenceStoppedAt'])) continue;
            $kind = strtolower(trim((string) ($task['kind'] ?? $task['taskKind'] ?? '')));
            if ($kind === 'assigned' || ($kind === '' && (!empty($task['assignedById']) || !empty($task['assignedAt']) || !empty($task['responseStatus']) || !empty($task['responseAt'])))) continue;
            $responsible = phpTaskResponsiblePerson($nextState, $task, $today) ?? phpTaskPersonForReference($nextState, (string) ($task['ownerId'] ?? ''));
            if ((string) ($responsible['id'] ?? '') === $personId) $sources[] = $task;
        }
        foreach ($sources as $source) {
            $result = stopRecurringTaskInState($nextState, $actor, (string) ($source['id'] ?? ''), $reason);
            if (isset($result['error'])) continue;
            $nextState = $result['state'];
            $seriesKey = phpTaskRecurrenceSeriesKey($source);
            foreach (($nextState['tasks'] ?? []) as $task) {
                if (is_array($task) && phpTaskRecurrenceSeriesKey($task) === $seriesKey) $taskIds[] = (string) ($task['id'] ?? '');
            }
            $activityLog = $nextState['activityLog'] ?? [];
            $activity = is_array($activityLog) && $activityLog ? $activityLog[array_key_last($activityLog)] : null;
            if (is_array($activity) && !empty($activity['id'])) $activityIds[] = (string) $activity['id'];
            $stoppedSeriesCount++;
            $stoppedOccurrences += (int) ($result['stoppedOccurrences'] ?? 0);
        }
    }
    return [
        'state' => $nextState,
        'taskIds' => array_values(array_unique(array_filter($taskIds))),
        'activityIds' => $activityIds,
        'stoppedSeriesCount' => $stoppedSeriesCount,
        'stoppedOccurrences' => $stoppedOccurrences,
    ];
}

function respond(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function readJsonBody(): array
{
    $raw = file_get_contents('php://input');
    $decoded = json_decode($raw ?: '{}', true);
    return is_array($decoded) ? $decoded : [];
}

function defaultState(): array
{
    $bootstrapUsername = trim((string) getenv('KPI_BOOTSTRAP_ADMIN_USERNAME'));
    $bootstrapPassword = (string) getenv('KPI_BOOTSTRAP_ADMIN_PASSWORD');
    $accounts = ($bootstrapUsername !== '' && $bootstrapPassword !== '')
        ? [[
            'id' => 'account-admin',
            'username' => $bootstrapUsername,
            'password' => $bootstrapPassword,
            'passwordChangeRequired' => false,
            'displayName' => 'Admin tong hop',
            'role' => 'admin',
            'personId' => '',
            'departmentId' => '',
        ]]
        : [];

    return [
        'activePeriod' => gmdate('Y-m'),
        'people' => [],
        'tasks' => [],
        'gpmbWorkflows' => [],
        'gpmbCases' => [],
        'publicInvestmentAppraisals' => [],
        'calendarEvents' => [],
        'projectCatalog' => [],
        'bulletins' => [],
        'archiveRecords' => [],
        'evaluations' => [],
        'departmentEvaluations' => [],
        'accounts' => $accounts,
        'moduleSettings' => [],
        'systemCustomization' => [],
        'activityLog' => [],
        'importedPeopleVersion' => '',
        'canBoGpmbKpiCatalogVersion' => '',
        'nhanVienTongHopGpmbKpiCatalogVersion' => '',
        'sectionHeadKpiCatalogVersion' => '',
        'personalKpiClassificationVersion' => '',
    ];
}

function readSnapshot(string $stateFile): array
{
    if (!is_file($stateFile)) {
        return ['revision' => 0, 'updatedAt' => '', 'state' => defaultState()];
    }

    $raw = file_get_contents($stateFile);
    $snapshot = json_decode($raw ?: '', true);
    if (!is_array($snapshot) || !is_array($snapshot['state'] ?? null)) {
        return ['revision' => 0, 'updatedAt' => '', 'state' => defaultState()];
    }

    return [
        'revision' => max(0, (int) ($snapshot['revision'] ?? 0)),
        'updatedAt' => (string) ($snapshot['updatedAt'] ?? ''),
        'state' => $snapshot['state'],
    ];
}

function writeSnapshot(string $stateFile, array $snapshot): void
{
    if (is_array($snapshot['state']['tasks'] ?? null)) {
        $retiredTaskIds = [];
        foreach ($snapshot['state']['tasks'] as $task) {
            if (!is_array($task)) {
                continue;
            }
            $kind = strtolower(trim((string) ($task['kind'] ?? $task['taskKind'] ?? '')));
            if ($kind === 'assigned' || ($kind === '' && (!empty($task['assignedById']) || !empty($task['assignedAt']) || !empty($task['responseStatus']) || !empty($task['responseAt'])))) {
                $retiredTaskIds[] = (string) ($task['id'] ?? '');
            }
        }
        $snapshot['state']['tasks'] = array_values(array_filter($snapshot['state']['tasks'], static function ($task): bool {
            if (!is_array($task)) {
                return false;
            }
            $kind = strtolower(trim((string) ($task['kind'] ?? $task['taskKind'] ?? '')));
            return $kind !== 'assigned' && !($kind === '' && (!empty($task['assignedById']) || !empty($task['assignedAt']) || !empty($task['responseStatus']) || !empty($task['responseAt'])));
        }));
        if ($retiredTaskIds && is_array($snapshot['state']['activityLog'] ?? null)) {
            $snapshot['state']['activityLog'] = array_values(array_filter($snapshot['state']['activityLog'], static function ($entry) use ($retiredTaskIds): bool {
                return !is_array($entry) || !in_array((string) ($entry['targetId'] ?? ''), $retiredTaskIds, true);
            }));
        }
    }
    $encoded = json_encode($snapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if ($encoded === false) {
        throw new RuntimeException('Cannot encode state.');
    }
    $tempFile = $stateFile . '.' . bin2hex(random_bytes(6)) . '.tmp';
    if (file_put_contents($tempFile, $encoded, LOCK_EX) === false || !@rename($tempFile, $stateFile)) {
        @unlink($tempFile);
        throw new RuntimeException('Cannot write state.');
    }
    @chmod($stateFile, 0660);
}

function validState(array $state): bool
{
    // projectCatalog is optional for snapshots created before this field was added.
    foreach (['people', 'tasks', 'bulletins', 'archiveRecords', 'evaluations', 'departmentEvaluations', 'accounts', 'activityLog'] as $key) {
        if (!array_key_exists($key, $state) || !is_array($state[$key])) {
            return false;
        }
    }
    return true;
}

function isAdminAccount(array $account): bool
{
    return strtolower(trim((string) ($account['role'] ?? ''))) === 'admin';
}

function stateRecordCount(array $state, string $key): int
{
    return is_array($state[$key] ?? null) ? count($state[$key]) : 0;
}

function isViableInitialState(array $state): bool
{
    if (!validState($state)) {
        return false;
    }
    $businessCount = 0;
    foreach (['people', 'tasks', 'bulletins', 'archiveRecords', 'evaluations', 'departmentEvaluations'] as $key) {
        $businessCount += stateRecordCount($state, $key);
    }
    return $businessCount > 0 && stateRecordCount($state, 'accounts') > 0;
}

function stateReplacementRemovesUnsafeAmountOfData(array $current, array $next): bool
{
    $protected = ['people', 'tasks', 'gpmbWorkflows', 'gpmbCases', 'publicInvestmentAppraisals', 'bulletins', 'archiveRecords', 'evaluations', 'departmentEvaluations', 'accounts'];
    $critical = ['people', 'tasks', 'accounts'];
    $currentTotal = 0;
    $nextTotal = 0;

    foreach ($protected as $key) {
        $before = stateRecordCount($current, $key);
        $after = stateRecordCount($next, $key);
        $currentTotal += $before;
        $nextTotal += $after;
        if (in_array($key, $critical, true) && $before > 0 && $after === 0) {
            return true;
        }
        if ($before >= 5 && $after < $before * 0.65) {
            return true;
        }
    }

    return $currentTotal >= 5 && $nextTotal < $currentTotal * 0.65;
}

function accountByUsername(array $state, string $username): ?array
{
    $normalizedUsername = strtolower(trim($username));
    foreach (($state['accounts'] ?? []) as $account) {
        if (is_array($account) && hash_equals(strtolower(trim((string) ($account['username'] ?? ''))), $normalizedUsername)) {
            return $account;
        }
    }
    return null;
}

function hasPasswordHash(array $account): bool
{
    return (string) ($account['passwordAlgorithm'] ?? '') === PASSWORD_HASH_ALGORITHM
        && (string) ($account['passwordHash'] ?? '') !== ''
        && (string) ($account['passwordSalt'] ?? '') !== '';
}

function passwordHashBytes(string $password, string $salt): string
{
    return hash_pbkdf2('sha256', $password, $salt, PASSWORD_HASH_ITERATIONS, PASSWORD_HASH_BYTES, true);
}

function accountPasswordMatches(array $account, string $password): bool
{
    if ($password === '' || strlen($password) > 512) {
        return false;
    }
    if (!hasPasswordHash($account)) {
        return hash_equals((string) ($account['password'] ?? ''), $password);
    }
    $salt = base64_decode((string) $account['passwordSalt'], true);
    $expected = base64_decode((string) $account['passwordHash'], true);
    if (!is_string($salt) || !is_string($expected) || strlen($salt) < PASSWORD_SALT_BYTES || strlen($expected) !== PASSWORD_HASH_BYTES) {
        return false;
    }
    return hash_equals($expected, passwordHashBytes($password, $salt));
}

function setAccountPasswordCredential(array &$account, string $password): void
{
    if ($password === '' || strlen($password) > 512) {
        throw new InvalidArgumentException('A valid password is required.');
    }
    $salt = random_bytes(PASSWORD_SALT_BYTES);
    $account['passwordAlgorithm'] = PASSWORD_HASH_ALGORITHM;
    $account['passwordSalt'] = base64_encode($salt);
    $account['passwordHash'] = base64_encode(passwordHashBytes($password, $salt));
    unset($account['password']);
    $account['passwordChangeRequired'] = false;
}

function sanitizedAccount(array $account): array
{
    unset($account['password'], $account['passwordAlgorithm'], $account['passwordSalt'], $account['passwordHash']);
    return $account;
}

function sanitizedState(array $state): array
{
    $output = $state;
    $output['accounts'] = array_values(array_map(static function ($account): array {
        return is_array($account) ? sanitizedAccount($account) : [];
    }, $state['accounts'] ?? []));
    return $output;
}

function mergeAccountCredentials(array $currentState, array $nextState): array
{
    $previousById = [];
    foreach (($currentState['accounts'] ?? []) as $account) {
        if (is_array($account) && (string) ($account['id'] ?? '') !== '') {
            $previousById[(string) $account['id']] = $account;
        }
    }

    foreach (($nextState['accounts'] ?? []) as $index => $account) {
        if (!is_array($account)) {
            continue;
        }
        $id = (string) ($account['id'] ?? '');
        $previous = $previousById[$id] ?? null;
        $requestedPassword = (string) ($account['password'] ?? '');
        unset($account['passwordAlgorithm'], $account['passwordSalt'], $account['passwordHash']);
        if ($requestedPassword !== '') {
            setAccountPasswordCredential($account, $requestedPassword);
        } elseif (is_array($previous) && hasPasswordHash($previous)) {
            unset($account['password']);
            $account['passwordAlgorithm'] = $previous['passwordAlgorithm'];
            $account['passwordSalt'] = $previous['passwordSalt'];
            $account['passwordHash'] = $previous['passwordHash'];
        } elseif (is_array($previous) && (string) ($previous['password'] ?? '') !== '') {
            setAccountPasswordCredential($account, (string) $previous['password']);
        } elseif ($previous === null) {
            setAccountPasswordCredential($account, '123456');
        }
        $account['passwordChangeRequired'] = false;
        $nextState['accounts'][$index] = $account;
    }
    return $nextState;
}

function migrateLegacyAccountPassword(string $stateFile, string $lockFile, string $accountId, string $password): array
{
    $lock = fopen($lockFile, 'c+');
    if ($lock === false || !flock($lock, LOCK_EX)) {
        throw new RuntimeException('Cannot lock shared state.');
    }
    try {
        $snapshot = readSnapshot($stateFile);
        foreach (($snapshot['state']['accounts'] ?? []) as $index => $account) {
            if (!is_array($account) || (string) ($account['id'] ?? '') !== $accountId) {
                continue;
            }
            if (hasPasswordHash($account)) {
                return $snapshot;
            }
            if (!accountPasswordMatches($account, $password)) {
                throw new RuntimeException('Credential changed before migration.');
            }
            setAccountPasswordCredential($account, $password);
            $snapshot['state']['accounts'][$index] = $account;
            $snapshot['revision'] = max(0, (int) $snapshot['revision']) + 1;
            $snapshot['updatedAt'] = gmdate('c');
            writeSnapshot($stateFile, $snapshot);
            return $snapshot;
        }
        throw new RuntimeException('Authentication required.');
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}

function requireSessionAccount(string $stateFile): array
{
    $snapshot = readSnapshot($stateFile);
    return requireSessionAccountFromState($snapshot['state']);
}

function requireSessionAccountFromState(array $state): array
{
    $accountId = (string) ($_SESSION['accountId'] ?? '');
    foreach (($state['accounts'] ?? []) as $account) {
        if (is_array($account) && hash_equals((string) ($account['id'] ?? ''), $accountId)) {
            return $account;
        }
    }
    respond(['error' => 'Authentication required.'], 401);
}

function safeFileKey(string $key): string
{
    $key = trim($key);
    return preg_match('/^[A-Za-z0-9_-]{4,180}$/', $key) ? $key : '';
}

function remoteFilePath(string $filesDirectory, string $key): string
{
    return $filesDirectory . DIRECTORY_SEPARATOR . hash('sha256', $key) . '.bin';
}
