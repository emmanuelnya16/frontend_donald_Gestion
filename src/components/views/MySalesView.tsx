/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Calendar,
  Clock,
  Eye,
  Filter,
  RefreshCw,
  FileText,
  TrendingUp,
  CheckCircle2,
  Search,
  X,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Sale } from '../../types';
import { saleService } from '../../services/saleService';
import InvoiceModal from '../InvoiceModal';

interface MySalesViewProps {
  user: User;
}

type PeriodFilter = 'today' | 'week' | 'month' | 'all';

export default function MySalesView({ user }: MySalesViewProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);

  // Récupère l'ID de la boutique connectée
  const boutiqueId = user.boutique?.id || user.boutiqueId || '';

  const fetchSales = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[MySalesView] Fetching sales for user:', { role: user.role, boutiqueId, userBoutique: user.boutique, userBoutiqueId: user.boutiqueId });
      
      // On passe le boutiqueId explicitement pour récupérer les ventes de la boutique
      const allSales = await saleService.getAll(boutiqueId);
      
      console.log('[MySalesView] Sales received:', allSales.length, 'sales');
      if (allSales.length > 0) {
        console.log('[MySalesView] First sale sample:', JSON.stringify(allSales[0], null, 2));
      }
      
      allSales.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setSales(allSales);
    } catch (err: any) {
      console.error('[MySalesView] Error fetching sales:', err);
      console.error('[MySalesView] Error response:', err?.response?.status, err?.response?.data);
      setError(err?.response?.data?.message || err?.message || 'Erreur lors du chargement des ventes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSales();
    }
  }, [user]);

  // Filter sales by period
  const getFilteredSales = (): Sale[] => {
    const now = new Date();
    let periodFiltered = sales;

    if (periodFilter === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      periodFiltered = sales.filter(s => s.timestamp.startsWith(todayStr));
    } else if (periodFilter === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
      startOfWeek.setHours(0, 0, 0, 0);
      periodFiltered = sales.filter(s => new Date(s.timestamp) >= startOfWeek);
    } else if (periodFilter === 'month') {
      const monthStr = now.toISOString().slice(0, 7);
      periodFiltered = sales.filter(s => s.timestamp.startsWith(monthStr));
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      periodFiltered = periodFiltered.filter(s =>
        (s.invoiceNumber || '').toLowerCase().includes(query) ||
        (s.items || []).some(item => item.product?.name?.toLowerCase().includes(query))
      );
    }

    return periodFiltered;
  };

  const filteredSales = getFilteredSales();
  const completedSales = filteredSales.filter(s => s.status === 'COMPLETED');
  const totalRevenue = completedSales.reduce((acc, s) => acc + Number(s.totalPrice), 0);
  const totalTransactions = completedSales.length;

  const periodLabels: Record<PeriodFilter, string> = {
    today: "Aujourd'hui",
    week: 'Cette semaine',
    month: 'Ce mois',
    all: 'Tout'
  };

  const handleViewInvoice = (sale: Sale) => {
    setSelectedSale(sale);
    setShowInvoice(true);
  };

  if (loading && sales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <RefreshCw className="w-12 h-12 text-brand-blue animate-spin" />
        <p className="text-slate-500 font-medium">Chargement de vos ventes...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-brand-dark uppercase tracking-tight">Mes Ventes</h2>
          <p className="text-sm text-slate-500 font-medium">Historique de vos ventes et transactions</p>
        </div>
        <button
          onClick={fetchSales}
          className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 transition-colors shadow-sm self-start"
          title="Actualiser"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button 
            onClick={fetchSales}
            className="px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Period Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100 gap-1 flex-wrap">
          {(['today', 'week', 'month', 'all'] as PeriodFilter[]).map((period) => (
            <button
              key={period}
              onClick={() => setPeriodFilter(period)}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                periodFilter === period
                  ? 'bg-brand-blue text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-50'
              }`}
            >
              {periodLabels[period]}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            className="input-field pl-11 py-2.5 text-sm"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-lg"
            >
              <X className="w-3 h-3 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="card border-none shadow-md flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chiffre d'Affaires</p>
            <p className="text-xl font-black text-brand-dark">{totalRevenue.toLocaleString()} FCFA</p>
          </div>
        </div>
        <div className="card border-none shadow-md flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-xl">
            <CheckCircle2 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transactions</p>
            <p className="text-xl font-black text-brand-dark">{totalTransactions}</p>
          </div>
        </div>
        <div className="card border-none shadow-md flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl">
            <ShoppingCart className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total ventes</p>
            <p className="text-xl font-black text-brand-dark">{filteredSales.length}</p>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="card border-none shadow-xl overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-5 h-5 text-brand-blue" />
            <h3 className="text-lg font-bold text-brand-dark">
              Ventes — {periodLabels[periodFilter]}
            </h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-200">
            {filteredSales.length} vente{filteredSales.length > 1 ? 's' : ''}
          </span>
        </div>

        {filteredSales.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <ShoppingCart className="w-16 h-16 text-slate-200 mb-4" />
            <p className="text-lg font-bold text-slate-500">Aucune vente trouvée</p>
            <p className="text-sm text-slate-400 mt-1">
              {periodFilter === 'today' ? "Aucune vente enregistrée aujourd'hui" :
               periodFilter === 'week' ? "Aucune vente cette semaine" :
               periodFilter === 'month' ? "Aucune vente ce mois" :
               "Aucune vente enregistrée"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto whitespace-nowrap">
            <table className="w-full min-w-max">
              <thead>
                <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="px-6 py-5">N° Facture</th>
                  <th className="px-6 py-5">Date & Heure</th>
                  <th className="px-6 py-5">Articles</th>
                  <th className="px-6 py-5">Montant</th>
                  <th className="px-6 py-5 text-center">Statut</th>
                  <th className="px-6 py-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredSales.map((sale, index) => (
                  <motion.tr
                    key={sale.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(index * 0.03, 0.5) }}
                    className="hover:bg-slate-50 transition-colors group"
                  >
                    <td className="px-6 py-5">
                      <span className="font-mono font-black text-brand-blue">#{sale.invoiceNumber}</span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-sm font-medium text-slate-600">
                          {new Date(sale.timestamp).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-0.5">
                        {(sale.items || []).slice(0, 2).map((item, idx) => (
                          <span key={idx} className="text-sm font-medium text-slate-700">
                            {item.product?.name || 'Produit'} <span className="text-slate-400">x{item.quantity}</span>
                          </span>
                        ))}
                        {(sale.items || []).length > 2 && (
                          <span className="text-[10px] text-slate-400 font-bold">
                            +{(sale.items || []).length - 2} autre{(sale.items || []).length - 2 > 1 ? 's' : ''}
                          </span>
                        )}
                        {(!sale.items || sale.items.length === 0) && (
                          <span className="text-sm text-slate-400">{sale.itemsCount || 0} article{(sale.itemsCount || 0) > 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="font-black text-brand-dark">{Number(sale.totalPrice).toLocaleString()} FCFA</span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        sale.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' :
                        sale.status === 'CANCELLED' ? 'bg-red-50 text-red-600' :
                        'bg-amber-50 text-amber-600'
                      }`}>
                        {sale.status === 'COMPLETED' ? 'Terminée' :
                         sale.status === 'CANCELLED' ? 'Annulée' :
                         'Retournée'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button
                        onClick={() => handleViewInvoice(sale)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue/10 text-brand-blue hover:bg-brand-blue hover:text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                      >
                        <Eye className="w-4 h-4" />
                        Voir
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Modal */}
      <InvoiceModal
        sale={selectedSale}
        isOpen={showInvoice}
        onClose={() => setShowInvoice(false)}
      />
    </div>
  );
}
