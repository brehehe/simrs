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
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
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
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPoly, setSelectedPoly] = useState<string>('ALL');
  const [selectedDay, setSelectedDay] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resSched, resPoly] = await Promise.all([
        api.get('/doctor-schedules'),
        api.get('/polyclinics'),
      ]);
      setSchedules(resSched.data?.data || []);
      setPolyclinics(resPoly.data?.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat data jadwal dokter.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={loading}
          className="bg-white/10 hover:bg-white/20 text-white border-white/20 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Segarkan Data
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border-l-4 border-l-teal-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Total Sesi Praktik</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{schedules.length}</h3>
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
              <h3 className="text-2xl font-bold text-indigo-600 mt-1">{polyclinics.length}</h3>
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
                {schedules.reduce((acc, curr) => acc + (curr.quota || 0), 0)} Pasien
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSchedules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
