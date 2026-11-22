import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { HeartPulse, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';

export const SplashPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        if (isAuthenticated) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/login', { replace: true });
        }
      }, 400); // Clean, brief transition without annoying delay

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isLoading, navigate]);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 via-teal-50/20 to-slate-50 p-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center space-y-6 max-w-sm"
      >
        {/* Animated Medical Cross Logo */}
        <div className="relative">
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            className="w-20 h-20 rounded-2xl bg-teal-600 flex items-center justify-center shadow-xl shadow-teal-600/20"
          >
            <HeartPulse className="w-10 h-10 text-white" />
          </motion.div>
        </div>

        {/* Title & Organization */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">SIMRS Rawat Jalan</h1>
          <p className="text-xs text-slate-500 font-medium">Sistem Informasi Manajemen Rumah Sakit</p>
          <p className="text-[11px] text-teal-600 font-semibold tracking-wider uppercase pt-1">
            PT Inova Medika Solusindo
          </p>
        </div>

        {/* Status Indicator */}
        {!initError ? (
          <div className="flex items-center gap-2.5 text-xs text-slate-400 font-medium pt-4">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
            <span>Memeriksa sesi pengguna...</span>
          </div>
        ) : (
          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{initError}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Coba Lagi
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
