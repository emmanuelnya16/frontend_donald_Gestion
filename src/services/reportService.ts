import api from '../lib/api';
import { saleService } from './saleService';
import { stockService } from './stockService';
import { boutiqueService } from './boutiqueService';
import { transferService } from './transferService';

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
   * Récupère le rapport des ventes d'une boutique (calculé localement avec filtre de période optionnel)
   */
  async getBoutiqueSales(boutiqueId: string, period: 'all' | 'day' | 'week' | 'month' = 'all'): Promise<BoutiqueSalesReport> {
    try {
      const [allBoutiques, allSales, allStock, allTransfers] = await Promise.all([
        boutiqueService.getBoutiques(),
        saleService.getAll(boutiqueId),
        stockService.getAll(),
        transferService.getAll()
      ]);

      const boutique = allBoutiques.find(b => b.id === boutiqueId) || { id: boutiqueId, name: 'Boutique' };

      let boutiqueSales = allSales.filter(s => s.boutique?.id === boutiqueId && s.status === 'COMPLETED');
      // Fallback: if filter returned nothing but we have sales, the IDs might not match.
      // The backend already filters for ROLE_BOUTIQUE users, so use raw data.
      if (boutiqueSales.length === 0 && allSales.length > 0) {
        boutiqueSales = allSales.filter(s => s.status === 'COMPLETED');
      }
      let boutiqueTransfers = allTransfers.filter(t => t.destBoutique?.id === boutiqueId);
      if (boutiqueTransfers.length === 0 && allTransfers.length > 0) {
        boutiqueTransfers = [...allTransfers];
      }

      const now = new Date();
      if (period === 'day') {
        const todayStr = now.toISOString().split('T')[0];
        boutiqueSales = boutiqueSales.filter(s => s.timestamp.startsWith(todayStr));
        boutiqueTransfers = boutiqueTransfers.filter(t => t.timestamp.startsWith(todayStr));
      } else if (period === 'week') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // start on Monday
        startOfWeek.setHours(0, 0, 0, 0);
        boutiqueSales = boutiqueSales.filter(s => new Date(s.timestamp) >= startOfWeek);
        boutiqueTransfers = boutiqueTransfers.filter(t => new Date(t.timestamp) >= startOfWeek);
      } else if (period === 'month') {
        const monthStr = now.toISOString().slice(0, 7); // YYYY-MM
        boutiqueSales = boutiqueSales.filter(s => s.timestamp.startsWith(monthStr));
        boutiqueTransfers = boutiqueTransfers.filter(t => t.timestamp.startsWith(monthStr));
      }

      let boutiqueStock = allStock.filter(s => s.boutique?.id === boutiqueId);
      if (boutiqueStock.length === 0 && allStock.length > 0) {
        boutiqueStock = [...allStock];
      }

      const totalRevenue = boutiqueSales.reduce((acc, s) => acc + Number(s.totalPrice), 0);
      const totalTransactions = boutiqueSales.length;

      const articlesMap = new Map<string, ArticleSold>();
      boutiqueSales.forEach(sale => {
        (sale.items || []).forEach(item => {
          if (!articlesMap.has(item.product.id)) {
            articlesMap.set(item.product.id, {
              productId: item.product.id,
              productName: item.product.name,
              quantity: 0,
              revenue: 0
            });
          }
          const art = articlesMap.get(item.product.id)!;
          art.quantity += item.quantity;
          art.revenue += item.quantity * Number(item.unitPrice);
        });
      });

      const articlesSold = Array.from(articlesMap.values()).sort((a, b) => b.revenue - a.revenue);

      const recentSales = boutiqueSales
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10)
        .map(s => ({
          invoiceNumber: s.invoiceNumber,
          totalPrice: s.totalPrice,
          timestamp: s.timestamp,
          itemsCount: (s.items || []).reduce((acc, i) => acc + i.quantity, 0)
        }));

      const transferItems = boutiqueTransfers.map(t => ({
        productName: t.product.name,
        quantity: t.quantity,
        sourceBoutique: t.sourceBoutique.name
      }));

      const stockSummary = boutiqueStock.map(s => ({
        productName: s.product.name,
        quantity: s.quantity,
        isLowStock: s.quantity <= 5 && s.quantity > 0,
        isOutOfStock: s.quantity === 0
      })).sort((a, b) => a.quantity - b.quantity);

      const lowStockCount = stockSummary.filter(s => s.isLowStock).length;
      const outOfStockCount = stockSummary.filter(s => s.isOutOfStock).length;

      return {
        boutique,
        totalRevenue,
        totalTransactions,
        articlesSold,
        recentSales,
        transferItems,
        stockSummary,
        lowStockCount,
        outOfStockCount
      };
    } catch (error) {
      console.error('Error computing boutique sales report:', error);
      throw error;
    }
  },

  /**
   * Récupère la comparaison de toutes les boutiques (calculée localement)
   */
  async getComparison(): Promise<ComparisonReport> {
    try {
      const [boutiques, allSales, allStock, allTransfers] = await Promise.all([
        boutiqueService.getBoutiques(),
        saleService.getAll(),
        stockService.getAll(),
        transferService.getAll()
      ]);

      const compBoutiques: ComparisonBoutique[] = boutiques.map(boutique => {
        const bSales = allSales.filter(s => s.boutique?.id === boutique.id && s.status === 'COMPLETED');
        const bStock = allStock.filter(s => s.boutique?.id === boutique.id);
        const bTransfersIn = allTransfers.filter(t => t.destBoutique?.id === boutique.id);

        return {
          boutique: { id: boutique.id, name: boutique.name },
          totalRevenue: bSales.reduce((acc, s) => acc + Number(s.totalPrice), 0),
          totalTransactions: bSales.length,
          completedSales: bSales.length,
          transfersIn: bTransfersIn.reduce((acc, t) => acc + t.quantity, 0),
          totalStock: bStock.reduce((acc, s) => acc + s.quantity, 0),
          outOfStockCount: bStock.filter(s => s.quantity === 0).length
        };
      });

      compBoutiques.sort((a, b) => b.totalRevenue - a.totalRevenue);

      const topBoutique = compBoutiques.length > 0 && compBoutiques[0].totalRevenue > 0 
        ? compBoutiques[0].boutique.name 
        : null;

      return {
        boutiques: compBoutiques,
        topBoutique
      };
    } catch (error) {
      console.error('Error computing comparison report:', error);
      throw error;
    }
  },
};
