<?php
require 'db.php';
if (!isset($_SESSION['user_id'])) { header("Location: login.php"); exit; }

$id = $_GET['id'] ?? 0;
$stmt = $pdo->prepare("
    SELECT m.*, 
           u.name as preparer_name, 
           v.name as verifier_name, 
           a.name as approver_name, 
           r.name as receiver_name,
           c.name as concern_person_name, 
           e.name as expense_type, 
           p.name as payment_type 
    FROM mraforms m 
    LEFT JOIN users u ON m.prepared_by = u.id 
    LEFT JOIN users v ON m.verified_by = v.id 
    LEFT JOIN users a ON m.approved_by = a.id 
    LEFT JOIN users r ON m.received_by = r.id 
    LEFT JOIN concernpersons c ON m.concern_person_id = c.id 
    LEFT JOIN expenselists e ON m.expense_type_id = e.id 
    LEFT JOIN paymentlists p ON m.payment_type_id = p.id 
    WHERE m.id = ?
");
$stmt->execute([$id]);
$inv = $stmt->fetch();

if (!$inv) {
    die("Invoice not found.");
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($inv['invoice_number']) ?> - Voucher</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        @media print {
            body { font-size: 12pt; background: white; margin: 0; padding: 0; }
            .no-print { display: none !important; }
            .print-border { border-color: #000 !important; border-width: 1px !important; }
            .print-text { color: #000 !important; }
            .print-bg { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            @page { margin: 1cm; size: A4 portrait; }
        }
        body { font-family: 'Times New Roman', Times, serif; }
        .a4-container {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            background: white;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            position: relative;
        }
        @media print {
            .a4-container { width: 100%; box-shadow: none; margin: 0; }
        }
    </style>
</head>
<body class="bg-slate-100 py-8 text-slate-900">
    
    <div class="fixed top-4 right-4 flex gap-3 no-print z-50">
        <a href="invoices.php" class="bg-slate-800 text-white px-4 py-2 rounded shadow hover:bg-slate-700 transition-colors"><i class="fas fa-arrow-left mr-2"></i>Back</a>
        <button onclick="window.print()" class="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition-colors"><i class="fas fa-print mr-2"></i>Print Voucher</button>
    </div>

    <div class="a4-container p-[20mm]">
        
        <?php if ($inv['status'] === 'Approved' || $inv['status'] === 'Received'): ?>
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] z-0 overflow-hidden">
                <span class="text-[120px] font-bold text-green-600 rotate-[-45deg] whitespace-nowrap">APPROVED</span>
            </div>
        <?php endif; ?>

        <div class="relative z-10 h-full flex flex-col">
            <!-- Header -->
            <div class="text-center mb-8 border-b-2 border-slate-800 pb-6 print-border">
                <h1 class="text-2xl font-bold uppercase tracking-wider print-text">Walton Hi-Tech Industries PLC</h1>
                <p class="text-sm text-slate-600 print-text mt-1">Chandra, Kaliakair, Gazipur, Bangladesh</p>
                <div class="mt-6 inline-block bg-slate-100 print-bg px-6 py-2 border border-slate-300 print-border rounded">
                    <h2 class="text-xl font-bold uppercase tracking-widest print-text">Miscellaneous Expense Voucher</h2>
                </div>
            </div>

            <!-- Meta info -->
            <div class="flex justify-between mb-8 text-sm">
                <div>
                    <p class="mb-1"><span class="font-bold print-text w-24 inline-block">Invoice No</span> : <span class="font-mono"><?= htmlspecialchars($inv['invoice_number']) ?></span></p>
                    <p class="mb-1"><span class="font-bold print-text w-24 inline-block">Date</span> : <?= htmlspecialchars(date('d M Y', strtotime($inv['date']))) ?></p>
                </div>
                <div class="text-right">
                    <p class="mb-1"><span class="font-bold print-text">Status:</span> <span class="uppercase"><?= htmlspecialchars($inv['status']) ?></span></p>
                </div>
            </div>

            <!-- Details Table -->
            <table class="w-full mb-8 border-collapse border border-slate-400 print-border">
                <tbody>
                    <tr>
                        <td class="w-1/4 p-3 border border-slate-400 print-border bg-slate-50 print-bg font-bold print-text">Concern Person</td>
                        <td class="w-3/4 p-3 border border-slate-400 print-border"><?= htmlspecialchars($inv['concern_person_name'] ?? 'N/A') ?></td>
                    </tr>
                    <tr>
                        <td class="w-1/4 p-3 border border-slate-400 print-border bg-slate-50 print-bg font-bold print-text">Expense Type</td>
                        <td class="w-3/4 p-3 border border-slate-400 print-border"><?= htmlspecialchars($inv['expense_type'] ?? 'N/A') ?></td>
                    </tr>
                    <tr>
                        <td class="w-1/4 p-3 border border-slate-400 print-border bg-slate-50 print-bg font-bold print-text">Payment Type</td>
                        <td class="w-3/4 p-3 border border-slate-400 print-border"><?= htmlspecialchars($inv['payment_type'] ?? 'N/A') ?></td>
                    </tr>
                    <tr>
                        <td class="w-1/4 p-3 border border-slate-400 print-border bg-slate-50 print-bg font-bold print-text align-top">Purpose / Remarks</td>
                        <td class="w-3/4 p-3 border border-slate-400 print-border min-h-[100px] whitespace-pre-wrap"><?= htmlspecialchars($inv['purpose']) ?></td>
                    </tr>
                </tbody>
            </table>

            <!-- Financials -->
            <div class="border-2 border-slate-800 print-border p-4 mb-16">
                <div class="flex justify-between items-center mb-4">
                    <div class="font-bold print-text text-lg">Total Amount:</div>
                    <div class="font-bold print-text text-xl">৳ <?= number_format($inv['amount'], 2) ?></div>
                </div>
                <div class="flex items-start gap-4 pt-4 border-t border-slate-300 print-border">
                    <div class="font-bold print-text whitespace-nowrap">Amount In Words:</div>
                    <div class="italic"><?= htmlspecialchars($inv['amount_in_words'] ?? 'N/A') ?></div>
                </div>
            </div>

            <!-- Signatures Spacer -->
            <div class="flex-grow"></div>

            <!-- Signatures -->
            <div class="grid grid-cols-4 gap-4 mt-16 pt-8 text-center text-sm">
                <div>
                    <div class="border-t border-slate-400 print-border mx-4 pt-2 font-bold print-text">Prepared By</div>
                    <div class="mt-1"><?= htmlspecialchars($inv['preparer_name'] ?? 'N/A') ?></div>
                </div>
                <div>
                    <div class="border-t border-slate-400 print-border mx-4 pt-2 font-bold print-text">Verified By</div>
                    <div class="mt-1"><?= htmlspecialchars($inv['verifier_name'] ?? 'Pending') ?></div>
                </div>
                <div>
                    <div class="border-t border-slate-400 print-border mx-4 pt-2 font-bold print-text">Approved By</div>
                    <div class="mt-1"><?= htmlspecialchars($inv['approver_name'] ?? 'Pending') ?></div>
                </div>
                <div>
                    <div class="border-t border-slate-400 print-border mx-4 pt-2 font-bold print-text">Received By</div>
                    <div class="mt-1"><?= htmlspecialchars($inv['receiver_name'] ?? 'Pending') ?></div>
                </div>
            </div>

        </div>
    </div>
</body>
</html>
