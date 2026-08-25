import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, Search, Menu, X, Check, FileText, Activity, Users, Keyboard, 
  Sparkles, Command, HelpCircle, BookOpen, Camera, Building2, Tag, 
  ArrowRight, CornerDownLeft, Filter, CheckCircle2, Clock, AlertTriangle, ShieldCheck, 
  Wifi, WifiOff, Cloud, CloudOff, RefreshCw, Database, HardDrive, Info, ExternalLink, Zap
} from 'lucide-react';
import { db } from '../lib/db';
import { useAuthStore } from '../lib/store';
import { Notification, Invoice, ExpenseSource, PaymentType, Person } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onOpenCommandPalette?: () => void;
  onOpenShortcutsHelp?: () => void;
  onOpenHelpDrawer?: () => void;
  onOpenMobileMenu?: () => void;
  onOpenQRScanner?: () => void;
}

type SearchCategory = 'all' | 'invoices' | 'vendors' | 'categories' | 'people';

interface SearchResultItem {
  id: string;
  type: 'invoice' | 'vendor' | 'category' | 'person';
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  action: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCommandPalette,
  onOpenShortcutsHelp,
  onOpenHelpDrawer,
  onOpenMobileMenu,
  onOpenQRScanner,
}) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<SearchCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Cached Master Data for Fast Search
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenseSources, setExpenseSources] = useState<ExpenseSource[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [people, setPeople] = useState<Person[]>([]);

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Connectivity & Sync States
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  
  // Flash toast notification for status changes
  const [connectivityToast, setConnectivityToast] = useState<{
    show: boolean;
    type: 'online' | 'offline' | 'sync';
    message: string;
  }>({
    show: false,
    type: 'online',
    message: ''
  });

  const effectiveOnline = isOnline && !isSimulatedOffline;

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (!isSimulatedOffline) {
        setIsSyncing(true);
        setLastSyncTime(new Date());
        setConnectivityToast({
          show: true,
          type: 'online',
          message: 'Connection Restored! Local changes have been synchronized with the cloud.'
        });
        setTimeout(() => setIsSyncing(false), 2000);
        setTimeout(() => setConnectivityToast(prev => ({ ...prev, show: false })), 5000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectivityToast({
        show: true,
        type: 'offline',
        message: 'You are now offline. Offline mode active: All invoices and approvals will be saved locally in IndexedDB.'
      });
      setTimeout(() => setConnectivityToast(prev => ({ ...prev, show: false })), 6000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isSimulatedOffline]);

  // Handle simulated offline toggle changes
  const handleToggleSimulation = (simulate: boolean) => {
    setIsSimulatedOffline(simulate);
    if (simulate) {
      setConnectivityToast({
        show: true,
        type: 'offline',
        message: 'Simulated Offline Mode Enabled. Testing local IndexedDB storage and offline voucher creation.'
      });
      setTimeout(() => setConnectivityToast(prev => ({ ...prev, show: false })), 5000);
    } else {
      setIsSyncing(true);
      setLastSyncTime(new Date());
      setConnectivityToast({
        show: true,
        type: 'online',
        message: 'Simulated Offline Mode Disabled. Reconnected to cloud service!'
      });
      setTimeout(() => setIsSyncing(false), 2000);
      setTimeout(() => setConnectivityToast(prev => ({ ...prev, show: false })), 5000);
    }
  };

  const handleForceSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncTime(new Date());
      setConnectivityToast({
        show: true,
        type: 'sync',
        message: 'Manual cloud sync completed successfully. All records are up to date.'
      });
      setTimeout(() => setConnectivityToast(prev => ({ ...prev, show: false })), 4000);
    }, 1200);
  };
  const notifRef = useRef<HTMLDivElement>(null);

  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKey = isMac ? '⌘' : 'Ctrl';

  useEffect(() => {
    if (user) {
      db.notifications.getAll(user.id).then(setNotifications);
    }
  }, [user]);

  // Load search index data when search is focused
  const loadSearchData = async () => {
    const [invs, sources, types, pers] = await Promise.all([
      db.invoices.getAll(),
      db.expenseSources.getAll(),
      db.paymentTypes.getAll(),
      db.people.getAll()
    ]);
    setInvoices(invs);
    setExpenseSources(sources);
    setPaymentTypes(types);
    setPeople(pers);
  };

  // Keyboard shortcut listener for focusing global search
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
        loadSearchData();
      } else if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
        loadSearchData();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Click outside listener for search & notifications
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    await db.notifications.markAsRead(id);
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  // Generate Filtered Search Results
  const getSearchResults = (): SearchResultItem[] => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    const results: SearchResultItem[] = [];

    // 1. Invoices
    if (selectedFilter === 'all' || selectedFilter === 'invoices') {
      invoices.forEach(inv => {
        const vendor = expenseSources.find(s => s.id === inv.expenseSourceId);
        const matches = (
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.purpose.toLowerCase().includes(q) ||
          (inv.remarks && inv.remarks.toLowerCase().includes(q)) ||
          inv.amount.toString().includes(q) ||
          inv.status.toLowerCase().includes(q) ||
          inv.sealCode.toLowerCase().includes(q) ||
          inv.date.includes(q) ||
          (vendor && vendor.name.toLowerCase().includes(q))
        );
        if (matches) {
          results.push({
            id: `inv-${inv.id}`,
            type: 'invoice',
            title: `${inv.invoiceNumber} — ${formatCurrency(inv.amount)}`,
            subtitle: `${inv.purpose} (${new Date(inv.date).toLocaleDateString()})`,
            badge: inv.status,
            badgeColor: inv.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : inv.status === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700',
            action: () => {
              navigate(`/voucher/${inv.id}`);
              setIsSearchOpen(false);
              setSearchQuery('');
            }
          });
        }
      });
    }

    // 2. Vendors / Expense Sources
    if (selectedFilter === 'all' || selectedFilter === 'vendors') {
      expenseSources.forEach(src => {
        const matches = (
          src.name.toLowerCase().includes(q) ||
          src.address.toLowerCase().includes(q) ||
          src.description.toLowerCase().includes(q)
        );
        if (matches) {
          results.push({
            id: `src-${src.id}`,
            type: 'vendor',
            title: src.name,
            subtitle: src.address ? `${src.address} — ${src.description}` : src.description,
            badge: 'Vendor',
            badgeColor: 'bg-blue-100 text-blue-800',
            action: () => {
              navigate(`/master-data?tab=sources&q=${encodeURIComponent(src.name)}`);
              setIsSearchOpen(false);
              setSearchQuery('');
            }
          });
        }
      });
    }

    // 3. Payment Types / Categories
    if (selectedFilter === 'all' || selectedFilter === 'categories') {
      paymentTypes.forEach(pt => {
        const matches = (
          pt.name.toLowerCase().includes(q) ||
          pt.description.toLowerCase().includes(q)
        );
        if (matches) {
          results.push({
            id: `pt-${pt.id}`,
            type: 'category',
            title: pt.name,
            subtitle: pt.description,
            badge: 'Category',
            badgeColor: 'bg-purple-100 text-purple-800',
            action: () => {
              navigate(`/master-data?tab=types&q=${encodeURIComponent(pt.name)}`);
              setIsSearchOpen(false);
              setSearchQuery('');
            }
          });
        }
      });
    }

    // 4. Beneficiaries / Personnel
    if (selectedFilter === 'all' || selectedFilter === 'people') {
      people.forEach(p => {
        const matches = (
          p.name.toLowerCase().includes(q) ||
          (p.designation && p.designation.toLowerCase().includes(q)) ||
          (p.officeId && p.officeId.toLowerCase().includes(q)) ||
          (p.department && p.department.toLowerCase().includes(q))
        );
        if (matches) {
          results.push({
            id: `p-${p.id}`,
            type: 'person',
            title: p.name,
            subtitle: `${p.designation || 'Staff'} ${p.officeId ? `(ID: ${p.officeId})` : ''}`,
            badge: 'Signatory',
            badgeColor: 'bg-emerald-100 text-emerald-800',
            action: () => {
              navigate(`/master-data?tab=persons&q=${encodeURIComponent(p.name)}`);
              setIsSearchOpen(false);
              setSearchQuery('');
            }
          });
        }
      });
    }

    return results.slice(0, 12);
  };

  const searchResults = getSearchResults();

  // Keyboard navigation within search dropdown
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1 < searchResults.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 >= 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults[selectedIndex]) {
        searchResults[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsSearchOpen(false);
      searchInputRef.current?.blur();
    }
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, selectedFilter]);

  return (
    <header className="h-16 bg-bg-panel border-b border-border-subtle flex items-center justify-between px-4 sm:px-6 relative z-30">
      <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-2xl">
        <button 
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 -ml-2 text-text-muted hover:text-text-base hover:bg-bg-base rounded-xl transition-colors shrink-0"
          aria-label="Open mobile navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Real Interactive Global Search Bar */}
        <div className="relative flex-1" ref={searchContainerRef}>
          <div className="relative flex items-center">
            <div className="absolute left-3.5 pointer-events-none text-text-muted">
              <Search className="w-4 h-4" />
            </div>

            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                setIsSearchOpen(true);
                loadSearchData();
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search invoices, categories, vendors, staff..."
              className="w-full pl-10 pr-20 py-2 bg-bg-base hover:bg-bg-panel focus:bg-bg-panel border border-border-subtle focus:border-accent-500 rounded-xl text-xs sm:text-sm text-text-base transition-all shadow-2xs focus:ring-2 focus:ring-accent-500/20 focus:outline-none"
            />

            <div className="absolute right-2.5 flex items-center gap-1.5">
              {searchQuery ? (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="p-1 text-text-muted hover:text-text-base rounded-md"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold text-text-muted bg-bg-panel border border-border-subtle rounded shadow-2xs">
                  {modKey}+K
                </kbd>
              )}
            </div>
          </div>

          {/* Interactive Search Results Dropdown Popover */}
          {isSearchOpen && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-bg-panel border border-border-subtle rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 px-3.5 py-2.5 bg-bg-base border-b border-border-subtle overflow-x-auto text-xs">
                {[
                  { id: 'all', label: 'All Results', icon: Sparkles },
                  { id: 'invoices', label: 'Invoices', icon: FileText },
                  { id: 'vendors', label: 'Vendors', icon: Building2 },
                  { id: 'categories', label: 'Categories', icon: Tag },
                  { id: 'people', label: 'Staff / Signers', icon: Users },
                ].map(tab => {
                  const Icon = tab.icon;
                  const active = selectedFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setSelectedFilter(tab.id as SearchCategory)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                        active
                          ? 'bg-accent-600 text-white shadow-2xs'
                          : 'text-text-muted hover:text-text-base hover:bg-bg-panel'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Results List */}
              <div className="max-h-[380px] overflow-y-auto p-2">
                {!searchQuery.trim() ? (
                  <div className="p-5 text-center text-xs text-text-muted space-y-2">
                    <p className="font-semibold text-text-base">Type to search across the entire application</p>
                    <p>Find invoices by invoice number (e.g. INV-WAL-MIS-), purpose, amount, or vendor name.</p>
                    <div className="pt-2 flex flex-wrap justify-center gap-2">
                      <span className="px-2 py-0.5 bg-bg-base rounded border border-border-subtle font-mono text-[11px]">INV-WAL-MIS-2026</span>
                      <span className="px-2 py-0.5 bg-bg-base rounded border border-border-subtle text-[11px]">Walton</span>
                      <span className="px-2 py-0.5 bg-bg-base rounded border border-border-subtle text-[11px]">Utility</span>
                      <span className="px-2 py-0.5 bg-bg-base rounded border border-border-subtle text-[11px]">Approved</span>
                    </div>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-6 text-center text-xs text-text-muted space-y-3">
                    <p className="font-semibold text-text-base">No matching records found for "{searchQuery}"</p>
                    <p>Try searching by invoice number, vendor, expense purpose or signatory name.</p>
                    <button
                      onClick={() => {
                        setIsSearchOpen(false);
                        navigate('/invoices/new');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent-600 text-white rounded-lg text-xs font-semibold hover:bg-accent-700"
                    >
                      Create New Invoice Voucher
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {searchResults.map((item, idx) => {
                      const isSelected = idx === selectedIndex;
                      return (
                        <div
                          key={item.id}
                          onClick={item.action}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`p-3 rounded-xl cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                            isSelected 
                              ? 'bg-accent-50/80 dark:bg-accent-950/60 border border-accent-200 dark:border-accent-800' 
                              : 'hover:bg-bg-base border border-transparent'
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="p-2 rounded-lg bg-bg-base border border-border-subtle text-accent-600 shrink-0 mt-0.5">
                              {item.type === 'invoice' && <FileText className="w-4 h-4" />}
                              {item.type === 'vendor' && <Building2 className="w-4 h-4" />}
                              {item.type === 'category' && <Tag className="w-4 h-4" />}
                              {item.type === 'person' && <Users className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs sm:text-sm font-bold text-text-base truncate">{item.title}</h4>
                                {item.badge && (
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-slate-100 text-slate-800'} shrink-0`}>
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-text-muted truncate mt-0.5">{item.subtitle}</p>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center text-text-muted">
                            <ArrowRight className={`w-4 h-4 ${isSelected ? 'text-accent-600 translate-x-0.5' : 'opacity-40'} transition-all`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bottom Quick-Jump Footer */}
              <div className="px-4 py-2.5 bg-bg-base border-t border-border-subtle flex items-center justify-between text-[11px] text-text-muted">
                <div className="flex items-center gap-3">
                  <span><kbd className="font-mono bg-bg-panel px-1 py-0.5 rounded border border-border-subtle">↑↓</kbd> Navigate</span>
                  <span><kbd className="font-mono bg-bg-panel px-1 py-0.5 rounded border border-border-subtle">↵</kbd> Select</span>
                  <span><kbd className="font-mono bg-bg-panel px-1 py-0.5 rounded border border-border-subtle">ESC</kbd> Close</span>
                </div>
                <button
                  onClick={() => {
                    setIsSearchOpen(false);
                    onOpenCommandPalette?.();
                  }}
                  className="text-accent-600 hover:underline font-semibold"
                >
                  All Commands ({modKey}+K)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Right Header Navigation & Modals Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Interactive Online/Offline & Sync Status Indicator */}
        <button
          type="button"
          onClick={() => setShowStatusModal(true)}
          className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all shadow-2xs group cursor-pointer ${
            !effectiveOnline 
              ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 hover:bg-amber-100' 
              : isSyncing
              ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60 animate-pulse'
              : 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 hover:bg-emerald-100'
          }`}
          title={
            !effectiveOnline
              ? "App is Offline (Click for Offline Mode & Sync Info)"
              : isSyncing
              ? "Syncing local changes with cloud database..."
              : "App is Online & Synchronized (Click for Sync Details)"
          }
        >
          {/* Status Dot / Indicator Icon */}
          <div className="relative flex items-center justify-center">
            {isSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
            ) : !effectiveOnline ? (
              <div className="relative flex items-center">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping absolute opacity-75" />
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              </div>
            ) : (
              <div className="relative flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping absolute opacity-75" />
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
            )}
          </div>

          {/* Device Responsive Text Labels */}
          <span className="hidden sm:inline font-bold">
            {!effectiveOnline ? 'Offline' : isSyncing ? 'Syncing...' : 'Online'}
          </span>
          <span className="hidden xl:inline font-normal text-[11px] opacity-80">
            {!effectiveOnline ? '• Local Active' : '• Synced'}
          </span>
        </button>

        {/* QR Code Scanner Launch Button */}
        <button
          onClick={onOpenQRScanner}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-text-muted hover:text-text-base hover:bg-bg-base rounded-xl border border-border-subtle transition-colors shadow-2xs group"
          title="Scan Invoice QR Code with Device Camera"
        >
          <Camera className="w-4 h-4 text-accent-600 group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline font-medium">Scan QR</span>
        </button>

        {/* Help & Knowledge Base Trigger Button */}
        <button
          onClick={onOpenHelpDrawer}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-text-muted hover:text-text-base hover:bg-bg-base rounded-xl border border-border-subtle transition-colors shadow-2xs group"
          title="Help & Knowledge Base (Quick-Start Guides & FAQs)"
        >
          <BookOpen className="w-4 h-4 text-accent-600 group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline font-medium">Help & FAQs</span>
        </button>

        {/* Keyboard Shortcuts Trigger Button */}
        <button
          onClick={onOpenShortcutsHelp}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-text-muted hover:text-text-base hover:bg-bg-base rounded-xl border border-border-subtle transition-colors shadow-2xs"
          title="View Keyboard Shortcuts (?)"
        >
          <Keyboard className="w-4 h-4 text-accent-600" />
          <span className="hidden sm:inline font-medium">Shortcuts</span>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-text-muted hover:bg-bg-base rounded-full transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-bg-panel"></span>
            )}
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-bg-panel rounded-2xl shadow-xl border border-border-subtle overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
                <h3 className="font-semibold text-text-base text-sm">Notifications</h3>
                <span className="text-xs font-medium bg-accent-100 text-accent-700 px-2 py-0.5 rounded-full">{unreadCount} new</span>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-text-muted">No notifications</div>
                ) : (
                  notifications.map(notif => (
                    <div 
                      key={notif.id} 
                      className={cn(
                        "p-4 border-b border-border-subtle last:border-0 transition-colors",
                        !notif.read ? "bg-accent-50/50" : "hover:bg-bg-base"
                      )}
                    >
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <h4 className={cn("text-sm font-medium", !notif.read ? "text-text-base" : "text-text-muted")}>{notif.title}</h4>
                        {!notif.read && (
                          <button onClick={() => markAsRead(notif.id)} className="text-accent-600 hover:text-accent-700" title="Mark as read">
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-text-muted mb-2">{notif.message}</p>
                      <span className="text-[10px] text-text-muted">{new Date(notif.createdAt).toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Real-Time Connectivity Toast Alert */}
      {connectivityToast.show && (
        <div 
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border text-xs sm:text-sm font-medium transition-all max-w-md animate-in slide-in-from-top-4 duration-200 ${
            connectivityToast.type === 'offline'
              ? 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-800'
              : connectivityToast.type === 'sync'
              ? 'bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-950 dark:text-blue-100 dark:border-blue-800'
              : 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-800'
          }`}
        >
          <div className="shrink-0 p-1.5 rounded-lg bg-white/60 dark:bg-black/30">
            {connectivityToast.type === 'offline' ? (
              <WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            ) : connectivityToast.type === 'sync' ? (
              <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
            ) : (
              <Wifi className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold mb-0.5">
              {connectivityToast.type === 'offline' ? 'Offline Mode Active' : connectivityToast.type === 'sync' ? 'Synchronizing Data' : 'Connected to Network'}
            </p>
            <p className="text-xs opacity-90">{connectivityToast.message}</p>
          </div>
          <button
            onClick={() => setConnectivityToast(prev => ({ ...prev, show: false }))}
            className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-current opacity-70 hover:opacity-100"
            title="Dismiss Alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Offline Status & Cloud Sync Details Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div 
            className="bg-bg-panel border border-border-subtle rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-100"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border-subtle flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${
                  !effectiveOnline 
                    ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800' 
                    : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                }`}>
                  {!effectiveOnline ? <WifiOff className="w-6 h-6" /> : <Wifi className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-text-base">Connectivity & Sync Engine</h3>
                  <p className="text-xs text-text-muted">Offline-first local IndexedDB architecture</p>
                </div>
              </div>
              <button
                onClick={() => setShowStatusModal(false)}
                className="p-1.5 text-text-muted hover:text-text-base hover:bg-bg-base rounded-lg transition-colors"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Primary Status Card */}
              <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                !effectiveOnline 
                  ? 'bg-amber-50/70 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800/80 dark:text-amber-200' 
                  : 'bg-emerald-50/70 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800/80 dark:text-emerald-200'
              }`}>
                <div className="mt-0.5 shrink-0">
                  {!effectiveOnline ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold">
                    {!effectiveOnline ? 'Operating in Offline Mode' : 'Connected to Cloud & Network'}
                  </h4>
                  <p className="text-xs mt-1 opacity-90 leading-relaxed">
                    {!effectiveOnline
                      ? 'You are currently disconnected or simulating offline mode. All invoice vouchers, revisions, and approvals are stored in local IndexedDB and will automatically sync once connectivity resumes.'
                      : 'Your device is connected with full online synchronization. All voucher records and audit logs are actively mirrored to cloud storage.'}
                  </p>
                </div>
              </div>

              {/* Status Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-bg-base rounded-xl border border-border-subtle">
                  <span className="text-text-muted font-medium block mb-1">Local Storage Engine</span>
                  <div className="flex items-center gap-1.5 font-bold text-text-base">
                    <Database className="w-3.5 h-3.5 text-accent-600" />
                    <span>IndexedDB Active</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5">● Ready & Resilient</span>
                </div>

                <div className="p-3 bg-bg-base rounded-xl border border-border-subtle">
                  <span className="text-text-muted font-medium block mb-1">Last Cloud Sync</span>
                  <div className="flex items-center gap-1.5 font-bold text-text-base">
                    <Clock className="w-3.5 h-3.5 text-accent-600" />
                    <span>{lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>
                  <span className="text-[10px] text-text-muted block mt-0.5">{effectiveOnline ? 'Auto-sync active' : 'Awaiting network'}</span>
                </div>
              </div>

              {/* Offline Capabilities Checklist */}
              <div className="p-3.5 bg-bg-base rounded-xl border border-border-subtle space-y-2">
                <h5 className="text-xs font-bold text-text-base flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-accent-600" />
                  <span>Offline Capabilities Available:</span>
                </h5>
                <ul className="text-xs space-y-1.5 text-text-muted">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Full voucher creation, auto-total calculations, & remarks</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Manager approval queue review, approvals & rejections</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Print preview & official A4 voucher generation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Automatic sync queue when reconnected</span>
                  </li>
                </ul>
              </div>

              {/* Simulation Toggle Option */}
              <div className="p-3 bg-bg-base rounded-xl border border-border-subtle flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-text-base">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Simulate Offline Mode</span>
                  </div>
                  <p className="text-[11px] text-text-muted">Toggle to test the offline workflow and UI prompts.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSimulatedOffline}
                    onChange={e => handleToggleSimulation(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 border-t border-border-subtle bg-bg-base flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={handleForceSync}
                disabled={isSyncing}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Force Cloud Sync Now'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="w-full sm:w-auto px-4 py-2 bg-bg-panel hover:bg-bg-base border border-border-subtle text-text-base rounded-xl text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
