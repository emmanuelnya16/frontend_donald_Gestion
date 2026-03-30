/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import api from '../lib/api';
import { Sale, CreateSaleRequest } from '../types';

export const saleService = {
  getAll: async (boutiqueId?: string, date?: string): Promise<Sale[]> => {
    const response = await api.get<Sale[]>('/api/sales', {
      params: { boutiqueId, date }
    });
    
    const sales = response.data;

    // The backend list endpoint may not include items (only itemsCount).
    // If items are missing, fetch each sale's detail to get the full items.
    // This will be unnecessary once you change the backend to always include items:
    //   In SaleController::list(), change:
    //     $this->format($s)  →  $this->format($s, true)
    const needsEnrichment = sales.length > 0 && !sales[0].items;

    if (needsEnrichment) {
      // Fetch details for all sales in parallel (batched)
      const enriched = await Promise.all(
        sales.map(async (sale) => {
          try {
            const detail = await api.get<Sale>(`/api/sales/${sale.id}`);
            return detail.data;
          } catch {
            // If detail fetch fails, return sale as-is with empty items
            return { ...sale, items: [] };
          }
        })
      );
      return enriched;
    }

    return sales;
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
