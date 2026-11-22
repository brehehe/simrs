import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  CheckCircle2,
  RefreshCw,
  Printer,
  Calendar,
  Clock,
  ShieldCheck,
  Receipt,
  FileCheck,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import api from '../services/api';
import { toast } from 'sonner';
import { exportToExcel } from '../utils/excelExport';
import { exportTableToPdf, exportReceiptToPdf } from '../utils/pdfExport';

interface PaymentItem {
  id: string;
  payment_number: string;
  invoice_id: string;
  invoice_number: string;
  patient_name: string;
  mr_number: string;
  amount_paid: string | number;
  total_amount: string | number;
  payment_method: string;
  reference_no: string | null;
  paid_at: string;
  cashier_name: string;
}

export const CashierPaymentsHistoryPage: React.FC = () => {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');

  // Receipt print modal state
  const [activeReceipt, setActiveReceipt] = useState<any | null>(null);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/payments');
      setPayments(res.data?.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat riwayat pembayaran kasir.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const formatRupiah = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num || 0);
  };

  const filtered = payments.filter((p) => {
    if (methodFilter !== 'ALL' && p.payment_method !== methodFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.payment_number?.toLowerCase().includes(q) ||
        p.invoice_number?.toLowerCase().includes(q) ||
        p.patient_name?.toLowerCase().includes(q) ||
        p.mr_number?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handlePrintReceipt = async (paymentId: string) => {
    try {
      const res = await api.get(`/payments/${paymentId}/receipt`);
      setActiveReceipt(res.data?.data);
    } catch {
      toast.error('Gagal mengambil kuitansi pembayaran.');
    }
  };

  const handleExportExcel = () => {
    const data = filtered.map((p, idx) => ({
      no: idx + 1,
      payment_number: p.payment_number,
      invoice_number: p.invoice_number,
      patient_name: p.patient_name,
      mr_number: p.mr_number,
      amount_paid: Number(p.amount_paid) || 0,
      payment_method: p.payment_method,
      paid_at: p.paid_at,
      cashier_name: p.cashier_name,
    }));

    exportToExcel(
      data,
      `Rekap_Pembayaran_Kasir_${new Date().toISOString().split('T')[0]}`,
      'Pembayaran Kasir',
      [
        { header: 'No', key: 'no', width: 6 },
        { header: 'No. Pembayaran', key: 'payment_number', width: 22 },
        { header: 'No. Tagihan (Invoice)', key: 'invoice_number', width: 22 },
        { header: 'Nama Pasien', key: 'patient_name', width: 26 },
        { header: 'No. RM', key: 'mr_number', width: 16 },
        { header: 'Nominal Dibayar (Rp)', key: 'amount_paid', width: 20 },
        { header: 'Metode Pembayaran', key: 'payment_method', width: 18 },
        { header: 'Waktu Transaksi', key: 'paid_at', width: 20 },
        { header: 'Petugas Kasir', key: 'cashier_name', width: 20 },
      ]
    );
    toast.success('Berkas Excel Rekapitulasi Kasir berhasil diunduh.');
  };

  const handleExportPdf = () => {
    const columns = [
      'No. Pembayaran',
      'No. Invoice',
      'Pasien & No. RM',
      'Nominal Dibayar',
      'Metode',
      'Waktu & Kasir',
    ];

    const rows = filtered.map((p) => [
      p.payment_number,
      p.invoice_number,
      `${p.patient_name}\n(${p.mr_number})`,
      formatRupiah(p.amount_paid),
      p.payment_method,
      `${new Date(p.paid_at).toLocaleDateString('id-ID')}\n${p.cashier_name}`,
    ]);

    exportTableToPdf(
      'LEMBAR REKAPITULASI TRANSAKSI KASIR RAWAT JALAN',
      columns,
      rows,
      `Rekap_Kasir_${new Date().toISOString().split('T')[0]}`,
      `Total ${filtered.length} Transaksi Pembayaran Resmi Terverifikasi`
    );
    toast.success('Berkas PDF Rekapitulasi Kasir berhasil diunduh.');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-teal-500/20 backdrop-blur-md rounded-2xl border border-teal-400/30 text-teal-300">
            <CreditCard className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Riwayat Pembayaran & Kuitansi Kasir
            </h1>
            <p className="text-xs sm:text-sm text-teal-200 mt-0.5">
              Ledger transaksi penerimaan kasir, idempoten settling, dan cetak ulang kuitansi resmi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-300" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            <Download className="w-4 h-4 mr-1.5 text-rose-300" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPayments}
            disabled={loading}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Segarkan
          </Button>
        </div>
      </div>

      {/* Critical Case 3 Callout */}
      <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-start gap-3 text-xs text-teal-900">
        <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-teal-950">
            Perlindungan Transaksi Kasir Idempoten (Critical Case 3 Mitigation)
          </p>
          <p className="text-teal-700 mt-0.5">
            Setiap pembayaran diproses dengan header <code>X-Idempotency-Key</code> unik. Retry akibat gangguan jaringan kasir tidak akan pernah menyebabkan debit ganda pada saldo invoice pasien.
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari no. pembayaran, invoice, atau nama pasien..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-slate-500">Metode Bayar:</span>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">Semua Metode</option>
              <option value="CASH">Tunai (CASH)</option>
              <option value="QRIS">QRIS</option>
              <option value="DEBIT_CARD">Kartu Debit</option>
              <option value="BANK_TRANSFER">Transfer Bank</option>
              <option value="BPJS">Penjamin BPJS</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Payments Table */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Daftar Pembayaran Kasir ({filtered.length} Transaksi)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">No. Pembayaran</th>
                <th className="py-3 px-4">No. Invoice Tagihan</th>
                <th className="py-3 px-4">Pasien & No. RM</th>
                <th className="py-3 px-4">Nominal Diterima</th>
                <th className="py-3 px-4">Metode Bayar</th>
                <th className="py-3 px-4">Waktu Transaksi</th>
                <th className="py-3 px-4">Kasir</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
                    Tidak ada transaksi pembayaran yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-teal-800">
                      {p.payment_number}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {p.invoice_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{p.patient_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{p.mr_number}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-600 text-sm">
                      {formatRupiah(p.amount_paid)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {new Date(p.paid_at).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {p.cashier_name}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrintReceipt(p.id)}
                        className="text-xs text-teal-700 border-teal-200 hover:bg-teal-50"
                      >
                        <Printer className="w-3.5 h-3.5 mr-1" />
                        Kuitansi
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Kuitansi Resmi */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 bg-teal-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Receipt className="w-6 h-6 text-teal-300" />
                <h3 className="text-base font-bold">Kuitansi Pembayaran Resmi</h3>
              </div>
              <button
                onClick={() => setActiveReceipt(null)}
                className="text-teal-200 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="text-center border-b border-slate-200 pb-3">
                <h4 className="text-sm font-bold text-slate-900">RS INOVA MEDIKA SOLUSINDO</h4>
                <p className="text-slate-500">Jl. Kesehatan No. 45 Jakarta • Telp (021) 789-0123</p>
                <div className="mt-2 font-mono font-bold text-teal-800 text-sm">
                  {activeReceipt.payment_number}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-700">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">No. Invoice</span>
                  <span className="font-semibold">{activeReceipt.invoice_number}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Waktu Bayar</span>
                  <span className="font-semibold">{new Date(activeReceipt.paid_at).toLocaleString('id-ID')}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Nama Pasien</span>
                  <span className="font-semibold">{activeReceipt.patient_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">No. Rekam Medis</span>
                  <span className="font-semibold font-mono">{activeReceipt.mr_number}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Metode Pembayaran</span>
                  <span className="font-semibold">{activeReceipt.payment_method}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Kasir</span>
                  <span className="font-semibold">{activeReceipt.cashier_name}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                <span className="text-slate-500 block text-[11px] uppercase">Jumlah Diterima</span>
                <span className="text-2xl font-bold text-emerald-600 font-mono">
                  {formatRupiah(activeReceipt.amount_paid)}
                </span>
                <span className="text-emerald-700 block text-[10px] mt-1 font-semibold">
                  STATUS: LUNAS (SETTLED)
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    exportReceiptToPdf(activeReceipt);
                    toast.success('Berkas PDF Kuitansi berhasil diunduh.');
                  }}
                  className="flex-1 border-rose-300 text-rose-700 hover:bg-rose-50"
                >
                  <Download className="w-4 h-4 mr-1.5 text-rose-600" />
                  Download PDF
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                  onClick={() => {
                    window.print();
                  }}
                >
                  <Printer className="w-4 h-4 mr-1.5" />
                  Cetak Lembar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveReceipt(null)}
                >
                  Tutup
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
