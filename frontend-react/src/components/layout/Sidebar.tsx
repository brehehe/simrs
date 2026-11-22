import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Stethoscope,
  ClipboardList,
  Pill,
  FlaskConical,
  CreditCard,
  Building2,
  CalendarCheck,
  Activity,
  FileText,
  ShieldCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
  HeartPulse,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';
import { NavItem } from '../../types/navigation';
import { cn } from '../../utils/cn';

interface SidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen,
  setIsMobileOpen,
  isCollapsed,
  setIsCollapsed,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const getNavItemsByRole = (role: UserRole | undefined): NavItem[] => {
    switch (role) {
      case 'ADMIN':
        return [
          { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
          { label: 'Laporan & Rekonsiliasi', href: '/reports', icon: BarChart3 },
          { label: 'Data Pasien', href: '/patients', icon: Users },
          { label: 'Dokter & Staf', href: '/staff', icon: Stethoscope },
          { label: 'Poliklinik', href: '/polyclinics', icon: Building2 },
          { label: 'Jadwal Dokter', href: '/schedules', icon: CalendarCheck },
          { label: 'Tindakan & Tarif', href: '/procedures', icon: Activity },
          { label: 'Katalog Obat', href: '/medicines', icon: Pill },
          { label: 'Manajemen User', href: '/users', icon: ShieldCheck },
          // { label: 'Audit Trail', href: '/audit-logs', icon: FileText },
        ];
      case 'REGISTRATION':
        return [
          { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
          { label: 'Pendaftaran Pasien', href: '/registration', icon: UserPlus },
          { label: 'Daftar Antrean', href: '/queue', icon: ClipboardList },
          { label: 'Data Pasien', href: '/patients', icon: Users },
          { label: 'Riwayat Kunjungan', href: '/visits-history', icon: FileText },
        ];
      case 'DOCTOR':
        return [
          { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
          { label: 'Antrean Pasien', href: '/doctor/queue', icon: ClipboardList, badge: 'Aktif', badgeColor: 'primary' },
          { label: 'Pemeriksaan (EMR)', href: '/doctor/examination', icon: Stethoscope },
          { label: 'Resep Obat', href: '/doctor/prescriptions', icon: Pill },
          { label: 'Permintaan Lab', href: '/doctor/lab-orders', icon: FlaskConical },
          { label: 'Riwayat Pasien', href: '/doctor/history', icon: FileText },
        ];
      case 'PHARMACY':
        return [
          { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
          { label: 'Daftar Resep', href: '/pharmacy/prescriptions', icon: ClipboardList, badge: 'Masuk', badgeColor: 'warning' },
          { label: 'Penyerahan Obat', href: '/pharmacy/dispensations', icon: Pill },
          { label: 'Persediaan Obat', href: '/pharmacy/stocks', icon: Activity },
        ];
      case 'LABORATORY':
        return [
          { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
          { label: 'Permintaan Uji', href: '/lab/orders', icon: FlaskConical, badge: 'Sampel', badgeColor: 'warning' },
          { label: 'Input Hasil Lab', href: '/lab/results', icon: ClipboardList },
          { label: 'Riwayat Hasil', href: '/lab/history', icon: FileText },
        ];
      case 'CASHIER':
        return [
          { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
          { label: 'Tagihan Pasien', href: '/cashier/invoices', icon: ClipboardList, badge: 'Unpaid', badgeColor: 'danger' },
          { label: 'Pembayaran Kasir', href: '/cashier/payments', icon: CreditCard },
          { label: 'Riwayat Kuitansi', href: '/cashier/history', icon: FileText },
          { label: 'Laporan Rekonsiliasi', href: '/reports', icon: BarChart3 },
        ];
      default:
        return [{ label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }];
    }
  };

  const navItems = getNavItemsByRole(user?.role);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-navy text-white transition-all duration-200 ease-in-out',
          // Desktop styles
          'lg:static lg:z-auto',
          isCollapsed ? 'lg:w-20' : 'lg:w-64',
          // Mobile styles
          isMobileOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header / Brand */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center shrink-0 shadow-sm">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-base tracking-tight text-white truncate">SIMRS Rawat Jalan</span>
                <span className="text-[10px] text-teal-400 font-medium tracking-wide truncate uppercase">
                  Inova Medika Solusindo
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
            aria-label={isCollapsed ? 'Perluas sidebar' : 'Kecilkan sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={() => setIsMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors group relative',
                  isActive
                    ? 'bg-teal-600/20 text-teal-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                )
              }
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 shrink-0 text-inherit" />
              {(!isCollapsed || isMobileOpen) && (
                <>
                  <span className="truncate flex-1">{item.label}</span>
                  {item.badge && (
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 uppercase tracking-wider',
                        item.badgeColor === 'primary' && 'bg-teal-500/20 text-teal-300',
                        item.badgeColor === 'warning' && 'bg-amber-500/20 text-amber-300',
                        item.badgeColor === 'danger' && 'bg-red-500/20 text-red-300'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Footer / User Profile & Logout */}
        <div className="p-3 border-t border-slate-800 shrink-0">
          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors',
              isCollapsed && !isMobileOpen ? 'justify-center' : ''
            )}
            title="Keluar dari sistem"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {(!isCollapsed || isMobileOpen) && <span>Keluar Sistem</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
