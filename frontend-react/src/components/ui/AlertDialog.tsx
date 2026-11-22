import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  cancelText?: string;
  isLoading?: boolean;
  variant?: 'danger' | 'warning' | 'primary';
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  confirmText,
  cancelLabel,
  cancelText,
  isLoading = false,
  variant = 'danger',
}) => {
  const finalConfirmLabel = confirmText || confirmLabel || 'Konfirmasi';
  const finalCancelLabel = cancelText || cancelLabel || 'Batal';

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm">
      <div className="flex flex-col items-center text-center space-y-4">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
            variant === 'danger'
              ? 'bg-red-100 text-red-600'
              : variant === 'warning'
              ? 'bg-amber-100 text-amber-600'
              : 'bg-teal-100 text-teal-600'
          }`}
        >
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h4 className="text-base font-semibold text-slate-900">{title}</h4>
          <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
        </div>
        <div className="flex w-full gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isLoading}
          >
            {finalCancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === 'warning' ? 'secondary' : variant}
            className="flex-1"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {finalConfirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
