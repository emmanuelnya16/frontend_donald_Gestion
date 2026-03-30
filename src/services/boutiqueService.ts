/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import api from '../lib/api';
import { Boutique } from '../types';

export const boutiqueService = {
  getBoutiques: async (): Promise<Boutique[]> => {
    const response = await api.get<Boutique[]>('/api/boutiques');
    return response.data;
  },

  getBoutique: async (id: string): Promise<Boutique> => {
    const response = await api.get<Boutique>(`/api/boutiques/${id}`);
    return response.data;
  },

  createBoutique: async (boutiqueData: Partial<Boutique>): Promise<Boutique> => {
    const response = await api.post<Boutique>('/api/boutiques', boutiqueData);
    return response.data;
  },

  updateBoutique: async (id: string, boutiqueData: Partial<Boutique>): Promise<Boutique> => {
    const response = await api.put<Boutique>(`/api/boutiques/${id}`, boutiqueData);
    return response.data;
  },

  toggleBoutiqueStatus: async (id: string): Promise<{ message: string; status: 'ACTIVE' | 'INACTIVE' }> => {
    const response = await api.patch<{ message: string; status: 'ACTIVE' | 'INACTIVE' }>(`/api/boutiques/${id}/status`);
    return response.data;
  },

  deleteBoutique: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/api/boutiques/${id}`);
    return response.data;
  }
};
