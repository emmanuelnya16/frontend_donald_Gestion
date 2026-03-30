import api from '../lib/api';
import { Transfer } from '../types';

export const transferService = {
  async getAll(boutiqueId?: string): Promise<Transfer[]> {
    try {
      const response = await api.get('/api/transfers', {
        params: boutiqueId ? { boutiqueId } : undefined
      });
      return response.data;
    } catch (error: any) {
      // If the endpoint doesn't exist yet (404), return empty array gracefully
      if (error.response?.status === 404) {
        console.warn('Transfers endpoint not available yet (404). Returning empty list.');
        return [];
      }
      throw error;
    }
  },

  async getById(id: string): Promise<Transfer> {
    const response = await api.get(`/api/transfers/${id}`);
    return response.data;
  },

  // Note: Transfers are created automatically by the backend during sales.
  // There is no POST /api/transfers endpoint — this is read-only.
};
