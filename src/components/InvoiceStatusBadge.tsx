import React from 'react';
import { 
  CheckCircle2, Clock, CheckCheck, ShieldCheck, XCircle, 
  AlertTriangle, FileText, Shield, Coins, RotateCcw
} from 'lucide-react';
import { InvoiceStatus } from '../types';

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus | string;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
  interactive?: boolean;
}

export const getStatusDetails = (status: InvoiceStatus | string) => {
  const norm = status?.toLowerCase() || '';

  if (norm === 'approved') {
    return {
      label: 'Approved',
      icon: CheckCircle2,
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700/60',
      dotClass: 'bg-emerald-500 shadow-xs shadow-emerald-400',
      pulse: false,
      title: 'Approved by Management'
    };
  }
  
  if (norm === 'received' || norm === 'paid' || norm === 'disbursed') {
    return {
      label: norm === 'received' ? 'Paid / Received' : 'Paid',
      icon: CheckCheck,
      badgeClass: 'bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-700/60',
      dotClass: 'bg-teal-500 shadow-xs shadow-teal-400',
      pulse: false,
      title: 'Disbursed / Paid Out'
    };
  }

  if (norm === 'pending' || norm === 'submitted') {
    return {
      label: norm === 'submitted' ? 'Submitted' : 'Pending',
      icon: Clock,
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700/60',
      dotClass: 'bg-amber-500 shadow-xs shadow-amber-400',
      pulse: true,
      title: 'Awaiting Manager Review & Approval'
    };
  }

  if (norm === 'verified') {
    return {
      label: 'Verified',
      icon: ShieldCheck,
      badgeClass: 'bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-700/60',
      dotClass: 'bg-sky-500 shadow-xs shadow-sky-400',
      pulse: false,
      title: 'Audit & Accounts Verified'
    };
  }

  if (norm === 'rejected') {
    return {
      label: 'Rejected',
      icon: XCircle,
      badgeClass: 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-700/60',
      dotClass: 'bg-rose-500 shadow-xs shadow-rose-400',
      pulse: false,
      title: 'Declined by Approver'
    };
  }

  if (norm === 'returned') {
    return {
      label: 'Returned',
      icon: AlertTriangle,
      badgeClass: 'bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-700/60',
      dotClass: 'bg-orange-500 shadow-xs shadow-orange-400',
      pulse: false,
      title: 'Returned for Edit / Revisions'
    };
  }

  if (norm === 'draft') {
    return {
      label: 'Draft',
      icon: FileText,
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      dotClass: 'bg-slate-400',
      pulse: false,
      title: 'Unsubmitted Draft Voucher'
    };
  }

  return {
    label: status || 'Unknown',
    icon: Shield,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    dotClass: 'bg-slate-400',
    pulse: false,
    title: `Status: ${status}`
  };
};

export const InvoiceStatusBadge: React.FC<InvoiceStatusBadgeProps> = ({
  status,
  onClick,
  size = 'md',
  showDot = true,
  className = '',
  interactive = true
}) => {
  const details = getStatusDetails(status);
  const IconComponent = details.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[11px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
    lg: 'px-3.5 py-1.5 text-sm gap-2'
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  }[size];

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5'
  }[size];

  const content = (
    <>
      {showDot && (
        <span 
          className={`shrink-0 rounded-full ${dotSizes} ${details.dotClass} ${
            details.pulse ? 'animate-pulse' : ''
          }`} 
        />
      )}
      <IconComponent className={`${iconSizes} shrink-0`} />
      <span className="font-semibold tracking-wide whitespace-nowrap">{details.label}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center rounded-full font-bold border transition-all select-none ${sizeClasses} ${details.badgeClass} ${
          interactive ? 'hover:scale-105 active:scale-95 cursor-pointer shadow-2xs hover:shadow-xs' : ''
        } ${className}`}
        title={`${details.title} (Click to inspect or change)`}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold border select-none ${sizeClasses} ${details.badgeClass} ${className}`}
      title={details.title}
    >
      {content}
    </span>
  );
};
