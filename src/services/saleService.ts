/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import api from '../lib/api';
import { Sale, CreateSaleRequest } from '../types';

export const saleService = {
  getAll: async (boutiqueId?: string, date?: string): Promise<Sale[]> => {
    const params: Record<string, string> = {};
    if (boutiqueId) params.boutiqueId = boutiqueId;
    if (date) params.date = date;

    const response = await api.get<Sale[]>('/api/sales', { params });
    // The backend now returns items directly in the list response.
    // No need for N+1 detail fetches.
    return response.data;
  },

  getById: async (id: string): Promise<Sale> => {
    const response = await api.get<Sale>(`/api/sales/${id}`);
    return response.data;
  },

  create: async (saleData: CreateSaleRequest): Promise<Sale> => {
    const response = await api.post<Sale>('/api/sales', saleData);
    return response.data;
  },

  cancel: async (id: string, reason: string): Promise<any> => {
    const response = await api.patch<any>(`/api/sales/${id}/cancel`, {
      reason
    });
    return response.data;
  },

  recordReturn: async (id: string, reason: string): Promise<any> => {
    const response = await api.post<any>(`/api/sales/${id}/return`, {
      reason
    });
    return response.data;
  }
};
