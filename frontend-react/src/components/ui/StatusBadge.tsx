import React from 'react';
import { cn } from '../../utils/cn';

export type StatusType =
  | 'REGISTERED'
  | 'WAITING'
  | 'IN_EXAMINATION'
  | 'WAITING_LAB'
  | 'WAITING_PHARMACY'
  | 'READY_FOR_BILLING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PROCESSING'
  | 'DISPENSED'
  | 'ORDERED'
  | 'UNPAID'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'ACTIVE'
  | 'INACTIVE';

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
}

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  // Visits
  REGISTERED: { label: 'Terdaftar', bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' },
  WAITING: { label: 'Menunggu', bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
  IN_EXAMINATION: { label: 'Diperiksa', bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
  WAITING_LAB: { label: 'Menunggu Lab', bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' },
  WAITING_PHARMACY: { label: 'Menunggu Obat', bg: 'bg-indigo-100', text: 'text-indigo-800', dot: 'bg-indigo-500' },
  READY_FOR_BILLING: { label: 'Siap Kasir', bg: 'bg-teal-100', text: 'text-teal-800', dot: 'bg-teal-500' },
  COMPLETED: { label: 'Selesai', bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  CANCELLED: { label: 'Batal', bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },

  // Prescriptions / Dispensations
  DRAFT: { label: 'Draft', bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' },
  SUBMITTED: { label: 'Dikirim ke Depo', bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
  PROCESSING: { label: 'Disiapkan', bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
  DISPENSED: { label: 'Obat Diserahkan', bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },

  // Invoices
  UNPAID: { label: 'Belum Lunas', bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
  PARTIALLY_PAID: { label: 'Sebagian', bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
  PAID: { label: 'Lunas', bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },

  // General Master
  ACTIVE: { label: 'Aktif', bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  INACTIVE: { label: 'Non-Aktif', bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-400' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const config = statusConfig[status] || {
    label: status,
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    dot: 'bg-slate-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide',
        config.bg,
        config.text,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.dot)} />
      {config.label}
    </span>
  );
};
