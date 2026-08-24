import React, { useState, useRef } from 'react';
import { 
  X, Printer, Download, Image as ImageIcon, Mail, ZoomIn, ZoomOut, Maximize2, 
  Settings2, Eye, CheckCircle, Clock, XCircle, AlertTriangle, FileText,
  Sliders, ShieldCheck, Sparkles, Copy, Check
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Invoice, InvoiceStatus, ExpenseSource, PaymentType, AccountTitle, Person, AppSettings } from '../types';
import { formatCurrency, numberToWords } from '../lib/utils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  expenseSource?: ExpenseSource;
  paymentType?: PaymentType;
  accountTitle?: AccountTitle;
  preparedBy?: Person;
  verifiedBy?: Person;
  approvedBy?: Person;
  receivedBy?: Person;
  settings?: AppSettings;
  onOpenEmail?: () => void;
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  invoice,
  expenseSource,
  paymentType,
  accountTitle,
  preparedBy,
  verifiedBy,
  approvedBy,
  receivedBy,
  settings,
  onOpenEmail,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [paperFormat, setPaperFormat] = useState<'a4' | 'letter'>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [colorMode, setColorMode] = useState<'color' | 'grayscale'>('color');
  
  const [showSignatures, setShowSignatures] = useState<boolean>(true);
  const [showQrCode, setShowQrCode] = useState<boolean>(true);
  const [showWatermark, setShowWatermark] = useState<boolean>(true);
  const [showTimestampStamp, setShowTimestampStamp] = useState<boolean>(true);
  
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const printSheetRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !invoice) return null;

  const branding = settings?.branding || {
    companyName: 'WALTON HI-TECH INDUSTRIES PLC',
    companySubtitle: 'MISCELLANEOUS FUND',
    companyAddress: 'Chandra, Gazipur / Corporate HQ: Plot-1088, Block-I, Sabrina Sobhan Road, Dhaka-1229',
    companyPhone: '+880 9606-555555',
    companyEmail: 'accounts@waltonbd.com',
    companyTaxId: 'BIN: 000129482-0101',
    themeColor: '#1e3a8a',
    showWatermark: true,
    showQrCode: true,
    showSignatures: true,
  };

  const themeColor = branding.themeColor || '#1e3a8a';

  // Handle Dedicated Print Execution
  const handlePrint = () => {
    setIsPrinting(true);
    
    // Create an isolated printable iframe or print styles
    const printContent = printSheetRef.current;
    if (!printContent) {
      window.print();
      setIsPrinting(false);
      return;
    }

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Voucher_${invoice.invoiceNumber}</title>
            <style>
              @page {
                size: ${paperFormat === 'a4' ? 'A4' : 'letter'} ${orientation};
                margin: 10mm;
              }
              body {
                margin: 0;
                padding: 0;
                background: white;
                color: #000;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .print-container {
                width: 100%;
                max-width: 100%;
                margin: 0 auto;
              }
              ${colorMode === 'grayscale' ? `
                * {
                  filter: grayscale(100%) !important;
                }
              ` : ''}
            </style>
          </head>
          <body>
            <div class="print-container">
              ${printContent.innerHTML}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
        setIsPrinting(false);
      }, 300);
    } else {
      window.print();
      setIsPrinting(false);
    }
  };

  // Quick PDF Export
  const handleDownloadPdf = async () => {
    if (!printSheetRef.current) return;
    setIsExportingPdf(true);
    try {
      const canvas = await html2canvas(printSheetRef.current, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: paperFormat
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgRatio = canvas.width / canvas.height;
      
      let finalWidth = pageWidth - 16;
      let finalHeight = finalWidth / imgRatio;
      
      if (finalHeight > pageHeight - 16) {
        finalHeight = pageHeight - 16;
        finalWidth = finalHeight * imgRatio;
      }
      
      const posX = (pageWidth - finalWidth) / 2;
      const posY = (pageHeight - finalHeight) / 2;

      pdf.addImage(imgData, 'PNG', posX, posY, finalWidth, finalHeight);
      pdf.save(`Voucher_${invoice.invoiceNumber}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF. Please try the standard Print dialog.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Quick PNG Export
  const handleDownloadPng = async () => {
    if (!printSheetRef.current) return;
    try {
      const canvas = await html2canvas(printSheetRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const link = document.createElement('a');
      link.download = `Voucher_${invoice.invoiceNumber}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusText = (status: InvoiceStatus) => {
    switch (status) {
      case 'Approved': return 'APPROVED & AUDITED';
      case 'Pending': case 'Submitted': return 'PENDING APPROVAL';
      case 'Rejected': return 'REJECTED / DECLINED';
      case 'Returned': return 'RETURNED FOR REVISION';
      case 'Received': return 'DISBURSED & RECEIVED';
      default: return status.toUpperCase();
    }
  };

  const getStatusColorClasses = (status: InvoiceStatus) => {
    switch (status) {
      case 'Approved': return 'text-emerald-700 border-emerald-500 bg-emerald-50/70';
      case 'Pending': case 'Submitted': return 'text-amber-700 border-amber-500 bg-amber-50/70';
      case 'Rejected': return 'text-rose-700 border-rose-500 bg-rose-50/70';
      case 'Returned': return 'text-orange-700 border-orange-500 bg-orange-50/70';
      case 'Received': return 'text-indigo-700 border-indigo-500 bg-indigo-50/70';
      default: return 'text-slate-700 border-slate-500 bg-slate-50/70';
    }
  };

  const recordedTimestamp = invoice.status === 'Approved' ? (invoice.statusTimestamps?.approvedAt || invoice.reviewedAt || invoice.updatedAt) :
                           invoice.status === 'Pending' ? (invoice.statusTimestamps?.pendingAt || invoice.createdAt) :
                           invoice.status === 'Rejected' ? (invoice.statusTimestamps?.rejectedAt || invoice.reviewedAt || invoice.updatedAt) :
                           invoice.updatedAt || invoice.createdAt;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
      onKeyDown={e => {
        if (e.key === 'Escape') onClose();
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
          e.preventDefault();
          handlePrint();
        }
      }}
      tabIndex={0}
    >
      <div 
        className="bg-bg-panel rounded-2xl shadow-2xl w-full max-w-6xl h-[94vh] border border-border-subtle overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-subtle bg-bg-base/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 rounded-xl border border-indigo-200 dark:border-indigo-800">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-text-base">Print Preview & Sheet Layout</h2>
                <span className="text-[11px] font-mono bg-bg-panel px-2 py-0.5 rounded border border-border-subtle text-text-muted">
                  {invoice.invoiceNumber}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusColorClasses(invoice.status)}`}>
                  {invoice.status}
                </span>
              </div>
              <p className="text-xs text-text-muted">High-fidelity printable format • Press ⌘P or Ctrl+P to print</p>
            </div>
          </div>

          {/* Quick Print CTA buttons */}
          <div className="flex items-center gap-2">
            {onOpenEmail && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEmail();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors"
                title="Send as PDF Email"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email PDF</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-base border border-border-subtle hover:bg-bg-panel rounded-lg text-xs font-semibold text-text-base transition-colors"
              title="Save as PDF file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Exporting...' : 'PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPng}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-bg-base border border-border-subtle hover:bg-bg-panel rounded-lg text-xs font-semibold text-text-base transition-colors"
              title="Save as PNG image"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>PNG</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-accent-600 hover:bg-accent-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print Document</span>
            </button>

            <div className="h-5 w-px bg-border-subtle mx-1" />

            <button 
              onClick={onClose}
              className="p-1.5 text-text-muted hover:text-text-base hover:bg-bg-base rounded-lg transition-colors"
              title="Close Preview (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Workspace Body: Left Controls Sidebar + Right Sheet Canvas */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-900/10 dark:bg-black/30">
          
          {/* Print Configuration Sidebar */}
          <div className="w-full md:w-72 bg-bg-panel border-r border-border-subtle p-4 overflow-y-auto space-y-4 shrink-0">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5 mb-2.5">
                <Sliders className="w-3.5 h-3.5 text-accent-600" />
                <span>Page Layout & Setup</span>
              </h3>

              <div className="space-y-3 text-xs">
                {/* Paper Size */}
                <div>
                  <label className="block text-text-muted font-medium mb-1">Paper Size</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaperFormat('a4')}
                      className={`py-1.5 px-2 rounded-lg border text-center font-medium transition-all ${
                        paperFormat === 'a4' 
                          ? 'bg-accent-50 text-accent-700 border-accent-400 font-bold shadow-2xs' 
                          : 'bg-bg-base text-text-muted border-border-subtle hover:bg-bg-panel'
                      }`}
                    >
                      A4 Standard
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaperFormat('letter')}
                      className={`py-1.5 px-2 rounded-lg border text-center font-medium transition-all ${
                        paperFormat === 'letter' 
                          ? 'bg-accent-50 text-accent-700 border-accent-400 font-bold shadow-2xs' 
                          : 'bg-bg-base text-text-muted border-border-subtle hover:bg-bg-panel'
                      }`}
                    >
                      US Letter
                    </button>
                  </div>
                </div>

                {/* Orientation */}
                <div>
                  <label className="block text-text-muted font-medium mb-1">Orientation</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setOrientation('portrait')}
                      className={`py-1.5 px-2 rounded-lg border text-center font-medium transition-all ${
                        orientation === 'portrait' 
                          ? 'bg-accent-50 text-accent-700 border-accent-400 font-bold shadow-2xs' 
                          : 'bg-bg-base text-text-muted border-border-subtle hover:bg-bg-panel'
                      }`}
                    >
                      Portrait
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrientation('landscape')}
                      className={`py-1.5 px-2 rounded-lg border text-center font-medium transition-all ${
                        orientation === 'landscape' 
                          ? 'bg-accent-50 text-accent-700 border-accent-400 font-bold shadow-2xs' 
                          : 'bg-bg-base text-text-muted border-border-subtle hover:bg-bg-panel'
                      }`}
                    >
                      Landscape
                    </button>
                  </div>
                </div>

                {/* Color Mode */}
                <div>
                  <label className="block text-text-muted font-medium mb-1">Print Color Mode</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setColorMode('color')}
                      className={`py-1.5 px-2 rounded-lg border text-center font-medium transition-all ${
                        colorMode === 'color' 
                          ? 'bg-accent-50 text-accent-700 border-accent-400 font-bold shadow-2xs' 
                          : 'bg-bg-base text-text-muted border-border-subtle hover:bg-bg-panel'
                      }`}
                    >
                      Full Color
                    </button>
                    <button
                      type="button"
                      onClick={() => setColorMode('grayscale')}
                      className={`py-1.5 px-2 rounded-lg border text-center font-medium transition-all ${
                        colorMode === 'grayscale' 
                          ? 'bg-accent-50 text-accent-700 border-accent-400 font-bold shadow-2xs' 
                          : 'bg-bg-base text-text-muted border-border-subtle hover:bg-bg-panel'
                      }`}
                    >
                      Eco Grayscale
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-border-subtle" />

            {/* Elements Visibility */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2.5">
                Print Elements
              </h3>

              <div className="space-y-2 text-xs">
                <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-lg hover:bg-bg-base">
                  <span className="text-text-base font-medium">Official Signatures</span>
                  <input
                    type="checkbox"
                    checked={showSignatures}
                    onChange={e => setShowSignatures(e.target.checked)}
                    className="rounded text-accent-600 focus:ring-accent-500 w-4 h-4"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-lg hover:bg-bg-base">
                  <span className="text-text-base font-medium">Security QR Seal</span>
                  <input
                    type="checkbox"
                    checked={showQrCode}
                    onChange={e => setShowQrCode(e.target.checked)}
                    className="rounded text-accent-600 focus:ring-accent-500 w-4 h-4"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-lg hover:bg-bg-base">
                  <span className="text-text-base font-medium">Approval Status Watermark</span>
                  <input
                    type="checkbox"
                    checked={showWatermark}
                    onChange={e => setShowWatermark(e.target.checked)}
                    className="rounded text-accent-600 focus:ring-accent-500 w-4 h-4"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1.5 rounded-lg hover:bg-bg-base">
                  <span className="text-text-base font-medium">Workflow Timestamp Stamp</span>
                  <input
                    type="checkbox"
                    checked={showTimestampStamp}
                    onChange={e => setShowTimestampStamp(e.target.checked)}
                    className="rounded text-accent-600 focus:ring-accent-500 w-4 h-4"
                  />
                </label>
              </div>
            </div>

            <hr className="border-border-subtle" />

            {/* Scale & Zoom Controls */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Preview Zoom</span>
                <span className="text-xs font-mono font-bold text-accent-600">{zoomLevel}%</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.max(50, prev - 15))}
                  className="p-1.5 bg-bg-base border border-border-subtle rounded-lg hover:bg-bg-panel text-text-muted"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <input
                  type="range"
                  min="50"
                  max="140"
                  step="5"
                  value={zoomLevel}
                  onChange={e => setZoomLevel(Number(e.target.value))}
                  className="flex-1 accent-accent-600 h-1.5 bg-bg-base rounded-lg cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.min(140, prev + 15))}
                  className="p-1.5 bg-bg-base border border-border-subtle rounded-lg hover:bg-bg-panel text-text-muted"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => setZoomLevel(75)}
                  className="px-2 py-0.5 text-[10px] bg-bg-base border border-border-subtle rounded text-text-muted hover:text-text-base"
                >
                  75%
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(100)}
                  className="px-2 py-0.5 text-[10px] bg-bg-base border border-border-subtle rounded text-text-muted hover:text-text-base font-bold"
                >
                  100%
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(125)}
                  className="px-2 py-0.5 text-[10px] bg-bg-base border border-border-subtle rounded text-text-muted hover:text-text-base"
                >
                  125%
                </button>
              </div>
            </div>

            {/* Audit & Print Tip Card */}
            <div className="p-3 bg-bg-base rounded-xl border border-border-subtle text-[11px] text-text-muted space-y-1">
              <p className="font-semibold text-text-base flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-accent-600" /> Print Quality Assurance
              </p>
              <p>Standardized financial voucher geometry automatically matches standard office printers.</p>
            </div>
          </div>

          {/* Canvas Scrollable Preview Area */}
          <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-start justify-center">
            <div 
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-out'
              }}
              className="my-2"
            >
              {/* Actual Printable Document Container */}
              <div 
                ref={printSheetRef}
                style={{
                  width: orientation === 'portrait' ? '210mm' : '297mm',
                  minHeight: orientation === 'portrait' ? '280mm' : '200mm',
                  filter: colorMode === 'grayscale' ? 'grayscale(100%)' : 'none'
                }}
                className="bg-white text-slate-900 p-8 sm:p-10 shadow-2xl rounded-sm border border-slate-300 relative text-xs flex flex-col justify-between"
              >
                {/* Watermark */}
                {showWatermark && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 overflow-hidden z-0 select-none">
                    <span 
                      style={{ fontSize: '72pt' }} 
                      className="font-black rotate-[-30deg] tracking-widest text-slate-900 uppercase"
                    >
                      {invoice.status === 'Approved' ? 'APPROVED' : 
                       invoice.status === 'Rejected' ? 'REJECTED' : 
                       invoice.status === 'Pending' ? 'PENDING REVIEW' : invoice.status}
                    </span>
                  </div>
                )}

                <div className="relative z-10 space-y-6">
                  {/* Document Header */}
                  <div className="border-b-2 pb-4 flex items-start justify-between gap-4" style={{ borderColor: themeColor }}>
                    <div className="flex items-start gap-4">
                      <div>
                        <h1 className="text-lg font-black tracking-tight" style={{ color: themeColor }}>
                          {branding.companyName}
                        </h1>
                        <p className="text-xs font-bold text-slate-700 tracking-wider">
                          {branding.companySubtitle || 'EXPENDITURE REQUISITION & DISBURSEMENT VOUCHER'}
                        </p>
                        <p className="text-[10px] text-slate-500 max-w-md mt-0.5">
                          {branding.companyAddress}
                        </p>
                        {branding.companyTaxId && (
                          <p className="text-[10px] font-mono text-slate-600 font-semibold mt-0.5">
                            {branding.companyTaxId}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Voucher Header Meta */}
                    <div className="text-right space-y-1 shrink-0">
                      <div 
                        style={{ backgroundColor: `${themeColor}15`, color: themeColor, borderColor: `${themeColor}40` }}
                        className="inline-block px-3 py-1 rounded border text-xs font-black tracking-wider uppercase font-mono"
                      >
                        PAYMENT VOUCHER
                      </div>
                      <div className="text-xs font-mono font-bold text-slate-800">
                        No: {invoice.invoiceNumber}
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Date: <strong>{new Date(invoice.updatedAt || invoice.date).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        Ref: {invoice.referenceCode}
                      </div>
                    </div>
                  </div>

                  {/* Workflow Stamp Banner (if enabled) */}
                  {showTimestampStamp && (
                    <div className={`p-3 rounded-lg border flex items-center justify-between text-xs ${getStatusColorClasses(invoice.status)}`}>
                      <div className="flex items-center gap-2">
                        {invoice.status === 'Approved' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> :
                         invoice.status === 'Rejected' ? <XCircle className="w-4 h-4 text-rose-600" /> :
                         <Clock className="w-4 h-4 text-amber-600" />}
                        <div>
                          <span className="font-bold tracking-wider">{getStatusText(invoice.status)}</span>
                          {invoice.reviewRemarks && (
                            <span className="ml-2 font-normal text-[11px] italic">"{invoice.reviewRemarks}"</span>
                          )}
                        </div>
                      </div>
                      <div className="text-[10px] font-mono opacity-80 text-right">
                        <span>Recorded: {new Date(recordedTimestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  {/* Voucher Key Metadata Grid */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                        Expense Source / Payee:
                      </span>
                      <p className="font-bold text-slate-900 text-sm">{expenseSource?.name || 'N/A'}</p>
                      <p className="text-[10px] text-slate-600">{expenseSource?.address || ''}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                        Payment Account / Mode:
                      </span>
                      <p className="font-bold text-slate-900 text-sm">{paymentType?.name || 'General Expense'}</p>
                      <p className="text-[10px] text-slate-600">{accountTitle?.name || 'Operating Fund'}</p>
                    </div>
                  </div>

                  {/* Requisition Table */}
                  <div className="border border-slate-300 rounded-lg overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr style={{ backgroundColor: themeColor }} className="text-white">
                          <th className="py-2 px-3 font-bold w-12 text-center border-r border-white/20">SL</th>
                          <th className="py-2 px-4 font-bold border-r border-white/20">Particulars / Expenditure Description</th>
                          <th className="py-2 px-4 font-bold w-36 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        <tr className="bg-white">
                          <td className="py-4 px-3 text-center font-mono text-slate-500 border-r border-slate-200">01</td>
                          <td className="py-4 px-4 border-r border-slate-200">
                            <p className="font-bold text-slate-900 text-sm leading-snug">{invoice.purpose}</p>
                            {invoice.remarks && (
                              <p className="text-[11px] text-slate-500 mt-1 italic">Notes: {invoice.remarks}</p>
                            )}
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-bold text-sm text-slate-900">
                            {formatCurrency(invoice.amount)}
                          </td>
                        </tr>
                        {/* Subtotal row */}
                        <tr className="bg-slate-50 font-bold">
                          <td colSpan={2} className="py-2.5 px-4 text-right border-r border-slate-200 uppercase tracking-wider text-[11px] text-slate-700">
                            Total Expenditure:
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-black text-sm" style={{ color: themeColor }}>
                            {formatCurrency(invoice.amount)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* In Words Callout */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2 text-xs">
                    <span className="font-bold text-slate-700 shrink-0">In Words:</span>
                    <span className="font-semibold text-slate-900 italic capitalize">{invoice.amountInWords} Only</span>
                  </div>

                  {/* QR Verification Seal & System Verification Hash */}
                  {showQrCode && (
                    <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        <div className="p-1 bg-white border border-slate-300 rounded">
                          <QRCodeSVG 
                            value={JSON.stringify({
                              inv: invoice.invoiceNumber,
                              amt: invoice.amount,
                              date: invoice.date,
                              seal: invoice.sealCode,
                              status: invoice.status,
                            })}
                            size={56}
                            level="M"
                          />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Digital Seal & Verification</p>
                          <p className="font-mono text-[10px] text-slate-800 font-bold">SEAL: {invoice.sealCode}</p>
                          <p className="text-[9px] text-slate-500">Scan QR code with Third Eye Scanner or smartphone camera to verify authenticity.</p>
                        </div>
                      </div>
                      <div className="text-right text-[9px] text-slate-500 font-mono">
                        <p>GENERATED BY THIRD EYE ERP</p>
                        <p>SYS TIME: {new Date().toISOString().replace('T', ' ').substring(0, 19)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Signatures Footer */}
                {showSignatures && (
                  <div className="pt-8 border-t border-slate-200 mt-8">
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div className="space-y-1">
                        <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                          <span className="text-[10px] font-semibold text-slate-700">{receivedBy?.name || 'Receiver'}</span>
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Received By</p>
                        <p className="text-[9px] text-slate-500">{receivedBy?.designation || 'Sign & Date'}</p>
                      </div>

                      <div className="space-y-1">
                        <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                          <span className="text-[10px] font-semibold text-slate-700">{preparedBy?.name || 'Preparer'}</span>
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Prepared By</p>
                        <p className="text-[9px] text-slate-500">{preparedBy?.designation || 'Accountant'}</p>
                      </div>

                      <div className="space-y-1">
                        <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                          <span className="text-[10px] font-semibold text-slate-700">{verifiedBy?.name || 'Auditor'}</span>
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Verified By</p>
                        <p className="text-[9px] text-slate-500">{verifiedBy?.designation || 'Internal Audit'}</p>
                      </div>

                      <div className="space-y-1">
                        <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-center pb-1">
                          <span className="text-[10px] font-bold text-accent-700">{approvedBy?.name || 'Approver'}</span>
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-800">Approved By</p>
                        <p className="text-[9px] text-slate-500">{approvedBy?.designation || 'Authorized Director'}</p>
                      </div>
                    </div>

                    {/* Disclaimer Terms */}
                    <div className="mt-6 pt-3 border-t border-slate-100 text-[9px] text-center text-slate-500">
                      {branding.footerTerms || 'This expenditure voucher is an authorized financial document generated by Third Eye ERP. Retain for tax audit & verification.'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
