<?php
require 'db.php';
require 'header.php';

// Fetch KPIs
$total_disbursed = $pdo->query("SELECT SUM(amount) FROM mraforms WHERE status IN ('Approved', 'Received')")->fetchColumn() ?: 0;
$pending_verify = $pdo->query("SELECT COUNT(*) FROM mraforms WHERE status = 'Submitted'")->fetchColumn() ?: 0;
$pending_approve = $pdo->query("SELECT COUNT(*) FROM mraforms WHERE status = 'Verified'")->fetchColumn() ?: 0;
$total_mras = $pdo->query("SELECT COUNT(*) FROM mraforms")->fetchColumn() ?: 0;

// Fetch Recent Activity
$recent = $pdo->query("SELECT m.*, u.name as preparer_name, c.name as concern_person_name FROM mraforms m LEFT JOIN users u ON m.prepared_by = u.id LEFT JOIN concernpersons c ON m.concern_person_id = c.id ORDER BY m.created_at DESC LIMIT 5")->fetchAll();

?>
<div class="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
    <div>
        <h1 class="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p class="text-slate-500 text-sm mt-1">Overview of miscellaneous expenses and approvals.</p>
    </div>
    <a href="create.php" class="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors shadow-sm inline-flex items-center">
        <i class="fas fa-plus mr-2"></i> Create MRA
    </a>
</div>

<!-- KPI Cards -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-slate-500 text-sm font-medium">Total Disbursed</h3>
            <div class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><i class="fas fa-money-bill-wave"></i></div>
        </div>
        <p class="text-2xl font-bold text-slate-900 mt-auto">৳<?= number_format($total_disbursed, 2) ?></p>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-slate-500 text-sm font-medium">Pending Verification</h3>
            <div class="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600"><i class="fas fa-clipboard-check"></i></div>
        </div>
        <p class="text-2xl font-bold text-slate-900 mt-auto"><?= $pending_verify ?></p>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-slate-500 text-sm font-medium">Pending Approval</h3>
            <div class="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600"><i class="fas fa-stamp"></i></div>
        </div>
        <p class="text-2xl font-bold text-slate-900 mt-auto"><?= $pending_approve ?></p>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-slate-500 text-sm font-medium">Total MRAs</h3>
            <div class="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><i class="fas fa-file-invoice"></i></div>
        </div>
        <p class="text-2xl font-bold text-slate-900 mt-auto"><?= $total_mras ?></p>
    </div>
</div>

<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div class="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200">
        <div class="px-6 py-5 border-b border-slate-200">
            <h3 class="font-bold text-slate-900">Recent Invoices</h3>
        </div>
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-200">
                <thead class="bg-slate-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Invoice No.</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Concern Person</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-slate-100">
                    <?php foreach($recent as $r): ?>
                    <tr class="hover:bg-slate-50">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <a href="voucher.php?id=<?= $r['id'] ?>" class="text-blue-600 hover:text-blue-800"><?= htmlspecialchars($r['invoice_number']) ?></a>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500"><?= htmlspecialchars($r['date']) ?></td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500"><?= htmlspecialchars($r['concern_person_name'] ?? 'N/A') ?></td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">৳<?= number_format($r['amount'], 2) ?></td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                            <?php
                            $colors = [
                                'Draft' => 'bg-slate-100 text-slate-700',
                                'Submitted' => 'bg-blue-50 text-blue-700',
                                'Verified' => 'bg-purple-50 text-purple-700',
                                'Approved' => 'bg-emerald-50 text-emerald-700',
                                'Received' => 'bg-emerald-100 text-emerald-800',
                                'Returned' => 'bg-amber-50 text-amber-700',
                                'Rejected' => 'bg-red-50 text-red-700'
                            ];
                            $c = $colors[$r['status']] ?? 'bg-slate-100 text-slate-700';
                            ?>
                            <span class="px-2.5 py-1 inline-flex text-xs font-semibold rounded-full <?= $c ?>"><?= htmlspecialchars($r['status']) ?></span>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                    <?php if(empty($recent)): ?>
                        <tr><td colspan="5" class="px-6 py-8 text-center text-slate-500 text-sm">No recent activity.</td></tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
        <div class="px-6 py-4 border-t border-slate-200">
            <a href="invoices.php" class="text-sm font-medium text-blue-600 hover:text-blue-800">View all invoices &rarr;</a>
        </div>
    </div>

    <!-- Quick Actions Sidebar -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-200">
        <div class="px-6 py-5 border-b border-slate-200">
            <h3 class="font-bold text-slate-900">Quick Actions</h3>
        </div>
        <div class="p-6 space-y-4">
            <a href="create.php" class="flex items-center p-4 bg-slate-50 border border-slate-100 hover:bg-blue-50 hover:border-blue-100 rounded-xl transition-all group">
                <div class="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-blue-600 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <i class="fas fa-file-signature"></i>
                </div>
                <div class="ml-4">
                    <p class="text-sm font-bold text-slate-900">New Requisition</p>
                    <p class="text-xs text-slate-500 mt-0.5">Draft a new MRA form</p>
                </div>
            </a>
            <a href="master_data.php" class="flex items-center p-4 bg-slate-50 border border-slate-100 hover:bg-emerald-50 hover:border-emerald-100 rounded-xl transition-all group">
                <div class="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-emerald-600 shadow-sm group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <i class="fas fa-users"></i>
                </div>
                <div class="ml-4">
                    <p class="text-sm font-bold text-slate-900">Manage Persons</p>
                    <p class="text-xs text-slate-500 mt-0.5">Update concern persons</p>
                </div>
            </a>
            <a href="audit.php" class="flex items-center p-4 bg-slate-50 border border-slate-100 hover:bg-purple-50 hover:border-purple-100 rounded-xl transition-all group">
                <div class="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-purple-600 shadow-sm group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <i class="fas fa-clipboard-list"></i>
                </div>
                <div class="ml-4">
                    <p class="text-sm font-bold text-slate-900">View Logs</p>
                    <p class="text-xs text-slate-500 mt-0.5">Check system audit trail</p>
                </div>
            </a>
        </div>
    </div>
</div>

<?php require 'footer.php'; ?>
