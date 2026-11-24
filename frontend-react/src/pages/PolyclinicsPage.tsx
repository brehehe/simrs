import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  CheckCircle2,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  DoorOpen,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { AlertDialog } from '../components/ui/AlertDialog';
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

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState<boolean>(false);

  // Form Fields
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    queue_prefix: '',
  });

  // Delete Alert Dialog
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

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

  const handleOpenCreate = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({ code: '', name: '', queue_prefix: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (poly: Polyclinic) => {
    setIsEditing(true);
    setCurrentId(poly.id);
    setFormData({
      code: poly.code,
      name: poly.name,
      queue_prefix: poly.queue_prefix,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.queue_prefix.trim()) {
      toast.error('Nama poliklinik dan prefix antrean wajib diisi.');
      return;
    }
    if (!isEditing && !formData.code.trim()) {
      toast.error('Kode poliklinik wajib diisi.');
      return;
    }

    setFormLoading(true);
    try {
      if (isEditing && currentId) {
        await api.put(`/polyclinics/${currentId}`, {
          name: formData.name.trim(),
          queue_prefix: formData.queue_prefix.toUpperCase().trim(),
        });
        toast.success('Poliklinik berhasil diperbarui.');
      } else {
        await api.post('/polyclinics', {
          code: formData.code.toUpperCase().trim(),
          name: formData.name.trim(),
          queue_prefix: formData.queue_prefix.toUpperCase().trim(),
        });
        toast.success('Poliklinik baru berhasil ditambahkan.');
      }
      setIsModalOpen(false);
      fetchPolyclinics();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan data poliklinik.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/polyclinics/${deleteId}`);
      toast.success('Poliklinik berhasil dinonaktifkan.');
      setIsDeleteOpen(false);
      setDeleteId(null);
      fetchPolyclinics();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus poliklinik.');
    } finally {
      setDeleteLoading(false);
    }
  };

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
          {/* <div className="p-3 bg-teal-500/20 backdrop-blur-md rounded-2xl border border-teal-400/30 text-teal-300">
            <Building2 className="w-8 h-8" />
          </div> */}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Master Poliklinik & Ruang Layanan
            </h1>
            <p className="text-xs sm:text-sm text-teal-200 mt-0.5">
              Unit pelayanan rawat jalan terintegrasi, alokasi kode prefix antrean atomik
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPolyclinics}
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
            Tambah Poliklinik
          </Button>
        </div>
      </div>

      {/* Info Callout */}
      {/* <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-start gap-3 text-xs text-teal-900">
        <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-teal-950">Integritas Prefix Antrean Atomik</p>
          <p className="text-teal-700 mt-0.5">
            Prefix antrean poliklinik (misal: 'A' untuk Penyakit Dalam, 'B' untuk Anak) digunakan oleh mesin sequence counter PostgreSQL guna menjamin keunikan nomor antrean atomik per hari pelayanan.
          </p>
        </div>
      </div> */}

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
          <Card key={poly.id} className="p-5 hover:border-teal-300 transition-colors flex flex-col justify-between">
            <div>
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
                  <span className="font-semibold text-slate-800">Gedung Rawat Jalan</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handleOpenEdit(poly)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-teal-700 border border-slate-200 transition-colors flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteId(poly.id);
                  setIsDeleteOpen(true);
                }}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Hapus
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Edit Data Poliklinik' : 'Tambah Poliklinik Baru'}
        description="Pastikan data poliklinik dan kode prefix antrean sesuai standar SIMRS."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kode Poliklinik <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={isEditing}
              placeholder="Contoh: POLI-SARAF"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className={`w-full px-3 py-2 text-xs sm:text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono ${isEditing ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-300'
                }`}
            />
            {isEditing && (
              <p className="text-[10px] text-slate-400 mt-1">Kode poliklinik bersifat permanen dan tidak dapat diubah.</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Poliklinik <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Poliklinik Saraf & Otak"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Prefix Antrean (1 Karakter) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              maxLength={2}
              required
              placeholder="Contoh: G"
              value={formData.queue_prefix}
              onChange={(e) => setFormData({ ...formData, queue_prefix: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono uppercase"
            />
            <p className="text-[10px] text-slate-500 mt-1">Digunakan untuk penomoran tiket antrean pasien (misal: G001, G002).</p>
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
              {isEditing ? 'Simpan Perubahan' : 'Tambahkan Poliklinik'}
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
        title="Nonaktifkan Poliklinik?"
        description="Poliklinik ini akan dinonaktifkan dari sistem pendaftaran rawat jalan. Riwayat transaksi terdahulu tetap terjaga."
        confirmText="Ya, Nonaktifkan"
        cancelText="Batal"
        variant="danger"
      />
    </div>
  );
};
