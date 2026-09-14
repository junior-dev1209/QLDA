<?php
declare(strict_types=1);

const PASSWORD_HASH_ALGORITHM = 'pbkdf2-sha256-v1';
const PASSWORD_HASH_ITERATIONS = 310000;
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_HASH_BYTES = 32;

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
            $nextSnapshot = [
                'revision' => $current['revision'] + 1,
                'updatedAt' => gmdate('c'),
                'state' => $nextState,
            ];
            writeSnapshot($stateFile, $nextSnapshot);
            $responsePayload = [
                'revision' => $nextSnapshot['revision'],
                'updatedAt' => $nextSnapshot['updatedAt'],
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
    $protected = ['people', 'tasks', 'bulletins', 'archiveRecords', 'evaluations', 'departmentEvaluations', 'accounts'];
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
    if ($password === '' || strlen($password) > 256) {
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
    if ($password === '' || strlen($password) > 256) {
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
