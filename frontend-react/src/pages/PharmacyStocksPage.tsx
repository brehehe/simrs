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
  Plus,
  Edit2,
  Trash2,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { AlertDialog } from '../components/ui/AlertDialog';
import api from '../services/api';
import { toast } from 'sonner';
import { exportToExcel } from '../utils/excelExport';
import { exportTableToPdf } from '../utils/pdfExport';

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

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState<boolean>(false);

  // Form Fields
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    generic_name: '',
    unit: 'Tablet',
    base_price: 5000,
    current_stock: 100,
    minimum_stock: 20,
  });

  // Delete Alert
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

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

  const handleOpenCreate = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({
      code: '',
      name: '',
      generic_name: '',
      unit: 'Tablet',
      base_price: 5000,
      current_stock: 100,
      minimum_stock: 20,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: MedicineStockItem) => {
    setIsEditing(true);
    setCurrentId(item.id);
    setFormData({
      code: item.code,
      name: item.name,
      generic_name: item.generic_name || item.name,
      unit: item.unit || 'Tablet',
      base_price: typeof item.base_price === 'string' ? parseFloat(item.base_price) : item.base_price,
      current_stock: Number(item.current_stock) || 0,
      minimum_stock: Number(item.minimum_stock) || 10,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.unit.trim()) {
      toast.error('Nama obat dan bentuk satuan wajib diisi.');
      return;
    }
    if (!isEditing && !formData.code.trim()) {
      toast.error('Kode obat wajib diisi.');
      return;
    }

    setFormLoading(true);
    try {
      if (isEditing && currentId) {
        await api.put(`/medicines/${currentId}`, {
          name: formData.name.trim(),
          generic_name: formData.generic_name.trim() || formData.name.trim(),
          unit: formData.unit.trim(),
          base_price: Number(formData.base_price),
          current_stock: Number(formData.current_stock),
          minimum_stock: Number(formData.minimum_stock),
        });
        toast.success('Data obat & persediaan berhasil diperbarui.');
      } else {
        await api.post('/medicines', {
          code: formData.code.toUpperCase().trim(),
          name: formData.name.trim(),
          generic_name: formData.generic_name.trim() || formData.name.trim(),
          unit: formData.unit.trim(),
          base_price: Number(formData.base_price),
          current_stock: Number(formData.current_stock),
          minimum_stock: Number(formData.minimum_stock),
        });
        toast.success('Obat baru berhasil ditambahkan ke katalog.');
      }
      setIsModalOpen(false);
      fetchMedicines();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan data obat.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/medicines/${deleteId}`);
      toast.success('Obat berhasil dinonaktifkan.');
      setIsDeleteOpen(false);
      setDeleteId(null);
      fetchMedicines();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus obat.');
    } finally {
      setDeleteLoading(false);
    }
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

  const handleExportExcel = () => {
    const data = filtered.map((m, idx) => ({
      no: idx + 1,
      code: m.code,
      name: m.name,
      generic_name: m.generic_name,
      unit: m.unit,
      current_stock: m.current_stock,
      minimum_stock: m.minimum_stock,
      base_price: Number(m.base_price) || 0,
      total_value: (Number(m.base_price) || 0) * (Number(m.current_stock) || 0),
    }));

    exportToExcel(
      data,
      `Katalog_Stok_Obat_${new Date().toISOString().split('T')[0]}`,
      'Stok Obat',
      [
        { header: 'No', key: 'no', width: 6 },
        { header: 'Kode Obat', key: 'code', width: 18 },
        { header: 'Nama Obat Merk', key: 'name', width: 28 },
        { header: 'Nama Generik', key: 'generic_name', width: 25 },
        { header: 'Satuan', key: 'unit', width: 14 },
        { header: 'Stok Terkini', key: 'current_stock', width: 15 },
        { header: 'Batas Minimum', key: 'minimum_stock', width: 15 },
        { header: 'Harga Satuan (Rp)', key: 'base_price', width: 18 },
        { header: 'Nilai Stok (Rp)', key: 'total_value', width: 20 },
      ]
    );
    toast.success('Berkas Excel Katalog & Stok Obat berhasil diunduh.');
  };

  const handleExportPdf = () => {
    const columns = ['Kode Obat', 'Nama Obat', 'Bentuk Sediaan', 'Stok', 'Min', 'Harga Satuan'];
    const rows = filtered.map((m) => [
      m.code,
      `${m.name}\n(${m.generic_name})`,
      m.unit,
      m.current_stock,
      m.minimum_stock,
      `Rp ${Number(m.base_price).toLocaleString('id-ID')}`,
    ]);

    exportTableToPdf(
      'LAPORAN PERSEDIAAN OBAT DEPO FARMASI',
      columns,
      rows,
      `Stok_Obat_${new Date().toISOString().split('T')[0]}`,
      `Total ${filtered.length} Item Katalog Obat Terdaftar`
    );
    toast.success('Berkas PDF Stok Obat berhasil diunduh.');
  };

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

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-300" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            <Download className="w-4 h-4 mr-1.5 text-rose-300" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMedicines}
            disabled={loading}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Segarkan
          </Button>
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold shadow-md"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Tambah Obat
          </Button>
        </div>
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
              placeholder="Cari nama obat, kode, atau zat aktif..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-slate-500">Status Stok:</span>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">Semua Persediaan</option>
              <option value="NORMAL">Stok Aman</option>
              <option value="LOW">Stok Menipis (≤ Minimum)</option>
              <option value="EMPTY">Stok Kosong (0)</option>
            </select>
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
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
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
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors border border-slate-200"
                            title="Edit Obat & Stok"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteId(item.id);
                              setIsDeleteOpen(true);
                            }}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200"
                            title="Nonaktifkan Obat"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Create / Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Edit Data Obat & Stok' : 'Tambah Obat Baru ke Depo Farmasi'}
        description="Kelola katalog formularium rumah sakit, satuan sediaan, harga, dan kuantitas persediaan."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kode Obat <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={isEditing}
                placeholder="Contoh: MED-PARACETAMOL-500"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className={`w-full px-3 py-2 text-xs sm:text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono ${
                  isEditing ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-300'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bentuk Sediaan / Satuan <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Tablet / Kapsul / Botol Sirup"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Obat Merk / Dagang <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Paracetamol 500 mg"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Generik / Zat Aktif
            </label>
            <input
              type="text"
              placeholder="Contoh: Acetaminophen"
              value={formData.generic_name}
              onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Harga Satuan (Rp) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                required
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Stok Saat Ini <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                required
                value={formData.current_stock}
                onChange={(e) => setFormData({ ...formData, current_stock: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Batas Minimum <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                required
                value={formData.minimum_stock}
                onChange={(e) => setFormData({ ...formData, minimum_stock: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={formLoading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={formLoading}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {isEditing ? 'Simpan Perubahan' : 'Tambahkan Obat'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Alert */}
      <AlertDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteLoading}
        title="Nonaktifkan Obat?"
        description="Obat ini akan dinonaktifkan dari katalog resep poliklinik. Riwayat resep dan mutasi stok terdahulu tetap terjaga."
        confirmText="Ya, Nonaktifkan"
        cancelText="Batal"
        variant="danger"
      />
    </div>
  );
};
