import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Clock, 
  Search, 
  Filter, 
  Stethoscope, 
  Building2, 
  RefreshCw, 
  Play, 
  CheckCircle2, 
  XCircle,
  FileText,
  CreditCard,
  Pill,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { TableSkeleton } from '../components/ui/Skeleton';
import { AlertDialog } from '../components/ui/AlertDialog';
import { visitService, Visit } from '../services/visitService';
import { patientService, Polyclinic } from '../services/patientService';

export const QueueListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [visits, setVisits] = useState<Visit[]>([]);
  const [polyclinics, setPolyclinics] = useState<Polyclinic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedPolyId, setSelectedPolyId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Cancel dialog state
  const [cancelVisitId, setCancelVisitId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchQueues = async () => {
    try {
      setIsLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const filters: Record<string, any> = { visit_date: today };
      if (selectedPolyId !== 'ALL') filters.polyclinic_id = selectedPolyId;
      if (selectedStatus !== 'ALL') filters.status = selectedStatus;

      const res = await visitService.getVisits(filters);
      setVisits(res.items);
    } catch {
      toast.error('Gagal mengambil daftar antrean hari ini');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    async function loadPolys() {
      try {
        const polyData = await patientService.getPolyclinics();
        setPolyclinics(polyData);
      } catch {}
    }
    loadPolys();
  }, []);

  useEffect(() => {
    fetchQueues();
  }, [selectedPolyId, selectedStatus]);

  // Filter local search query
  const filteredVisits = visits.filter((v) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      v.patient_name?.toLowerCase().includes(q) ||
      v.mr_number?.toLowerCase().includes(q) ||
      v.queue_display?.toLowerCase().includes(q) ||
      v.visit_number?.toLowerCase().includes(q)
    );
  });

  // Call / Start Examination handler
  const handleStartExamination = async (visit: Visit) => {
    try {
      await visitService.updateStatus(visit.id, 'IN_EXAMINATION');
      toast.success(`Pasien ${visit.patient_name} dipanggil ke ruang periksa.`);
      navigate(`/doctor/examination?visit_id=${visit.id}`);
    } catch (err: any) {
      toast.error('Gagal mengubah status antrean');
    }
  };

  // Confirm cancel visit
  const handleConfirmCancel = async () => {
    if (!cancelVisitId) return;
    try {
      setIsCancelling(true);
      await visitService.updateStatus(cancelVisitId, 'CANCELLED', 'Dibatalkan oleh petugas antrean');
      toast.success('Kunjungan pasien berhasil dibatalkan.');
      setCancelVisitId(null);
      fetchQueues();
    } catch (err: any) {
      toast.error('Gagal membatalkan kunjungan');
    } finally {
      setIsCancelling(false);
    }
  };

  // Metrics
  const totalCount = visits.length;
  const waitingCount = visits.filter((v) => v.status === 'WAITING').length;
  const inExamCount = visits.filter((v) => v.status === 'IN_EXAMINATION').length;
  const completedCount = visits.filter((v) => v.status === 'COMPLETED').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-7 h-7 text-primary" />
            Antrean Rawat Jalan Hari Ini
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Pusat kendali antrean poliklinik, status pelayanan pasien, dan pemanggilan dokter.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchQueues}
            leftIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Segarkan Antrean
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/registration')}
            leftIcon={<UserCheck className="w-4 h-4" />}
          >
            Pendaftaran Baru
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Pasien</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1 font-mono">{totalCount}</h3>
            </div>
            <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Menunggu</p>
              <h3 className="text-2xl font-black text-amber-600 mt-1 font-mono">{waitingCount}</h3>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Pemeriksaan</p>
              <h3 className="text-2xl font-black text-blue-600 mt-1 font-mono">{inExamCount}</h3>
            </div>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Stethoscope className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider">Selesai</p>
              <h3 className="text-2xl font-black text-teal-600 mt-1 font-mono">{completedCount}</h3>
            </div>
            <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card padding="md">
        <div className="flex flex-col lg:flex-row gap-4 justify-between">
          {/* Polyclinic Tabs / Dropdown */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
            <button
              onClick={() => setSelectedPolyId('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedPolyId === 'ALL'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Semua Poliklinik
            </button>
            {polyclinics.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPolyId(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  selectedPolyId === p.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span className="font-mono bg-white/20 px-1 py-0.2 rounded text-[10px]">{p.queue_prefix}</span>
                <span>{p.name}</span>
              </button>
            ))}
          </div>

          {/* Search Query */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Cari antrean / nama..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-2 pt-3 border-t border-slate-100 mt-3 overflow-x-auto text-xs">
          <span className="text-slate-400 font-medium">Status:</span>
          {[
            { id: 'ALL', label: 'Semua Status' },
            { id: 'WAITING', label: 'Menunggu' },
            { id: 'IN_EXAMINATION', label: 'Diperiksa' },
            { id: 'WAITING_PHARMACY', label: 'Depo Obat' },
            { id: 'READY_FOR_BILLING', label: 'Kasir' },
            { id: 'COMPLETED', label: 'Selesai' },
            { id: 'CANCELLED', label: 'Batal' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStatus(s.id)}
              className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                selectedStatus === s.id
                  ? 'bg-teal-100 text-teal-800 font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Queue Table */}
      <Card padding="none">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={5} cols={6} />
          </div>
        ) : filteredVisits.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Clock className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-semibold text-slate-800">Tidak ada antrean yang cocok</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Belum ada antrean rawat jalan pada kriteria filter yang Anda tentukan.
            </p>
          </div>
        ) : (
          <div>
            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Antrean</th>
                    <th className="py-3 px-4">No. Registrasi</th>
                    <th className="py-3 px-4">Pasien & No. RM</th>
                    <th className="py-3 px-4">Poli & Dokter</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVisits.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-black text-lg text-primary px-2.5 py-1 bg-teal-50 border border-teal-200 rounded-lg">
                          {v.queue_display}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                        {v.visit_number}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{v.patient_name}</div>
                        <div className="text-xs text-slate-400 font-mono">RM: {v.mr_number}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 text-xs">{v.polyclinic_name}</div>
                        <div className="text-xs text-slate-500">{v.doctor_name}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={v.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {v.status === 'WAITING' && (
                            <>
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleStartExamination(v)}
                                leftIcon={<Play className="w-3.5 h-3.5" />}
                              >
                                Panggil & Periksa
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => setCancelVisitId(v.id)}
                              >
                                Batal
                              </Button>
                            </>
                          )}
                          {v.status === 'IN_EXAMINATION' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/doctor/examination?visit_id=${v.id}`)}
                              leftIcon={<Stethoscope className="w-3.5 h-3.5" />}
                            >
                              Lanjut Periksa
                            </Button>
                          )}
                          {v.status === 'WAITING_PHARMACY' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => navigate(`/pharmacy/prescriptions`)}
                              leftIcon={<Pill className="w-3.5 h-3.5" />}
                            >
                              Depo Obat
                            </Button>
                          )}
                          {v.status === 'READY_FOR_BILLING' && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => navigate(`/cashier/invoices?visit_id=${v.id}`)}
                              leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                            >
                              Kasir Billing
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden divide-y divide-slate-100 p-3 space-y-3">
              {filteredVisits.map((v) => (
                <div key={v.id} className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-xl text-primary px-3 py-1 bg-teal-50 border border-teal-200 rounded-lg">
                      {v.queue_display}
                    </span>
                    <StatusBadge status={v.status} />
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-base">{v.patient_name}</h4>
                    <p className="text-xs text-slate-500 font-mono">RM: {v.mr_number} • {v.visit_number}</p>
                    <p className="text-xs text-slate-700 font-medium mt-1">{v.polyclinic_name} — {v.doctor_name}</p>
                  </div>

                  <div className="pt-1">
                    {v.status === 'WAITING' && (
                      <Button
                        size="sm"
                        variant="primary"
                        className="w-full min-h-[44px]"
                        onClick={() => handleStartExamination(v)}
                        leftIcon={<Play className="w-4 h-4" />}
                      >
                        Panggil & Mulai Periksa
                      </Button>
                    )}
                    {v.status === 'IN_EXAMINATION' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full min-h-[44px]"
                        onClick={() => navigate(`/doctor/examination?visit_id=${v.id}`)}
                        leftIcon={<Stethoscope className="w-4 h-4" />}
                      >
                        Buka Lembar EMR
                      </Button>
                    )}
                    {v.status === 'READY_FOR_BILLING' && (
                      <Button
                        size="sm"
                        variant="primary"
                        className="w-full min-h-[44px]"
                        onClick={() => navigate(`/cashier/invoices?visit_id=${v.id}`)}
                        leftIcon={<CreditCard className="w-4 h-4" />}
                      >
                        Proses Pembayaran Kasir
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog
        isOpen={!!cancelVisitId}
        onClose={() => setCancelVisitId(null)}
        onConfirm={handleConfirmCancel}
        title="Batalkan Antrean Pasien?"
        description="Antrean yang dibatalkan tidak dapat dikembalikan dan nomor antrean tidak akan digunakan kembali."
        confirmText="Ya, Batalkan Kunjungan"
        cancelText="Kembali"
        variant="danger"
        isLoading={isCancelling}
      />
    </div>
  );
};
