import React from 'react';
import {
  Users,
  Clock,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
  Activity,
  ArrowUpRight,
  UserPlus,
  Stethoscope,
  Pill,
  CreditCard,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { formatIDR } from '../utils/formatters';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  // Realistic KPI Stats
  const stats = [
    {
      title: 'Total Kunjungan Hari Ini',
      value: '48',
      desc: '+12% dibanding kemarin',
      icon: Users,
      color: 'text-teal-600 bg-teal-50 border-teal-100',
    },
    {
      title: 'Pasien Menunggu',
      value: '5',
      desc: 'Antrean poli aktif',
      icon: Clock,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
    },
    {
      title: 'Pasien Selesai',
      value: '37',
      desc: 'Pelayanan tuntas',
      icon: CheckCircle2,
      color: 'text-green-600 bg-green-50 border-green-100',
    },
    {
      title: 'Pendapatan Hari Ini',
      value: formatIDR(12450000),
      desc: 'Kasir & Non-Tunai',
      icon: DollarSign,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      title: 'Tagihan Belum Lunas',
      value: formatIDR(850000),
      desc: '3 Invoice pending',
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-50 border-red-100',
    },
    {
      title: 'Jumlah Tindakan',
      value: '62',
      desc: 'Tercatat di sistem',
      icon: Activity,
      color: 'text-blue-600 bg-blue-50 border-blue-100',
    },
  ];

  // Realistic Today's Worklist Preview
  const queueData = [
    {
      no: 'A001',
      patient: 'Bambang Pamungkas',
      mr: 'RM-202611-00001',
      poly: 'Poli Penyakit Dalam',
      doctor: 'dr. Budi Santoso, Sp.PD',
      status: 'IN_EXAMINATION',
      time: '08:30 WIB',
    },
    {
      no: 'A002',
      patient: 'Siti Nurhaliza',
      mr: 'RM-202611-00002',
      poly: 'Poli Penyakit Dalam',
      doctor: 'dr. Budi Santoso, Sp.PD',
      status: 'WAITING',
      time: '08:45 WIB',
    },
    {
      no: 'B001',
      patient: 'Muhammad Rizky',
      mr: 'RM-202611-00005',
      poly: 'Poli Anak',
      doctor: 'dr. Anisa Rahma, Sp.A',
      status: 'WAITING_PHARMACY',
      time: '09:00 WIB',
    },
    {
      no: 'C001',
      patient: 'Dewi Lestari',
      mr: 'RM-202611-00004',
      poly: 'Poli Kebidanan & Kandungan',
      doctor: 'dr. Citra Lestari, Sp.OG',
      status: 'READY_FOR_BILLING',
      time: '09:15 WIB',
    },
    {
      no: 'A003',
      patient: 'Hendra Gunawan',
      mr: 'RM-202611-00003',
      poly: 'Poli Penyakit Dalam',
      doctor: 'dr. Budi Santoso, Sp.PD',
      status: 'COMPLETED',
      time: '08:00 WIB',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Selamat Datang, {user?.full_name || 'Petugas SIMRS'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Berikut ringkasan aktivitas pelayanan rawat jalan terintegrasi hari ini.
          </p>
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-2">
          {user?.role === 'REGISTRATION' && (
            <Button size="sm" leftIcon={<UserPlus className="w-4 h-4" />}>
              Pendaftaran Baru
            </Button>
          )}
          {user?.role === 'DOCTOR' && (
            <Button size="sm" leftIcon={<Stethoscope className="w-4 h-4" />}>
              Panggil Pasien Berikutnya
            </Button>
          )}
          {user?.role === 'PHARMACY' && (
            <Button size="sm" leftIcon={<Pill className="w-4 h-4" />}>
              Verifikasi Resep
            </Button>
          )}
          {user?.role === 'CASHIER' && (
            <Button size="sm" leftIcon={<CreditCard className="w-4 h-4" />}>
              Proses Pembayaran
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, idx) => (
          <Card key={idx} hoverable className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <span className="text-xs font-medium text-slate-500">{stat.title}</span>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">{stat.value}</div>
                <span className="inline-flex items-center text-[11px] font-medium text-slate-400">
                  {stat.desc}
                </span>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Real-time Worklist Table / Card View */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Aktivitas Pelayanan Pasien Terbaru</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">Antrean pasien rawat jalan hari ini</p>
          </div>
          <span className="text-xs font-semibold text-teal-600 flex items-center gap-1 cursor-pointer hover:underline">
            Lihat Semua Antrean <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </CardHeader>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">No. Antrean</th>
                <th className="py-3 px-4">Nama Pasien / No. RM</th>
                <th className="py-3 px-4">Poliklinik & Dokter</th>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {queueData.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{item.no}</td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{item.patient}</div>
                    <div className="text-xs text-slate-400">{item.mr}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-slate-800">{item.poly}</div>
                    <div className="text-xs text-slate-500">{item.doctor}</div>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-500">{item.time}</td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Button variant="ghost" size="sm" className="h-8 px-2.5">
                      Detail
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card Stacking View (Responsive Reflow to Prevent Horizontal Scroll) */}
        <div className="block md:hidden divide-y divide-slate-100 -mx-5 -mb-5">
          {queueData.map((item, idx) => (
            <div key={idx} className="p-4 space-y-2.5 hover:bg-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 font-bold text-xs flex items-center justify-center">
                    {item.no}
                  </span>
                  <div>
                    <span className="font-semibold text-sm text-slate-900 block">{item.patient}</span>
                    <span className="text-[11px] text-slate-400">{item.mr}</span>
                  </div>
                </div>
                <StatusBadge status={item.status} />
              </div>
              <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">
                <span className="font-medium text-slate-800">{item.poly}</span> • {item.doctor}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
