import re

with open('src/pages/MasterData.tsx', 'r') as f:
    content = f.read()

# Add ConfirmModal import
content = content.replace("import { DataTable } from '../components/DataTable';", "import { DataTable } from '../components/DataTable';\nimport { ConfirmModal } from '../components/ConfirmModal';")
content = content.replace("import { db } from '../lib/db';", "import { db } from '../lib/db';\nimport { ConfirmModal } from '../components/ConfirmModal';")

# Replace window.confirm in GenericMasterDataTab
old_handle_delete_1 = """  const handleDelete = async (id: string) => {
    if(!window.confirm("Are you sure you want to delete this record?")) return;
    if(type === 'expenseSources') await db.expenseSources.delete(id);
    if(type === 'paymentTypes') await db.paymentTypes.delete(id);
    if(type === 'accountTitles') await db.accountTitles.delete(id);
    await db.auditLogs.add(user?.id||'sys', 'Delete Master Data', type, id, `Deleted record ${id}`);
    onRefresh();
  };"""

new_handle_delete_1 = """  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const confirmDelete = async () => {
    const id = deleteConfirmId;
    if (!id) return;
    if(type === 'expenseSources') await db.expenseSources.delete(id);
    if(type === 'paymentTypes') await db.paymentTypes.delete(id);
    if(type === 'accountTitles') await db.accountTitles.delete(id);
    await db.auditLogs.add(user?.id||'sys', 'Delete Master Data', type, id, `Deleted record ${id}`);
    setDeleteConfirmId(null);
    onRefresh();
  };
  
  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };"""

content = content.replace(old_handle_delete_1, new_handle_delete_1)

# Add ConfirmModal JSX to GenericMasterDataTab
old_return_1 = """      {isModalOpen && (
        <MasterDataModal 
          title={type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
          initialData={editingData}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          hasAddress={type === 'expenseSources'}
        />
      )}
    </>"""

new_return_1 = """      {isModalOpen && (
        <MasterDataModal 
          title={type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
          initialData={editingData}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          hasAddress={type === 'expenseSources'}
        />
      )}
      <ConfirmModal 
        isOpen={!!deleteConfirmId}
        title="Confirm Deletion"
        message="Are you sure you want to delete this record? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmId(null)}
        isDestructive={true}
      />
    </>"""

content = content.replace(old_return_1, new_return_1)

# Replace window.confirm in PeopleTab
old_handle_delete_2 = """  const handleDelete = async (id: string) => {
    if(!window.confirm("Are you sure you want to delete this person?")) return;
    await db.people.delete(id);
    await db.auditLogs.add(user?.id||'sys', 'Delete Person', 'People', id, `Deleted person ${id}`);
    onRefresh();
  };"""

new_handle_delete_2 = """  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const confirmDelete = async () => {
    const id = deleteConfirmId;
    if (!id) return;
    await db.people.delete(id);
    await db.auditLogs.add(user?.id||'sys', 'Delete Person', 'People', id, `Deleted person ${id}`);
    setDeleteConfirmId(null);
    onRefresh();
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };"""

content = content.replace(old_handle_delete_2, new_handle_delete_2)

# Add ConfirmModal JSX to PeopleTab
old_return_2 = """      {isModalOpen && (
        <PersonModal 
          initialData={editingData}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </>"""

new_return_2 = """      {isModalOpen && (
        <PersonModal 
          initialData={editingData}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
        />
      )}
      <ConfirmModal 
        isOpen={!!deleteConfirmId}
        title="Confirm Deletion"
        message="Are you sure you want to delete this person? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmId(null)}
        isDestructive={true}
      />
    </>"""

content = content.replace(old_return_2, new_return_2)

with open('src/pages/MasterData.tsx', 'w') as f:
    f.write(content)
