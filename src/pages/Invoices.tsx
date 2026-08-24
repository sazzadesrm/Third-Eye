import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../lib/db';
import { ConfirmModal } from '../components/ConfirmModal';
import { Invoice, RecurringInvoice, ExpenseSource, PaymentType, Person, InvoiceStatus } from '../types';
import { formatCurrency, numberToWords } from '../lib/utils';
import { 
  Plus, Search, Eye, Download, Upload, Edit2, FileText, FileSpreadsheet, 
  Trash2, RefreshCw, Play, Pause, Calendar, Clock, ArrowUpRight, CheckCircle2,
  AlertCircle, Sparkles, Layers, Shield, ShieldCheck, Check, XCircle, AlertTriangle,
  Filter, CheckCircle, MessageSquare, Printer, CheckSquare, Square, Archive,
  X, Loader2, Palette, Camera, Tag, Building2, CalendarRange, RotateCcw,
  CheckCheck, DollarSign
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../lib/store';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import { RecurringInvoiceModal } from '../components/RecurringInvoiceModal';
import { InvoiceReviewModal } from '../components/InvoiceReviewModal';
import { BulkPrintModal } from '../components/BulkPrintModal';
import { PDFExportModal } from '../components/PDFExportModal';
import { QRScannerModal } from '../components/QRScannerModal';
import { InvoiceStatusBadge, getStatusDetails } from '../components/InvoiceStatusBadge';

export const Invoices: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'approval-queue' ? 'approval-queue' : 'invoices';
  const [activeTab, setActiveTab] = useState<'invoices' | 'approval-queue' | 'recurring'>(initialTab);
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [recurringInvoices, setRecurringInvoices] = useState<RecurringInvoice[]>([]);
  const [expenseSources, setExpenseSources] = useState<ExpenseSource[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [people, setPeople] = useState<Person[]>([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [sourceFilter, setSourceFilter] = useState<string>('All');
  
  // Date Range Filtering
  const [datePreset, setDatePreset] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [refresh, setRefresh] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedInvoiceForUpload, setSelectedInvoiceForUpload] = useState<string | null>(null);
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkPrintOpen, setIsBulkPrintOpen] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Review Modal State
  const [reviewInvoice, setReviewInvoice] = useState<Invoice | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Branded PDF Modal State
  const [brandedPdfInvoice, setBrandedPdfInvoice] = useState<Invoice | null>(null);
  const [isBrandedPdfOpen, setIsBrandedPdfOpen] = useState(false);

  // QR Scanner Modal State
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

  // Recurring Modal State
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [selectedRecurring, setSelectedRecurring] = useState<RecurringInvoice | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [deleteRecurringConfirmId, setDeleteRecurringConfirmId] = useState<{id: string, title: string} | null>(null);

  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [monthLabel, setMonthLabel] = useState<string | null>(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'approval-queue') {
      setActiveTab('approval-queue');
    }

    const startParam = searchParams.get('startDate');
    const endParam = searchParams.get('endDate');
    const monthParam = searchParams.get('month');
    const yearParam = searchParams.get('year');
    const labelParam = searchParams.get('monthLabel');
    const statusParam = searchParams.get('status');
    const categoryParam = searchParams.get('category');
    const sourceParam = searchParams.get('source') || searchParams.get('vendor');
    const searchParam = searchParams.get('q') || searchParams.get('search');

    if (labelParam) {
      setMonthLabel(labelParam);
    }

    if (startParam && endParam) {
      setStartDate(startParam);
      setEndDate(endParam);
      setDatePreset('custom');
    } else if (monthParam && yearParam) {
      const y = parseInt(yearParam, 10);
      let m = parseInt(monthParam, 10);
      if (m >= 1 && m <= 12 && !searchParams.get('zeroIndexed')) {
        m = m - 1;
      }
      const sDate = `${y}-${String(m + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m + 1, 0).getDate();
      const eDate = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      setStartDate(sDate);
      setEndDate(eDate);
      setDatePreset('custom');
      if (!labelParam) {
        const d = new Date(y, m, 1);
        setMonthLabel(d.toLocaleString('default', { month: 'long', year: 'numeric' }));
      }
    }

    if (statusParam) {
      setStatusFilter(statusParam);
    }
    if (categoryParam) {
      setCategoryFilter(categoryParam);
    }
    if (sourceParam) {
      setSourceFilter(sourceParam);
    }
    if (searchParam) {
      setSearch(searchParam);
    }
  }, [searchParams]);

  useEffect(() => {
    Promise.all([
      db.invoices.getAll(),
      db.recurringInvoices.getAll(),
      db.expenseSources.getAll(),
      db.paymentTypes.getAll(),
      db.people.getAll()
    ]).then(([invs, recs, es, pt, ppl]) => {
      setInvoices(invs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setRecurringInvoices(recs);
      setExpenseSources(es);
      setPaymentTypes(pt);
      setPeople(ppl);
      setLoading(false);
    });
  }, [refresh]);

  // Clear selection when tab or filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab, statusFilter, categoryFilter, sourceFilter, datePreset, startDate, endDate, search]);

  const pendingInvoices = invoices.filter(i => i.status === 'Pending' || i.status === 'Submitted');

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    invoices.forEach(inv => {
      if (inv.paymentTypeId) {
        counts[inv.paymentTypeId] = (counts[inv.paymentTypeId] || 0) + 1;
      }
    });
    return counts;
  }, [invoices]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: invoices.length,
      Pending: invoices.filter(i => i.status === 'Pending' || i.status === 'Submitted').length,
      Approved: invoices.filter(i => i.status === 'Approved').length,
      Paid: invoices.filter(i => i.status === 'Received' || (i.status as any) === 'Paid').length,
      Verified: invoices.filter(i => i.status === 'Verified').length,
      Rejected: invoices.filter(i => i.status === 'Rejected').length,
      Returned: invoices.filter(i => i.status === 'Returned').length,
      Draft: invoices.filter(i => i.status === 'Draft').length
    };
    return counts;
  }, [invoices]);

  // Handle Date Preset Switch
  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7days') {
      const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(past7.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    } else if (preset === '30days') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(past30.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'this_quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const firstDay = new Date(now.getFullYear(), currentQuarter * 3, 1);
      const lastDay = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    } else if (preset === 'this_year') {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      const lastDay = new Date(now.getFullYear(), 11, 31);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('All');
    setCategoryFilter('All');
    setSourceFilter('All');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setMonthLabel(null);
  };

  const isFiltered = search !== '' || 
    statusFilter !== 'All' || 
    categoryFilter !== 'All' || 
    sourceFilter !== 'All' || 
    datePreset !== 'all' || 
    startDate !== '' || 
    endDate !== '' ||
    monthLabel !== null;

  const filteredInvoices = useMemo(() => {
    return invoices.filter(i => {
      // 1. Search filter
      const searchLower = search.toLowerCase();
      const expSourceName = expenseSources.find(e => e.id === i.expenseSourceId)?.name || '';
      const paymentTypeName = paymentTypes.find(p => p.id === i.paymentTypeId)?.name || '';

      const matchesSearch = !search || 
        i.invoiceNumber.toLowerCase().includes(searchLower) || 
        i.purpose.toLowerCase().includes(searchLower) ||
        (i.reviewRemarks && i.reviewRemarks.toLowerCase().includes(searchLower)) ||
        expSourceName.toLowerCase().includes(searchLower) ||
        paymentTypeName.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;

      // 2. Tab condition
      if (activeTab === 'approval-queue') {
        if (i.status !== 'Pending' && i.status !== 'Submitted') return false;
      }

      // 3. Status filter
      if (statusFilter !== 'All') {
        if (statusFilter === 'Paid' || statusFilter === 'Received') {
          if (i.status !== 'Received' && (i.status as any) !== 'Paid') return false;
        } else if (statusFilter === 'Pending') {
          if (i.status !== 'Pending' && i.status !== 'Submitted') return false;
        } else {
          if (i.status !== statusFilter) return false;
        }
      }

      // 4. Category filter
      if (categoryFilter !== 'All') {
        if (i.paymentTypeId !== categoryFilter) return false;
      }

      // 5. Vendor / Expense source filter
      if (sourceFilter !== 'All') {
        if (i.expenseSourceId !== sourceFilter) return false;
      }

      // 6. Date Range filter
      if (startDate || endDate) {
        const invDateStr = i.date ? new Date(i.date).toISOString().split('T')[0] : '';
        if (startDate && invDateStr < startDate) return false;
        if (endDate && invDateStr > endDate) return false;
      }

      return true;
    });
  }, [invoices, search, activeTab, statusFilter, categoryFilter, sourceFilter, startDate, endDate, expenseSources, paymentTypes]);

  const filteredRecurring = recurringInvoices.filter(r => 
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.frequency.toLowerCase().includes(search.toLowerCase()) ||
    (r.purpose && r.purpose.toLowerCase().includes(search.toLowerCase()))
  );

  // Bulk Selection Toggles
  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInvoices.map(i => i.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectedInvoicesList = invoices.filter(i => selectedIds.has(i.id));

  // Bulk Action: Download as ZIP
  const handleBulkDownloadZip = async () => {
    if (selectedInvoicesList.length === 0) return;

    setIsBulkProcessing(true);
    try {
      const zip = new JSZip();
      const folderVouchers = zip.folder("Vouchers");
      const folderAttachments = zip.folder("Attachments");

      // 1. Generate Summary CSV
      const csvRows = [
        ['Invoice Number', 'Date', 'Expense Source', 'Payment Type', 'Purpose', 'Amount', 'Status', 'Seal Code', 'Ref Code', 'Review Remarks'].join(',')
      ];

      selectedInvoicesList.forEach(inv => {
        const expSource = expenseSources.find(e => e.id === inv.expenseSourceId)?.name || 'N/A';
        const expAddr = expenseSources.find(e => e.id === inv.expenseSourceId)?.address || '';
        const pType = paymentTypes.find(p => p.id === inv.paymentTypeId)?.name || 'N/A';
        const prepBy = people.find(p => p.id === inv.preparedById)?.name || 'Authorized Staff';
        const verBy = people.find(p => p.id === inv.verifiedById)?.name || 'Finance Officer';
        const appBy = people.find(p => p.id === inv.approvedById)?.name || 'Managing Director';
        const recBy = people.find(p => p.id === inv.receivedById)?.name || 'Recipient';

        const cleanPurpose = `"${(inv.purpose || '').replace(/"/g, '""')}"`;
        const cleanRemarks = `"${(inv.reviewRemarks || '').replace(/"/g, '""')}"`;
        csvRows.push([
          inv.invoiceNumber,
          inv.date,
          `"${expSource.replace(/"/g, '""')}"`,
          `"${pType.replace(/"/g, '""')}"`,
          cleanPurpose,
          inv.amount,
          inv.status,
          inv.sealCode || '',
          inv.referenceCode || '',
          cleanRemarks
        ].join(','));

        // 2. Standalone HTML voucher file
        const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Voucher - ${inv.invoiceNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px 20px; color: #0f172a; background: #f8fafc; line-height: 1.5; }
    .voucher-card { max-width: 800px; margin: 0 auto; background: #fff; border: 2px solid #0f172a; padding: 36px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
    .title { font-size: 26px; font-weight: 900; letter-spacing: 2px; }
    .sub { font-size: 11px; font-weight: 600; color: #475569; letter-spacing: 0.5px; }
    .badge { border: 1px solid #0f172a; padding: 4px 8px; font-size: 11px; font-weight: bold; background: #f8fafc; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 13px; margin-bottom: 24px; }
    .table-box { border: 1px solid #0f172a; margin-bottom: 24px; }
    .table-hdr { background: #f1f5f9; padding: 8px 12px; font-size: 11px; font-weight: bold; border-bottom: 1px solid #0f172a; letter-spacing: 0.5px; }
    .table-body { padding: 14px 12px; font-size: 13px; }
    .amount-box { background: #f8fafc; border-top: 1px solid #0f172a; padding: 12px; display: flex; justify-content: space-between; align-items: center; font-weight: bold; }
    .words-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; font-size: 12px; margin-bottom: 36px; border-radius: 6px; }
    .signatures { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; text-align: center; font-size: 11px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    .sig-line { border-bottom: 1px dashed #64748b; height: 35px; margin-bottom: 6px; }
    @media print { body { background: #fff; padding: 0; } .voucher-card { box-shadow: none; border-color: #000; } }
  </style>
</head>
<body>
  <div class="voucher-card">
    <div class="header">
      <div>
        <div class="title">THIRD EYE</div>
        <div class="sub">FINANCIAL OPERATIONS & EXPENDITURE MANAGEMENT</div>
      </div>
      <div style="text-align: right;">
        <div class="badge">MISCELLANEOUS EXPENDITURE</div>
        <div style="font-size: 11px; margin-top: 4px; font-family: monospace; color: #64748b;">Seal: ${inv.sealCode || 'SEAL-2026'}</div>
      </div>
    </div>
    <div class="grid">
      <div>
        <div><strong>Invoice No:</strong> ${inv.invoiceNumber}</div>
        <div><strong>Payment Type:</strong> ${pType}</div>
        <div><strong>Status:</strong> ${inv.status}</div>
      </div>
      <div style="text-align: right;">
        <div><strong>Date:</strong> ${new Date(inv.date).toLocaleDateString('en-GB')}</div>
        <div><strong>Ref Code:</strong> ${inv.referenceCode || 'REF-STD-99'}</div>
      </div>
    </div>
    <div class="table-box">
      <div class="table-hdr">EXPENSE SOURCE & RECIPIENT</div>
      <div class="table-body">
        <strong>${expSource}</strong><br>
        ${expAddr}
      </div>
      <div class="table-hdr" style="border-top: 1px solid #0f172a;">PARTICULARS / STATEMENT OF EXPENSE</div>
      <div class="table-body">${inv.purpose}</div>
      <div class="amount-box">
        <span>TOTAL AMOUNT PAYABLE:</span>
        <span style="font-size: 18px; font-family: monospace;">${formatCurrency(inv.amount)}</span>
      </div>
    </div>
    <div class="words-box">
      <strong>In Words:</strong> <em>${inv.amountInWords || numberToWords(inv.amount)}</em>
    </div>
    <div class="signatures">
      <div><div class="sig-line"></div><strong>${recBy}</strong><br><span style="color:#64748b;">Received By</span></div>
      <div><div class="sig-line"></div><strong>${prepBy}</strong><br><span style="color:#64748b;">Prepared By</span></div>
      <div><div class="sig-line"></div><strong>${verBy}</strong><br><span style="color:#64748b;">Verified By</span></div>
      <div><div class="sig-line"></div><strong>${appBy}</strong><br><span style="color:#64748b;">Approved By</span></div>
    </div>
  </div>
</body>
</html>`;

        folderVouchers?.file(`Voucher_${inv.invoiceNumber}.html`, htmlContent);

        // 3. Attachments
        if (inv.attachments && inv.attachments.length > 0) {
          inv.attachments.forEach((att, attIdx) => {
            if (att.data && att.data.includes('base64,')) {
              const base64Data = att.data.split('base64,')[1];
              const cleanName = `${inv.invoiceNumber}_att_${attIdx + 1}_${att.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
              folderAttachments?.file(cleanName, base64Data, { base64: true });
            }
          });
        }
      });

      // Add Master CSV Index
      zip.file("Invoices_Index_Summary.csv", csvRows.join('\n'));

      // Generate Master PDF Summary Report
      const doc = new jsPDF();
      doc.text(`Selected Invoices Batch Export (${selectedInvoicesList.length} Vouchers)`, 14, 15);
      autoTable(doc, {
        startY: 20,
        head: [['Invoice No', 'Date', 'Expense Source', 'Purpose', 'Amount', 'Status']],
        body: selectedInvoicesList.map(i => [
          i.invoiceNumber,
          new Date(i.date).toLocaleDateString(),
          expenseSources.find(e => e.id === i.expenseSourceId)?.name || 'N/A',
          i.purpose,
          formatCurrency(i.amount),
          i.status
        ]),
      });
      const pdfArrayBuffer = doc.output('arraybuffer');
      zip.file("Vouchers_Master_Bundle.pdf", pdfArrayBuffer);

      // Generate and trigger download
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ThirdEye_Invoices_Bundle_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      await db.auditLogs.add(
        user?.id || 'sys',
        'Bulk Export ZIP',
        'Invoice',
        'batch',
        `Exported ZIP package containing ${selectedInvoicesList.length} vouchers, receipts, and master PDF summary`
      );

      setActionNotice(`Successfully downloaded ZIP package with ${selectedInvoicesList.length} vouchers & receipts!`);
      setTimeout(() => setActionNotice(null), 4500);
    } catch (err: any) {
      alert(`Failed to generate ZIP archive: ${err.message}`);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Bulk Action: Batch Approve
  const handleBulkApprove = async () => {
    const pendingToApprove = selectedInvoicesList.filter(
      i => i.status === 'Pending' || i.status === 'Submitted' || i.status === 'Returned'
    );
    if (pendingToApprove.length === 0) {
      alert('None of the selected invoices are in Pending or Submitted status.');
      return;
    }

    if (!confirm(`Are you sure you want to approve all ${pendingToApprove.length} selected invoices?`)) {
      return;
    }

    setIsBulkProcessing(true);
    try {
      for (const inv of pendingToApprove) {
        await db.invoices.updateStatus(
          inv.id,
          'Approved',
          user?.id || 'mgr-1',
          `Batch approved by ${user?.name || 'Authorized Manager'}`
        );
      }
      setSelectedIds(new Set());
      setRefresh(r => r + 1);
      setActionNotice(`Batch approved ${pendingToApprove.length} invoices successfully!`);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      alert(`Error approving batch: ${err.message}`);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Bulk Action: Batch Delete
  const confirmBulkDelete = async () => {
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
  };

  const getStatusColor = (status: InvoiceStatus | string) => {
    switch(status) {
      case 'Approved': return 'bg-emerald-50 text-emerald-700 border-emerald-300';
      case 'Pending':
      case 'Submitted': return 'bg-amber-50 text-amber-700 border-amber-300';
      case 'Verified': return 'bg-sky-50 text-sky-700 border-sky-300';
      case 'Received': return 'bg-indigo-50 text-indigo-700 border-indigo-300';
      case 'Rejected': return 'bg-rose-50 text-rose-700 border-rose-300';
      case 'Returned': return 'bg-orange-50 text-orange-700 border-orange-300';
      case 'Draft': return 'bg-slate-100 text-slate-700 border-slate-300';
      default: return 'bg-bg-base text-text-base border-border-subtle';
    }
  };

  const handleQuickApprove = async (inv: Invoice) => {
    try {
      await db.invoices.updateStatus(inv.id, 'Approved', user?.id || 'sys', 'Quick approved via dashboard');
      setRefresh(r => r + 1);
      setActionNotice(`Invoice ${inv.invoiceNumber} approved successfully!`);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedInvoiceForUpload) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const inv = invoices.find(i => i.id === selectedInvoiceForUpload);
        if (inv) {
          const attachments = inv.attachments || [];
          attachments.push({
            id: crypto.randomUUID(),
            name: file.name,
            type: file.type,
            data: reader.result as string
          });
          inv.attachments = attachments;
          await db.invoices.save(inv);
          await db.auditLogs.add(user?.id || 'sys', 'Upload Document', 'Invoice', inv.id, `Uploaded ${file.name}`);
          setRefresh(r => r + 1);
          setActionNotice(`Document "${file.name}" uploaded successfully.`);
          setTimeout(() => setActionNotice(null), 3000);
        }
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    setSelectedInvoiceForUpload(null);
  };

  const triggerUpload = (invoiceId: string) => {
    setSelectedInvoiceForUpload(invoiceId);
    fileInputRef.current?.click();
  };

  const downloadAttachment = (attachment: any) => {
    const link = document.createElement('a');
    link.href = attachment.data;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const confirmSingleDelete = async () => {
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
  };

  const handleGenerateNow = async (recurringId: string) => {
    try {
      setGeneratingId(recurringId);
      const generatedInvoice = await db.recurringInvoices.generateNow(recurringId, user?.id || 'sys');
      setRefresh(r => r + 1);
      setActionNotice(`Successfully generated Invoice ${generatedInvoice.invoiceNumber} for ${formatCurrency(generatedInvoice.amount)}!`);
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err: any) {
      console.error(err);
      alert(`Error generating invoice: ${err.message}`);
    } finally {
      setGeneratingId(null);
    }
  };

  const handleToggleRecurringStatus = async (item: RecurringInvoice) => {
    const nextStatus = item.status === 'Active' ? 'Paused' : 'Active';
    const updated = { ...item, status: nextStatus as any };
    await db.recurringInvoices.save(updated);
    await db.auditLogs.add(
      user?.id || 'sys',
      'Toggle Recurring Status',
      'Recurring Invoices',
      item.id,
      `Changed status of "${item.title}" to ${nextStatus}`
    );
    setRefresh(r => r + 1);
  };

  const confirmDeleteRecurring = async () => {
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
  };

  const exportToExcel = () => {
    const dataToExport = filteredInvoices.map(inv => ({
      'Invoice No': inv.invoiceNumber,
      'Date': new Date(inv.date).toLocaleDateString(),
      'Purpose': inv.purpose,
      'Amount': inv.amount,
      'Status': inv.status,
      'Review Notes': inv.reviewRemarks || ''
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invoices");
    XLSX.writeFile(workbook, "Invoices_Export.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Invoices & Approvals Report", 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [['Invoice No', 'Date', 'Purpose', 'Amount', 'Status']],
      body: filteredInvoices.map(inv => [
        inv.invoiceNumber,
        new Date(inv.date).toLocaleDateString(),
        inv.purpose,
        inv.amount.toLocaleString('en-IN'),
        inv.status
      ]),
    });
    doc.save("Invoices_Export.pdf");
  };

  const recurringMonthlySum = recurringInvoices
    .filter(r => r.status === 'Active')
    .reduce((sum, r) => {
      if (r.frequency === 'Monthly') return sum + r.amount;
      if (r.frequency === 'Quarterly') return sum + (r.amount / 3);
      if (r.frequency === 'Weekly') return sum + (r.amount * 4.33);
      if (r.frequency === 'Yearly') return sum + (r.amount / 12);
      return sum + r.amount;
    }, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Notice */}
      {actionNotice && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl flex items-center justify-between text-sm animate-in fade-in duration-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-xs text-emerald-700 font-semibold hover:underline">Dismiss</button>
        </div>
      )}

      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-base">Invoices & Approval Workflow</h1>
          <p className="text-text-muted">Manage standard expenditure vouchers, review pending requests, and track recurring subscriptions.</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {activeTab !== 'recurring' ? (
            <>
              <button
                onClick={() => setIsQRScannerOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-accent-50 text-accent-700 border border-accent-200 rounded-lg hover:bg-accent-100 transition-colors text-xs font-semibold shadow-2xs"
                title="Scan physical voucher or vendor bill QR code"
              >
                <Camera className="w-4 h-4 text-accent-600" />
                <span>Scan QR</span>
              </button>
              <button 
                onClick={exportToExcel}
                className="flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors text-xs font-semibold shadow-2xs"
              >
                <FileSpreadsheet className="w-4 h-4" /> Export XLSX
              </button>
              <button 
                onClick={exportToPDF}
                className="flex items-center justify-center gap-2 px-3.5 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors text-xs font-semibold shadow-2xs"
              >
                <Download className="w-4 h-4" /> Export PDF
              </button>
              <Link 
                to="/invoices/new"
                className="flex items-center justify-center gap-2 px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-lg transition-colors text-sm font-medium shadow-sm"
              >
                <Plus className="w-4 h-4" /> New Invoice
              </Link>
            </>
          ) : (
            <button 
              onClick={() => { setSelectedRecurring(null); setIsRecurringModalOpen(true); }}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-lg transition-colors text-sm font-medium shadow-sm"
            >
              <Plus className="w-4 h-4" /> Schedule New Recurring Invoice
            </button>
          )}
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="flex items-center gap-2 border-b border-border-subtle overflow-x-auto pb-0">
        <button
          onClick={() => { setActiveTab('invoices'); setSearchParams({}); }}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'invoices'
              ? 'border-accent-600 text-accent-600'
              : 'border-transparent text-text-muted hover:text-text-base'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>All Invoices</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-bg-panel border border-border-subtle">
            {invoices.length}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('approval-queue'); setSearchParams({ tab: 'approval-queue' }); }}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'approval-queue'
              ? 'border-amber-600 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-text-muted hover:text-text-base'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-amber-500" />
          <span>Approval Queue</span>
          {pendingInvoices.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 font-bold border border-amber-300">
              {pendingInvoices.length} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveTab('recurring'); setSearchParams({}); }}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'recurring'
              ? 'border-accent-600 text-accent-600'
              : 'border-transparent text-text-muted hover:text-text-base'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>Recurring Schedules</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-accent-50 text-accent-700 font-bold border border-accent-200">
            {recurringInvoices.length}
          </span>
        </button>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
        accept=".pdf,.jpg,.jpeg,.png"
      />

      {/* Tabs 1 & 2: Invoices and Approval Queue */}
      {(activeTab === 'invoices' || activeTab === 'approval-queue') && (
        <div className="bg-bg-panel rounded-xl shadow-sm border border-border-subtle overflow-hidden space-y-0">
          {/* Filter Bar */}
          <div className="p-4 border-b border-border-subtle bg-bg-panel space-y-3">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search by #, purpose, category, vendor, notes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-bg-base border border-border-subtle rounded-lg text-sm text-text-base focus:bg-bg-panel focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none transition-all placeholder:text-text-muted"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-base p-0.5"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Dropdown Filters Group */}
              <div className="flex flex-wrap items-center gap-2">
                {/* 1. Date Range Dropdown */}
                <div className="relative flex items-center">
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-bg-base border border-border-subtle rounded-lg text-xs font-semibold text-text-base focus-within:ring-2 focus-within:ring-accent-200 hover:border-border-muted transition-colors">
                    <Calendar className="w-3.5 h-3.5 text-accent-600 shrink-0" />
                    <select
                      value={datePreset}
                      onChange={(e) => handleDatePresetChange(e.target.value)}
                      className="bg-transparent text-text-base outline-none cursor-pointer pr-1 text-xs font-semibold"
                    >
                      <option value="all">All Dates</option>
                      <option value="today">Today</option>
                      <option value="7days">Last 7 Days</option>
                      <option value="this_month">This Month</option>
                      <option value="30days">Last 30 Days</option>
                      <option value="this_quarter">This Quarter</option>
                      <option value="this_year">This Year</option>
                      <option value="custom">Custom Date Range...</option>
                    </select>
                  </div>
                </div>

                {/* 2. Expense Category Dropdown */}
                <div className="relative flex items-center">
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-bg-base border border-border-subtle rounded-lg text-xs font-semibold text-text-base focus-within:ring-2 focus-within:ring-accent-200 hover:border-border-muted transition-colors">
                    <Tag className="w-3.5 h-3.5 text-accent-600 shrink-0" />
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="bg-transparent text-text-base outline-none cursor-pointer pr-1 text-xs font-semibold max-w-[170px] truncate"
                    >
                      <option value="All">All Categories ({invoices.length})</option>
                      {paymentTypes.map(pt => (
                        <option key={pt.id} value={pt.id}>
                          {pt.name} ({categoryCounts[pt.id] || 0})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3. Workflow Status Dropdown (In All Invoices tab) */}
                {activeTab === 'invoices' && (
                  <div className="relative flex items-center">
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-bg-base border border-border-subtle rounded-lg text-xs font-semibold text-text-base focus-within:ring-2 focus-within:ring-accent-200 hover:border-border-muted transition-colors">
                      <Shield className="w-3.5 h-3.5 text-accent-600 shrink-0" />
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-transparent text-text-base outline-none cursor-pointer pr-1 text-xs font-semibold"
                      >
                        <option value="All">All Statuses ({invoices.length})</option>
                        <option value="Pending">Pending Review ({statusCounts.Pending || 0})</option>
                        <option value="Approved">Approved ({statusCounts.Approved || 0})</option>
                        <option value="Paid">Paid / Received ({statusCounts.Paid || 0})</option>
                        <option value="Verified">Verified ({statusCounts.Verified || 0})</option>
                        <option value="Rejected">Rejected ({statusCounts.Rejected || 0})</option>
                        <option value="Returned">Returned ({statusCounts.Returned || 0})</option>
                        <option value="Draft">Draft ({statusCounts.Draft || 0})</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* 4. Vendor / Source Filter */}
                <div className="relative flex items-center">
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-bg-base border border-border-subtle rounded-lg text-xs font-semibold text-text-base focus-within:ring-2 focus-within:ring-accent-200 hover:border-border-muted transition-colors">
                    <Building2 className="w-3.5 h-3.5 text-text-muted shrink-0" />
                    <select
                      value={sourceFilter}
                      onChange={(e) => setSourceFilter(e.target.value)}
                      className="bg-transparent text-text-base outline-none cursor-pointer pr-1 text-xs font-semibold max-w-[150px] truncate"
                    >
                      <option value="All">All Vendors</option>
                      {expenseSources.map(es => (
                        <option key={es.id} value={es.id}>{es.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Reset Filters button */}
                {isFiltered && (
                  <button
                    onClick={handleResetFilters}
                    className="flex items-center gap-1 px-3 py-2 bg-bg-base hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 text-text-muted border border-border-subtle rounded-lg text-xs font-semibold transition-colors"
                    title="Reset all active filters"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Custom Date Range Picker Sub-Bar (When Custom Range is active) */}
            {datePreset === 'custom' && (
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border-subtle/60 text-xs animate-in fade-in duration-200">
                <span className="text-text-muted font-medium flex items-center gap-1">
                  <CalendarRange className="w-3.5 h-3.5 text-accent-600" />
                  Custom Range:
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-bg-base border border-border-subtle rounded-lg px-2.5 py-1.5">
                    <span className="text-text-muted font-mono text-[11px]">From:</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-transparent text-xs text-text-base outline-none font-medium"
                    />
                  </div>
                  <span className="text-text-muted">to</span>
                  <div className="flex items-center gap-1 bg-bg-base border border-border-subtle rounded-lg px-2.5 py-1.5">
                    <span className="text-text-muted font-mono text-[11px]">To:</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-transparent text-xs text-text-base outline-none font-medium"
                    />
                  </div>
                  {(startDate || endDate) && (
                    <button
                      onClick={() => { setStartDate(''); setEndDate(''); }}
                      className="text-text-muted hover:text-rose-600 text-xs px-2 py-1"
                    >
                      Clear dates
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Active Filter Chips Strip */}
            {isFiltered && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border-subtle/50 text-xs">
                <span className="text-text-muted font-medium">
                  Showing <strong className="text-text-base font-bold">{filteredInvoices.length}</strong> of {invoices.length} invoices:
                </span>

                {search && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent-50 text-accent-800 dark:bg-accent-950/40 dark:text-accent-300 border border-accent-200 text-xs">
                    Search: "{search}"
                    <button onClick={() => setSearch('')} className="hover:text-accent-950 p-0.5"><X className="w-3 h-3" /></button>
                  </span>
                )}

                {datePreset !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 text-xs font-medium">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>
                      {monthLabel 
                        ? `Month: ${monthLabel}`
                        : datePreset === 'custom' 
                        ? `Date: ${startDate || 'Start'} to ${endDate || 'End'}` 
                        : `Date: ${datePreset.replace('_', ' ')}`
                      }
                    </span>
                    <button 
                      onClick={() => {
                        handleDatePresetChange('all');
                        setMonthLabel(null);
                      }} 
                      className="hover:text-blue-950 p-0.5 ml-1"
                      title="Clear date filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {categoryFilter !== 'All' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 text-xs">
                    <Tag className="w-3 h-3 text-emerald-600" />
                    Category: {paymentTypes.find(p => p.id === categoryFilter)?.name || categoryFilter}
                    <button onClick={() => setCategoryFilter('All')} className="hover:text-emerald-950 p-0.5"><X className="w-3 h-3" /></button>
                  </span>
                )}

                {statusFilter !== 'All' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 text-xs">
                    <Shield className="w-3 h-3 text-amber-600" />
                    Status: {statusFilter}
                    <button onClick={() => setStatusFilter('All')} className="hover:text-amber-950 p-0.5"><X className="w-3 h-3" /></button>
                  </span>
                )}

                {sourceFilter !== 'All' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 text-xs">
                    <Building2 className="w-3 h-3 text-purple-600" />
                    Vendor: {expenseSources.find(e => e.id === sourceFilter)?.name || sourceFilter}
                    <button onClick={() => setSourceFilter('All')} className="hover:text-purple-950 p-0.5"><X className="w-3 h-3" /></button>
                  </span>
                )}

                <button
                  onClick={handleResetFilters}
                  className="text-accent-600 hover:text-accent-700 underline text-xs font-semibold ml-auto"
                >
                  Clear all filters
                </button>
              </div>
            )}

            {activeTab === 'approval-queue' && (
              <div className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-200 font-medium flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Showing invoices awaiting manager review and approval</span>
              </div>
            )}
          </div>

          {/* Floating / Sticky Bulk Action Bar */}
          {selectedIds.size > 0 && (
            <div className="bg-accent-900 text-white px-3 sm:px-6 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150 border-b border-accent-800 shadow-md">
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-accent-500 text-xs font-bold text-white font-mono">
                    {selectedIds.size}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold">
                    {selectedIds.size} Invoice{selectedIds.size > 1 ? 's' : ''} Selected
                  </span>
                </div>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs text-slate-300 hover:text-white underline ml-2"
                >
                  Clear
                </button>
              </div>

              <div className="flex items-center flex-wrap gap-2">
                {/* Print Selected */}
                <button
                  onClick={() => setIsBulkPrintOpen(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-semibold shadow-xs transition-colors"
                  title="Print all selected vouchers in corporate layout with clean page-breaks"
                >
                  <Printer className="w-3.5 h-3.5 text-accent-600" />
                  <span>Print ({selectedIds.size})</span>
                </button>

                {/* Download as ZIP */}
                <button
                  onClick={handleBulkDownloadZip}
                  disabled={isBulkProcessing}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-accent-600 hover:bg-accent-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                  title="Export complete ZIP archive with HTML vouchers, index CSV, and attachments"
                >
                  {isBulkProcessing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Archive className="w-3.5 h-3.5" />
                  )}
                  <span>ZIP Export</span>
                </button>

                {/* Batch Approve (if any pending) */}
                {selectedInvoicesList.some(i => i.status === 'Pending' || i.status === 'Submitted' || i.status === 'Returned') && (
                  <button
                    onClick={handleBulkApprove}
                    disabled={isBulkProcessing}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                    title="Batch approve selected pending vouchers"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                )}

                {/* Bulk Print */}
                <button
                  onClick={() => setIsBulkPrintOpen(true)}
                  disabled={isBulkProcessing}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                  title="Print all selected vouchers"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Batch</span>
                </button>
                
                {/* Batch Delete */}
                <button
                  onClick={handleBulkDelete}
                  disabled={isBulkProcessing}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                  title="Delete all selected vouchers"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          )}

          {/* 1. Mobile Cards View (Visible on mobile screens below md) */}
          <div className="block md:hidden divide-y divide-border-subtle">
            {/* Mobile Select All Header */}
            <div className="px-4 py-2.5 bg-bg-base flex items-center justify-between text-xs border-b border-border-subtle">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="flex items-center gap-2 font-semibold text-text-muted hover:text-accent-600 transition-colors"
              >
                {selectedIds.size > 0 && selectedIds.size === filteredInvoices.length ? (
                  <CheckSquare className="w-4 h-4 text-accent-600" />
                ) : (
                  <Square className="w-4 h-4 text-text-muted" />
                )}
                <span>Select All ({filteredInvoices.length})</span>
              </button>

              <span className="text-text-muted text-[11px]">
                {filteredInvoices.length} invoice{filteredInvoices.length === 1 ? '' : 's'}
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-text-muted text-sm">Loading invoices...</div>
            ) : filteredInvoices.length === 0 ? (
              <div className="p-8 text-center text-text-muted text-sm">
                {activeTab === 'approval-queue' ? (
                  <div className="space-y-1">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
                    <p className="font-semibold text-text-base">Approval Queue is Clear!</p>
                    <p className="text-xs">No pending invoices currently require manager review.</p>
                  </div>
                ) : (
                  'No invoices found matching criteria.'
                )}
              </div>
            ) : (
              filteredInvoices.map((inv) => {
                const paymentType = paymentTypes.find(p => p.id === inv.paymentTypeId);
                const expenseSource = expenseSources.find(e => e.id === inv.expenseSourceId);
                const isSelected = selectedIds.has(inv.id);

                return (
                  <div 
                    key={`mobile-card-${inv.id}`}
                    className={`p-4 space-y-3 transition-colors ${
                      isSelected ? 'bg-accent-50/60 dark:bg-accent-950/30' : 'bg-bg-panel hover:bg-bg-base'
                    }`}
                  >
                    {/* Top Row: Checkbox, Invoice #, Status Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(inv.id)}
                          className="w-4 h-4 rounded border-border-subtle text-accent-600 focus:ring-accent-500 cursor-pointer accent-accent-600 shrink-0"
                          aria-label={`Select invoice ${inv.invoiceNumber}`}
                        />
                        <span className="font-bold text-sm font-mono text-text-base truncate">
                          {inv.invoiceNumber}
                        </span>
                      </div>
                      <InvoiceStatusBadge
                        status={inv.status}
                        onClick={() => { setReviewInvoice(inv); setIsReviewModalOpen(true); }}
                        size="sm"
                      />
                    </div>

                    {/* Purpose & Notes */}
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-text-base line-clamp-2 leading-snug">
                        {inv.purpose}
                      </p>
                      
                      {inv.reviewRemarks && (
                        <div className="flex items-start gap-1.5 text-xs text-text-muted bg-bg-base p-2 rounded border border-border-subtle">
                          <MessageSquare className="w-3 h-3 text-accent-600 shrink-0 mt-0.5" />
                          <span className="italic">"{inv.reviewRemarks}"</span>
                        </div>
                      )}
                    </div>

                    {/* Metadata Row: Date, Tags, Amount */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-border-subtle/50 text-xs">
                      <div className="flex flex-wrap items-center gap-1.5 text-text-muted">
                        <span className="font-medium text-text-muted">{new Date(inv.date).toLocaleDateString()}</span>
                        {paymentType && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-bg-base rounded text-[11px] font-medium border border-border-subtle">
                            <Tag className="w-2.5 h-2.5 text-accent-600 shrink-0" />
                            <span className="truncate max-w-[90px]">{paymentType.name}</span>
                          </span>
                        )}
                        {expenseSource && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-bg-base rounded text-[11px] text-text-muted border border-border-subtle">
                            <Building2 className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate max-w-[100px]">{expenseSource.name}</span>
                          </span>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-text-base font-mono">
                          {formatCurrency(inv.amount)}
                        </span>
                      </div>
                    </div>

                    {/* Attachments if any */}
                    {inv.attachments && inv.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {inv.attachments.map(att => (
                          <button 
                            key={att.id} 
                            onClick={() => downloadAttachment(att)} 
                            className="text-[10px] bg-accent-50 text-accent-700 px-2 py-0.5 rounded flex items-center gap-1 hover:bg-accent-100 transition-colors border border-accent-200" 
                            title={`Download ${att.name}`}
                          >
                            <FileText className="w-3 h-3" />
                            <span className="max-w-[120px] truncate">{att.name}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Action Buttons Row */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border-subtle">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => { setReviewInvoice(inv); setIsReviewModalOpen(true); }}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-accent-50 text-accent-700 hover:bg-accent-100 border border-accent-200 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Review</span>
                        </button>

                        {(inv.status === 'Pending' || inv.status === 'Submitted') && (
                          <button
                            onClick={() => handleQuickApprove(inv)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors"
                            title="Quick Approve"
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Approve</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Link 
                          to={`/voucher/${inv.id}`} 
                          title="View Voucher" 
                          className="p-1.5 text-text-muted hover:text-accent-600 rounded-lg hover:bg-bg-base transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        <button
                          onClick={() => {
                            setBrandedPdfInvoice(inv);
                            setIsBrandedPdfOpen(true);
                          }}
                          title="Export Branded PDF"
                          className="p-1.5 text-text-muted hover:text-indigo-600 rounded-lg hover:bg-bg-base transition-colors"
                        >
                          <Palette className="w-4 h-4" />
                        </button>

                        {(inv.status === 'Draft' || inv.status === 'Returned' || user?.role === 'Super Admin') && (
                          <button 
                            onClick={() => navigate(`/invoices/edit/${inv.id}`)} 
                            title="Edit Invoice" 
                            className="p-1.5 text-text-muted hover:text-amber-600 rounded-lg hover:bg-bg-base transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}

                        <button 
                          onClick={() => triggerUpload(inv.id)} 
                          title="Upload Attachment" 
                          className="p-1.5 text-text-muted hover:text-emerald-600 rounded-lg hover:bg-bg-base transition-colors"
                        >
                          <Upload className="w-4 h-4" />
                        </button>

                        <button 
                          onClick={() => handleDelete(inv.id)} 
                          title="Delete Invoice" 
                          className="p-1.5 text-text-muted hover:text-red-600 rounded-lg hover:bg-bg-base transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 2. Desktop Table View (Visible on screens md & up) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bg-base border-b border-border-subtle">
                  {/* Select All Checkbox */}
                  <th className="w-10 px-4 py-4 text-center">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="p-1 rounded text-text-muted hover:text-accent-600 transition-colors"
                      title={selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0 ? "Deselect all" : "Select all in view"}
                    >
                      {selectedIds.size > 0 && selectedIds.size === filteredInvoices.length ? (
                        <CheckSquare className="w-4 h-4 text-accent-600" />
                      ) : selectedIds.size > 0 ? (
                        <div className="w-4 h-4 rounded border-2 border-accent-600 bg-accent-100 flex items-center justify-center">
                          <div className="w-2 h-0.5 bg-accent-600"></div>
                        </div>
                      ) : (
                        <Square className="w-4 h-4 text-text-muted" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Invoice No.</th>
                  <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Purpose & Notes</th>
                  <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Workflow Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Approval Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-text-muted text-sm">Loading invoices...</td></tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-text-muted text-sm">
                      {activeTab === 'approval-queue' ? (
                        <div className="space-y-1">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
                          <p className="font-semibold text-text-base">Approval Queue is Clear!</p>
                          <p className="text-xs">No pending invoices currently require manager review.</p>
                        </div>
                      ) : (
                        'No invoices found matching criteria.'
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const paymentType = paymentTypes.find(p => p.id === inv.paymentTypeId);
                    const expenseSource = expenseSources.find(e => e.id === inv.expenseSourceId);

                    return (
                      <tr 
                        key={inv.id} 
                        className={`hover:bg-bg-base transition-colors ${selectedIds.has(inv.id) ? 'bg-accent-50/50 dark:bg-accent-950/20' : ''}`}
                      >
                        {/* Row Checkbox */}
                        <td className="w-10 px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(inv.id)}
                            onChange={() => handleToggleSelect(inv.id)}
                            className="w-4 h-4 rounded border-border-subtle text-accent-600 focus:ring-accent-500 cursor-pointer accent-accent-600"
                          />
                        </td>

                        {/* Invoice Number */}
                        <td className="px-4 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-text-base font-mono">{inv.invoiceNumber}</span>
                            {inv.attachments && inv.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {inv.attachments.map(att => (
                                  <button key={att.id} onClick={() => downloadAttachment(att)} className="text-[10px] bg-accent-50 text-accent-700 px-1.5 py-0.5 rounded flex items-center gap-1 hover:bg-accent-100 transition-colors border border-accent-200" title={`Download ${att.name}`}>
                                    <FileText className="w-3 h-3" />
                                    <span className="max-w-[60px] truncate">{att.name}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Date */}
                        <td className="px-6 py-4 text-sm text-text-muted whitespace-nowrap">
                          {new Date(inv.date).toLocaleDateString()}
                        </td>

                        {/* Purpose & Category & Review Notes */}
                        <td className="px-6 py-4 max-w-sm">
                          <div className="space-y-1.5">
                            <p className="text-sm text-text-base line-clamp-1 font-medium">{inv.purpose}</p>
                            
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                              {paymentType && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-text-muted bg-bg-base px-2 py-0.5 rounded border border-border-subtle">
                                  <Tag className="w-2.5 h-2.5 text-accent-600 shrink-0" />
                                  <span>{paymentType.name}</span>
                                </span>
                              )}
                              {expenseSource && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-text-muted bg-bg-base px-2 py-0.5 rounded border border-border-subtle">
                                  <Building2 className="w-2.5 h-2.5 text-text-muted shrink-0" />
                                  <span className="truncate max-w-[120px]">{expenseSource.name}</span>
                                </span>
                              )}
                            </div>

                            {inv.reviewRemarks && (
                              <div className="flex items-center gap-1 text-xs text-text-muted bg-bg-base px-2 py-1 rounded border border-border-subtle">
                                <MessageSquare className="w-3 h-3 text-accent-600 shrink-0" />
                                <span className="truncate italic">"{inv.reviewRemarks}"</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="px-6 py-4 text-sm font-bold text-text-base whitespace-nowrap">
                          {formatCurrency(inv.amount)}
                        </td>

                        {/* Status Badge (Color-coded) */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <InvoiceStatusBadge
                            status={inv.status}
                            onClick={() => { setReviewInvoice(inv); setIsReviewModalOpen(true); }}
                            size="md"
                          />
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {/* Dedicated Review & Approve Button */}
                            <button
                              onClick={() => { setReviewInvoice(inv); setIsReviewModalOpen(true); }}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-accent-50 text-accent-700 hover:bg-accent-100 border border-accent-200 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                              title="Review invoice details, approve, reject, or leave notes"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Review</span>
                            </button>

                            {/* Quick 1-Click Approve (if pending) */}
                            {(inv.status === 'Pending' || inv.status === 'Submitted') && (
                              <button
                                onClick={() => handleQuickApprove(inv)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-200"
                                title="Quick Approve"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}

                          {/* View Voucher */}
                          <Link 
                            to={`/voucher/${inv.id}`} 
                            title="View Voucher" 
                            className="p-1.5 text-text-muted hover:text-accent-600 rounded-lg hover:bg-bg-base transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {/* Export Branded PDF */}
                          <button
                            onClick={() => {
                              setBrandedPdfInvoice(inv);
                              setIsBrandedPdfOpen(true);
                            }}
                            title="Export Branded PDF Voucher"
                            className="p-1.5 text-text-muted hover:text-indigo-600 rounded-lg hover:bg-bg-base transition-colors"
                          >
                            <Palette className="w-4 h-4" />
                          </button>

                          {/* Edit (if draft or rejected) */}
                          {(inv.status === 'Draft' || inv.status === 'Returned' || user?.role === 'Super Admin') && (
                            <button 
                              onClick={() => navigate(`/invoices/edit/${inv.id}`)} 
                              title="Edit Invoice" 
                              className="p-1.5 text-text-muted hover:text-amber-600 rounded-lg hover:bg-bg-base transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Upload */}
                          <button 
                            onClick={() => triggerUpload(inv.id)} 
                            title="Upload Document Attachment" 
                            className="p-1.5 text-text-muted hover:text-emerald-600 rounded-lg hover:bg-bg-base transition-colors"
                          >
                            <Upload className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button 
                            onClick={() => handleDelete(inv.id)} 
                            title="Delete Invoice" 
                            className="p-1.5 text-text-muted hover:text-red-600 rounded-lg hover:bg-bg-base transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Recurring Schedules Section */}
      {activeTab === 'recurring' && (
        <div className="space-y-6">
          {/* Summary Metric Header */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-bg-panel rounded-xl border border-border-subtle shadow-2xs">
              <span className="text-xs font-medium text-text-muted">Active Recurring Plans</span>
              <h3 className="text-2xl font-bold text-text-base mt-1">
                {recurringInvoices.filter(r => r.status === 'Active').length} Active
              </h3>
              <p className="text-xs text-text-muted mt-1">Subscriptions, lease contracts & retainer fees</p>
            </div>

            <div className="p-5 bg-bg-panel rounded-xl border border-border-subtle shadow-2xs">
              <span className="text-xs font-medium text-text-muted">Normalized Monthly Commitment</span>
              <h3 className="text-2xl font-bold text-accent-600 mt-1">
                {formatCurrency(recurringMonthlySum)}
              </h3>
              <p className="text-xs text-text-muted mt-1">Estimated monthly automated outgoing budget</p>
            </div>

            <div className="p-5 bg-bg-panel rounded-xl border border-border-subtle shadow-2xs">
              <span className="text-xs font-medium text-text-muted">Next Cycle Execution</span>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-text-base">
                  {recurringInvoices.length > 0
                    ? recurringInvoices.map(r => r.nextBillingDate).sort()[0]
                    : 'None Scheduled'}
                </h3>
              </div>
              <p className="text-xs text-text-muted mt-1">Automated invoice voucher generation queue</p>
            </div>
          </div>

          {/* Recurring Table / List */}
          <div className="bg-bg-panel rounded-xl shadow-sm border border-border-subtle overflow-hidden">
            <div className="p-4 border-b border-border-subtle flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search recurring schedules by title, frequency, or purpose..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-bg-base border border-border-subtle rounded-lg text-sm text-text-base focus:bg-bg-panel focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none transition-all"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-bg-base border-b border-border-subtle">
                    <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Schedule / Subscription</th>
                    <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Frequency & Day</th>
                    <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Next Billing Date</th>
                    <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {filteredRecurring.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-text-muted text-sm">
                        <RefreshCw className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-40" />
                        <p className="font-semibold text-text-base">No recurring invoice schedules found.</p>
                        <p className="text-xs text-text-muted mt-1">Click "Schedule New Recurring Invoice" to set up monthly/quarterly subscriptions.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRecurring.map((item) => (
                      <tr key={item.id} className="hover:bg-bg-base transition-colors">
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <span className="text-sm font-bold text-text-base">{item.title}</span>
                            <p className="text-xs text-text-muted line-clamp-1">{item.purpose || 'No description provided'}</p>
                            {item.lastGeneratedInvoiceId && (
                              <div className="flex items-center gap-1.5 text-[11px] text-accent-700 pt-0.5">
                                <Sparkles className="w-3 h-3 text-accent-600" />
                                <span>Last generated on {item.lastGeneratedDate ? new Date(item.lastGeneratedDate).toLocaleDateString() : 'N/A'}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-text-base">
                              <Calendar className="w-3.5 h-3.5 text-accent-600" />
                              {item.frequency}
                            </span>
                            <span className="text-[11px] text-text-muted mt-0.5">
                              Day {item.billingDay} of cycle
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-indigo-600" />
                            <span className="text-xs font-semibold text-text-base font-mono">
                              {item.nextBillingDate}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-text-base">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${
                            item.status === 'Active' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : item.status === 'Paused' 
                              ? 'bg-amber-50 text-amber-700 border-amber-200' 
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Instant Trigger Generate Now */}
                            <button
                              onClick={() => handleGenerateNow(item.id)}
                              disabled={generatingId === item.id}
                              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors shadow-2xs disabled:opacity-50"
                              title="Generate an approved voucher immediately from this recurring template"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>{generatingId === item.id ? 'Generating...' : 'Generate Now'}</span>
                            </button>

                            {/* Pause / Resume */}
                            <button
                              onClick={() => handleToggleRecurringStatus(item)}
                              className="p-1.5 text-text-muted hover:text-text-base hover:bg-bg-panel rounded-lg transition-colors border border-border-subtle"
                              title={item.status === 'Active' ? 'Pause Schedule' : 'Resume Schedule'}
                            >
                              {item.status === 'Active' ? <Pause className="w-4 h-4 text-amber-600" /> : <Play className="w-4 h-4 text-emerald-600" />}
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => { setSelectedRecurring(item); setIsRecurringModalOpen(true); }}
                              className="p-1.5 text-text-muted hover:text-accent-600 hover:bg-bg-panel rounded-lg transition-colors border border-border-subtle"
                              title="Edit Recurring Schedule"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteRecurring(item.id, item.title)}
                              className="p-1.5 text-text-muted hover:text-red-600 hover:bg-bg-panel rounded-lg transition-colors border border-border-subtle"
                              title="Delete Schedule"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Review & Approval Modal */}
      <InvoiceReviewModal
        isOpen={isReviewModalOpen}
        invoice={reviewInvoice}
        expenseSources={expenseSources}
        paymentTypes={paymentTypes}
        people={people}
        onClose={() => { setIsReviewModalOpen(false); setReviewInvoice(null); }}
        onStatusUpdated={(updated) => {
          setRefresh(r => r + 1);
          setActionNotice(`Invoice ${updated.invoiceNumber} status set to "${updated.status}"`);
          setTimeout(() => setActionNotice(null), 4000);
        }}
      />

      {/* Recurring Invoice Modal */}
      <RecurringInvoiceModal
        isOpen={isRecurringModalOpen}
        initialData={selectedRecurring}
        onClose={() => { setIsRecurringModalOpen(false); setSelectedRecurring(null); }}
        onSave={() => setRefresh(r => r + 1)}
      />

      {/* Bulk Print Vouchers Modal */}
      <BulkPrintModal
        isOpen={isBulkPrintOpen}
        onClose={() => setIsBulkPrintOpen(false)}
        invoices={selectedInvoicesList}
        expenseSources={expenseSources}
        paymentTypes={paymentTypes}
        people={people}
      />

      {/* Customizable Branded PDF Export Modal */}
      {brandedPdfInvoice && (
        <PDFExportModal
          isOpen={isBrandedPdfOpen}
          onClose={() => { setIsBrandedPdfOpen(false); setBrandedPdfInvoice(null); }}
          invoice={brandedPdfInvoice}
          expenseSource={expenseSources.find(e => e.id === brandedPdfInvoice.expenseSourceId)}
          paymentType={paymentTypes.find(e => e.id === brandedPdfInvoice.paymentTypeId)}
          preparedBy={people.find(p => p.id === brandedPdfInvoice.preparedById)}
          verifiedBy={people.find(p => p.id === brandedPdfInvoice.verifiedById)}
          approvedBy={people.find(p => p.id === brandedPdfInvoice.approvedById)}
          receivedBy={people.find(p => p.id === brandedPdfInvoice.receivedById)}
        />
      )}

      {/* QR Code Scanner Modal */}
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
      />
      <ConfirmModal 
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
