import React from 'react';
import { X, Keyboard, Command, Sparkles, Navigation, FileCheck, Layers } from 'lucide-react';

interface ShortcutsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsHelpModal: React.FC<ShortcutsHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? '⌘' : 'Ctrl';

  const shortcutGroups = [
    {
      title: 'Global & Navigation',
      icon: Navigation,
      shortcuts: [
        { keys: [modKey, 'K'], description: 'Open Global Command Palette & Omni Search' },
        { keys: [modKey, 'N'], description: 'Create New Invoice Voucher' },
        { keys: [modKey, 'D'], description: 'Go to Dashboard' },
        { keys: [modKey, 'I'], description: 'Go to Invoices & Recurring Schedules' },
        { keys: [modKey, 'M'], description: 'Go to Master Data Management' },
        { keys: [modKey, 'A'], description: 'Go to Audit Trail Logs' },
        { keys: [modKey, 'S'], description: 'Go to System Settings' },
      ]
    },
    {
      title: 'Power Actions & Workflow',
      icon: FileCheck,
      shortcuts: [
        { keys: [modKey, 'B'], description: 'Trigger One-Click System Database Backup' },
        { keys: [modKey, 'T'], description: 'Toggle Light / Dark Theme' },
        { keys: ['?'], description: 'Open this Keyboard Shortcuts Cheat Sheet' },
        { keys: ['Esc'], description: 'Close active modal, drawer, or command palette' },
      ]
    },
    {
      title: 'Command Palette Navigation',
      icon: Command,
      shortcuts: [
        { keys: ['↑', '↓'], description: 'Navigate through search results or action list' },
        { keys: ['Enter'], description: 'Execute selected action or jump to invoice' },
        { keys: ['Tab'], description: 'Cycle through filter categories' },
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
      <div 
        className="bg-bg-panel rounded-2xl shadow-2xl w-full max-w-2xl border border-border-subtle overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-subtle bg-bg-base/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-accent-100 dark:bg-accent-950/60 text-accent-600 rounded-xl border border-accent-200 dark:border-accent-800">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-base">Keyboard Shortcuts & Efficiency Hub</h2>
              <p className="text-xs text-text-muted">Master ERP navigation with speed and keyboard agility.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-base hover:bg-bg-panel rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {shortcutGroups.map((group, gIdx) => {
            const Icon = group.icon;
            return (
              <div key={gIdx} className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
                  <Icon className="w-3.5 h-3.5 text-accent-600" />
                  <span>{group.title}</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {group.shortcuts.map((item, sIdx) => (
                    <div 
                      key={sIdx}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-bg-base/60 hover:bg-bg-base border border-border-subtle transition-colors text-sm"
                    >
                      <span className="text-text-base font-medium text-xs sm:text-sm">{item.description}</span>
                      <div className="flex items-center gap-1.5 shrink-0 ml-3">
                        {item.keys.map((k, kIdx) => (
                          <kbd 
                            key={kIdx}
                            className="px-2 py-1 text-xs font-mono font-semibold text-text-base bg-bg-panel border border-border-subtle rounded shadow-2xs min-w-[24px] text-center"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-subtle bg-bg-base/40 flex items-center justify-between text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent-600" />
            <span>Tip: Press <kbd className="px-1.5 py-0.5 font-mono text-[11px] bg-bg-panel border rounded">{modKey}+K</kbd> anytime to open the Command Palette.</span>
          </div>
          <button 
            onClick={onClose}
            className="px-4 py-1.5 bg-accent-600 hover:bg-accent-700 text-white font-medium rounded-lg text-xs transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
