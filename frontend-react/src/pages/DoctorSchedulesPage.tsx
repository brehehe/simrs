import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Search,
  Filter,
  Clock,
  User,
  Building2,
  Users,
  RefreshCw,
  CheckCircle2,
  Calendar,
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

interface DoctorSchedule {
  id: string;
  doctor_id: string;
  doctor_name: string;
  polyclinic_id: string;
  polyclinic_name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  quota: number;
}

interface Polyclinic {
  id: string;
  code: string;
  name: string;
  queue_prefix: string;
}

interface MedicalStaff {
  id: string;
  full_name: string;
  staff_type: string;
  polyclinic_id: string;
}

const DAYS_MAP: Record<number, string> = {
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
  7: 'Minggu',
};

export const DoctorSchedulesPage: React.FC = () => {
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [polyclinics, setPolyclinics] = useState<Polyclinic[]>([]);
  const [doctors, setDoctors] = useState<MedicalStaff[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPoly, setSelectedPoly] = useState<string>('ALL');
  const [selectedDay, setSelectedDay] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState<boolean>(false);

  // Form Fields
  const [formData, setFormData] = useState({
    doctor_id: '',
    polyclinic_id: '',
    day_of_week: 1,
    start_time: '08:00',
    end_time: '12:00',
    quota: 30,
  });

  // Delete Alert
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resSched, resPoly, resStaff] = await Promise.all([
        api.get('/doctor-schedules'),
        api.get('/polyclinics'),
        api.get('/medical-staff'),
      ]);
      setSchedules(resSched.data?.data || []);
      setPolyclinics(resPoly.data?.data || []);
      setDoctors((resStaff.data?.data || []).filter((s: MedicalStaff) => s.staff_type === 'DOCTOR'));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat data jadwal dokter.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setCurrentId(null);
    setFormData({
      doctor_id: doctors[0]?.id || '',
      polyclinic_id: polyclinics[0]?.id || '',
      day_of_week: 1,
      start_time: '08:00',
      end_time: '12:00',
      quota: 30,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: DoctorSchedule) => {
    setIsEditing(true);
    setCurrentId(s.id);
    setFormData({
      doctor_id: s.doctor_id,
      polyclinic_id: s.polyclinic_id,
      day_of_week: Number(s.day_of_week),
      start_time: s.start_time?.slice(0, 5) || '08:00',
      end_time: s.end_time?.slice(0, 5) || '12:00',
      quota: Number(s.quota) || 30,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.doctor_id || !formData.polyclinic_id || !formData.start_time || !formData.end_time) {
      toast.error('Seluruh kolom formulir jadwal dokter wajib diisi.');
      return;
    }

    setFormLoading(true);
    try {
      if (isEditing && currentId) {
        await api.put(`/doctor-schedules/${currentId}`, formData);
        toast.success('Jadwal dokter berhasil diperbarui.');
      } else {
        await api.post('/doctor-schedules', formData);
        toast.success('Jadwal dokter baru berhasil ditambahkan.');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan jadwal dokter.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/doctor-schedules/${deleteId}`);
      toast.success('Jadwal dokter berhasil dihapus.');
      setIsDeleteOpen(false);
      setDeleteId(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus jadwal dokter.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredSchedules = schedules.filter((s) => {
    if (selectedPoly !== 'ALL' && s.polyclinic_id !== selectedPoly) return false;
    if (selectedDay !== 'ALL' && s.day_of_week.toString() !== selectedDay) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        s.doctor_name?.toLowerCase().includes(q) ||
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
            <CalendarCheck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Jadwal Praktik Dokter Poliklinik
            </h1>
            <p className="text-xs sm:text-sm text-teal-200 mt-0.5">
              Alokasi hari jaga, jam pelayanan, dan kuota pasien dokter spesialis rawat jalan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
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
            Tambah Jadwal
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border-l-4 border-l-teal-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Total Sesi Praktik</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{schedules.length} Sesi</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-indigo-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Poliklinik Aktif</p>
              <h3 className="text-2xl font-bold text-indigo-600 mt-1">{polyclinics.length} Unit</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Kapasitas Pelayanan</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                {schedules.reduce((acc, curr) => acc + (Number(curr.quota) || 0), 0)} Pasien / Hari
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
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
              placeholder="Cari nama dokter atau poli..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedPoly}
              onChange={(e) => setSelectedPoly(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">Semua Poliklinik</option>
              {polyclinics.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">Semua Hari</option>
              {Object.entries(DAYS_MAP).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Schedules Table */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Daftar Jadwal Praktik ({filteredSchedules.length} Sesi)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Hari Praktik</th>
                <th className="py-3 px-4">Nama Dokter Spesialis</th>
                <th className="py-3 px-4">Unit Poliklinik</th>
                <th className="py-3 px-4">Jam Layanan</th>
                <th className="py-3 px-4">Kuota Pasien</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSchedules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    Tidak ada jadwal praktik dokter yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredSchedules.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                        {DAYS_MAP[s.day_of_week] || `Hari ${s.day_of_week}`}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      {s.doctor_name}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <span className="font-medium">{s.polyclinic_name}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)} WIB
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {s.quota} Pasien / Hari
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Aktif
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(s)}
                          className="p-1.5 text-slate-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors border border-slate-200"
                          title="Edit Jadwal"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteId(s.id);
                            setIsDeleteOpen(true);
                          }}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200"
                          title="Hapus Jadwal"
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
        title={isEditing ? 'Edit Jadwal Praktik Dokter' : 'Tambah Jadwal Praktik Baru'}
        description="Atur penugasan dokter spesialis, poliklinik, jam pelayanan, dan kuota harian."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Dokter Spesialis <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={formData.doctor_id}
              onChange={(e) => setFormData({ ...formData, doctor_id: e.target.value })}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Pilih Dokter Spesialis</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Unit Poliklinik <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={formData.polyclinic_id}
              onChange={(e) => setFormData({ ...formData, polyclinic_id: e.target.value })}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Pilih Unit Poliklinik</option>
              {polyclinics.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hari Pelayanan <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.day_of_week}
                onChange={(e) => setFormData({ ...formData, day_of_week: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {Object.entries(DAYS_MAP).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kuota Pasien / Hari <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={200}
                required
                value={formData.quota}
                onChange={(e) => setFormData({ ...formData, quota: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jam Mulai Praktik <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                required
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jam Selesai Praktik <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                required
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
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
              {isEditing ? 'Simpan Perubahan' : 'Tambahkan Jadwal'}
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
        title="Hapus Jadwal Praktik Dokter?"
        description="Jadwal praktik ini akan dihapus permanen dari sistem kalender pendaftaran poliklinik."
        confirmText="Ya, Hapus Jadwal"
        cancelText="Batal"
        variant="danger"
      />
    </div>
  );
};
