import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Activity,
  FileText,
  Filter,
  Search,
  User,
  Clock,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertCircle,
  Database,
  ArrowRight,
  Stethoscope,
  Pill,
  CreditCard,
  UserPlus,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import api from '../services/api';

interface AuditLogItem {
  id: number;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values: any;
  new_values: any;
  user_id: string | null;
  ip_address: string;
  created_at: string;
  username: string | null;
  user_full_name: string | null;
  user_role: string | null;
}

interface ComplianceSummary {
  status: string;
  regulation: string;
  evaluated_at: string;
  metrics: {
    total_audit_records: number;
    total_rme_revisions: number;
    satusehat_fhir_sync_events: number;
    idempotent_financial_transactions: number;
    immutability_status: string;
    retention_policy_years: number;
  };
  audit_domains: {
    pendaftaran_dan_antrean: number;
    rekam_medis_soap: number;
    dispensasi_farmasi: number;
    billing_dan_kasir: number;
  };
}

export const AuditTrailPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterTable, setFilterTable] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [diffModalOpen, setDiffModalOpen] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (filterTable) params.table_name = filterTable;
      if (filterAction) params.action = filterAction;

      const [logsRes, summaryRes] = await Promise.all([
        api.get('/api/v1/audit/logs', { params }),
        api.get('/api/v1/audit/compliance-summary'),
      ]);

      if (logsRes.data && logsRes.data.data) {
        setLogs(logsRes.data.data);
      }
      if (summaryRes.data && summaryRes.data.data) {
        setSummary(summaryRes.data.data);
      }
    } catch (err) {
      console.error('Gagal mengambil data audit trail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterTable, filterAction]);

  const filteredLogs = logs.filter((log) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.record_id.toLowerCase().includes(term) ||
      (log.user_full_name && log.user_full_name.toLowerCase().includes(term)) ||
      (log.username && log.username.toLowerCase().includes(term)) ||
      log.table_name.toLowerCase().includes(term)
    );
  });

  const getDomainIcon = (table: string) => {
    switch (table) {
      case 'medical_records':
      case 'visit_diagnoses':
      case 'visit_procedures':
        return <Stethoscope className="w-4 h-4 text-primary-600" />;
      case 'prescriptions':
      case 'prescription_items':
      case 'stock_movements':
        return <Pill className="w-4 h-4 text-emerald-600" />;
      case 'payments':
      case 'invoices':
        return <CreditCard className="w-4 h-4 text-indigo-600" />;
      case 'visits':
      case 'patients':
        return <UserPlus className="w-4 h-4 text-cyan-600" />;
      default:
        return <Database className="w-4 h-4 text-slate-500" />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'INSERT':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">INSERT</span>;
      case 'UPDATE':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200">UPDATE</span>;
      case 'DELETE':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 border border-rose-200">DELETE</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-800">{action}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner Permenkes 24/2022 */}
      <div className="bg-gradient-to-r from-teal-900 via-primary-900 to-slate-900 text-white rounded-xl p-6 shadow-sm border border-teal-800/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30 text-xs font-semibold tracking-wide">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              KEPATUHAN REGULASI NASIONAL • PERMENKES RI NO. 24 TAHUN 2022
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Audit Trail & Integritas Rekam Medis Elektronik
            </h1>
            <p className="text-sm text-teal-100/80 max-w-2xl">
              Pencatatan jejak audit otomatis, permanen (immutable), dan tidak dapat dimanipulasi untuk setiap akses, mutasi SOAP, resep farmasi, dan transaksi billing.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              className="bg-teal-950/40 border-teal-700/60 text-white hover:bg-teal-800/50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Segarkan Log
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards Ringkasan Kepatuhan */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-teal-200 bg-teal-50/40">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-teal-800">Status Kepatuhan RME</p>
                <p className="text-xl font-bold text-teal-900 mt-1">{summary.status}</p>
                <p className="text-xs text-teal-700 mt-1">Permenkes 24/2022 Pasal 25 & 26</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-sm">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Total Mutasi Audit Log</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {summary.metrics.total_audit_records.toLocaleString('id-ID')}
                </p>
                <p className="text-xs text-slate-500 mt-1">Tercatat secara atomik di PostgreSQL</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center text-primary-700">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Revisi Klinis SOAP</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {summary.metrics.total_rme_revisions.toLocaleString('id-ID')}
                </p>
                <p className="text-xs text-slate-500 mt-1">Riwayat data lama tersimpan di JSONB</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                <FileText className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Masa Retensi Data RME</p>
                <p className="text-xl font-bold text-slate-900 mt-1">
                  {summary.metrics.retention_policy_years} Tahun
                </p>
                <p className="text-xs text-slate-500 mt-1">Statuta Hukum UU Kesehatan</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filter & Toolbar */}
      <Card padding="md">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Domain:
            </span>
            <button
              onClick={() => setFilterTable('')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterTable === ''
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Semua Domain
            </button>
            <button
              onClick={() => setFilterTable('medical_records')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterTable === 'medical_records'
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Rekam Medis (EMR)
            </button>
            <button
              onClick={() => setFilterTable('prescriptions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterTable === 'prescriptions'
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Farmasi & Stok
            </button>
            <button
              onClick={() => setFilterTable('payments')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterTable === 'payments'
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Kasir & Billing
            </button>
            <button
              onClick={() => setFilterTable('visits')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterTable === 'visits'
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Pendaftaran Kunjungan
            </button>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari user, ID, tabel..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="">Semua Aksi</option>
              <option value="INSERT">INSERT</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Tabel Audit Log */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-3 px-4">Waktu (WIB)</th>
                <th className="py-3 px-4">Domain Entitas</th>
                <th className="py-3 px-4">Aksi DML</th>
                <th className="py-3 px-4">Pelaku Akses / User</th>
                <th className="py-3 px-4">Peran (RBAC)</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4 text-right">Rincian Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-600" />
                    Memuat data audit trail...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Tidak ada catatan audit yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {log.created_at ? new Date(log.created_at).toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getDomainIcon(log.table_name)}
                        <span className="font-medium text-slate-800">{log.table_name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono truncate max-w-[150px] block">
                        ID: {log.record_id}
                      </span>
                    </td>
                    <td className="py-3 px-4">{getActionBadge(log.action)}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800">
                        {log.user_full_name || log.username || 'System Daemon'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-slate-100 text-slate-700">
                        {log.user_role || 'SYSTEM'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedLog(log);
                          setDiffModalOpen(true);
                        }}
                        className="text-xs h-7 px-2.5"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" />
                        Lihat Data
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Detail Diff Nilai Audit */}
      <Modal
        isOpen={diffModalOpen}
        onClose={() => setDiffModalOpen(false)}
        title="Detail Mutasi Data Audit Trail (Permenkes 24/2022)"
      >
        {selectedLog && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <p className="text-slate-500">Tabel Sumber:</p>
                <p className="font-semibold text-slate-800">{selectedLog.table_name}</p>
              </div>
              <div>
                <p className="text-slate-500">Aksi Mutasi:</p>
                <p className="font-semibold">{getActionBadge(selectedLog.action)}</p>
              </div>
              <div>
                <p className="text-slate-500">Pelaku (User):</p>
                <p className="font-semibold text-slate-800">
                  {selectedLog.user_full_name || selectedLog.username || 'System'} ({selectedLog.user_role || 'SYSTEM'})
                </p>
              </div>
              <div>
                <p className="text-slate-500">Waktu & IP:</p>
                <p className="font-semibold text-slate-800">
                  {new Date(selectedLog.created_at).toLocaleString('id-ID')} ({selectedLog.ip_address})
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span> Nilai Sebelumnya (Previous State)
                </p>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg overflow-x-auto text-[11px] max-h-60 font-mono">
                  {selectedLog.old_values ? JSON.stringify(selectedLog.old_values, null, 2) : 'null (Data Baru / INSERT)'}
                </pre>
              </div>
              <div>
                <p className="font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Nilai Baru (New State)
                </p>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg overflow-x-auto text-[11px] max-h-60 font-mono">
                  {selectedLog.new_values ? JSON.stringify(selectedLog.new_values, null, 2) : 'null'}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setDiffModalOpen(false)}>Tutup</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
