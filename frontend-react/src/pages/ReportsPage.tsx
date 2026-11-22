import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  FileText, 
  CreditCard, 
  Activity, 
  Pill, 
  Calendar, 
  Printer, 
  Download, 
  ArrowUpRight, 
  Filter, 
  CheckCircle2, 
  TrendingUp, 
  Users, 
  Building2,
  Stethoscope,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { apiClient } from '../services/api';
import { exportToExcel } from '../utils/excelExport';
import { exportTableToPdf } from '../utils/pdfExport';

type TabType = 'top_diagnoses' | 'financial' | 'visits' | 'medicines';

const COLORS = ['#0D9488', '#2563EB', '#F59E0B', '#10B981', '#6366F1', '#EC4899', '#8B5CF6'];

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('top_diagnoses');
  
  // Date range states
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // First day of current month
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(false);

  // Report data states
  const [topDiagnoses, setTopDiagnoses] = useState<any>(null);
  const [financialData, setFinancialData] = useState<any>(null);
  const [visitSummary, setVisitSummary] = useState<any>(null);
  const [medicineData, setMedicineData] = useState<any>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = { start_date: startDate, end_date: endDate };
      const [diagRes, finRes, visitRes, medRes] = await Promise.all([
        apiClient.get('/reports/top-diagnoses', { params }),
        apiClient.get('/reports/financial-reconciliation', { params }),
        apiClient.get('/reports/visit-summary', { params }),
        apiClient.get('/reports/medicine-usage', { params }),
      ]);

      setTopDiagnoses(diagRes.data?.data);
      setFinancialData(finRes.data?.data);
      setVisitSummary(visitRes.data?.data);
      setMedicineData(medRes.data?.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat data laporan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate]);

  const handlePrint = () => {
    window.print();
  };

  const handleQuickPeriod = (type: 'today' | '7days' | 'month') => {
    const today = new Date().toISOString().split('T')[0];
    if (type === 'today') {
      setStartDate(today);
      setEndDate(today);
    } else if (type === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(today);
    } else if (type === 'month') {
      const d = new Date();
      d.setDate(1);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(today);
    }
  };

  // Export to Excel (.xlsx) handler
  const handleExportExcel = () => {
    const periodLabel = `${startDate}_sd_${endDate}`;
    if (activeTab === 'top_diagnoses') {
      const items = (topDiagnoses?.items || []).map((d: any) => ({
        rank: d.rank,
        icd10: d.icd10_code,
        diagnosis_name: d.diagnosis_name,
        male: d.male_cases,
        female: d.female_cases,
        primary: d.primary_cases,
        total: d.total_cases,
        percentage: `${d.percentage}%`,
      }));

      exportToExcel(
        items,
        `Laporan_10_Besar_Penyakit_RL5.3_${periodLabel}`,
        'RL 5.3 Diagnosa',
        [
          { header: 'No', key: 'rank', width: 6 },
          { header: 'Kode ICD-10', key: 'icd10', width: 14 },
          { header: 'Nama Diagnosis / Penyakit', key: 'diagnosis_name', width: 35 },
          { header: 'Laki-Laki', key: 'male', width: 12 },
          { header: 'Perempuan', key: 'female', width: 12 },
          { header: 'Kasus Primer', key: 'primary', width: 14 },
          { header: 'Total Kasus', key: 'total', width: 14 },
          { header: 'Proporsi (%)', key: 'percentage', width: 14 },
        ]
      );
      toast.success('Laporan 10 Besar Penyakit (Excel) berhasil diunduh.');
    } else if (activeTab === 'financial') {
      const items = (financialData?.payment_methods || []).map((m: any) => ({
        method: m.method,
        count: m.count,
        amount: m.amount,
        percentage: `${m.percentage}%`,
      }));

      exportToExcel(
        items,
        `Laporan_Rekonsiliasi_Finansial_${periodLabel}`,
        'Rekonsiliasi Kasir',
        [
          { header: 'Metode Pembayaran', key: 'method', width: 22 },
          { header: 'Jumlah Transaksi', key: 'count', width: 18 },
          { header: 'Total Nominal (Rp)', key: 'amount', width: 22 },
          { header: 'Proporsi (%)', key: 'percentage', width: 14 },
        ]
      );
      toast.success('Laporan Rekonsiliasi Finansial (Excel) berhasil diunduh.');
    } else if (activeTab === 'visits') {
      const items = (visitSummary?.by_polyclinic || []).map((p: any) => ({
        polyclinic: p.name,
        total: p.total,
        completed: p.completed,
        percentage: `${p.percentage}%`,
      }));

      exportToExcel(
        items,
        `Laporan_Kunjungan_Poliklinik_${periodLabel}`,
        'Kunjungan Poli',
        [
          { header: 'Nama Poliklinik', key: 'polyclinic', width: 28 },
          { header: 'Total Kunjungan', key: 'total', width: 18 },
          { header: 'Kunjungan Selesai', key: 'completed', width: 18 },
          { header: 'Proporsi (%)', key: 'percentage', width: 14 },
        ]
      );
      toast.success('Laporan Kunjungan Poliklinik (Excel) berhasil diunduh.');
    } else if (activeTab === 'medicines') {
      const items = (medicineData?.items || []).map((m: any) => ({
        code: m.code,
        name: m.name,
        generic: m.generic_name,
        unit: m.unit,
        base_price: m.base_price,
        dispensed: m.total_dispensed,
        current_stock: m.current_stock,
        total_value: m.total_value,
      }));

      exportToExcel(
        items,
        `Laporan_Pemakaian_Obat_${periodLabel}`,
        'Pemakaian Obat',
        [
          { header: 'Kode Obat', key: 'code', width: 16 },
          { header: 'Nama Obat', key: 'name', width: 28 },
          { header: 'Nama Generik', key: 'generic', width: 25 },
          { header: 'Bentuk Sediaan', key: 'unit', width: 15 },
          { header: 'Tarif Dasar (Rp)', key: 'base_price', width: 18 },
          { header: 'Total Diserahkan', key: 'dispensed', width: 18 },
          { header: 'Sisa Stok Depo', key: 'current_stock', width: 15 },
          { header: 'Nilai Total (Rp)', key: 'total_value', width: 22 },
        ]
      );
      toast.success('Laporan Pemakaian Obat (Excel) berhasil diunduh.');
    }
  };

  // Export to PDF handler
  const handleExportPdf = () => {
    const periodLabel = `Periode Pelayanan: ${startDate} s/d ${endDate}`;
    if (activeTab === 'top_diagnoses') {
      const columns = ['No', 'Kode ICD-10', 'Diagnosis / Penyakit', 'Laki', 'Perempuan', 'Total', 'Proporsi'];
      const rows = (topDiagnoses?.items || []).map((d: any) => [
        d.rank,
        d.icd10_code,
        d.diagnosis_name,
        d.male_cases,
        d.female_cases,
        d.total_cases,
        `${d.percentage}%`,
      ]);
      exportTableToPdf(
        'LAPORAN 10 BESAR MORBIDITAS RAWAT JALAN (RL 5.3)',
        columns,
        rows,
        `Laporan_10_Besar_Penyakit_${startDate}_${endDate}`,
        periodLabel
      );
      toast.success('Berkas PDF 10 Besar Penyakit berhasil diunduh.');
    } else if (activeTab === 'financial') {
      const columns = ['Metode Pembayaran', 'Jumlah Transaksi', 'Total Diterima (Rp)', 'Proporsi'];
      const rows = (financialData?.payment_methods || []).map((m: any) => [
        m.method,
        m.count,
        `Rp ${new Intl.NumberFormat('id-ID').format(m.amount)}`,
        `${m.percentage}%`,
      ]);
      exportTableToPdf(
        'LAPORAN REKONSILIASI PENERIMAAN KASIR',
        columns,
        rows,
        `Laporan_Rekonsiliasi_Finansial_${startDate}_${endDate}`,
        periodLabel
      );
      toast.success('Berkas PDF Rekonsiliasi Finansial berhasil diunduh.');
    } else if (activeTab === 'visits') {
      const columns = ['Unit Poliklinik', 'Total Pasien', 'Layanan Selesai', 'Proporsi (%)'];
      const rows = (visitSummary?.by_polyclinic || []).map((p: any) => [
        p.name,
        p.total,
        p.completed,
        `${p.percentage}%`,
      ]);
      exportTableToPdf(
        'LAPORAN DISTRIBUSI KUNJUNGAN POLIKLINIK',
        columns,
        rows,
        `Laporan_Kunjungan_Poli_${startDate}_${endDate}`,
        periodLabel
      );
      toast.success('Berkas PDF Kunjungan Poliklinik berhasil diunduh.');
    } else if (activeTab === 'medicines') {
      const columns = ['Kode Obat', 'Nama Obat & Sediaan', 'Harga Satuan', 'Diserahkan', 'Sisa Stok', 'Nilai Total'];
      const rows = (medicineData?.items || []).map((m: any) => [
        m.code,
        `${m.name} (${m.unit})`,
        `Rp ${new Intl.NumberFormat('id-ID').format(m.base_price)}`,
        m.total_dispensed,
        m.current_stock,
        `Rp ${new Intl.NumberFormat('id-ID').format(m.total_value)}`,
      ]);
      exportTableToPdf(
        'LAPORAN PERPUTARAN & MUTASI OBAT APOTEK',
        columns,
        rows,
        `Laporan_Pemakaian_Obat_${startDate}_${endDate}`,
        periodLabel
      );
      toast.success('Berkas PDF Pemakaian Obat berhasil diunduh.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto print:p-0">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <BarChart3 className="w-7 h-7 text-teal-600" />
              Laporan & Rekonsiliasi Pelayanan
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-teal-100 text-teal-800 rounded-full border border-teal-200">
              Kemenkes RL 5.3 Ready
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Rekapitulasi 10 besar penyakit, rekonsiliasi kasir, kunjungan poliklinik, dan perputaran obat.
          </p>
        </div>

        {/* Action Buttons: Excel, PDF, Print, Refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600" />
            Export Excel (.xlsx)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            className="border-rose-300 text-rose-700 hover:bg-rose-50"
          >
            <Download className="w-4 h-4 mr-1.5 text-rose-600" />
            Download PDF
          </Button>

          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1.5" />
            Cetak
          </Button>

          <Button variant="primary" size="sm" onClick={fetchReports} isLoading={loading}>
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Segarkan
          </Button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Periode:
          </span>
          <button
            type="button"
            onClick={() => handleQuickPeriod('today')}
            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Hari Ini
          </button>
          <button
            type="button"
            onClick={() => handleQuickPeriod('7days')}
            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            7 Hari Terakhir
          </button>
          <button
            type="button"
            onClick={() => handleQuickPeriod('month')}
            className="px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Bulan Ini
          </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-400 ml-1" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-xs text-slate-800 border-none focus:outline-none"
            />
            <span className="text-xs text-slate-400">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-xs text-slate-800 border-none focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Printable Report Letterhead */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-3 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold tracking-tight uppercase">RS INOVA MEDIKA SOLUSINDO</h1>
            <p className="text-xs text-slate-600">Jl. Kesehatan No. 45, Jakarta Selatan • Telp: (021) 789-0123</p>
            <p className="text-xs font-bold text-teal-800 mt-1 uppercase">
              LAPORAN OPERASIONAL & REKONSILIASI KELUARAN SISTEM
            </p>
          </div>
          <div className="text-right text-xs">
            <p className="font-semibold text-slate-800">Periode: {startDate} s/d {endDate}</p>
            <p className="text-slate-400">Dicetak: {new Date().toLocaleString('id-ID')}</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl px-2 shadow-sm overflow-x-auto print:hidden">
        <button
          onClick={() => setActiveTab('top_diagnoses')}
          className={`py-3 px-4 font-semibold text-xs border-b-2 flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'top_diagnoses'
              ? 'border-teal-600 text-teal-700 bg-teal-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4 text-teal-600" />
          10 Besar Penyakit (RL 5.3)
        </button>

        <button
          onClick={() => setActiveTab('financial')}
          className={`py-3 px-4 font-semibold text-xs border-b-2 flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'financial'
              ? 'border-teal-600 text-teal-700 bg-teal-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4 text-blue-600" />
          Rekonsiliasi Finansial & Kasir
        </button>

        <button
          onClick={() => setActiveTab('visits')}
          className={`py-3 px-4 font-semibold text-xs border-b-2 flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'visits'
              ? 'border-teal-600 text-teal-700 bg-teal-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-indigo-600" />
          Kunjungan Poli & DPJP
        </button>

        <button
          onClick={() => setActiveTab('medicines')}
          className={`py-3 px-4 font-semibold text-xs border-b-2 flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'medicines'
              ? 'border-teal-600 text-teal-700 bg-teal-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Pill className="w-4 h-4 text-amber-600" />
          Perputaran Obat Apotek
        </button>
      </div>

      {/* Tab 1: 10 Besar Morbiditas (RL 5.3) */}
      {activeTab === 'top_diagnoses' && (
        <div className="space-y-6">
          <Card 
            title="Laporan 10 Besar Morbiditas Pasien Rawat Jalan" 
            subtitle="Formulir RL 5.3 Kemenkes RI — Distribusi Diagnosis ICD-10 Berdasarkan Gender"
          >
            {/* Visual BarChart */}
            <div className="h-64 mb-6 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topDiagnoses?.items || []}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" fontSize={11} />
                  <YAxis type="category" dataKey="icd10_code" fontSize={11} width={50} />
                  <Tooltip 
                    formatter={(val: any, _name: any, item: any) => [
                      `${val} kasus (${item.payload.diagnosis_name})`, 
                      'Jumlah Kasus'
                    ]}
                  />
                  <Bar dataKey="total_cases" fill="#0D9488" radius={[0, 4, 4, 0]}>
                    {(topDiagnoses?.items || []).map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Official Kemenkes RL 5.3 Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12">No</th>
                    <th className="py-2.5 px-3 w-24">Kode ICD-10</th>
                    <th className="py-2.5 px-3">Nama Diagnosis / Penyakit</th>
                    <th className="py-2.5 px-3 text-center">Laki-Laki</th>
                    <th className="py-2.5 px-3 text-center">Perempuan</th>
                    <th className="py-2.5 px-3 text-center">Kasus Primer</th>
                    <th className="py-2.5 px-3 text-right">Total Kasus</th>
                    <th className="py-2.5 px-3 text-right">Proporsi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topDiagnoses?.items && topDiagnoses.items.length > 0 ? (
                    topDiagnoses.items.map((d: any) => (
                      <tr key={d.rank} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 text-center font-bold text-slate-500">{d.rank}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-teal-800 bg-teal-50/50">{d.icd10_code}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">{d.diagnosis_name}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-700">{d.male_cases}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-700">{d.female_cases}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-teal-700 font-bold">{d.primary_cases}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 text-sm">{d.total_cases}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">{d.percentage}%</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="text-center py-6 text-slate-400">
                        Belum ada diagnosis medis pada periode ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Rekonsiliasi Finansial & Kasir */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card padding="md">
              <span className="text-xs font-semibold text-slate-500 block mb-1">Total Pendapatan Bersih</span>
              <span className="text-2xl font-extrabold text-teal-700 font-mono">
                Rp {new Intl.NumberFormat('id-ID').format(financialData?.summary?.total_revenue || 0)}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Lunas (Settled Payment)</p>
            </Card>

            <Card padding="md">
              <span className="text-xs font-semibold text-slate-500 block mb-1">Total Transaksi Kasir</span>
              <span className="text-2xl font-extrabold text-slate-900 font-mono">
                {financialData?.summary?.total_transactions || 0}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Kuitansi Resmi Diterbitkan</p>
            </Card>

            <Card padding="md">
              <span className="text-xs font-semibold text-slate-500 block mb-1">Rata-rata per Transaksi</span>
              <span className="text-2xl font-extrabold text-blue-700 font-mono">
                Rp {new Intl.NumberFormat('id-ID').format(financialData?.summary?.average_transaction || 0)}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Rerata Tagihan Pasien</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payment Method Breakdown Table */}
            <Card title="Rekapitulasi per Metode Pembayaran" subtitle="CASH, QRIS, Kartu Debit, & Transfer Bank">
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Metode</th>
                      <th className="py-2.5 px-3 text-center">Transaksi</th>
                      <th className="py-2.5 px-3 text-right">Nominal (Rp)</th>
                      <th className="py-2.5 px-3 text-right">Porsi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {financialData?.payment_methods && financialData.payment_methods.length > 0 ? (
                      financialData.payment_methods.map((m: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{m.method}</td>
                          <td className="py-2.5 px-3 text-center font-mono">{m.count}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-teal-800">
                            Rp {new Intl.NumberFormat('id-ID').format(m.amount)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">{m.percentage}%</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center py-6 text-slate-400">
                          Tidak ada data pembayaran pada periode ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Cashier Staff Breakdown */}
            <Card title="Penerimaan per Petugas Kasir" subtitle="Audit Pengumpulan Kas dan Rekonsiliasi Shift">
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Nama Petugas Kasir</th>
                      <th className="py-2.5 px-3 text-center">Jumlah Transaksi</th>
                      <th className="py-2.5 px-3 text-right">Total Terkumpul</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {financialData?.cashier_breakdown && financialData.cashier_breakdown.length > 0 ? (
                      financialData.cashier_breakdown.map((c: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{c.cashier_name}</td>
                          <td className="py-2.5 px-3 text-center font-mono">{c.transaction_count}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-teal-800">
                            Rp {new Intl.NumberFormat('id-ID').format(c.total_collected)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="text-center py-6 text-slate-400">
                          Tidak ada catatan shift kasir.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 3: Kunjungan Poli & DPJP */}
      {activeTab === 'visits' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Distribusi Kunjungan per Poliklinik" subtitle="Total Kunjungan, Penyelesaian, & Pembatalan">
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Poliklinik</th>
                      <th className="py-2.5 px-3 text-center">Total</th>
                      <th className="py-2.5 px-3 text-center">Selesai</th>
                      <th className="py-2.5 px-3 text-right">Porsi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visitSummary?.by_polyclinic && visitSummary.by_polyclinic.length > 0 ? (
                      visitSummary.by_polyclinic.map((p: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{p.name}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold">{p.total}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-emerald-700">{p.completed}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">{p.percentage}%</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center py-6 text-slate-400">
                          Tidak ada data kunjungan poliklinik.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="Beban Pelayanan Dokter DPJP" subtitle="Volume Pasien Diperiksa Dokter Spesialis">
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Nama Dokter Spesialis</th>
                      <th className="py-2.5 px-3">Poliklinik</th>
                      <th className="py-2.5 px-3 text-center">Ditangani</th>
                      <th className="py-2.5 px-3 text-center">Selesai</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visitSummary?.by_doctor && visitSummary.by_doctor.length > 0 ? (
                      visitSummary.by_doctor.map((d: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{d.doctor_name}</td>
                          <td className="py-2.5 px-3 text-slate-600">{d.polyclinic}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold">{d.total_handled}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-emerald-700">{d.completed}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center py-6 text-slate-400">
                          Tidak ada data pelayanan dokter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 4: Audit Mutasi & Pemakaian Obat */}
      {activeTab === 'medicines' && (
        <Card title="Laporan Perputaran & Pemakaian Obat Apotek" subtitle="Fast-Moving Pharmaceuticals & Sisa Persediaan">
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 w-28">Kode Obat</th>
                  <th className="py-2.5 px-3">Nama Obat</th>
                  <th className="py-2.5 px-3">Nama Generik</th>
                  <th className="py-2.5 px-3 text-right">Tarif Dasar</th>
                  <th className="py-2.5 px-3 text-center">Diserahkan</th>
                  <th className="py-2.5 px-3 text-center">Stok Terkini</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Nilai Rupiah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {medicineData?.items && medicineData.items.length > 0 ? (
                  medicineData.items.map((m: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{m.code}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{m.name}</td>
                      <td className="py-2.5 px-3 text-slate-500 italic">{m.generic_name}</td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        Rp {new Intl.NumberFormat('id-ID').format(m.base_price)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-teal-700">
                        {m.total_dispensed} {m.unit}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                        {m.current_stock}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.is_low_stock 
                            ? 'bg-rose-100 text-rose-800 border border-rose-300' 
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {m.is_low_stock ? 'Menipis' : 'Aman'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        Rp {new Intl.NumberFormat('id-ID').format(m.total_value)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-6 text-slate-400">
                      Tidak ada perputaran obat pada periode ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

    </div>
  );
};

export default ReportsPage;
