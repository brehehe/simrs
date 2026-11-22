import React, { useState, useEffect } from 'react';
import { 
  Pill, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  User,
  Stethoscope,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { AlertDialog } from '../components/ui/AlertDialog';
import { TableSkeleton } from '../components/ui/Skeleton';
import { pharmacyService, Prescription } from '../services/pharmacyService';

export const PharmacyPage: React.FC = () => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Dispense modal / alert dialog
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [isDispensing, setIsDispensing] = useState(false);
  const [dispenseNotes, setDispenseNotes] = useState('Obat diserahkan lengkap dan telah diedukasikan cara penggunaan.');

  const fetchPrescriptions = async () => {
    try {
      setIsLoading(true);
      const res = await pharmacyService.getPrescriptions();
      setPrescriptions(res);
    } catch {
      toast.error('Gagal mengambil daftar resep obat farmasi');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const filtered = prescriptions.filter((rx) => {
    if (selectedStatus !== 'ALL' && rx.status !== selectedStatus) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      rx.prescription_number.toLowerCase().includes(q) ||
      rx.patient_name?.toLowerCase().includes(q) ||
      rx.mr_number?.toLowerCase().includes(q) ||
      rx.doctor_name?.toLowerCase().includes(q)
    );
  });

  const handleConfirmDispense = async () => {
    if (!selectedPrescription) return;

    try {
      setIsDispensing(true);
      await pharmacyService.dispense(selectedPrescription.id, dispenseNotes);
      toast.success(`Resep ${selectedPrescription.prescription_number} berhasil diserahkan! Stok obat telah dipotong otomatis.`);
      setSelectedPrescription(null);
      fetchPrescriptions();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      toast.error(msg || 'Gagal memproses penyerahan obat');
    } finally {
      setIsDispensing(false);
    }
  };

  const pendingCount = prescriptions.filter(r => r.status === 'SUBMITTED' || r.status === 'PROCESSING').length;
  const dispensedCount = prescriptions.filter(r => r.status === 'DISPENSED').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Pill className="w-7 h-7 text-primary" />
            Depo Farmasi & Dispensing Obat
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Verifikasi e-resep poliklinik, pengecekan stok persediaan, dan penyerahan obat kepada pasien.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchPrescriptions}
          leftIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
        >
          Segarkan Data
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Resep Hari Ini</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1 font-mono">{prescriptions.length}</h3>
            </div>
            <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl">
              <Pill className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Menunggu Dispensing</p>
              <h3 className="text-2xl font-black text-amber-600 mt-1 font-mono">{pendingCount}</h3>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider">Obat Diserahkan</p>
              <h3 className="text-2xl font-black text-teal-600 mt-1 font-mono">{dispensedCount}</h3>
            </div>
            <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card padding="md">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            {[
              { id: 'ALL', label: 'Semua Resep' },
              { id: 'SUBMITTED', label: 'Menunggu Disiapkan' },
              { id: 'PROCESSING', label: 'Sedang Disiapkan' },
              { id: 'DISPENSED', label: 'Sudah Diserahkan' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedStatus(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedStatus === tab.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Cari no. resep / nama pasien..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </Card>

      {/* Prescription Cards List */}
      {isLoading ? (
        <Card padding="md">
          <TableSkeleton rows={4} cols={5} />
        </Card>
      ) : filtered.length === 0 ? (
        <Card padding="lg">
          <div className="text-center py-8 space-y-3">
            <Pill className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-semibold text-slate-800">Tidak ada resep obat</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Belum ada antrean resep obat dengan kriteria filter yang Anda pilih.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((rx) => {
            const isDispensed = rx.status === 'DISPENSED';
            const totalRxPrice = rx.items.reduce((acc, i) => acc + (i.subtotal || i.snapshot_price * i.quantity), 0);

            return (
              <Card key={rx.id} padding="md" className="transition-all hover:shadow-md">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-primary shrink-0">
                      <Pill className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {rx.prescription_number}
                        </span>
                        <StatusBadge status={rx.status} />
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Waktu resep: {new Date(rx.created_at).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-xs text-slate-600">
                    <div>
                      <span className="block text-slate-400">Pasien:</span>
                      <span className="font-semibold text-slate-900">{rx.patient_name || 'Bambang Pamungkas'}</span>
                      <span className="font-mono text-slate-500 ml-1">({rx.mr_number || 'RM-202611-00001'})</span>
                    </div>
                    <div>
                      <span className="block text-slate-400">Dokter Penulis:</span>
                      <span className="font-semibold text-slate-900">{rx.doctor_name}</span>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="py-3">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-100 pb-1">
                          <th className="py-1.5 font-medium">Nama Obat</th>
                          <th className="py-1.5 font-medium">Aturan Pakai / Dosis</th>
                          <th className="py-1.5 font-medium text-center">Jumlah</th>
                          <th className="py-1.5 font-medium text-right">Harga Satuan</th>
                          <th className="py-1.5 font-medium text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {rx.items.map((item) => (
                          <tr key={item.id}>
                            <td className="py-2 font-semibold text-slate-900">
                              {item.medicine_name}
                            </td>
                            <td className="py-2 text-slate-600">
                              {item.dosage} • {item.frequency}
                            </td>
                            <td className="py-2 text-center font-mono font-bold">
                              {item.quantity} {item.unit}
                            </td>
                            <td className="py-2 text-right font-mono text-slate-600">
                              Rp {item.snapshot_price.toLocaleString('id-ID')}
                            </td>
                            <td className="py-2 text-right font-mono font-bold text-slate-900">
                              Rp {(item.subtotal || item.snapshot_price * item.quantity).toLocaleString('id-ID')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {rx.notes && (
                    <div className="mt-2 p-2 bg-slate-50 rounded-lg text-xs text-slate-600 flex items-center gap-1.5">
                      <span className="font-semibold text-slate-700">Catatan Dokter:</span>
                      <span>{rx.notes}</span>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="border-t border-slate-100 pt-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    Total Nilai Obat: <span className="font-mono font-bold text-slate-900 text-sm">Rp {totalRxPrice.toLocaleString('id-ID')}</span>
                  </div>

                  {!isDispensed ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setSelectedPrescription(rx)}
                      leftIcon={<CheckCircle2 className="w-4 h-4" />}
                    >
                      Verifikasi & Serahkan Obat
                    </Button>
                  ) : (
                    <span className="text-xs font-semibold text-green-700 flex items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                      <CheckCircle2 className="w-4 h-4" />
                      Obat Telah Diserahkan & Stok Terpotong
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog Dispensing */}
      <AlertDialog
        isOpen={!!selectedPrescription}
        onClose={() => setSelectedPrescription(null)}
        onConfirm={handleConfirmDispense}
        title="Konfirmasi Penyerahan Obat Pasien"
        description={`Apakah Anda yakin ingin menyerahkan obat untuk resep ${selectedPrescription?.prescription_number}? Sistem akan mengunci baris persediaan (SELECT FOR UPDATE) dan memotong stok secara atomik.`}
        confirmText="Ya, Serahkan Obat & Potong Stok"
        cancelText="Batal"
        isLoading={isDispensing}
        variant="primary"
      />
    </div>
  );
};
