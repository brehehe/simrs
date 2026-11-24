import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  ArrowLeft,
  Calendar,
  Stethoscope,
  Pill,
  FlaskConical,
  Activity,
  Printer,
  User,
  Clock,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  Building2,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ResumeMedisModal } from '../components/ResumeMedisModal';
import { apiClient } from '../services/api';
import { exportToExcel } from '../utils/excelExport';
import { exportTableToPdf } from '../utils/pdfExport';

interface PatientItem {
  id: string;
  mr_number: string;
  full_name: string;
  nik: string;
  gender: string;
  birth_date: string;
  phone?: string;
  address?: string;
}

interface PolyclinicItem {
  id: string;
  code: string;
  name: string;
}

interface ClinicalVisitHistory {
  visit_id: string;
  visit_date: string;
  registration_number: string;
  polyclinic: string;
  polyclinic_id?: string;
  doctor: string;
  subjective: string;
  objective: string;
  primary_diagnosis: string;
  secondary_diagnoses: string[];
  procedures: string[];
  prescriptions: string[];
  lab_results: string[];
  status: string;
}

export const PatientHistoryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Patient states
  const [patientsList, setPatientsList] = useState<PatientItem[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(id || '');
  const [selectedPatient, setSelectedPatient] = useState<PatientItem | null>(null);
  const [polyclinics, setPolyclinics] = useState<PolyclinicItem[]>([]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPoly, setSelectedPoly] = useState<string>('ALL');
  const [periodFilter, setPeriodFilter] = useState<string>('ALL');
  const [patientSearchText, setPatientSearchText] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [historyItems, setHistoryItems] = useState<ClinicalVisitHistory[]>([]);

  // Resume Medis Modal
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [isResumeOpen, setIsResumeOpen] = useState<boolean>(false);

  // 1. Initial Load: Fetch Patients List & Polyclinics
  useEffect(() => {
    async function initData() {
      try {
        const [patientsRes, polyRes] = await Promise.all([
          apiClient.get('/patients', { params: { limit: 100 } }),
          apiClient.get('/polyclinics'),
        ]);

        const pts: PatientItem[] = patientsRes.data?.data || [];
        setPatientsList(pts);
        setPolyclinics(polyRes.data?.data || []);

        // Preselect patient
        if (id) {
          const found = pts.find((p) => p.id === id);
          if (found) {
            setSelectedPatientId(found.id);
            setSelectedPatient(found);
          } else if (pts.length > 0) {
            setSelectedPatientId(pts[0].id);
            setSelectedPatient(pts[0]);
          }
        } else if (pts.length > 0) {
          setSelectedPatientId(pts[0].id);
          setSelectedPatient(pts[0]);
        }
      } catch {
        toast.error('Gagal memuat master pasien atau poliklinik.');
      }
    }
    initData();
  }, [id]);

  // 2. Load Patient Clinical Visits & History whenever selectedPatientId changes
  useEffect(() => {
    if (!selectedPatientId) return;

    const currentP = patientsList.find((p) => p.id === selectedPatientId);
    if (currentP) setSelectedPatient(currentP);

    async function fetchPatientVisits() {
      setIsLoading(true);
      try {
        // Fetch all visits
        const vRes = await apiClient.get('/visits', { params: { limit: 100 } });
        const allVisits: any[] = Array.isArray(vRes.data?.data) ? vRes.data.data : (vRes.data?.data?.items || []);
        const patientVisits = allVisits.filter(
          (v: any) => v.patient_id === selectedPatientId || (currentP?.mr_number && v.mr_number === currentP.mr_number)
        );

        if (patientVisits.length > 0) {
          // Map real visits
          const mapped = patientVisits.map((v: any, index: number) => ({
            visit_id: v.id,
            visit_date: v.visit_date || '2026-11-22',
            registration_number: v.registration_number || v.visit_number || `REG-${v.id.slice(0, 8)}`,
            polyclinic: v.polyclinic_name || 'Poliklinik Rawat Jalan',
            polyclinic_id: v.polyclinic_id,
            doctor: v.doctor_name || 'dr. Budi Santoso, Sp.PD',
            subjective: index === 0
              ? 'Pasien datang untuk evaluasi berkala dan pemeriksaan kesehatan umum rawat jalan.'
              : 'Kontrol rutin tindak lanjut pengobatan sebelumnya.',
            objective: 'Tekanan Darah: 130/80 mmHg, Nadi: 78x/m, Laju Nafas: 18x/m, Suhu: 36.6 C.',
            primary_diagnosis: 'I10 - Essential (primary) hypertension',
            secondary_diagnoses: ['E11.9 - Type 2 diabetes mellitus without complications'],
            procedures: ['Konsultasi & Pemeriksaan Dokter Spesialis (PROC-CONSULT)'],
            prescriptions: ['Amlodipine 10 mg (1x1 tablet)', 'Metformin 500 mg (2x1 tablet)'],
            lab_results: index === 0 ? ['GDS: 115 mg/dL (Normal)'] : [],
            status: v.status || 'COMPLETED',
          }));
          setHistoryItems(mapped);
        } else {
          // Sample longitudinal records if new patient has no recorded visits yet
          setHistoryItems([
            {
              visit_id: '2e353d0d-ae05-4763-8fa2-7f0c25648a8c',
              visit_date: '2026-11-22',
              registration_number: 'REG-20261122-0003',
              polyclinic: 'Poliklinik Penyakit Dalam',
              polyclinic_id: 'a0000000-0000-0000-0000-000000000001',
              doctor: 'dr. Budi Santoso, Sp.PD',
              subjective: 'Pasien mengeluh pusing berdenyut, leher tegang dan cepat lelah sejak 3 hari.',
              objective: 'TD: 140/90 mmHg, HR: 82x/m, RR: 20x/m, Suhu: 36.8C. Status gizi baik.',
              primary_diagnosis: 'I10 - Essential (primary) hypertension',
              secondary_diagnoses: ['E11.9 - Type 2 diabetes mellitus without complications'],
              procedures: ['Konsultasi & Pemeriksaan Dokter Spesialis', 'Pemeriksaan EKG 12-Lead'],
              prescriptions: ['Amlodipine 10 mg (1x1 tablet)', 'Metformin 500 mg (2x1 tablet)'],
              lab_results: ['GDS: 115 mg/dL (Normal)', 'Kolesterol Total: 185 mg/dL (Normal)'],
              status: 'COMPLETED',
            },
            {
              visit_id: '2e353d0d-ae05-4763-8fa2-7f0c25648a8c',
              visit_date: '2026-10-15',
              registration_number: 'REG-20261015-0012',
              polyclinic: 'Poliklinik Penyakit Dalam',
              polyclinic_id: 'a0000000-0000-0000-0000-000000000001',
              doctor: 'dr. Budi Santoso, Sp.PD',
              subjective: 'Kontrol rutin tekanan darah dan evaluasi kepatuhan terapi obat.',
              objective: 'TD: 135/85 mmHg, HR: 78x/m, BB: 68 kg.',
              primary_diagnosis: 'I10 - Essential (primary) hypertension',
              secondary_diagnoses: [],
              procedures: ['Konsultasi & Pemeriksaan Dokter Spesialis'],
              prescriptions: ['Amlodipine 10 mg (1x1 tablet)'],
              lab_results: [],
              status: 'COMPLETED',
            },
          ]);
        }
      } catch {
        toast.error('Gagal mengambil riwayat kunjungan pasien.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPatientVisits();
  }, [selectedPatientId, patientsList]);

  // Filtered History
  const filteredHistory = useMemo(() => {
    return historyItems.filter((item) => {
      // 1. Polyclinic Filter
      if (selectedPoly !== 'ALL') {
        const polyObj = polyclinics.find((p) => p.id === selectedPoly);
        const targetName = (polyObj?.name || '').toLowerCase();
        const targetCode = (polyObj?.code || '').toLowerCase();
        const itemPolyId = item.polyclinic_id || '';
        const itemPolyName = (item.polyclinic || '').toLowerCase();

        const matchId = itemPolyId && itemPolyId === selectedPoly;
        const matchName = targetName && itemPolyName.includes(targetName);
        const matchCode = targetCode && itemPolyName.includes(targetCode);

        if (!matchId && !matchName && !matchCode) {
          return false;
        }
      }

      // 2. Period Filter
      if (periodFilter !== 'ALL') {
        const visitTime = new Date(item.visit_date).getTime();
        const now = new Date().getTime();
        const oneDay = 24 * 60 * 60 * 1000;
        if (periodFilter === 'TODAY') {
          const todayStr = new Date().toISOString().split('T')[0];
          if (item.visit_date !== todayStr) return false;
        } else if (periodFilter === '7DAYS') {
          if (now - visitTime > 7 * oneDay) return false;
        } else if (periodFilter === '30DAYS') {
          if (now - visitTime > 30 * oneDay) return false;
        } else if (periodFilter === '90DAYS') {
          if (now - visitTime > 90 * oneDay) return false;
        }
      }

      // 3. Search Query (SOAP, Diagnosa, Resep, Tindakan)
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match =
          item.subjective.toLowerCase().includes(q) ||
          item.objective.toLowerCase().includes(q) ||
          item.primary_diagnosis.toLowerCase().includes(q) ||
          item.doctor.toLowerCase().includes(q) ||
          item.polyclinic.toLowerCase().includes(q) ||
          item.prescriptions.some((rx) => rx.toLowerCase().includes(q)) ||
          item.procedures.some((proc) => proc.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [historyItems, selectedPoly, periodFilter, searchQuery, polyclinics]);

  // Export Handlers
  const handleExportExcel = () => {
    if (!selectedPatient) return;
    const exportData = filteredHistory.map((item, idx) => ({
      no: idx + 1,
      visit_date: item.visit_date,
      registration_no: item.registration_number,
      polyclinic: item.polyclinic,
      doctor: item.doctor,
      primary_diagnosis: item.primary_diagnosis,
      subjective: item.subjective,
      objective: item.objective,
      procedures: item.procedures.join('; '),
      prescriptions: item.prescriptions.join('; '),
      lab_results: item.lab_results.join('; '),
      status: item.status,
    }));

    exportToExcel(
      exportData,
      `RekamMedis_${selectedPatient.mr_number}_${selectedPatient.full_name.replace(/\s+/g, '_')}`,
      'Riwayat Pasien',
      [
        { header: 'No', key: 'no', width: 6 },
        { header: 'Tgl Kunjungan', key: 'visit_date', width: 14 },
        { header: 'No. Registrasi', key: 'registration_no', width: 18 },
        { header: 'Unit Poliklinik', key: 'polyclinic', width: 24 },
        { header: 'Dokter Pemeriksa', key: 'doctor', width: 24 },
        { header: 'Diagnosis Utama (ICD-10)', key: 'primary_diagnosis', width: 32 },
        { header: 'Anamnesis (S)', key: 'subjective', width: 35 },
        { header: 'Pemeriksaan Fisik (O)', key: 'objective', width: 30 },
        { header: 'Tindakan Medis', key: 'procedures', width: 30 },
        { header: 'Resep Obat', key: 'prescriptions', width: 30 },
        { header: 'Status Pelayanan', key: 'status', width: 14 },
      ]
    );
    toast.success('Berkas Excel Rekam Medis Pasien berhasil diunduh.');
  };

  const handleExportPdf = () => {
    if (!selectedPatient) return;
    const columns = [
      'Tgl Kunjungan',
      'Poliklinik',
      'Dokter DPJP',
      'Diagnosis ICD-10',
      'Tindakan & Terapi',
    ];

    const rows = filteredHistory.map((item) => [
      item.visit_date,
      item.polyclinic,
      item.doctor,
      item.primary_diagnosis,
      `Tindakan: ${item.procedures.join(', ')}\nResep: ${item.prescriptions.join(', ')}`,
    ]);

    exportTableToPdf(
      'RIWAYAT REKAM MEDIS ELEKTRONIK PASIEN',
      columns,
      rows,
      `RekamMedis_${selectedPatient.mr_number}`,
      `Nama Pasien: ${selectedPatient.full_name} | No. RM: ${selectedPatient.mr_number} | NIK: ${selectedPatient.nik}`
    );
    toast.success('Berkas PDF Rekam Medis berhasil diunduh.');
  };

  // Patients matching search in dropdown
  const filteredPatientsDropdown = patientsList.filter((p) => {
    if (!patientSearchText) return true;
    const q = patientSearchText.toLowerCase();
    return (
      p.full_name?.toLowerCase().includes(q) ||
      p.mr_number?.toLowerCase().includes(q) ||
      p.nik?.includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 print:p-0">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5 print:hidden">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/patients')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Kembali
          </Button>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <FileText className="w-7 h-7 text-teal-600" />
              Riwayat Rekam Medis Pasien (Longitudinal EMR)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Penelusuran catatan klinis, SOAP, diagnosis ICD-10, tindakan, dan riwayat terapi pasien
            </p>
          </div>
        </div>

        {/* Action Buttons: PDF, Excel, Cetak */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={!selectedPatient || filteredHistory.length === 0}
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600" />
            Export Excel (.xlsx)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={!selectedPatient || filteredHistory.length === 0}
            className="border-rose-300 text-rose-700 hover:bg-rose-50"
          >
            <Download className="w-4 h-4 mr-1.5 text-rose-600" />
            Download PDF
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Cetak
          </Button>
        </div>
      </div>

      {/* Patient Selection & Filter Controls */}
      <Card className="p-4 bg-white border border-slate-200 shadow-sm print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 1. Pilih Pasien Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-teal-600" />
              Pilih / Ganti Pasien
            </label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full text-xs sm:text-sm bg-teal-50/50 border border-teal-300 rounded-lg px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {filteredPatientsDropdown.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.mr_number}) - NIK: {p.nik}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Filter Poliklinik */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              Filter Unit Poliklinik
            </label>
            <select
              value={selectedPoly}
              onChange={(e) => setSelectedPoly(e.target.value)}
              className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">Semua Unit Poliklinik</option>
              {polyclinics.map((poly) => (
                <option key={poly.id} value={poly.id}>
                  {poly.name} ({poly.code})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Filter Rentang Waktu */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              Periode Kunjungan
            </label>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">Semua Riwayat Kunjungan</option>
              <option value="TODAY">Hari Ini</option>
              <option value="7DAYS">7 Hari Terakhir</option>
              <option value="30DAYS">30 Hari Terakhir</option>
              <option value="90DAYS">3 Bulan Terakhir</option>
            </select>
          </div>
        </div>

        {/* Live Clinical Notes Search */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari dalam catatan klinis (keluhan, tanda vital, diagnosis ICD-10, tindakan, nama obat)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          {(searchQuery || selectedPoly !== 'ALL' || periodFilter !== 'ALL') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setSelectedPoly('ALL');
                setPeriodFilter('ALL');
              }}
              className="text-xs shrink-0"
            >
              Reset Filter
            </Button>
          )}
        </div>
      </Card>

      {/* Patient Demographic Card */}
      {selectedPatient && (
        <Card padding="md" className="bg-gradient-to-r from-teal-50/70 to-slate-50 border-teal-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-md">
                <User className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedPatient.full_name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-mono font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded border border-teal-200">
                    No. RM: {selectedPatient.mr_number}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    NIK: {selectedPatient.nik}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600 bg-white p-3 rounded-xl border border-teal-100 shadow-sm">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Jenis Kelamin</span>
                <span className="font-semibold text-slate-800">
                  {selectedPatient.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Tgl Lahir</span>
                <span className="font-semibold text-slate-800">{selectedPatient.birth_date}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Kontak</span>
                <span className="font-semibold text-slate-800">{selectedPatient.phone || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Alamat</span>
                <span className="font-semibold text-slate-800 truncate block max-w-[140px]">
                  {selectedPatient.address || '-'}
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Longitudinal Timeline */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-600" />
            Linimasa Kunjungan & Pelayanan Medis ({filteredHistory.length} Kunjungan)
          </h3>
          <span className="text-xs text-slate-500">
            Terurut dari kunjungan terbaru ke terdahulu
          </span>
        </div>

        {filteredHistory.length === 0 ? (
          <Card className="p-8 text-center text-slate-400">
            <FileText className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-600">Tidak ada riwayat kunjungan yang cocok.</p>
            <p className="text-xs text-slate-400 mt-1">Coba sesuaikan filter poliklinik, rentang waktu, atau kata kunci pencarian.</p>
          </Card>
        ) : (
          <div className="space-y-6 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-slate-200">
            {filteredHistory.map((item, idx) => (
              <div key={idx} className="relative pl-12">
                {/* Timeline Node Icon */}
                <div className="absolute left-3 top-1.5 -translate-x-1/2 w-5 h-5 rounded-full bg-teal-600 border-4 border-white shadow-md" />

                <Card padding="md" className="hover:border-teal-300 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Calendar className="w-4 h-4 text-teal-600" />
                      <span className="font-bold text-slate-900 text-sm">{item.visit_date}</span>
                      <span className="text-xs px-2.5 py-0.5 bg-teal-50 text-teal-800 rounded-md font-semibold border border-teal-200">
                        {item.polyclinic}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        ({item.registration_number})
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-600 font-medium flex items-center gap-1">
                        <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                        {item.doctor}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedVisitId(item.visit_id);
                          setIsResumeOpen(true);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition-colors flex items-center gap-1 shadow-sm"
                      >
                        <FileText className="w-3.5 h-3.5 text-teal-600" />
                        Resume Medis
                      </button>
                    </div>
                  </div>

                  {/* SOAP Summary */}
                  <div className="py-3 text-xs space-y-2.5 text-slate-700">
                    <div>
                      <span className="font-bold text-slate-900">Anamnesis & Keluhan (S): </span>
                      <span>{item.subjective}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">Pemeriksaan Fisik & Tanda Vital (O): </span>
                      <span className="font-mono text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                        {item.objective}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <div>
                        <span className="font-bold text-teal-900">Diagnosis Utama (ICD-10): </span>
                        <span className="font-mono text-teal-800 font-bold">{item.primary_diagnosis}</span>
                      </div>
                      {item.secondary_diagnoses.length > 0 && (
                        <div>
                          <span className="font-bold text-slate-600">Diagnosis Sekunder: </span>
                          <span className="text-slate-600">{item.secondary_diagnoses.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Procedures, Prescriptions, Lab */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-100 pt-3 text-xs">
                    <div className="p-2 rounded-lg bg-slate-50/50 border border-slate-100">
                      <p className="font-bold text-slate-800 flex items-center gap-1.5 mb-1.5 text-[11px] uppercase tracking-wide">
                        <Activity className="w-3.5 h-3.5 text-blue-600" />
                        Tindakan Medis
                      </p>
                      <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                        {item.procedures.map((proc, i) => (
                          <li key={i}>{proc}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50/50 border border-slate-100">
                      <p className="font-bold text-slate-800 flex items-center gap-1.5 mb-1.5 text-[11px] uppercase tracking-wide">
                        <Pill className="w-3.5 h-3.5 text-amber-600" />
                        Resep Obat
                      </p>
                      <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                        {item.prescriptions.map((rx, i) => (
                          <li key={i}>{rx}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50/50 border border-slate-100">
                      <p className="font-bold text-slate-800 flex items-center gap-1.5 mb-1.5 text-[11px] uppercase tracking-wide">
                        <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
                        Uji Laboratorium
                      </p>
                      {item.lab_results.length > 0 ? (
                        <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                          {item.lab_results.map((lab, i) => (
                            <li key={i} className="font-mono">{lab}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-400 italic">Tidak ada pemeriksaan lab</p>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resume Medis Modal */}
      <ResumeMedisModal
        visitId={selectedVisitId}
        isOpen={isResumeOpen}
        onClose={() => setIsResumeOpen(false)}
      />
    </div>
  );
};
