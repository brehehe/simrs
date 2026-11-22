import React, { useState, useEffect } from 'react';
import {
  Activity,
  Search,
  CheckCircle2,
  RefreshCw,
  Coins,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import api from '../services/api';
import { toast } from 'sonner';

interface MedicalProcedure {
  id: string;
  code: string;
  name: string;
  base_price: string | number;
  is_active: boolean;
}

export const ProceduresTariffPage: React.FC = () => {
  const [procedures, setProcedures] = useState<MedicalProcedure[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchProcedures = async () => {
    setLoading(true);
    try {
      const res = await api.get('/medical-procedures');
      setProcedures(res.data?.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat master tindakan medis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcedures();
  }, []);

  const formatRupiah = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num || 0);
  };

  const filtered = procedures.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.name?.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-teal-500/20 backdrop-blur-md rounded-2xl border border-teal-400/30 text-teal-300">
            <Activity className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Master Tindakan & Tarif Pelayanan
            </h1>
            <p className="text-xs sm:text-sm text-teal-200 mt-0.5">
              Standar tarif pelayanan medis, tindakan poliklinik, dan integritas snapshot finansial
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchProcedures}
          disabled={loading}
          className="bg-white/10 hover:bg-white/20 text-white border-white/20 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Segarkan Data
        </Button>
      </div>

      {/* Critical Case 4 Info Callout */}
      <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-start gap-3 text-xs text-teal-900">
        <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-teal-950">
            Prinsip Immutabilitas Tarif Historis (Critical Case 4 Mitigation)
          </p>
          <p className="text-teal-700 mt-0.5">
            Saat dokter mencatat tindakan medis, nilai tarif di-snapshot secara permanen ke tabel <code>visit_procedures</code> dan <code>invoice_items</code>. Perubahan tarif pada tabel master tindakan tidak akan pernah memutasi data invoice pasien terdahulu.
          </p>
        </div>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari tindakan medis atau kode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Daftar Tindakan Medis ({filtered.length} Tindakan)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Kode Tindakan</th>
                <th className="py-3 px-4">Nama Tindakan Medis</th>
                <th className="py-3 px-4">Tarif Dasar (Standar RS)</th>
                <th className="py-3 px-4">Status Layanan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-slate-400">
                    Tidak ada tindakan medis yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filtered.map((proc) => (
                  <tr key={proc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-teal-800">
                      {proc.code}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {proc.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-900 font-bold">
                      {formatRupiah(proc.base_price)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Aktif
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
