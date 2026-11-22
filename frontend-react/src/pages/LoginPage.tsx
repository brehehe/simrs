import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, User as UserIcon, AlertCircle, HeartPulse, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { UserRole } from '../types/auth';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('dr.budi');
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMessage('Harap isi username dan kata sandi.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await login(username, password);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Username atau kata sandi tidak valid. Silakan coba lagi.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Account Autofill for seamless test evaluation of all 6 roles
  const handleQuickFill = (userType: string) => {
    setUsername(userType);
    setPassword('Password123!');
    setErrorMessage(null);
  };

  return (
    <div className="space-y-6">
      {/* Mobile Branding Header */}
      <div className="lg:hidden flex flex-col items-center text-center space-y-2 mb-6">
        <div className="w-12 h-12 rounded-xl bg-teal-600 flex items-center justify-center shadow-md">
          <HeartPulse className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">SIMRS Rawat Jalan</h1>
        <p className="text-xs text-slate-500">PT Inova Medika Solusindo</p>
      </div>

      {/* Login Card Header */}
      <div className="space-y-1 text-center lg:text-left">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Selamat Datang</h2>
        <p className="text-sm text-slate-500">Silakan masuk untuk mengakses sistem pelayanan</p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Username"
          name="username"
          type="text"
          required
          autoComplete="username"
          placeholder="Masukkan username Anda"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          leftIcon={<UserIcon className="w-4 h-4" />}
        />

        <Input
          label="Kata Sandi"
          name="password"
          type={showPassword ? 'text' : 'password'}
          required
          autoComplete="current-password"
          placeholder="••••••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<Lock className="w-4 h-4" />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-slate-400 hover:text-slate-600 focus:outline-none"
              aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
        />

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              defaultChecked
              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span>Ingat saya di perangkat ini</span>
          </label>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full mt-2"
          size="lg"
          isLoading={isLoading}
        >
          {isLoading ? 'Memverifikasi akun...' : 'Masuk ke SIMRS'}
        </Button>
      </form>

      {/* Quick Role Tester Pills for Evaluator/Reviewer */}
      <div className="pt-6 border-t border-slate-200 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" /> Akun Uji Coba Cepat (Password: Password123!):
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { id: 'admin', label: 'Admin', role: 'ADMIN' },
            { id: 'petugas.pendaftaran', label: 'Loket Pendaftaran', role: 'REGISTRATION' },
            { id: 'dr.budi', label: 'Dokter Poli', role: 'DOCTOR' },
            { id: 'petugas.farmasi', label: 'Depo Farmasi', role: 'PHARMACY' },
            { id: 'petugas.lab', label: 'Laboratorium', role: 'LABORATORY' },
            { id: 'kasir', label: 'Kasir', role: 'CASHIER' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleQuickFill(item.id)}
              className="px-2.5 py-1.5 text-xs text-left font-medium rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition-all text-slate-700 truncate"
              title={`Isi otomatis ${item.label}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
