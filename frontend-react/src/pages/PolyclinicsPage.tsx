import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  CheckCircle2,
  RefreshCw,
  Hash,
  DoorOpen,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import api from '../services/api';
import { toast } from 'sonner';

interface Polyclinic {
  id: string;
  code: string;
  name: string;
  queue_prefix: string;
  is_active: boolean;
}

export const PolyclinicsPage: React.FC = () => {
  const [polyclinics, setPolyclinics] = useState<Polyclinic[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchPolyclinics = async () => {
    setLoading(true);
    try {
      const res = await api.get('/polyclinics');
      setPolyclinics(res.data?.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat data poliklinik.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolyclinics();
  }, []);

  const filtered = polyclinics.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.code?.toLowerCase().includes(q) ||
      p.queue_prefix?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-teal-500/20 backdrop-blur-md rounded-2xl border border-teal-400/30 text-teal-300">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Master Poliklinik & Ruang Layanan
            </h1>
            <p className="text-xs sm:text-sm text-teal-200 mt-0.5">
              Unit pelayanan rawat jalan terintegrasi, alokasi kode prefix antrean atomik
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchPolyclinics}
          disabled={loading}
          className="bg-white/10 hover:bg-white/20 text-white border-white/20 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Segarkan Data
        </Button>
      </div>

      {/* Info Callout */}
      <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-start gap-3 text-xs text-teal-900">
        <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-teal-950">Integritas Prefix Antrean Atomik</p>
          <p className="text-teal-700 mt-0.5">
            Prefix antrean poliklinik (misal: 'A' untuk Penyakit Dalam, 'B' untuk Anak) digunakan oleh mesin sequence counter PostgreSQL guna menjamin keunikan nomor antrean atomik per hari pelayanan.
          </p>
        </div>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama poliklinik atau kode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </Card>

      {/* Polyclinic Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((poly) => (
          <Card key={poly.id} className="p-5 hover:border-teal-300 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-lg border border-teal-200">
                  {poly.queue_prefix}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{poly.name}</h3>
                  <span className="font-mono text-xs text-slate-500">{poly.code}</span>
                </div>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Aktif
              </span>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Prefix Tiket</span>
                <span className="font-semibold text-slate-800">{poly.queue_prefix}001 - {poly.queue_prefix}999</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Lantai / Lokasi</span>
                <span className="font-semibold text-slate-800">Gedung Rawat Jalan Lt. 1</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
