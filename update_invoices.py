import re

with open('src/pages/Invoices.tsx', 'r') as f:
    content = f.read()

# Imports
content = content.replace("import { db } from '../lib/db';", "import { db } from '../lib/db';\nimport { ConfirmModal } from '../components/ConfirmModal';")

# State
content = content.replace("const [actionNotice, setActionNotice] = useState<string | null>(null);", "const [actionNotice, setActionNotice] = useState<string | null>(null);\n  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);\n  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);\n  const [deleteRecurringConfirmId, setDeleteRecurringConfirmId] = useState<{id: string, title: string} | null>(null);")

# handleBulkDelete
old_bulk_delete = """  const handleBulkDelete = async () => {
    if (selectedInvoicesList.length === 0) return;

    if (!confirm(`Warning: Are you sure you want to permanently delete ${selectedInvoicesList.length} selected invoice(s)?`)) {
      return;
    }

    setIsBulkProcessing(true);
    try {
      for (const inv of selectedInvoicesList) {
        await db.invoices.delete(inv.id, user?.id || 'sys');
      }
      setSelectedIds(new Set());
      setRefresh(r => r + 1);
      setActionNotice(`Deleted ${selectedInvoicesList.length} invoices.`);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      alert(`Error deleting batch: ${err.message}`);
    } finally {
      setIsBulkProcessing(false);
    }
  };"""

new_bulk_delete = """  const confirmBulkDelete = async () => {
    setIsBulkDeleteConfirmOpen(false);
    setIsBulkProcessing(true);
    try {
      for (const inv of selectedInvoicesList) {
        await db.invoices.delete(inv.id, user?.id || 'sys');
      }
      setSelectedIds(new Set());
      setRefresh(r => r + 1);
      setActionNotice(`Deleted ${selectedInvoicesList.length} invoices.`);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      alert(`Error deleting batch: ${err.message}`);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDelete = () => {
    if (selectedInvoicesList.length === 0) return;
    setIsBulkDeleteConfirmOpen(true);
  };"""
content = content.replace(old_bulk_delete, new_bulk_delete)

# handleDelete
old_single_delete = """  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this invoice? This action cannot be undone.")) {
      await db.invoices.delete(id);
      await db.auditLogs.add(user?.id || 'sys', 'Delete Invoice', 'Invoice', id, `Deleted invoice ${id}`);
      setRefresh(r => r + 1);
      setActionNotice('Invoice deleted.');
      setTimeout(() => setActionNotice(null), 3000);
    }
  };"""
new_single_delete = """  const confirmSingleDelete = async () => {
    const id = deleteConfirmId;
    if (!id) return;
    setDeleteConfirmId(null);
    await db.invoices.delete(id);
    await db.auditLogs.add(user?.id || 'sys', 'Delete Invoice', 'Invoice', id, `Deleted invoice ${id}`);
    setRefresh(r => r + 1);
    setActionNotice('Invoice deleted.');
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };"""
content = content.replace(old_single_delete, new_single_delete)

# handleDeleteRecurring
old_recur_delete = """  const handleDeleteRecurring = async (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete recurring schedule "${title}"?`)) {
      await db.recurringInvoices.delete(id);
      await db.auditLogs.add(user?.id || 'sys', 'Delete Recurring Schedule', 'Recurring Invoices', id, `Deleted recurring schedule "${title}"`);
      setRefresh(r => r + 1);
      setActionNotice(`Schedule "${title}" removed.`);
      setTimeout(() => setActionNotice(null), 3000);
    }
  };"""
new_recur_delete = """  const confirmDeleteRecurring = async () => {
    if (!deleteRecurringConfirmId) return;
    const { id, title } = deleteRecurringConfirmId;
    setDeleteRecurringConfirmId(null);
    await db.recurringInvoices.delete(id);
    await db.auditLogs.add(user?.id || 'sys', 'Delete Recurring Schedule', 'Recurring Invoices', id, `Deleted recurring schedule "${title}"`);
    setRefresh(r => r + 1);
    setActionNotice(`Schedule "${title}" removed.`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleDeleteRecurring = (id: string, title: string) => {
    setDeleteRecurringConfirmId({ id, title });
  };"""
content = content.replace(old_recur_delete, new_recur_delete)

# Add modals before closing div
modals_jsx = """      <ConfirmModal 
        isOpen={isBulkDeleteConfirmOpen}
        title="Delete Multiple Invoices"
        message={`Warning: Are you sure you want to permanently delete ${selectedInvoicesList.length} selected invoice(s)?`}
        onConfirm={confirmBulkDelete}
        onCancel={() => setIsBulkDeleteConfirmOpen(false)}
        isDestructive={true}
      />
      <ConfirmModal 
        isOpen={!!deleteConfirmId}
        title="Delete Invoice"
        message="Are you sure you want to delete this invoice? This action cannot be undone."
        onConfirm={confirmSingleDelete}
        onCancel={() => setDeleteConfirmId(null)}
        isDestructive={true}
      />
      <ConfirmModal 
        isOpen={!!deleteRecurringConfirmId}
        title="Delete Recurring Schedule"
        message={`Are you sure you want to delete recurring schedule "${deleteRecurringConfirmId?.title}"?`}
        onConfirm={confirmDeleteRecurring}
        onCancel={() => setDeleteRecurringConfirmId(null)}
        isDestructive={true}
      />
    </div>
  );
};
"""
content = content.replace("    </div>\n  );\n};\n", modals_jsx)

with open('src/pages/Invoices.tsx', 'w') as f:
    f.write(content)
