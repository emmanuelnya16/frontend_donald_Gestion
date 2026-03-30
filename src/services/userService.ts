/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import api from '../lib/api';
import { User } from '../types';

export const userService = {
  getUsers: async (): Promise<User[]> => {
    const response = await api.get<User[]>('/api/users');
    return response.data;
  },

  getUser: async (id: string): Promise<User> => {
    const response = await api.get<User>(`/api/users/${id}`);
    return response.data;
  },

  createUser: async (userData: Partial<User> & { password?: string }): Promise<User> => {
    const response = await api.post<User>('/api/users', userData);
    return response.data;
  },

  updateUser: async (id: string, userData: Partial<User> & { password?: string }): Promise<User> => {
    const response = await api.put<User>(`/api/users/${id}`, userData);
    return response.data;
  },

  toggleUserStatus: async (id: string): Promise<{ message: string; status: 'ACTIVE' | 'INACTIVE' }> => {
    const response = await api.patch<{ message: string; status: 'ACTIVE' | 'INACTIVE' }>(`/api/users/${id}/status`);
    return response.data;
  },

  deleteUser: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/api/users/${id}`);
    return response.data;
  }
};
