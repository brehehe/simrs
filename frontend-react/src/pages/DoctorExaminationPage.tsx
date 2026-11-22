import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  Activity,
  FileText,
  Pill,
  FlaskConical,
  CheckCircle2,
  AlertCircle,
  Search,
  Plus,
  Trash2,
  User,
  Clock,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ResumeMedisModal } from '../components/ResumeMedisModal';
import { SatuSehatModal } from '../components/SatuSehatModal';
import { visitService, Visit } from '../services/visitService';
import {
  clinicalService,
  Diagnosis,
  Procedure,
  Medicine,
  LabTest
} from '../services/clinicalService';

export const DoctorExaminationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const visitIdFromUrl = searchParams.get('visit_id');

  // Active visit and queue list
  const [activeVisits, setActiveVisits] = useState<Visit[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [isLoadingVisits, setIsLoadingVisits] = useState(true);

  // Modal states for Resume Medis & SATUSEHAT
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [isSatuSehatModalOpen, setIsSatuSehatModalOpen] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'soap' | 'diagnosis' | 'prescription' | 'lab'>('soap');

  // Master clinical catalogs
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);

  // SOAP State
  const [soapData, setSoapData] = useState({
    subjective: 'Pasien datang dengan keluhan pusing berputar dan tengkuk terasa berat sejak 3 hari yang lalu.',
    objective: 'Keadaan umum: Compos mentis, tampak sakit sedang. Jantung/Paru dalam batas normal.',
    systolic_bp: 140,
    diastolic_bp: 90,
    pulse_rate: 82,
    respiratory_rate: 20,
    body_temperature: 36.8,
    weight_kg: 68,
    height_cm: 165,
    assessment: 'Hipertensi Primer Stage 1 terkonfirmasi.',
    plan: 'Modifikasi gaya hidup rendah garam, farmakoterapi antihipertensi oral, dan kontrol ulang 2 minggu.',
  });

  // Diagnosis State
  const [primaryDiagnosisId, setPrimaryDiagnosisId] = useState<string>('');
  const [selectedSecondaryIds, setSelectedSecondaryIds] = useState<string[]>([]);
  const [selectedProcedures, setSelectedProcedures] = useState<{ procedure_id: string; quantity: number }[]>([]);

  // Prescription Items State
  const [prescriptionItems, setPrescriptionItems] = useState<{
    medicine_id: string;
    dosage: string;
    frequency: string;
    quantity: number;
    notes?: string;
  }[]>([]);
  const [prescriptionNotes, setPrescriptionNotes] = useState('Diminum teratur sesudah makan.');

  // Lab Orders State
  const [selectedLabTestIds, setSelectedLabTestIds] = useState<string[]>([]);
  const [labClinicalNotes, setLabClinicalNotes] = useState('Evaluasi gula darah sewaktu dan lipid darah.');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load catalogs & today's visits
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoadingVisits(true);
        const [todayVisits, diagList, procList, medList, labList] = await Promise.all([
          visitService.getVisits({ visit_date: new Date().toISOString().split('T')[0] }),
          clinicalService.getDiagnoses(),
          clinicalService.getProcedures(),
          clinicalService.getMedicines(),
          clinicalService.getLabTests(),
        ]);

        setActiveVisits(todayVisits.items);
        setDiagnoses(diagList);
        setProcedures(procList);
        setMedicines(medList);
        setLabTests(labList);

        if (diagList.length > 0) {
          setPrimaryDiagnosisId(diagList[0].id);
        }

        // Set default procedure (Konsultasi Dokter)
        if (procList.length > 0) {
          setSelectedProcedures([{ procedure_id: procList[0].id, quantity: 1 }]);
        }

        // Select visit from URL or first in examination/waiting
        let current: Visit | undefined;
        if (visitIdFromUrl) {
          current = todayVisits.items.find(v => v.id === visitIdFromUrl);
        }
        if (!current) {
          current = todayVisits.items.find(v => v.status === 'IN_EXAMINATION' || v.status === 'WAITING');
        }
        if (current) {
          setSelectedVisit(current);
        }
      } catch (err) {
        toast.error('Gagal memuat data klinis dokter.');
      } finally {
        setIsLoadingVisits(false);
      }
    }
    loadData();
  }, [visitIdFromUrl]);

  // BMI Calculation
  const heightM = (soapData.height_cm || 100) / 100;
  const bmi = soapData.weight_kg / (heightM * heightM);

  // Add Procedure
  const handleAddProcedure = (procId: string) => {
    if (selectedProcedures.some(p => p.procedure_id === procId)) {
      toast.info('Tindakan ini sudah ditambahkan.');
      return;
    }
    setSelectedProcedures([...selectedProcedures, { procedure_id: procId, quantity: 1 }]);
  };

  const handleRemoveProcedure = (procId: string) => {
    setSelectedProcedures(selectedProcedures.filter(p => p.procedure_id !== procId));
  };

  // Add Prescription Item
  const handleAddMedicine = (med: Medicine) => {
    if (prescriptionItems.some(item => item.medicine_id === med.id)) {
      toast.info('Obat ini sudah ada dalam resep.');
      return;
    }
    setPrescriptionItems([
      ...prescriptionItems,
      {
        medicine_id: med.id,
        dosage: '1 Tablet',
        frequency: '1x1 Sehari sesudah makan',
        quantity: 10,
      },
    ]);
  };

  const handleRemoveMedicine = (medId: string) => {
    setPrescriptionItems(prescriptionItems.filter(item => item.medicine_id !== medId));
  };

  // Toggle Lab Test
  const handleToggleLabTest = (testId: string) => {
    if (selectedLabTestIds.includes(testId)) {
      setSelectedLabTestIds(selectedLabTestIds.filter(id => id !== testId));
    } else {
      setSelectedLabTestIds([...selectedLabTestIds, testId]);
    }
  };

  // Save Medical Record & Finalize Examination
  const handleFinalizeExamination = async () => {
    if (!selectedVisit) {
      toast.error('Pilih kunjungan pasien terlebih dahulu.');
      return;
    }

    if (!primaryDiagnosisId) {
      toast.error('Diagnosis utama wajib dipilih.');
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Simpan Rekam Medis SOAP & Diagnosis
      await clinicalService.saveMedicalRecord({
        visit_id: selectedVisit.id,
        primary_diagnosis_id: primaryDiagnosisId,
        secondary_diagnosis_ids: selectedSecondaryIds,
        subjective: soapData.subjective,
        objective: soapData.objective,
        systolic_bp: soapData.systolic_bp,
        diastolic_bp: soapData.diastolic_bp,
        pulse_rate: soapData.pulse_rate,
        respiratory_rate: soapData.respiratory_rate,
        body_temperature: soapData.body_temperature,
        weight_kg: soapData.weight_kg,
        height_cm: soapData.height_cm,
        assessment: soapData.assessment,
        plan: soapData.plan,
      });

      // 2. Simpan Tindakan Medis
      for (const proc of selectedProcedures) {
        await clinicalService.addProcedure(selectedVisit.id, proc.procedure_id, proc.quantity);
      }

      // 3. Simpan Resep Obat (jika ada)
      let hasPrescription = false;
      if (prescriptionItems.length > 0) {
        await clinicalService.createPrescription(
          selectedVisit.id,
          prescriptionItems,
          prescriptionNotes
        );
        hasPrescription = true;
      }

      // 4. Simpan Permintaan Lab (jika ada)
      let hasLab = false;
      if (selectedLabTestIds.length > 0) {
        await clinicalService.createLabOrder(
          selectedVisit.id,
          selectedLabTestIds,
          labClinicalNotes
        );
        hasLab = true;
      }

      // 5. Update status kunjungan jika tidak otomatis berpindah
      if (!hasPrescription && !hasLab) {
        await visitService.updateStatus(selectedVisit.id, 'READY_FOR_BILLING');
      }

      toast.success('Pemeriksaan berhasil difinalisasi & rekam medis telah tersimpan!');
      navigate('/queue');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      toast.error(msg || 'Gagal menyimpan rekam medis');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Patient Header Banner */}
      <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Stethoscope className="w-48 h-48" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-teal-500/20 border border-teal-400/30 rounded-2xl flex items-center justify-center text-teal-300 shrink-0">
              <User className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  {selectedVisit ? selectedVisit.patient_name : 'Pilih Pasien Pemeriksaan'}
                </h1>
                {selectedVisit && (
                  <span className="font-mono text-xs px-2.5 py-0.5 bg-teal-500/30 text-teal-200 border border-teal-400/40 rounded-full font-bold">
                    {selectedVisit.queue_display}
                  </span>
                )}
                {selectedVisit && <StatusBadge status={selectedVisit.status} />}
              </div>

              {selectedVisit ? (
                <div className="flex items-center gap-4 text-xs text-teal-100/80 mt-1 flex-wrap">
                  <span className="font-mono">No. RM: {selectedVisit.mr_number}</span>
                  <span>•</span>
                  <span>Registrasi: {selectedVisit.visit_number}</span>
                  <span>•</span>
                  <span>Poli: {selectedVisit.polyclinic_name}</span>
                  <span>•</span>
                  <span>Dokter: {selectedVisit.doctor_name}</span>
                </div>
              ) : (
                <p className="text-xs text-teal-200/70 mt-1">
                  Silakan pilih pasien dari daftar antrean di bawah untuk memulai sesi EMR.
                </p>
              )}
            </div>
          </div>

          {/* Quick Allergy & Alert Pill */}
          <div className="flex items-center gap-3">
            {/* <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 flex items-center gap-2 text-xs text-teal-100">
              <ShieldAlert className="w-4 h-4 text-amber-300" />
              <div>
                <span className="block font-semibold text-white">Alergi Obat:</span>
                <span className="text-teal-200/90">Tidak ada riwayat alergi</span>
              </div>
            </div> */}

            {/* Quick Actions for Selected Patient */}
            {selectedVisit && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsResumeModalOpen(true)}
                  className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5 text-teal-300" />
                  Resume Medis
                </button>
              </div>
            )}

            {/* Change patient selector */}
            <select
              aria-label="Pilih Pasien Lain"
              className="bg-teal-800/80 border border-teal-600/50 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400"
              value={selectedVisit?.id || ''}
              onChange={(e) => {
                const found = activeVisits.find(v => v.id === e.target.value);
                if (found) setSelectedVisit(found);
              }}
            >
              <option value="" disabled>Pilih Pasien Lain...</option>
              {activeVisits.map(v => (
                <option key={v.id} value={v.id} className="text-slate-900">
                  {v.queue_display} - {v.patient_name} ({v.mr_number})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl px-2 shadow-sm overflow-x-auto">
        {[
          { id: 'soap', label: '1. Anamnesis & Vital Signs (SOAP)', icon: Activity },
          { id: 'diagnosis', label: '2. Diagnosis & Tindakan Medis', icon: Stethoscope },
          { id: 'prescription', label: '3. E-Resep & Obat Farmasi', icon: Pill },
          { id: 'lab', label: '4. Permintaan Laboratorium', icon: FlaskConical },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3.5 px-4 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${isActive
                  ? 'border-primary text-primary bg-teal-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'soap' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vital Signs Grid */}
          <div className="lg:col-span-1 space-y-4">
            <Card title="Tanda-Tanda Vital (Objective)" subtitle="Parameter fisiologis pasien saat pemeriksaan">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Sistolik (mmHg)</label>
                  <Input
                    type="number"
                    value={soapData.systolic_bp}
                    onChange={(e) => setSoapData({ ...soapData, systolic_bp: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Diastolik (mmHg)</label>
                  <Input
                    type="number"
                    value={soapData.diastolic_bp}
                    onChange={(e) => setSoapData({ ...soapData, diastolic_bp: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Denyut Nadi (bpm)</label>
                  <Input
                    type="number"
                    value={soapData.pulse_rate}
                    onChange={(e) => setSoapData({ ...soapData, pulse_rate: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Napas (x/menit)</label>
                  <Input
                    type="number"
                    value={soapData.respiratory_rate}
                    onChange={(e) => setSoapData({ ...soapData, respiratory_rate: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Suhu (°C)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={soapData.body_temperature}
                    onChange={(e) => setSoapData({ ...soapData, body_temperature: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Berat (kg)</label>
                  <Input
                    type="number"
                    value={soapData.weight_kg}
                    onChange={(e) => setSoapData({ ...soapData, weight_kg: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">Tinggi (cm)</label>
                  <Input
                    type="number"
                    value={soapData.height_cm}
                    onChange={(e) => setSoapData({ ...soapData, height_cm: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-center">
                    <span className="block text-[10px] text-slate-400 font-semibold uppercase">BMI Pasien</span>
                    <span className="text-sm font-bold text-teal-700">{bmi.toFixed(1)} kg/m²</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* SOAP Clinical Notes */}
          <div className="lg:col-span-2 space-y-4">
            <Card title="Lembar SOAP Rawat Jalan" subtitle="Dokumentasi anamnesis medis terstruktur">
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Subjective (S) — Keluhan Utama & Riwayat Penyakit Sekarang
                  </label>
                  <textarea
                    rows={3}
                    className="w-full p-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    value={soapData.subjective}
                    onChange={(e) => setSoapData({ ...soapData, subjective: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Objective (O) — Pemeriksaan Fisik & Temuan Klinis
                  </label>
                  <textarea
                    rows={3}
                    className="w-full p-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    value={soapData.objective}
                    onChange={(e) => setSoapData({ ...soapData, objective: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Assessment (A) — Kesimpulan Diagnosis Medis
                  </label>
                  <Input
                    value={soapData.assessment}
                    onChange={(e) => setSoapData({ ...soapData, assessment: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Plan (P) — Rencana Terapi, Konseling & Edukasi
                  </label>
                  <textarea
                    rows={2}
                    className="w-full p-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    value={soapData.plan}
                    onChange={(e) => setSoapData({ ...soapData, plan: e.target.value })}
                  />
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: DIAGNOSIS & PROCEDURES */}
      {activeTab === 'diagnosis' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Diagnoses Card */}
          <Card title="Diagnosis ICD-10" subtitle="Klasifikasi penyakit standar WHO">
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Diagnosis Utama (Primary Diagnosis) <span className="text-red-500">*</span>
                </label>
                <select
                  aria-label="Diagnosis Utama ICD-10"
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  value={primaryDiagnosisId}
                  onChange={(e) => setPrimaryDiagnosisId(e.target.value)}
                >
                  <option value="" disabled>Pilih Diagnosis ICD-10...</option>
                  {diagnoses.map((d) => (
                    <option key={d.id} value={d.id}>
                      [{d.code}] {d.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-2">
                  Diagnosis Sekunder (Komorbid / Penyerta)
                </label>
                <div className="space-y-2 border border-slate-200 rounded-lg p-3 max-h-56 overflow-y-auto">
                  {diagnoses
                    .filter((d) => d.id !== primaryDiagnosisId)
                    .map((d) => {
                      const isChecked = selectedSecondaryIds.includes(d.id);
                      return (
                        <label
                          key={d.id}
                          className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setSelectedSecondaryIds(selectedSecondaryIds.filter(id => id !== d.id));
                              } else {
                                setSelectedSecondaryIds([...selectedSecondaryIds, d.id]);
                              }
                            }}
                            className="rounded text-primary focus:ring-teal-500"
                          />
                          <span className="font-mono font-bold text-slate-800">{d.code}</span>
                          <span className="text-slate-600 truncate">{d.description}</span>
                        </label>
                      );
                    })}
                </div>
              </div>
            </div>
          </Card>

          {/* Procedures Card */}
          <Card title="Tindakan Medis & Tarif" subtitle="Tindakan yang dilakukan selama pemeriksaan">
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-2">Pilih Prosedur / Tindakan</label>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2">
                  {procedures.map((proc) => {
                    const isAdded = selectedProcedures.some(p => p.procedure_id === proc.id);
                    return (
                      <div
                        key={proc.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 border border-slate-100"
                      >
                        <div>
                          <p className="font-semibold text-slate-900 text-xs">{proc.name}</p>
                          <p className="text-[11px] text-teal-700 font-mono">
                            Tarif: Rp {proc.base_price.toLocaleString('id-ID')}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant={isAdded ? 'secondary' : 'outline'}
                          onClick={() => handleAddProcedure(proc.id)}
                          disabled={isAdded}
                          leftIcon={isAdded ? <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> : <Plus className="w-3.5 h-3.5" />}
                        >
                          {isAdded ? 'Ditambahkan' : 'Tambah'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Added Procedures Summary */}
              <div className="border-t border-slate-200 pt-3">
                <h4 className="font-semibold text-slate-800 mb-2">Tindakan Terpilih:</h4>
                {selectedProcedures.length === 0 ? (
                  <p className="text-slate-400 italic">Belum ada tindakan medis yang dipilih.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {selectedProcedures.map((item) => {
                      const pData = procedures.find(p => p.id === item.procedure_id);
                      if (!pData) return null;
                      return (
                        <div key={item.procedure_id} className="py-2 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-slate-800">{pData.name}</span>
                            <span className="text-slate-500 font-mono block">
                              1 x Rp {pData.base_price.toLocaleString('id-ID')}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveProcedure(item.procedure_id)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: E-PRESCRIPTION */}
      {activeTab === 'prescription' && (
        <div className="space-y-6">
          <Card title="E-Resep Elektronik" subtitle="Peresepan obat dengan validasi stok real-time farmasi">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Medicine Catalog Picker */}
              <div className="lg:col-span-1 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Katalog Obat</h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-80 overflow-y-auto">
                  {medicines.map((med) => (
                    <div key={med.id} className="p-3 hover:bg-slate-50 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-slate-900 truncate">{med.name}</p>
                        <p className="text-[11px] text-slate-500">{med.generic_name} • {med.unit}</p>
                        <span className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded mt-1 ${med.current_stock > 10 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                          Stok: {med.current_stock}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddMedicine(med)}
                        leftIcon={<Plus className="w-3.5 h-3.5" />}
                      >
                        Resepkan
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prescribed Items Table */}
              <div className="lg:col-span-2 space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Daftar Obat Diresepkan ({prescriptionItems.length})
                </h4>

                {prescriptionItems.length === 0 ? (
                  <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                    Belum ada obat yang dimasukkan ke dalam e-resep.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {prescriptionItems.map((item, idx) => {
                      const med = medicines.find(m => m.id === item.medicine_id);
                      return (
                        <div key={item.medicine_id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-900 text-xs">{med?.name}</p>
                            <p className="text-[11px] text-teal-700 font-mono">Rp {med?.base_price.toLocaleString('id-ID')} / {med?.unit}</p>
                          </div>
                          <div className="w-28">
                            <label className="block text-[10px] text-slate-400">Aturan Pakai</label>
                            <Input
                              value={item.frequency}
                              onChange={(e) => {
                                const copy = [...prescriptionItems];
                                copy[idx].frequency = e.target.value;
                                setPrescriptionItems(copy);
                              }}
                              className="text-xs h-8"
                            />
                          </div>
                          <div className="w-20">
                            <label className="block text-[10px] text-slate-400">Jumlah ({med?.unit})</label>
                            <Input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => {
                                const copy = [...prescriptionItems];
                                copy[idx].quantity = parseInt(e.target.value) || 1;
                                setPrescriptionItems(copy);
                              }}
                              className="text-xs h-8 font-mono"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveMedicine(item.medicine_id)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Tambahan untuk Apoteker</label>
                      <Input
                        value={prescriptionNotes}
                        onChange={(e) => setPrescriptionNotes(e.target.value)}
                        placeholder="Catatan khusus dispensing obat..."
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: LAB ORDERS */}
      {activeTab === 'lab' && (
        <Card title="Order Pemeriksaan Laboratorium" subtitle="Permintaan tes diagnostik penunjang">
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {labTests.map((t) => {
                const isSelected = selectedLabTestIds.includes(t.id);
                return (
                  <div
                    key={t.id}
                    onClick={() => handleToggleLabTest(t.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${isSelected
                        ? 'bg-teal-50/80 border-teal-500 ring-2 ring-teal-500/20 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-slate-800">{t.code}</span>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => { }}
                        className="rounded text-primary focus:ring-teal-500"
                      />
                    </div>
                    <p className="font-semibold text-slate-900 text-xs">{t.name}</p>
                    <p className="text-[11px] text-teal-700 font-mono mt-1">
                      Rp {t.base_price.toLocaleString('id-ID')}
                    </p>
                  </div>
                );
              })}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Indikasi & Catatan Klinis untuk Petugas Lab</label>
              <textarea
                rows={2}
                className="w-full p-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                value={labClinicalNotes}
                onChange={(e) => setLabClinicalNotes(e.target.value)}
                placeholder="Indikasi medis atau instruksi pengambilan sampel..."
              />
            </div>
          </div>
        </Card>
      )}

      {/* FOOTER ACTIONS BAR */}
      <div className="sticky bottom-4 z-20 bg-white border border-slate-200 p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-slate-500">
          <span className="font-semibold text-slate-800">Status Tindakan:</span> {selectedProcedures.length} Prosedur Medis • {prescriptionItems.length} Resep Obat • {selectedLabTestIds.length} Uji Lab
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => navigate('/queue')}
          >
            Kembali ke Antrean
          </Button>
          <Button
            variant="primary"
            isLoading={isSubmitting}
            onClick={handleFinalizeExamination}
            disabled={!selectedVisit}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Finalisasi Pemeriksaan & Teruskan
          </Button>
        </div>
      </div>

      {/* Modals for Resume Medis & SATUSEHAT */}
      <ResumeMedisModal
        visitId={selectedVisit?.id || null}
        isOpen={isResumeModalOpen}
        onClose={() => setIsResumeModalOpen(false)}
      />
      <SatuSehatModal
        visitId={selectedVisit?.id || null}
        isOpen={isSatuSehatModalOpen}
        onClose={() => setIsSatuSehatModalOpen(false)}
      />
    </div>
  );
};
