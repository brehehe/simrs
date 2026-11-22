import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const ForbiddenPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-slate-900">Akses Ditolak (403 Forbidden)</h2>
        <p className="text-xs text-slate-500 max-w-sm">
          Peran Anda tidak memiliki izin untuk mengakses halaman ini sesuai kebijakan otorisasi RBAC SIMRS.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate('/dashboard')}
        leftIcon={<ArrowLeft className="w-4 h-4" />}
      >
        Kembali ke Dashboard
      </Button>
    </div>
  );
};
