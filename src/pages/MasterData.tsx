import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/db';
import { ConfirmModal } from '../components/ConfirmModal';
import { ExpenseSource, PaymentType, AccountTitle, Person } from '../types';
import { Plus, Edit2, Trash2, X, Save, FileSpreadsheet, Download, ChevronDown, Check } from 'lucide-react';
import { useAuthStore } from '../lib/store';
import { CsvImportModal, CsvTargetType } from '../components/CsvImportModal';

type Tab = 'expenseSources' | 'paymentTypes' | 'accountTitles' | 'people';

export const CSV_TEMPLATES_CONFIG: Record<string, { filename: string; title: string; headers: string[]; sample: string[][] }> = {
  expenses: {
    filename: 'expenses_bulk_import_template.csv',
    title: 'Expenses / Invoices Bulk Import Template',
    headers: ['Date', 'InvoiceNumber', 'ExpenseSource', 'PaymentType', 'AccountTitle', 'Purpose', 'Amount', 'Status', 'Remarks'],
    sample: [
      ['2026-08-20', 'WALTON-2026-001', 'WALTON HI-TECH INDUSTRIES PLC', 'UTILITY & INFRASTRUCTURE', 'General Reserve', 'Monthly Server Room Electricity & Backup UPS Maintenance', '15000', 'Approved', 'Authorized by management'],
      ['2026-08-22', 'STARTECH-2026-042', 'Star Tech & Engineering Ltd', 'OFFICE SUPPLIES & HARDWARE', 'IT Infrastructure Fund', 'Procurement of high-speed SSD drives and Cat6 cables', '8500', 'Approved', 'IT Department requisition'],
      ['2026-08-23', 'PETRO-2026-109', 'Apex Property Management', 'TRAVEL & LOGISTICS', 'Common Fund', 'Field operations fuel allowance and transport logistics', '4200', 'Pending', 'Awaiting review'],
    ]
  },
  expenseSources: {
    filename: 'vendors_expense_sources_template.csv',
    title: 'Vendors & Expense Sources Template',
    headers: ['Name', 'Description', 'Address', 'Status'],
    sample: [
      ['WALTON HI-TECH INDUSTRIES PLC', 'Product- Refrigerator & Appliances', 'Chandra, Gazipur', 'Active'],
      ['Star Tech & Engineering Ltd', 'IT Equipment, Laptops & Accessories', 'Dhanmondi, Dhaka', 'Active'],
      ['Dhaka Electric Supply Company', 'Utility Power Provider', 'Nikunja-2, Khilkhet, Dhaka', 'Active'],
      ['Apex Property Management', 'Office Lease and Building Maintenance', 'Gulshan-1, Dhaka', 'Active'],
    ]
  },
  paymentTypes: {
    filename: 'expense_categories_payment_types_template.csv',
    title: 'Expense Categories & Payment Types Template',
    headers: ['Name', 'Description', 'Status'],
    sample: [
      ['UTILITY & INFRASTRUCTURE', 'Operational utilities, electric and cloud expenses', 'Active'],
      ['OFFICE SUPPLIES & HARDWARE', 'IT hardware, furniture and office stationery', 'Active'],
      ['SUBSCRIPTIONS & LICENSES', 'Recurring software, SaaS and internet subscriptions', 'Active'],
      ['TRAVEL & LOGISTICS', 'Corporate travel, fuel and courier allowances', 'Active'],
    ]
  },
  accountTitles: {
    filename: 'account_titles_fund_template.csv',
    title: 'Account Titles & Funds Template',
    headers: ['Name', 'Description', 'Status'],
    sample: [
      ['General Reserve', 'Main reserve fund for operational expenses', 'Active'],
      ['Common Fund', 'BOD Common Fund for corporate distributions', 'Active'],
      ['IT Infrastructure Fund', 'Dedicated server, cloud & security budget', 'Active'],
      ['Administrative Overhead', 'Daily facility and headquarters maintenance', 'Active'],
    ]
  },
  people: {
    filename: 'people_and_roles_template.csv',
    title: 'Personnel & Workflow Roles Template',
    headers: ['Name', 'OfficeId', 'Designation', 'Department', 'Email', 'Phone', 'IsPreparedBy', 'IsVerifiedBy', 'IsApprovedBy', 'IsReceivedBy', 'Status'],
    sample: [
      ['Sazzad Kabir', '7130', 'Manager', 'Finance & Accounts', 'sazzad@thirdeye.com', '+8801700000001', 'Yes', 'Yes', 'No', 'Yes', 'Active'],
      ['Nazrul Islam Sarker', '303', 'AMD', 'Executive Board', 'nazrul@thirdeye.com', '+8801700000002', 'No', 'Yes', 'Yes', 'Yes', 'Active'],
      ['Tanvir Hossain', '4021', 'Lead Systems Architect', 'IT Operations', 'tanvir@thirdeye.com', '+8801700000003', 'Yes', 'Yes', 'No', 'Yes', 'Active'],
    ]
  }
};

export const triggerCsvTemplateDownload = (key: string) => {
  const tmpl = CSV_TEMPLATES_CONFIG[key] || CSV_TEMPLATES_CONFIG['expenses'];
  const csvContent = [
    tmpl.headers.join(','),
    ...tmpl.sample.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = tmpl.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const MasterData: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('expenseSources');
  const [refresh, setRefresh] = useState(0);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
  const templateMenuRef = useRef<HTMLDivElement>(null);

  const forceRefresh = () => setRefresh(r => r + 1);

  // Click outside to close template menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (templateMenuRef.current && !templateMenuRef.current.contains(event.target as Node)) {
        setIsTemplateMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-base">Master Data Management</h1>
          <p className="text-text-muted">Manage system lookups, vendors, expense categories, funds, and organizational workflow roles.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Download CSV Template Dropdown / Action */}
          <div className="relative" ref={templateMenuRef}>
            <button
              onClick={() => setIsTemplateMenuOpen(prev => !prev)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-bg-panel hover:bg-bg-base text-text-base border border-border-subtle hover:border-accent-300 rounded-lg text-sm font-medium transition-colors shadow-2xs"
              title="Download formatted CSV templates for bulk importing"
            >
              <Download className="w-4 h-4 text-accent-600" />
              <span>Download CSV Template</span>
              <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
            </button>

            {isTemplateMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-bg-panel rounded-xl shadow-xl border border-border-subtle z-50 p-2 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-border-subtle mb-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Select CSV Template</p>
                </div>
                <div className="space-y-1 text-xs">
                  <button
                    onClick={() => {
                      triggerCsvTemplateDownload('expenses');
                      setIsTemplateMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent-50 dark:hover:bg-accent-950/40 text-text-base font-semibold flex items-center justify-between transition-colors group"
                  >
                    <span>📊 Expense & Vouchers Template</span>
                    <Download className="w-3.5 h-3.5 text-accent-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                  <button
                    onClick={() => {
                      triggerCsvTemplateDownload('expenseSources');
                      setIsTemplateMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent-50 dark:hover:bg-accent-950/40 text-text-base font-medium flex items-center justify-between transition-colors group"
                  >
                    <span>🏢 Vendors & Sources Template</span>
                    <Download className="w-3.5 h-3.5 text-accent-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                  <button
                    onClick={() => {
                      triggerCsvTemplateDownload('paymentTypes');
                      setIsTemplateMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent-50 dark:hover:bg-accent-950/40 text-text-base font-medium flex items-center justify-between transition-colors group"
                  >
                    <span>🏷️ Expense Categories Template</span>
                    <Download className="w-3.5 h-3.5 text-accent-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                  <button
                    onClick={() => {
                      triggerCsvTemplateDownload('accountTitles');
                      setIsTemplateMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent-50 dark:hover:bg-accent-950/40 text-text-base font-medium flex items-center justify-between transition-colors group"
                  >
                    <span>💼 Account Titles & Funds Template</span>
                    <Download className="w-3.5 h-3.5 text-accent-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                  <button
                    onClick={() => {
                      triggerCsvTemplateDownload('people');
                      setIsTemplateMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent-50 dark:hover:bg-accent-950/40 text-text-base font-medium flex items-center justify-between transition-colors group"
                  >
                    <span>👥 Personnel & Roles Template</span>
                    <Download className="w-3.5 h-3.5 text-accent-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" /> Bulk CSV Import
          </button>
        </div>
      </div>

      <div className="bg-bg-panel rounded-xl shadow-sm border border-border-subtle overflow-hidden">
        <div className="flex overflow-x-auto border-b border-border-subtle">
          <TabButton active={activeTab === 'expenseSources'} onClick={() => setActiveTab('expenseSources')}>Vendors & Expense Sources</TabButton>
          <TabButton active={activeTab === 'paymentTypes'} onClick={() => setActiveTab('paymentTypes')}>Expense Types & Categories</TabButton>
          <TabButton active={activeTab === 'accountTitles'} onClick={() => setActiveTab('accountTitles')}>Account Titles & Funds</TabButton>
          <TabButton active={activeTab === 'people'} onClick={() => setActiveTab('people')}>Personnel & Workflow Roles</TabButton>
        </div>
        <div className="p-6">
          {activeTab === 'expenseSources' && (
            <GenericMasterDataTab 
              type="expenseSources" 
              refresh={refresh} 
              onRefresh={forceRefresh} 
              onOpenCsv={() => setIsCsvModalOpen(true)} 
              onDownloadTemplate={() => triggerCsvTemplateDownload('expenseSources')}
            />
          )}
          {activeTab === 'paymentTypes' && (
            <GenericMasterDataTab 
              type="paymentTypes" 
              refresh={refresh} 
              onRefresh={forceRefresh} 
              onOpenCsv={() => setIsCsvModalOpen(true)} 
              onDownloadTemplate={() => triggerCsvTemplateDownload('paymentTypes')}
            />
          )}
          {activeTab === 'accountTitles' && (
            <GenericMasterDataTab 
              type="accountTitles" 
              refresh={refresh} 
              onRefresh={forceRefresh} 
              onOpenCsv={() => setIsCsvModalOpen(true)} 
              onDownloadTemplate={() => triggerCsvTemplateDownload('accountTitles')}
            />
          )}
          {activeTab === 'people' && (
            <PeopleTab 
              refresh={refresh} 
              onRefresh={forceRefresh} 
              onOpenCsv={() => setIsCsvModalOpen(true)} 
              onDownloadTemplate={() => triggerCsvTemplateDownload('people')}
            />
          )}
        </div>
      </div>

      <CsvImportModal
        initialTarget={activeTab}
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onSuccess={() => {
          forceRefresh();
        }}
      />
    </div>
  );
};

const TabButton = ({ active, onClick, children }: any) => (
  <button
    onClick={onClick}
    className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
      active ? 'border-accent-600 text-accent-600' : 'border-transparent text-text-muted hover:text-text-base hover:border-border-subtle'
    }`}
  >
    {children}
  </button>
);

const GenericMasterDataTab = ({ 
  type, 
  refresh, 
  onRefresh, 
  onOpenCsv,
  onDownloadTemplate
}: { 
  type: 'expenseSources' | 'paymentTypes' | 'accountTitles', 
  refresh: number, 
  onRefresh: () => void,
  onOpenCsv: () => void,
  onDownloadTemplate?: () => void
}) => {
  const [data, setData] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState<any>(null);
  const { user } = useAuthStore();

  useEffect(() => { 
    if(type === 'expenseSources') db.expenseSources.getAll().then(setData); 
    if(type === 'paymentTypes') db.paymentTypes.getAll().then(setData); 
    if(type === 'accountTitles') db.accountTitles.getAll().then(setData); 
  }, [type, refresh]);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
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
  };

  const handleSave = async (formData: any) => {
    const payload = {
      ...formData,
      id: formData.id || crypto.randomUUID(),
      createdBy: formData.createdBy || (user?.id || 'sys'),
      createdAt: formData.createdAt || new Date().toISOString()
    };
    
    if(type === 'expenseSources') await db.expenseSources.save(payload);
    if(type === 'paymentTypes') await db.paymentTypes.save(payload);
    if(type === 'accountTitles') await db.accountTitles.save(payload);
    await db.auditLogs.add(user?.id||'sys', formData.id ? 'Edit Master Data' : 'Add Master Data', type, payload.id, `Saved record ${payload.name}`);
    
    setIsModalOpen(false);
    onRefresh();
  };

  const columns = type === 'expenseSources' ? ['ID', 'Name', 'Description', 'Address', 'Status'] : ['ID', 'Name', 'Description', 'Status'];

  return (
    <>
      <DataTable 
        columns={columns} 
        data={data} 
        onAdd={() => { setEditingData(null); setIsModalOpen(true); }}
        onEdit={(row: any) => { setEditingData(row); setIsModalOpen(true); }}
        onDelete={handleDelete}
        onOpenCsv={onOpenCsv}
        onDownloadTemplate={onDownloadTemplate}
      />
      {isModalOpen && (
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
    </>
  );
};

const PeopleTab = ({ 
  refresh, 
  onRefresh, 
  onOpenCsv,
  onDownloadTemplate
}: { 
  refresh: number, 
  onRefresh: () => void,
  onOpenCsv: () => void,
  onDownloadTemplate?: () => void
}) => {
  const [data, setData] = useState<Person[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState<Person | null>(null);
  const { user } = useAuthStore();

  useEffect(() => { db.people.getAll().then(setData); }, [refresh]);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
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
  };

  const handleSave = async (formData: any) => {
    const payload = {
      ...formData,
      id: formData.id || crypto.randomUUID(),
      createdBy: formData.createdBy || (user?.id || 'sys'),
      createdAt: formData.createdAt || new Date().toISOString()
    };
    await db.people.save(payload);
    await db.auditLogs.add(user?.id||'sys', formData.id ? 'Edit Person' : 'Add Person', 'People', payload.id, `Saved person ${payload.name}`);
    setIsModalOpen(false);
    onRefresh();
  };

  const formattedData = data.map(d => ({
    ...d,
    id: d.id,
    Name: d.name,
    Designation: d.designation || '-',
    'Prepared By': d.isPreparedBy ? 'Yes' : 'No',
    'Verified By': d.isVerifiedBy ? 'Yes' : 'No',
    'Approved By': d.isApprovedBy ? 'Yes' : 'No',
    'Received By': d.isReceivedBy ? 'Yes' : 'No',
    Status: d.isActive ? 'Active' : 'Inactive'
  }));

  return (
    <>
      <DataTable 
        columns={['Name', 'Designation', 'Prepared By', 'Verified By', 'Approved By', 'Received By', 'Status']} 
        data={formattedData} 
        hideDefault={true}
        onAdd={() => { setEditingData(null); setIsModalOpen(true); }}
        onEdit={(row: any) => { setEditingData(data.find(d => d.id === row.id) || null); setIsModalOpen(true); }}
        onDelete={handleDelete}
        onOpenCsv={onOpenCsv}
        onDownloadTemplate={onDownloadTemplate}
      />
      {isModalOpen && (
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
    </>
  );
};


const DataTable = ({ columns, data, hideDefault = false, onAdd, onEdit, onDelete, onOpenCsv, onDownloadTemplate }: any) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-text-base">Configured Records ({data.length})</h3>
          <p className="text-xs text-text-muted">Select an entry to edit or use bulk import to add multiple items at once.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {onDownloadTemplate && (
            <button 
              onClick={onDownloadTemplate} 
              className="flex items-center gap-1.5 px-3 py-2 bg-bg-base border border-border-subtle text-text-base rounded-lg hover:bg-bg-panel hover:border-accent-300 transition-colors text-xs font-semibold shadow-2xs"
              title="Download empty CSV template for this tab"
            >
              <Download className="w-3.5 h-3.5 text-accent-600" />
              <span>CSV Template</span>
            </button>
          )}
          {onOpenCsv && (
            <button 
              onClick={onOpenCsv} 
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors text-xs font-semibold shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Import CSV</span>
            </button>
          )}
          <button onClick={onAdd} className="flex items-center gap-1.5 px-3.5 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors text-xs font-semibold shadow-sm">
            <Plus className="w-4 h-4" /> Add New
          </button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border-subtle">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-bg-base border-b border-border-subtle">
              {columns.map((col: string) => <th key={col} className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">{col}</th>)}
              <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle bg-bg-panel">
            {data.map((row: any, i: number) => (
              <tr key={i} className="hover:bg-bg-base transition-colors">
                {!hideDefault ? (
                  <>
                    <td className="px-4 py-3 text-sm text-text-muted font-mono">{row.id.substring(0, 8)}...</td>
                    <td className="px-4 py-3 text-sm text-text-base font-semibold">{row.name}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{row.description}</td>
                    {row.address !== undefined && <td className="px-4 py-3 text-sm text-text-muted">{row.address}</td>}
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${row.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-bg-base text-text-muted border-border-subtle'}`}>
                        {row.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </>
                ) : (
                  columns.map((col: string) => (
                    <td key={col} className="px-4 py-3 text-sm text-text-muted">
                      {col === 'Status' ? (
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${row[col] === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-bg-base text-text-muted border-border-subtle'}`}>
                          {row[col]}
                        </span>
                      ) : (
                        <span className={col === 'Name' ? 'text-text-base font-semibold' : ''}>{row[col]}</span>
                      )}
                    </td>
                  ))
                )}
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => onEdit(row)} className="p-1.5 text-text-muted hover:text-accent-600 hover:bg-accent-50 rounded transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(row.id)} className="p-1.5 text-text-muted hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-text-muted text-sm bg-bg-panel">
                  No records found. Click "Add New" or "Import CSV" to populate entries.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Generic Modal for Expense Source / Payment Type / Account Title
const MasterDataModal = ({ title, initialData, onClose, onSave, hasAddress }: any) => {
  const [formData, setFormData] = useState(initialData || { name: '', description: '', isActive: true, address: '' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div className="bg-bg-panel rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-border-subtle">
          <h2 className="text-xl font-bold text-text-base">{initialData ? 'Edit' : 'Add New'} {title}</h2>
          <button onClick={onClose} className="p-2 text-text-muted hover:bg-bg-base rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(formData); }} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-base mb-1">Name *</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 bg-bg-base border border-border-subtle rounded-lg text-sm text-text-base focus:bg-bg-panel focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-base mb-1">Description</label>
            <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2.5 bg-bg-base border border-border-subtle rounded-lg text-sm text-text-base focus:bg-bg-panel focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none transition-all" />
          </div>
          {hasAddress && (
            <div>
              <label className="block text-sm font-medium text-text-base mb-1">Address *</label>
              <textarea required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-2.5 bg-bg-base border border-border-subtle rounded-lg text-sm text-text-base focus:bg-bg-panel focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none transition-all" />
            </div>
          )}
          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" id="isActive" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-4 h-4 text-accent-600 rounded focus:ring-accent-500" />
            <label htmlFor="isActive" className="text-sm font-medium text-text-base cursor-pointer">Active</label>
          </div>
          <div className="pt-6 flex justify-end gap-3 border-t border-border-subtle mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-base hover:bg-bg-base rounded-lg transition-colors">Cancel</button>
            <button type="submit" className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors shadow-sm"><Save className="w-4 h-4" /> Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// specialized modal for people
const PersonModal = ({ initialData, onClose, onSave }: any) => {
  const [formData, setFormData] = useState(initialData || { 
    name: '', officeId: '', designation: '', department: '', phone: '', email: '',
    isPreparedBy: false, isVerifiedBy: false, isApprovedBy: false, isReceivedBy: true, isActive: true 
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div className="bg-bg-panel rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-border-subtle shrink-0">
          <h2 className="text-xl font-bold text-text-base">{initialData ? 'Edit Person' : 'Add New Person'}</h2>
          <button onClick={onClose} className="p-2 text-text-muted hover:bg-bg-base rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto p-6">
          <form id="person-form" onSubmit={e => { e.preventDefault(); onSave(formData); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-text-base mb-1">Name *</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 bg-bg-base border border-border-subtle rounded-lg text-sm text-text-base focus:bg-bg-panel focus:border-accent-500 focus:ring-2 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-base mb-1">Office ID</label>
                <input type="text" value={formData.officeId} onChange={e => setFormData({...formData, officeId: e.target.value})} className="w-full px-4 py-2 bg-bg-base border border-border-subtle rounded-lg text-sm text-text-base focus:bg-bg-panel focus:border-accent-500 focus:ring-2 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-base mb-1">Designation</label>
                <input type="text" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} className="w-full px-4 py-2 bg-bg-base border border-border-subtle rounded-lg text-sm text-text-base focus:bg-bg-panel focus:border-accent-500 focus:ring-2 outline-none" />
              </div>
            </div>

            <div className="pt-4 border-t border-border-subtle">
              <h4 className="text-sm font-bold text-text-base mb-3">Workflow Roles</h4>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-bg-base border border-transparent hover:border-border-subtle transition-colors">
                  <input type="checkbox" checked={formData.isPreparedBy} onChange={e => setFormData({...formData, isPreparedBy: e.target.checked})} className="w-4 h-4 text-accent-600 rounded focus:ring-accent-500" />
                  <span className="text-sm font-medium text-text-base">Preparer</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-bg-base border border-transparent hover:border-border-subtle transition-colors">
                  <input type="checkbox" checked={formData.isVerifiedBy} onChange={e => setFormData({...formData, isVerifiedBy: e.target.checked})} className="w-4 h-4 text-accent-600 rounded focus:ring-accent-500" />
                  <span className="text-sm font-medium text-text-base">Verifier</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-bg-base border border-transparent hover:border-border-subtle transition-colors">
                  <input type="checkbox" checked={formData.isApprovedBy} onChange={e => setFormData({...formData, isApprovedBy: e.target.checked})} className="w-4 h-4 text-accent-600 rounded focus:ring-accent-500" />
                  <span className="text-sm font-medium text-text-base">Approver</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-bg-base border border-transparent hover:border-border-subtle transition-colors">
                  <input type="checkbox" checked={formData.isReceivedBy} onChange={e => setFormData({...formData, isReceivedBy: e.target.checked})} className="w-4 h-4 text-accent-600 rounded focus:ring-accent-500" />
                  <span className="text-sm font-medium text-text-base">Receiver</span>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-border-subtle flex items-center gap-2">
              <input type="checkbox" id="isActivePerson" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-4 h-4 text-accent-600 rounded focus:ring-accent-500" />
              <label htmlFor="isActivePerson" className="text-sm font-medium text-text-base cursor-pointer">Active Account</label>
            </div>
          </form>
        </div>
        <div className="p-6 border-t border-border-subtle flex justify-end gap-3 shrink-0 bg-bg-panel">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-base hover:bg-bg-base rounded-lg transition-colors">Cancel</button>
          <button type="submit" form="person-form" className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors shadow-sm"><Save className="w-4 h-4" /> Save Person</button>
        </div>
      </div>
    </div>
  );
};

