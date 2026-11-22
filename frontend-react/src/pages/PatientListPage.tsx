import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Search, 
  UserPlus, 
  Phone, 
  MapPin, 
  Calendar, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { StatusBadge } from '../components/ui/StatusBadge';
import { TableSkeleton } from '../components/ui/Skeleton';
import { patientService, Patient } from '../services/patientService';

export const PatientListPage: React.FC = () => {
  const navigate = useNavigate();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // New Patient Modal Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    nik: '',
    full_name: '',
    birth_date: '1990-01-01',
    gender: 'MALE' as 'MALE' | 'FEMALE',
    phone: '',
    address: '',
  });

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchPatients = async () => {
    try {
      setIsLoading(true);
      const res = await patientService.getPatients(debouncedSearch);
      setPatients(res.items);
    } catch {
      toast.error('Gagal mengambil daftar pasien rekam medis.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [debouncedSearch]);

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.nik.length !== 16 || !/^\d+$/.test(formData.nik)) {
      toast.error('NIK wajib 16 digit angka valid sesuai KTP.');
      return;
    }
    if (!formData.full_name.trim()) {
      toast.error('Nama lengkap pasien wajib diisi.');
      return;
    }

    try {
      setIsSubmitting(true);
      const newPatient = await patientService.createPatient(formData);
      toast.success(`Pasien berhasil didaftarkan! No. RM: ${newPatient.mr_number}`);
      setIsModalOpen(false);
      setFormData({
        nik: '',
        full_name: '',
        birth_date: '1990-01-01',
        gender: 'MALE',
        phone: '',
        address: '',
      });
      fetchPatients();
    } catch (err: any) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || err.message;
      if (status === 409) {
        toast.error('Pasien dengan NIK tersebut sudah terdaftar dalam sistem.');
      } else {
        toast.error(msg || 'Gagal mendaftarkan pasien baru.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-primary" />
            Data Pasien & Rekam Medis
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Kelola data master pasien, pencarian nomor rekam medis, dan pendaftaran pasien baru.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsModalOpen(true)}
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Tambah Pasien Baru
        </Button>
      </div>

      {/* Filter Toolbar */}
      <Card padding="md">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Cari berdasarkan No. RM, NIK, atau Nama Lengkap..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => fetchPatients()}
            className="shrink-0"
          >
            Segarkan Data
          </Button>
        </div>
      </Card>

      {/* Patient Table (Desktop) & Cards (Mobile) */}
      <Card padding="none">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={5} cols={6} />
          </div>
        ) : patients.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-semibold text-slate-800">Tidak ada data pasien ditemukan</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Coba gunakan kata kunci pencarian yang berbeda atau tambahkan data pasien baru.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              leftIcon={<UserPlus className="w-4 h-4" />}
            >
              Daftar Pasien Baru
            </Button>
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">No. Rekam Medis</th>
                    <th className="py-3 px-4">Nama Lengkap & NIK</th>
                    <th className="py-3 px-4">Gender & Tanggal Lahir</th>
                    <th className="py-3 px-4">Kontak / No. HP</th>
                    <th className="py-3 px-4">Alamat Domisili</th>
                    <th className="py-3 px-4 text-right">Aksi Pelayanan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patients.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-teal-800">
                        {p.mr_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{p.full_name}</div>
                        <div className="text-xs text-slate-400 font-mono">NIK: {p.nik}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mr-2 ${
                          p.gender === 'MALE' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                        }`}>
                          {p.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'}
                        </span>
                        <span className="text-xs text-slate-600">{p.birth_date}</span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-600">
                        {p.phone || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs truncate">
                        {p.address}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/patients/${p.id}/history`)}
                          >
                            Riwayat EMR
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => navigate(`/registration?patient_id=${p.id}`)}
                            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                          >
                            Daftar Poli
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards Reflow */}
            <div className="md:hidden divide-y divide-slate-100 p-3 space-y-3">
              {patients.map((p) => (
                <div key={p.id} className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{p.full_name}</h4>
                      <p className="text-xs font-mono font-bold text-primary">{p.mr_number}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      p.gender === 'MALE' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                    }`}>
                      {p.gender === 'MALE' ? 'L' : 'P'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1">
                    <p className="font-mono">NIK: {p.nik}</p>
                    <p>Lahir: {p.birth_date}</p>
                    <p>Telp: {p.phone || '-'}</p>
                    <p className="text-slate-500 line-clamp-1">{p.address}</p>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 min-h-[44px]"
                      onClick={() => navigate(`/patients/${p.id}/history`)}
                    >
                      Riwayat EMR
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      className="flex-1 min-h-[44px]"
                      onClick={() => navigate(`/registration?patient_id=${p.id}`)}
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      Daftar Poli
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Modal Tambah Pasien Baru */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="lg"
        title="Registrasi Pasien Baru"
        description="Data pasien baru akan diterbitkan nomor rekam medis otomatis (format: RM-YYYYMM-XXXXX)."
      >
        <form onSubmit={handleCreatePatient} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Nomor Induk Kependudukan (NIK) <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="16 Digit NIK sesuai KTP..."
              maxLength={16}
              value={formData.nik}
              onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Nama Lengkap Pasien <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Nama lengkap sesuai identitas resmi..."
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tanggal Lahir <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Jenis Kelamin <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
              >
                <option value="MALE">Laki-laki</option>
                <option value="FEMALE">Perempuan</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Nomor Telepon / WhatsApp
            </label>
            <Input
              placeholder="081234567890..."
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Alamat Lengkap <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full p-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              rows={3}
              placeholder="Jalan, RT/RW, Kelurahan, Kecamatan, Kota..."
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              Simpan & Buat No. RM
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
