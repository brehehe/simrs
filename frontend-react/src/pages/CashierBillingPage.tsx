import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  CreditCard, 
  Search, 
  Receipt, 
  Printer, 
  CheckCircle2, 
  Building2, 
  DollarSign, 
  User, 
  AlertCircle,
  FileCheck,
  RefreshCw,
  QrCode
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { StatusBadge } from '../components/ui/StatusBadge';
import { TableSkeleton } from '../components/ui/Skeleton';
import { billingService, Invoice } from '../services/billingService';
import { visitService, Visit } from '../services/visitService';

export const CashierBillingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const visitIdFromUrl = searchParams.get('visit_id');

  // Visits waiting for cashier or ready for billing
  const [cashierVisits, setCashierVisits] = useState<Visit[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [isLoadingVisits, setIsLoadingVisits] = useState(true);

  // Active Invoice
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);

  // Payment Form State
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QRIS' | 'DEBIT' | 'TRANSFER'>('CASH');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [referenceNo, setReferenceNo] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Receipt Modal State
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  // Load visits
  const fetchVisits = async () => {
    try {
      setIsLoadingVisits(true);
      const res = await visitService.getVisits();
      setCashierVisits(res.items);

      let current: Visit | undefined;
      if (visitIdFromUrl) {
        current = res.items.find(v => v.id === visitIdFromUrl);
      }
      if (!current) {
        current = res.items.find(v => v.status === 'READY_FOR_BILLING' || v.status === 'COMPLETED');
      }
      if (current) {
        setSelectedVisit(current);
      }
    } catch {
      toast.error('Gagal mengambil daftar kunjungan billing');
    } finally {
      setIsLoadingVisits(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, [visitIdFromUrl]);

  // Load invoice whenever selectedVisit changes
  useEffect(() => {
    async function loadInvoice() {
      if (!selectedVisit) {
        setActiveInvoice(null);
        return;
      }
      try {
        setIsLoadingInvoice(true);
        const inv = await billingService.getInvoiceByVisit(selectedVisit.id);
        setActiveInvoice(inv);
        setPaymentAmount(inv.outstanding_balance > 0 ? inv.outstanding_balance : inv.total_amount);
      } catch {
        toast.error('Gagal memuat invoice tagihan');
      } finally {
        setIsLoadingInvoice(false);
      }
    }
    loadInvoice();
  }, [selectedVisit]);

  // Handle Payment Submit
  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInvoice) return;

    if (paymentAmount <= 0) {
      toast.error('Nominal pembayaran harus lebih dari 0.');
      return;
    }

    try {
      setIsProcessingPayment(true);
      const idempotencyKey = `pay-${activeInvoice.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      const result = await billingService.processPayment(activeInvoice.id, {
        amount: paymentAmount,
        payment_method: paymentMethod,
        reference_no: referenceNo || undefined,
        idempotency_key: idempotencyKey,
      });

      toast.success('Pembayaran kasir berhasil diproses!');

      // Set receipt data
      setReceiptData({
        ...result,
        invoice: activeInvoice,
        payment_amount: paymentAmount,
        payment_method: paymentMethod,
        change_amount: paymentAmount > activeInvoice.outstanding_balance ? paymentAmount - activeInvoice.outstanding_balance : 0,
      });
      setIsReceiptModalOpen(true);

      // Refresh invoice
      const updatedInv = await billingService.getInvoiceByVisit(activeInvoice.visit_id);
      setActiveInvoice(updatedInv);
      fetchVisits();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      toast.error(msg || 'Gagal memproses pembayaran');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Quick Amount Handlers
  const handleSetExactAmount = () => {
    if (activeInvoice) setPaymentAmount(activeInvoice.outstanding_balance);
  };
  const handleAddAmount = (extra: number) => {
    setPaymentAmount(prev => (prev || 0) + extra);
  };

  const change = activeInvoice ? Math.max(0, paymentAmount - activeInvoice.outstanding_balance) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-primary" />
            Kasir & Pembayaran Rawat Jalan
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Konsolidasi tagihan rawat jalan, snapshot tarif terjamin, dan pencetakan kuitansi resmi.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchVisits}
          leftIcon={<RefreshCw className={`w-4 h-4 ${isLoadingVisits ? 'animate-spin' : ''}`} />}
        >
          Segarkan Data
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visit Picker & Invoice Items (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Patient / Visit Selector */}
          <Card padding="md">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Pilih Kunjungan Pasien
              </label>
              <select
                aria-label="Pilih Kunjungan Pasien Billing"
                className="w-full sm:w-80 h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                value={selectedVisit?.id || ''}
                onChange={(e) => {
                  const found = cashierVisits.find(v => v.id === e.target.value);
                  if (found) setSelectedVisit(found);
                }}
              >
                <option value="" disabled>Pilih Kunjungan Pasien...</option>
                {cashierVisits.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.queue_display} - {v.patient_name} ({v.mr_number}) [{v.status}]
                  </option>
                ))}
              </select>
            </div>
          </Card>

          {/* Itemized Invoice Card */}
          <Card
            title={activeInvoice ? `Rincian Tagihan (${activeInvoice.invoice_number})` : 'Rincian Tagihan'}
            subtitle="Konsolidasi biaya registrasi, tindakan medis, laboratorium, dan farmasi"
          >
            {isLoadingInvoice ? (
              <TableSkeleton rows={4} cols={4} />
            ) : !activeInvoice ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Pilih kunjungan pasien untuk melihat rincian tagihan invoice.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Patient Summary Header */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">{activeInvoice.patient_name}</span>
                    <span className="font-mono text-slate-500">No. RM: {activeInvoice.mr_number} • Reg: {activeInvoice.visit_number}</span>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={activeInvoice.status} />
                    <span className="text-[10px] text-slate-400 block mt-1">
                      {new Date(activeInvoice.created_at).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                      <tr>
                        <th className="py-2 px-3 font-semibold">Kategori & Deskripsi Layanan</th>
                        <th className="py-2 px-3 font-semibold text-center">Qty</th>
                        <th className="py-2 px-3 font-semibold text-right">Tarif Satuan</th>
                        <th className="py-2 px-3 font-semibold text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeInvoice.items.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3">
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 mr-2">
                              {item.item_type}
                            </span>
                            <span className="font-medium text-slate-900">{item.description}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                            Rp {item.unit_price.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            Rp {item.subtotal.toLocaleString('id-ID')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Invoice Totals Summary */}
                <div className="border-t border-slate-200 pt-3 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Biaya Registrasi Rawat Jalan:</span>
                    <span className="font-mono">Rp {activeInvoice.registration_fee.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Total Tindakan Medis:</span>
                    <span className="font-mono">Rp {activeInvoice.procedures_total.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Total Pemeriksaan Lab:</span>
                    <span className="font-mono">Rp {activeInvoice.lab_total.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Total Farmasi & Obat:</span>
                    <span className="font-mono">Rp {activeInvoice.medicines_total.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900 text-sm">
                    <span>Total Keseluruhan Tagihan:</span>
                    <span className="font-mono text-base text-primary">Rp {activeInvoice.total_amount.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between text-green-700 font-medium">
                    <span>Sudah Dibayar:</span>
                    <span className="font-mono">Rp {activeInvoice.paid_amount.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex justify-between items-center text-sm font-bold text-amber-900">
                    <span>Sisa Tagihan (Outstanding):</span>
                    <span className="font-mono text-base text-amber-800">Rp {activeInvoice.outstanding_balance.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Payment Form (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card 
            title="Proses Pembayaran" 
            subtitle="Pilih metode pembayaran dan cetak kuitansi resmi"
          >
            {!activeInvoice ? (
              <p className="text-xs text-slate-400 text-center py-6">
                Silakan pilih pasien untuk memproses pembayaran.
              </p>
            ) : activeInvoice.status === 'PAID' ? (
              <div className="p-6 bg-green-50 border border-green-200 rounded-xl text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
                <h4 className="font-bold text-green-900 text-base">Tagihan Telah Lunas (PAID)</h4>
                <p className="text-xs text-green-700">
                  Seluruh kewajiban pembayaran telah diselesaikan dan kunjungan pasien telah dinyatakan SELESAI.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsReceiptModalOpen(true)}
                  leftIcon={<Printer className="w-4 h-4" />}
                >
                  Cetak Ulang Kuitansi
                </Button>
              </div>
            ) : (
              <form onSubmit={handleProcessPayment} className="space-y-4 text-xs">
                {/* Payment Method Selector */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-2">Metode Pembayaran</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'CASH', label: 'Tunai (Cash)', icon: DollarSign },
                      { id: 'QRIS', label: 'QRIS Dinamis', icon: QrCode },
                      { id: 'DEBIT', label: 'Kartu Debit / EDC', icon: CreditCard },
                      { id: 'TRANSFER', label: 'Bank Transfer', icon: Building2 },
                    ].map((m) => {
                      const Icon = m.icon;
                      const isSelected = paymentMethod === m.id;
                      return (
                        <div
                          key={m.id}
                          onClick={() => setPaymentMethod(m.id as any)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 ${
                            isSelected
                              ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-500/20 text-teal-900 font-bold'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className="w-4 h-4 text-primary shrink-0" />
                          <span>{m.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Amount Input */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nominal Pembayaran Diterima (Rp) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseInt(e.target.value) || 0)}
                    className="font-mono text-base font-bold"
                    required
                  />

                  {/* Quick Amount Buttons */}
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={handleSetExactAmount}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-semibold text-slate-700"
                    >
                      Uang Pas
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddAmount(50000)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-semibold text-slate-700"
                    >
                      +50.000
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddAmount(100000)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-semibold text-slate-700"
                    >
                      +100.000
                    </button>
                  </div>
                </div>

                {/* Change calculation */}
                {paymentMethod === 'CASH' && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <span className="font-semibold text-slate-600">Uang Kembalian:</span>
                    <span className="font-mono font-bold text-base text-teal-700">
                      Rp {change.toLocaleString('id-ID')}
                    </span>
                  </div>
                )}

                {/* Reference No for Non-Cash */}
                {paymentMethod !== 'CASH' && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      No. Approval EDC / Referensi Transaksi
                    </label>
                    <Input
                      placeholder="Contoh: REF-89283921..."
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                    />
                  </div>
                )}

                {/* Submit Payment */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    isLoading={isProcessingPayment}
                    leftIcon={<FileCheck className="w-5 h-5" />}
                  >
                    Proses Pembayaran & Cetak Kuitansi
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      </div>

      {/* OFFICIAL HOSPITAL RECEIPT MODAL */}
      <Modal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        maxWidth="lg"
        title="Kuitansi Resmi Pembayaran SIMRS"
      >
        {activeInvoice && (
          <div className="space-y-4">
            {/* Printable Receipt Paper Sheet */}
            <div className="bg-white border-2 border-slate-300 p-6 rounded-2xl shadow font-sans text-xs space-y-4 text-slate-800">
              {/* Hospital Header */}
              <div className="border-b-2 border-slate-800 pb-3 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 text-primary font-black text-base uppercase">
                    <Building2 className="w-6 h-6" />
                    <span>RS INOVA MEDIKA SOLUSINDO</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Jl. Pelayanan Kesehatan No. 128, Bandung • (022) 7654321</p>
                  <p className="text-[11px] text-slate-400">NPWP: 01.234.567.8-428.000</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-green-100 text-green-800 font-black text-sm tracking-widest rounded-lg border border-green-300">
                    LUNAS
                  </span>
                  <p className="font-mono text-[11px] text-slate-500 mt-1">{activeInvoice.invoice_number}</p>
                </div>
              </div>

              {/* Meta Info */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block">Nama Pasien:</span>
                  <span className="font-bold text-slate-900">{activeInvoice.patient_name}</span>
                  <span className="text-slate-500 font-mono block">RM: {activeInvoice.mr_number}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">No. Registrasi:</span>
                  <span className="font-mono font-bold text-slate-900">{activeInvoice.visit_number}</span>
                  <span className="text-slate-500 block">Tgl: {new Date().toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Items List */}
              <table className="w-full text-left text-xs text-slate-700">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 pb-1">
                    <th className="py-1">Uraian Pembayaran</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Tarif</th>
                    <th className="py-1 text-right">Jumlah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeInvoice.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-1.5">{item.description}</td>
                      <td className="py-1.5 text-center font-mono">{item.quantity}</td>
                      <td className="py-1.5 text-right font-mono">Rp {item.unit_price.toLocaleString('id-ID')}</td>
                      <td className="py-1.5 text-right font-mono font-semibold">Rp {item.subtotal.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="border-t border-slate-300 pt-2 space-y-1 text-right font-mono text-xs">
                <div className="flex justify-between font-bold text-sm text-slate-900">
                  <span>TOTAL BIAYA:</span>
                  <span>Rp {activeInvoice.total_amount.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>PEMBAYARAN ({paymentMethod}):</span>
                  <span>Rp {(receiptData?.payment_amount || paymentAmount).toLocaleString('id-ID')}</span>
                </div>
                {change > 0 && (
                  <div className="flex justify-between text-teal-700">
                    <span>KEMBALIAN:</span>
                    <span>Rp {change.toLocaleString('id-ID')}</span>
                  </div>
                )}
              </div>

              {/* Signature / Footer */}
              <div className="border-t border-slate-200 pt-4 flex justify-between items-end text-[11px] text-slate-500">
                <div>
                  <p>Terima kasih atas kepercayaan Anda.</p>
                  <p className="text-[10px] text-slate-400">Bukti pembayaran sah tercetak otomatis oleh SIMRS.</p>
                </div>
                <div className="text-center">
                  <p className="mb-8">Petugas Kasir,</p>
                  <p className="font-semibold text-slate-800">Kasir Rawat Jalan</p>
                </div>
              </div>
            </div>

            {/* Print Action */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsReceiptModalOpen(false)}
              >
                Tutup
              </Button>
              <Button
                variant="primary"
                onClick={() => window.print()}
                leftIcon={<Printer className="w-4 h-4" />}
              >
                Cetak Kuitansi
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
