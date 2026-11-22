import React, { useState, useEffect } from 'react';
import {
  Pill,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Package,
  Layers,
  ArrowDownRight,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import api from '../services/api';
import { toast } from 'sonner';

interface MedicineStockItem {
  id: string;
  code: string;
  name: string;
  generic_name: string;
  unit: string;
  base_price: string | number;
  current_stock: number;
  minimum_stock: number;
}

export const PharmacyStocksPage: React.FC = () => {
  const [medicines, setMedicines] = useState<MedicineStockItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stockFilter, setStockFilter] = useState<string>('ALL');

  const fetchMedicines = async () => {
    setLoading(true);
    try {
      const res = await api.get('/medicines');
      setMedicines(res.data?.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat persediaan obat.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  const formatRupiah = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num || 0);
  };

  const filtered = medicines.filter((m) => {
    const stock = Number(m.current_stock) || 0;
    const minStock = Number(m.minimum_stock) || 0;

    if (stockFilter === 'LOW' && stock > minStock) return false;
    if (stockFilter === 'EMPTY' && stock > 0) return false;
    if (stockFilter === 'NORMAL' && stock <= minStock) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        m.name?.toLowerCase().includes(q) ||
        m.code?.toLowerCase().includes(q) ||
        m.generic_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalItems = medicines.length;
  const lowStockItems = medicines.filter((m) => Number(m.current_stock) <= Number(m.minimum_stock) && Number(m.current_stock) > 0).length;
  const emptyStockItems = medicines.filter((m) => Number(m.current_stock) <= 0).length;

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
              Persediaan & Mutasi Stok Depo Farmasi
            </h1>
            <p className="text-xs sm:text-sm text-teal-200 mt-0.5">
              Katalog persediaan obat, kuantitas real-time, dan batas peringatan stok minimum
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchMedicines}
          disabled={loading}
          className="bg-white/10 hover:bg-white/20 text-white border-white/20 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Segarkan Stok
        </Button>
      </div>

      {/* Critical Case 2 Callout */}
      <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-start gap-3 text-xs text-teal-900">
        <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-teal-950">
            Proteksi Konkurensi Stok Obat (Critical Case 2 Mitigation)
          </p>
          <p className="text-teal-700 mt-0.5">
            Setiap aksi penyerahan obat (dispense) mengunci baris persediaan obat secara eksklusif menggunakan PostgreSQL <code>SELECT FOR UPDATE</code>. Transaksi konkuren pada stok minim dijamin tidak akan pernah menyebabkan stok obat bernilai negatif.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border-l-4 border-l-teal-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Total Katalog Obat</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalItems} Item</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Stok Menipis (Peringatan)</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">{lowStockItems} Item</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-rose-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Stok Habis (Kosong)</p>
              <h3 className="text-2xl font-bold text-rose-600 mt-1">{emptyStockItems} Item</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama obat, generik, atau kode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-slate-500">Status Stok:</span>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs font-medium">
              {[
                { id: 'ALL', label: 'Semua' },
                { id: 'NORMAL', label: 'Stok Aman' },
                { id: 'LOW', label: 'Menipis' },
                { id: 'EMPTY', label: 'Habis' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStockFilter(tab.id)}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    stockFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Daftar Persediaan Obat ({filtered.length} Item)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Kode Obat</th>
                <th className="py-3 px-4">Nama Obat & Komposisi</th>
                <th className="py-3 px-4">Bentuk Sediaan</th>
                <th className="py-3 px-4">Stok Saat Ini</th>
                <th className="py-3 px-4">Stok Minimum</th>
                <th className="py-3 px-4">Harga Satuan</th>
                <th className="py-3 px-4">Kondisi Persediaan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    Tidak ada obat yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const stock = Number(item.current_stock) || 0;
                  const min = Number(item.minimum_stock) || 0;
                  const isLow = stock <= min && stock > 0;
                  const isEmpty = stock <= 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-teal-800">
                        {item.code}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{item.name}</div>
                        <div className="text-[11px] text-slate-500 italic">{item.generic_name}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-medium">
                          {item.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-sm">
                        <span
                          className={
                            isEmpty
                              ? 'text-rose-600'
                              : isLow
                              ? 'text-amber-600'
                              : 'text-slate-900'
                          }
                        >
                          {stock}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{min}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {formatRupiah(item.base_price)}
                      </td>
                      <td className="py-3 px-4">
                        {isEmpty ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            Stok Habis
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Stok Menipis
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Stok Aman
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
