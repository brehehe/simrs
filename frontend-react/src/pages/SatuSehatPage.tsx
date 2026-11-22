import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  Layers,
  Send,
  Eye,
  Activity,
  FileCheck2,
  Database,
  Building2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SatuSehatModal } from '../components/SatuSehatModal';
import api from '../services/api';
import { toast } from 'sonner';

interface OrganizationMeta {
  id: string;
  name: string;
  status: string;
  environment: string;
  standard: string;
  regulation: string;
}

interface SatuSehatStats {
  organization: OrganizationMeta;
  stats: {
    total_visits: number;
    synced_count: number;
    pending_count: number;
    failed_count: number;
    sync_percentage: number;
    total_resources: number;
  };
  resource_distribution: {
    Patient: number;
    Encounter: number;
    Condition: number;
    Observation: number;
    MedicationRequest: number;
    DiagnosticReport: number;
  };
}

interface SatuSehatLogItem {
  id: number;
  visit_id: string;
  resource_type: string;
  satusehat_id: string | null;
  status: 'SYNCED' | 'PENDING' | 'FAILED';
  synced_at: string;
  visit_number: string;
  visit_status: string;
  mr_number: string;
  nik: string;
  patient_name: string;
  polyclinic_name: string;
  doctor_name: string;
}

export const SatuSehatPage: React.FC = () => {
  const [statsData, setStatsData] = useState<SatuSehatStats | null>(null);
  const [logs, setLogs] = useState<SatuSehatLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [batchSyncing, setBatchSyncing] = useState<boolean>(false);

  // Modal inspection state
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resStats, resLogs] = await Promise.all([
        api.get('/satusehat/stats'),
        api.get('/satusehat/logs', {
          params: { status: statusFilter === 'ALL' ? undefined : statusFilter, limit: 100 },
        }),
      ]);

      setStatsData(resStats.data?.data || null);
      setLogs(resLogs.data?.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat data hub SATUSEHAT.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleBatchSync = async () => {
    setBatchSyncing(true);
    try {
      const res = await api.post('/satusehat/batch-sync', { limit: 25 });
      const data = res.data?.data;
      toast.success(
        `Batch Sync Selesai! ${data?.synced_count ?? 0} kunjungan berhasil disinkronisasi ke SATUSEHAT.`
      );
      await fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menjalankan batch sync SATUSEHAT.');
    } finally {
      setBatchSyncing(false);
    }
  };

  const handleOpenFhirModal = (visitId: string) => {
    setSelectedVisitId(visitId);
    setModalOpen(true);
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.patient_name?.toLowerCase().includes(q) ||
      log.mr_number?.toLowerCase().includes(q) ||
      log.nik?.toLowerCase().includes(q) ||
      log.visit_number?.toLowerCase().includes(q) ||
      log.satusehat_id?.toLowerCase().includes(q) ||
      log.polyclinic_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-teal-700/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center space-x-4">
            <div className="p-3.5 bg-teal-500/20 backdrop-blur-md rounded-2xl border border-teal-400/30 text-teal-300">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  Hub Bridging SATUSEHAT Kemenkes RI
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  CONNECTED
                </span>
                <span className="px-2 py-0.5 text-xs font-medium bg-teal-500/20 text-teal-200 border border-teal-400/30 rounded-full">
                  HL7 FHIR R4
                </span>
              </div>
              <p className="text-xs sm:text-sm text-teal-100/90 mt-1">
                Transmisi Rekam Medis Elektronik Terintegrasi (Kepatuhan Permenkes No. 24 Tahun 2022 Pasal 25 & 26)
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Segarkan
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleBatchSync}
              disabled={batchSyncing}
              className="bg-teal-500 hover:bg-teal-600 text-white shadow-lg shadow-teal-500/30"
            >
              <Send className={`w-4 h-4 mr-2 ${batchSyncing ? 'animate-spin' : ''}`} />
              {batchSyncing ? 'Sinkronisasi...' : 'Batch Sync Semua Kunjungan'}
            </Button>
          </div>
        </div>

        {/* Sub-meta details */}
        <div className="mt-5 pt-4 border-t border-teal-700/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-teal-200">
          <div>
            <span className="text-teal-400 block font-medium">Organisasi:</span>
            <span className="text-white font-semibold">{statsData?.organization?.name ?? 'RS Inova Medika Solusindo'}</span>
          </div>
          <div>
            <span className="text-teal-400 block font-medium">Kemenkes IHS Org ID:</span>
            <span className="text-white font-mono font-bold">{statsData?.organization?.id ?? '10000004'}</span>
          </div>
          <div>
            <span className="text-teal-400 block font-medium">Environment:</span>
            <span className="text-white font-semibold">Staging / Production-Ready</span>
          </div>
          <div>
            <span className="text-teal-400 block font-medium">Status Interoperabilitas:</span>
            <span className="text-emerald-300 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 100% FHIR Bundled
            </span>
          </div>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-l-4 border-l-teal-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Kunjungan RME
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {statsData?.stats?.total_visits ?? 0}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-xs text-slate-500">
            <span>Rekam Medis Terdaftar di SIMRS</span>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Terintegrasi SATUSEHAT
              </p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                {statsData?.stats?.synced_count ?? 0}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-xs font-medium text-emerald-600">
            <span>{statsData?.stats?.sync_percentage ?? 0}% Kepatuhan Sinkronisasi</span>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Belum Terintegrasi
              </p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">
                {statsData?.stats?.pending_count ?? 0}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-xs text-slate-500">
            <span>Siap Ditransmisikan via Batch Sync</span>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-indigo-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total FHIR Resources
              </p>
              <h3 className="text-2xl font-bold text-indigo-600 mt-1">
                {statsData?.stats?.total_resources ?? 0}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 flex items-center text-xs text-slate-500">
            <span>Patient, Encounter, Condition, Obs, Rx, Lab</span>
          </div>
        </Card>
      </div>

      {/* 3. FHIR R4 Resource Distribution */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-teal-600" />
            <h2 className="text-base font-bold text-slate-900">
              Distribusi Resource HL7 FHIR R4 Terkodifikasi
            </h2>
          </div>
          <span className="text-xs text-slate-500">Standar Terminologi ICD-10, LOINC & KFA</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-medium text-slate-500 block">Patient</span>
            <span className="text-lg font-bold text-slate-900 mt-0.5 block">
              {statsData?.resource_distribution?.Patient ?? 0}
            </span>
            <span className="text-[10px] text-teal-600 font-medium">NIK 16-Digit Verified</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-medium text-slate-500 block">Encounter</span>
            <span className="text-lg font-bold text-slate-900 mt-0.5 block">
              {statsData?.resource_distribution?.Encounter ?? 0}
            </span>
            <span className="text-[10px] text-teal-600 font-medium">Class: AMB (Ambulatory)</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-medium text-slate-500 block">Condition</span>
            <span className="text-lg font-bold text-slate-900 mt-0.5 block">
              {statsData?.resource_distribution?.Condition ?? 0}
            </span>
            <span className="text-[10px] text-teal-600 font-medium">ICD-10 Primer/Sekunder</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-medium text-slate-500 block">Observation</span>
            <span className="text-lg font-bold text-slate-900 mt-0.5 block">
              {statsData?.resource_distribution?.Observation ?? 0}
            </span>
            <span className="text-[10px] text-teal-600 font-medium">Vital Signs (LOINC)</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-medium text-slate-500 block">MedicationRequest</span>
            <span className="text-lg font-bold text-slate-900 mt-0.5 block">
              {statsData?.resource_distribution?.MedicationRequest ?? 0}
            </span>
            <span className="text-[10px] text-teal-600 font-medium">E-Resep Farmasi KFA</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-medium text-slate-500 block">DiagnosticReport</span>
            <span className="text-lg font-bold text-slate-900 mt-0.5 block">
              {statsData?.resource_distribution?.DiagnosticReport ?? 0}
            </span>
            <span className="text-[10px] text-teal-600 font-medium">Hasil Lab Patologi</span>
          </div>
        </div>
      </Card>

      {/* 4. Filter & Search Controls */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari pasien, No. RM, NIK, No. Kunjungan, atau IHS ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-slate-500">Filter Status:</span>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs font-medium">
              {(['ALL', 'SYNCED', 'PENDING', 'FAILED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    statusFilter === st
                      ? 'bg-white text-slate-900 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'ALL' ? 'Semua' : st}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* 5. Logs Table */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Riwayat Transmisi SATUSEHAT Kemenkes RI
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Menampilkan {filteredLogs.length} entri riwayat transmisi FHIR Bundle
            </p>
          </div>
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Waktu Sinkron</th>
                <th className="py-3 px-4">Identitas Pasien</th>
                <th className="py-3 px-4">No. Kunjungan / Poli</th>
                <th className="py-3 px-4">Dokter DPJP</th>
                <th className="py-3 px-4">IHS Resource ID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    Tidak ada log transmisi SATUSEHAT yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {new Date(log.synced_at).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{log.patient_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        RM: {log.mr_number} | NIK: {log.nik}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{log.visit_number}</div>
                      <div className="text-[11px] text-teal-600">{log.polyclinic_name}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{log.doctor_name}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {log.satusehat_id ? (
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                          {log.satusehat_id}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          log.status === 'SYNCED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : log.status === 'FAILED'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {log.status === 'SYNCED' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {log.status === 'FAILED' && <AlertTriangle className="w-3 h-3 mr-1" />}
                        {log.status === 'PENDING' && <Clock className="w-3 h-3 mr-1" />}
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenFhirModal(log.visit_id)}
                        className="text-teal-700 hover:text-teal-900 hover:bg-teal-50 border-teal-200"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        FHIR Bundle
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredLogs.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Tidak ada log transmisi SATUSEHAT yang cocok dengan filter.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-500">
                    {new Date(log.synced_at).toLocaleString('id-ID')}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      log.status === 'SYNCED'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : log.status === 'FAILED'
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {log.status}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">{log.patient_name}</h4>
                  <p className="text-xs text-slate-500 font-mono">
                    RM: {log.mr_number} | {log.polyclinic_name}
                  </p>
                </div>
                {log.satusehat_id && (
                  <p className="text-[11px] font-mono text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200 break-all">
                    {log.satusehat_id}
                  </p>
                )}
                <div className="pt-2 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenFhirModal(log.visit_id)}
                    className="w-full text-xs text-teal-700 border-teal-200"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    Inspeksi FHIR R4 Bundle
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Embedded SATUSEHAT FHIR Modal */}
      <SatuSehatModal
        visitId={selectedVisitId}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedVisitId(null);
        }}
      />
    </div>
  );
};
