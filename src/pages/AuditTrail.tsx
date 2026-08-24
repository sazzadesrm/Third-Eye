import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/db';
import { AuditLog, User, Person } from '../types';
import { 
  ShieldAlert, Search, Filter, Calendar, User as UserIcon, Download, 
  RefreshCw, CheckCircle2, AlertTriangle, Trash2, Plus, Edit2, ShieldCheck, 
  FileSpreadsheet, FileText, ArrowUpDown, Clock, Layers, Sparkles, ExternalLink,
  ChevronRight, Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const AuditTrail: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [search, setSearch] = useState('');
  const [selectedActor, setSelectedActor] = useState('All');
  const [selectedModule, setSelectedModule] = useState('All');
  const [selectedActionType, setSelectedActionType] = useState('All');
  
  // Date filtering
  const [datePreset, setDatePreset] = useState<'all' | 'today' | '7days' | '30days' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [allLogs, allUsers, allPeople] = await Promise.all([
      db.auditLogs.getAll(),
      db.users.getAll(),
      db.people.getAll()
    ]);
    
    // Default seed sample audit logs if empty so the user can immediately experience the rich audit trail
    if (allLogs.length === 0) {
      const now = new Date();
      const seedLogs: AuditLog[] = [
        {
          id: 'log-seed-1',
hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
          actorId: '1',
          action: 'Create & Approve Invoice',
          module: 'Invoice',
          targetId: 'inv-seed-0-0',
          details: 'Created and approved invoice voucher INV-WAL-MIS-20260823-000001 (Amount: 320,000, Purpose: "Factory refrigeration components procurement")',
          timestamp: new Date(now.getTime() - 1000 * 60 * 45).toISOString()
        },
        {
          id: 'log-seed-2',
hash: 'abcd...',
previousHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          actorId: '2',
          action: 'Workflow Status Change: Pending -> Approved',
          module: 'Invoice Approval Workflow',
          targetId: 'inv-seed-0-1',
          details: 'Invoice INV-WAL-MIS-20260823-000002 status set to "Approved". Remarks: "Approved after vendor tax compliance verification"',
          timestamp: new Date(now.getTime() - 1000 * 60 * 180).toISOString()
        },
        {
          id: 'log-seed-3',
hash: 'ef12...',
previousHash: 'abcd...',
          actorId: '1',
          action: 'Bulk Export ZIP',
          module: 'Invoice',
          targetId: 'batch',
          details: 'Exported ZIP package containing 6 vouchers, receipts, and master PDF summary',
          timestamp: new Date(now.getTime() - 1000 * 60 * 360).toISOString()
        },
        {
          id: 'log-seed-4',
          actorId: '3',
          action: 'CSV Bulk Import',
          module: 'Master Data',
          targetId: 'expense_sources',
          details: 'Successfully imported 12 vendor records and categories into Master Data catalog',
          timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString()
        },
        {
          id: 'log-seed-5',
          actorId: '1',
          action: 'System Database Backup',
          module: 'Security & Backup',
          targetId: 'full_db',
          details: 'Exported full encrypted JSON archive of all vouchers and user master credentials',
          timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 48).toISOString()
        }
      ];

      for (const log of seedLogs) {
        await db.auditLogs.add(log.actorId, log.action, log.module, log.targetId, log.details);
      }
      setLogs(seedLogs);
    } else {
      setLogs(allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    }

    setUsers(allUsers);
    setPeople(allPeople);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Helper to resolve Actor information
  const getActorInfo = (actorId: string) => {
    if (actorId === 'sys' || actorId === 'system') {
      return { name: 'System Engine', role: 'Automated Service', isSystem: true, avatar: null };
    }
    const matchedUser = users.find(u => u.id === actorId);
    if (matchedUser) {
      return { 
        name: matchedUser.name, 
        role: matchedUser.role, 
        isSystem: false, 
        avatar: matchedUser.avatar 
      };
    }
    const matchedPerson = people.find(p => p.id === actorId);
    if (matchedPerson) {
      return { 
        name: matchedPerson.name, 
        role: matchedPerson.designation || 'Staff Member', 
        isSystem: false, 
        avatar: null 
      };
    }
    return { name: `User (${actorId})`, role: 'Staff User', isSystem: false, avatar: null };
  };

  // Helper to determine action color styling
  const getActionBadgeStyle = (action: string) => {
    const actLower = action.toLowerCase();
    if (actLower.includes('delete') || actLower.includes('reject')) {
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300';
    }
    if (actLower.includes('approve') || actLower.includes('create') || actLower.includes('import')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300';
    }
    if (actLower.includes('edit') || actLower.includes('update') || actLower.includes('status')) {
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300';
    }
    if (actLower.includes('export') || actLower.includes('backup') || actLower.includes('zip')) {
      return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300';
  };

  // Date range filter helper
  const handleDatePresetChange = (preset: 'all' | 'today' | '7days' | '30days' | 'custom') => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7days') {
      const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(past7.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === '30days') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(past30.toISOString().split('T')[0]);
      setEndDate(todayStr);
    }
  };

  // Filtered logs calculation
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // 1. Search filter
      const actorInfo = getActorInfo(log.actorId);
      const searchMatch = !search || 
        log.details.toLowerCase().includes(search.toLowerCase()) ||
        log.action.toLowerCase().includes(search.toLowerCase()) ||
        log.module.toLowerCase().includes(search.toLowerCase()) ||
        actorInfo.name.toLowerCase().includes(search.toLowerCase()) ||
        log.targetId.toLowerCase().includes(search.toLowerCase());

      if (!searchMatch) return false;

      // 2. Actor filter
      if (selectedActor !== 'All') {
        if (selectedActor === 'sys' && (log.actorId === 'sys' || log.actorId === 'system')) {
          // match
        } else if (log.actorId !== selectedActor) {
          return false;
        }
      }

      // 3. Module filter
      if (selectedModule !== 'All' && log.module !== selectedModule) {
        return false;
      }

      // 4. Action Type filter
      if (selectedActionType !== 'All') {
        const actLower = log.action.toLowerCase();
        if (selectedActionType === 'Create' && !actLower.includes('create') && !actLower.includes('new')) return false;
        if (selectedActionType === 'Edit' && !actLower.includes('edit') && !actLower.includes('update')) return false;
        if (selectedActionType === 'Approve' && !actLower.includes('approve')) return false;
        if (selectedActionType === 'Delete' && !actLower.includes('delete')) return false;
        if (selectedActionType === 'Export' && !actLower.includes('export') && !actLower.includes('backup') && !actLower.includes('zip')) return false;
      }

      // 5. Date filter
      if (startDate) {
        const logDateStr = log.timestamp.split('T')[0];
        if (logDateStr < startDate) return false;
      }
      if (endDate) {
        const logDateStr = log.timestamp.split('T')[0];
        if (logDateStr > endDate) return false;
      }

      return true;
    });
  }, [logs, search, selectedActor, selectedModule, selectedActionType, startDate, endDate, users, people]);

  // Unique modules in logs
  const availableModules = useMemo(() => {
    const set = new Set(logs.map(l => l.module).filter(Boolean));
    return Array.from(set);
  }, [logs]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalEvents = logs.length;
    const uniqueActors = new Set(logs.map(l => l.actorId)).size;
    const invoiceActions = logs.filter(l => l.module.toLowerCase().includes('invoice')).length;
    const securityActions = logs.filter(l => 
      l.action.toLowerCase().includes('backup') || 
      l.action.toLowerCase().includes('delete') || 
      l.action.toLowerCase().includes('approve')
    ).length;

    return { totalEvents, uniqueActors, invoiceActions, securityActions };
  }, [logs]);

  // Export to Excel
  const handleExportExcel = () => {
    const dataToExport = filteredLogs.map(log => {
      const actor = getActorInfo(log.actorId);
      return {
        'Timestamp': new Date(log.timestamp).toLocaleString(),
        'Actor Name': actor.name,
        'Actor Role': actor.role,
        'Actor ID': log.actorId,
        'Module': log.module,
        'Action': log.action,
        'Target Reference': log.targetId,
        'Details & Statement': log.details
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Audit Trail");
    XLSX.writeFile(workbook, `ThirdEye_Audit_Trail_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export to PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("THIRD EYE ERP - Comprehensive Audit Trail Report", 14, 15);
    doc.setFontSize(9);
    doc.text(`Generated on ${new Date().toLocaleString()} | Filtered Events: ${filteredLogs.length}`, 14, 22);

    autoTable(doc, {
      startY: 26,
      head: [['Timestamp', 'Actor / User', 'Module', 'Action', 'Details']],
      body: filteredLogs.map(log => {
        const actor = getActorInfo(log.actorId);
        return [
          new Date(log.timestamp).toLocaleString('en-GB'),
          `${actor.name}\n(${actor.role})`,
          log.module,
          log.action,
          log.details
        ];
      }),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [15, 23, 42] }
    });

    doc.save(`ThirdEye_Audit_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text-base">System Audit Trail</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-accent-100 text-accent-700 dark:bg-accent-950 dark:text-accent-300 border border-accent-200">
              Immutable Log
            </span>
          </div>
          <p className="text-text-muted text-sm mt-0.5">
            Capture, verify, and inspect user-specific event history for financial compliance & governance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 bg-bg-panel hover:bg-bg-base border border-border-subtle rounded-xl text-xs font-semibold text-text-muted hover:text-text-base transition-colors shadow-2xs"
            title="Refresh Audit Logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
            title="Export filtered records to spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export XLSX</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
            title="Export compliance PDF report"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-bg-panel rounded-xl border border-border-subtle shadow-2xs">
          <span className="text-xs font-medium text-text-muted">Total Audit Logs</span>
          <h3 className="text-xl sm:text-2xl font-bold text-text-base mt-1">{metrics.totalEvents}</h3>
          <p className="text-[11px] text-text-muted mt-0.5">Across all ERP operations</p>
        </div>

        <div className="p-4 bg-bg-panel rounded-xl border border-border-subtle shadow-2xs">
          <span className="text-xs font-medium text-text-muted">Active Users & Actors</span>
          <h3 className="text-xl sm:text-2xl font-bold text-accent-600 mt-1">{metrics.uniqueActors}</h3>
          <p className="text-[11px] text-text-muted mt-0.5">Tracked distinct stakeholders</p>
        </div>

        <div className="p-4 bg-bg-panel rounded-xl border border-border-subtle shadow-2xs">
          <span className="text-xs font-medium text-text-muted">Invoice Operations</span>
          <h3 className="text-xl sm:text-2xl font-bold text-indigo-600 mt-1">{metrics.invoiceActions}</h3>
          <p className="text-[11px] text-text-muted mt-0.5">Create, edit, and approvals</p>
        </div>

        <div className="p-4 bg-bg-panel rounded-xl border border-border-subtle shadow-2xs">
          <span className="text-xs font-medium text-text-muted">Critical Compliance Actions</span>
          <h3 className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">{metrics.securityActions}</h3>
          <p className="text-[11px] text-text-muted mt-0.5">Approvals, exports, backups</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-bg-panel rounded-2xl border border-border-subtle p-4 sm:p-5 shadow-sm space-y-4">
        {/* Row 1: Search & Dropdown Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4">
          {/* Keyword Search */}
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search details, invoice #, action..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-bg-base border border-border-subtle rounded-xl text-xs sm:text-sm text-text-base focus:bg-bg-panel focus:border-accent-500 focus:ring-2 focus:ring-accent-200 outline-none transition-all"
            />
          </div>

          {/* User / Actor Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
              Filter by User / Actor
            </label>
            <select
              value={selectedActor}
              onChange={(e) => setSelectedActor(e.target.value)}
              className="w-full px-3 py-2 bg-bg-base border border-border-subtle rounded-xl text-xs font-semibold text-text-base outline-none focus:ring-2 focus:ring-accent-200"
            >
              <option value="All">All Users & System ({logs.length})</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
              <option value="sys">System Engine (Automated)</option>
            </select>
          </div>

          {/* Module Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
              Filter by Module
            </label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full px-3 py-2 bg-bg-base border border-border-subtle rounded-xl text-xs font-semibold text-text-base outline-none focus:ring-2 focus:ring-accent-200"
            >
              <option value="All">All Modules</option>
              {availableModules.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Action Type Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">
              Action Category
            </label>
            <select
              value={selectedActionType}
              onChange={(e) => setSelectedActionType(e.target.value)}
              className="w-full px-3 py-2 bg-bg-base border border-border-subtle rounded-xl text-xs font-semibold text-text-base outline-none focus:ring-2 focus:ring-accent-200"
            >
              <option value="All">All Action Types</option>
              <option value="Create">Creation & Drafts</option>
              <option value="Approve">Approvals & Workflow</option>
              <option value="Edit">Modifications & Edits</option>
              <option value="Delete">Deletions</option>
              <option value="Export">Exports & Backups</option>
            </select>
          </div>
        </div>

        {/* Row 2: Date Filters & Presets */}
        <div className="pt-3 border-t border-border-subtle flex flex-wrap items-center justify-between gap-3">
          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-text-muted mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Date Range:
            </span>
            <button
              onClick={() => handleDatePresetChange('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                datePreset === 'all' 
                  ? 'bg-accent-600 text-white border-accent-600 shadow-2xs' 
                  : 'bg-bg-base text-text-muted border-border-subtle hover:text-text-base'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => handleDatePresetChange('today')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                datePreset === 'today' 
                  ? 'bg-accent-600 text-white border-accent-600 shadow-2xs' 
                  : 'bg-bg-base text-text-muted border-border-subtle hover:text-text-base'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => handleDatePresetChange('7days')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                datePreset === '7days' 
                  ? 'bg-accent-600 text-white border-accent-600 shadow-2xs' 
                  : 'bg-bg-base text-text-muted border-border-subtle hover:text-text-base'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => handleDatePresetChange('30days')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                datePreset === '30days' 
                  ? 'bg-accent-600 text-white border-accent-600 shadow-2xs' 
                  : 'bg-bg-base text-text-muted border-border-subtle hover:text-text-base'
              }`}
            >
              Last 30 Days
            </button>
          </div>

          {/* Custom Date Pickers */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setDatePreset('custom'); }}
              className="px-2.5 py-1 bg-bg-base border border-border-subtle rounded-lg text-xs font-medium text-text-base outline-none focus:ring-2 focus:ring-accent-200"
              placeholder="From Date"
            />
            <span className="text-xs text-text-muted">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setDatePreset('custom'); }}
              className="px-2.5 py-1 bg-bg-base border border-border-subtle rounded-lg text-xs font-medium text-text-base outline-none focus:ring-2 focus:ring-accent-200"
              placeholder="To Date"
            />
            {(startDate || endDate || selectedActor !== 'All' || selectedModule !== 'All' || selectedActionType !== 'All' || search) && (
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedActor('All');
                  setSelectedModule('All');
                  setSelectedActionType('All');
                  handleDatePresetChange('all');
                }}
                className="text-xs text-accent-600 hover:underline font-semibold ml-2"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-bg-panel rounded-2xl shadow-sm border border-border-subtle overflow-hidden">
        <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Audit Event Records
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-bg-base border border-border-subtle text-text-base">
              {filteredLogs.length} events
            </span>
          </div>

          <div className="text-xs text-text-muted font-medium">
            Showing chronological system events
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg-base border-b border-border-subtle">
                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">User / Actor</th>
                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Action & Category</th>
                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Module</th>
                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Event Details</th>
                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-text-muted text-sm">Loading audit events...</td></tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-text-muted text-sm">
                    <div className="space-y-1">
                      <ShieldAlert className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" />
                      <p className="font-semibold text-text-base">No audit events match your selected filters.</p>
                      <p className="text-xs text-text-muted">Try adjusting the user selection, date range, or keyword search.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const actor = getActorInfo(log.actorId);

                  return (
                    <tr 
                      key={log.id} 
                      className="hover:bg-bg-base transition-colors cursor-pointer group"
                      onClick={() => setSelectedLog(log)}
                    >
                      {/* Timestamp */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-text-base">
                            {new Date(log.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-[11px] font-mono text-text-muted">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      </td>

                      {/* Actor Information */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold overflow-hidden border border-slate-700 shrink-0">
                            {actor.avatar ? (
                              <img src={actor.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              actor.name.charAt(0)
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-text-base truncate">{actor.name}</p>
                            <p className="text-[10px] text-text-muted truncate font-medium">{actor.role}</p>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border ${getActionBadgeStyle(log.action)}`}>
                          {log.action}
                        </span>
                      </td>

                      {/* Module */}
                      <td className="px-6 py-4 text-xs font-semibold text-text-muted whitespace-nowrap">
                        {log.module}
                      </td>

                      {/* Details Statement */}
                      <td className="px-6 py-4 max-w-md">
                        <p className="text-xs text-text-base line-clamp-2 leading-relaxed">
                          {log.details}
                        </p>
                        {log.targetId && log.targetId !== 'batch' && log.targetId !== 'full_db' && (
                          <span className="inline-block text-[10px] font-mono text-accent-700 dark:text-accent-300 mt-1 bg-accent-50 dark:bg-accent-950/60 px-1.5 py-0.5 rounded border border-accent-200/50">
                            Ref: {log.targetId}
                          </span>
                        )}
                      </td>

                      {/* Inspect Trigger */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}
                          className="p-1.5 text-text-muted hover:text-accent-600 rounded-lg hover:bg-bg-panel transition-colors group-hover:text-accent-600"
                          title="View Full Audit Event Details"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Audit Event Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-bg-panel border border-border-subtle rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-bg-base border-b border-border-subtle flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-accent-600/10 text-accent-600 rounded-xl">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-base">Audit Log Record</h3>
                  <p className="text-xs text-text-muted font-mono">{selectedLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-text-muted hover:text-text-base p-1.5 rounded-lg hover:bg-bg-panel transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 p-4 bg-bg-base rounded-xl border border-border-subtle">
                <div>
                  <span className="text-text-muted font-semibold block mb-0.5">Date & Exact Time</span>
                  <span className="font-mono text-text-base font-bold">
                    {new Date(selectedLog.timestamp).toLocaleString('en-GB', {
                      day: '2-digit', month: 'long', year: 'numeric',
                      hour: '2-digit', minute: '2-digit', second: '2-digit'
                    })}
                  </span>
                </div>

                <div>
                  <span className="text-text-muted font-semibold block mb-0.5">System Module</span>
                  <span className="text-text-base font-bold">{selectedLog.module}</span>
                </div>

                <div>
                  <span className="text-text-muted font-semibold block mb-0.5">Actor / User</span>
                  <span className="text-text-base font-bold">
                    {getActorInfo(selectedLog.actorId).name} ({getActorInfo(selectedLog.actorId).role})
                  </span>
                </div>

                <div>
                  <span className="text-text-muted font-semibold block mb-0.5">Actor ID</span>
                  <span className="font-mono text-text-base">{selectedLog.actorId}</span>
                </div>
              </div>

              <div>
                <span className="text-text-muted font-semibold block mb-1">Action Executed</span>
                <span className={`inline-block px-3 py-1.5 rounded-lg border font-bold text-xs ${getActionBadgeStyle(selectedLog.action)}`}>
                  {selectedLog.action}
                </span>
              </div>

              <div>
                <span className="text-text-muted font-semibold block mb-1">Complete Audit Statement</span>
                <div className="p-3.5 bg-bg-base border border-border-subtle rounded-xl text-text-base leading-relaxed">
                  {selectedLog.details}
                </div>
              </div>

              {selectedLog.targetId && (
                <div>
                  <span className="text-text-muted font-semibold block mb-1">Target Object Identifier</span>
                  <span className="font-mono bg-bg-base px-2.5 py-1 rounded border border-border-subtle text-text-base block">
                    {selectedLog.targetId}
                  </span>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 bg-bg-base border-t border-border-subtle flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
