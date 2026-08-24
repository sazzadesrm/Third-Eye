import React, { useState } from 'react';
import { 
  X, CheckCircle, AlertTriangle, XCircle, Clock, FileText, Send, 
  User, DollarSign, Building2, Tag, ShieldCheck, ShieldAlert, Sparkles,
  Paperclip, ExternalLink
} from 'lucide-react';
import { Invoice, InvoiceStatus, ExpenseSource, PaymentType, Person } from '../types';
import { db } from '../lib/db';
import { formatCurrency } from '../lib/utils';
import { useAuthStore } from '../lib/store';

interface InvoiceReviewModalProps {
  isOpen: boolean;
  invoice: Invoice | null;
  expenseSources?: ExpenseSource[];
  paymentTypes?: PaymentType[];
  people?: Person[];
  onClose: () => void;
  onStatusUpdated: (updatedInvoice: Invoice) => void;
}

export const InvoiceReviewModal: React.FC<InvoiceReviewModalProps> = ({
  isOpen,
  invoice,
  expenseSources = [],
  paymentTypes = [],
  people = [],
  onClose,
  onStatusUpdated,
}) => {
  const { user } = useAuthStore();
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus>(invoice?.status || 'Pending');
  const [reviewRemarks, setReviewRemarks] = useState(invoice?.reviewRemarks || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state when invoice changes
  React.useEffect(() => {
    if (invoice) {
      setSelectedStatus(invoice.status);
      setReviewRemarks(invoice.reviewRemarks || '');
    }
  }, [invoice]);

  if (!isOpen || !invoice) return null;

  const vendor = expenseSources.find(s => s.id === invoice.expenseSourceId);
  const paymentType = paymentTypes.find(t => t.id === invoice.paymentTypeId);
  const preparer = people.find(p => p.id === invoice.preparedById);
  const verifier = people.find(p => p.id === invoice.verifiedById);
  const approver = people.find(p => p.id === invoice.approvedById);

  const quickRemarkChips = [
    'Approved as per verified purchase order & budget allocation.',
    'Verified and approved for disbursement.',
    'Rejected: Missing original vendor invoice attachment or receipt.',
    'Rejected: Amount discrepancy detected; please revise and re-submit.',
    'Returned: Requires additional signatory authorization.'
  ];

  const handleUpdate = async (statusOverride?: InvoiceStatus) => {
    const targetStatus = statusOverride || selectedStatus;
    setIsSubmitting(true);
    try {
      const updated = await db.invoices.updateStatus(
        invoice.id, 
        targetStatus, 
        user?.id || 'sys', 
        reviewRemarks.trim() || undefined
      );
      onStatusUpdated(updated);
      onClose();
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'Approved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300"><CheckCircle className="w-3.5 h-3.5" /> Approved</span>;
      case 'Pending':
      case 'Submitted':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300"><Clock className="w-3.5 h-3.5" /> Pending Review</span>;
      case 'Rejected':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-300"><XCircle className="w-3.5 h-3.5" /> Rejected</span>;
      case 'Returned':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-800 border border-orange-300"><AlertTriangle className="w-3.5 h-3.5" /> Returned</span>;
      case 'Received':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300"><CheckCircle className="w-3.5 h-3.5" /> Received / Disbursed</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-800 border border-slate-300">{status}</span>;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-bg-panel rounded-2xl shadow-2xl w-full max-w-2xl border border-border-subtle overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-bg-base/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-100 dark:bg-accent-950/60 text-accent-600 rounded-xl border border-accent-200 dark:border-accent-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-text-base">Invoice Review & Approval</h2>
                {getStatusBadge(invoice.status)}
              </div>
              <p className="text-xs text-text-muted">Voucher {invoice.invoiceNumber} • Created {new Date(invoice.date).toLocaleDateString()}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-base hover:bg-bg-panel rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Invoice Summary Card */}
          <div className="p-4 bg-bg-base/70 rounded-xl border border-border-subtle space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border-subtle">
              <div>
                <span className="text-xs text-text-muted font-medium">Particulars / Purpose</span>
                <p className="text-sm font-bold text-text-base">{invoice.purpose}</p>
              </div>
              <div className="sm:text-right">
                <span className="text-xs text-text-muted font-medium">Requisition Amount</span>
                <p className="text-lg font-black text-accent-700">{formatCurrency(invoice.amount)}</p>
                <p className="text-[11px] text-text-muted italic">{invoice.amountInWords}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-text-muted font-medium">Expense Source / Vendor:</span>
                <p className="font-semibold text-text-base truncate">{vendor?.name || 'N/A'}</p>
              </div>
              <div>
                <span className="text-text-muted font-medium">Payment Type:</span>
                <p className="font-semibold text-text-base truncate">{paymentType?.name || 'N/A'}</p>
              </div>
              <div>
                <span className="text-text-muted font-medium">Prepared By:</span>
                <p className="font-semibold text-text-base truncate">{preparer?.name || 'N/A'}</p>
              </div>
            </div>

            {/* Document Attachments */}
            {invoice.attachments && invoice.attachments.length > 0 && (
              <div className="pt-2 border-t border-border-subtle flex items-center gap-2 flex-wrap">
                <span className="text-xs text-text-muted font-medium flex items-center gap-1">
                  <Paperclip className="w-3.5 h-3.5" /> Attachments:
                </span>
                {invoice.attachments.map(att => (
                  <span key={att.id} className="text-xs bg-bg-panel px-2 py-0.5 rounded border border-border-subtle text-accent-600 font-medium">
                    {att.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Quick Decision Workflow Buttons */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-text-muted">
              Select Decision / Workflow State
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {/* Approved */}
              <button
                type="button"
                onClick={() => setSelectedStatus('Approved')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                  selectedStatus === 'Approved'
                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-md font-bold'
                    : 'bg-bg-base/80 hover:bg-emerald-50 text-text-base border-border-subtle hover:border-emerald-300'
                }`}
              >
                <CheckCircle className="w-5 h-5 text-current" />
                <span className="text-xs">Approve Invoice</span>
              </button>

              {/* Pending */}
              <button
                type="button"
                onClick={() => setSelectedStatus('Pending')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                  selectedStatus === 'Pending' || selectedStatus === 'Submitted'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-md font-bold'
                    : 'bg-bg-base/80 hover:bg-amber-50 text-text-base border-border-subtle hover:border-amber-300'
                }`}
              >
                <Clock className="w-5 h-5 text-current" />
                <span className="text-xs">Keep Pending</span>
              </button>

              {/* Rejected */}
              <button
                type="button"
                onClick={() => setSelectedStatus('Rejected')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                  selectedStatus === 'Rejected'
                    ? 'bg-rose-500 text-white border-rose-600 shadow-md font-bold'
                    : 'bg-bg-base/80 hover:bg-rose-50 text-text-base border-border-subtle hover:border-rose-300'
                }`}
              >
                <XCircle className="w-5 h-5 text-current" />
                <span className="text-xs">Reject Voucher</span>
              </button>

              {/* Returned */}
              <button
                type="button"
                onClick={() => setSelectedStatus('Returned')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                  selectedStatus === 'Returned'
                    ? 'bg-orange-500 text-white border-orange-600 shadow-md font-bold'
                    : 'bg-bg-base/80 hover:bg-orange-50 text-text-base border-border-subtle hover:border-orange-300'
                }`}
              >
                <AlertTriangle className="w-5 h-5 text-current" />
                <span className="text-xs">Return for Fix</span>
              </button>

              {/* Received */}
              <button
                type="button"
                onClick={() => setSelectedStatus('Received')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                  selectedStatus === 'Received'
                    ? 'bg-indigo-500 text-white border-indigo-600 shadow-md font-bold'
                    : 'bg-bg-base/80 hover:bg-indigo-50 text-text-base border-border-subtle hover:border-indigo-300'
                }`}
              >
                <CheckCircle className="w-5 h-5 text-current" />
                <span className="text-xs">Mark Received</span>
              </button>

              {/* Draft */}
              <button
                type="button"
                onClick={() => setSelectedStatus('Draft')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                  selectedStatus === 'Draft'
                    ? 'bg-slate-600 text-white border-slate-700 shadow-md font-bold'
                    : 'bg-bg-base/80 hover:bg-slate-100 text-text-base border-border-subtle'
                }`}
              >
                <FileText className="w-5 h-5 text-current" />
                <span className="text-xs">Revert to Draft</span>
              </button>
            </div>
          </div>

          {/* Review Remarks & Audit Notes */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-text-muted">
              Reviewer Notes / Feedback / Rejection Reason
            </label>
            <textarea
              rows={3}
              value={reviewRemarks}
              onChange={e => setReviewRemarks(e.target.value)}
              placeholder="Add review feedback, compliance notes, or rejection reasoning..."
              className="w-full p-3 bg-bg-base border border-border-subtle rounded-xl text-sm text-text-base outline-none focus:ring-2 focus:ring-accent-400"
            />

            {/* Quick Chips */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] text-text-muted font-medium">Quick Suggestions:</span>
              <div className="flex flex-wrap gap-1.5">
                {quickRemarkChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setReviewRemarks(chip)}
                    className="text-[11px] bg-bg-base hover:bg-accent-50 hover:text-accent-700 border border-border-subtle px-2.5 py-1 rounded-lg text-text-muted transition-colors text-left"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border-subtle bg-bg-base/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-text-muted flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-accent-600" />
            <span>Audited & logged automatically under reviewer: <strong>{user?.name || 'Manager'}</strong></span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-text-muted hover:text-text-base hover:bg-bg-base rounded-lg transition-colors"
            >
              Cancel
            </button>
            
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleUpdate()}
              className="flex items-center gap-2 px-5 py-2 bg-accent-600 hover:bg-accent-700 text-white font-semibold rounded-lg text-xs transition-colors shadow-sm disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : `Save Status as ${selectedStatus}`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
