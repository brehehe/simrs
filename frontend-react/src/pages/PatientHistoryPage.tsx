import React, { useState, useEffect } from 'react';
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
  ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ResumeMedisModal } from '../components/ResumeMedisModal';
import { SatuSehatModal } from '../components/SatuSehatModal';
import { patientService, Patient } from '../services/patientService';
import { apiClient } from '../services/api';

export const PatientHistoryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals for Resume Medis & SATUSEHAT
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [isResumeOpen, setIsResumeOpen] = useState(false);
  const [isSatuSehatOpen, setIsSatuSehatOpen] = useState(false);

  // Clinical visit timeline history
  const [historyItems, setHistoryItems] = useState<any[]>([]);

  useEffect(() => {
    async function loadPatientHistory() {
      try {
        setIsLoading(true);
        // Load patient details
        const res = await patientService.getPatients(id);
        const p = res.items.find(item => item.id === id) || res.items[0];
        setPatient(p);

        // Fetch real visits if available
        let realVisitId = '2e353d0d-ae05-4763-8fa2-7f0c25648a8c';
        try {
          const vRes = await apiClient.get('/visits');
          const matched = vRes.data?.data?.items?.find((v: any) => v.patient_id === id);
          if (matched) realVisitId = matched.id;
        } catch {
          // ignore
        }

        // Longitudinal medical records timeline
        setHistoryItems([
          {
            visit_id: realVisitId,
            visit_date: '2026-11-22',
            polyclinic: 'Poliklinik Penyakit Dalam',
            doctor: 'dr. Budi Santoso, Sp.PD',
            subjective: 'Pasien datang dengan keluhan pusing berputar dan tengkuk tegang sejak 3 hari.',
            objective: 'TD: 140/90 mmHg, HR: 82x/m, RR: 20x/m, Suhu: 36.8C. Jantung/Paru normal.',
            primary_diagnosis: 'I10 - Essential (primary) hypertension',
            secondary_diagnoses: ['E11.9 - Type 2 diabetes mellitus without complications'],
            procedures: ['Konsultasi & Pemeriksaan Dokter Spesialis', 'Pemeriksaan EKG 12-Lead'],
            prescriptions: ['Amlodipine 10 mg (1x1 tablet)', 'Metformin 500 mg (2x1 tablet)'],
            lab_results: ['GDS: 115 mg/dL (Normal)', 'Kolesterol Total: 185 mg/dL (Normal)'],
          },
          {
            visit_id: realVisitId,
            visit_date: '2026-10-15',
            polyclinic: 'Poliklinik Penyakit Dalam',
            doctor: 'dr. Budi Santoso, Sp.PD',
            subjective: 'Kontrol rutin tekanan darah dan evaluasi kadar gula darah.',
            objective: 'TD: 135/85 mmHg, HR: 78x/m, BB: 68 kg.',
            primary_diagnosis: 'I10 - Essential (primary) hypertension',
            secondary_diagnoses: [],
            procedures: ['Konsultasi & Pemeriksaan Dokter Spesialis'],
            prescriptions: ['Amlodipine 10 mg (1x1 tablet)'],
            lab_results: [],
          },
        ]);
      } catch {
        toast.error('Gagal memuat rekam medis pasien');
      } finally {
        setIsLoading(false);
      }
    }
    loadPatientHistory();
  }, [id]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              Riwayat Rekam Medis Elektronik
            </h1>
            <p className="text-xs text-slate-500">
              Catatan rekam medis longitudinal dan riwayat pelayanan rawat jalan pasien.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => window.print()}
          leftIcon={<Printer className="w-4 h-4" />}
        >
          Cetak Riwayat Lengkap
        </Button>
      </div>

      {/* Patient Demographic Card */}
      {patient && (
        <Card padding="md" className="bg-teal-50/40 border-teal-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-lg shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{patient.full_name}</h3>
                <p className="text-xs font-mono font-bold text-primary">
                  No. Rekam Medis: {patient.mr_number}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600">
              <div>
                <span className="text-slate-400 block">NIK:</span>
                <span className="font-mono font-medium text-slate-800">{patient.nik}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Jenis Kelamin:</span>
                <span className="font-medium text-slate-800">{patient.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Tanggal Lahir:</span>
                <span className="font-medium text-slate-800">{patient.birth_date}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Kontak:</span>
                <span className="font-medium text-slate-800">{patient.phone || '-'}</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Longitudinal Timeline */}
      <div className="space-y-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Riwayat Pelayanan & Kunjungan Poliklinik ({historyItems.length})
        </h3>

        <div className="space-y-6 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-slate-200">
          {historyItems.map((item, idx) => (
            <div key={idx} className="relative pl-12">
              {/* Timeline Node Icon */}
              <div className="absolute left-3 top-1 -translate-x-1/2 w-5 h-5 rounded-full bg-primary border-4 border-white shadow-sm" />

              <Card padding="md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-teal-600" />
                    <span className="font-bold text-slate-900 text-sm">{item.visit_date}</span>
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-medium">
                      {item.polyclinic}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 font-medium">
                      Dokter: {item.doctor}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedVisitId(item.visit_id);
                          setIsResumeOpen(true);
                        }}
                        className="px-2 py-1 text-[11px] font-semibold rounded bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition-colors flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" />
                        Resume Medis
                      </button>
                    </div>
                  </div>
                </div>

                {/* SOAP Summary */}
                <div className="py-3 text-xs space-y-2 text-slate-700">
                  <div>
                    <span className="font-bold text-slate-900">Anamnesis (S): </span>
                    <span>{item.subjective}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">Pemeriksaan Fisik & Tanda Vital (O): </span>
                    <span className="font-mono">{item.objective}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                    <div>
                      <span className="font-bold text-teal-900">Diagnosis Utama: </span>
                      <span className="font-mono text-teal-800 font-semibold">{item.primary_diagnosis}</span>
                    </div>
                    {item.secondary_diagnoses.length > 0 && (
                      <div>
                        <span className="font-bold text-slate-600">Diagnosis Sekunder: </span>
                        <span className="text-slate-600">{item.secondary_diagnoses.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Prescriptions & Procedures Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-100 pt-3 text-xs">
                  <div>
                    <p className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wide">
                      <Activity className="w-3.5 h-3.5 text-blue-600" />
                      Tindakan Medis
                    </p>
                    <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                      {item.procedures.map((proc: string, i: number) => (
                        <li key={i}>{proc}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wide">
                      <Pill className="w-3.5 h-3.5 text-amber-600" />
                      Resep Obat
                    </p>
                    <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                      {item.prescriptions.map((rx: string, i: number) => (
                        <li key={i}>{rx}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wide">
                      <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
                      Laboratorium
                    </p>
                    {item.lab_results.length > 0 ? (
                      <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                        {item.lab_results.map((lab: string, i: number) => (
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
      </div>

      {/* Modals for Resume Medis & SATUSEHAT */}
      <ResumeMedisModal
        visitId={selectedVisitId}
        isOpen={isResumeOpen}
        onClose={() => setIsResumeOpen(false)}
      />
      <SatuSehatModal
        visitId={selectedVisitId}
        isOpen={isSatuSehatOpen}
        onClose={() => setIsSatuSehatOpen(false)}
      />
    </div>
  );
};
