/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import api from '../lib/api';
import { Product } from '../types';

export const productService = {
  getAll: async (status: string = 'ACTIVE'): Promise<Product[]> => {
    const response = await api.get<Product[]>('/api/products', {
      params: { status }
    });
    return response.data;
  },

  getPending: async (): Promise<Product[]> => {
    const response = await api.get<Product[]>('/api/products/pending');
    return response.data;
  },

  search: async (query: string, boutiqueId?: string): Promise<any[]> => {
    const response = await api.get<any[]>('/api/products/search', {
      params: { q: query, boutiqueId }
    });
    return response.data;
  },

  getById: async (id: string): Promise<any> => {
    const response = await api.get<any>(`/api/products/${id}`);
    return response.data;
  },

  create: async (productData: Partial<Product>): Promise<Product> => {
    const response = await api.post<Product>('/api/products', productData);
    return response.data;
  },

  update: async (id: string, productData: Partial<Product>): Promise<Product> => {
    const response = await api.put<Product>(`/api/products/${id}`, productData);
    return response.data;
  },

  toggleStatus: async (id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<{ message: string; status: string }> => {
    const response = await api.patch<{ message: string; status: string }>(`/api/products/${id}/status`, { status });
    return response.data;
  }
};
