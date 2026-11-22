import apiClient from './api';
import { ApiResponse } from '../types/auth';

export interface Diagnosis {
  id: string;
  code: string;
  description: string;
}

export interface Procedure {
  id: string;
  code: string;
  name: string;
  base_price: number;
}

export interface Medicine {
  id: string;
  code: string;
  name: string;
  generic_name: string;
  unit: string;
  base_price: number;
  current_stock: number;
}

export interface LabTest {
  id: string;
  code: string;
  name: string;
  normal_range: string;
  unit: string;
  base_price: number;
}

export const clinicalService = {
  async getDiagnoses(search?: string): Promise<Diagnosis[]> {
    try {
      const res = await apiClient.get<ApiResponse<Diagnosis[]>>('/diagnoses', { params: { search } });
      return res.data.data;
    } catch {
      return [
        { id: 'e0000000-0000-0000-0000-000000000001', code: 'I10', description: 'Essential (primary) hypertension' },
        { id: 'e0000000-0000-0000-0000-000000000002', code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' },
        { id: 'e0000000-0000-0000-0000-000000000003', code: 'J00', description: 'Acute nasopharyngitis [common cold]' },
        { id: 'e0000000-0000-0000-0000-000000000004', code: 'A90', description: 'Dengue fever [classical dengue]' },
        { id: 'e0000000-0000-0000-0000-000000000005', code: 'K29.7', description: 'Gastritis, unspecified' },
      ];
    }
  },

  async getProcedures(): Promise<Procedure[]> {
    try {
      const res = await apiClient.get<ApiResponse<Procedure[]>>('/medical-procedures');
      return res.data.data;
    } catch {
      return [
        { id: 'f0000000-0000-0000-0000-000000000001', code: 'PROC-CONSULT', name: 'Konsultasi & Pemeriksaan Dokter Spesialis', base_price: 100000 },
        { id: 'f0000000-0000-0000-0000-000000000002', code: 'PROC-EKG', name: 'Pemeriksaan Elektrokardiogram (EKG 12-Lead)', base_price: 85000 },
        { id: 'f0000000-0000-0000-0000-000000000003', code: 'PROC-NEBU', name: 'Terapi Inhalasi / Nebulisasi', base_price: 65000 },
        { id: 'f0000000-0000-0000-0000-000000000004', code: 'PROC-USG-OBG', name: 'Ultrasonografi (USG) Kandungan 2D', base_price: 150000 },
      ];
    }
  },

  async getMedicines(): Promise<Medicine[]> {
    try {
      const res = await apiClient.get<ApiResponse<Medicine[]>>('/medicines');
      return res.data.data;
    } catch {
      return [
        { id: '10000000-0000-0000-0000-000000000001', code: 'MED-PCT-500', name: 'Paracetamol 500 mg', generic_name: 'Paracetamol', unit: 'Tablet', base_price: 1500, current_stock: 500 },
        { id: '10000000-0000-0000-0000-000000000002', code: 'MED-AMX-500', name: 'Amoxicillin 500 mg', generic_name: 'Amoxicillin', unit: 'Kaplet', base_price: 3000, current_stock: 300 },
        { id: '10000000-0000-0000-0000-000000000004', code: 'MED-OMZ-20', name: 'Omeprazole 20 mg', generic_name: 'Omeprazole', unit: 'Kapsul', base_price: 4000, current_stock: 250 },
        { id: '10000000-0000-0000-0000-000000000005', code: 'MED-AML-10', name: 'Amlodipine 10 mg', generic_name: 'Amlodipine', unit: 'Tablet', base_price: 2500, current_stock: 400 },
      ];
    }
  },

  async getLabTests(): Promise<LabTest[]> {
    try {
      const res = await apiClient.get<ApiResponse<LabTest[]>>('/lab-tests');
      return res.data.data;
    } catch {
      return [
        { id: '20000000-0000-0000-0000-000000000001', code: 'LAB-CBC', name: 'Darah Lengkap (Complete Blood Count / CBC)', normal_range: 'Hb: 12-16', unit: 'Panel', base_price: 85000 },
        { id: '20000000-0000-0000-0000-000000000002', code: 'LAB-GDS', name: 'Glukosa Darah Sewaktu (GDS)', normal_range: '70 - 140', unit: 'mg/dL', base_price: 35000 },
        { id: '20000000-0000-0000-0000-000000000003', code: 'LAB-CHOL-TOT', name: 'Kolesterol Total', normal_range: '< 200', unit: 'mg/dL', base_price: 45000 },
      ];
    }
  },

  async saveMedicalRecord(data: any): Promise<any> {
    const res = await apiClient.post<ApiResponse<any>>('/medical-records', data);
    return res.data.data;
  },

  async addProcedure(visitId: string, procedureId: string, quantity: number = 1): Promise<any> {
    const res = await apiClient.post<ApiResponse<any>>(`/visits/${visitId}/procedures`, {
      procedure_id: procedureId,
      quantity,
    });
    return res.data.data;
  },

  async createPrescription(visitId: string, items: any[], notes?: string): Promise<any> {
    const res = await apiClient.post<ApiResponse<any>>('/prescriptions', {
      visit_id: visitId,
      items,
      notes,
    });
    return res.data.data;
  },

  async createLabOrder(visitId: string, testIds: string[], clinicalNotes?: string): Promise<any> {
    const res = await apiClient.post<ApiResponse<any>>('/lab-orders', {
      visit_id: visitId,
      test_ids: testIds,
      clinical_notes: clinicalNotes,
    });
    return res.data.data;
  },
};
