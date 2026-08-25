<?php
require 'db.php';
if (!isset($_SESSION['user_id'])) { header("Location: login.php"); exit; }

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Generate Invoice Number: INV-YYYYMMDD-XXXXXX
    $stmt = $pdo->query("SELECT count(*) FROM mraforms WHERE DATE(created_at) = CURDATE()");
    $count = $stmt->fetchColumn() + 1;
    $invoice_number = "INV-" . date('Ymd') . "-" . str_pad($count, 6, '0', STR_PAD_LEFT);
    
    $date = $_POST['date'];
    $amount = $_POST['amount'];
    $purpose = $_POST['purpose'];
    $status = 'Draft';
    
    try {
        $stmt = $pdo->prepare("INSERT INTO mraforms (invoice_number, date, amount, purpose, prepared_by, status) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$invoice_number, $date, $amount, $purpose, $_SESSION['user_id'], $status]);
        
        // Log Audit Trail
        $mra_id = $pdo->lastInsertId();
        $audit = $pdo->prepare("INSERT INTO audit_logs (mra_id, user_id, action, to_status, comments) VALUES (?, ?, 'Created', 'Draft', 'Initial MRA creation')");
        $audit->execute([$mra_id, $_SESSION['user_id']]);
        
        header("Location: index.php");
        exit;
    } catch (Exception $e) {
        $error = "Failed to create MRA: " . $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Create MRA - Third Eye</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-50 min-h-screen pb-12">
    <!-- Navbar -->
    <nav class="bg-slate-900 text-white shadow-md">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16 items-center">
                <div class="flex-shrink-0 font-bold text-xl tracking-tight">Third Eye</div>
                <a href="index.php" class="text-sm text-slate-300 hover:text-white transition-colors">← Back to Dashboard</a>
            </div>
        </div>
    </nav>

    <main class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <h2 class="text-2xl font-bold text-slate-900 mb-6">Create New Requisition (MRA)</h2>
            
            <?php if(isset($error)): ?>
                <div class="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6"><?= htmlspecialchars($error) ?></div>
            <?php endif; ?>

            <form method="POST" class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Date</label>
                        <input type="date" name="date" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" required value="<?= date('Y-m-d') ?>">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-2">Total Amount (৳)</label>
                        <input type="number" step="0.01" name="amount" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" required placeholder="0.00">
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">Purpose / Remarks</label>
                    <textarea name="purpose" rows="4" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" required placeholder="Enter the detailed purpose for this requisition..."></textarea>
                </div>

                <div class="pt-4 flex justify-end gap-4 border-t border-slate-100">
                    <a href="index.php" class="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancel</a>
                    <button type="submit" class="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">Save as Draft</button>
                </div>
            </form>
        </div>
    </main>
</body>
</html>
