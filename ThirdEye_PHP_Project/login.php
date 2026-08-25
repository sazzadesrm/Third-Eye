<?php
require 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = $_POST['email'] ?? '';
    $pass = $_POST['password'] ?? '';
    
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if ($user && password_verify($pass, $user['password'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['name'] = $user['name'];
        header("Location: index.php");
        exit;
    } else {
        $error = "Invalid email or password.";
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Third Eye System</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 flex items-center justify-center h-screen">
    <div class="bg-white p-8 rounded-xl shadow-sm border border-slate-200 w-full max-w-md">
        <div class="text-center mb-8">
            <h1 class="text-2xl font-bold text-slate-900">Third Eye</h1>
            <p class="text-slate-500 text-sm mt-1">Sign in to your account</p>
        </div>
        
        <?php if(isset($error)): ?>
            <div class="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4"><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>
        
        <form method="POST">
            <div class="mb-4">
                <label class="block text-slate-700 text-sm font-medium mb-2">Email Address</label>
                <input type="email" name="email" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" required value="admin@whiplc.com">
            </div>
            <div class="mb-6">
                <label class="block text-slate-700 text-sm font-medium mb-2">Password</label>
                <input type="password" name="password" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" required value="password">
            </div>
            <button type="submit" class="w-full bg-blue-600 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors">Sign In</button>
        </form>
    </div>
</body>
</html>
