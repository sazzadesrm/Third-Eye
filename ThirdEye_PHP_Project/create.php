<?php
require 'db.php';
require 'utils.php'; // For number_to_words
require 'header.php';

// Fetch master data for dropdowns
$expenses = $pdo->query("SELECT * FROM expenselists WHERE status = 'active' ORDER BY name")->fetchAll();
$payments = $pdo->query("SELECT * FROM paymentlists WHERE status = 'active' ORDER BY name")->fetchAll();
$persons = $pdo->query("SELECT * FROM concernpersons WHERE status = 'active' ORDER BY name")->fetchAll();
$users = $pdo->query("SELECT id, name, role FROM users ORDER BY name")->fetchAll();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Generate Invoice Number: INV-YYYYMMDD-XXXXXX
    $stmt = $pdo->query("SELECT count(*) FROM mraforms WHERE DATE(created_at) = CURDATE()");
    $count = $stmt->fetchColumn() + 1;
    $invoice_number = "INV-" . date('Ymd') . "-" . str_pad($count, 6, '0', STR_PAD_LEFT);
    
    $date = $_POST['date'];
    $expense_type_id = $_POST['expense_type_id'] ?: null;
    $payment_type_id = $_POST['payment_type_id'] ?: null;
    $concern_person_id = $_POST['concern_person_id'] ?: null;
    $purpose = $_POST['purpose'];
    $amount = $_POST['amount'];
    
    // Server-side calculation of amount in words
    $amount_in_words = number_to_words($amount);
    
    $status = 'Draft';
    if(isset($_POST['submit_action']) && $_POST['submit_action'] == 'submit') {
        $status = 'Submitted';
    }
    
    try {
        $stmt = $pdo->prepare("INSERT INTO mraforms (invoice_number, date, expense_type_id, payment_type_id, concern_person_id, purpose, amount, amount_in_words, prepared_by, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$invoice_number, $date, $expense_type_id, $payment_type_id, $concern_person_id, $purpose, $amount, $amount_in_words, $_SESSION['user_id'], $status]);
        
        $mra_id = $pdo->lastInsertId();
        
        // Log Audit Trail
        $audit = $pdo->prepare("INSERT INTO audit_logs (mra_id, user_id, action, from_status, to_status, comments) VALUES (?, ?, 'Created', NULL, ?, 'Initial creation')");
        $audit->execute([$mra_id, $_SESSION['user_id'], $status]);
        
        header("Location: invoices.php");
        exit;
    } catch (Exception $e) {
        $error = "Failed to create MRA: " . $e->getMessage();
    }
}
?>

<div class="max-w-4xl mx-auto">
    <div class="mb-6 flex items-center justify-between">
        <div>
            <h1 class="text-2xl font-bold text-slate-900">Create New Requisition (MRA)</h1>
            <p class="text-slate-500 text-sm mt-1">Fill out the details below to draft a new miscellaneous expense.</p>
        </div>
        <a href="invoices.php" class="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">&larr; Back to Invoices</a>
    </div>

    <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <?php if(isset($error)): ?>
            <div class="bg-red-50 text-red-600 border border-red-200 p-4 rounded-lg text-sm mb-6 flex items-center"><i class="fas fa-exclamation-circle mr-2"></i> <?= htmlspecialchars($error) ?></div>
        <?php endif; ?>

        <form method="POST" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label class="block text-sm font-bold text-slate-700 mb-2">Date</label>
                    <input type="date" name="date" class="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" required value="<?= date('Y-m-d') ?>">
                </div>
                <div>
                    <label class="block text-sm font-bold text-slate-700 mb-2">Concern Person</label>
                    <select name="concern_person_id" class="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" required>
                        <option value="">Select Concern Person...</option>
                        <?php foreach($persons as $p): ?>
                            <option value="<?= $p['id'] ?>"><?= htmlspecialchars($p['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label class="block text-sm font-bold text-slate-700 mb-2">Expense Type</label>
                    <select name="expense_type_id" class="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" required>
                        <option value="">Select Expense Type...</option>
                        <?php foreach($expenses as $e): ?>
                            <option value="<?= $e['id'] ?>"><?= htmlspecialchars($e['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-bold text-slate-700 mb-2">Payment Type</label>
                    <select name="payment_type_id" class="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" required>
                        <option value="">Select Payment Type...</option>
                        <?php foreach($payments as $p): ?>
                            <option value="<?= $p['id'] ?>"><?= htmlspecialchars($p['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
            </div>
            
            <div>
                <label class="block text-sm font-bold text-slate-700 mb-2">Purpose / Remarks</label>
                <textarea name="purpose" rows="4" class="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none" required placeholder="Enter the detailed purpose for this requisition..."></textarea>
            </div>

            <div>
                <label class="block text-sm font-bold text-slate-700 mb-2">Total Amount (৳)</label>
                <div class="relative">
                    <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">৳</span>
                    <input type="number" step="0.01" min="0" name="amount" class="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-lg font-medium text-slate-900" required placeholder="0.00">
                </div>
                <p class="text-xs text-slate-500 mt-2"><i class="fas fa-info-circle mr-1"></i> Amount in words will be generated automatically upon saving.</p>
            </div>

            <div class="pt-6 flex justify-end gap-4 border-t border-slate-100">
                <a href="invoices.php" class="px-6 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancel</a>
                <button type="submit" name="submit_action" value="draft" class="px-6 py-2.5 text-sm font-bold text-white bg-slate-800 rounded-lg hover:bg-slate-900 transition-colors shadow-sm">Save as Draft</button>
                <button type="submit" name="submit_action" value="submit" class="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">Submit for Verification</button>
            </div>
        </form>
    </div>
</div>

<?php require 'footer.php'; ?>
