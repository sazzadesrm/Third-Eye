import React, { useState, useRef } from 'react';
import { X, UploadCloud, Download, CheckCircle2, AlertCircle, FileSpreadsheet, ArrowRight, Loader2 } from 'lucide-react';
import { db } from '../lib/db';
import { useAuthStore } from '../lib/store';

export type CsvTargetType = 'expenseSources' | 'paymentTypes' | 'accountTitles' | 'people';

interface CsvImportModalProps {
  initialTarget?: CsvTargetType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TEMPLATES: Record<CsvTargetType, { filename: string; headers: string[]; sample: string[][] }> = {
  expenseSources: {
    filename: 'vendors_expense_sources_template.csv',
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
    headers: ['Name', 'OfficeId', 'Designation', 'Department', 'Email', 'Phone', 'IsPreparedBy', 'IsVerifiedBy', 'IsApprovedBy', 'IsReceivedBy', 'Status'],
    sample: [
      ['Sazzad Kabir', '7130', 'Manager', 'Finance & Accounts', 'sazzad@thirdeye.com', '+8801700000001', 'Yes', 'Yes', 'No', 'Yes', 'Active'],
      ['Nazrul Islam Sarker', '303', 'AMD', 'Executive Board', 'nazrul@thirdeye.com', '+8801700000002', 'No', 'Yes', 'Yes', 'Yes', 'Active'],
      ['Tanvir Hossain', '4021', 'Lead Systems Architect', 'IT Operations', 'tanvir@thirdeye.com', '+8801700000003', 'Yes', 'Yes', 'No', 'Yes', 'Active'],
    ]
  }
};

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  initialTarget = 'expenseSources',
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user } = useAuthStore();
  const [targetType, setTargetType] = useState<CsvTargetType>(initialTarget);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const downloadTemplate = (type: CsvTargetType) => {
    const tmpl = TEMPLATES[type];
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

  const parseCsvText = (text: string) => {
    try {
      const lines = text.split(/\r\n|\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) {
        setError('CSV file must contain at least a header row and one data row.');
        setParsedRows([]);
        return;
      }

      // Simple CSV row parser handling quotes
      const parseRow = (rowStr: string) => {
        const result = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < rowStr.length; i++) {
          const char = rowStr[i];
          if (char === '"' && (i === 0 || rowStr[i - 1] !== '\\')) {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(cur.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
            cur = '';
          } else {
            cur += char;
          }
        }
        result.push(cur.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
        return result;
      };

      const headers = parseRow(lines[0]);
      setDetectedHeaders(headers);

      const rows: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const vals = parseRow(lines[i]);
        if (vals.some(v => v.length > 0)) {
          const rowObj: Record<string, string> = {};
          headers.forEach((h, idx) => {
            rowObj[h] = vals[idx] || '';
          });
          rows.push({
            _raw: rowObj,
            _rowIndex: i,
            name: rowObj['Name'] || rowObj['name'] || vals[0] || '',
            description: rowObj['Description'] || rowObj['description'] || vals[1] || '',
            address: rowObj['Address'] || rowObj['address'] || vals[2] || '',
            officeId: rowObj['OfficeId'] || rowObj['officeId'] || vals[1] || '',
            designation: rowObj['Designation'] || rowObj['designation'] || vals[2] || '',
            department: rowObj['Department'] || rowObj['department'] || vals[3] || '',
            email: rowObj['Email'] || rowObj['email'] || vals[4] || '',
            phone: rowObj['Phone'] || rowObj['phone'] || vals[5] || '',
            isPreparedBy: (rowObj['IsPreparedBy'] || '').toLowerCase() === 'yes' || (rowObj['IsPreparedBy'] || '').toLowerCase() === 'true',
            isVerifiedBy: (rowObj['IsVerifiedBy'] || '').toLowerCase() === 'yes' || (rowObj['IsVerifiedBy'] || '').toLowerCase() === 'true',
            isApprovedBy: (rowObj['IsApprovedBy'] || '').toLowerCase() === 'yes' || (rowObj['IsApprovedBy'] || '').toLowerCase() === 'true',
            isReceivedBy: (rowObj['IsReceivedBy'] || '').toLowerCase() === 'yes' || (rowObj['IsReceivedBy'] || '').toLowerCase() === 'true' || true,
            isActive: (rowObj['Status'] || 'Active').toLowerCase() !== 'inactive'
          });
        }
      }

      if (rows.length === 0) {
        setError('No valid data records found in CSV.');
      } else {
        setError(null);
      }
      setParsedRows(rows);
    } catch (err: any) {
      console.error(err);
      setError(`Failed to parse CSV: ${err.message || 'Unknown parsing error'}`);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.txt') && !selectedFile.name.endsWith('.tsv')) {
      setError('Please select a valid CSV or plain text delimited file.');
      return;
    }
    setFile(selectedFile);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      parseCsvText(content);
    };
    reader.onerror = () => {
      setError('Error reading file content.');
    };
    reader.readAsText(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleCommitImport = async () => {
    if (parsedRows.length === 0) return;
    setIsProcessing(true);

    try {
      const validRows = parsedRows.filter(r => r.name.trim().length > 0);
      if (validRows.length === 0) {
        throw new Error('All records are missing required "Name" field.');
      }

      const timestamp = new Date().toISOString();
      const actorId = user?.id || 'sys';

      if (targetType === 'expenseSources') {
        const payload = validRows.map(r => ({
          id: crypto.randomUUID(),
          name: r.name,
          description: r.description,
          address: r.address || 'Dhaka, Bangladesh',
          isActive: r.isActive,
          createdBy: actorId,
          createdAt: timestamp
        }));
        await db.expenseSources.saveBulk(payload);
        await db.auditLogs.add(actorId, 'Bulk Import Vendors', 'Expense Sources', 'Bulk', `Imported ${payload.length} vendors from CSV (${file?.name})`);
      } else if (targetType === 'paymentTypes') {
        const payload = validRows.map(r => ({
          id: crypto.randomUUID(),
          name: r.name,
          description: r.description,
          isActive: r.isActive,
          createdBy: actorId,
          createdAt: timestamp
        }));
        await db.paymentTypes.saveBulk(payload);
        await db.auditLogs.add(actorId, 'Bulk Import Expense Types', 'Payment Types', 'Bulk', `Imported ${payload.length} expense categories from CSV (${file?.name})`);
      } else if (targetType === 'accountTitles') {
        const payload = validRows.map(r => ({
          id: crypto.randomUUID(),
          name: r.name,
          description: r.description,
          isActive: r.isActive,
          createdBy: actorId,
          createdAt: timestamp
        }));
        await db.accountTitles.saveBulk(payload);
        await db.auditLogs.add(actorId, 'Bulk Import Account Titles', 'Account Titles', 'Bulk', `Imported ${payload.length} account titles from CSV (${file?.name})`);
      } else if (targetType === 'people') {
        const payload = validRows.map(r => ({
          id: crypto.randomUUID(),
          name: r.name,
          description: r.department || 'Employee',
          officeId: r.officeId,
          designation: r.designation,
          department: r.department,
          email: r.email,
          phone: r.phone,
          isPreparedBy: r.isPreparedBy,
          isVerifiedBy: r.isVerifiedBy,
          isApprovedBy: r.isApprovedBy,
          isReceivedBy: r.isReceivedBy,
          isActive: r.isActive,
          createdBy: actorId,
          createdAt: timestamp
        }));
        await db.people.saveBulk(payload);
        await db.auditLogs.add(actorId, 'Bulk Import Personnel', 'People', 'Bulk', `Imported ${payload.length} people records from CSV (${file?.name})`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to complete bulk import.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getTargetLabel = (type: CsvTargetType) => {
    switch (type) {
      case 'expenseSources': return 'Vendors & Expense Sources';
      case 'paymentTypes': return 'Expense Types / Categories';
      case 'accountTitles': return 'Account Titles & Funds';
      case 'people': return 'Personnel & Workflow Roles';
    }
  };

  const validCount = parsedRows.filter(r => r.name && r.name.trim().length > 0).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-bg-panel rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-border-subtle flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-subtle bg-bg-base/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent-50 text-accent-600 border border-accent-200">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-base">Bulk CSV Import Utility</h2>
              <p className="text-xs text-text-muted">Upload and populate vendors, categories, and master data in bulk</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-text-muted hover:bg-bg-base hover:text-text-base rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {/* Step 1: Target Entity Selection & Template Download */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                Target Master Data Section
              </label>
              <select
                value={targetType}
                onChange={(e) => {
                  setTargetType(e.target.value as CsvTargetType);
                  setParsedRows([]);
                  setFile(null);
                  setError(null);
                }}
                className="w-full p-2.5 bg-bg-base border border-border-subtle rounded-lg text-sm text-text-base focus:bg-bg-panel focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none transition-all"
              >
                <option value="expenseSources">Vendors & Expense Sources</option>
                <option value="paymentTypes">Expense Types & Categories</option>
                <option value="accountTitles">Account Titles & Funds</option>
                <option value="people">Personnel & Roles</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                Format Template
              </label>
              <button
                type="button"
                onClick={() => downloadTemplate(targetType)}
                className="w-full flex items-center justify-center gap-2 p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium transition-colors shadow-2xs"
              >
                <Download className="w-4 h-4" /> Download Sample CSV ({getTargetLabel(targetType).split(' ')[0]})
              </button>
            </div>
          </div>

          {/* Step 2: Upload Area */}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.txt,.tsv"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
              className="hidden"
            />
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                isDragging 
                  ? 'border-accent-500 bg-accent-50/50' 
                  : file 
                  ? 'border-emerald-300 bg-emerald-50/20' 
                  : 'border-border-subtle hover:border-accent-400 bg-bg-base/40 hover:bg-bg-base'
              }`}
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-accent-100/60 flex items-center justify-center text-accent-600">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-text-base mb-1">
                {file ? file.name : 'Click to select or drag and drop your CSV file'}
              </p>
              <p className="text-xs text-text-muted">
                {file ? `${(file.size / 1024).toFixed(1)} KB — Ready for validation` : 'Supports standard UTF-8 encoded .CSV, .TSV and comma-separated spreadsheets'}
              </p>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-start gap-3 p-3.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Import Warning</p>
                <p className="text-xs">{error}</p>
              </div>
            </div>
          )}

          {/* Step 3: Parsed Data Table Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h4 className="text-sm font-bold text-text-base">Data Preview & Validation</h4>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {validCount} valid
                  </span>
                  {invalidCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                      <AlertCircle className="w-3.5 h-3.5" /> {invalidCount} skipped
                    </span>
                  )}
                </div>
                <span className="text-xs text-text-muted">Showing first {Math.min(5, parsedRows.length)} of {parsedRows.length} rows</span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-border-subtle max-h-56">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-bg-base border-b border-border-subtle sticky top-0">
                    <tr>
                      <th className="px-3 py-2 font-semibold text-text-muted">Row</th>
                      <th className="px-3 py-2 font-semibold text-text-muted">Name</th>
                      <th className="px-3 py-2 font-semibold text-text-muted">Description / Details</th>
                      {targetType === 'expenseSources' && <th className="px-3 py-2 font-semibold text-text-muted">Address</th>}
                      {targetType === 'people' && <th className="px-3 py-2 font-semibold text-text-muted">Designation & Roles</th>}
                      <th className="px-3 py-2 font-semibold text-text-muted">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle bg-bg-panel">
                    {parsedRows.slice(0, 10).map((row, idx) => {
                      const isValid = row.name && row.name.trim().length > 0;
                      return (
                        <tr key={idx} className={isValid ? 'hover:bg-bg-base' : 'bg-red-50/50'}>
                          <td className="px-3 py-2 text-text-muted">{idx + 1}</td>
                          <td className="px-3 py-2 font-medium text-text-base">
                            {row.name || <span className="text-red-500 italic">Missing Name (Will Skip)</span>}
                          </td>
                          <td className="px-3 py-2 text-text-muted truncate max-w-[200px]">{row.description || '-'}</td>
                          {targetType === 'expenseSources' && (
                            <td className="px-3 py-2 text-text-muted truncate max-w-[150px]">{row.address || '-'}</td>
                          )}
                          {targetType === 'people' && (
                            <td className="px-3 py-2 text-text-muted">
                              {row.designation} {row.isPreparedBy ? ' [Preparer]' : ''} {row.isApprovedBy ? ' [Approver]' : ''}
                            </td>
                          )}
                          <td className="px-3 py-2">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${row.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
                              {row.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 px-6 border-t border-border-subtle bg-bg-base/70 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-base hover:bg-bg-panel rounded-lg transition-colors"
          >
            Cancel
          </button>
          
          <button
            type="button"
            disabled={parsedRows.length === 0 || validCount === 0 || isProcessing}
            onClick={handleCommitImport}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-accent-600 hover:bg-accent-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Importing Records...
              </>
            ) : (
              <>
                Import {validCount} Records <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
