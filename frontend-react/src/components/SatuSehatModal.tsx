import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { Button } from './ui/Button';
import { ShieldCheck, X, Copy, Check, RefreshCw, Send, CheckCircle2, Database, Layers } from 'lucide-react';
import { toast } from 'sonner';

interface SatuSehatModalProps {
  visitId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SatuSehatModal: React.FC<SatuSehatModalProps> = ({ visitId, isOpen, onClose }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [bundle, setBundle] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);

  const fetchData = async () => {
    if (!visitId) return;
    setLoading(true);
    try {
      const [resBundle, resLogs] = await Promise.all([
        apiClient.get(`/visits/${visitId}/fhir-bundle`),
        apiClient.get(`/visits/${visitId}/satusehat-logs`),
      ]);
      setBundle(resBundle.data?.data);
      setLogs(resLogs.data?.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat data FHIR SATUSEHAT.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && visitId) {
      fetchData();
    } else {
      setBundle(null);
      setLogs([]);
    }
  }, [isOpen, visitId]);

  const handleSync = async () => {
    if (!visitId) return;
    setSyncing(true);
    try {
      const res = await apiClient.post(`/visits/${visitId}/satusehat-sync`);
      toast.success(res.data?.message || 'Sinkronisasi SATUSEHAT Kemenkes RI berhasil!');
      await fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal sinkronisasi ke SATUSEHAT.');
    } finally {
      setSyncing(false);
    }
  };

  const handleCopyJson = () => {
    if (!bundle) return;
    navigator.clipboard.writeText(JSON.stringify(bundle, null, 2));
    setCopied(true);
    toast.success('JSON FHIR R4 Bundle disalin ke clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  // Hitung jumlah resource per jenis
  const entries: any[] = bundle?.entry || [];
  const patientCount = entries.filter((e) => e.resource?.resourceType === 'Patient').length;
  const encounterCount = entries.filter((e) => e.resource?.resourceType === 'Encounter').length;
  const conditionCount = entries.filter((e) => e.resource?.resourceType === 'Condition').length;
  const observationCount = entries.filter((e) => e.resource?.resourceType === 'Observation').length;
  const medicationCount = entries.filter((e) => e.resource?.resourceType === 'MedicationRequest').length;
  const labCount = entries.filter((e) => e.resource?.resourceType === 'DiagnosticReport').length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-teal-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-800 text-teal-300 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold tracking-wide">SATUSEHAT Kemenkes RI</h2>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-teal-700 text-teal-100 rounded-full">
                  HL7 FHIR R4
                </span>
              </div>
              <p className="text-xs text-teal-200">Interoperabilitas Rekam Medis Elektronik (Permenkes No. 24/2022)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-teal-200 hover:text-white rounded-lg hover:bg-teal-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-slate-800">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500 font-medium">Menghubungkan ke standarisasi FHIR R4...</p>
            </div>
          ) : bundle ? (
            <>
              {/* Compliance Status Banner */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-emerald-900 text-sm">Validitas FHIR R4 Terverifikasi</h3>
                    <p className="text-xs text-emerald-700">
                      Bundle ID: <span className="font-mono font-semibold">{bundle.id}</span> • Total Entri: <strong>{bundle.total} Resource</strong>
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={handleCopyJson}>
                    {copied ? <Check className="w-4 h-4 mr-1 text-emerald-600" /> : <Copy className="w-4 h-4 mr-1" />}
                    {copied ? 'Tersalin' : 'Salin JSON'}
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleSync} disabled={syncing}>
                    {syncing ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
                    {syncing ? 'Mengirim...' : 'Kirim ke SATUSEHAT'}
                  </Button>
                </div>
              </div>

              {/* Resource Counter Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="block text-slate-400 text-[10px] font-bold uppercase">Patient</span>
                  <span className="text-base font-extrabold text-slate-800">{patientCount}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="block text-slate-400 text-[10px] font-bold uppercase">Encounter</span>
                  <span className="text-base font-extrabold text-slate-800">{encounterCount}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="block text-slate-400 text-[10px] font-bold uppercase">Condition (ICD-10)</span>
                  <span className="text-base font-extrabold text-teal-700">{conditionCount}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="block text-slate-400 text-[10px] font-bold uppercase">Observation (Vitals)</span>
                  <span className="text-base font-extrabold text-blue-700">{observationCount}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="block text-slate-400 text-[10px] font-bold uppercase">Medication</span>
                  <span className="text-base font-extrabold text-indigo-700">{medicationCount}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="block text-slate-400 text-[10px] font-bold uppercase">DiagnosticReport</span>
                  <span className="text-base font-extrabold text-purple-700">{labCount}</span>
                </div>
              </div>

              {/* JSON FHIR Bundle Viewer */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center">
                    <Layers className="w-3.5 h-3.5 mr-1 text-teal-600" />
                    Payload HL7 FHIR R4 Bundle (JSON):
                  </span>
                  <span className="text-[11px] text-slate-400">Standard Kemenkes RI DTO Specification</span>
                </div>
                <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto max-h-72 border border-slate-800 select-all shadow-inner">
                  <pre>{JSON.stringify(bundle, null, 2)}</pre>
                </div>
              </div>

              {/* History Log Sinkronisasi */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 flex items-center">
                  <Database className="w-3.5 h-3.5 mr-1 text-teal-600" />
                  Riwayat Log Transmisi SATUSEHAT:
                </span>
                {logs && logs.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px]">
                        <tr>
                          <th className="py-2 px-3">Waktu Transmisi</th>
                          <th className="py-2 px-3">Resource</th>
                          <th className="py-2 px-3">IHS Identifier</th>
                          <th className="py-2 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {logs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-mono text-slate-600">{log.synced_at}</td>
                            <td className="py-2 px-3 font-semibold">{log.resource_type}</td>
                            <td className="py-2 px-3 font-mono text-teal-700">{log.satusehat_id || '-'}</td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-lg border border-slate-200">
                    Belum ada riwayat transmisi untuk kunjungan ini. Klik "Kirim ke SATUSEHAT" untuk memulai.
                  </p>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
          <p className="text-[11px] text-slate-400">
            Terhubung ke SATUSEHAT Sandbox/Production Environment Kemenkes RI
          </p>
          <Button variant="outline" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>

      </div>
    </div>
  );
};
export default SatuSehatModal;
