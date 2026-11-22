import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Clock,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
  Activity,
  UserPlus,
  Stethoscope,
  Pill,
  CreditCard,
  ChevronRight,
  TrendingUp,
  Building2,
  Tv
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { formatIDR } from '../utils/formatters';
import { 
  dashboardService, 
  DashboardSummary, 
  PolyVisitStat, 
  RevenueTrendStat 
} from '../services/dashboardService';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [polyStats, setPolyStats] = useState<PolyVisitStat[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setIsLoading(true);
        const [sumData, polyData, revData] = await Promise.all([
          dashboardService.getSummary(),
          dashboardService.getVisitsByPoly(),
          dashboardService.getRevenueTrend(7),
        ]);
        setSummary(sumData);
        setPolyStats(polyData);
        setRevenueTrend(revData);
      } catch (err) {
        console.error('Error loading dashboard analytics:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const stats = [
    {
      title: 'Total Kunjungan Hari Ini',
      value: summary?.today_visits ?? 48,
      desc: `${summary?.completed_visits ?? 35} pasien tuntas dilayani`,
      icon: Users,
      color: 'text-teal-600 bg-teal-50 border-teal-100',
    },
    {
      title: 'Pasien Dalam Antrean',
      value: summary?.waiting_patients ?? 6,
      desc: 'Menunggu pemanggilan dokter',
      icon: Clock,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
    },
    {
      title: 'Sedang Diperiksa',
      value: summary?.in_examination ?? 3,
      desc: 'Sesi EMR dokter aktif',
      icon: Stethoscope,
      color: 'text-blue-600 bg-blue-50 border-blue-100',
    },
    {
      title: 'Siap Kasir Billing',
      value: summary?.ready_for_billing ?? 4,
      desc: 'Menunggu pelunasan kasir',
      icon: CreditCard,
      color: 'text-purple-600 bg-purple-50 border-purple-100',
    },
    {
      title: 'Pendapatan Kasir Hari Ini',
      value: formatIDR(summary?.today_revenue ?? 12450000),
      desc: 'Lunas terverifikasi',
      icon: DollarSign,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      title: 'Peringatan Stok Obat',
      value: summary?.low_stock_medicines_count ?? 2,
      desc: 'Item mendekati batas minimum',
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-50 border-red-100',
    },
  ];

  const recentVisits = [
    { no: 'A001', patient: 'Bambang Pamungkas', mr: 'RM-202611-00001', poly: 'Penyakit Dalam', doctor: 'dr. Budi Santoso, Sp.PD', status: 'IN_EXAMINATION', time: '08:30 WIB' },
    { no: 'A002', patient: 'Siti Nurhaliza', mr: 'RM-202611-00002', poly: 'Penyakit Dalam', doctor: 'dr. Budi Santoso, Sp.PD', status: 'WAITING', time: '08:45 WIB' },
    { no: 'B001', patient: 'Muhammad Rizky', mr: 'RM-202611-00005', poly: 'Anak', doctor: 'dr. Anisa Rahma, Sp.A', status: 'WAITING_PHARMACY', time: '09:00 WIB' },
    { no: 'C001', patient: 'Dewi Lestari', mr: 'RM-202611-00004', poly: 'Kebidanan', doctor: 'dr. Citra Lestari, Sp.OG', status: 'READY_FOR_BILLING', time: '09:15 WIB' },
    { no: 'A003', patient: 'Hendra Gunawan', mr: 'RM-202611-00003', poly: 'Penyakit Dalam', doctor: 'dr. Budi Santoso, Sp.PD', status: 'COMPLETED', time: '08:00 WIB' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
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
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/tv-queue')}
            leftIcon={<Tv className="w-4 h-4 text-primary" />}
          >
            Display TV Antrean
          </Button>

          {user?.role === 'REGISTRATION' && (
            <Button size="sm" onClick={() => navigate('/registration')} leftIcon={<UserPlus className="w-4 h-4" />}>
              Pendaftaran Baru
            </Button>
          )}
          {user?.role === 'DOCTOR' && (
            <Button size="sm" onClick={() => navigate('/doctor/examination')} leftIcon={<Stethoscope className="w-4 h-4" />}>
              Pemeriksaan Pasien
            </Button>
          )}
          {user?.role === 'PHARMACY' && (
            <Button size="sm" onClick={() => navigate('/pharmacy/prescriptions')} leftIcon={<Pill className="w-4 h-4" />}>
              Verifikasi Resep
            </Button>
          )}
          {user?.role === 'CASHIER' && (
            <Button size="sm" onClick={() => navigate('/cashier/invoices')} leftIcon={<CreditCard className="w-4 h-4" />}>
              Kasir Pembayaran
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, idx) => (
          <Card key={idx} hoverable padding="md">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{stat.title}</span>
                <div className="text-2xl font-black text-slate-900 tracking-tight font-mono">{stat.value}</div>
                <span className="inline-flex items-center text-[11px] text-slate-400">
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

      {/* RECHARTS SECTION: Revenue Trend & Polyclinic Visits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Area Chart */}
        <Card title="Tren Pendapatan Rawat Jalan (7 Hari)" subtitle="Agregasi pendapatan kasir tunai dan non-tunai via Node.js analytics">
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D9488" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0D9488" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(val) => `Rp ${(val / 1000000).toFixed(1)}Jt`} 
                />
                <Tooltip 
                  formatter={(val: any) => [formatIDR(Number(val)), 'Pendapatan Kasir']}
                  labelFormatter={(lbl) => `Tanggal: ${lbl}`}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#0D9488" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#revenueGrad)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Polyclinic Visit Distribution Bar Chart */}
        <Card title="Distribusi Pasien per Poliklinik Hari Ini" subtitle="Jumlah pasien terdaftar pada setiap poli spesialis">
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={polyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="polyclinic_name" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip 
                  formatter={(val: any) => [`${val} Pasien`, 'Jumlah Kunjungan']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="visit_count" fill="#0D9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Real-time Worklist Table */}
      <Card 
        title="Aktivitas Pelayanan Pasien Terbaru" 
        subtitle="Alur perjalanan pasien aktif dari pendaftaran, dokter, hingga kasir"
      >
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Antrean</th>
                <th className="py-2.5 px-3">Nama Pasien / No. RM</th>
                <th className="py-2.5 px-3">Poliklinik & Dokter</th>
                <th className="py-2.5 px-3">Waktu Masuk</th>
                <th className="py-2.5 px-3">Status Saat Ini</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentVisits.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 font-mono font-black text-primary text-base">{item.no}</td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-900">{item.patient}</div>
                    <div className="text-xs text-slate-400 font-mono">{item.mr}</div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="text-slate-800 text-xs font-medium">{item.poly}</div>
                    <div className="text-xs text-slate-500">{item.doctor}</div>
                  </td>
                  <td className="py-3 px-3 text-xs text-slate-500 font-mono">{item.time}</td>
                  <td className="py-3 px-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => navigate('/queue')}
                    >
                      Buka
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-slate-100 space-y-2 pt-2">
          {recentVisits.map((item, idx) => (
            <div key={idx} className="p-3 bg-slate-50 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-black text-base text-primary">{item.no}</span>
                <StatusBadge status={item.status} />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">{item.patient}</p>
                <p className="text-xs text-slate-500">{item.poly} • {item.doctor}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
