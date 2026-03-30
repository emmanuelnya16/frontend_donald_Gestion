import api from '../lib/api';

// ─── Boutique Sales Report Types ──────────────
export interface ArticleSold {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
}

export interface RecentSale {
  invoiceNumber: string;
  totalPrice: string | number;
  timestamp: string;
  itemsCount: number;
}

export interface TransferItem {
  productName: string;
  quantity: number;
  sourceBoutique: string;
}

export interface StockItem {
  productName: string;
  quantity: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
}

export interface BoutiqueSalesReport {
  boutique: { id: string; name: string };
  totalRevenue: number;
  totalTransactions: number;
  articlesSold: ArticleSold[];
  recentSales: RecentSale[];
  transferItems: TransferItem[];
  stockSummary: StockItem[];
  lowStockCount: number;
  outOfStockCount: number;
}

// ─── Comparison Report Types ───────────────
export interface ComparisonBoutique {
  boutique: { id: string; name: string };
  totalRevenue: number;
  totalTransactions: number;
  completedSales: number;
  transfersIn: number;
  totalStock: number;
  outOfStockCount: number;
}

export interface ComparisonReport {
  boutiques: ComparisonBoutique[];
  topBoutique: string | null;
}

// ─── Service ───────────────────────────────
export const reportService = {
  /**
   * Récupère le rapport des ventes d'une boutique (TOUTES les ventes, sans filtre date)
   */
  async getBoutiqueSales(boutiqueId: string): Promise<BoutiqueSalesReport> {
    try {
      const response = await api.get<BoutiqueSalesReport>('/api/reports/boutique-sales', {
        params: { boutiqueId },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching boutique sales report:', error?.response?.status, error?.response?.data);
      if (error.response?.status === 404) {
        return {
          boutique: { id: boutiqueId, name: '' },
          totalRevenue: 0,
          totalTransactions: 0,
          articlesSold: [],
          recentSales: [],
          transferItems: [],
          stockSummary: [],
          lowStockCount: 0,
          outOfStockCount: 0,
        };
      }
      throw error;
    }
  },

  /**
   * Récupère la comparaison de toutes les boutiques (SANS filtre date)
   */
  async getComparison(): Promise<ComparisonReport> {
    try {
      const response = await api.get<ComparisonReport>('/api/reports/comparison');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching comparison report:', error?.response?.status, error?.response?.data);
      if (error.response?.status === 404) {
        return { boutiques: [], topBoutique: null };
      }
      throw error;
    }
  },
};
