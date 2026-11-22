import apiClient from './api';
import { User, LoginResponseData, ApiResponse } from '../types/auth';

// Seeded demo accounts matching database/seeds.sql for immediate exploration and offline UI testing
export const DEMO_ACCOUNTS: Record<string, User> = {
  admin: {
    id: '11111111-1111-1111-1111-111111111111',
    username: 'admin',
    email: 'admin@simrs.hospital.id',
    full_name: 'Super Administrator, S.Kom',
    role: 'ADMIN',
  },
  'petugas.pendaftaran': {
    id: '22222222-2222-2222-2222-222222222222',
    username: 'petugas.pendaftaran',
    email: 'pendaftaran@simrs.hospital.id',
    full_name: 'Rina Wulandari, A.Md.RMIK',
    role: 'REGISTRATION',
  },
  'dr.budi': {
    id: '33333333-3333-3333-3333-333333333333',
    username: 'dr.budi',
    email: 'dr.budi@simrs.hospital.id',
    full_name: 'dr. Budi Santoso, Sp.PD',
    role: 'DOCTOR',
    medical_staff_id: 'b0000000-0000-0000-0000-000000000001',
    polyclinic_id: 'a0000000-0000-0000-0000-000000000001',
    polyclinic_name: 'Poliklinik Penyakit Dalam',
  },
  'petugas.farmasi': {
    id: '66666666-6666-6666-6666-666666666666',
    username: 'petugas.farmasi',
    email: 'farmasi@simrs.hospital.id',
    full_name: 'Ahmad Fauzi, S.Farm., Apt.',
    role: 'PHARMACY',
  },
  'petugas.lab': {
    id: '77777777-7777-7777-7777-777777777777',
    username: 'petugas.lab',
    email: 'lab@simrs.hospital.id',
    full_name: 'Dewi Sartika, A.Md.AK',
    role: 'LABORATORY',
  },
  kasir: {
    id: '88888888-8888-8888-8888-888888888888',
    username: 'kasir',
    email: 'kasir@simrs.hospital.id',
    full_name: 'Maya Anggraini, S.Ak.',
    role: 'CASHIER',
  },
};

export const authService = {
  async login(username: string, password: string): Promise<LoginResponseData> {
    try {
      const response = await apiClient.post<ApiResponse<LoginResponseData>>('/auth/login', {
        username,
        password,
      });
      return response.data.data;
    } catch (error: any) {
      // If network fails (backend not currently running on port 8000), support test accounts
      if (error.code === 'ERR_NETWORK' || !error.response) {
        const demoUser = DEMO_ACCOUNTS[username];
        if (demoUser && password === 'Password123!') {
          return {
            token: `mock-jwt-token-for-${demoUser.username}-${Date.now()}`,
            expires_in: 28800,
            user: demoUser,
          };
        }
      }
      throw error;
    }
  },

  async getMe(): Promise<User> {
    try {
      const response = await apiClient.get<ApiResponse<User>>('/auth/me');
      return response.data.data;
    } catch (error: any) {
      // Local fallback for saved demo session
      const savedUser = localStorage.getItem('simrs_user');
      if (savedUser) {
        return JSON.parse(savedUser);
      }
      throw error;
    }
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('simrs_token');
      localStorage.removeItem('simrs_user');
    }
  },
};
