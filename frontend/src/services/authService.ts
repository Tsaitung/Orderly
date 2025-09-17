import { apiClient } from './api';
import { ApiResponse, CreateUserRequest } from '@orderly/types';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    phone?: string;
    avatar?: string;
    role: string;
    organizationId: string;
    organizationName: string;
  };
  token: string;
}

interface RegisterResponse {
  user: {
    id: string;
    email: string;
    name: string;
    phone?: string;
    avatar?: string;
  };
  token: string;
}

export const authService = {
  login: (data: LoginRequest): Promise<ApiResponse<LoginResponse>> =>
    apiClient.post('/users/login', data),

  register: (data: CreateUserRequest): Promise<ApiResponse<RegisterResponse>> =>
    apiClient.post('/users/register', data),

  forgotPassword: (email: string): Promise<ApiResponse<{ message: string }>> =>
    apiClient.post('/users/forgot-password', { email }),

  resetPassword: (token: string, password: string): Promise<ApiResponse<{ message: string }>> =>
    apiClient.post('/users/reset-password', { token, password }),
};