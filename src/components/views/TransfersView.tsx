/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  ArrowLeftRight, 
  Search, 
  ArrowRight, 
  Calendar, 
  Store, 
  Package, 
  Clock,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { User, Transfer, Product, Boutique } from '../../types';
import { transferService } from '../../services/transferService';
import { productService } from '../../services/productService';
import { boutiqueService } from '../../services/boutiqueService';

interface TransfersViewProps {
  user: User;
}

export default function TransfersView({ user }: TransfersViewProps) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBoutique, setSelectedBoutique] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allTransfers, allProducts, allBoutiques] = await Promise.all([
        transferService.getAll(),
        productService.getAll(),
        boutiqueService.getBoutiques()
      ]);

      setProducts(allProducts);
      setBoutiques(allBoutiques);

      const filtered = user.role === 'ROLE_ADMIN'
        ? allTransfers
        : allTransfers.filter(t => t.sourceBoutique.id === user.boutiqueId || t.destBoutique.id === user.boutiqueId);

      setTransfers(filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch (err) {
      console.error('Error loading transfers data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const filteredTransfers = transfers.filter(t => {
    const matchesSearch = t.product.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesBoutique = selectedBoutique === 'ALL' || 
                           t.sourceBoutique.id === selectedBoutique || 
                           t.destBoutique.id === selectedBoutique;
    
    const matchesDate = !dateFilter || t.timestamp.startsWith(dateFilter);

    return matchesSearch && matchesBoutique && matchesDate;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col">
          <h2 className="text-2xl font-bold text-brand-dark tracking-tight">Historique des Transferts</h2>
          <p className="text-sm text-slate-500 mt-1">Traçabilité des mouvements inter-boutiques</p>
        </div>

        <div className="relative flex-1 md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            className="input-field pl-12 py-3"
            placeholder="Rechercher un transfert..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
          <Store className="w-4 h-4 text-slate-400" />
          <select 
            className="bg-transparent text-sm font-bold text-slate-600 outline-none"
            value={selectedBoutique}
            onChange={(e) => setSelectedBoutique(e.target.value)}
          >
            <option value="ALL">Toutes les boutiques</option>
            {boutiques.map(b => (
              <option key={b.id} value={b.id}>{b.name.split(' - ')[0]}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input 
            type="date" 
            className="bg-transparent text-sm font-bold text-slate-600 outline-none"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>

        {(selectedBoutique !== 'ALL' || dateFilter) && (
          <button 
            onClick={() => { setSelectedBoutique('ALL'); setDateFilter(''); }}
            className="text-xs font-black text-brand-blue uppercase tracking-widest hover:underline"
          >
            Réinitialiser
          </button>
        )}
      </div>

      <div className="card border-none shadow-xl overflow-hidden">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-brand-blue" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-8 py-6">Article</th>
                <th className="px-8 py-6">Quantité</th>
                <th className="px-8 py-6">Mouvement</th>
                <th className="px-8 py-6">Date & Heure</th>
                <th className="px-8 py-6">Motif</th>
                <th className="px-8 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTransfers.map((t) => {
                return (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 group-hover:bg-white transition-colors">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-brand-dark">{t.product.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-lg font-black text-brand-blue">x{t.quantity}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Source</span>
                          <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg">{t.sourceBoutique.name.split(' - ')[0]}</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 mt-4" />
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Destination</span>
                          <span className="px-3 py-1 bg-brand-blue text-white text-xs font-bold rounded-lg">{t.destBoutique.name.split(' - ')[0]}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-sm font-bold text-brand-dark">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {new Date(t.timestamp).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                          <Clock className="w-4 h-4" />
                          {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs text-slate-500 font-medium italic">{t.reason}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button className="p-2 text-slate-400 hover:text-brand-blue hover:bg-white rounded-lg transition-all">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredTransfers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-slate-400 italic">
                    Aucun transfert enregistré
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
}
