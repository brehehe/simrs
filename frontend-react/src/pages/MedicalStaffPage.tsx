import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Search,
  CheckCircle2,
  RefreshCw,
  Award,
  Building2,
  Filter,
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

interface MedicalStaff {
  id: string;
  user_id?: string;
  staff_type: string;
  sip_number: string;
  full_name: string;
  polyclinic_id?: string;
  polyclinic_name?: string;
}

interface Polyclinic {
  id: string;
  code: string;
  name: string;
}

export const MedicalStaffPage: React.FC = () => {
  const [staffList, setStaffList] = useState<MedicalStaff[]>([]);
  const [polyclinics, setPolyclinics] = useState<Polyclinic[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState<boolean>(false);

  // Form Fields
  const [formData, setFormData] = useState({
    full_name: '',
    staff_type: 'DOCTOR',
    sip_number: '',
    polyclinic_id: '',
  });

  // Delete Alert
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const [resStaff, resPoly] = await Promise.all([
        api.get('/medical-staff'),
        api.get('/polyclinics'),
      ]);
      setStaffList(resStaff.data?.data || []);
      setPolyclinics(resPoly.data?.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat data staf medis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({
      full_name: '',
      staff_type: 'DOCTOR',
      sip_number: '',
      polyclinic_id: polyclinics[0]?.id || '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (staff: MedicalStaff) => {
    setIsEditing(true);
    setCurrentId(staff.id);
    setFormData({
      full_name: staff.full_name,
      staff_type: staff.staff_type,
      sip_number: staff.sip_number || '',
      polyclinic_id: staff.polyclinic_id || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim() || !formData.sip_number.trim()) {
      toast.error('Nama lengkap dan nomor SIP wajib diisi.');
      return;
    }

    setFormLoading(true);
    try {
      if (isEditing && currentId) {
        await api.put(`/medical-staff/${currentId}`, formData);
        toast.success('Data tenaga medis berhasil diperbarui.');
      } else {
        await api.post('/medical-staff', formData);
        toast.success('Tenaga medis baru berhasil ditambahkan.');
      }
      setIsModalOpen(false);
      fetchStaff();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan data tenaga medis.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/medical-staff/${deleteId}`);
      toast.success('Tenaga medis berhasil dinonaktifkan.');
      setIsDeleteOpen(false);
      setDeleteId(null);
      fetchStaff();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus tenaga medis.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filtered = staffList.filter((s) => {
    if (typeFilter !== 'ALL' && s.staff_type !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        s.full_name?.toLowerCase().includes(q) ||
        s.sip_number?.toLowerCase().includes(q) ||
        s.polyclinic_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-teal-500/20 backdrop-blur-md rounded-2xl border border-teal-400/30 text-teal-300">
            <Stethoscope className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Data Dokter & Tenaga Medis (DPJP)
            </h1>
            <p className="text-xs sm:text-sm text-teal-200 mt-0.5">
              Daftar Dokter Penanggung Jawab Pelayanan, nomor Surat Izin Praktik (SIP), dan penugasan poliklinik
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStaff}
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
            Tambah Tenaga Medis
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama dokter, No. SIP, atau spesialisasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-slate-500">Tipe Staf:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">Semua Tenaga Medis</option>
              <option value="DOCTOR">Dokter Spesialis</option>
              <option value="NURSE">Perawat</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Staff Table */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Daftar Tenaga Medis Terdaftar ({filtered.length} Staf)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Nama Lengkap & Gelar</th>
                <th className="py-3 px-4">Tipe Profesi</th>
                <th className="py-3 px-4">Nomor SIP (Surat Izin Praktik)</th>
                <th className="py-3 px-4">Penugasan Poliklinik</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    Tidak ada staf medis yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filtered.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{staff.full_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">ID: {staff.id.slice(0, 8)}...</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-100 text-teal-800 border border-teal-200">
                        {staff.staff_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {staff.sip_number || <span className="text-slate-400">-</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium">
                      {staff.polyclinic_name || <span className="text-slate-400">Semua Unit</span>}
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
                          onClick={() => handleOpenEdit(staff)}
                          className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors border border-slate-200"
                          title="Edit Staf Medis"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteId(staff.id);
                            setIsDeleteOpen(true);
                          }}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200"
                          title="Nonaktifkan Staf Medis"
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
        title={isEditing ? 'Edit Tenaga Medis (DPJP)' : 'Tambah Tenaga Medis Baru'}
        description="Kelola dokter penanggung jawab pelayanan atau perawat klinik rawat jalan."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Lengkap beserta Gelar <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: dr. Bambang Sudiro, Sp.A"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipe Profesi <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.staff_type}
                onChange={(e) => setFormData({ ...formData, staff_type: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="DOCTOR">Dokter Spesialis (DPJP)</option>
                <option value="NURSE">Perawat Klinik</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor Surat Izin Praktik (SIP) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: SIP-503/2026/011"
                value={formData.sip_number}
                onChange={(e) => setFormData({ ...formData, sip_number: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Penugasan Poliklinik Utama
            </label>
            <select
              value={formData.polyclinic_id}
              onChange={(e) => setFormData({ ...formData, polyclinic_id: e.target.value })}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Semua Unit Poliklinik</option>
              {polyclinics.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
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
              {isEditing ? 'Simpan Perubahan' : 'Tambahkan Staf Medis'}
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
        title="Nonaktifkan Tenaga Medis?"
        description="Tenaga medis ini akan dinonaktifkan dari jadwal dan pelayanan dokter baru. Riwayat rekam medis terdahulu tetap terjaga."
        confirmText="Ya, Nonaktifkan"
        cancelText="Batal"
        variant="danger"
      />
    </div>
  );
};
