import React, { useState, useEffect } from 'react';
import { 
  FlaskConical, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Send, 
  FileText, 
  User, 
  Stethoscope, 
  AlertCircle 
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { StatusBadge } from '../components/ui/StatusBadge';
import { TableSkeleton } from '../components/ui/Skeleton';
import { dashboardService } from '../services/dashboardService';
import { visitService, Visit } from '../services/visitService';

export interface LabOrderView {
  id: string;
  order_number: string;
  visit_id: string;
  patient_name: string;
  mr_number: string;
  doctor_name: string;
  status: 'ORDERED' | 'IN_PROGRESS' | 'COMPLETED';
  clinical_notes?: string;
  created_at: string;
  items: {
    id: string;
    test_name: string;
    unit: string;
    normal_range: string;
    result_value?: string;
  }[];
}

export const LabOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<LabOrderView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Result entry modal
  const [activeOrder, setActiveOrder] = useState<LabOrderView | null>(null);
  const [resultsForm, setResultsForm] = useState<Record<string, string>>({});
  const [analyzerName, setAnalyzerName] = useState('Sysmex XN-550 Hematology Analyzer');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLabOrders = async () => {
    try {
      setIsLoading(true);
      // Dummy data representing incoming lab requests from doctors
      const dummyOrders: LabOrderView[] = [
        {
          id: '30000000-0000-0000-0000-000000000001',
          order_number: 'LAB-ORD-20261122-0001',
          visit_id: 'v1',
          patient_name: 'Bambang Pamungkas',
          mr_number: 'RM-202611-00001',
          doctor_name: 'dr. Budi Santoso, Sp.PD',
          status: 'ORDERED',
          clinical_notes: 'Evaluasi anemia curiga perdarahan saluran cerna dan skrining infeksi',
          created_at: new Date().toISOString(),
          items: [
            { id: '40000000-0000-0000-0000-000000000001', test_name: 'Darah Lengkap (Complete Blood Count)', unit: 'Panel', normal_range: 'Hb: 13-17 g/dL' },
            { id: '40000000-0000-0000-0000-000000000002', test_name: 'Glukosa Darah Sewaktu (GDS)', unit: 'mg/dL', normal_range: '70 - 140' },
          ],
        },
        {
          id: '30000000-0000-0000-0000-000000000002',
          order_number: 'LAB-ORD-20261122-0002',
          visit_id: 'v4',
          patient_name: 'Dewi Lestari',
          mr_number: 'RM-202611-00004',
          doctor_name: 'dr. Citra Lestari, Sp.OG',
          status: 'COMPLETED',
          clinical_notes: 'Pemeriksaan rutin antenatal care trimester 2',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          items: [
            { id: '40000000-0000-0000-0000-000000000003', test_name: 'Darah Lengkap (CBC)', unit: 'Panel', normal_range: 'Hb: 12-16 g/dL', result_value: '13.1 g/dL' },
          ],
        },
      ];
      setOrders(dummyOrders);
    } catch {
      toast.error('Gagal memuat daftar permintaan laboratorium');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLabOrders();
  }, []);

  const filtered = orders.filter((o) => {
    if (selectedStatus !== 'ALL' && o.status !== selectedStatus) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(q) ||
      o.patient_name.toLowerCase().includes(q) ||
      o.mr_number.toLowerCase().includes(q)
    );
  });

  const handleOpenResultModal = (order: LabOrderView) => {
    setActiveOrder(order);
    const initial: Record<string, string> = {};
    order.items.forEach(item => {
      initial[item.id] = item.result_value || '';
    });
    setResultsForm(initial);
  };

  const handleSubmitResults = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;

    try {
      setIsSubmitting(true);
      const resultsPayload = activeOrder.items.map(item => ({
        lab_order_item_id: item.id,
        result_value: resultsForm[item.id] || 'Dalam batas normal',
        unit: item.unit,
        normal_range: item.normal_range,
        status: 'FINAL',
        notes: `Diverifikasi oleh analis lab menggunakan ${analyzerName}`,
      }));

      const idempotencyKey = `idemp-lab-${activeOrder.id}-${Date.now()}`;

      // Submit via Node.js Integration Gateway
      await dashboardService.submitLabWebhook({
        idempotency_key: idempotencyKey,
        lab_order_id: activeOrder.id,
        verified_by: analyzerName,
        results: resultsPayload,
      });

      toast.success('Hasil laboratorium berhasil dikirim dan disinkronkan ke SIMRS Core!');
      setActiveOrder(null);
      fetchLabOrders();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      toast.error(msg || 'Gagal mengirim hasil laboratorium ke gateway');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FlaskConical className="w-7 h-7 text-primary" />
            Laboratorium Klinis & Ingesti Analyzer
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manajemen permintaan tes diagnostik dan pengiriman hasil otomatis via Node.js Gateway.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchLabOrders}
          leftIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
        >
          Segarkan Data
        </Button>
      </div>

      {/* Filter Toolbar */}
      <Card padding="md">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            {[
              { id: 'ALL', label: 'Semua Permintaan' },
              { id: 'ORDERED', label: 'Menunggu Sampel / Uji' },
              { id: 'COMPLETED', label: 'Selesai Hasil' },
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
              placeholder="Cari order / nama pasien..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </Card>

      {/* Lab Order List */}
      <div className="space-y-4">
        {filtered.map((order) => {
          const isCompleted = order.status === 'COMPLETED';
          return (
            <Card key={order.id} padding="md">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
                    <FlaskConical className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {order.order_number}
                      </span>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Waktu order: {new Date(order.created_at).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs text-slate-600">
                  <div>
                    <span className="block text-slate-400">Pasien:</span>
                    <span className="font-semibold text-slate-900">{order.patient_name}</span>
                    <span className="font-mono text-slate-500 ml-1">({order.mr_number})</span>
                  </div>
                  <div>
                    <span className="block text-slate-400">Dokter Pemohon:</span>
                    <span className="font-semibold text-slate-900">{order.doctor_name}</span>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="py-3 text-xs space-y-2">
                <p className="font-semibold text-slate-700">Pemeriksaan yang Diminta:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-900">{item.test_name}</p>
                        <p className="text-[11px] text-slate-500">Nilai Normal: {item.normal_range} {item.unit}</p>
                      </div>
                      {item.result_value && (
                        <span className="font-mono font-bold text-teal-700 px-2 py-0.5 bg-teal-50 rounded">
                          {item.result_value}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {order.clinical_notes && (
                  <p className="text-[11px] text-slate-500 italic mt-2">
                    Indikasi Klinis: {order.clinical_notes}
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-slate-100 pt-3 flex justify-end">
                {!isCompleted ? (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleOpenResultModal(order)}
                    leftIcon={<Send className="w-4 h-4" />}
                  >
                    Input Hasil & Sinkronkan Gateway
                  </Button>
                ) : (
                  <span className="text-xs font-semibold text-green-700 flex items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                    <CheckCircle2 className="w-4 h-4" />
                    Hasil Uji Telah Diverifikasi & Dikirim
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Input Result Modal */}
      <Modal
        isOpen={!!activeOrder}
        onClose={() => setActiveOrder(null)}
        maxWidth="lg"
        title="Input & Verifikasi Hasil Laboratorium"
        description="Hasil uji akan dikirimkan ke Node.js Gateway dengan validasi skema Zod dan diteruskan secara otomatis ke SIMRS Core."
      >
        {activeOrder && (
          <form onSubmit={handleSubmitResults} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Alat Analyzer / Petugas Pemeriksa
              </label>
              <Input
                value={analyzerName}
                onChange={(e) => setAnalyzerName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-3 border-t border-slate-200 pt-3">
              <h4 className="font-bold text-slate-800">Parameter Uji Laboratorium:</h4>
              {activeOrder.items.map((item) => (
                <div key={item.id} className="p-3 bg-slate-50 rounded-xl space-y-1.5">
                  <div className="flex justify-between font-semibold text-slate-900">
                    <span>{item.test_name}</span>
                    <span className="text-slate-400 font-normal">Normal: {item.normal_range} {item.unit}</span>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500">Nilai Hasil Pengukuran ({item.unit})</label>
                    <Input
                      placeholder={`Contoh: 14.5...`}
                      value={resultsForm[item.id] || ''}
                      onChange={(e) => setResultsForm({ ...resultsForm, [item.id]: e.target.value })}
                      required
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveOrder(null)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                leftIcon={<Send className="w-4 h-4" />}
              >
                Kirim Hasil ke SIMRS Core
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
