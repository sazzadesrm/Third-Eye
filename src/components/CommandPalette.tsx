import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, FileText, Plus, Moon, Sun, Download, ShieldCheck, Database, 
  Settings, Activity, RefreshCw, Layers, ArrowRight, CornerDownLeft, 
  HelpCircle, Clock, Sparkles, X, CheckCircle2, AlertCircle, BookOpen
} from 'lucide-react';
import { db } from '../lib/db';
import { Invoice } from '../types';
import { formatCurrency } from '../lib/utils';
import { useAuthStore } from '../lib/store';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenShortcutsHelp: () => void;
  onOpenHelpDrawer?: () => void;
}

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Actions' | 'Navigation' | 'Invoices';
  icon: any;
  shortcut?: string;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ 
  isOpen, 
  onClose,
  onOpenShortcutsHelp,
  onOpenHelpDrawer,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? '⌘' : 'Ctrl';

  useEffect(() => {
    if (isOpen) {
      db.invoices.getAll().then(setInvoices);
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleExportBackup = async () => {
    try {
      const backupData = await db.backup.exportFullBackup();
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ThirdEye_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onClose();
      alert('System database backup exported successfully!');
    } catch (err: any) {
      alert(`Backup failed: ${err.message}`);
    }
  };

  const handleToggleTheme = async () => {
    const settings = await db.settings.get();
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    await db.settings.save({ ...settings, theme: nextTheme });
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    onClose();
  };

  // Base navigation and action items
  const baseActions: CommandItem[] = [
    {
      id: 'act-new-invoice',
      title: 'Create New Invoice Voucher',
      subtitle: 'Draft or submit a new miscellaneous expenditure voucher',
      category: 'Actions',
      icon: Plus,
      shortcut: `${modKey}+N`,
      action: () => { navigate('/invoices/new'); onClose(); }
    },
    {
      id: 'act-help-center',
      title: 'Knowledge Base & Quick-Start Guides',
      subtitle: 'Open step-by-step guides, FAQs, and compliance policies',
      category: 'Actions',
      icon: BookOpen,
      action: () => { onClose(); onOpenHelpDrawer?.(); }
    },
    {
      id: 'act-review-queue',
      title: 'Invoice Approval Queue',
      subtitle: 'Review and approve pending invoices and requisitions',
      category: 'Actions',
      icon: ShieldCheck,
      action: () => { navigate('/invoices?tab=approval-queue'); onClose(); }
    },
    {
      id: 'act-backup',
      title: 'Export Full Database Backup',
      subtitle: 'Download complete ERP JSON archive with all vouchers & master records',
      category: 'Actions',
      icon: Download,
      shortcut: `${modKey}+B`,
      action: handleExportBackup
    },
    {
      id: 'act-shortcuts',
      title: 'View Keyboard Shortcuts',
      subtitle: 'Open the shortcut cheat sheet modal',
      category: 'Actions',
      icon: HelpCircle,
      shortcut: '?',
      action: () => { onClose(); onOpenShortcutsHelp(); }
    },
    {
      id: 'act-toggle-theme',
      title: 'Toggle Dark / Light Theme',
      subtitle: 'Switch between dark and light appearance modes',
      category: 'Actions',
      icon: Moon,
      shortcut: `${modKey}+T`,
      action: handleToggleTheme
    },
    {
      id: 'nav-dash',
      title: 'Go to Dashboard',
      subtitle: 'Overview KPIs, expenditure charts, and quick voice requisitions',
      category: 'Navigation',
      icon: Sparkles,
      shortcut: `${modKey}+D`,
      action: () => { navigate('/'); onClose(); }
    },
    {
      id: 'nav-invoices',
      title: 'Go to Invoices & Recurring Schedules',
      subtitle: 'List vouchers, export PDF/XLSX, and manage subscriptions',
      category: 'Navigation',
      icon: FileText,
      shortcut: `${modKey}+I`,
      action: () => { navigate('/invoices'); onClose(); }
    },
    {
      id: 'nav-master',
      title: 'Go to Master Data Management',
      subtitle: 'Vendors, payment categories, accounts & signatory personnel',
      category: 'Navigation',
      icon: Database,
      shortcut: `${modKey}+M`,
      action: () => { navigate('/master-data'); onClose(); }
    },
    {
      id: 'nav-audit',
      title: 'Go to Audit Trail',
      subtitle: 'Review immutable user activity and security compliance logs',
      category: 'Navigation',
      icon: Activity,
      shortcut: `${modKey}+A`,
      action: () => { navigate('/audit-trail'); onClose(); }
    },
    {
      id: 'nav-settings',
      title: 'Go to Settings',
      subtitle: 'Configure prefix, padding, theme, and backup reminder intervals',
      category: 'Navigation',
      icon: Settings,
      shortcut: `${modKey}+S`,
      action: () => { navigate('/settings'); onClose(); }
    }
  ];

  // Invoices filtered by query
  const invoiceItems: CommandItem[] = invoices
    .filter(inv => {
      if (!query.trim()) return false;
      const q = query.toLowerCase();
      return (
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.purpose.toLowerCase().includes(q) ||
        inv.amount.toString().includes(q) ||
        inv.status.toLowerCase().includes(q)
      );
    })
    .slice(0, 6)
    .map(inv => ({
      id: `inv-${inv.id}`,
      title: `${inv.invoiceNumber} — ${formatCurrency(inv.amount)}`,
      subtitle: `${inv.purpose} (${inv.status})`,
      category: 'Invoices',
      icon: FileText,
      action: () => { navigate(`/voucher/${inv.id}`); onClose(); }
    }));

  // Filtered actions based on query
  const filteredActions = baseActions.filter(item => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return item.title.toLowerCase().includes(q) || (item.subtitle && item.subtitle.toLowerCase().includes(q));
  });

  const allItems = [...invoiceItems, ...filteredActions];

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Handle keyboard events inside palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1 < allItems.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 >= 0 ? prev - 1 : allItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        allItems[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-bg-panel rounded-2xl shadow-2xl w-full max-w-xl border border-border-subtle overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[70vh]"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-border-subtle bg-bg-base/40 gap-3">
          <Search className="w-5 h-5 text-accent-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a command, page, or search invoices..."
            className="w-full bg-transparent text-text-base placeholder:text-text-muted text-sm outline-none font-medium"
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="p-1 text-text-muted hover:text-text-base rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium text-text-muted bg-bg-panel border border-border-subtle rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="overflow-y-auto p-2 space-y-4 divide-y divide-border-subtle/50">
          {allItems.length === 0 ? (
            <div className="p-8 text-center text-text-muted text-sm">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No results found for "{query}"</p>
              <p className="text-xs mt-1 text-text-muted">Try searching for "invoice", "backup", "vendor", or "theme"</p>
            </div>
          ) : (
            <>
              {/* If we have invoices */}
              {invoiceItems.length > 0 && (
                <div className="space-y-1 pt-1 first:pt-0">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-text-muted">
                    Matching Invoices ({invoiceItems.length})
                  </div>
                  {invoiceItems.map((item, idx) => {
                    const isSelected = selectedIndex === idx;
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        data-index={idx}
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors text-sm ${
                          isSelected 
                            ? 'bg-accent-600 text-white' 
                            : 'hover:bg-bg-base text-text-base'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-white/20 text-white' : 'bg-accent-100 dark:bg-accent-950/60 text-accent-600'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className={`font-semibold truncate text-xs sm:text-sm ${isSelected ? 'text-white' : 'text-text-base'}`}>
                              {item.title}
                            </p>
                            <p className={`text-xs truncate ${isSelected ? 'text-white/80' : 'text-text-muted'}`}>
                              {item.subtitle}
                            </p>
                          </div>
                        </div>
                        <CornerDownLeft className={`w-4 h-4 shrink-0 opacity-60 ${isSelected ? 'text-white' : 'text-text-muted'}`} />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Actions & Navigation */}
              {filteredActions.length > 0 && (
                <div className="space-y-1 pt-2 first:pt-0">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-text-muted">
                    Commands & Navigation
                  </div>
                  {filteredActions.map((item, offsetIdx) => {
                    const globalIdx = invoiceItems.length + offsetIdx;
                    const isSelected = selectedIndex === globalIdx;
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        data-index={globalIdx}
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors text-sm ${
                          isSelected 
                            ? 'bg-accent-600 text-white' 
                            : 'hover:bg-bg-base text-text-base'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-1.5 rounded-lg ${
                            isSelected 
                              ? 'bg-white/20 text-white' 
                              : item.category === 'Actions'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600'
                              : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className={`font-semibold text-xs sm:text-sm ${isSelected ? 'text-white' : 'text-text-base'}`}>
                              {item.title}
                            </p>
                            {item.subtitle && (
                              <p className={`text-xs truncate ${isSelected ? 'text-white/80' : 'text-text-muted'}`}>
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {item.shortcut && (
                            <kbd className={`px-2 py-0.5 text-[10px] font-mono font-medium rounded ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-bg-base text-text-muted border border-border-subtle'
                            }`}>
                              {item.shortcut}
                            </kbd>
                          )}
                          <CornerDownLeft className={`w-3.5 h-3.5 opacity-60 ${isSelected ? 'text-white' : 'text-text-muted'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 border-t border-border-subtle bg-bg-base/40 flex items-center justify-between text-[11px] text-text-muted">
          <div className="flex items-center gap-3">
            <span><kbd className="font-mono bg-bg-panel px-1 py-0.5 border rounded">↑</kbd> <kbd className="font-mono bg-bg-panel px-1 py-0.5 border rounded">↓</kbd> Navigate</span>
            <span><kbd className="font-mono bg-bg-panel px-1 py-0.5 border rounded">↵</kbd> Select</span>
          </div>
          <button 
            onClick={() => { onClose(); onOpenShortcutsHelp(); }}
            className="text-accent-600 hover:underline flex items-center gap-1 font-semibold"
          >
            <span>All Shortcuts (?)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
