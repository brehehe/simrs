import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Search,
  CheckCircle2,
  RefreshCw,
  Award,
  Building2,
  Filter,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import api from '../services/api';
import { toast } from 'sonner';

interface MedicalStaff {
  id: string;
  user_id: string;
  staff_type: string;
  sip_number: string;
  full_name: string;
  polyclinic_id: string;
  polyclinic_name: string;
}

export const MedicalStaffPage: React.FC = () => {
  const [staffList, setStaffList] = useState<MedicalStaff[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await api.get('/medical-staff');
      setStaffList(res.data?.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memuat data staf medis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const filtered = staffList.filter((s) => {
    if (typeFilter !== 'ALL' && s.staff_type !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        s.full_name?.toLowerCase().includes(q) ||
        s.sip_number?.toLowerCase().includes(q) ||
        s.polyclinic_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-teal-500/20 backdrop-blur-md rounded-2xl border border-teal-400/30 text-teal-300">
            <Stethoscope className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Data Dokter & Tenaga Medis (DPJP)
            </h1>
            <p className="text-xs sm:text-sm text-teal-200 mt-0.5">
              Daftar Dokter Penanggung Jawab Pelayanan, nomor Surat Izin Praktik (SIP), dan penugasan poliklinik
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchStaff}
          disabled={loading}
          className="bg-white/10 hover:bg-white/20 text-white border-white/20 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Segarkan Data
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama dokter, No. SIP, atau spesialisasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-slate-500">Tipe Staf:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">Semua Tenaga Medis</option>
              <option value="DOCTOR">Dokter Spesialis</option>
              <option value="PHARMACIST">Apoteker / Farmasi</option>
              <option value="LAB_ANALYST">Analis Laboratorium</option>
              <option value="NURSE">Perawat</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Staff Table */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Daftar Tenaga Medis Terdaftar ({filtered.length} Staf)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Nama Lengkap & Gelar</th>
                <th className="py-3 px-4">Tipe Profesi</th>
                <th className="py-3 px-4">Nomor SIP (Surat Izin Praktik)</th>
                <th className="py-3 px-4">Penugasan Poliklinik</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">
                    Tidak ada staf medis yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filtered.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{staff.full_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">ID: {staff.id.slice(0, 8)}...</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-100 text-teal-800 border border-teal-200">
                        {staff.staff_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {staff.sip_number || <span className="text-slate-400">-</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium">
                      {staff.polyclinic_name || <span className="text-slate-400">Semua Unit</span>}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Aktif
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
