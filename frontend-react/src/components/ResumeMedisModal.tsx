import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { Button } from './ui/Button';
import { Printer, X, FileText, CheckCircle2, ShieldCheck, HeartPulse, Download } from 'lucide-react';
import { toast } from 'sonner';
import { exportResumeMedisToPdf } from '../utils/pdfExport';

interface ResumeMedisModalProps {
  visitId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ResumeMedisModal: React.FC<ResumeMedisModalProps> = ({ visitId, isOpen, onClose }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (isOpen && visitId) {
      setLoading(true);
      apiClient.get(`/visits/${visitId}/resume-medis`)
        .then((res) => {
          setData(res.data?.data);
        })
        .catch((err) => {
          toast.error(err.response?.data?.message || 'Gagal memuat resume medis.');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setData(null);
    }
  }, [isOpen, visitId]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:inset-auto">
      <div className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:rounded-none">
        
        {/* Header Modal (Hidden during Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 print:hidden">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Resume Medis Rawat Jalan</h2>
              <p className="text-xs text-slate-500">Ringkasan Pelayanan Elektronik Sesuai Standar Akreditasi KARS / STARKES</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!data || loading}
              onClick={() => {
                if (data) {
                  exportResumeMedisToPdf(data);
                  toast.success('Berkas PDF Resume Medis berhasil diunduh.');
                }
              }}
              className="border-rose-300 text-rose-700 hover:bg-rose-50"
            >
              <Download className="w-4 h-4 mr-1.5 text-rose-600" />
              Download PDF
            </Button>
            <Button variant="primary" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-1.5" />
              Cetak Dokumen
            </Button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Printable Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 print:p-0 text-slate-800">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500 font-medium">Menyiapkan berkas resume medis...</p>
            </div>
          ) : data ? (
            <div id="printable-resume" className="space-y-6 text-sm">
              
              {/* Kop Surat Rumah Sakit */}
              <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-xl bg-teal-600 text-white flex items-center justify-center">
                    <HeartPulse className="w-8 h-8" />
                  </div>
                  <div>
                    <h1 className="text-xl font-extrabold tracking-tight text-slate-900 uppercase">
                      {data.hospital?.name}
                    </h1>
                    <p className="text-xs text-slate-600">{data.hospital?.address}</p>
                    <p className="text-xs text-slate-500">
                      Telp: {data.hospital?.phone} • {data.hospital?.license}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 text-[11px] font-bold text-teal-800 bg-teal-50 border border-teal-200 rounded">
                    {data.hospital?.accreditation}
                  </span>
                  <p className="text-xs text-slate-400 mt-1">Dicetak: {data.created_at}</p>
                </div>
              </div>

              {/* Judul Dokumen */}
              <div className="text-center py-1 bg-slate-100 rounded border border-slate-200">
                <h2 className="text-base font-bold text-slate-900 tracking-wider uppercase">
                  {data.document_title}
                </h2>
                <p className="text-xs font-mono text-slate-600 font-semibold">{data.document_number}</p>
              </div>

              {/* Data Pasien & Kunjungan */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div className="space-y-1.5">
                  <div className="flex"><span className="w-28 font-semibold text-slate-500">No. Rekam Medis:</span><span className="font-bold text-slate-900">{data.patient?.mr_number}</span></div>
                  <div className="flex"><span className="w-28 font-semibold text-slate-500">Nama Pasien:</span><span className="font-bold text-slate-900">{data.patient?.full_name}</span></div>
                  <div className="flex"><span className="w-28 font-semibold text-slate-500">NIK:</span><span className="font-mono text-slate-700">{data.patient?.nik}</span></div>
                  <div className="flex"><span className="w-28 font-semibold text-slate-500">Tgl Lahir / Usia:</span><span>{data.patient?.birth_date} ({data.patient?.age_years} tahun)</span></div>
                  <div className="flex"><span className="w-28 font-semibold text-slate-500">Jenis Kelamin:</span><span>{data.patient?.gender}</span></div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex"><span className="w-28 font-semibold text-slate-500">No. Registrasi:</span><span className="font-mono font-bold text-slate-800">{data.visit?.visit_number}</span></div>
                  <div className="flex"><span className="w-28 font-semibold text-slate-500">Tgl Pelayanan:</span><span>{data.visit?.visit_date}</span></div>
                  <div className="flex"><span className="w-28 font-semibold text-slate-500">Poliklinik:</span><span className="font-semibold text-teal-700">{data.visit?.polyclinic}</span></div>
                  <div className="flex"><span className="w-28 font-semibold text-slate-500">Dokter DPJP:</span><span className="font-bold text-slate-900">{data.visit?.doctor_dpjp}</span></div>
                  <div className="flex"><span className="w-28 font-semibold text-slate-500">No. SIP:</span><span className="font-mono text-slate-600">{data.visit?.sip_number}</span></div>
                </div>
              </div>

              {/* Anamnesis & Keluhan */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-1 rounded border-l-4 border-teal-600">
                  1. Anamnesis & Keluhan Utama
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-white border border-slate-200 rounded-lg text-xs">
                  <div>
                    <span className="font-semibold text-slate-600 block mb-0.5">Keluhan Utama:</span>
                    <p className="text-slate-800 bg-slate-50 p-2 rounded border border-slate-100">{data.clinical_findings?.chief_complaint}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600 block mb-0.5">Riwayat Penyakit Sekarang (Anamnesis):</span>
                    <p className="text-slate-800 bg-slate-50 p-2 rounded border border-slate-100">{data.clinical_findings?.anamnesis}</p>
                  </div>
                </div>
              </div>

              {/* Pemeriksaan Fisik & Tanda Vital */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-1 rounded border-l-4 border-teal-600">
                  2. Tanda-Tanda Vital & Status Fisik
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-white border border-slate-200 rounded-lg text-xs">
                  <div className="p-2 bg-slate-50 rounded border border-slate-100">
                    <span className="text-slate-500 block text-[11px]">Tekanan Darah:</span>
                    <span className="font-bold text-slate-800">{data.clinical_findings?.vital_signs?.blood_pressure}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-100">
                    <span className="text-slate-500 block text-[11px]">Frekuensi Nadi:</span>
                    <span className="font-bold text-slate-800">{data.clinical_findings?.vital_signs?.heart_rate}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-100">
                    <span className="text-slate-500 block text-[11px]">Pernapasan:</span>
                    <span className="font-bold text-slate-800">{data.clinical_findings?.vital_signs?.respiratory_rate}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-100">
                    <span className="text-slate-500 block text-[11px]">Suhu Tubuh:</span>
                    <span className="font-bold text-slate-800">{data.clinical_findings?.vital_signs?.temperature}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-100">
                    <span className="text-slate-500 block text-[11px]">Berat / Tinggi:</span>
                    <span className="font-bold text-slate-800">{data.clinical_findings?.vital_signs?.weight} / {data.clinical_findings?.vital_signs?.height}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-100">
                    <span className="text-slate-500 block text-[11px]">Indeks Massa Tubuh:</span>
                    <span className="font-bold text-teal-700">{data.clinical_findings?.vital_signs?.bmi}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-100 col-span-2">
                    <span className="text-slate-500 block text-[11px]">Pemeriksaan Fisik:</span>
                    <span className="text-slate-800">{data.clinical_findings?.physical_examination}</span>
                  </div>
                </div>
              </div>

              {/* Diagnosa ICD-10 */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-1 rounded border-l-4 border-teal-600">
                  3. Diagnosis Klinis (ICD-10)
                </h3>
                <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-2">
                  {data.diagnoses && data.diagnoses.length > 0 ? (
                    data.diagnoses.map((d: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between border-b border-slate-100 pb-1.5 last:border-none last:pb-0">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-100 text-slate-800 border border-slate-300">
                            {d.code}
                          </span>
                          <span className="font-semibold text-slate-800">{d.name}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          d.type === 'DIAGNOSIS UTAMA' ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {d.type}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 italic">Belum ada diagnosis tercatat.</p>
                  )}
                </div>
              </div>

              {/* Tindakan Medis & Laboratorium */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-1 rounded border-l-4 border-teal-600">
                    4. Tindakan Medis Diberikan
                  </h3>
                  <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1">
                    {data.procedures && data.procedures.length > 0 ? (
                      data.procedures.map((p: any, idx: number) => (
                        <div key={idx} className="flex justify-between py-1 border-b border-slate-100 last:border-none">
                          <span className="text-slate-800 font-medium">{p.name} ({p.code})</span>
                          <span className="font-bold text-slate-600">{p.quantity}x</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 italic">Tidak ada tindakan medis spesifik.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-1 rounded border-l-4 border-teal-600">
                    5. Pemeriksaan Laboratorium
                  </h3>
                  <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1.5">
                    {data.lab_results && data.lab_results.length > 0 ? (
                      data.lab_results.map((lr: any, idx: number) => (
                        <div key={idx} className="border-b border-slate-100 pb-1 last:border-none">
                          <div className="font-semibold text-slate-800">{lr.test_name} ({lr.order_number})</div>
                          {lr.results && lr.results.map((r: any, rIdx: number) => (
                            <div key={rIdx} className="flex justify-between text-[11px] text-slate-600 pl-2">
                              <span>{r.test_parameter}: <strong>{r.result_value} {r.unit}</strong></span>
                              <span className="text-slate-400">Rujukan: {r.reference_range}</span>
                            </div>
                          ))}
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 italic">Tidak ada pemeriksaan laboratorium.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Terapi Obat Pulang (Resep) */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-1 rounded border-l-4 border-teal-600">
                  6. Terapi Obat Pulang (E-Resep Farmasi)
                </h3>
                <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs">
                  {data.prescriptions && data.prescriptions.length > 0 ? (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 text-[11px]">
                          <th className="py-1">Nama Obat</th>
                          <th className="py-1">Dosis</th>
                          <th className="py-1">Frekuensi</th>
                          <th className="py-1">Jumlah</th>
                          <th className="py-1">Instruksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.prescriptions.map((rx: any, idx: number) => (
                          <tr key={idx} className="py-1 text-slate-800">
                            <td className="py-1.5 font-bold">{rx.name}</td>
                            <td className="py-1.5">{rx.dosage}</td>
                            <td className="py-1.5">{rx.frequency}</td>
                            <td className="py-1.5 font-semibold">{rx.quantity} {rx.unit}</td>
                            <td className="py-1.5 text-slate-600">{rx.instruction}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-slate-400 italic">Tidak ada resep obat pulang.</p>
                  )}
                </div>
              </div>

              {/* Rencana Tindak Lanjut & Edukasi */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="font-semibold text-slate-600 block mb-0.5">Kondisi Saat Pulang:</span>
                  <span className="inline-flex items-center text-teal-700 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    {data.discharge_plan?.condition}
                  </span>
                  <div className="mt-2">
                    <span className="font-semibold text-slate-600 block mb-0.5">Jadwal Kontrol Berikutnya:</span>
                    <span className="font-bold text-slate-900 bg-white px-2 py-1 rounded border border-slate-200 inline-block">
                      {data.discharge_plan?.follow_up_date}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-slate-600 block mb-0.5">Instruksi / Edukasi Pasien:</span>
                  <p className="text-slate-700 leading-relaxed bg-white p-2.5 rounded border border-slate-200">
                    {data.discharge_plan?.education}
                  </p>
                </div>
              </div>

              {/* Tanda Tangan Elektronik Dokter DPJP */}
              <div className="flex justify-between items-end pt-4 border-t border-slate-200 text-xs">
                <div className="max-w-md space-y-1">
                  <div className="flex items-center space-x-1.5 text-teal-700 font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Tervalidasi Sistem Rekam Medis Elektronik (RME)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono break-all">
                    Verification Hash: {data.digital_signature?.verification_hash?.substring(0, 32)}...
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Dokumen ini sah dan diterbitkan secara elektronik sesuai ketentuan Permenkes RI No. 24 Tahun 2022.
                  </p>
                </div>

                <div className="text-center min-w-[200px]">
                  <p className="text-slate-500 text-[11px] mb-1">Dokter Penanggung Jawab Pelayanan (DPJP)</p>
                  <div className="h-16 flex items-center justify-center border border-dashed border-teal-300 rounded bg-teal-50/50 my-1">
                    <span className="text-[11px] font-mono text-teal-800 font-semibold">
                      [TTE TERVERIFIKASI]
                    </span>
                  </div>
                  <p className="font-bold text-slate-900 underline">{data.digital_signature?.doctor_name}</p>
                  <p className="text-[11px] font-mono text-slate-600">SIP: {data.digital_signature?.sip_number}</p>
                </div>
              </div>

            </div>
          ) : null}
        </div>

        {/* Modal Footer (Hidden during Print) */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3 print:hidden">
          <Button variant="outline" size="sm" onClick={onClose}>
            Tutup
          </Button>
          <Button variant="primary" size="sm" onClick={handlePrint} disabled={!data}>
            <Printer className="w-4 h-4 mr-1.5" />
            Cetak PDF / Print
          </Button>
        </div>

      </div>
    </div>
  );
};
export default ResumeMedisModal;
