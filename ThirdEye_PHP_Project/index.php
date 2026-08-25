<?php
require 'db.php';
if (!isset($_SESSION['user_id'])) { header("Location: login.php"); exit; }

// Fetch recent MRA forms
$stmt = $pdo->query("SELECT m.*, u.name as preparer_name FROM mraforms m LEFT JOIN users u ON m.prepared_by = u.id ORDER BY m.created_at DESC LIMIT 20");
$invoices = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Third Eye</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen">
    <!-- Navbar -->
    <nav class="bg-slate-900 text-white shadow-md">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16 items-center">
                <div class="flex-shrink-0 font-bold text-xl tracking-tight">Third Eye</div>
                <div class="flex items-center space-x-4">
                    <span class="text-sm text-slate-300">Welcome, <?= htmlspecialchars($_SESSION['name']) ?> (<?= htmlspecialchars($_SESSION['role']) ?>)</span>
                    <a href="logout.php" class="text-sm bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-md transition-colors">Logout</a>
                </div>
            </div>
        </div>
    </nav>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="flex justify-between items-end mb-6">
            <div>
                <h2 class="text-2xl font-bold text-slate-900">Invoices & MRAs</h2>
                <p class="text-slate-500 text-sm mt-1">Manage all your miscellaneous expense requisitions.</p>
            </div>
            <a href="create.php" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">+ Create MRA</a>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-slate-200">
                    <thead class="bg-slate-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Invoice No.</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Prepared By</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-slate-200">
                        <?php foreach($invoices as $inv): ?>
                        <tr class="hover:bg-slate-50 transition-colors">
                            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900"><?= htmlspecialchars($inv['invoice_number']) ?></td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500"><?= htmlspecialchars($inv['date']) ?></td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900">৳<?= number_format($inv['amount'], 2) ?></td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500"><?= htmlspecialchars($inv['preparer_name'] ?? 'System') ?></td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm">
                                <span class="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-800">
                                    <?= htmlspecialchars($inv['status']) ?>
                                </span>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                        <?php if(count($invoices) === 0): ?>
                        <tr><td colspan="5" class="px-6 py-8 text-center text-slate-500">No MRA records found. Create one to get started.</td></tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </main>
</body>
</html>
