import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center border border-slate-200">
        <FileQuestion className="w-8 h-8" />
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-slate-900">Halaman Tidak Ditemukan (404)</h2>
        <p className="text-xs text-slate-500 max-w-sm">
          Alamat yang Anda tuju tidak ditemukan atau sedang dalam proses pemeliharaan.
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
