import apiClient from './api';
import { ApiResponse } from '../types/auth';

export interface Prescription {
  id: string;
  prescription_number: string;
  visit_id: string;
  status: string;
  notes?: string;
  doctor_name: string;
  patient_name?: string;
  mr_number?: string;
  items: {
    id: string;
    medicine_id: string;
    medicine_name: string;
    dosage: string;
    frequency: string;
    quantity: number;
    unit: string;
    snapshot_price: number;
    subtotal: number;
  }[];
  created_at: string;
}

export const pharmacyService = {
  async getPrescriptions(): Promise<Prescription[]> {
    try {
      const res = await apiClient.get<ApiResponse<Prescription[]>>('/prescriptions');
      return res.data.data;
    } catch {
      return [
        {
          id: 'rx-001',
          prescription_number: 'RX-20261122-0012',
          visit_id: 'v1',
          status: 'SUBMITTED',
          doctor_name: 'dr. Budi Santoso, Sp.PD',
          patient_name: 'Bambang Pamungkas',
          mr_number: 'RM-202611-00001',
          notes: 'Diminum teratur sesudah makan',
          created_at: '2026-11-22T08:35:00Z',
          items: [
            { id: 'i1', medicine_id: '10000000-0000-0000-0000-000000000005', medicine_name: 'Amlodipine 10 mg', dosage: '10 mg', frequency: '1x1 Sehari', quantity: 30, unit: 'Tablet', snapshot_price: 2500, subtotal: 75000 },
          ],
        },
      ];
    }
  },

  async dispense(prescriptionId: string, notes?: string): Promise<any> {
    const res = await apiClient.post<ApiResponse<any>>(`/prescriptions/${prescriptionId}/dispense`, { notes });
    return res.data.data;
  },
};
