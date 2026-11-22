import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Volume2, 
  Maximize, 
  Minimize, 
  ArrowLeft, 
  Clock, 
  Users,
  Stethoscope
} from 'lucide-react';
import { visitService, Visit } from '../services/visitService';
import { patientService, Polyclinic } from '../services/patientService';

export const TvQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [polyclinics, setPolyclinics] = useState<Polyclinic[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [callingPoly, setCallingPoly] = useState<string | null>(null);

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch queues every 5 seconds
  useEffect(() => {
    async function loadData() {
      try {
        const [polyData, queueData] = await Promise.all([
          patientService.getPolyclinics(),
          visitService.getVisits({ visit_date: new Date().toISOString().split('T')[0] }),
        ]);
        setPolyclinics(polyData);
        setVisits(queueData.items);
      } catch (err) {
        console.error('TV Queue update error:', err);
      }
    }
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Simulate audio announcement
  const handleAnnounce = (queueNo: string, polyName: string) => {
    setCallingPoly(polyName);
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(
        `Nomor antrean ${queueNo.split('').join(' ')}, silakan menuju ke ${polyName}`
      );
      utterance.lang = 'id-ID';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
    setTimeout(() => setCallingPoly(null), 4000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between font-sans selection:bg-teal-500 selection:text-white">
      {/* Top Header Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
            title="Kembali ke Dashboard"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-wider uppercase text-teal-400">
                RS INOVA MEDIKA SOLUSINDO
              </h1>
              <p className="text-xs text-slate-400 font-medium tracking-wide">
                PAPAN INFORMASI ANTREAN POLIKLINIK RAWAT JALAN
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-2xl font-black font-mono text-white tracking-tight">
              {currentTime.toLocaleTimeString('id-ID')}
            </div>
            <div className="text-xs text-slate-400 capitalize">
              {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-white transition-all border border-slate-700"
            title="Layar Penuh"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Grid: Polyclinic Active Calls */}
      <main className="p-6 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto w-full">
          {polyclinics.map((poly) => {
            const polyVisits = visits.filter(v => v.polyclinic_id === poly.id && v.status !== 'CANCELLED');
            const inExam = polyVisits.find(v => v.status === 'IN_EXAMINATION');
            const waiting = polyVisits.filter(v => v.status === 'WAITING');
            const currentQueue = inExam?.queue_display || (waiting.length > 0 ? waiting[0].queue_display : '--');
            const isCalling = callingPoly === poly.name;

            return (
              <div
                key={poly.id}
                className={`bg-slate-900/90 rounded-2xl border transition-all duration-300 overflow-hidden shadow-2xl relative ${
                  isCalling 
                    ? 'border-teal-400 ring-4 ring-teal-500/30 bg-slate-900 scale-105' 
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Header Poli */}
                <div className="bg-slate-800/80 px-5 py-3 border-b border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-teal-500 text-slate-950 font-black text-sm flex items-center justify-center font-mono">
                      {poly.queue_prefix}
                    </span>
                    <span className="font-bold text-sm tracking-wide text-slate-100">{poly.name}</span>
                  </div>
                  <button
                    onClick={() => handleAnnounce(currentQueue, poly.name)}
                    className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-teal-300 transition-colors"
                    title="Panggil Suara"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Big Number Active Display */}
                <div className="p-6 text-center">
                  <span className="text-[11px] font-semibold tracking-widest uppercase text-slate-400">
                    NOMOR SEDANG DILAYANI
                  </span>
                  <div className={`text-6xl font-black font-mono my-2 tracking-tight ${
                    currentQueue !== '--' ? 'text-teal-400 animate-pulse' : 'text-slate-600'
                  }`}>
                    {currentQueue}
                  </div>

                  <p className="text-xs text-slate-300 font-medium truncate">
                    {inExam?.doctor_name || (waiting.length > 0 ? waiting[0].doctor_name : 'Dokter Spesialis')}
                  </p>
                </div>

                {/* Next In Line Footer */}
                <div className="bg-slate-950/60 px-5 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>Antrean Menunggu:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-slate-200">
                    {waiting.slice(0, 3).map((w, i) => (
                      <span key={w.id} className="px-2 py-0.5 bg-slate-800 rounded">
                        {w.queue_display}
                      </span>
                    ))}
                    {waiting.length === 0 && <span className="text-slate-500 italic">Kosong</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Marquee Banner Footer */}
      <footer className="bg-teal-950 border-t border-teal-800/50 py-3 overflow-hidden text-xs text-teal-200 font-medium">
        <div className="whitespace-nowrap animate-marquee flex items-center gap-8">
          <span>📢 Selamat datang di RS Inova Medika Solusindo. Mohon siapkan kartu identitas / KTP / BPJS saat nomor antrean Anda dipanggil.</span>
          <span>•</span>
          <span>Silakan duduk di ruang tunggu sesuai poliklinik tujuan Anda.</span>
          <span>•</span>
          <span>Layanan darurat IGD beroperasi 24 jam di Gedung A Lantai 1.</span>
          <span>•</span>
          <span>Untuk pertanyaan atau bantuan, silakan hubungi petugas customer service di meja informasi lobby utama.</span>
        </div>
      </footer>
    </div>
  );
};
