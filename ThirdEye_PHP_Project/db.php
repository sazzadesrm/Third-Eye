<?php
// Starthost Database Configuration
$host = 'localhost';
$dbname = 'thirdeye_db'; // Update with your Starthost Database Name
$username = 'root';      // Update with your Starthost Database User
$password = '';          // Update with your Starthost Database Password

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
