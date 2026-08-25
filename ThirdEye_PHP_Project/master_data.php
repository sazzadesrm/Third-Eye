<?php
require 'db.php';
require 'header.php';

// Handle Additions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $type = $_POST['type'] ?? '';
    $name = $_POST['name'] ?? '';
    
    if ($name && $type) {
        $table = '';
        if ($type === 'expense') $table = 'expenselists';
        if ($type === 'payment') $table = 'paymentlists';
        if ($type === 'person') $table = 'concernpersons';
        
        if ($table) {
            $stmt = $pdo->prepare("INSERT INTO $table (name, status) VALUES (?, 'active')");
            $stmt->execute([$name]);
            header("Location: master_data.php?success=1");
            exit;
        }
    }
}

$expenses = $pdo->query("SELECT * FROM expenselists ORDER BY name")->fetchAll();
$payments = $pdo->query("SELECT * FROM paymentlists ORDER BY name")->fetchAll();
$persons = $pdo->query("SELECT * FROM concernpersons ORDER BY name")->fetchAll();
?>

<div class="mb-6">
    <h1 class="text-2xl font-bold text-slate-900">Master Data</h1>
    <p class="text-slate-500 text-sm mt-1">Manage concern persons, expense types, and payment classifications.</p>
</div>

<?php if(isset($_GET['success'])): ?>
    <div class="bg-emerald-50 text-emerald-700 border border-emerald-200 p-4 rounded-lg text-sm mb-6 flex items-center">
        <i class="fas fa-check-circle mr-2"></i> Record added successfully.
    </div>
<?php endif; ?>

<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    
    <!-- Concern Persons -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[500px]">
        <div class="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center rounded-t-xl">
            <h3 class="font-bold text-slate-900"><i class="fas fa-users text-blue-600 mr-2"></i> Concern Persons</h3>
        </div>
        <div class="p-4 border-b border-slate-100">
            <form method="POST" class="flex gap-2">
                <input type="hidden" name="type" value="person">
                <input type="text" name="name" placeholder="Add new person..." class="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                <button type="submit" class="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"><i class="fas fa-plus"></i></button>
            </form>
        </div>
        <div class="flex-1 overflow-y-auto p-2">
            <ul class="space-y-1">
                <?php foreach($persons as $item): ?>
                <li class="px-4 py-2 hover:bg-slate-50 rounded-lg flex justify-between items-center text-sm border-b border-slate-50 last:border-0">
                    <span class="font-medium text-slate-700"><?= htmlspecialchars($item['name']) ?></span>
                    <span class="text-xs px-2 py-0.5 rounded-full <?= $item['status'] == 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700' ?>"><?= $item['status'] ?></span>
                </li>
                <?php endforeach; ?>
            </ul>
        </div>
    </div>

    <!-- Expense Lists -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[500px]">
        <div class="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center rounded-t-xl">
            <h3 class="font-bold text-slate-900"><i class="fas fa-tags text-indigo-600 mr-2"></i> Expense Types</h3>
        </div>
        <div class="p-4 border-b border-slate-100">
            <form method="POST" class="flex gap-2">
                <input type="hidden" name="type" value="expense">
                <input type="text" name="name" placeholder="Add expense type..." class="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" required>
                <button type="submit" class="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition-colors"><i class="fas fa-plus"></i></button>
            </form>
        </div>
        <div class="flex-1 overflow-y-auto p-2">
            <ul class="space-y-1">
                <?php foreach($expenses as $item): ?>
                <li class="px-4 py-2 hover:bg-slate-50 rounded-lg flex justify-between items-center text-sm border-b border-slate-50 last:border-0">
                    <span class="font-medium text-slate-700"><?= htmlspecialchars($item['name']) ?></span>
                    <span class="text-xs px-2 py-0.5 rounded-full <?= $item['status'] == 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700' ?>"><?= $item['status'] ?></span>
                </li>
                <?php endforeach; ?>
            </ul>
        </div>
    </div>

    <!-- Payment Lists -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[500px]">
        <div class="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center rounded-t-xl">
            <h3 class="font-bold text-slate-900"><i class="fas fa-credit-card text-emerald-600 mr-2"></i> Payment Types</h3>
        </div>
        <div class="p-4 border-b border-slate-100">
            <form method="POST" class="flex gap-2">
                <input type="hidden" name="type" value="payment">
                <input type="text" name="name" placeholder="Add payment type..." class="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" required>
                <button type="submit" class="bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 transition-colors"><i class="fas fa-plus"></i></button>
            </form>
        </div>
        <div class="flex-1 overflow-y-auto p-2">
            <ul class="space-y-1">
                <?php foreach($payments as $item): ?>
                <li class="px-4 py-2 hover:bg-slate-50 rounded-lg flex justify-between items-center text-sm border-b border-slate-50 last:border-0">
                    <span class="font-medium text-slate-700"><?= htmlspecialchars($item['name']) ?></span>
                    <span class="text-xs px-2 py-0.5 rounded-full <?= $item['status'] == 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700' ?>"><?= $item['status'] ?></span>
                </li>
                <?php endforeach; ?>
            </ul>
        </div>
    </div>

</div>

<?php require 'footer.php'; ?>
