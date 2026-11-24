import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  Search,
  CheckCircle2,
  RefreshCw,
  Key,
  Mail,
  UserCheck,
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

interface UserItem {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role_code: string;
  role_name: string;
  is_active: boolean;
  created_at: string;
}

const ROLES_OPTIONS = [
  { code: 'ADMIN', name: 'Administrator' },
  { code: 'REGISTRATION', name: 'Pendaftaran' },
  { code: 'DOCTOR', name: 'Dokter' },
  { code: 'PHARMACY', name: 'Farmasi' },
  { code: 'LABORATORY', name: 'Laboratorium' },
  { code: 'CASHIER', name: 'Kasir' },
];

export const UsersManagementPage: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState<boolean>(false);

  // Form Fields
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    role_code: 'REGISTRATION',
    password: '',
  });

  // Delete Alert
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data?.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat data pengguna sistem.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({
      username: '',
      full_name: '',
      email: '',
      role_code: 'REGISTRATION',
      password: 'Password123!',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: UserItem) => {
    setIsEditing(true);
    setCurrentId(user.id);
    setFormData({
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      role_code: user.role_code,
      password: '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      toast.error('Nama lengkap wajib diisi.');
      return;
    }
    if (!isEditing && !formData.username.trim()) {
      toast.error('Username wajib diisi.');
      return;
    }

    setFormLoading(true);
    try {
      if (isEditing && currentId) {
        const payload: any = {
          full_name: formData.full_name.trim(),
          email: formData.email.trim(),
          role_code: formData.role_code,
        };
        if (formData.password.trim()) {
          payload.password = formData.password.trim();
        }
        await api.put(`/users/${currentId}`, payload);
        toast.success('Data pengguna berhasil diperbarui.');
      } else {
        await api.post('/users', {
          username: formData.username.toLowerCase().trim(),
          full_name: formData.full_name.trim(),
          email: formData.email.trim() || `${formData.username.toLowerCase().trim()}@simrs.hospital.id`,
          role_code: formData.role_code,
          password: formData.password.trim() || 'Password123!',
        });
        toast.success('Pengguna baru berhasil ditambahkan.');
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan data pengguna.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/users/${deleteId}`);
      toast.success('Pengguna berhasil dinonaktifkan.');
      setIsDeleteOpen(false);
      setDeleteId(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus pengguna.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filtered = users.filter((u) => {
    if (roleFilter !== 'ALL' && u.role_code !== roleFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        u.username?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          {/* <div className="p-3 bg-teal-500/20 backdrop-blur-md rounded-2xl border border-teal-400/30 text-teal-300">
            <Users className="w-8 h-8" />
          </div> */}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Manajemen Pengguna & Otorisasi RBAC
            </h1>
            <p className="text-xs sm:text-sm text-teal-200 mt-0.5">
              Kelola akun staf rumah sakit dan pemetaan hak akses berbasis peran (Role-Based Access Control)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
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
            Tambah Pengguna
          </Button>
        </div>
      </div>

      {/* Info Callout */}
      {/* <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-start gap-3 text-xs text-teal-900">
        <Key className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-teal-950">
            Kredensial Pengujian Akun Sistem (Default Password)
          </p>
          <p className="text-teal-700 mt-0.5">
            Seluruh akun terdaftar memiliki password default: <code className="bg-white px-1.5 py-0.5 rounded font-bold border border-teal-300">Password123!</code> untuk keperluan evaluasi teknis dan pengujian alur terintegrasi.
          </p>
        </div>
      </div> */}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari username, nama lengkap, atau email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-slate-500">Peran:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">Semua Peran</option>
              <option value="ADMIN">Administrator</option>
              <option value="DOCTOR">Dokter</option>
              <option value="REGISTRATION">Pendaftaran</option>
              <option value="PHARMACY">Farmasi</option>
              <option value="LABORATORY">Laboratorium</option>
              <option value="CASHIER">Kasir</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Daftar Akun Pengguna ({filtered.length} Akun)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Hak Akses (Role)</th>
                <th className="py-3 px-4">Status Akun</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    Tidak ada akun pengguna yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {u.full_name}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-teal-800">
                      @{u.username}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {u.email}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {u.role_name || u.role_code}
                      </span>
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
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors border border-slate-200"
                          title="Edit Pengguna"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteId(u.id);
                            setIsDeleteOpen(true);
                          }}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200"
                          title="Nonaktifkan Pengguna"
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
        title={isEditing ? 'Edit Akun Pengguna' : 'Tambah Pengguna Baru'}
        description="Kelola identitas staf, peran RBAC, dan akses login ke sistem SIMRS."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Username <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={isEditing}
              placeholder="Contoh: dokter.budi"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
              className={`w-full px-3 py-2 text-xs sm:text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono ${isEditing ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed' : 'bg-white border-slate-300'
                }`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Lengkap <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: dr. Budi Santoso, Sp.PD"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Pengguna
              </label>
              <input
                type="email"
                placeholder="Contoh: budi@simrs.hospital.id"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hak Akses (Role) <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.role_code}
                onChange={(e) => setFormData({ ...formData, role_code: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {ROLES_OPTIONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password {isEditing ? '(Kosongkan jika tidak diubah)' : <span className="text-rose-500">*</span>}
            </label>
            <input
              type="password"
              placeholder={isEditing ? 'Biarkan kosong untuk mempertahankan password lama' : 'Default: Password123!'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
              {isEditing ? 'Simpan Perubahan' : 'Tambahkan Pengguna'}
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
        title="Nonaktifkan Akun Pengguna?"
        description="Akun ini tidak akan dapat login lagi ke dalam sistem SIMRS. Audit log aktivitas lampau tetap tercatat."
        confirmText="Ya, Nonaktifkan"
        cancelText="Batal"
        variant="danger"
      />
    </div>
  );
};
