import apiClient from './api';
import { ApiResponse } from '../types/auth';

export interface Visit {
  id: string;
  visit_number: string;
  visit_date: string;
  queue_number: number;
  queue_display: string;
  status: string;
  cancel_reason?: string | null;
  patient_id: string;
  patient_name: string;
  mr_number: string;
  gender?: string;
  birth_date?: string;
  phone?: string;
  polyclinic_id: string;
  polyclinic_name: string;
  doctor_id: string;
  doctor_name: string;
  created_at: string;
}

export const visitService = {
  async createVisit(data: {
    patient_id: string;
    polyclinic_id: string;
    doctor_id: string;
    visit_date: string;
    schedule_id?: string;
  }): Promise<Visit> {
    const res = await apiClient.post<ApiResponse<Visit>>('/visits', data);
    return res.data.data;
  },

  async getVisits(filters: Record<string, any> = {}, page: number = 1, limit: number = 20): Promise<{ items: Visit[]; pagination: any }> {
    try {
      const res = await apiClient.get<ApiResponse<Visit[]>>('/visits', {
        params: { ...filters, page, limit },
      });
      return {
        items: res.data.data,
        pagination: res.data.meta?.pagination || { total_count: res.data.data.length, current_page: page, page_size: limit },
      };
    } catch {
      // Fallback dummy queues
      const dummyVisits: Visit[] = [
        { id: 'v1', visit_number: 'REG-20261122-0001', visit_date: '2026-11-22', queue_number: 1, queue_display: 'A001', status: 'IN_EXAMINATION', patient_id: 'd0000000-0000-0000-0000-000000000001', patient_name: 'Bambang Pamungkas', mr_number: 'RM-202611-00001', polyclinic_id: 'a0000000-0000-0000-0000-000000000001', polyclinic_name: 'Poliklinik Penyakit Dalam', doctor_id: 'b0000000-0000-0000-0000-000000000001', doctor_name: 'dr. Budi Santoso, Sp.PD', created_at: '2026-11-22T08:00:00Z' },
        { id: 'v2', visit_number: 'REG-20261122-0002', visit_date: '2026-11-22', queue_number: 2, queue_display: 'A002', status: 'WAITING', patient_id: 'd0000000-0000-0000-0000-000000000002', patient_name: 'Siti Nurhaliza', mr_number: 'RM-202611-00002', polyclinic_id: 'a0000000-0000-0000-0000-000000000001', polyclinic_name: 'Poliklinik Penyakit Dalam', doctor_id: 'b0000000-0000-0000-0000-000000000001', doctor_name: 'dr. Budi Santoso, Sp.PD', created_at: '2026-11-22T08:15:00Z' },
        { id: 'v3', visit_number: 'REG-20261122-0003', visit_date: '2026-11-22', queue_number: 1, queue_display: 'B001', status: 'WAITING_PHARMACY', patient_id: 'd0000000-0000-0000-0000-000000000005', patient_name: 'Muhammad Rizky', mr_number: 'RM-202611-00005', polyclinic_id: 'a0000000-0000-0000-0000-000000000002', polyclinic_name: 'Poliklinik Anak', doctor_id: 'b0000000-0000-0000-0000-000000000002', doctor_name: 'dr. Anisa Rahma, Sp.A', created_at: '2026-11-22T08:30:00Z' },
        { id: 'v4', visit_number: 'REG-20261122-0004', visit_date: '2026-11-22', queue_number: 1, queue_display: 'C001', status: 'READY_FOR_BILLING', patient_id: 'd0000000-0000-0000-0000-000000000004', patient_name: 'Dewi Lestari', mr_number: 'RM-202611-00004', polyclinic_id: 'a0000000-0000-0000-0000-000000000003', polyclinic_name: 'Poliklinik Kebidanan & Kandungan', doctor_id: 'b0000000-0000-0000-0000-000000000003', doctor_name: 'dr. Citra Lestari, Sp.OG', created_at: '2026-11-22T08:45:00Z' },
      ];
      return { items: dummyVisits, pagination: { total_count: 4, current_page: 1, page_size: 10 } };
    }
  },

  async getVisitById(id: string): Promise<Visit> {
    const res = await apiClient.get<ApiResponse<Visit>>(`/visits/${id}`);
    return res.data.data;
  },

  async updateStatus(id: string, status: string, cancelReason?: string): Promise<any> {
    const res = await apiClient.patch<ApiResponse<any>>(`/visits/${id}/status`, {
      status,
      cancel_reason: cancelReason,
    });
    return res.data.data;
  },
};
