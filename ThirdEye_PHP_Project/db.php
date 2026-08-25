<?php
// Starthost Database Configuration
$host = 'sdb-70.hosting.stackcp.net';
$dbname = 'third_eye-35303533177a'; // Update with your Starthost Database Name
$username = 'third_eye';      // Update with your Starthost Database User
$password = '$v3F~=GqP*:j';          // Update with your Starthost Database Password

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch(PDOException $e) {
    die("Database Connection Failed: " . $e->getMessage());
}

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
?>
