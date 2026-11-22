export type UserRole = 
  | 'ADMIN' 
  | 'REGISTRATION' 
  | 'DOCTOR' 
  | 'PHARMACY' 
  | 'LABORATORY' 
  | 'CASHIER';

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  medical_staff_id?: string | null;
  polyclinic_id?: string | null;
  polyclinic_name?: string | null;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginResponseData {
  token: string;
  refresh_token?: string;
  expires_in: number;
  user: User;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    timestamp?: string;
    version?: string;
    pagination?: {
      total_count: number;
      page_count: number;
      current_page: number;
      page_size: number;
    };
  };
  errors?: Record<string, string[]>;
  code?: string;
}
