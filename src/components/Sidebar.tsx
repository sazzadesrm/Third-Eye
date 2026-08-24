import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Eye, LayoutDashboard, FileText, Database, ShieldAlert, Settings, 
  LogOut, User as UserIcon, BookOpen, HelpCircle, X, Code2, Mail, Phone, MapPin 
} from 'lucide-react';
import { useAuthStore } from '../lib/store';
import { cn } from '../lib/utils';
import { ProfileModal } from './ProfileModal';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Invoices', path: '/invoices', icon: FileText },
  { name: 'Master Data', path: '/master-data', icon: Database },
  { name: 'Audit Trail', path: '/audit-trail', icon: ShieldAlert },
  { name: 'Settings', path: '/settings', icon: Settings },
];

interface SidebarProps {
  onOpenHelp?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenHelp, isOpenMobile, onCloseMobile }) => {
  const { user, logout } = useAuthStore();
  const [showProfileModal, setShowProfileModal] = useState(false);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800 text-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-accent-600/20 rounded-lg border border-accent-500/30">
            <Eye className="w-6 h-6 text-accent-400 shrink-0" />
          </div>
          <div>
            <span className="text-base font-bold tracking-wider block leading-tight">THIRD EYE</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Invoice System</span>
          </div>
        </div>
        {isOpenMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg transition-colors hover:bg-slate-800"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      
      {/* Nav Links */}
      <div className="flex-1 py-4 flex flex-col gap-1.5 px-3 overflow-y-auto min-h-0">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => {
              if (onCloseMobile) onCloseMobile();
            }}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors font-medium text-sm',
                isActive ? 'bg-accent-600 text-white shadow-sm font-semibold' : 'hover:bg-slate-800 hover:text-white text-slate-300'
              )
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span>{item.name}</span>
          </NavLink>
        ))}

        {/* Quick Help & Knowledge Base Trigger */}
        {onOpenHelp && (
          <button
            onClick={() => {
              if (onCloseMobile) onCloseMobile();
              onOpenHelp();
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors font-medium text-slate-400 hover:bg-slate-800 hover:text-white text-left mt-1 text-sm"
          >
            <BookOpen className="w-4 h-4 text-accent-400 shrink-0" />
            <span>Help & FAQs</span>
          </button>
        )}

        {/* Developer Contact Information Panel */}
        <div className="mt-auto pt-3">
          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/90 text-xs shadow-xs space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <div className="flex items-center gap-1.5 text-accent-400 font-bold text-[11px] tracking-wide uppercase">
                <Code2 className="w-3.5 h-3.5" />
                <span>Developer Info</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Developer</span>
                <span className="font-bold text-slate-100 text-xs">Sazzad Kabir</span>
              </div>

              <a 
                href="mailto:sazzadmbstu@gmail.com" 
                className="flex items-center gap-1.5 text-slate-300 hover:text-accent-400 transition-colors group"
                title="Send email to sazzadmbstu@gmail.com"
              >
                <Mail className="w-3.5 h-3.5 text-accent-500/80 group-hover:text-accent-400 shrink-0" />
                <span className="truncate text-[11px]">sazzadmbstu@gmail.com</span>
              </a>

              <a 
                href="tel:+8801810076761" 
                className="flex items-center gap-1.5 text-slate-300 hover:text-accent-400 transition-colors group"
                title="Call +88-01810-076761"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-400/80 group-hover:text-emerald-400 shrink-0" />
                <span className="truncate text-[11px] font-mono">+88-01810-076761</span>
              </a>

              <div className="flex items-start gap-1.5 text-slate-300 pt-0.5">
                <MapPin className="w-3.5 h-3.5 text-rose-400/80 shrink-0 mt-0.5" />
                <span className="text-[11px] leading-tight text-slate-300">Bashundhara R/A, Dhaka-1229</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Profile & Sign Out Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 shrink-0">
        <div 
          className="flex items-center gap-2.5 mb-2 cursor-pointer hover:bg-slate-800/80 p-2 rounded-xl transition-colors"
          onClick={() => {
            if (onCloseMobile) onCloseMobile();
            setShowProfileModal(true);
          }}
        >
          <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold overflow-hidden border border-slate-600 shrink-0">
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              user?.name?.charAt(0) || 'U'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <div className="w-64 bg-slate-900 text-slate-300 hidden md:flex flex-col shrink-0 h-full border-r border-slate-800">
        {sidebarContent}
      </div>

      {/* Mobile Slide-Over Drawer with Backdrop */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
          {/* Backdrop Overlay */}
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer Container */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900 shadow-2xl z-10 animate-in slide-in-from-left duration-250">
            {sidebarContent}
          </div>
        </div>
      )}

      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
    </>
  );
};

