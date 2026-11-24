import React, { useState, useEffect } from 'react';
import {
  Activity,
  Search,
  CheckCircle2,
  RefreshCw,
  Coins,
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { AlertDialog } from '../components/ui/AlertDialog';
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

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState<boolean>(false);

  // Form Fields
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    base_price: 50000,
  });

  // Delete Alert
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

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

  const handleOpenCreate = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({ code: '', name: '', base_price: 50000 });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (proc: MedicalProcedure) => {
    setIsEditing(true);
    setCurrentId(proc.id);
    setFormData({
      code: proc.code,
      name: proc.name,
      base_price: typeof proc.base_price === 'string' ? parseFloat(proc.base_price) : proc.base_price,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.base_price < 0) {
      toast.error('Nama tindakan dan tarif dasar wajib diisi dengan benar.');
      return;
    }
    if (!isEditing && !formData.code.trim()) {
      toast.error('Kode tindakan wajib diisi.');
      return;
    }

    setFormLoading(true);
    try {
      if (isEditing && currentId) {
        await api.put(`/medical-procedures/${currentId}`, {
          name: formData.name.trim(),
          base_price: Number(formData.base_price),
        });
        toast.success('Tarif tindakan medis berhasil diperbarui.');
      } else {
        await api.post('/medical-procedures', {
          code: formData.code.toUpperCase().trim(),
          name: formData.name.trim(),
          base_price: Number(formData.base_price),
        });
        toast.success('Tindakan medis baru berhasil ditambahkan.');
      }
      setIsModalOpen(false);
      fetchProcedures();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan data tindakan.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/medical-procedures/${deleteId}`);
      toast.success('Tindakan medis berhasil dinonaktifkan.');
      setIsDeleteOpen(false);
      setDeleteId(null);
      fetchProcedures();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus tindakan.');
    } finally {
      setDeleteLoading(false);
    }
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
          {/* <div className="p-3 bg-teal-500/20 backdrop-blur-md rounded-2xl border border-teal-400/30 text-teal-300">
            <Activity className="w-8 h-8" />
          </div> */}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Master Tindakan & Tarif Pelayanan
            </h1>
            <p className="text-xs sm:text-sm text-teal-200 mt-0.5">
              Standar tarif pelayanan medis, tindakan poliklinik, dan integritas snapshot finansial
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProcedures}
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
            Tambah Tindakan
          </Button>
        </div>
      </div>

      {/* Critical Case 4 Info Callout */}
      {/* <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-start gap-3 text-xs text-teal-900">
        <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-teal-950">
            Prinsip Immutabilitas Tarif Historis (Critical Case 4 Mitigation)
          </p>
          <p className="text-teal-700 mt-0.5">
            Saat dokter mencatat tindakan medis, nilai tarif di-snapshot secara permanen ke tabel <code>visit_procedures</code> dan <code>invoice_items</code>. Perubahan tarif pada tabel master tindakan tidak akan pernah memutasi data invoice pasien terdahulu.
          </p>
        </div>
      </div> */}

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
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">
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
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(proc)}
                          className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors border border-slate-200"
                          title="Edit Tarif"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteId(proc.id);
                            setIsDeleteOpen(true);
                          }}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200"
                          title="Nonaktifkan Tindakan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Create / Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Edit Tindakan & Tarif' : 'Tambah Tindakan Medis Baru'}
        description="Pengaturan tarif dasar tindakan dokter dan perawat poliklinik rawat jalan."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kode Tindakan <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={isEditing}
              placeholder="Contoh: PROC-EKG"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className={`w-full px-3 py-2 text-xs sm:text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono ${isEditing ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-300'
                }`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Tindakan Medis <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Pemeriksaan Elektrokardiografi (EKG 12-Lead)"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tarif Dasar (Rupiah) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min={0}
              step={1000}
              required
              placeholder="Contoh: 125000"
              value={formData.base_price}
              onChange={(e) => setFormData({ ...formData, base_price: Number(e.target.value) })}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
            />
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
              {isEditing ? 'Simpan Perubahan' : 'Tambahkan Tindakan'}
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
        title="Nonaktifkan Tindakan Medis?"
        description="Tindakan ini tidak akan muncul pada pilihan tindakan dokter baru. Catatan invoice historis tetap utuh."
        confirmText="Ya, Nonaktifkan"
        cancelText="Batal"
        variant="danger"
      />
    </div>
  );
};
