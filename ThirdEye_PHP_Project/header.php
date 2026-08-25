<?php
if (session_status() === PHP_SESSION_NONE) { session_start(); }
if (!isset($_SESSION['user_id'])) { header("Location: login.php"); exit; }
$current_page = basename($_SERVER['PHP_SELF']);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Third Eye System</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-slate-50 flex h-screen overflow-hidden text-slate-900">
    
    <!-- Sidebar -->
    <aside class="w-64 bg-slate-900 text-white flex flex-col hidden md:flex h-full">
        <div class="h-16 flex items-center px-6 border-b border-slate-800">
            <span class="text-xl font-bold tracking-tight">Third Eye</span>
        </div>
        <nav class="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            <a href="index.php" class="flex items-center px-4 py-2.5 rounded-lg <?= $current_page == 'index.php' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white' ?> transition-colors">
                <i class="fas fa-home w-5 mr-3"></i> <span class="font-medium text-sm">Dashboard</span>
            </a>
            <a href="invoices.php" class="flex items-center px-4 py-2.5 rounded-lg <?= ($current_page == 'invoices.php' || $current_page == 'create.php') ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white' ?> transition-colors">
                <i class="fas fa-file-invoice-dollar w-5 mr-3"></i> <span class="font-medium text-sm">Invoices & MRAs</span>
            </a>
            <a href="master_data.php" class="flex items-center px-4 py-2.5 rounded-lg <?= $current_page == 'master_data.php' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white' ?> transition-colors">
                <i class="fas fa-database w-5 mr-3"></i> <span class="font-medium text-sm">Master Data</span>
            </a>
            <a href="audit.php" class="flex items-center px-4 py-2.5 rounded-lg <?= $current_page == 'audit.php' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white' ?> transition-colors">
                <i class="fas fa-history w-5 mr-3"></i> <span class="font-medium text-sm">Audit Trail</span>
            </a>
            <a href="settings.php" class="flex items-center px-4 py-2.5 rounded-lg <?= $current_page == 'settings.php' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white' ?> transition-colors">
                <i class="fas fa-cog w-5 mr-3"></i> <span class="font-medium text-sm">Settings</span>
            </a>
        </nav>
        <div class="p-4 border-t border-slate-800 text-xs text-slate-500">
            &copy; 2026 WHIPLC Third Eye
        </div>
    </aside>

    <!-- Main Wrapper -->
    <div class="flex-1 flex flex-col h-screen overflow-hidden">
        
        <!-- Header -->
        <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10">
            <div class="flex items-center gap-4">
                <button class="md:hidden text-slate-500 hover:text-slate-700">
                    <i class="fas fa-bars text-xl"></i>
                </button>
            </div>
            <div class="flex items-center gap-4">
                <span class="text-sm font-medium text-slate-700"><?= htmlspecialchars($_SESSION['name']) ?> <span class="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded ml-1"><?= htmlspecialchars($_SESSION['role']) ?></span></span>
                <a href="logout.php" class="text-slate-500 hover:text-red-600 px-3 py-1.5 rounded-md transition-colors text-sm font-medium"><i class="fas fa-sign-out-alt mr-1"></i> Logout</a>
            </div>
        </header>

        <!-- Page Content -->
        <main class="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-6 md:p-8">
