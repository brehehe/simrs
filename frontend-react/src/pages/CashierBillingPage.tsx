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

  // Adjustment Modal State (Critical Case 4)
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<'DEDUCTION' | 'ADDITION' | 'CANCELLATION'>('DEDUCTION');
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);

  // Load visits (Hanya memunculkan kunjungan yang belum lunas)
  const fetchVisits = async () => {
    try {
      setIsLoadingVisits(true);
      const res = await visitService.getVisits({ unpaid_only: true }, 1, 100);

      // Filter out any visits that are already paid or completed
      let available = (res.items || []).filter(
        v => v.status !== 'COMPLETED' && v.status !== 'CANCELLED' && v.invoice_status !== 'PAID'
      );

      // If URL specifies a visit_id, ensure it can be found/inspected
      if (visitIdFromUrl && !available.some(v => v.id === visitIdFromUrl)) {
        try {
          const directVisit = await visitService.getVisitById(visitIdFromUrl);
          if (directVisit) {
            available = [directVisit, ...available];
          }
        } catch {
          // ignore
        }
      }

      setCashierVisits(available);

      let current: Visit | undefined;
      if (visitIdFromUrl) {
        current = available.find(v => v.id === visitIdFromUrl);
      }
      if (!current) {
        current = available.find(v => v.status === 'READY_FOR_BILLING') || available[0];
      }
      setSelectedVisit(current || null);
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

      const isCash = paymentMethod === 'CASH';
      const settleAmount = isCash && paymentAmount > activeInvoice.outstanding_balance
        ? activeInvoice.outstanding_balance
        : paymentAmount;
      const changeAmount = isCash && paymentAmount > activeInvoice.outstanding_balance
        ? paymentAmount - activeInvoice.outstanding_balance
        : 0;

      const result = await billingService.processPayment(activeInvoice.id, {
        amount: settleAmount,
        cash_received: paymentAmount,
        change_amount: changeAmount,
        payment_method: paymentMethod,
        reference_no: referenceNo || undefined,
        idempotency_key: idempotencyKey,
      });

      toast.success('Pembayaran kasir berhasil diproses!');

      // Set receipt data
      setReceiptData({
        ...result,
        invoice: activeInvoice,
        payment_amount: settleAmount,
        cash_received: paymentAmount,
        payment_method: paymentMethod,
        change_amount: changeAmount,
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

  const handleCreateAdjustment = async () => {
    if (!activeInvoice) return;
    if (adjustmentType !== 'CANCELLATION' && adjustmentAmount <= 0) {
      toast.error('Nominal penyesuaian harus lebih besar dari 0.');
      return;
    }
    if (adjustmentReason.length < 5) {
      toast.error('Alasan penyesuaian wajib diisi secara rinci (minimal 5 karakter).');
      return;
    }
    try {
      setIsSubmittingAdjustment(true);
      await billingService.createAdjustment(activeInvoice.id, {
        adjustment_type: adjustmentType,
        amount: adjustmentAmount,
        reason: adjustmentReason,
      });
      toast.success('Penyesuaian tagihan berhasil disimpan.');
      setIsAdjustmentModalOpen(false);
      setAdjustmentAmount(0);
      setAdjustmentReason('');
      if (activeInvoice?.visit_id) {
        const inv = await billingService.getInvoiceByVisit(activeInvoice.visit_id);
        setActiveInvoice(inv);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Gagal menyimpan penyesuaian biaya.');
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

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
                {cashierVisits.length === 0 ? (
                  <option value="" disabled>Tidak ada tagihan tertunda (Semua Lunas)</option>
                ) : (
                  <>
                    <option value="" disabled>Pilih Kunjungan Pasien ({cashierVisits.length} Belum Lunas)...</option>
                    {cashierVisits.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.queue_display} - {v.patient_name} ({v.mr_number}) [{v.status}]
                      </option>
                    ))}
                  </>
                )}
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
            ) : !selectedVisit || !activeInvoice ? (
              <div className="p-12 text-center text-slate-500 text-xs space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <p className="font-semibold text-slate-700 text-sm">Semua Tagihan Rawat Jalan Telah Lunas</p>
                <p className="text-slate-400">Tidak ada antrean pasien yang menunggu pembayaran saat ini.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Patient Summary Header */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">{activeInvoice.patient_name}</span>
                    <span className="font-mono text-slate-500">No. RM: {activeInvoice.mr_number} • Reg: {activeInvoice.visit_number}</span>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      Versi {activeInvoice.version || 1}
                    </span>
                    <StatusBadge status={activeInvoice.status} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAdjustmentModalOpen(true)}
                      className="text-xs h-7 ml-2"
                    >
                      + Koreksi / Diskon
                    </Button>
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

                  {activeInvoice.adjustments && activeInvoice.adjustments.length > 0 && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                      <p className="font-semibold text-slate-700">Riwayat Penyesuaian Biaya (Kasus 4):</p>
                      {activeInvoice.adjustments.map((adj) => (
                        <div key={adj.id} className="flex justify-between items-center text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                              adj.adjustment_type === 'DEDUCTION' ? 'bg-emerald-100 text-emerald-800' :
                              adj.adjustment_type === 'ADDITION' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {adj.adjustment_type}
                            </span>
                            <span>{adj.reason}</span>
                            <span className="text-[10px] text-slate-400">({adj.author_name})</span>
                          </span>
                          <span className="font-mono font-semibold">
                            {adj.adjustment_type === 'DEDUCTION' ? '-' : '+'}Rp {Number(adj.amount).toLocaleString('id-ID')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
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
            {!selectedVisit || !activeInvoice ? (
              <p className="text-xs text-slate-400 text-center py-6">
                {cashierVisits.length === 0
                  ? 'Tidak ada antrean pembayaran aktif saat ini.'
                  : 'Silakan pilih pasien untuk memproses pembayaran.'}
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
                  <span>PEMBAYARAN DITERIMA ({paymentMethod}):</span>
                  <span>Rp {(receiptData?.cash_received || receiptData?.payment_amount || paymentAmount).toLocaleString('id-ID')}</span>
                </div>
                {((receiptData?.change_amount && receiptData.change_amount > 0) || change > 0) && (
                  <div className="flex justify-between text-teal-700 font-bold">
                    <span>UANG KEMBALIAN:</span>
                    <span>Rp {(receiptData?.change_amount ?? change).toLocaleString('id-ID')}</span>
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

      {/* Modal Penyesuaian Biaya / Diskon (Critical Case 4) */}
      <Modal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        title="Form Penyesuaian Tagihan / Diskon (Kasus Kritis 4)"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-500">
            Penyesuaian tagihan pasca-invoice tanpa merusak snapshot historis. Seluruh penyesuaian dicatat pada tabel audit.
          </p>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tipe Penyesuaian</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAdjustmentType('DEDUCTION')}
                className={`p-2 rounded-lg border text-center transition-colors ${
                  adjustmentType === 'DEDUCTION'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                Potongan / Diskon (DEDUCTION)
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('ADDITION')}
                className={`p-2 rounded-lg border text-center transition-colors ${
                  adjustmentType === 'ADDITION'
                    ? 'border-amber-600 bg-amber-50 text-amber-900 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                Biaya Tambahan (ADDITION)
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('CANCELLATION')}
                className={`p-2 rounded-lg border text-center transition-colors ${
                  adjustmentType === 'CANCELLATION'
                    ? 'border-rose-600 bg-rose-50 text-rose-900 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                Pembatalan (CANCELLATION)
              </button>
            </div>
          </div>

          {adjustmentType !== 'CANCELLATION' && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nominal Penyesuaian (Rp)</label>
              <Input
                type="number"
                min="1000"
                step="1000"
                value={adjustmentAmount || ''}
                onChange={(e) => setAdjustmentAmount(Number(e.target.value))}
                placeholder="Contoh: 25000"
              />
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Alasan Penyesuaian (Wajib Rinci, Min. 5 Karakter)</label>
            <textarea
              rows={3}
              className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
              placeholder="Contoh: Diskon khusus persetujuan Direktur Pelayanan untuk pasien reguler..."
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsAdjustmentModalOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleCreateAdjustment}
              isLoading={isSubmittingAdjustment}
            >
              Simpan Penyesuaian
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
