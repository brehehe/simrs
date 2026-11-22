import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  UserCheck, 
  Search, 
  Calendar, 
  Stethoscope, 
  Building2, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  UserPlus,
  Clock,
  QrCode,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { patientService, Patient, Polyclinic, Doctor } from '../services/patientService';
import { visitService, Visit } from '../services/visitService';
import { apiClient } from '../services/api';

export const RegistrationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const preselectedPatientId = searchParams.get('patient_id');

  // Master data state
  const [polyclinics, setPolyclinics] = useState<Polyclinic[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoadingMaster, setIsLoadingMaster] = useState(true);

  // Search patient state
  const [patientSearch, setPatientSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Form selections
  const [selectedPolyId, setSelectedPolyId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Insurance & BPJS VClaim State
  const [paymentType, setPaymentType] = useState<'UMUM' | 'BPJS'>('UMUM');
  const [isCheckingBpjs, setIsCheckingBpjs] = useState(false);
  const [bpjsData, setBpjsData] = useState<any>(null);
  const [sepNumber, setSepNumber] = useState<string | null>(null);

  const handleVerifyBpjs = async () => {
    if (!selectedPatient) {
      toast.error('Pilih pasien terlebih dahulu untuk verifikasi BPJS.');
      return;
    }
    setIsCheckingBpjs(true);
    try {
      const res = await apiClient.get(`/bpjs/peserta/${selectedPatient.nik}`);
      const p = res.data?.data?.peserta;
      setBpjsData(p);
      const polyName = polyclinics.find(pol => pol.id === selectedPolyId)?.name || 'Poliklinik Penyakit Dalam';
      const sepRes = await apiClient.post('/bpjs/sep', {
        no_kartu: p.noKartu,
        patient_name: selectedPatient.full_name,
        polyclinic_name: polyName,
      });
      setSepNumber(sepRes.data?.data?.sep?.noSep);
      toast.success('Status kepesertaan BPJS AKTIF & SEP berhasil diterbitkan!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal verifikasi data BPJS.');
    } finally {
      setIsCheckingBpjs(false);
    }
  };

  // Registration result / Ticket modal
  const [createdVisit, setCreatedVisit] = useState<Visit | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  // Load polyclinics on mount
  useEffect(() => {
    async function loadInitial() {
      try {
        setIsLoadingMaster(true);
        const polyData = await patientService.getPolyclinics();
        setPolyclinics(polyData);

        // Preload patient if provided via URL
        if (preselectedPatientId) {
          const res = await patientService.getPatients(preselectedPatientId);
          const found = res.items.find(p => p.id === preselectedPatientId);
          if (found) {
            setSelectedPatient(found);
          }
        }
      } catch (err: any) {
        toast.error('Gagal memuat master data poliklinik');
      } finally {
        setIsLoadingMaster(false);
      }
    }
    loadInitial();
  }, [preselectedPatientId]);

  // Load doctors whenever polyclinic changes
  useEffect(() => {
    async function loadDoctors() {
      if (!selectedPolyId) {
        setDoctors([]);
        setSelectedDoctorId('');
        return;
      }
      try {
        const docData = await patientService.getDoctors(selectedPolyId);
        setDoctors(docData);
        if (docData.length > 0) {
          setSelectedDoctorId(docData[0].id);
        } else {
          setSelectedDoctorId('');
        }
      } catch (err) {
        toast.error('Gagal memuat daftar dokter');
      }
    }
    loadDoctors();
  }, [selectedPolyId]);

  // Search patient handler
  const handleSearchPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientSearch.trim()) return;
    try {
      setIsSearchingPatient(true);
      const res = await patientService.getPatients(patientSearch.trim());
      setSearchResults(res.items);
      if (res.items.length === 0) {
        toast.info('Pasien tidak ditemukan dengan kata kunci tersebut.');
      }
    } catch {
      toast.error('Pencarian pasien gagal');
    } finally {
      setIsSearchingPatient(false);
    }
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setSearchResults([]);
    setPatientSearch('');
  };

  const handleResetRegistration = () => {
    setSelectedPatient(null);
    setSelectedPolyId('');
    setSelectedDoctorId('');
    setCreatedVisit(null);
    setIsTicketModalOpen(false);
  };

  // Submit Registration
  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatient) {
      toast.error('Silakan cari dan pilih pasien terlebih dahulu.');
      return;
    }
    if (!selectedPolyId) {
      toast.error('Silakan pilih poliklinik tujuan.');
      return;
    }
    if (!selectedDoctorId) {
      toast.error('Silakan pilih dokter pemeriksa.');
      return;
    }

    try {
      setIsSubmitting(true);
      const visit = await visitService.createVisit({
        patient_id: selectedPatient.id,
        polyclinic_id: selectedPolyId,
        doctor_id: selectedDoctorId,
        visit_date: visitDate,
      });

      setCreatedVisit(visit);
      setIsTicketModalOpen(true);
      toast.success(`Pendaftaran berhasil! No. Antrean: ${visit.queue_display}`);
    } catch (err: any) {
      const status = err.response?.status;
      const message = err.response?.data?.message || err.message;
      if (status === 409) {
        toast.error('Konflik: Pasien sudah memiliki antrean aktif pada poliklinik dan tanggal yang sama!', {
          duration: 5000,
        });
      } else {
        toast.error(message || 'Gagal memproses pendaftaran');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPoly = polyclinics.find(p => p.id === selectedPolyId);
  const selectedDoc = doctors.find(d => d.id === selectedDoctorId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-7 h-7 text-primary" />
            Pendaftaran Rawat Jalan
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Registrasi pasien poliklinik rawat jalan dan penerbitan nomor antrean otomatis.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/patients')}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Registrasi Pasien Baru
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => navigate('/queue')}
            leftIcon={<Clock className="w-4 h-4" />}
          >
            Monitor Antrean Hari Ini
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Patient Search & Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card 
            title="1. Identifikasi Pasien" 
            subtitle="Cari berdasarkan No. RM, NIK, atau Nama"
          >
            {!selectedPatient ? (
              <div className="space-y-4">
                <form onSubmit={handleSearchPatient} className="flex gap-2">
                  <Input
                    placeholder="Ketik No. RM / NIK / Nama..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    type="submit" 
                    variant="primary" 
                    isLoading={isSearchingPatient}
                    leftIcon={<Search className="w-4 h-4" />}
                  >
                    Cari
                  </Button>
                </form>

                {searchResults.length > 0 && (
                  <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-64 overflow-y-auto shadow-sm">
                    {searchResults.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleSelectPatient(p)}
                        className="p-3 hover:bg-teal-50 cursor-pointer transition-colors text-left"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900 text-sm">{p.full_name}</span>
                          <span className="text-xs font-mono font-medium px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                            {p.mr_number}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                          <span>NIK: {p.nik}</span>
                          <span>{p.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Belum punya rekam medis? Klik tombol <strong>Registrasi Pasien Baru</strong> di atas untuk membuat No. RM baru.
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-teal-50/60 border border-teal-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-teal-100 pb-2">
                    <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider">Pasien Terpilih</span>
                    <button 
                      type="button" 
                      onClick={() => setSelectedPatient(null)} 
                      className="text-xs text-red-600 hover:underline font-medium"
                    >
                      Ganti Pasien
                    </button>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{selectedPatient.full_name}</h3>
                    <p className="text-xs font-mono font-medium text-teal-800">
                      No. RM: {selectedPatient.mr_number}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                    <div>
                      <span className="block text-slate-400">NIK</span>
                      <span className="font-medium text-slate-800">{selectedPatient.nik}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400">Gender</span>
                      <span className="font-medium text-slate-800">
                        {selectedPatient.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-400">Tanggal Lahir</span>
                      <span className="font-medium text-slate-800">{selectedPatient.birth_date}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400">No. HP</span>
                      <span className="font-medium text-slate-800">{selectedPatient.phone || '-'}</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 border-t border-teal-100/60 pt-2">
                    <span className="block text-slate-400">Alamat</span>
                    <span className="text-slate-800">{selectedPatient.address}</span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Quick Notice Card */}
          <Card>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-teal-100 text-teal-700 rounded-lg shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-xs text-slate-600 leading-relaxed">
                <p className="font-semibold text-slate-800 mb-1">Proteksi Integritas Antrean</p>
                Sistem secara otomatis mencegah pendaftaran ganda pasien di poliklinik yang sama pada hari pelayanan aktif (PostgreSQL Partial Index).
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Polyclinic, Doctor & Confirmation */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmitRegistration}>
            <Card 
              title="2. Tujuan Poliklinik & Jadwal Pelayanan" 
              subtitle="Pilih poliklinik spesialis dan dokter jaga yang bertugas"
            >
              <div className="space-y-5">
                {/* Visit Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tanggal Pelayanan Kunjungan <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Polyclinic Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Pilih Poliklinik <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {polyclinics.map((poly) => {
                      const isSelected = selectedPolyId === poly.id;
                      return (
                        <div
                          key={poly.id}
                          onClick={() => setSelectedPolyId(poly.id)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                            isSelected
                              ? 'bg-teal-50/80 border-teal-500 ring-2 ring-teal-500/20 shadow-sm'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                            isSelected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {poly.queue_prefix}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm text-slate-900 truncate">{poly.name}</p>
                            <p className="text-xs text-slate-500 font-mono">{poly.code}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Doctor Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Dokter Spesialis Bertugas <span className="text-red-500">*</span>
                  </label>
                  {!selectedPolyId ? (
                    <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-sm text-slate-500">
                      Pilih poliklinik terlebih dahulu untuk melihat daftar dokter yang tersedia.
                    </div>
                  ) : doctors.length === 0 ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center text-sm text-amber-700">
                      Belum ada dokter yang dijadwalkan pada poliklinik ini hari ini.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {doctors.map((doc) => {
                        const isSelected = selectedDoctorId === doc.id;
                        return (
                          <div
                            key={doc.id}
                            onClick={() => setSelectedDoctorId(doc.id)}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                              isSelected
                                ? 'bg-teal-50/80 border-teal-500 ring-2 ring-teal-500/20 shadow-sm'
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                            }`}
                          >
                            <div className={`p-2 rounded-lg shrink-0 ${
                              isSelected ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              <Stethoscope className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm text-slate-900 truncate">{doc.full_name}</p>
                              <p className="text-xs text-slate-500 truncate">{doc.sip_number}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Penjamin / Jenis Pembayaran */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Penjamin / Jenis Pembayaran <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentType('UMUM')}
                      className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                        paymentType === 'UMUM'
                          ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-500/20 font-bold text-teal-900'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 text-teal-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold">UMUM / PRIBADI</div>
                        <div className="text-[11px] text-slate-500 font-normal">Biaya mandiri per pelayanan</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentType('BPJS')}
                      className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                        paymentType === 'BPJS'
                          ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 font-bold text-emerald-900'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold">BPJS KESEHATAN</div>
                        <div className="text-[11px] text-slate-500 font-normal">Integrasi VClaim & SEP</div>
                      </div>
                    </button>
                  </div>

                  {paymentType === 'BPJS' && (
                    <div className="mt-3 p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          Verifikasi VClaim 2.0 & Penerbitan SEP Otomatis
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          isLoading={isCheckingBpjs}
                          onClick={handleVerifyBpjs}
                          className="text-xs bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                        >
                          Cek & Terbitkan SEP
                        </Button>
                      </div>

                      {bpjsData && (
                        <div className="bg-white p-3 rounded-lg border border-emerald-200 text-xs space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-slate-500">No. Kartu BPJS:</span>
                            <span className="font-mono font-bold text-slate-800">{bpjsData.noKartu}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Status Kepesertaan:</span>
                            <span className="font-bold text-emerald-700">{bpjsData.statusPeserta?.keterangan} ({bpjsData.hakKelas?.keterangan})</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Fasilitas Kesehatan Tk. 1:</span>
                            <span className="text-slate-800">{bpjsData.provUmum?.nmProvider}</span>
                          </div>
                          {sepNumber && (
                            <div className="pt-1.5 border-t border-emerald-100 flex justify-between items-center">
                              <span className="font-bold text-emerald-900">Nomor SEP Resmi:</span>
                              <span className="font-mono font-bold text-xs px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded">
                                {sepNumber}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Registration Summary Box */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Biaya Pendaftaran / Karcis Rawat Jalan</span>
                    <span className="font-semibold text-slate-900">
                      {paymentType === 'BPJS' ? 'Rp 0 (Dijamin BPJS)' : 'Rp 25.000'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Estimasi Waktu Tunggu</span>
                    <span className="font-semibold text-teal-700">~ 15 - 30 Menit</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-sm font-bold text-slate-900">
                    <span>Total Biaya Registrasi</span>
                    <span className="text-primary font-mono text-base">
                      {paymentType === 'BPJS' ? 'Rp 0' : 'Rp 25.000'}
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    isLoading={isSubmitting}
                    disabled={!selectedPatient || !selectedPolyId || !selectedDoctorId}
                    rightIcon={<ArrowRight className="w-5 h-5" />}
                  >
                    Proses Pendaftaran & Terbitkan Antrean
                  </Button>
                </div>
              </div>
            </Card>
          </form>
        </div>
      </div>

      {/* TICKET / QUEUE SUCCESS MODAL */}
      <Modal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        maxWidth="md"
        title="Tiket Antrean Poliklinik Rawat Jalan"
      >
        {createdVisit && (
          <div className="space-y-5">
            {/* Thermal Print Receipt Simulation */}
            <div className="bg-white border-2 border-dashed border-slate-300 p-6 rounded-2xl text-center shadow-inner font-sans space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <div className="flex items-center justify-center gap-2 text-primary mb-1">
                  <Building2 className="w-5 h-5" />
                  <span className="font-extrabold text-sm tracking-widest uppercase">RS INOVA MEDIKA SOLUSINDO</span>
                </div>
                <p className="text-[11px] text-slate-500">Jl. Pelayanan Kesehatan No. 128, Bandung • Telp (022) 7654321</p>
                <p className="text-[10px] text-slate-400 mt-0.5">BUKTI NOMOR ANTREAN PENDAFTARAN</p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">Nomor Antrean Anda</p>
                <div className="text-6xl font-black text-primary font-mono my-2 tracking-tight">
                  {createdVisit.queue_display}
                </div>
                <span className="inline-block px-3 py-1 bg-teal-50 text-teal-800 text-xs font-semibold rounded-full border border-teal-200">
                  {createdVisit.polyclinic_name || selectedPoly?.name}
                </span>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 text-left space-y-1.5 text-xs text-slate-700 border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Registrasi:</span>
                  <span className="font-mono font-semibold text-slate-900">{createdVisit.visit_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Rekam Medis:</span>
                  <span className="font-mono font-semibold text-slate-900">{createdVisit.mr_number || selectedPatient?.mr_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Pasien:</span>
                  <span className="font-semibold text-slate-900">{createdVisit.patient_name || selectedPatient?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dokter Spesialis:</span>
                  <span className="font-semibold text-slate-900">{createdVisit.doctor_name || selectedDoc?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Waktu Cetak:</span>
                  <span className="text-slate-600">{new Date().toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Barcode Mock */}
              <div className="pt-2 flex flex-col items-center justify-center">
                <div className="w-48 h-10 bg-slate-900/10 rounded flex items-center justify-center text-[10px] font-mono tracking-widest text-slate-600">
                  ||||| | |||| ||| ||||||| ||| |||||
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Harap simpan tiket ini hingga selesai pelayanan kasir</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Button
                variant="outline"
                className="w-full sm:w-1/2"
                leftIcon={<Printer className="w-4 h-4" />}
                onClick={() => window.print()}
              >
                Cetak Tiket Fisik
              </Button>
              <Button
                variant="primary"
                className="w-full sm:w-1/2"
                onClick={handleResetRegistration}
              >
                Daftar Pasien Lainnya
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
