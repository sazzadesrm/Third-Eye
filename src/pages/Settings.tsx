import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/db';
import { AppSettings, BackupReminderFrequency } from '../types';
import { Save, Eye, ShieldCheck, Download, Upload, Clock, CheckCircle2, AlertTriangle, Database } from 'lucide-react';
import { useSettingsStore, useAuthStore } from '../lib/store';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [livePreview, setLivePreview] = useState(true);
  const [backupStatusMsg, setBackupStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const restoreFileInputRef = useRef<HTMLInputElement>(null);
  
  const updateSettings = useSettingsStore(state => state.updateSettings);
  const globalSettings = useSettingsStore(state => state.settings);
  const { user } = useAuthStore();

  useEffect(() => {
    db.settings.get().then(setSettings);
  }, []);

  useEffect(() => {
    if (livePreview && settings) {
      document.documentElement.setAttribute('data-theme', settings.theme);
      document.documentElement.setAttribute('data-accent', settings.accentColor);
    } else if (globalSettings) {
      document.documentElement.setAttribute('data-theme', globalSettings.theme);
      document.documentElement.setAttribute('data-accent', globalSettings.accentColor);
    }
    
    // Cleanup on unmount if they didn't save
    return () => {
      if (globalSettings) {
        document.documentElement.setAttribute('data-theme', globalSettings.theme);
        document.documentElement.setAttribute('data-accent', globalSettings.accentColor);
      }
    };
  }, [settings, livePreview, globalSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    await db.settings.save(settings);
    updateSettings(settings);
    setSaving(false);
    setBackupStatusMsg({ text: 'Application settings successfully updated.', type: 'success' });
    setTimeout(() => setBackupStatusMsg(null), 4000);
  };

  const handleDownloadBackup = async () => {
    try {
      const backupData = await db.backup.exportFullBackup();
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.href = url;
      link.download = `thirdeye_system_backup_${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const refreshed = await db.settings.get();
      setSettings(refreshed);
      updateSettings(refreshed);
      setBackupStatusMsg({ text: 'Full system backup archive downloaded and timestamp logged.', type: 'success' });
    } catch (err: any) {
      console.error(err);
      setBackupStatusMsg({ text: `Backup export failed: ${err.message}`, type: 'error' });
    }
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (!parsed.data || !parsed.app) {
          throw new Error('Unrecognized or corrupted backup file format.');
        }

        if (window.confirm(`Are you sure you want to restore system data from backup (${parsed.exportedAt})? This will replace current database tables.`)) {
          await db.backup.restoreFullBackup(parsed, user?.id || 'sys');
          const refreshed = await db.settings.get();
          setSettings(refreshed);
          updateSettings(refreshed);
          setBackupStatusMsg({ text: `Database restored successfully from archive (${parsed.exportedAt}).`, type: 'success' });
        }
      } catch (err: any) {
        console.error(err);
        setBackupStatusMsg({ text: `Failed to restore backup: ${err.message}`, type: 'error' });
      }
    };
    reader.readAsText(file);
    if (restoreFileInputRef.current) restoreFileInputRef.current.value = '';
  };

  if (!settings) return <div className="p-8">Loading settings...</div>;

  const getDaysSinceLastBackup = () => {
    if (!settings.lastBackupDate) return null;
    const diff = Date.now() - new Date(settings.lastBackupDate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const daysSinceBackup = getDaysSinceLastBackup();
  const isBackupOverdue = () => {
    if (!settings.backupReminderFrequency || settings.backupReminderFrequency === 'off') return false;
    if (daysSinceBackup === null) return true;
    if (settings.backupReminderFrequency === 'daily') return daysSinceBackup >= 1;
    if (settings.backupReminderFrequency === 'weekly') return daysSinceBackup >= 7;
    if (settings.backupReminderFrequency === 'biweekly') return daysSinceBackup >= 14;
    if (settings.backupReminderFrequency === 'monthly') return daysSinceBackup >= 30;
    return false;
  };

  return (
    <div className="max-w-4xl space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-base">Application Settings</h1>
          <p className="text-text-muted text-xs sm:text-sm">Configure appearance, numbering conventions, and periodic backup schedules.</p>
        </div>
        <div className="flex items-center justify-between sm:justify-start gap-2 bg-bg-panel px-4 py-2 border border-border-subtle rounded-lg shadow-sm">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-text-muted" />
            <span className="text-sm font-medium text-text-base mr-2">Live Theme Preview</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input type="checkbox" checked={livePreview} onChange={e => setLivePreview(e.target.checked)} className="sr-only peer" />
            <div className="w-9 h-5 bg-border-subtle peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-600"></div>
          </label>
        </div>
      </div>

      {backupStatusMsg && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 text-sm animate-in fade-in duration-200 ${
          backupStatusMsg.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {backupStatusMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 shrink-0 text-red-600" />}
          <span>{backupStatusMsg.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Appearance Card */}
        <div className="bg-bg-panel rounded-xl shadow-sm border border-border-subtle overflow-hidden">
          <div className="p-6 md:p-8 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-text-base mb-1">Visual Theme & Accent</h3>
              <p className="text-xs text-text-muted">Customize the interface color scheme and branding tone.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div>
                <label className="block text-sm font-medium text-text-base mb-1.5">Theme Mode</label>
                <select 
                  value={settings.theme} 
                  onChange={e => setSettings({...settings, theme: e.target.value as any})} 
                  className="w-full p-2.5 bg-bg-base border border-border-subtle rounded-lg text-text-base focus:bg-bg-panel focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none transition-all"
                >
                  <option value="light">Clean Light Mode</option>
                  <option value="dark">Executive Dark Mode</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-base mb-1.5">Brand Accent Color</label>
                <select 
                  value={settings.accentColor} 
                  onChange={e => setSettings({...settings, accentColor: e.target.value})} 
                  className="w-full p-2.5 bg-bg-base border border-border-subtle rounded-lg text-text-base focus:bg-bg-panel focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none transition-all"
                >
                  <option value="blue">Corporate Blue</option>
                  <option value="emerald">Emerald Green</option>
                  <option value="indigo">Deep Indigo</option>
                  <option value="violet">Royal Violet</option>
                  <option value="rose">Burgundy Rose</option>
                  <option value="amber">Warm Amber</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Configuration Card */}
        <div className="bg-bg-panel rounded-xl shadow-sm border border-border-subtle overflow-hidden">
          <div className="p-6 md:p-8 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-text-base mb-1">Invoice Numbering & Formatting</h3>
              <p className="text-xs text-text-muted">Configure default prefix and sequence padding for generated vouchers.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div>
                <label className="block text-sm font-medium text-text-base mb-1.5">Invoice Prefix Code</label>
                <input 
                  type="text" 
                  value={settings.invoicePrefix} 
                  onChange={e => setSettings({...settings, invoicePrefix: e.target.value})} 
                  className="w-full p-2.5 bg-bg-base border border-border-subtle rounded-lg text-text-base focus:bg-bg-panel focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none transition-all font-mono" 
                />
                <p className="text-xs text-text-muted mt-1">Example: INV-WAL-MIS generates INV-WAL-MIS-20260823-000001</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-base mb-1.5">Sequence Padding Digits</label>
                <input 
                  type="number" 
                  min="3" 
                  max="8" 
                  value={settings.invoicePadding} 
                  onChange={e => setSettings({...settings, invoicePadding: parseInt(e.target.value) || 5})} 
                  className="w-full p-2.5 bg-bg-base border border-border-subtle rounded-lg text-text-base focus:bg-bg-panel focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none transition-all font-mono" 
                />
                <p className="text-xs text-text-muted mt-1">Number of zeros for sequential vouchers (e.g. 5 = 00001)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Periodic Backup Reminders & Data Security Card */}
        <div className="bg-bg-panel rounded-xl shadow-sm border border-border-subtle overflow-hidden">
          <div className="p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-lg font-bold text-text-base">Periodic Data Backup & Security</h3>
                </div>
                <p className="text-xs text-text-muted mt-1">Schedule automatic notifications to export full system databases and financial ledgers.</p>
              </div>

              {isBackupOverdue() && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Backup Overdue ({daysSinceBackup !== null ? `${daysSinceBackup} days ago` : 'Never'})</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-text-base mb-1.5">Backup Reminder Schedule</label>
                <select 
                  value={settings.backupReminderFrequency || 'weekly'} 
                  onChange={e => setSettings({...settings, backupReminderFrequency: e.target.value as BackupReminderFrequency})} 
                  className="w-full p-2.5 bg-bg-base border border-border-subtle rounded-lg text-text-base focus:bg-bg-panel focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none transition-all"
                >
                  <option value="daily">Daily Prompt (High Activity)</option>
                  <option value="weekly">Weekly Reminder (Recommended)</option>
                  <option value="biweekly">Bi-weekly (Every 14 days)</option>
                  <option value="monthly">Monthly Audit Cycle (Every 30 days)</option>
                  <option value="off">Disabled / Off</option>
                </select>
                <p className="text-xs text-text-muted mt-1.5">
                  The system will display a high-priority prompt when the scheduled interval elapses.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-bg-base border border-border-subtle flex flex-col justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Backup Status</span>
                  <div className="flex items-center gap-2 text-sm font-medium text-text-base">
                    <Clock className="w-4 h-4 text-text-muted" />
                    <span>Last Full Export: {settings.lastBackupDate ? new Date(settings.lastBackupDate).toLocaleString() : 'No recorded backup yet'}</span>
                  </div>
                </div>
                <div className="pt-3">
                  <span className="text-xs text-text-muted">
                    {daysSinceBackup === 0 
                      ? '✓ Database is backed up today.' 
                      : daysSinceBackup !== null 
                      ? `Last exported ${daysSinceBackup} day(s) ago.` 
                      : 'Initial export recommended.'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Export & Restore Buttons */}
            <div className="pt-4 border-t border-border-subtle flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" /> Download Complete System Export (.JSON)
              </button>

              <input
                type="file"
                ref={restoreFileInputRef}
                accept=".json"
                onChange={handleRestoreBackup}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => restoreFileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-bg-base hover:bg-bg-panel text-text-base border border-border-subtle rounded-lg font-medium text-sm transition-colors shadow-2xs"
              >
                <Upload className="w-4 h-4 text-accent-600" /> Restore From Backup
              </button>
            </div>
          </div>
        </div>
        
        {/* Save Settings Footer */}
        <div className="p-4 bg-bg-panel rounded-xl border border-border-subtle shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Database className="w-4 h-4 text-accent-600" />
            <span>Changes will apply immediately across all modules.</span>
          </div>
          <button 
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors shadow-sm disabled:opacity-70"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

