import React, { useState } from 'react';
import { 
  CheckCircle, Clock, XCircle, RotateCcw, CheckCheck, 
  History, Calendar, User, ShieldCheck, AlertCircle, ArrowRight,
  MessageSquare, ChevronRight, Sparkles, Check
} from 'lucide-react';
import { Invoice, InvoiceStatus, User as UserType } from '../types';
import { db } from '../lib/db';
import { useAuthStore } from '../lib/store';

interface ApprovalWorkflowToggleProps {
  invoice: Invoice;
  onStatusChange?: (updatedInvoice: Invoice) => void;
  canApprove?: boolean;
}

export const ApprovalWorkflowToggle: React.FC<ApprovalWorkflowToggleProps> = ({
  invoice,
  onStatusChange,
  canApprove = true,
}) => {
  const { user } = useAuthStore();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showRemarkPrompt, setShowRemarkPrompt] = useState<InvoiceStatus | null>(null);
  const [reviewRemark, setReviewRemark] = useState('');

  const currentStatus = invoice.status;

  // Handle Workflow Status Transition
  const handleTransition = async (newStatus: InvoiceStatus, customRemark?: string) => {
    if (newStatus === currentStatus) return;

    // If Rejecting or Returning, prompt for reason if not provided
    if ((newStatus === 'Rejected' || newStatus === 'Returned') && customRemark === undefined) {
      setShowRemarkPrompt(newStatus);
      return;
    }

    setIsUpdating(true);
    try {
      const actorId = user?.id || 'sys';
      const actorName = user ? `${user.name} (${user.role})` : 'Authorized Approver';
      const remark = customRemark !== undefined ? customRemark : reviewRemark;

      const updated = await db.invoices.updateStatus(
        invoice.id,
        newStatus,
        actorId,
        remark || undefined,
        actorName
      );

      setShowRemarkPrompt(null);
      setReviewRemark('');
      if (onStatusChange) {
        onStatusChange(updated);
      }
    } catch (err: any) {
      alert(`Failed to update workflow status: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'Approved':
        return {
          label: 'Approved',
          icon: CheckCircle,
          colorClasses: 'bg-emerald-500 text-white border-emerald-600',
          containerClasses: 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
        };
      case 'Pending':
      case 'Submitted':
        return {
          label: 'Pending Review',
          icon: Clock,
          colorClasses: 'bg-amber-500 text-white border-amber-600',
          containerClasses: 'bg-amber-50/70 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 text-amber-800 dark:text-amber-300'
        };
      case 'Rejected':
        return {
          label: 'Rejected',
          icon: XCircle,
          colorClasses: 'bg-rose-500 text-white border-rose-600',
          containerClasses: 'bg-rose-50/70 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800 text-rose-800 dark:text-rose-300'
        };
      case 'Returned':
        return {
          label: 'Returned for Revision',
          icon: RotateCcw,
          colorClasses: 'bg-orange-500 text-white border-orange-600',
          containerClasses: 'bg-orange-50/70 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800 text-orange-800 dark:text-orange-300'
        };
      case 'Received':
        return {
          label: 'Disbursed / Received',
          icon: CheckCheck,
          colorClasses: 'bg-indigo-500 text-white border-indigo-600',
          containerClasses: 'bg-indigo-50/70 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300'
        };
      default:
        return {
          label: status,
          icon: Clock,
          colorClasses: 'bg-slate-500 text-white border-slate-600',
          containerClasses: 'bg-slate-50 border-slate-200 text-slate-700'
        };
    }
  };

  const currentBadge = getStatusBadge(currentStatus);
  const StatusIcon = currentBadge.icon;

  const history = invoice.approvalHistory || [
    {
      id: 'init',
      status: invoice.status,
      timestamp: invoice.createdAt,
      actorId: invoice.createdBy || 'sys',
      actorName: 'Invoice Originator',
      note: 'Initial voucher creation'
    }
  ];

  // Latest recorded timestamp for current state
  const currentTimestamp = invoice.status === 'Approved' ? (invoice.statusTimestamps?.approvedAt || invoice.reviewedAt || invoice.updatedAt) :
                           invoice.status === 'Pending' ? (invoice.statusTimestamps?.pendingAt || invoice.createdAt) :
                           invoice.status === 'Rejected' ? (invoice.statusTimestamps?.rejectedAt || invoice.reviewedAt || invoice.updatedAt) :
                           invoice.status === 'Returned' ? (invoice.statusTimestamps?.returnedAt || invoice.updatedAt) :
                           invoice.status === 'Received' ? (invoice.statusTimestamps?.receivedAt || invoice.updatedAt) :
                           invoice.updatedAt || invoice.createdAt;

  return (
    <div className="bg-bg-panel border border-border-subtle rounded-2xl p-4 shadow-sm space-y-3">
      {/* Workflow Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl border ${currentBadge.containerClasses}`}>
            <StatusIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Approval Workflow</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${currentBadge.colorClasses}`}>
                {currentBadge.label}
              </span>
            </div>
            <p className="text-xs text-text-muted flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-text-muted" />
              <span>Stamped: <strong>{new Date(currentTimestamp).toLocaleString()}</strong></span>
            </p>
          </div>
        </div>

        {/* History button */}
        <button
          type="button"
          onClick={() => setShowHistoryModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-base hover:bg-bg-panel border border-border-subtle rounded-xl text-xs font-semibold text-text-base transition-colors"
        >
          <History className="w-3.5 h-3.5 text-accent-600" />
          <span>Audit Trail ({history.length})</span>
        </button>
      </div>

      {/* Interactive Workflow Toggle Pills */}
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2">
          Change Workflow Status (Recorded with Timestamp)
        </label>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* PENDING TOGGLE */}
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => handleTransition('Pending', 'Moved back to Pending review')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
              currentStatus === 'Pending' || currentStatus === 'Submitted'
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm ring-2 ring-amber-300 dark:ring-amber-800'
                : 'bg-bg-base hover:bg-amber-50 dark:hover:bg-amber-950/30 text-text-base border-border-subtle hover:border-amber-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Pending</span>
          </button>

          {/* APPROVED TOGGLE */}
          <button
            type="button"
            disabled={isUpdating || !canApprove}
            onClick={() => handleTransition('Approved', 'Authorized and approved by executive review')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
              currentStatus === 'Approved'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-300 dark:ring-emerald-800'
                : 'bg-bg-base hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-text-base border-border-subtle hover:border-emerald-300'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>Approved</span>
          </button>

          {/* REJECTED TOGGLE */}
          <button
            type="button"
            disabled={isUpdating || !canApprove}
            onClick={() => handleTransition('Rejected')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
              currentStatus === 'Rejected'
                ? 'bg-rose-600 text-white border-rose-700 shadow-sm ring-2 ring-rose-300 dark:ring-rose-800'
                : 'bg-bg-base hover:bg-rose-50 dark:hover:bg-rose-950/30 text-text-base border-border-subtle hover:border-rose-300'
            }`}
          >
            <XCircle className="w-4 h-4" />
            <span>Rejected</span>
          </button>

          {/* RECEIVED / DISBURSED TOGGLE */}
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => handleTransition('Received', 'Payment funds received and disbursed to payee')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
              currentStatus === 'Received'
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-2 ring-indigo-300 dark:ring-indigo-800'
                : 'bg-bg-base hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-text-base border-border-subtle hover:border-indigo-300'
            }`}
          >
            <CheckCheck className="w-4 h-4" />
            <span>Received</span>
          </button>
        </div>
      </div>

      {/* Reviewer Note Banner if present */}
      {invoice.reviewRemarks && (
        <div className="p-3 bg-bg-base rounded-xl border border-border-subtle flex items-start gap-2.5 text-xs">
          <MessageSquare className="w-4 h-4 text-accent-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold text-text-base">Latest Workflow Remark:</span>
            <p className="text-text-muted mt-0.5 italic">"{invoice.reviewRemarks}"</p>
          </div>
        </div>
      )}

      {/* REMARK PROMPT DIALOG (for Rejection / Revision reason) */}
      {showRemarkPrompt && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              <span>Provide Reason for Setting Status to "{showRemarkPrompt}"</span>
            </span>
            <button
              type="button"
              onClick={() => setShowRemarkPrompt(null)}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
            >
              Cancel
            </button>
          </div>

          <textarea
            rows={2}
            value={reviewRemark}
            onChange={e => setReviewRemark(e.target.value)}
            placeholder="E.g., Discrepancy in receipt attachment, budget line item exceeded, missing manager signatory..."
            className="w-full p-2.5 bg-bg-panel border border-rose-300 dark:border-rose-700 rounded-lg text-xs text-text-base outline-none focus:ring-2 focus:ring-rose-400"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowRemarkPrompt(null)}
              className="px-3 py-1.5 text-xs text-text-muted hover:bg-bg-panel rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleTransition(showRemarkPrompt, reviewRemark || `Status changed to ${showRemarkPrompt}`)}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-sm"
            >
              Confirm & Timestamp {showRemarkPrompt}
            </button>
          </div>
        </div>
      )}

      {/* AUDIT TRAIL MODAL */}
      {showHistoryModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowHistoryModal(false)}
        >
          <div 
            className="bg-bg-panel rounded-2xl shadow-2xl w-full max-w-lg border border-border-subtle overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle bg-bg-base/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-accent-50 text-accent-600 rounded-xl">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-base">Approval Workflow Timeline</h3>
                  <p className="text-xs text-text-muted">Recorded timestamps & state transitions for {invoice.invoiceNumber}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="p-1.5 text-text-muted hover:text-text-base rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border-subtle">
                {history.map((step, idx) => {
                  const badge = getStatusBadge(step.status);
                  const Icon = badge.icon;
                  const isLatest = idx === history.length - 1;

                  return (
                    <div key={step.id || idx} className="relative group">
                      {/* Node circle */}
                      <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center ${badge.colorClasses} ring-4 ring-bg-panel text-[10px]`}>
                        <Icon className="w-3 h-3" />
                      </div>

                      <div className="p-3 bg-bg-base/80 border border-border-subtle rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${badge.containerClasses}`}>
                            {step.status}
                          </span>
                          <span className="text-[10px] font-mono text-text-muted">
                            {new Date(step.timestamp).toLocaleString()}
                          </span>
                        </div>

                        <p className="text-text-base font-medium pt-1">
                          {step.note || `Status updated to ${step.status}`}
                        </p>

                        <div className="flex items-center gap-1.5 text-[10px] text-text-muted pt-1">
                          <User className="w-3 h-3 text-accent-600" />
                          <span>Actor: <strong>{step.actorName || step.actorId}</strong></span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-border-subtle bg-bg-base/50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Close Audit Trail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
