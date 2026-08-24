import React, { useState, useMemo } from 'react';
import { 
  X, Download, FileSpreadsheet, FileText, Calendar, Building2, 
  Tag, CheckCircle2, DollarSign, ShieldCheck, Sparkles, Filter,
  ArrowRight, Layers, Table
} from 'lucide-react';
import { Invoice, ExpenseSource, PaymentType, Person } from '../types';
import { formatCurrency, numberToWords } from '../lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface MonthlyAnalyticsExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices?: Invoice[];
  sources?: ExpenseSource[];
  expenseSources?: ExpenseSource[];
  paymentTypes?: PaymentType[];
  people?: Person[];
}

export const MonthlyAnalyticsExportModal: React.FC<MonthlyAnalyticsExportModalProps> = ({
  isOpen,
  onClose,
  invoices = [],
  sources,
  expenseSources,
  paymentTypes = [],
  people = []
}) => {
  const safeSources = sources || expenseSources || [];
  const safePaymentTypes = paymentTypes || [];
  const safeInvoices = invoices || [];
  const safePeople = people || [];

  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth()); // 0-11
  const [statusFilter, setStatusFilter] = useState<'All' | 'Approved' | 'Pending'>('Approved');
  const [companyName, setCompanyName] = useState<string>('Walton Hi-Tech Industries PLC');
  const [reportTitle, setReportTitle] = useState<string>('Monthly Expense Analytics & Ledger Report');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Memoized Lookup Maps
  const srcMap = useMemo(() => new Map(safeSources.map(s => [s.id, s.name])), [safeSources]);
  const typMap = useMemo(() => new Map(safePaymentTypes.map(t => [t.id, t.name])), [safePaymentTypes]);
  const pplMap = useMemo(() => new Map(safePeople.map(p => [p.id, p.name])), [safePeople]);

  // Filter invoices for the selected month and status
  const filteredMonthInvoices = useMemo(() => {
    return safeInvoices.filter(inv => {
      if (!inv || !inv.date) return false;
      const d = new Date(inv.date);
      const matchesDate = d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
      if (!matchesDate) return false;

      if (statusFilter === 'Approved') {
        return inv.status === 'Approved' || inv.status === 'Received';
      }
      if (statusFilter === 'Pending') {
        return inv.status === 'Pending' || inv.status === 'Submitted' || inv.status === 'Verified';
      }
      return true;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [safeInvoices, selectedYear, selectedMonth, statusFilter]);

  // Compute Analytics Breakdowns
  const analytics = useMemo(() => {
    const totalAmount = filteredMonthInvoices.reduce((acc, curr) => acc + curr.amount, 0);
    const count = filteredMonthInvoices.length;
    const avgAmount = count > 0 ? totalAmount / count : 0;

    // Category Breakdown
    const categoryTotals: Record<string, { total: number; count: number }> = {};
    // Vendor Breakdown
    const vendorTotals: Record<string, { total: number; count: number }> = {};

    filteredMonthInvoices.forEach(inv => {
      const cat = (inv.paymentTypeId ? typMap.get(inv.paymentTypeId) : undefined) || 'General Operations';
      const ven = (inv.expenseSourceId ? srcMap.get(inv.expenseSourceId) : undefined) || 'Direct Vendor';

      if (!categoryTotals[cat]) categoryTotals[cat] = { total: 0, count: 0 };
      categoryTotals[cat].total += inv.amount;
      categoryTotals[cat].count += 1;

      if (!vendorTotals[ven]) vendorTotals[ven] = { total: 0, count: 0 };
      vendorTotals[ven].total += inv.amount;
      vendorTotals[ven].count += 1;
    });

    const categoryList = Object.entries(categoryTotals)
      .map(([name, data]) => ({
        name,
        total: data.total,
        count: data.count,
        percentage: totalAmount > 0 ? ((data.total / totalAmount) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.total - a.total);

    const vendorList = Object.entries(vendorTotals)
      .map(([name, data]) => ({
        name,
        total: data.total,
        count: data.count,
        percentage: totalAmount > 0 ? ((data.total / totalAmount) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.total - a.total);

    const topCategory = categoryList[0]?.name || 'N/A';
    const topVendor = vendorList[0]?.name || 'N/A';

    return {
      totalAmount,
      count,
      avgAmount,
      categoryList,
      vendorList,
      topCategory,
      topVendor
    };
  }, [filteredMonthInvoices, srcMap, typMap]);

  if (!isOpen) return null;

  const monthName = new Date(selectedYear, selectedMonth, 1).toLocaleString('default', { month: 'long' });
  const periodLabel = `${monthName} ${selectedYear}`;

  // 1. Export as Professional PDF Report for Accounting Team
  const exportPDF = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const primaryColor: [number, number, number] = [30, 58, 138]; // Corporate Navy Blue
      const grayText: [number, number, number] = [100, 116, 139];

      // Document Header
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 8, 'F');

      // Title & Metadata
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text(companyName.toUpperCase(), 14, 20);

      doc.setFontSize(12);
      doc.setTextColor(...primaryColor);
      doc.text(reportTitle, 14, 27);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...grayText);
      doc.text(`Reporting Period: ${periodLabel}  |  Status Filter: ${statusFilter} Vouchers  |  Generated: ${new Date().toLocaleString()}`, 14, 33);

      doc.setDrawColor(226, 232, 240);
      doc.line(14, 36, 196, 36);

      // Section 1: Executive KPI Summary Box
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 39, 182, 22, 2, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...grayText);
      doc.text('TOTAL EXPENDITURE', 20, 46);
      doc.text('VOUCHERS COUNT', 70, 46);
      doc.text('AVG VOUCHER SIZE', 115, 46);
      doc.text('TOP EXPENSE CATEGORY', 155, 46);

      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`BDT ${analytics.totalAmount.toLocaleString('en-IN')}`, 20, 54);
      doc.text(`${analytics.count} items`, 70, 54);
      doc.text(`BDT ${Math.round(analytics.avgAmount).toLocaleString('en-IN')}`, 115, 54);
      
      doc.setFontSize(9);
      doc.text(analytics.topCategory.length > 18 ? `${analytics.topCategory.slice(0, 18)}...` : analytics.topCategory, 155, 54);

      let currentY = 66;

      // Section 2: Expense Breakdown by Category
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...primaryColor);
      doc.text('1. EXPENSE BREAKDOWN BY CATEGORY', 14, currentY);

      autoTable(doc, {
        startY: currentY + 3,
        head: [['Expense Category / Payment Type', 'Voucher Count', 'Total Spend (BDT)', 'Share %']],
        body: analytics.categoryList.map(c => [
          c.name,
          c.count.toString(),
          `BDT ${c.total.toLocaleString('en-IN')}`,
          `${c.percentage}%`
        ]),
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 8, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 45, halign: 'right' },
          3: { cellWidth: 27, halign: 'right' },
        },
        margin: { left: 14, right: 14 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;

      // Section 3: Itemized Ledger Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...primaryColor);
      doc.text('2. ITEMIZED EXPENDITURE LEDGER', 14, currentY);

      autoTable(doc, {
        startY: currentY + 3,
        head: [['Voucher #', 'Date', 'Vendor / Source', 'Category', 'Particulars / Purpose', 'Status', 'Amount (BDT)']],
        body: filteredMonthInvoices.map(inv => [
          inv.invoiceNumber,
          new Date(inv.date).toLocaleDateString('en-GB'),
          (inv.expenseSourceId ? srcMap.get(inv.expenseSourceId) : undefined) || 'Direct',
          (inv.paymentTypeId ? typMap.get(inv.paymentTypeId) : undefined) || 'General',
          inv.purpose || '-',
          inv.status,
          inv.amount.toLocaleString('en-IN')
        ]),
        theme: 'striped',
        headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 7.5, fontStyle: 'bold' },
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 24, fontStyle: 'bold' },
          1: { cellWidth: 20 },
          2: { cellWidth: 34 },
          3: { cellWidth: 28 },
          4: { cellWidth: 42 },
          5: { cellWidth: 16, halign: 'center' },
          6: { cellWidth: 18, halign: 'right', fontStyle: 'bold' },
        },
        margin: { left: 14, right: 14 }
      });

      // Total summary row at bottom of ledger
      const finalY = (doc as any).lastAutoTable.finalY;
      
      // Check if signature fits on same page or needs new page
      let sigY = finalY + 12;
      if (sigY > 250) {
        doc.addPage();
        sigY = 30;
      }

      // Section 4: Accounting Sign-Off & Verification Block
      doc.setDrawColor(203, 213, 225);
      doc.line(14, sigY, 196, sigY);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);

      const col1 = 30;
      const col2 = 90;
      const col3 = 150;

      doc.line(col1 - 15, sigY + 18, col1 + 35, sigY + 18);
      doc.text('Prepared By (Accounts)', col1 - 5, sigY + 22);

      doc.line(col2 - 15, sigY + 18, col2 + 35, sigY + 18);
      doc.text('Verified By (Audit / FM)', col2 - 8, sigY + 22);

      doc.line(col3 - 15, sigY + 18, col3 + 35, sigY + 18);
      doc.text('Approved By (Managing Director)', col3 - 14, sigY + 22);

      // Page numbers footer on each page
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Third Eye Financial ERP  |  Page ${i} of ${totalPages}  |  Confidential Financial Record`,
          105,
          290,
          { align: 'center' }
        );
      }

      doc.save(`Monthly_Expense_Report_${selectedYear}_${String(selectedMonth + 1).padStart(2, '0')}_${monthName}.pdf`);
    } catch (err: any) {
      console.error(err);
      alert(`Error generating PDF report: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Export as Comprehensive Accounting CSV file
  const exportCSV = () => {
    setIsExporting(true);
    try {
      // Create workbook with multiple sheets or structured CSV
      const summaryRows = [
        ['THIRD EYE MISCELLANEOUS EXPENSE ANALYTICS REPORT'],
        ['Company', companyName],
        ['Period', periodLabel],
        ['Status Filter', statusFilter],
        ['Total Disbursed (BDT)', analytics.totalAmount],
        ['Total Vouchers Count', analytics.count],
        ['Average Voucher Amount (BDT)', Math.round(analytics.avgAmount)],
        ['Top Category', analytics.topCategory],
        ['Top Vendor', analytics.topVendor],
        ['Report Generated', new Date().toISOString()],
        [],
        ['--- CATEGORY SPENDING BREAKDOWN ---'],
        ['Category Name', 'Voucher Count', 'Total Amount (BDT)', 'Percentage Share']
      ];

      analytics.categoryList.forEach(cat => {
        summaryRows.push([cat.name, String(cat.count), String(cat.total), `${cat.percentage}%`]);
      });

      summaryRows.push([]);
      summaryRows.push(['--- ITEMIZED VOUCHER LEDGER ---']);
      summaryRows.push([
        'Invoice Number',
        'Date',
        'Expense Source / Vendor',
        'Payment Category',
        'Particulars / Purpose',
        'Amount (BDT)',
        'Status',
        'Seal Code',
        'Reference Code',
        'Prepared By',
        'Verified By',
        'Approved By',
        'Review Remarks'
      ]);

      filteredMonthInvoices.forEach(inv => {
        const ven = (inv.expenseSourceId ? srcMap.get(inv.expenseSourceId) : undefined) || 'Direct';
        const cat = (inv.paymentTypeId ? typMap.get(inv.paymentTypeId) : undefined) || 'General';
        const prep = (inv.preparedById ? pplMap.get(inv.preparedById) : undefined) || 'Finance Staff';
        const ver = (inv.verifiedById ? pplMap.get(inv.verifiedById) : undefined) || 'Accounts Dept';
        const app = (inv.approvedById ? pplMap.get(inv.approvedById) : undefined) || 'Executive Board';

        summaryRows.push([
          inv.invoiceNumber,
          inv.date,
          ven,
          cat,
          inv.purpose || '',
          String(inv.amount),
          inv.status,
          inv.sealCode || '',
          inv.referenceCode || '',
          prep,
          ver,
          app,
          inv.reviewRemarks || ''
        ]);
      });

      const csvContent = summaryRows
        .map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Monthly_Expense_Ledger_${selectedYear}_${String(selectedMonth + 1).padStart(2, '0')}_${monthName}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert(`Error exporting CSV: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const yearsList = [currentDate.getFullYear(), currentDate.getFullYear() - 1, currentDate.getFullYear() - 2];
  const monthsList = [
    { idx: 0, name: 'January' },
    { idx: 1, name: 'February' },
    { idx: 2, name: 'March' },
    { idx: 3, name: 'April' },
    { idx: 4, name: 'May' },
    { idx: 5, name: 'June' },
    { idx: 6, name: 'July' },
    { idx: 7, name: 'August' },
    { idx: 8, name: 'September' },
    { idx: 9, name: 'October' },
    { idx: 10, name: 'November' },
    { idx: 11, name: 'December' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-bg-panel rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-border-subtle flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-border-subtle bg-bg-base/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent-100 dark:bg-accent-950 text-accent-600 border border-accent-200">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-base flex items-center gap-2">
                Export Monthly Accounting Analytics Report
              </h2>
              <p className="text-xs text-text-muted">
                Generate audit-ready PDF summaries and CSV ledger exports for accounting, finance, and tax reviews
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-text-muted hover:bg-bg-base hover:text-text-base rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-6 flex-1">
          {/* Controls Bar: Month, Year, Status Filter, Company Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-bg-base rounded-xl border border-border-subtle">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                Report Month
              </label>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(parseInt(e.target.value, 10))}
                className="w-full p-2.5 bg-bg-panel border border-border-subtle rounded-lg text-sm text-text-base font-semibold focus:border-accent-500 outline-none cursor-pointer"
              >
                {monthsList.map(m => (
                  <option key={m.idx} value={m.idx}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                Financial Year
              </label>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
                className="w-full p-2.5 bg-bg-panel border border-border-subtle rounded-lg text-sm text-text-base font-semibold focus:border-accent-500 outline-none cursor-pointer"
              >
                {yearsList.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                Voucher Status
              </label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="w-full p-2.5 bg-bg-panel border border-border-subtle rounded-lg text-sm text-text-base font-semibold focus:border-accent-500 outline-none cursor-pointer"
              >
                <option value="Approved">Approved & Disbursed Only</option>
                <option value="All">All Vouchers (Draft, Pending & Approved)</option>
                <option value="Pending">Pending Queue Only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                Organization Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className="w-full p-2 bg-bg-panel border border-border-subtle rounded-lg text-sm text-text-base focus:border-accent-500 outline-none"
                placeholder="Company Name..."
              />
            </div>
          </div>

          {/* Real-time Month Analytics Preview Card */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-text-base flex items-center gap-2">
                <span>Period Summary for {periodLabel}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent-50 text-accent-700 font-bold border border-accent-200">
                  {analytics.count} Vouchers Selected
                </span>
              </h4>
            </div>

            {/* Metrics KPI Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-bg-base/70 rounded-xl border border-border-subtle">
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block mb-1">Total Expenditure</span>
                <div className="text-lg font-black text-text-base">{formatCurrency(analytics.totalAmount)}</div>
              </div>
              <div className="p-3.5 bg-bg-base/70 rounded-xl border border-border-subtle">
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block mb-1">Average / Voucher</span>
                <div className="text-lg font-bold text-text-base">{formatCurrency(analytics.avgAmount)}</div>
              </div>
              <div className="p-3.5 bg-bg-base/70 rounded-xl border border-border-subtle">
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block mb-1">Top Category</span>
                <div className="text-sm font-bold text-text-base truncate">{analytics.topCategory}</div>
              </div>
              <div className="p-3.5 bg-bg-base/70 rounded-xl border border-border-subtle">
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider block mb-1">Top Vendor</span>
                <div className="text-sm font-bold text-text-base truncate">{analytics.topVendor}</div>
              </div>
            </div>

            {/* Category Breakdown Table Preview */}
            {analytics.categoryList.length > 0 ? (
              <div className="border border-border-subtle rounded-xl overflow-hidden">
                <div className="p-3 bg-bg-base border-b border-border-subtle text-xs font-bold text-text-base flex items-center justify-between">
                  <span>Category Spending Breakdown</span>
                  <span className="text-text-muted font-normal">Ranked by volume</span>
                </div>
                <div className="overflow-x-auto max-h-44">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-bg-base/50 text-text-muted uppercase font-semibold border-b border-border-subtle sticky top-0">
                      <tr>
                        <th className="px-3 py-2">Category</th>
                        <th className="px-3 py-2 text-center">Items</th>
                        <th className="px-3 py-2 text-right">Spend (BDT)</th>
                        <th className="px-3 py-2 text-right">Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle bg-bg-panel">
                      {analytics.categoryList.map(c => (
                        <tr key={c.name} className="hover:bg-bg-base">
                          <td className="px-3 py-2 font-medium text-text-base">{c.name}</td>
                          <td className="px-3 py-2 text-center text-text-muted">{c.count}</td>
                          <td className="px-3 py-2 text-right font-bold text-text-base">{formatCurrency(c.total)}</td>
                          <td className="px-3 py-2 text-right">
                            <span className="px-1.5 py-0.5 rounded bg-bg-base text-text-muted font-mono font-medium">
                              {c.percentage}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-bg-base/40 rounded-xl border border-dashed border-border-subtle text-text-muted text-xs">
                No vouchers found matching the selected month ({periodLabel}) and filter criteria.
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 px-6 border-t border-border-subtle bg-bg-base/70 shrink-0 gap-3">
          <div className="text-xs text-text-muted flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Ready for corporate audit compliance & accounting ledger import</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-base hover:bg-bg-panel rounded-lg transition-colors"
            >
              Cancel
            </button>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={exportCSV}
              disabled={isExporting || analytics.count === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download CSV Ledger</span>
            </button>

            {/* Export PDF Button */}
            <button
              type="button"
              onClick={exportPDF}
              disabled={isExporting || analytics.count === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent-600 hover:bg-accent-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF Accounting Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
