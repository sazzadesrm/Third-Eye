import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Clock, RefreshCw, CheckCircle2, AlertCircle, Save, Layers } from 'lucide-react';
import { db, computeNextBillingDate } from '../lib/db';
import { RecurringInvoice, RecurringInvoiceFrequency, ExpenseSource, PaymentType, AccountTitle, Person } from '../types';
import { useAuthStore } from '../lib/store';
import { formatCurrency } from '../lib/utils';

interface RecurringInvoiceModalProps {
  initialData: RecurringInvoice | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const RecurringInvoiceModal: React.FC<RecurringInvoiceModalProps> = ({
  initialData,
  isOpen,
  onClose,
  onSave
}) => {
  const { user } = useAuthStore();
  const [sources, setSources] = useState<ExpenseSource[]>([]);
  const [types, setTypes] = useState<PaymentType[]>([]);
  const [titles, setTitles] = useState<AccountTitle[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<RecurringInvoice>>({
    title: '',
    expenseSourceId: '',
    paymentTypeId: '',
    accountTitleId: '',
    purpose: '',
    amount: 0,
    frequency: 'Monthly',
    billingDay: 1,
    startDate: new Date().toISOString().split('T')[0],
    nextBillingDate: new Date().toISOString().split('T')[0],
    status: 'Active',
    autoGenerate: true,
    preparedById: '',
    verifiedById: '',
    approvedById: '',
    receivedById: '',
    remarks: '',
  });

  useEffect(() => {
    Promise.all([
      db.expenseSources.getAll(),
      db.paymentTypes.getAll(),
      db.accountTitles.getAll(),
      db.people.getAll(),
    ]).then(([s, t, a, p]) => {
      setSources(s.filter(i => i.isActive));
      setTypes(t.filter(i => i.isActive));
      setTitles(a.filter(i => i.isActive));
      setPeople(p.filter(i => i.isActive));

      if (initialData) {
        setFormData(initialData);
      } else {
        const defaultSrc = s[0]?.id || '';
        const defaultType = t[0]?.id || '';
        const defaultTitle = a[0]?.id || '';
        const defaultPreparer = p.find(person => person.isPreparedBy)?.id || p[0]?.id || '';
        const defaultVerifier = p.find(person => person.isVerifiedBy)?.id || '';
        const defaultApprover = p.find(person => person.isApprovedBy)?.id || '';
        const defaultReceiver = p.find(person => person.isReceivedBy)?.id || p[0]?.id || '';

        const today = new Date();
        const nextDate = computeNextBillingDate('Monthly', 1, today);

        setFormData({
          title: '',
          expenseSourceId: defaultSrc,
          paymentTypeId: defaultType,
          accountTitleId: defaultTitle,
          purpose: '',
          amount: 50000,
          frequency: 'Monthly',
          billingDay: 1,
          startDate: today.toISOString().split('T')[0],
          nextBillingDate: nextDate,
          status: 'Active',
          autoGenerate: true,
          preparedById: defaultPreparer,
          verifiedById: defaultVerifier,
          approvedById: defaultApprover,
          receivedById: defaultReceiver,
          remarks: '',
        });
      }
    });
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleFrequencyOrDayChange = (freq: RecurringInvoiceFrequency, day: number) => {
    const nextDate = computeNextBillingDate(freq, day, new Date(formData.startDate || Date.now()));
    setFormData(prev => ({
      ...prev,
      frequency: freq,
      billingDay: day,
      nextBillingDate: nextDate
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) {
      setError('Schedule Title is required');
      return;
    }
    if (!formData.amount || formData.amount <= 0) {
      setError('A valid recurring amount greater than 0 is required');
      return;
    }
    if (!formData.expenseSourceId) {
      setError('Please select a vendor / expense source');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const now = new Date().toISOString();
      const payload: RecurringInvoice = {
        id: initialData?.id || crypto.randomUUID(),
        title: formData.title.trim(),
        expenseSourceId: formData.expenseSourceId || '',
        paymentTypeId: formData.paymentTypeId || '',
        accountTitleId: formData.accountTitleId || '',
        purpose: formData.purpose || '',
        amount: Number(formData.amount),
        frequency: formData.frequency as RecurringInvoiceFrequency || 'Monthly',
        billingDay: Number(formData.billingDay) || 1,
        startDate: formData.startDate || now.split('T')[0],
        nextBillingDate: formData.nextBillingDate || computeNextBillingDate(formData.frequency || 'Monthly', formData.billingDay || 1),
        status: formData.status as any || 'Active',
        autoGenerate: !!formData.autoGenerate,
        preparedById: formData.preparedById || '',
        verifiedById: formData.verifiedById || '',
        approvedById: formData.approvedById || '',
        receivedById: formData.receivedById || '',
        remarks: formData.remarks || '',
        createdBy: initialData?.createdBy || user?.id || 'sys',
        createdAt: initialData?.createdAt || now,
        lastGeneratedInvoiceId: initialData?.lastGeneratedInvoiceId,
        lastGeneratedDate: initialData?.lastGeneratedDate,
      };

      await db.recurringInvoices.save(payload);
      await db.auditLogs.add(
        user?.id || 'sys',
        initialData ? 'Update Recurring Schedule' : 'Create Recurring Schedule',
        'Recurring Invoices',
        payload.id,
        `${initialData ? 'Updated' : 'Created'} recurring invoice schedule "${payload.title}" (${payload.frequency}, ${formatCurrency(payload.amount)})`
      );

      onSave();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to save recurring invoice schedule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-bg-panel rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-border-subtle flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-subtle bg-bg-base/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent-50 text-accent-600 border border-accent-200">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-base">
                {initialData ? 'Edit Recurring Schedule' : 'Create Recurring Invoice Schedule'}
              </h2>
              <p className="text-xs text-text-muted">Set up automated billing cycles for subscriptions, leases, and utilities</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-text-muted hover:bg-bg-base hover:text-text-base rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form id="recurring-form" onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
          {error && (
            <div className="flex items-center gap-3 p-3.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title & Amount */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                Subscription / Schedule Title *
              </label>
              <input
                required
                type="text"
                value={formData.title || ''}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Monthly AWS Cloud Servers & Database Hosting"
                className="w-full p-2.5 bg-bg-base border border-border-subtle rounded-lg text-sm text-text-base focus:bg-bg-panel focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none transition-all font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                  Recurring Amount (BDT) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-text-muted">৳</span>
                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={formData.amount || ''}
                    onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-8 pr-4 py-2.5 bg-bg-base border border-border-subtle rounded-lg text-sm text-text-base font-semibold focus:bg-bg-panel focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                  Schedule Status
                </label>
                <select
                  value={formData.status || 'Active'}
                  onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full p-2.5 bg-bg-base border border-border-subtle rounded-lg text-sm text-text-base focus:bg-bg-panel focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none transition-all"
                >
                  <option value="Active">Active (Generating)</option>
                  <option value="Paused">Paused (On Hold)</option>
                  <option value="Completed">Completed / Expired</option>
                </select>
              </div>
            </div>
          </div>

          {/* Cadence and Billing Date */}
          <div className="p-4 rounded-xl bg-bg-base/70 border border-border-subtle space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-accent-600" /> Billing Cadence & Cycle
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-base mb-1">
                  Billing Frequency
                </label>
                <select
                  value={formData.frequency || 'Monthly'}
                  onChange={e => handleFrequencyOrDayChange(e.target.value as RecurringInvoiceFrequency, formData.billingDay || 1)}
                  className="w-full p-2.5 bg-bg-panel border border-border-subtle rounded-lg text-sm text-text-base focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none transition-all"
                >
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly (Every 3 Months)</option>
                  <option value="Yearly">Yearly (Annual)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-base mb-1">
                  Billing Day of Period
                </label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  value={formData.billingDay || 1}
                  onChange={e => handleFrequencyOrDayChange(formData.frequency as RecurringInvoiceFrequency || 'Monthly', parseInt(e.target.value) || 1)}
                  className="w-full p-2.5 bg-bg-panel border border-border-subtle rounded-lg text-sm text-text-base focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none transition-all font-mono"
                />
                <p className="text-[10px] text-text-muted mt-1">Day 1 to 28 (e.g. 1 = 1st of month)</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-base mb-1">
                  Next Scheduled Date
                </label>
                <input
                  type="date"
                  value={formData.nextBillingDate || ''}
                  onChange={e => setFormData({ ...formData, nextBillingDate: e.target.value })}
                  className="w-full p-2.5 bg-bg-panel border border-border-subtle rounded-lg text-sm text-text-base focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none transition-all font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-border-subtle">
              <input
                type="checkbox"
                id="autoGenerate"
                checked={formData.autoGenerate}
                onChange={e => setFormData({ ...formData, autoGenerate: e.target.checked })}
                className="w-4 h-4 text-accent-600 rounded focus:ring-accent-500"
              />
              <label htmlFor="autoGenerate" className="text-xs font-medium text-text-base cursor-pointer">
                Automatically generate voucher and notify financial officers on billing date
              </label>
            </div>
          </div>

          {/* Master Data Classifications */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                Vendor / Expense Source *
              </label>
              <select
                required
                value={formData.expenseSourceId}
                onChange={e => setFormData({ ...formData, expenseSourceId: e.target.value })}
                className="w-full p-2.5 bg-bg-base border border-border-subtle rounded-lg text-xs text-text-base focus:bg-bg-panel focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none transition-all"
              >
                {sources.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                Payment Type / Category
              </label>
              <select
                value={formData.paymentTypeId}
                onChange={e => setFormData({ ...formData, paymentTypeId: e.target.value })}
                className="w-full p-2.5 bg-bg-base border border-border-subtle rounded-lg text-xs text-text-base focus:bg-bg-panel focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none transition-all"
              >
                {types.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                Account Fund Title
              </label>
              <select
                value={formData.accountTitleId}
                onChange={e => setFormData({ ...formData, accountTitleId: e.target.value })}
                className="w-full p-2.5 bg-bg-base border border-border-subtle rounded-lg text-xs text-text-base focus:bg-bg-panel focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none transition-all"
              >
                {titles.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Purpose & Remarks */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                Invoice Purpose / Description
              </label>
              <textarea
                rows={2}
                value={formData.purpose || ''}
                onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                placeholder="Details of the recurring agreement, contract terms, or scope..."
                className="w-full p-2.5 bg-bg-base border border-border-subtle rounded-lg text-sm text-text-base focus:bg-bg-panel focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                Internal Remarks & Notes
              </label>
              <input
                type="text"
                value={formData.remarks || ''}
                onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="e.g. Contract No. 2026-BOD-Q1, PO reference"
                className="w-full p-2.5 bg-bg-base border border-border-subtle rounded-lg text-sm text-text-base focus:bg-bg-panel focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none transition-all"
              />
            </div>
          </div>

          {/* Workflow Roles Default */}
          <div className="pt-2 border-t border-border-subtle">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Workflow Sign-off Defaults</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-base mb-1">Prepared By</label>
                <select
                  value={formData.preparedById}
                  onChange={e => setFormData({ ...formData, preparedById: e.target.value })}
                  className="w-full p-2 bg-bg-base border border-border-subtle rounded-lg text-xs text-text-base focus:bg-bg-panel focus:border-accent-500 outline-none"
                >
                  {people.filter(p => p.isPreparedBy).map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.designation})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-base mb-1">Approved By</label>
                <select
                  value={formData.approvedById}
                  onChange={e => setFormData({ ...formData, approvedById: e.target.value })}
                  className="w-full p-2 bg-bg-base border border-border-subtle rounded-lg text-xs text-text-base focus:bg-bg-panel focus:border-accent-500 outline-none"
                >
                  <option value="">-- Select Approver --</option>
                  {people.filter(p => p.isApprovedBy).map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.designation})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </form>

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
            type="submit"
            form="recurring-form"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-accent-600 hover:bg-accent-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
};
