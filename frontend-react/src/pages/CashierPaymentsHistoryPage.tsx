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
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import api from '../services/api';
import { toast } from 'sonner';

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
    } catch (err: any) {
      toast.error('Gagal mengambil kuitansi pembayaran.');
    }
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

        <Button
          variant="outline"
          size="sm"
          onClick={fetchPayments}
          disabled={loading}
          className="bg-white/10 hover:bg-white/20 text-white border-white/20 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Segarkan Data
        </Button>
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
              placeholder="Cari no. pembayaran, invoice, atau pasien..."
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
              <option value="CASH">Tunai (Cash)</option>
              <option value="QRIS">QRIS</option>
              <option value="DEBIT_CARD">Kartu Debit</option>
              <option value="BANK_TRANSFER">Transfer Bank</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Payments Table */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Daftar Transaksi Pembayaran ({filtered.length} Transaksi)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Waktu Transaksi</th>
                <th className="py-3 px-4">Nomor Pembayaran</th>
                <th className="py-3 px-4">Nomor Invoice</th>
                <th className="py-3 px-4">Identitas Pasien</th>
                <th className="py-3 px-4">Metode Bayar</th>
                <th className="py-3 px-4">Nominal Diterima</th>
                <th className="py-3 px-4">Kasir Bertugas</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
                    Tidak ada transaksi pembayaran yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {new Date(p.paid_at).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-teal-800">
                      {p.payment_number}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {p.invoice_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{p.patient_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">RM: {p.mr_number}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-600 text-sm">
                      {formatRupiah(p.amount_paid)}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
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
                <p className="text-slate-500">Jl. Kesehatan No. 10 Jakarta • Telp (021) 555-0123</p>
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
                  variant="primary"
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                  onClick={() => {
                    window.print();
                    setActiveReceipt(null);
                  }}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Cetak Lembar Kuitansi
                </Button>
                <Button
                  variant="outline"
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
