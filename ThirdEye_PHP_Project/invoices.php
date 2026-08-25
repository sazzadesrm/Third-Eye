<?php
require 'db.php';
require 'header.php';

// Fetch all MRAs
$stmt = $pdo->query("SELECT m.*, u.name as preparer_name, c.name as concern_person_name, e.name as expense_type, p.name as payment_type FROM mraforms m LEFT JOIN users u ON m.prepared_by = u.id LEFT JOIN concernpersons c ON m.concern_person_id = c.id LEFT JOIN expenselists e ON m.expense_type_id = e.id LEFT JOIN paymentlists p ON m.payment_type_id = p.id ORDER BY m.created_at DESC");
$invoices = $stmt->fetchAll();
?>
<div class="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div>
        <h1 class="text-2xl font-bold text-slate-900">Invoices & MRAs</h1>
        <p class="text-slate-500 text-sm mt-1">Manage all your miscellaneous expense requisitions.</p>
    </div>
    <a href="create.php" class="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors shadow-sm inline-flex items-center">
        <i class="fas fa-plus mr-2"></i> Create MRA
    </a>
</div>

<div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
    <!-- Filters / Search (UI only for layout) -->
    <div class="p-4 border-b border-slate-200 bg-slate-50 flex gap-4 flex-wrap items-center">
        <div class="relative flex-1 min-w-[200px]">
            <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input type="text" placeholder="Search by invoice number or purpose..." class="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
        </div>
        <select class="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Submitted">Submitted</option>
            <option value="Verified">Verified</option>
            <option value="Approved">Approved</option>
        </select>
        <button class="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300 transition-colors">
            Filter
        </button>
    </div>

    <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200">
            <thead class="bg-slate-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice No.</th>
                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Concern Person</th>
                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Purpose</th>
                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                    <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th class="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-slate-200">
                <?php foreach($invoices as $inv): ?>
                <tr class="hover:bg-slate-50 transition-colors group">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900"><?= htmlspecialchars($inv['invoice_number']) ?></td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500"><?= htmlspecialchars($inv['date']) ?></td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <?= htmlspecialchars($inv['concern_person_name'] ?? '-') ?>
                        <div class="text-xs text-slate-400 mt-0.5"><?= htmlspecialchars($inv['payment_type'] ?? '') ?></div>
                    </td>
                    <td class="px-6 py-4 text-sm text-slate-600 max-w-xs truncate" title="<?= htmlspecialchars($inv['purpose']) ?>">
                        <?= htmlspecialchars($inv['purpose']) ?>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900">৳<?= number_format($inv['amount'], 2) ?></td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        <?php
                        $colors = [
                            'Draft' => 'bg-slate-100 text-slate-700',
                            'Submitted' => 'bg-blue-50 text-blue-700 border-blue-200',
                            'Verified' => 'bg-purple-50 text-purple-700 border-purple-200',
                            'Approved' => 'bg-emerald-50 text-emerald-700 border-emerald-200',
                            'Received' => 'bg-emerald-100 text-emerald-800',
                            'Returned' => 'bg-amber-50 text-amber-700',
                            'Rejected' => 'bg-red-50 text-red-700'
                        ];
                        $c = $colors[$inv['status']] ?? 'bg-slate-100 text-slate-700';
                        ?>
                        <span class="px-2.5 py-1 inline-flex text-xs font-semibold rounded-full border border-transparent <?= $c ?>">
                            <?= htmlspecialchars($inv['status']) ?>
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div class="flex items-center justify-end gap-3 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <a href="voucher.php?id=<?= $inv['id'] ?>" class="text-slate-400 hover:text-blue-600 transition-colors" title="View/Print Voucher"><i class="fas fa-print text-lg"></i></a>
                            <!-- Edit logic could go here based on role and status -->
                        </div>
                    </td>
                </tr>
                <?php endforeach; ?>
                <?php if(count($invoices) === 0): ?>
                <tr><td colspan="7" class="px-6 py-12 text-center text-slate-500"><i class="fas fa-inbox text-4xl mb-3 text-slate-300 block"></i> No MRA records found. Create one to get started.</td></tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>
<?php require 'footer.php'; ?>
