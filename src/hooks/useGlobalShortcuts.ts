import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/db';

interface ShortcutHandlers {
  onOpenCommandPalette: () => void;
  onOpenShortcutsHelp: () => void;
  onOpenHelpDrawer?: () => void;
}

export const useGlobalShortcuts = ({
  onOpenCommandPalette,
  onOpenShortcutsHelp,
  onOpenHelpDrawer,
}: ShortcutHandlers) => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const isInput = 
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      // 1. Ctrl/Cmd + K -> Open Command Palette (Works even in inputs)
      if (modifier && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        onOpenCommandPalette();
        return;
      }

      // 2. Ctrl/Cmd + N -> New Invoice
      if (modifier && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        navigate('/invoices/new');
        return;
      }

      // 3. Ctrl/Cmd + B -> Export Database Backup
      if (modifier && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
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
          alert('System database backup exported successfully!');
        } catch (err: any) {
          alert(`Backup failed: ${err.message}`);
        }
        return;
      }

      // 4. Ctrl/Cmd + T -> Toggle Theme
      if (modifier && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        const settings = await db.settings.get();
        const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
        await db.settings.save({ ...settings, theme: nextTheme });
        document.documentElement.classList.toggle('dark', nextTheme === 'dark');
        return;
      }

      // 5. Ctrl/Cmd + D -> Dashboard
      if (modifier && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        navigate('/');
        return;
      }

      // 6. Ctrl/Cmd + I -> Invoices
      if (modifier && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        navigate('/invoices');
        return;
      }

      // 7. Ctrl/Cmd + M -> Master Data
      if (modifier && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        navigate('/master-data');
        return;
      }

      // 8. Alt + S or Ctrl+Alt+S -> Settings
      if ((e.altKey && (e.key === 's' || e.key === 'S')) || (modifier && e.shiftKey && (e.key === 's' || e.key === 'S'))) {
        e.preventDefault();
        navigate('/settings');
        return;
      }

      // 9. Alt + A -> Audit Trail
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        navigate('/audit-trail');
        return;
      }

      // 10. Help modal with '?' or Ctrl+/ (when not typing in an input)
      if ((!isInput && (e.key === '?' || (e.shiftKey && e.key === '/'))) || (modifier && e.key === '/')) {
        e.preventDefault();
        onOpenShortcutsHelp();
        return;
      }

      // 11. F1 or Shift+H -> Knowledge Base / Help Drawer
      if (e.key === 'F1' || (!isInput && (e.key === 'h' || e.key === 'H') && !modifier)) {
        e.preventDefault();
        onOpenHelpDrawer?.();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, onOpenCommandPalette, onOpenShortcutsHelp, onOpenHelpDrawer]);
};
