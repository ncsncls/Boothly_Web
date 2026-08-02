<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../database/connection.php';

function json_out(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function request_data(): array
{
    $body = file_get_contents('php://input');
    $json = json_decode($body ?: '', true);
    if (is_array($json)) {
        return $json;
    }
    return $_POST ?: [];
}

function generate_room_code(PDO $pdo): string
{
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    for ($attempt = 0; $attempt < 25; $attempt++) {
        $code = '';
        for ($index = 0; $index < 5; $index++) {
            $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }

        $stmt = $pdo->prepare('SELECT 1 FROM photobooth_rooms WHERE room_code = ? LIMIT 1');
        $stmt->execute([$code]);
        if (!$stmt->fetchColumn()) {
            return $code;
        }
    }

    throw new RuntimeException('Unable to generate a unique room code.');
}

function fetch_room_by_code(PDO $pdo, string $code): ?array
{
    $stmt = $pdo->prepare('
        SELECT id, room_code, room_mode, host_peer_id, guest_peer_id, host_joined_at, guest_joined_at, created_at, updated_at
        FROM photobooth_rooms
        WHERE room_code = ?
        LIMIT 1
    ');
    $stmt->execute([$code]);
    $room = $stmt->fetch();
    return $room ?: null;
}

function ensure_room(PDO $pdo, string $code, string $mode = 'ldr'): array
{
    $room = fetch_room_by_code($pdo, $code);
    if ($room) {
        return $room;
    }

    $stmt = $pdo->prepare('INSERT INTO photobooth_rooms (room_code, room_mode) VALUES (?, ?)');
    $stmt->execute([$code, $mode === 'together' ? 'together' : 'ldr']);

    $room = fetch_room_by_code($pdo, $code);
    if (!$room) {
        throw new RuntimeException('Unable to create room.');
    }

    return $room;
}

function record_participant(PDO $pdo, int $roomId, string $role, string $peerId): void
{
    $stmt = $pdo->prepare('
        INSERT INTO photobooth_room_participants (room_id, role, peer_id)
        VALUES (?, ?, ?)
    ');
    $stmt->execute([$roomId, $role === 'guest' ? 'guest' : 'host', $peerId]);
}

function respond_room(PDO $pdo, string $code): void
{
    $room = fetch_room_by_code($pdo, $code);
    if (!$room) {
        json_out(['ok' => false, 'message' => 'Room not found.'], 404);
    }
    json_out(['ok' => true, 'room' => $room]);
}

function fetch_capture_by_token(PDO $pdo, string $token): ?array
{
    $stmt = $pdo->prepare('
        SELECT
            c.id,
            c.room_id,
            r.room_code,
            c.capture_token,
            c.capture_type,
            c.title,
            c.theme,
            c.strip_url,
            c.shots_json,
            c.options_json,
            c.created_at
        FROM photobooth_captures c
        INNER JOIN photobooth_rooms r ON r.id = c.room_id
        WHERE c.capture_token = ?
        LIMIT 1
    ');
    $stmt->execute([$token]);
    $capture = $stmt->fetch();
    return $capture ?: null;
}

function store_capture(PDO $pdo, array $input): void
{
    $code = strtoupper(trim((string)($input['room_code'] ?? '')));
    if (!preg_match('/^[A-Z0-9]{5}$/', $code)) {
        json_out(['ok' => false, 'message' => 'Room code is required.'], 422);
    }

    $captureUrl = trim((string)($input['strip_url'] ?? ''));
    if ($captureUrl === '') {
        json_out(['ok' => false, 'message' => 'Capture image is required.'], 422);
    }

    $room = ensure_room($pdo, $code, (string)($input['room_mode'] ?? 'ldr'));
    $token = trim((string)($input['capture_token'] ?? '')) ?: bin2hex(random_bytes(16));
    $title = trim((string)($input['title'] ?? 'Boothly')) ?: 'Boothly';
    $theme = trim((string)($input['theme'] ?? 'cream')) ?: 'cream';
    $captureType = trim((string)($input['capture_type'] ?? 'single')) === 'strip' ? 'strip' : 'single';
    $shotsJson = array_key_exists('shots', $input) ? json_encode($input['shots'], JSON_UNESCAPED_SLASHES) : null;
    $optionsJson = array_key_exists('options', $input) ? json_encode($input['options'], JSON_UNESCAPED_SLASHES) : null;

    $stmt = $pdo->prepare('
        INSERT INTO photobooth_captures (
            room_id,
            capture_token,
            capture_type,
            title,
            theme,
            strip_url,
            shots_json,
            options_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            room_id = VALUES(room_id),
            capture_type = VALUES(capture_type),
            title = VALUES(title),
            theme = VALUES(theme),
            strip_url = VALUES(strip_url),
            shots_json = VALUES(shots_json),
            options_json = VALUES(options_json)
    ');
    $stmt->execute([
        (int)$room['id'],
        $token,
        $captureType,
        $title,
        $theme,
        $captureUrl,
        $shotsJson,
        $optionsJson,
    ]);

    $id = (int)$pdo->lastInsertId();
    if ($id === 0) {
      $lookup = $pdo->prepare('SELECT id FROM photobooth_captures WHERE capture_token = ? LIMIT 1');
      $lookup->execute([$token]);
      $id = (int)($lookup->fetchColumn() ?: 0);
    }

    json_out([
        'ok' => true,
        'capture' => [
            'id' => $id,
            'capture_token' => $token,
            'room_code' => $code,
            'capture_type' => $captureType,
            'title' => $title,
            'theme' => $theme,
            'strip_url' => $captureUrl,
        ],
    ], 201);
}

try {
    $pdo = boothly_db();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $action = $_GET['action'] ?? $_POST['action'] ?? '';
    $input = request_data();

    if ($method === 'GET' && $action === 'health') {
        json_out(['ok' => true]);
    }

    if ($method === 'POST' && $action === 'create') {
        $mode = ($input['room_mode'] ?? 'ldr') === 'together' ? 'together' : 'ldr';
        $code = generate_room_code($pdo);

        $stmt = $pdo->prepare('INSERT INTO photobooth_rooms (room_code, room_mode) VALUES (?, ?)');
        $stmt->execute([$code, $mode]);

        json_out([
            'ok' => true,
            'room' => [
                'room_code' => $code,
                'room_mode' => $mode,
            ],
        ]);
    }

    if ($method === 'POST' && $action === 'claim-host') {
        $code = strtoupper(trim((string)($input['room_code'] ?? '')));
        $peerId = trim((string)($input['peer_id'] ?? ''));
        if (!preg_match('/^[A-Z0-9]{5}$/', $code) || $peerId === '') {
            json_out(['ok' => false, 'message' => 'Room code and peer id are required.'], 422);
        }

        $stmt = $pdo->prepare('
            UPDATE photobooth_rooms
            SET host_peer_id = ?, host_joined_at = COALESCE(host_joined_at, NOW())
            WHERE room_code = ?
        ');
        $stmt->execute([$peerId, $code]);

        $room = fetch_room_by_code($pdo, $code);
        if ($room) {
            record_participant($pdo, (int)$room['id'], 'host', $peerId);
        }

        respond_room($pdo, $code);
    }

    if ($method === 'POST' && $action === 'claim-guest') {
        $code = strtoupper(trim((string)($input['room_code'] ?? '')));
        $peerId = trim((string)($input['peer_id'] ?? ''));
        if (!preg_match('/^[A-Z0-9]{5}$/', $code) || $peerId === '') {
            json_out(['ok' => false, 'message' => 'Room code and peer id are required.'], 422);
        }

        $stmt = $pdo->prepare('
            UPDATE photobooth_rooms
            SET guest_peer_id = ?, guest_joined_at = COALESCE(guest_joined_at, NOW())
            WHERE room_code = ?
        ');
        $stmt->execute([$peerId, $code]);

        $room = fetch_room_by_code($pdo, $code);
        if ($room) {
            record_participant($pdo, (int)$room['id'], 'guest', $peerId);
        }

        respond_room($pdo, $code);
    }

    if ($method === 'POST' && $action === 'capture') {
        store_capture($pdo, $input);
    }

    if ($method === 'POST' && $action === 'join') {
        $code = strtoupper(trim((string)($input['room_code'] ?? '')));
        if (!preg_match('/^[A-Z0-9]{5}$/', $code)) {
            json_out(['ok' => false, 'message' => 'Enter a valid 5-character code.'], 422);
        }

        respond_room($pdo, $code);
    }

    if ($method === 'GET' && $action === 'room') {
        $code = strtoupper(trim((string)($_GET['room_code'] ?? '')));
        if (!preg_match('/^[A-Z0-9]{5}$/', $code)) {
            json_out(['ok' => false, 'message' => 'Enter a valid 5-character code.'], 422);
        }

        respond_room($pdo, $code);
    }

    if ($method === 'GET' && $action === 'capture') {
        $token = trim((string)($_GET['capture_token'] ?? ''));
        if ($token === '') {
            json_out(['ok' => false, 'message' => 'Capture token is required.'], 422);
        }

        $capture = fetch_capture_by_token($pdo, $token);
        if (!$capture) {
            json_out(['ok' => false, 'message' => 'Capture not found.'], 404);
        }

        json_out(['ok' => true, 'capture' => $capture]);
    }

    json_out(['ok' => false, 'message' => 'Unsupported request.'], 400);
} catch (Throwable $e) {
    json_out([
        'ok' => false,
        'message' => 'Database connection failed.',
        'error' => $e->getMessage(),
    ], 500);
}
