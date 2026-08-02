<?php
declare(strict_types=1);

function boothly_db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $host = getenv('BOOTHLY_DB_HOST') ?: '127.0.0.1';
    $name = getenv('BOOTHLY_DB_NAME') ?: 'boothly';
    $user = getenv('BOOTHLY_DB_USER') ?: 'root';
    $pass = getenv('BOOTHLY_DB_PASS') ?: 'password';
    $port = getenv('BOOTHLY_DB_PORT') ?: '3306';

    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $name);

    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}
