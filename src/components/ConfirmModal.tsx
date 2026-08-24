import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel", isDestructive = false }: any) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-bg-base border border-border-subtle shadow-2xl rounded-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-5 py-4 border-b border-border-subtle bg-bg-panel">
          <div className="flex items-center gap-3 text-text-base font-bold text-lg">
            <AlertTriangle className={`w-5 h-5 ${isDestructive ? 'text-rose-500' : 'text-amber-500'}`} />
            {title}
          </div>
          <button onClick={onCancel} className="text-text-muted hover:text-text-base transition-colors rounded-lg p-1 hover:bg-border-subtle">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 text-sm text-text-muted leading-relaxed">
          {message}
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border-subtle bg-bg-panel">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-text-muted hover:text-text-base transition-colors">
            {cancelText}
          </button>
          <button onClick={onConfirm} className={`px-5 py-2 text-sm font-bold text-white rounded-xl shadow-sm transition-all ${isDestructive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-accent-600 hover:bg-accent-700'}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
