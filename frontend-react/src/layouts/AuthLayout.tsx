import React from 'react';
import { Outlet } from 'react-router-dom';
import { HeartPulse, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-dvh flex flex-col lg:flex-row bg-surface-subtle font-sans">
      {/* Left Column: Healthcare Enterprise Branding (Desktop only >= 1024px) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-navy overflow-hidden flex-col justify-between p-12 text-white">
        {/* Subtle Background Glows */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Branding */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center shadow-lg">
            <HeartPulse className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">SIMRS Rawat Jalan</h1>
            <p className="text-xs text-teal-400 font-medium tracking-wider uppercase">PT Inova Medika Solusindo</p>
          </div>
        </div>

        {/* Center Presentation */}
        <div className="relative z-10 space-y-6 max-w-lg my-auto">
          {/* <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
            <ShieldCheck className="w-4 h-4" /> Real Case Test — Senior Programmer
          </span> */}
          <h2 className="text-3xl font-extrabold tracking-tight leading-tight">
            Sistem Informasi Pelayanan Rawat Jalan
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Menghubungkan seluruh alur medis dan administratif rumah sakit dari pendaftaran antrean,
            pemeriksaan dokter (EMR/SOAP), farmasi dispensing dengan kontrol stok aman, hingga kasir dan pelunasan invoice.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
              <span className="text-xs text-slate-300">Pencegahan Pendaftaran Ganda</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
              <span className="text-xs text-slate-300">Locking Stok Farmasi Atomik</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
              <span className="text-xs text-slate-300">Idempotency Key Tagihan Kasir</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
              <span className="text-xs text-slate-300">Kepatuhan RBAC 6 Peran</span>
            </div>
          </div>
        </div>

        {/* Bottom Metadata */}
        {/* <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 pt-6 border-t border-slate-800">
          <span>Target Waktu: 72 Jam MVP Terverifikasi</span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <Clock className="w-3.5 h-3.5 text-teal-400" /> PostgreSQL 17 + Yii + React
          </span>
        </div> */}
      </div>

      {/* Right Column: Dynamic Screen Container (Login form, etc.) */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-md my-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
