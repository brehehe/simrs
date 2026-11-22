import React, { useState } from 'react';
import { Menu, Calendar, Shield, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';

interface TopbarProps {
  onOpenMobileMenu: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenMobileMenu }) => {
  const { user, switchRole } = useAuth();
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

  const todayStr = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const roleLabels: Record<UserRole, { label: string; color: string }> = {
    ADMIN: { label: 'Administrator', color: 'bg-slate-100 text-slate-800 border-slate-300' },
    REGISTRATION: { label: 'Pendaftaran', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    DOCTOR: { label: 'Dokter', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    PHARMACY: { label: 'Farmasi', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    LABORATORY: { label: 'Laboratorium', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    CASHIER: { label: 'Kasir', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  };

  const currentRoleConfig = user?.role ? roleLabels[user.role] : { label: 'User', color: 'bg-slate-100' };

  const allRoles: UserRole[] = ['ADMIN', 'REGISTRATION', 'DOCTOR', 'PHARMACY', 'LABORATORY', 'CASHIER'];

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0">
      {/* Left: Mobile hamburger & Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-none"
          aria-label="Buka menu navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>{todayStr}</span>
        </div>
      </div>

      {/* Right: Quick Role Switcher (Dev Mode) & User Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Quick Role Switcher Pill (For seamless demonstration of all 6 roles) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border transition-colors hover:bg-slate-50"
            title="Klik untuk simulasi peran lain"
          >
            <Shield className="w-3.5 h-3.5 text-teal-600" />
            <span className="capitalize">{currentRoleConfig.label}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showRoleSwitcher && (
            <div
              className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-fadeIn"
              onMouseLeave={() => setShowRoleSwitcher(false)}
            >
              <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Simulasi Peran Pengguna
              </div>
              {allRoles.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    switchRole(r);
                    setShowRoleSwitcher(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 ${
                    user?.role === r ? 'text-teal-700 font-semibold bg-teal-50/50' : 'text-slate-700'
                  }`}
                >
                  <span>{roleLabels[r].label}</span>
                  {user?.role === r && <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Card */}
        <div className="flex items-center gap-2.5 border-l border-slate-200 pl-3 sm:pl-4">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-teal-400 font-bold text-xs flex items-center justify-center shrink-0">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[150px]">
              {user?.full_name || 'Petugas SIMRS'}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              {user?.polyclinic_name || user?.role}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
