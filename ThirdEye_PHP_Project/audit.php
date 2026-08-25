<?php
require 'db.php';
require 'header.php';

$stmt = $pdo->query("
    SELECT a.*, m.invoice_number, u.name as user_name, u.role as user_role 
    FROM audit_logs a 
    LEFT JOIN mraforms m ON a.mra_id = m.id 
    LEFT JOIN users u ON a.user_id = u.id 
    ORDER BY a.created_at DESC 
    LIMIT 100
");
$logs = $stmt->fetchAll();
?>

<div class="mb-6">
    <h1 class="text-2xl font-bold text-slate-900">System Audit Trail</h1>
    <p class="text-slate-500 text-sm mt-1">Immutable log of all workflow actions and modifications.</p>
</div>

<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
    <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200">
            <thead class="bg-slate-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice Ref</th>
                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status Change</th>
                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Comments</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-slate-200">
                <?php foreach($logs as $log): ?>
                <tr class="hover:bg-slate-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500"><?= htmlspecialchars($log['created_at']) ?></td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-slate-900"><?= htmlspecialchars($log['user_name'] ?? 'System') ?></div>
                        <div class="text-xs text-slate-400"><?= htmlspecialchars($log['user_role'] ?? '') ?></div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        <a href="voucher.php?id=<?= $log['mra_id'] ?>"><?= htmlspecialchars($log['invoice_number'] ?? 'N/A') ?></a>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        <span class="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium"><?= htmlspecialchars($log['action']) ?></span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <?php if($log['from_status']): ?>
                            <?= htmlspecialchars($log['from_status']) ?> &rarr; <span class="font-medium text-slate-900"><?= htmlspecialchars($log['to_status']) ?></span>
                        <?php else: ?>
                            <span class="font-medium text-slate-900"><?= htmlspecialchars($log['to_status']) ?></span>
                        <?php endif; ?>
                    </td>
                    <td class="px-6 py-4 text-sm text-slate-600 max-w-xs truncate" title="<?= htmlspecialchars($log['comments']) ?>">
                        <?= htmlspecialchars($log['comments']) ?>
                    </td>
                </tr>
                <?php endforeach; ?>
                <?php if(empty($logs)): ?>
                    <tr><td colspan="6" class="px-6 py-8 text-center text-slate-500">No audit logs found.</td></tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>

<?php require 'footer.php'; ?>
