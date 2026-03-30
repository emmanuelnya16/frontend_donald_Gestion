import api from '../lib/api';

export interface AlertItem {
  boutiqueId: string;
  boutiqueName: string;
  productId: string;
  productName: string;
  quantity: number;
  threshold?: number;
  stockItemId: string;
}

export interface DependencyAlert {
  boutiqueId: string;
  boutiqueName: string;
  transfersThisWeek: number;
  threshold: number;
  dependencyLevel: string;
}

export interface AlertsResponse {
  outOfStock: AlertItem[];
  lowStock: AlertItem[];
  dependency: DependencyAlert[];
  totalAlerts: number;
}

export const alertService = {
  async getAll(): Promise<AlertsResponse> {
    try {
      const response = await api.get<AlertsResponse>('/api/alerts');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.warn('Alerts endpoint not available yet (404). Returning empty alerts.');
        return { outOfStock: [], lowStock: [], dependency: [], totalAlerts: 0 };
      }
      throw error;
    }
  },
};
