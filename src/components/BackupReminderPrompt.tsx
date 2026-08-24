import React, { useState, useEffect } from 'react';
import { ShieldAlert, Download, X, Clock, Settings as SettingsIcon, CheckCircle2 } from 'lucide-react';
import { db } from '../lib/db';
import { AppSettings } from '../types';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore, useAuthStore } from '../lib/store';

export const BackupReminderPrompt: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { settings, updateSettings } = useSettingsStore();
  const [isVisible, setIsVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  useEffect(() => {
    const checkBackupStatus = async () => {
      const currentSettings = settings || await db.settings.get();
      if (!currentSettings || !currentSettings.backupReminderFrequency || currentSettings.backupReminderFrequency === 'off') {
        setIsVisible(false);
        return;
      }

      // Check if dismissed in this session or today
      const snoozeUntil = localStorage.getItem('te_backup_snooze_until');
      if (snoozeUntil && new Date(snoozeUntil).getTime() > Date.now()) {
        setIsVisible(false);
        return;
      }

      const lastBackup = currentSettings.lastBackupDate;
      if (!lastBackup) {
        // Never backed up
        setIsVisible(true);
        return;
      }

      const diffDays = Math.floor((Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24));
      let isDue = false;

      switch (currentSettings.backupReminderFrequency) {
        case 'daily':
          isDue = diffDays >= 1;
          break;
        case 'weekly':
          isDue = diffDays >= 7;
          break;
        case 'monthly':
          isDue = diffDays >= 30;
          break;
        default:
          isDue = diffDays >= 7;
      }

      setIsVisible(isDue);
    };

    checkBackupStatus();
  }, [settings]);

  const handleBackupNow = async () => {
    setIsProcessing(true);
    try {
      const backupData = await db.backup.exportFullBackup();
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.href = url;
      link.download = `thirdeye_scheduled_backup_${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const refreshed = await db.settings.get();
      updateSettings(refreshed);

      await db.auditLogs.add(
        user?.id || 'sys',
        'Scheduled Backup Export',
        'Security & Backup',
        'scheduled_backup',
        `Completed scheduled system backup export (${refreshed.backupReminderFrequency} schedule).`
      );

      setSuccessMsg(true);
      setTimeout(() => {
        setIsVisible(false);
        setSuccessMsg(false);
      }, 3000);
    } catch (err) {
      console.error('Backup error', err);
      alert('Failed to generate automated backup. Please check your storage settings.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSnooze = () => {
    // Snooze reminder for 24 hours
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    localStorage.setItem('te_backup_snooze_until', tomorrow);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    // Dismiss for this session
    sessionStorage.setItem('te_backup_dismissed_session', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 max-w-md w-full px-4 sm:px-0 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-bg-panel border-2 border-accent-500/80 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-md">
        {successMsg ? (
          <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-300 py-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-text-base">Backup Downloaded Successfully!</h4>
              <p className="text-xs text-text-muted mt-0.5">Your system database and financial records are backed up.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-text-base flex items-center gap-1.5">
                    Scheduled Backup Reminder
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-accent-100 dark:bg-accent-950 text-accent-700 dark:text-accent-300 font-bold">
                      {settings?.backupReminderFrequency || 'Weekly'}
                    </span>
                  </h4>
                  <p className="text-xs text-text-muted mt-0.5">
                    Protect your expense vouchers and ledger data by saving an encrypted offline copy.
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-text-muted hover:text-text-base p-1 rounded-lg hover:bg-bg-base transition-colors"
                title="Dismiss reminder"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {settings?.lastBackupDate 
                    ? `Last: ${new Date(settings.lastBackupDate).toLocaleDateString()}` 
                    : 'No backup recorded yet'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSnooze}
                  className="px-2.5 py-1.5 text-xs text-text-muted hover:text-text-base font-medium rounded-lg hover:bg-bg-base transition-colors"
                >
                  Remind Tomorrow
                </button>
                <button
                  onClick={handleBackupNow}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-accent-600 hover:bg-accent-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isProcessing ? 'Backing Up...' : 'Backup Now'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
