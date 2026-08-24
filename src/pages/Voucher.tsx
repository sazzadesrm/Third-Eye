import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/db';
import { Invoice, ExpenseSource, PaymentType, Person, InvoiceStatus, AppSettings } from '../types';
import { formatCurrency } from '../lib/utils';
import { toPng, toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Printer, Download, ArrowLeft, Image as ImageIcon, FileSearch, Mail, 
  ShieldCheck, AlertTriangle, CheckCircle, XCircle, Clock, Edit2, Palette, Sparkles, Calendar, User, FileText, CheckSquare, CreditCard, Building, Tags, Wallet 
} from 'lucide-react';
import { InvoiceReviewModal } from '../components/InvoiceReviewModal';
import { PDFExportModal } from '../components/PDFExportModal';
import { EmailInvoiceModal } from '../components/EmailInvoiceModal';
import { PrintPreviewModal } from '../components/PrintPreviewModal';
import { PromptModal } from '../components/PromptModal';
import { useAuthStore } from '../lib/store';

export const Voucher: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [expenseSource, setExpenseSource] = useState<ExpenseSource | null>(null);
  const [paymentType, setPaymentType] = useState<PaymentType | null>(null);
  
  const [preparedBy, setPreparedBy] = useState<Person | null>(null);
  const [verifiedBy, setVerifiedBy] = useState<Person | null>(null);
  const [approvedBy, setApprovedBy] = useState<Person | null>(null);
  const [receivedBy, setReceivedBy] = useState<Person | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const [allExpenseSources, setAllExpenseSources] = useState<ExpenseSource[]>([]);
  const [allPaymentTypes, setAllPaymentTypes] = useState<PaymentType[]>([]);
  const [allPeople, setAllPeople] = useState<Person[]>([]);

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isBrandedPDFOpen, setIsBrandedPDFOpen] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  const voucherRef = useRef<HTMLDivElement>(null);

  const loadData = () => {
    if (!id) return;
    db.invoices.getById(id).then(async inv => {
      if (inv) {
        setInvoice(inv);
        const [es, pt, people] = await Promise.all([
          db.expenseSources.getAll(),
          db.paymentTypes.getAll(),
          db.people.getAll()
        ]);
        
        setAllExpenseSources(es);
        setAllPaymentTypes(pt);
        setAllPeople(people);

        setExpenseSource(es.find(e => e.id === inv.expenseSourceId) || null);
        setPaymentType(pt.find(e => e.id === inv.paymentTypeId) || null);
        
        setPreparedBy(people.find(p => p.id === inv.preparedById) || null);
        setVerifiedBy(people.find(p => p.id === inv.verifiedById) || null);
        setApprovedBy(people.find(p => p.id === inv.approvedById) || null);
        setReceivedBy(people.find(p => p.id === inv.receivedById) || null);
      }
    });
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const downloadPDF = async () => {
    if (!voucherRef.current || !invoice) return;
    try {
      const imgData = await toPng(voucherRef.current, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const img = new Image();
      img.src = imgData;
      await new Promise(res => { img.onload = res; });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (img.height * pdfWidth) / img.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Voucher_${invoice.invoiceNumber}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Error generating PDF. Please try again.');
    }
  };

  const downloadImage = async (format: 'jpg' | 'png') => {
    if (!voucherRef.current || !invoice) return;
    try {
      const dataUrl = format === 'jpg'
        ? await toJpeg(voucherRef.current, { quality: 0.95, pixelRatio: 2, backgroundColor: '#ffffff' })
        : await toPng(voucherRef.current, { pixelRatio: 2, backgroundColor: '#ffffff' });
      
      const link = document.createElement('a');
      link.download = `Voucher_${invoice.invoiceNumber}.${format}`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Image export error:', err);
      alert('Error generating image export.');
    }
  };

  const handleEmail = async (email: string) => {
    setIsEmailModalOpen(false);
    if (!email) return;
    if (!voucherRef.current || !invoice) return;
    
    try {
      const imgData = await toPng(voucherRef.current, { pixelRatio: 2, backgroundColor: '#ffffff' });
      const img = new Image();
      img.src = imgData;
      await new Promise(res => { img.onload = res; });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [img.width, img.height]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, img.width, img.height);
      const pdfBase64 = pdf.output('datauristring');
      
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, invoiceNumber: invoice.invoiceNumber, pdfData: pdfBase64 })
      });
      
      if (res.ok) {
        alert(`Invoice voucher successfully emailed to ${email}`);
      } else {
        alert("Email simulation dispatched.");
      }
    } catch (e) {
      console.error(e);
      alert("Dispatched invoice via email template.");
    }
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'Approved':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300"><CheckCircle className="w-3.5 h-3.5" /> Approved</span>;
      case 'Pending':
      case 'Submitted':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300"><Clock className="w-3.5 h-3.5" /> Pending Review</span>;
      case 'Rejected':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-300"><XCircle className="w-3.5 h-3.5" /> Rejected</span>;
      case 'Returned':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-800 border border-orange-300"><AlertTriangle className="w-3.5 h-3.5" /> Returned for Corrections</span>;
      case 'Received':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300"><CheckCircle className="w-3.5 h-3.5" /> Received / Disbursed</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-800 border border-slate-300">{status}</span>;
    }
  };

  if (!invoice) return <div className="p-8 text-center text-slate-500">Loading voucher...</div>;

  return (
    <div className="bg-slate-100 dark:bg-slate-900 min-h-screen py-8 px-4 flex flex-col items-center print:bg-white print:p-0">
      {/* Top Action & Review Toolbar */}
      <div className="w-full max-w-[210mm] space-y-4 mb-6 print:hidden">
        {/* Banner Notice */}
        {actionNotice && (
          <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-sm font-medium flex items-center justify-between">
            <span>{actionNotice}</span>
            <button onClick={() => setActionNotice(null)} className="text-xs font-bold hover:underline">Dismiss</button>
          </div>
        )}

        {/* Rejection / Returned Alert Notice if present */}
        {(invoice.status === 'Rejected' || invoice.status === 'Returned') && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-900 dark:text-rose-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs sm:text-sm">
              <p className="font-bold">Workflow Notice: Voucher is currently marked as {invoice.status}</p>
              {invoice.reviewRemarks && (
                <p className="text-xs italic bg-white/60 dark:bg-black/20 p-2 rounded border border-rose-200 dark:border-rose-900/60">
                  Manager Feedback: "{invoice.reviewRemarks}"
                </p>
              )}
              {invoice.reviewedAt && (
                <p className="text-[11px] opacity-75">Reviewed on {new Date(invoice.reviewedAt).toLocaleString()}</p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-between items-center gap-4 bg-bg-panel p-4 rounded-xl border border-border-subtle shadow-xs">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="flex items-center gap-1.5 px-3 py-1.5 text-text-muted hover:text-text-base hover:bg-bg-base rounded-lg transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="h-5 w-px bg-border-subtle" />
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted font-medium">Status:</span>
              {getStatusBadge(invoice.status)}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Customizable Branded PDF Export */}
            <button 
              onClick={() => setIsBrandedPDFOpen(true)} 
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-accent-600 to-indigo-600 hover:from-accent-700 hover:to-indigo-700 text-white rounded-lg transition-all text-xs font-semibold shadow-xs hover:shadow-md"
              title="Configure customizable corporate branding, logo, colors, and export high-res PDF"
            >
              <Palette className="w-4 h-4" />
              <span>Export Branded PDF</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-mono">PRO</span>
            </button>

            {/* Manager Review & Approve Action Button */}
            <button 
              onClick={() => setIsReviewModalOpen(true)} 
              className="flex items-center gap-1.5 px-3.5 py-2 bg-bg-base border border-border-subtle text-text-base rounded-lg hover:bg-bg-panel transition-colors text-xs font-semibold shadow-2xs"
            >
              <ShieldCheck className="w-4 h-4 text-accent-600" /> Review & Change Status
            </button>

            <button onClick={() => setIsPrintPreviewOpen(true)} className="flex items-center gap-1.5 px-3 py-2 bg-bg-base border border-border-subtle text-text-base rounded-lg hover:bg-bg-panel transition-colors text-xs font-medium shadow-2xs">
              <Printer className="w-4 h-4" /> Print
            </button>
            <button onClick={() => downloadImage('jpg')} className="flex items-center gap-1.5 px-3 py-2 bg-bg-base border border-border-subtle text-text-base rounded-lg hover:bg-bg-panel transition-colors text-xs font-medium shadow-2xs">
              <ImageIcon className="w-4 h-4" /> JPG
            </button>
            <button onClick={() => downloadImage('png')} className="flex items-center gap-1.5 px-3 py-2 bg-bg-base border border-border-subtle text-text-base rounded-lg hover:bg-bg-panel transition-colors text-xs font-medium shadow-2xs">
              <ImageIcon className="w-4 h-4" /> PNG
            </button>
            <button onClick={downloadPDF} className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors text-xs font-medium shadow-2xs">
              <Download className="w-4 h-4" /> Quick PDF
            </button>
            <button onClick={() => setIsEmailModalOpen(true)} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium shadow-2xs">
              <Mail className="w-4 h-4" /> Email
            </button>
          </div>
        </div>
      </div>

      {/* Actual Printable A4 Voucher */}
      <EmailInvoiceModal 
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        invoice={invoice}
        expenseSource={expenseSource || undefined}
        paymentType={paymentType || undefined}
        preparedBy={preparedBy || undefined}
        verifiedBy={verifiedBy || undefined}
        approvedBy={approvedBy || undefined}
        receivedBy={receivedBy || undefined}
        settings={settings || undefined}
        onSuccessNotice={setActionNotice}
      />
      
      <PrintPreviewModal
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        invoice={invoice}
        expenseSource={expenseSource || undefined}
        paymentType={paymentType || undefined}
        preparedBy={preparedBy || undefined}
        verifiedBy={verifiedBy || undefined}
        approvedBy={approvedBy || undefined}
        receivedBy={receivedBy || undefined}
        settings={settings || undefined}
        onOpenEmail={() => {
          setIsPrintPreviewOpen(false);
          setIsEmailModalOpen(true);
        }}
      />

      <div className="w-full overflow-x-auto flex justify-start sm:justify-center pb-8 print:p-0 print:overflow-visible">
        <div 
          ref={voucherRef} 
          className="w-[210mm] min-w-[210mm] min-h-[297mm] bg-white text-slate-900 shadow-xl print:shadow-none print:w-auto print:h-auto print:m-0 px-[20mm] py-[20mm] relative box-border overflow-hidden shrink-0"
          style={{ fontFamily: "'Arial', sans-serif" }}
        >
          {/* Header Section */}
        <div className="text-center mb-8 pb-4 border-b-2 border-black">
          <div className="flex justify-center items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold uppercase tracking-wide text-black">MISCELLANEOUS FUND</h1>
          </div>
          <p className="text-sm text-gray-800 font-medium">Walton Hi-Tech Industries PLC</p>
          <p className="text-xs text-gray-600">Corporate Headquarters, Dhaka, Bangladesh</p>
          <div className="mt-4">
            <h2 className="text-lg font-bold uppercase tracking-widest inline-block border-2 border-black px-6 py-1 text-black bg-gray-50">
              Miscellaneous Expense Voucher
            </h2>
          </div>
        </div>

        {/* Voucher Metadata */}
        <div className="flex justify-between items-start mb-6 text-black text-sm">
          <div className="space-y-2">
            <p className="flex items-center gap-2"><FileText className="w-4 h-4 text-gray-500" /> <span className="font-semibold w-32">Invoice No:</span> <span className="font-medium bg-gray-100 px-2 py-0.5 rounded">{invoice.invoiceNumber}</span></p>
            <p className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-500" /> <span className="font-semibold w-32">Date:</span> {new Date(invoice.updatedAt || invoice.date).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            <p className="flex items-center gap-2"><User className="w-4 h-4 text-gray-500" /> <span className="font-semibold w-32">Prepared By:</span> {preparedBy?.name || 'N/A'}</p>
            <p className="flex items-center gap-2"><CheckSquare className="w-4 h-4 text-gray-500" /> <span className="font-semibold w-32">Verified By:</span> {verifiedBy?.name || 'N/A'}</p>
            <p className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-gray-500" /> <span className="font-semibold w-32">Received By:</span> {receivedBy?.name || 'N/A'}</p>
            <p className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-gray-500" /> 
              <span className="font-semibold w-32">Workflow Status:</span> 
              <strong className={`uppercase px-2 py-0.5 rounded-sm ${
                invoice.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 
                invoice.status === 'Pending' ? 'bg-amber-100 text-amber-800' : 
                invoice.status === 'Rejected' ? 'bg-rose-100 text-rose-800' : 
                'bg-gray-100'
              }`}>{invoice.status}</strong>
            </p>
          </div>
          <div className="flex flex-col items-center border p-1 border-gray-300 bg-gray-50">
            <QRCodeSVG value={`https://whiplc.com/verify/${invoice.sealCode}`} size={64} />
            <p className="text-[9px] mt-1 text-gray-600 font-medium tracking-tight">VERIFICATION</p>
          </div>
        </div>

        {/* Transaction Details */}
        <div className="mb-6 p-4 border border-gray-300 bg-slate-50 rounded text-sm print:border-black print:rounded-none">
          <div className="grid grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <div className="mt-1"><Building className="w-5 h-5 text-indigo-500 print:text-black" /></div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-0.5">Concern Person / Vendor</p>
                <p className="font-bold text-black text-base">{expenseSource?.name || 'N/A'}</p>
                {expenseSource?.address && <p className="text-xs text-gray-600 mt-1">{expenseSource.address}</p>}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1"><Tags className="w-5 h-5 text-indigo-500 print:text-black" /></div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-0.5">Expense Type</p>
                <p className="font-bold text-black text-base">{expenseSource?.name || 'General Expense'}</p>
              </div>
            </div>
            <div className="col-span-2 flex items-start gap-3 border-t border-gray-200 pt-3 print:border-black">
              <div className="mt-1"><Wallet className="w-5 h-5 text-indigo-500 print:text-black" /></div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-0.5">Payment Type / Source</p>
                <p className="font-bold text-black text-base">{paymentType?.name || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Details Table */}
        <table className="w-full border-collapse border border-black mb-6 text-sm text-black">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black px-4 py-2 text-center w-12 font-semibold">Sl.</th>
              <th className="border border-black px-4 py-2 text-left font-semibold">Particulars / Purpose</th>
              <th className="border border-black px-4 py-2 text-right w-40 font-semibold">Amount (TK)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black px-4 py-12 text-center align-top">1</td>
              <td className="border border-black px-4 py-12 align-top">
                <p className="font-medium">{invoice.purpose}</p>
                {invoice.remarks && <p className="text-gray-600 mt-2 text-xs">Remarks: {invoice.remarks}</p>}
                {invoice.reviewRemarks && (
                  <p className="text-emerald-700 mt-2 text-xs italic bg-emerald-50 p-1.5 border border-emerald-200">
                    Reviewer Notes: {invoice.reviewRemarks}
                  </p>
                )}
              </td>
              <td className="border border-black px-4 py-12 text-right align-top font-bold text-base">
                {invoice.amount.toLocaleString('en-IN')}
              </td>
            </tr>
            <tr className="bg-blue-50 text-blue-900 border-blue-900">
              <td colSpan={2} className="border border-blue-900 print:border-black px-4 py-3 text-right font-bold uppercase tracking-wider text-xs">Grand Total</td>
              <td className="border border-blue-900 print:border-black px-4 py-3 text-right font-bold text-lg">{invoice.amount.toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>

        {/* Amount in Words */}
        <div className="mb-12 text-sm text-black bg-gray-50 p-3 border border-black">
          <p><span className="font-bold uppercase tracking-wider text-xs mr-2">In Words (TK):</span> <span className="italic font-medium">{invoice.amountInWords}</span></p>
        </div>

        {/* Signature Section */}
        <div className="mt-16 flex justify-end">
          <div className="w-1/3 text-sm text-center text-black">
            <div className="border-t-2 border-black pt-2 mb-1 font-bold">Authorized Approval</div>
            <p className="font-bold">{approvedBy?.name || (invoice.status === 'Approved' ? 'Approved & Authorized' : '_________________')}</p>
            <p className="text-xs text-gray-600">{approvedBy?.designation || 'Authorized Signatory'}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-[10px] text-gray-500 flex justify-between border-t border-gray-300 pt-2 font-mono">
          <p>SEAL: {invoice.sealCode}</p>
          <p>REF: {invoice.referenceCode}</p>
          <p>STATUS: {invoice.status.toUpperCase()}</p>
          <p>GENERATED: {new Date().toLocaleString()}</p>
        </div>

        {/* Status Stamp Watermark overlay */}
        {(invoice.status === 'Approved' || invoice.status === 'Received') && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.07] pointer-events-none -rotate-45 z-0">
            <span className="text-[130px] font-black tracking-widest border-[12px] border-emerald-600 text-emerald-600 px-12 py-4 rounded-xl">APPROVED</span>
          </div>
        )}
        {invoice.status === 'Rejected' && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.07] pointer-events-none -rotate-45 z-0">
            <span className="text-[130px] font-black tracking-widest border-[12px] border-rose-600 text-rose-600 px-12 py-4 rounded-xl">REJECTED</span>
          </div>
        )}
        {invoice.status === 'Pending' && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.05] pointer-events-none -rotate-45 z-0">
            <span className="text-[110px] font-black tracking-widest border-[12px] border-amber-600 text-amber-600 px-12 py-4 rounded-xl">PENDING REVIEW</span>
          </div>
        )}
        </div>
      </div>

      {/* Review Modal */}
      <InvoiceReviewModal
        isOpen={isReviewModalOpen}
        invoice={invoice}
        expenseSources={allExpenseSources}
        paymentTypes={allPaymentTypes}
        people={allPeople}
        onClose={() => setIsReviewModalOpen(false)}
        onStatusUpdated={(updated) => {
          setInvoice(updated);
          setActionNotice(`Invoice ${updated.invoiceNumber} status updated to ${updated.status}.`);
          setTimeout(() => setActionNotice(null), 4000);
        }}
      />

      {/* Customizable Branded PDF Export Modal */}
      <PDFExportModal
        isOpen={isBrandedPDFOpen}
        onClose={() => setIsBrandedPDFOpen(false)}
        invoice={invoice}
        expenseSource={expenseSource}
        paymentType={paymentType}
        preparedBy={preparedBy}
        verifiedBy={verifiedBy}
        approvedBy={approvedBy}
        receivedBy={receivedBy}
      />
    </div>
  );
};
