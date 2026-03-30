/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import api from '../lib/api';
import { User, Role } from '../types';

export interface LoginResponse {
  token: string;
}

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/api/login', {
      email, // Changed from username to email to match backend logic
      password,
    });
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/api/me');
    return response.data;
  },

  // Helper to map Symfony roles to frontend roles
  mapRole: (role: string): Role => {
    if (role === 'ROLE_ADMIN' || role === 'ADMIN') return 'ROLE_ADMIN';
    return 'ROLE_BOUTIQUE';
  }
};
