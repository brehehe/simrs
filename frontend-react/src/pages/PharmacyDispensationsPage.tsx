import React, { useState, useEffect } from 'react';
import {
  Pill,
  Search,
  CheckCircle2,
  RefreshCw,
  Clock,
  User,
  ShieldCheck,
  FileText,
  Calendar,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import api from '../services/api';
import { toast } from 'sonner';

interface PrescriptionItem {
  id: string;
  medicine_id: string;
  quantity: number;
  dosage: string;
  frequency: string;
  snapshot_price: string | number;
  subtotal: string | number;
  medicine_name: string;
  unit: string;
}

interface Prescription {
  id: string;
  prescription_number: string;
  visit_id: string;
  status: string;
  notes: string;
  created_at: string;
  doctor_name: string;
  patient_name: string;
  mr_number: string;
  visit_number: string;
  items: PrescriptionItem[];
}

export const PharmacyDispensationsPage: React.FC = () => {
  const [dispensations, setDispensations] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchDispensations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/prescriptions', { params: { status: 'DISPENSED' } });
      setDispensations(res.data?.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat riwayat penyerahan obat.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDispensations();
  }, []);

  const formatRupiah = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num || 0);
  };

  const filtered = dispensations.filter((rx) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      rx.prescription_number?.toLowerCase().includes(q) ||
      rx.patient_name?.toLowerCase().includes(q) ||
      rx.mr_number?.toLowerCase().includes(q) ||
      rx.doctor_name?.toLowerCase().includes(q) ||
      rx.items?.some((i) => i.medicine_name?.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-teal-500/20 backdrop-blur-md rounded-2xl border border-teal-400/30 text-teal-300">
            <Pill className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Riwayat Penyerahan Obat (Dispensed)
            </h1>
            <p className="text-xs sm:text-sm text-teal-200 mt-0.5">
              Log serah terima obat depo farmasi rawat jalan, verifikasi apoteker, dan pemotongan stok
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchDispensations}
          disabled={loading}
          className="bg-white/10 hover:bg-white/20 text-white border-white/20 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Segarkan Data
        </Button>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari no. resep, nama pasien, No. RM, atau nama obat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </Card>

      {/* Cards List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <Card className="p-8 text-center text-slate-400 text-xs">
            Tidak ada riwayat penyerahan obat yang cocok dengan filter pencarian.
          </Card>
        ) : (
          filtered.map((rx) => {
            const totalValue = rx.items?.reduce(
              (acc, item) => acc + (Number(item.subtotal) || 0),
              0
            ) || 0;

            return (
              <Card key={rx.id} className="p-5 border-l-4 border-l-emerald-600 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono font-bold text-teal-800 text-sm">
                      {rx.prescription_number}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Obat Telah Diserahkan
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(rx.created_at).toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Pasien Penerima</span>
                    <span className="font-bold text-slate-900">{rx.patient_name}</span>
                    <span className="text-slate-500 font-mono block">RM: {rx.mr_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Dokter Penulis</span>
                    <span className="font-semibold text-slate-800">{rx.doctor_name}</span>
                    <span className="text-slate-500 font-mono block">Reg: {rx.visit_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Total Nilai Resep</span>
                    <span className="font-bold text-emerald-600 text-sm">{formatRupiah(totalValue)}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60 mt-2">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                    Rincian Obat yang Telah Diterima Pasien ({rx.items?.length || 0} Item):
                  </span>
                  <div className="space-y-1.5">
                    {rx.items?.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between text-xs py-1 border-b border-slate-200/40 last:border-0"
                      >
                        <div>
                          <span className="font-bold text-slate-900">{item.medicine_name}</span>
                          <span className="text-slate-500 text-[11px] ml-2">
                            ({item.quantity} {item.unit}) • {item.dosage} • {item.frequency}
                          </span>
                        </div>
                        <span className="font-mono text-slate-700 font-medium">
                          {formatRupiah(item.subtotal)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
