import apiClient from './api';
import { ApiResponse } from '../types/auth';

export interface Patient {
  id: string;
  mr_number: string;
  nik: string;
  full_name: string;
  birth_date: string;
  gender: 'MALE' | 'FEMALE';
  address: string;
  phone: string;
  is_active: boolean;
  created_at: string;
}

export interface Polyclinic {
  id: string;
  code: string;
  name: string;
  queue_prefix: string;
  is_active: boolean;
}

export interface Doctor {
  id: string;
  full_name: string;
  sip_number: string;
  polyclinic_id: string;
  polyclinic_name: string;
}

export const patientService = {
  async getPatients(search?: string, page: number = 1, limit: number = 20): Promise<{ items: Patient[]; pagination: any }> {
    try {
      const res = await apiClient.get<ApiResponse<Patient[]>>('/patients', {
        params: { search, page, limit },
      });
      return {
        items: res.data.data,
        pagination: res.data.meta?.pagination || { total_count: res.data.data.length, current_page: page, page_size: limit },
      };
    } catch {
      // Fallback seed data for standalone offline exploration
      const dummyPatients: Patient[] = [
        { id: 'd0000000-0000-0000-0000-000000000001', mr_number: 'RM-202611-00001', nik: '3273011205850001', full_name: 'Bambang Pamungkas', birth_date: '1985-05-12', gender: 'MALE', address: 'Jl. Sukajadi No. 45, Bandung', phone: '081234567890', is_active: true, created_at: '2026-11-22T08:00:00Z' },
        { id: 'd0000000-0000-0000-0000-000000000002', mr_number: 'RM-202611-00002', nik: '3273015408920002', full_name: 'Siti Nurhaliza', birth_date: '1992-08-14', gender: 'FEMALE', address: 'Jl. Dago Asri No. 12, Bandung', phone: '081398765432', is_active: true, created_at: '2026-11-22T08:15:00Z' },
        { id: 'd0000000-0000-0000-0000-000000000003', mr_number: 'RM-202611-00003', nik: '3273022511780003', full_name: 'Hendra Gunawan', birth_date: '1978-11-25', gender: 'MALE', address: 'Jl. Buah Batu No. 108, Bandung', phone: '081122334455', is_active: true, created_at: '2026-11-22T08:30:00Z' },
        { id: 'd0000000-0000-0000-0000-000000000004', mr_number: 'RM-202611-00004', nik: '3273034903000004', full_name: 'Dewi Lestari', birth_date: '2000-03-09', gender: 'FEMALE', address: 'Jl. Riau No. 89, Bandung', phone: '081987654321', is_active: true, created_at: '2026-11-22T08:45:00Z' },
        { id: 'd0000000-0000-0000-0000-000000000005', mr_number: 'RM-202611-00005', nik: '3273041506150005', full_name: 'Muhammad Rizky', birth_date: '2015-06-15', gender: 'MALE', address: 'Jl. Setiabudhi No. 201, Bandung', phone: '082134567812', is_active: true, created_at: '2026-11-22T09:00:00Z' },
      ];
      return { items: dummyPatients, pagination: { total_count: 5, current_page: 1, page_size: 10 } };
    }
  },

  async createPatient(data: Partial<Patient>): Promise<Patient> {
    const res = await apiClient.post<ApiResponse<Patient>>('/patients', data);
    return res.data.data;
  },

  async getPolyclinics(): Promise<Polyclinic[]> {
    try {
      const res = await apiClient.get<ApiResponse<Polyclinic[]>>('/polyclinics');
      return res.data.data;
    } catch {
      return [
        { id: 'a0000000-0000-0000-0000-000000000001', code: 'POLI-INT', name: 'Poliklinik Penyakit Dalam', queue_prefix: 'A', is_active: true },
        { id: 'a0000000-0000-0000-0000-000000000002', code: 'POLI-ANA', name: 'Poliklinik Anak', queue_prefix: 'B', is_active: true },
        { id: 'a0000000-0000-0000-0000-000000000003', code: 'POLI-OBG', name: 'Poliklinik Kebidanan & Kandungan', queue_prefix: 'C', is_active: true },
        { id: 'a0000000-0000-0000-0000-000000000004', code: 'POLI-GIG', name: 'Poliklinik Gigi & Mulut', queue_prefix: 'D', is_active: true },
        { id: 'a0000000-0000-0000-0000-000000000005', code: 'POLI-MAT', name: 'Poliklinik Mata', queue_prefix: 'E', is_active: true },
        { id: 'a0000000-0000-0000-0000-000000000006', code: 'POLI-BED', name: 'Poliklinik Bedah Umum', queue_prefix: 'F', is_active: true },
      ];
    }
  },

  async getDoctors(polyclinicId?: string): Promise<Doctor[]> {
    try {
      const res = await apiClient.get<ApiResponse<Doctor[]>>('/medical-staff', {
        params: { polyclinic_id: polyclinicId },
      });
      return res.data.data;
    } catch {
      return [
        { id: 'b0000000-0000-0000-0000-000000000001', full_name: 'dr. Budi Santoso, Sp.PD', sip_number: 'SIP-446/012/IDI/2021', polyclinic_id: 'a0000000-0000-0000-0000-000000000001', polyclinic_name: 'Poliklinik Penyakit Dalam' },
        { id: 'b0000000-0000-0000-0000-000000000002', full_name: 'dr. Anisa Rahma, Sp.A', sip_number: 'SIP-446/015/IDI/2022', polyclinic_id: 'a0000000-0000-0000-0000-000000000002', polyclinic_name: 'Poliklinik Anak' },
        { id: 'b0000000-0000-0000-0000-000000000003', full_name: 'dr. Citra Lestari, Sp.OG', sip_number: 'SIP-446/018/IDI/2020', polyclinic_id: 'a0000000-0000-0000-0000-000000000003', polyclinic_name: 'Poliklinik Kebidanan & Kandungan' },
      ];
    }
  },
};
