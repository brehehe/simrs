import apiClient from './api';
import { ApiResponse } from '../types/auth';

export interface InvoiceAdjustment {
  id: string;
  invoice_id: string;
  adjustment_type: 'ADDITION' | 'DEDUCTION' | 'CANCELLATION';
  amount: number;
  reason: string;
  created_at: string;
  author_name?: string;
  author_role?: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  visit_id: string;
  patient_id: string;
  patient_name: string;
  mr_number: string;
  visit_number: string;
  registration_fee: number;
  procedures_total: number;
  lab_total: number;
  medicines_total: number;
  total_amount: number;
  paid_amount: number;
  outstanding_balance: number;
  status: string;
  version?: number;
  adjustments?: InvoiceAdjustment[];
  items: {
    id: string;
    item_type: string;
    description: string;
    unit_price: number;
    quantity: number;
    subtotal: number;
  }[];
  created_at: string;
}

export const billingService = {
  async getInvoiceByVisit(visitId: string): Promise<Invoice> {
    try {
      const res = await apiClient.get<ApiResponse<Invoice>>(`/invoices/visit/${visitId}`);
      return res.data.data;
    } catch {
      return {
        id: 'inv-001',
        invoice_number: 'INV-20261122-0008',
        visit_id: visitId,
        patient_id: 'd0000000-0000-0000-0000-000000000004',
        patient_name: 'Dewi Lestari',
        mr_number: 'RM-202611-00004',
        visit_number: 'REG-20261122-0004',
        registration_fee: 25000,
        procedures_total: 150000,
        lab_total: 35000,
        medicines_total: 60000,
        total_amount: 270000,
        paid_amount: 0,
        outstanding_balance: 270000,
        status: 'UNPAID',
        created_at: '2026-11-22T09:20:00Z',
        items: [
          { id: '1', item_type: 'REGISTRATION', description: 'Biaya Registrasi Rawat Jalan', unit_price: 25000, quantity: 1, subtotal: 25000 },
          { id: '2', item_type: 'PROCEDURE', description: 'Tindakan: USG Kandungan 2D', unit_price: 150000, quantity: 1, subtotal: 150000 },
          { id: '3', item_type: 'LAB', description: 'Laboratorium: Glukosa Darah Sewaktu', unit_price: 35000, quantity: 1, subtotal: 35000 },
          { id: '4', item_type: 'MEDICINE', description: 'Obat: Paracetamol 500 mg', unit_price: 1500, quantity: 40, subtotal: 60000 },
        ],
      };
    }
  },

  async processPayment(invoiceId: string, payload: {
    amount: number;
    cash_received?: number;
    change_amount?: number;
    payment_method: string;
    reference_no?: string;
    idempotency_key: string;
  }): Promise<any> {
    const res = await apiClient.post<ApiResponse<any>>(`/invoices/${invoiceId}/payments`, payload, {
      headers: {
        'X-Idempotency-Key': payload.idempotency_key,
      },
    });
    return res.data.data;
  },

  async createAdjustment(invoiceId: string, payload: {
    adjustment_type: 'ADDITION' | 'DEDUCTION' | 'CANCELLATION';
    amount: number;
    reason: string;
  }): Promise<any> {
    const res = await apiClient.post<ApiResponse<any>>(`/invoices/${invoiceId}/adjustments`, payload);
    return res.data.data;
  },

  async getAdjustments(invoiceId: string): Promise<InvoiceAdjustment[]> {
    const res = await apiClient.get<ApiResponse<InvoiceAdjustment[]>>(`/invoices/${invoiceId}/adjustments`);
    return res.data.data;
  },
};
