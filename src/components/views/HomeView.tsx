/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Package, 
  ArrowLeftRight, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  ChevronRight,
  Store,
  RefreshCw
} from 'lucide-react';
import { User, Sale, StockItem, Boutique } from '../../types';
import { saleService } from '../../services/saleService';
import { stockService } from '../../services/stockService';
import { boutiqueService } from '../../services/boutiqueService';
import InvoiceModal from '../InvoiceModal';

interface HomeViewProps {
  user: User;
  onNavigate: (tab: string) => void;
}

export default function HomeView({ user, onNavigate }: HomeViewProps) {
  const [stats, setStats] = useState({
    totalSales: 0,
    transactionCount: 0,
    lowStockCount: 0,
    transferCount: 0,
  });
  const [sales, setSales] = useState<Sale[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [allSales, allStock, allBoutiques] = await Promise.all([
        saleService.getAll(),
        stockService.getAll(),
        boutiqueService.getBoutiques()
      ]);
      
      setBoutiques(allBoutiques);

      const filteredSales = user.role === 'ROLE_ADMIN' 
        ? allSales 
        : allSales.filter(s => s.boutique.id === user.boutiqueId);
      
      setSales(filteredSales);

      const filteredStock = user.role === 'ROLE_ADMIN'
        ? allStock
        : allStock.filter(s => s.boutique.id === user.boutiqueId);

      const today = new Date().toISOString().split('T')[0];
      const todaySales = filteredSales.filter(s => s.timestamp.startsWith(today) && s.status === 'COMPLETED');

      setStats({
        totalSales: todaySales.reduce((acc, s) => acc + Number(s.totalPrice), 0),
        transactionCount: todaySales.length,
        lowStockCount: filteredStock.filter(s => s.isLowStock).length,
        transferCount: filteredSales.filter(s => s.timestamp.startsWith(today) && (s.items?.some(i => i.isTransfer) || false)).length,
      });

      setRecentSales(filteredSales.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5));
    } catch (err) {
      console.error('Error fetching home stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const getBoutiqueSales = (boutiqueId: string) => {
    const today = new Date().toISOString().split('T')[0];
    return sales
      .filter(s => s.boutique.id === boutiqueId && s.timestamp.startsWith(today) && s.status === 'COMPLETED')
      .reduce((acc, s) => acc + Number(s.totalPrice), 0);
  };

  const statCards = [
    { label: 'Ventes du jour', value: `${stats.totalSales.toLocaleString()} FCFA`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Transactions', value: stats.transactionCount, icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Alertes Stock', value: stats.lowStockCount, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Navettes', value: stats.transferCount, icon: ArrowLeftRight, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  if (loading && stats.totalSales === 0 && boutiques.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <RefreshCw className="w-12 h-12 text-brand-blue animate-spin" />
        <p className="text-slate-500 font-medium">Chargement du tableau de bord...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => (
          <div key={i} className="card flex items-center gap-4 border-none shadow-md hover:shadow-lg transition-shadow">
            <div className={`p-4 rounded-2xl ${card.bg}`}>
              <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{card.label}</p>
              <p className="text-2xl font-bold text-brand-dark">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {user.role === 'ROLE_ADMIN' && (
        <div className="card border-none shadow-md">
          <h3 className="text-lg font-bold text-brand-dark mb-6 flex items-center gap-2">
            <Store className="w-5 h-5 text-brand-blue" />
            Performance par Boutique (Aujourd'hui)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {boutiques.map(b => {
              const boutiqueSales = getBoutiqueSales(b.id);
              const percentage = stats.totalSales > 0 ? (boutiqueSales / stats.totalSales) * 100 : 0;
              return (
                <div key={b.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-slate-700 text-sm">{b.name.split(' - ')[0]}</p>
                    <span className="text-[10px] font-black text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded-full">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-lg font-black text-brand-dark">{boutiqueSales.toLocaleString()} FCFA</p>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div 
                      className="bg-brand-blue h-full transition-all duration-1000" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Sales */}
        <div className="lg:col-span-2 card border-none shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-brand-dark flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand-blue" />
              Ventes Récentes
            </h3>
            <button className="text-sm font-semibold text-brand-blue hover:underline flex items-center gap-1">
              Voir tout <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto whitespace-nowrap">
            <table className="w-full min-w-max">
              <thead>
                <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="pb-4">Facture</th>
                  <th className="pb-4">Boutique</th>
                  <th className="pb-4">Montant</th>
                  <th className="pb-4">Statut</th>
                  <th className="pb-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentSales.map((sale) => (
                  <tr 
                    key={sale.id} 
                    className="text-sm hover:bg-slate-50 cursor-pointer transition-colors group"
                    onClick={() => {
                      setSelectedSale(sale);
                      setShowInvoice(true);
                    }}
                  >
                    <td className="py-4 font-mono font-semibold text-brand-blue group-hover:underline">#{sale.invoiceNumber}</td>
                    <td className="py-4 text-slate-600 font-medium">
                      {sale.boutique.name.split(' - ')[0]}
                    </td>
                    <td className="py-4 font-bold text-brand-dark">{sale.totalPrice.toLocaleString()} FCFA</td>
                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        sale.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : 
                        sale.status === 'RETURNED' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {sale.status}
                      </span>
                    </td>
                    <td className="py-4 text-slate-500">
                      {new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
                {recentSales.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 italic">Aucune vente enregistrée aujourd'hui</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions / Alerts */}
        <div className="space-y-6">
          <div className="card border-none shadow-md bg-brand-blue text-white">
            <h3 className="text-lg font-bold mb-4">Actions Rapides</h3>
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => onNavigate('sales')}
                className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 rounded-xl text-left font-semibold transition-colors flex items-center justify-between"
              >
                Nouvelle Vente <ChevronRight className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onNavigate('reports')}
                className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 rounded-xl text-left font-semibold transition-colors flex items-center justify-between"
              >
                Rapport Journalier <ChevronRight className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onNavigate('stock')}
                className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 rounded-xl text-left font-semibold transition-colors flex items-center justify-between"
              >
                Vérifier Stock <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="card border-none shadow-md">
            <h3 className="text-lg font-bold text-brand-dark mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Alertes Stock
            </h3>
            <div className="space-y-4">
              {stats.lowStockCount > 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                  <p className="text-amber-800 font-bold text-sm">Attention !</p>
                  <p className="text-amber-700 text-xs mt-1">
                    {stats.lowStockCount} articles sont en dessous du seuil critique.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <p className="text-emerald-800 font-bold text-sm">Tout est en ordre</p>
                  <p className="text-emerald-700 text-xs mt-1">Le stock est suffisant pour tous les articles.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <InvoiceModal 
        sale={selectedSale} 
        isOpen={showInvoice} 
        onClose={() => setShowInvoice(false)} 
      />
    </div>
  );
}
