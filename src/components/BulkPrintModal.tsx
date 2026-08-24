import React, { useRef } from 'react';
import { Invoice, ExpenseSource, PaymentType, Person } from '../types';
import { formatCurrency, numberToWords } from '../lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, Download, Eye } from 'lucide-react';

interface BulkPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  expenseSources: ExpenseSource[];
  paymentTypes: PaymentType[];
  people: Person[];
}

export const BulkPrintModal: React.FC<BulkPrintModalProps> = ({
  isOpen,
  onClose,
  invoices,
  expenseSources,
  paymentTypes,
  people,
}) => {
  const printContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen || invoices.length === 0) return null;

  const handlePrint = () => {
    if (!printContainerRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print vouchers.');
      return;
    }
    
    // Get the Tailwind styles and fonts if possible, or just inject basic print styles
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Vouchers</title>
          <style>
            @page { size: A4 portrait; margin: 0; }
            body { font-family: 'Arial', sans-serif; color: #000; margin: 0; padding: 0; background: #fff; }
            * { box-sizing: border-box; }
            .print-container { padding: 20px; }
            /* Injecting Tailwind-like utility classes that are used */
            .flex { display: flex; } .justify-between { justify-content: space-between; } .items-center { align-items: center; }
            .text-center { text-align: center; } .text-right { text-align: right; } .text-left { text-align: left; }
            .font-bold { font-weight: bold; } .font-semibold { font-weight: 600; } .font-medium { font-weight: 500; }
            .text-sm { font-size: 14px; } .text-xs { font-size: 12px; } .text-lg { font-size: 18px; } .text-xl { font-size: 20px; } .text-2xl { font-size: 24px; }
            .mb-2 { margin-bottom: 8px; } .mb-4 { margin-bottom: 16px; } .mb-6 { margin-bottom: 24px; } .mb-8 { margin-bottom: 32px; }
            .mt-2 { margin-top: 8px; } .mt-4 { margin-top: 16px; } .mt-8 { margin-top: 32px; } .mt-16 { margin-top: 64px; }
            .p-4 { padding: 16px; } .px-4 { padding-left: 16px; padding-right: 16px; } .py-2 { padding-top: 8px; padding-bottom: 8px; }
            .border { border: 1px solid #000; } .border-b-2 { border-bottom: 2px solid #000; } .border-t-2 { border-top: 2px solid #000; }
            .border-collapse { border-collapse: collapse; }
            .w-full { width: 100%; } .w-10 { width: 40px; } .h-10 { height: 40px; } .w-1\/3 { width: 33.333%; }
            .grid { display: grid; } .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); } .gap-4 { gap: 16px; } .gap-8 { gap: 32px; }
            .bg-gray-50 { background-color: #f9fafb; } .bg-gray-100 { background-color: #f3f4f6; } .bg-black { background-color: #000; color: #fff; }
            .uppercase { text-transform: uppercase; } .tracking-wide { letter-spacing: 0.025em; } .tracking-wider { letter-spacing: 0.05em; } .tracking-widest { letter-spacing: 0.1em; }
            table th, table td { border: 1px solid #000; padding: 8px; }
            .inline-block { display: inline-block; }
            .page-break { page-break-after: always; }
          </style>
        </head>
        <body>
          ${printContainerRef.current.innerHTML}
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 print:p-0 print:bg-white print:static">
      
      {/* Container Dialog (Hidden during print except inner content) */}
      <div className="bg-bg-panel border border-border-subtle rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden print:border-none print:shadow-none print:max-h-none print:w-full print:rounded-none">
        
        {/* Top Control Bar (Excluded from physical print via print:hidden) */}
        <div className="px-6 py-4 bg-bg-base border-b border-border-subtle flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-600/10 text-accent-600 rounded-xl">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-base">
                Batch Print Vouchers ({invoices.length} Selected)
              </h2>
              <p className="text-xs text-text-muted">
                Standard corporate miscellaneous expenditure voucher format with page-breaks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Print All ({invoices.length})</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-base hover:bg-bg-panel rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Area / Actual Printable Content */}
        <div 
          ref={printContainerRef}
          className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-100 dark:bg-slate-900/50 print:p-0 print:bg-white print:space-y-0"
        >
          {invoices.map((inv, index) => {
            const expSource = expenseSources.find(e => e.id === inv.expenseSourceId);
            const pType = paymentTypes.find(p => p.id === inv.paymentTypeId);
            const prepBy = people.find(p => p.id === inv.preparedById);
            const verBy = people.find(p => p.id === inv.verifiedById);
            const appBy = people.find(p => p.id === inv.approvedById);
            const recBy = people.find(p => p.id === inv.receivedById);

            return (
              <div 
                key={inv.id}
                className="bg-white text-slate-900 p-8 sm:p-10 rounded-xl shadow-md border border-slate-200 mx-auto max-w-3xl relative print:shadow-none print:border-none print:p-6 print:rounded-none print:page-break"
                style={{ pageBreakAfter: index < invoices.length - 1 ? 'always' : 'auto' }}
              >
                {/* Header with Seal */}
                <div className="border-b-2 border-slate-900 pb-4 mb-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 text-slate-900">
                        <Eye className="w-6 h-6" />
                        <h1 className="text-2xl font-black tracking-wider uppercase font-serif">THIRD EYE</h1>
                      </div>
                      <p className="text-xs font-semibold text-slate-600 mt-0.5 tracking-wide">
                        FINANCIAL OPERATIONS & EXPENDITURE MANAGEMENT
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="inline-block border border-slate-900 px-3 py-1 text-center bg-slate-50">
                        <span className="text-[10px] font-mono uppercase block text-slate-500 font-bold">VOUCHER TYPE</span>
                        <span className="text-xs font-bold text-slate-900 uppercase">MISCELLANEOUS EXPENSE</span>
                      </div>
                      <div className="mt-1 text-[11px] font-mono text-slate-500 font-semibold">
                        Seal: {inv.sealCode || 'SEAL-VALID-2026'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-center">
                    <span className="inline-block border-y border-slate-900 px-6 py-1 text-sm font-bold tracking-wider uppercase">
                      Voucher for Miscellaneous Expenditure
                    </span>
                  </div>
                </div>

                {/* Metadata Row */}
                <div className="grid grid-cols-2 gap-4 text-xs mb-6">
                  <div className="space-y-1.5">
                    <div className="flex">
                      <span className="w-28 font-bold text-slate-700">Invoice No:</span>
                      <span className="font-mono font-bold text-slate-900">{inv.invoiceNumber}</span>
                    </div>
                    <div className="flex">
                      <span className="w-28 font-bold text-slate-700">Payment Type:</span>
                      <span className="font-medium text-slate-900">{pType?.name || 'N/A'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-28 font-bold text-slate-700">Status:</span>
                      <span className={`font-bold uppercase ${
                        inv.status === 'Approved' ? 'text-emerald-700' : 'text-slate-800'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-right">
                    <div className="flex justify-end">
                      <span className="font-bold text-slate-700 mr-2">Date:</span>
                      <span className="font-medium text-slate-900">{new Date(inv.updatedAt || inv.date).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex justify-end">
                      <span className="font-bold text-slate-700 mr-2">Ref Code:</span>
                      <span className="font-mono text-slate-900">{inv.referenceCode || 'REF-STD-99'}</span>
                    </div>
                  </div>
                </div>

                {/* Expense Details Table */}
                <div className="border border-slate-900 mb-6">
                  <div className="bg-slate-100 border-b border-slate-900 p-2 text-xs font-bold text-slate-800">
                    EXPENSE SOURCE & RECIPIENT
                  </div>
                  <div className="p-3 text-xs space-y-1">
                    <div className="font-bold text-slate-900 text-sm">{expSource?.name || 'Standard Expense Entity'}</div>
                    {expSource?.address && (
                      <div className="text-slate-600">{expSource.address}</div>
                    )}
                  </div>

                  <div className="bg-slate-100 border-y border-slate-900 p-2 text-xs font-bold text-slate-800">
                    PARTICULARS / STATEMENT OF EXPENSE
                  </div>
                  <div className="p-4 text-xs text-slate-800 leading-relaxed min-h-16">
                    {inv.purpose}
                  </div>

                  {/* Amount Row */}
                  <div className="border-t border-slate-900 bg-slate-50 flex items-center justify-between p-3">
                    <div className="text-xs font-bold uppercase text-slate-700">
                      Total Amount Payable:
                    </div>
                    <div className="text-base font-black font-mono text-slate-900">
                      {formatCurrency(inv.amount)}
                    </div>
                  </div>
                </div>

                {/* In Words */}
                <div className="p-3 bg-slate-50 border border-slate-300 rounded text-xs mb-8">
                  <span className="font-bold text-slate-700">In Words: </span>
                  <span className="italic font-medium text-slate-900">{inv.amountInWords || numberToWords(inv.amount)}</span>
                </div>

                {/* Signatures & QR Block */}
                <div className="grid grid-cols-4 gap-4 text-center text-xs mt-12 pt-6 border-t border-slate-300">
                  <div>
                    <div className="h-10 border-b border-slate-400 border-dashed mb-1.5 flex items-end justify-center pb-1">
                      <span className="text-[11px] font-bold text-slate-800">{recBy?.name || '—'}</span>
                    </div>
                    <span className="font-bold text-[10px] uppercase text-slate-600 block">Received By</span>
                    <span className="text-[9px] text-slate-400">{recBy?.designation || ''}</span>
                  </div>

                  <div>
                    <div className="h-10 border-b border-slate-400 border-dashed mb-1.5 flex items-end justify-center pb-1">
                      <span className="text-[11px] font-bold text-slate-800">{prepBy?.name || 'Authorized Staff'}</span>
                    </div>
                    <span className="font-bold text-[10px] uppercase text-slate-600 block">Prepared By</span>
                    <span className="text-[9px] text-slate-400">{prepBy?.designation || ''}</span>
                  </div>

                  <div>
                    <div className="h-10 border-b border-slate-400 border-dashed mb-1.5 flex items-end justify-center pb-1">
                      <span className="text-[11px] font-bold text-slate-800">{verBy?.name || 'Finance Officer'}</span>
                    </div>
                    <span className="font-bold text-[10px] uppercase text-slate-600 block">Verified By</span>
                    <span className="text-[9px] text-slate-400">{verBy?.designation || ''}</span>
                  </div>

                  <div>
                    <div className="h-10 border-b border-slate-900 mb-1.5 flex items-end justify-center pb-1">
                      <span className="text-[11px] font-bold text-slate-900">{appBy?.name || 'Managing Director'}</span>
                    </div>
                    <span className="font-bold text-[10px] uppercase text-slate-900 block">Approved By</span>
                    <span className="text-[9px] text-slate-500">{appBy?.designation || 'Head of Finance'}</span>
                  </div>
                </div>

                {/* Voucher Footer with QR & System Verification */}
                <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <QRCodeSVG 
                      value={`THIRD-EYE:${inv.invoiceNumber}:${inv.amount}:${inv.sealCode || 'SEAL'}`} 
                      size={36} 
                    />
                    <div>
                      <span className="font-bold text-slate-600 block">Digitally Sealed & Verifiable</span>
                      <span>Scan QR code with any reader to inspect authenticity</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span>Generated on {new Date().toLocaleDateString()}</span>
                    <span className="block font-mono">Page {index + 1} of {invoices.length}</span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:page-break {
            page-break-after: always !important;
            break-after: page !important;
          }
          div[class*="print:static"],
          div[class*="print:static"] * {
            visibility: visible;
          }
          div[class*="print:static"] {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
};
