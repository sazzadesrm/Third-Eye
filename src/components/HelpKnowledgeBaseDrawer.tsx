import React, { useState, useMemo } from 'react';
import { 
  X, Search, BookOpen, HelpCircle, CheckCircle2, FileText, 
  ShieldCheck, RefreshCw, Layers, Sparkles, ExternalLink, 
  ArrowRight, Download, Upload, Printer, AlertTriangle, 
  Lock, UserCheck, Zap, Database, ChevronRight, ChevronDown, 
  FileSpreadsheet, Keyboard, Clock, Copy, Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HelpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenShortcutsHelp?: () => void;
}

type TabType = 'guides' | 'faq' | 'compliance' | 'shortcuts';

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  tags: string[];
}

export const HelpKnowledgeBaseDrawer: React.FC<HelpDrawerProps> = ({
  isOpen,
  onClose,
  onOpenShortcutsHelp,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('guides');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq-1');
  const [activeGuideId, setActiveGuideId] = useState<string>('guide-1');
  const [copiedShortcut, setCopiedShortcut] = useState<string | null>(null);

  const navigate = useNavigate();

  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? '⌘' : 'Ctrl';

  const quickGuides = [
    {
      id: 'guide-1',
      title: 'Creating & Submitting Expense Invoices',
      icon: FileText,
      badge: 'Core Workflow',
      description: 'Step-by-step procedure for drafting, coding, and submitting expense vouchers for approval.',
      steps: [
        {
          title: 'Select Expense Source & Payment Type',
          details: 'Choose the legal vendor/entity (Expense Source) and the corresponding Payment Type (e.g., DRAWINGS-COMMON, UTILITY & INFRASTRUCTURE).',
        },
        {
          title: 'Provide Detailed Purpose & Amount',
          details: 'Enter an explicit statement of expense purpose. The system automatically converts numerical amounts into words (e.g., "One Hundred Forty-Five Thousand Taka Only").',
        },
        {
          title: 'Assign Signatories (Dual Authorization)',
          details: 'Select the Received By, Prepared By, Verified By, and Approved By signatories. Note: Preparer and Approver cannot be the same person.',
        },
        {
          title: 'Attach Receipts & Supporting Documents',
          details: 'Upload JPG, PNG, or PDF scanned receipts directly. Attachments are securely packaged with the voucher.',
        },
        {
          title: 'Draft or Submit for Approval',
          details: 'Save as "Draft" for later review or click "Submit for Approval" to push the voucher to the manager verification queue.',
        },
      ],
      quickAction: {
        label: 'Create an Invoice Now',
        path: '/invoices/new',
      }
    },
    {
      id: 'guide-2',
      title: 'Invoice Approval & Review Queue',
      icon: ShieldCheck,
      badge: 'Management',
      description: 'How managers review pending vouchers, return for corrections, or grant final approval.',
      steps: [
        {
          title: 'Access the Approval Queue',
          details: 'Navigate to Invoices > Approval Queue tab to see all pending and submitted vouchers awaiting review.',
        },
        {
          title: 'Inspect Invoice Particulars & Attachments',
          details: 'Open the Review dialog to verify expense source, account head allocation, amount, and scanned proof of purchase.',
        },
        {
          title: 'Approve, Return, or Reject',
          details: 'Select "Approve" for immediate authorization, "Return" with review remarks for amendments, or "Reject" with mandatory justification.',
        },
        {
          title: 'Automated Audit Logging',
          details: 'All workflow status transitions are immutably logged with the reviewer identity, timestamp, and audit remarks.',
        },
      ],
      quickAction: {
        label: 'Open Approval Queue',
        path: '/invoices?tab=approval-queue',
      }
    },
    {
      id: 'guide-3',
      title: 'Bulk Actions: Multi-Print & ZIP Export',
      icon: Layers,
      badge: 'Productivity',
      description: 'Select multiple invoices to print high-fidelity vouchers in batch or download as an organized ZIP bundle.',
      steps: [
        {
          title: 'Select Invoices in the Table',
          details: 'Use the row checkboxes to select specific invoices, or check the header box to select all filtered invoices.',
        },
        {
          title: 'Print Selected Vouchers',
          details: 'Click "Print Selected" in the floating action bar to generate multi-page official vouchers with automatic page breaks.',
        },
        {
          title: 'Download as ZIP Archive',
          details: 'Click "Download as ZIP" to package HTML/PDF vouchers, a master CSV reconciliation file, and all attachments into a single archive.',
        },
        {
          title: 'Bulk Approval',
          details: 'Authorized administrators can batch-approve all selected pending vouchers with a single click.',
        },
      ],
      quickAction: {
        label: 'Go to Invoices Table',
        path: '/invoices',
      }
    },
    {
      id: 'guide-4',
      title: 'Recurring Invoice Schedules',
      icon: RefreshCw,
      badge: 'Automation',
      description: 'Automate periodic overhead expenses such as monthly office lease, cloud servers, and utilities.',
      steps: [
        {
          title: 'Define Schedule & Frequency',
          details: 'Create a schedule with Weekly, Monthly, Quarterly, or Yearly recurrence and set the target billing day.',
        },
        {
          title: 'Set Allocation & Signatories',
          details: 'Pre-configure expense heads and authorized signatories so each generated voucher is pre-populated.',
        },
        {
          title: 'Instant Execution ("Generate Now")',
          details: 'Generate on-demand vouchers ahead of schedule without waiting for the automated trigger date.',
        },
        {
          title: 'Pause or Resume Schedules',
          details: 'Toggle status between Active and Paused whenever contracts or services change.',
        },
      ],
      quickAction: {
        label: 'Manage Recurring Schedules',
        path: '/invoices',
      }
    },
    {
      id: 'guide-5',
      title: 'Master Data & Bulk CSV Import',
      icon: Database,
      badge: 'Configuration',
      description: 'Maintain clean supplier books, payment heads, account titles, and personnel records.',
      steps: [
        {
          title: 'Manage Categories',
          details: 'Add and organize Expense Sources, Payment Types, Account Titles, and People with designations & office IDs.',
        },
        {
          title: 'Bulk Import via CSV/Excel',
          details: 'Import dozens of vendors or personnel records at once using the built-in CSV template importer.',
        },
        {
          title: 'Dual Authorization Flagging',
          details: 'Assign specific approval roles (isPreparedBy, isVerifiedBy, isApprovedBy) to ensure segregation of duties.',
        },
      ],
      quickAction: {
        label: 'Open Master Data',
        path: '/master-data',
      }
    },
    {
      id: 'guide-6',
      title: 'Audit Trail & User Event Analytics',
      icon: Clock,
      badge: 'Security & Audit',
      description: 'Track user-specific activities, filter logs by user and date, and inspect detailed audit trails.',
      steps: [
        {
          title: 'Filter by Actor & User',
          details: 'Select any specific team member or administrator to inspect their complete trail of actions.',
        },
        {
          title: 'Date Range & Quick Presets',
          details: 'Filter events by Today, Last 7 Days, This Month, or custom date ranges.',
        },
        {
          title: 'Inspect Specific Activity Records',
          details: 'View who created, edited, deleted, approved, or exported records along with target identifiers.',
        },
      ],
      quickAction: {
        label: 'View Audit Trail',
        path: '/audit-trail',
      }
    }
  ];

  const faqs: FAQItem[] = [
    {
      id: 'faq-1',
      category: 'Invoicing & Approvals',
      question: 'Why does the system prevent the Preparer and Approver from being the same person?',
      answer: 'This is an enforced Dual-Authorization / Segregation of Duties compliance policy. To prevent financial irregularities, the person who drafts the voucher cannot self-approve it.',
      tags: ['compliance', 'roles', 'approval', 'error']
    },
    {
      id: 'faq-2',
      category: 'Invoicing & Approvals',
      question: 'How do Seal Codes and Reference Codes work on the printable voucher?',
      answer: 'Each voucher automatically generates a unique cryptographic Seal Code (e.g., SEAL-89X2-K91Q) and Reference Verification Code. These match the QR code printed on the voucher for tamper-proof physical audit verification.',
      tags: ['seal', 'qr', 'security', 'voucher']
    },
    {
      id: 'faq-3',
      category: 'Invoicing & Approvals',
      question: 'What happens when an invoice is "Returned" by an Approver?',
      answer: 'When returned, the invoice status changes to "Returned" with reviewer notes. The preparer receives a notification, can edit the draft to fix remarks, and re-submit for approval.',
      tags: ['returned', 'review', 'workflow']
    },
    {
      id: 'faq-4',
      category: 'Bulk Operations',
      question: 'How do I download multiple invoices with their receipts in a single ZIP file?',
      answer: 'Go to the Invoices page, select the checkboxes next to the invoices you wish to export, and click "Download as ZIP" in the bottom action bar. The system will compile all vouchers, receipts, and an index CSV.',
      tags: ['zip', 'bulk', 'download', 'export']
    },
    {
      id: 'faq-5',
      category: 'Bulk Operations',
      question: 'Can I print multiple vouchers at once without opening each one separately?',
      answer: 'Yes! Select the invoices from the table and click "Print Selected". A consolidated print document with formatted vouchers and clean page breaks will open ready for printing.',
      tags: ['print', 'bulk', 'pdf']
    },
    {
      id: 'faq-6',
      category: 'Recurring Invoices',
      question: 'When are recurring invoices automatically scheduled for billing?',
      answer: 'Recurring invoices compute their next billing date based on their recurrence cycle (Weekly, Monthly, Quarterly, Yearly) and the specified Billing Day. You can also trigger "Generate Now" at any time.',
      tags: ['recurring', 'schedule', 'automation']
    },
    {
      id: 'faq-7',
      category: 'Data & Backups',
      question: 'How do I backup all invoices, master data, and audit trails?',
      answer: 'Press Ctrl+B (or ⌘+B on Mac), or navigate to Settings > Database Backup & Restore. Click "Export Full Database" to download an encrypted JSON backup file.',
      tags: ['backup', 'export', 'restore', 'json']
    },
    {
      id: 'faq-8',
      category: 'Audit Trail',
      question: 'Can I see who deleted an invoice or edited payment details?',
      answer: 'Yes. Visit the Audit Trail page, select the user or module filter (Invoices), and specify the date range. The audit log permanently records who performed the delete or update with exact timestamps.',
      tags: ['audit', 'delete', 'user', 'logs']
    },
  ];

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqs;
    const q = searchQuery.toLowerCase();
    return faqs.filter(f => 
      f.question.toLowerCase().includes(q) || 
      f.answer.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q) ||
      f.tags.some(t => t.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const filteredGuides = useMemo(() => {
    if (!searchQuery.trim()) return quickGuides;
    const q = searchQuery.toLowerCase();
    return quickGuides.filter(g => 
      g.title.toLowerCase().includes(q) || 
      g.description.toLowerCase().includes(q) ||
      g.steps.some(s => s.title.toLowerCase().includes(q) || s.details.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const shortcutsList = [
    { key: `${modKey}+K`, desc: 'Open Omni-Command Palette & Global Search' },
    { key: `${modKey}+N`, desc: 'Create New Expense Voucher' },
    { key: `${modKey}+D`, desc: 'Navigate to Financial Dashboard' },
    { key: `${modKey}+I`, desc: 'Navigate to Invoices & Approval Queue' },
    { key: `${modKey}+M`, desc: 'Open Master Data Management' },
    { key: `${modKey}+B`, desc: 'Export Full JSON System Backup' },
    { key: `${modKey}+T`, desc: 'Toggle Dark / Light Mode Theme' },
    { key: `? or ${modKey}+/`, desc: 'Open Keyboard Shortcuts Cheat Sheet' },
    { key: `Escape`, desc: 'Close dialogs, drawers, and menus' },
  ];

  const handleCopyShortcut = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedShortcut(key);
    setTimeout(() => setCopiedShortcut(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-bg-panel shadow-2xl border-l border-border-subtle flex flex-col transform transition-transform duration-300 ease-in-out">
          
          {/* Header */}
          <div className="px-6 py-5 bg-bg-base border-b border-border-subtle flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-accent-600/10 text-accent-600 rounded-xl border border-accent-600/20">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text-base flex items-center gap-2">
                  Knowledge Base & Help Center
                </h2>
                <p className="text-xs text-text-muted">
                  Quick-start guides, FAQs, compliance rules & shortcuts
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-base hover:bg-bg-panel rounded-lg transition-colors"
              title="Close drawer (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Box */}
          <div className="p-4 border-b border-border-subtle bg-bg-panel">
            <div className="relative">
              <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search guides, FAQs, error fixes, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 text-sm bg-bg-base border border-border-subtle rounded-xl text-text-base placeholder-text-muted focus:outline-hidden focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 transition-all"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text-base p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 px-4 py-2 bg-bg-base/70 border-b border-border-subtle overflow-x-auto text-xs font-medium">
            <button
              onClick={() => setActiveTab('guides')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'guides'
                  ? 'bg-accent-600 text-white shadow-2xs font-semibold'
                  : 'text-text-muted hover:text-text-base hover:bg-bg-panel'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Quick-Start Guides ({filteredGuides.length})
            </button>

            <button
              onClick={() => setActiveTab('faq')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'faq'
                  ? 'bg-accent-600 text-white shadow-2xs font-semibold'
                  : 'text-text-muted hover:text-text-base hover:bg-bg-panel'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              FAQs & Fixes ({filteredFaqs.length})
            </button>

            <button
              onClick={() => setActiveTab('compliance')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'compliance'
                  ? 'bg-accent-600 text-white shadow-2xs font-semibold'
                  : 'text-text-muted hover:text-text-base hover:bg-bg-panel'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Roles & Compliance
            </button>

            <button
              onClick={() => setActiveTab('shortcuts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'shortcuts'
                  ? 'bg-accent-600 text-white shadow-2xs font-semibold'
                  : 'text-text-muted hover:text-text-base hover:bg-bg-panel'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              Shortcuts
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* TAB: Quick-Start Guides */}
            {activeTab === 'guides' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  {filteredGuides.map((guide) => {
                    const Icon = guide.icon;
                    const isSelected = activeGuideId === guide.id;
                    return (
                      <div 
                        key={guide.id}
                        className={`border rounded-xl transition-all overflow-hidden ${
                          isSelected 
                            ? 'border-accent-500 bg-accent-50/10 shadow-xs' 
                            : 'border-border-subtle bg-bg-panel hover:border-slate-300'
                        }`}
                      >
                        <div 
                          onClick={() => setActiveGuideId(isSelected ? '' : guide.id)}
                          className="p-4 flex items-center justify-between cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isSelected ? 'bg-accent-600 text-white' : 'bg-bg-base text-accent-600'}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-text-base">{guide.title}</h3>
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent-100 text-accent-800 dark:bg-accent-950 dark:text-accent-300">
                                  {guide.badge}
                                </span>
                              </div>
                              <p className="text-xs text-text-muted mt-0.5">{guide.description}</p>
                            </div>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-text-muted transition-transform duration-200 ${isSelected ? 'rotate-180' : ''}`} />
                        </div>

                        {isSelected && (
                          <div className="px-5 pb-5 pt-1 border-t border-border-subtle/60 bg-bg-panel/50 space-y-4">
                            <div className="space-y-3 mt-3">
                              {guide.steps.map((step, idx) => (
                                <div key={idx} className="flex items-start gap-3">
                                  <div className="w-5 h-5 rounded-full bg-accent-600/15 text-accent-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                    {idx + 1}
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-semibold text-text-base">{step.title}</h4>
                                    <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{step.details}</p>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {guide.quickAction && (
                              <div className="pt-3 flex justify-end">
                                <button
                                  onClick={() => {
                                    onClose();
                                    navigate(guide.quickAction.path);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-accent-600 hover:bg-accent-700 text-white text-xs font-medium rounded-lg transition-colors shadow-2xs"
                                >
                                  <span>{guide.quickAction.label}</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: FAQs */}
            {activeTab === 'faq' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-text-muted mb-2">
                  <span>Showing {filteredFaqs.length} questions</span>
                  <span>Click a question to expand</span>
                </div>

                <div className="space-y-3">
                  {filteredFaqs.map((faq) => {
                    const isExpanded = expandedFaqId === faq.id;
                    return (
                      <div 
                        key={faq.id}
                        className="border border-border-subtle rounded-xl overflow-hidden bg-bg-panel transition-colors"
                      >
                        <button
                          onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                          className="w-full text-left p-4 flex items-start justify-between gap-3 hover:bg-bg-base transition-colors"
                        >
                          <div className="space-y-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-accent-600 bg-accent-50 dark:bg-accent-950/40 px-2 py-0.5 rounded">
                              {faq.category}
                            </span>
                            <h4 className="text-sm font-semibold text-text-base leading-snug pt-1">
                              {faq.question}
                            </h4>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-text-muted shrink-0 transition-transform duration-200 mt-1 ${isExpanded ? 'rotate-180 text-accent-600' : ''}`} />
                        </button>

                        {isExpanded && (
                          <div className="p-4 pt-0 border-t border-border-subtle bg-bg-base/40 text-xs text-text-muted leading-relaxed space-y-2">
                            <p className="mt-2">{faq.answer}</p>
                            <div className="flex flex-wrap gap-1.5 pt-2">
                              {faq.tags.map(t => (
                                <span key={t} className="text-[10px] bg-bg-panel border border-border-subtle px-1.5 py-0.5 rounded text-text-muted">
                                  #{t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: Roles & Compliance */}
            {activeTab === 'compliance' && (
              <div className="space-y-5 text-xs text-text-muted">
                <div className="p-4 bg-accent-50/20 border border-accent-200 dark:border-accent-900 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-accent-700 dark:text-accent-400 font-bold text-sm">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Dual Authorization Financial Safeguard</span>
                  </div>
                  <p className="leading-relaxed">
                    Under corporate financial governance guidelines, the system enforces a strict 
                    <strong className="text-text-base font-semibold"> Segregation of Duties</strong>:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-text-base">
                    <li>The <strong className="font-semibold">Prepared By</strong> signatory can never be identical to the <strong className="font-semibold">Approved By</strong> signatory.</li>
                    <li>Only users with <strong className="font-semibold">Super Admin</strong> or <strong className="font-semibold">Admin</strong> roles can execute direct approvals or status transitions.</li>
                    <li>Returned vouchers must include transparent review remarks explaining required revisions.</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-text-base">Role Hierarchy Matrix</h4>
                  <div className="border border-border-subtle rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-bg-base border-b border-border-subtle">
                        <tr>
                          <th className="p-2.5 font-semibold text-text-base">Role</th>
                          <th className="p-2.5 font-semibold text-text-base">Invoices</th>
                          <th className="p-2.5 font-semibold text-text-base">Approval Queue</th>
                          <th className="p-2.5 font-semibold text-text-base">Master Data</th>
                          <th className="p-2.5 font-semibold text-text-base">Backups</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle bg-bg-panel">
                        <tr>
                          <td className="p-2.5 font-bold text-text-base">Super Admin</td>
                          <td className="p-2.5 text-emerald-600 font-medium">Full Access</td>
                          <td className="p-2.5 text-emerald-600 font-medium">Full Approval</td>
                          <td className="p-2.5 text-emerald-600 font-medium">Full Control</td>
                          <td className="p-2.5 text-emerald-600 font-medium">Full Backup/Restore</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-text-base">Admin</td>
                          <td className="p-2.5 text-emerald-600 font-medium">Full Access</td>
                          <td className="p-2.5 text-emerald-600 font-medium">Full Approval</td>
                          <td className="p-2.5 text-emerald-600 font-medium">Full Control</td>
                          <td className="p-2.5 text-slate-500 font-medium">Export Only</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-text-base">Pro</td>
                          <td className="p-2.5 text-emerald-600 font-medium">Create/Edit Own</td>
                          <td className="p-2.5 text-amber-600 font-medium">View Only</td>
                          <td className="p-2.5 text-amber-600 font-medium">View Only</td>
                          <td className="p-2.5 text-rose-500 font-medium">Restricted</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-bold text-text-base">Lite</td>
                          <td className="p-2.5 text-amber-600 font-medium">Draft Only</td>
                          <td className="p-2.5 text-rose-500 font-medium">Restricted</td>
                          <td className="p-2.5 text-amber-600 font-medium">View Only</td>
                          <td className="p-2.5 text-rose-500 font-medium">Restricted</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Shortcuts */}
            {activeTab === 'shortcuts' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>Global hotkeys accessible anywhere in the app</span>
                  {onOpenShortcutsHelp && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenShortcutsHelp();
                      }}
                      className="text-accent-600 hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>Open Interactive Cheat Sheet</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {shortcutsList.map((item, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl border border-border-subtle bg-bg-panel hover:bg-bg-base transition-colors"
                    >
                      <span className="text-xs font-medium text-text-base">{item.desc}</span>
                      <button
                        onClick={() => handleCopyShortcut(item.key)}
                        className="flex items-center gap-1.5 group"
                        title="Click to copy shortcut"
                      >
                        <kbd className="px-2 py-1 text-xs font-mono font-bold text-accent-700 dark:text-accent-400 bg-bg-base border border-border-subtle rounded-md shadow-2xs group-hover:border-accent-400 transition-colors">
                          {item.key}
                        </kbd>
                        {copiedShortcut === item.key ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer with Quick Jump */}
          <div className="p-4 bg-bg-base border-t border-border-subtle flex items-center justify-between text-xs text-text-muted">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent-600" />
              <span>THIRD EYE Financial Operations v2.4</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-bg-panel border border-border-subtle text-text-base hover:bg-border-subtle/50 rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
