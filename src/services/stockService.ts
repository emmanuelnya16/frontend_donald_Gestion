/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import api from '../lib/api';
import { StockItem, StockMovement } from '../types';

export const stockService = {
  getAll: async (): Promise<StockItem[]> => {
    const response = await api.get<StockItem[]>('/api/stock');
    return response.data;
  },

  getByBoutique: async (boutiqueId: string): Promise<StockItem[]> => {
    const response = await api.get<StockItem[]>(`/api/stock/boutique/${boutiqueId}`);
    return response.data;
  },

  add: async (data: { 
    productId: string; 
    quantity: number; 
    boutiqueId?: string; 
    localPrice?: number; 
    lowStockThreshold?: number 
  }): Promise<StockItem> => {
    const response = await api.post<StockItem>('/api/stock', data);
    return response.data;
  },

  adjust: async (id: string, quantity: number, note: string): Promise<any> => {
    const response = await api.patch<any>(`/api/stock/${id}`, {
      quantity,
      note
    });
    return response.data;
  },

  updatePrice: async (id: string, localPrice: number): Promise<any> => {
    const response = await api.patch<any>(`/api/stock/${id}/price`, {
      localPrice
    });
    return response.data;
  },

  updateThreshold: async (id: string, threshold: number): Promise<any> => {
    const response = await api.patch<any>(`/api/stock/${id}/threshold`, {
      threshold
    });
    return response.data;
  },

  getMovements: async (boutiqueId?: string): Promise<StockMovement[]> => {
    const response = await api.get<StockMovement[]>('/api/stock/movements', {
      params: { boutiqueId }
    });
    return response.data;
  }
};
