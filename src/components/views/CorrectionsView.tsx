/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  RotateCcw, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  MessageSquare,
  ArrowLeftRight,
  Package,
  Store,
  Clock,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Sale, Product, Boutique } from '../../types';
import { saleService } from '../../services/saleService';
import { productService } from '../../services/productService';
import { boutiqueService } from '../../services/boutiqueService';

interface CorrectionsViewProps {
  user: User;
}

export default function CorrectionsView({ user }: CorrectionsViewProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionType, setCorrectionType] = useState<'RETURN' | 'CANCEL'>('RETURN');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allSales, allProducts, allBoutiques] = await Promise.all([
        saleService.getAll(),
        productService.getAll(),
        boutiqueService.getBoutiques()
      ]);
      setSales(allSales.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      setProducts(allProducts);
      setBoutiques(allBoutiques);
    } catch (err) {
      console.error('Error loading corrections data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCorrection = async () => {
    if (!selectedSale || !correctionReason) return;
    setSubmitting(true);
    try {
      if (correctionType === 'RETURN') {
        await saleService.recordReturn(selectedSale.id, correctionReason);
      } else {
        await saleService.cancel(selectedSale.id, correctionReason);
      }
      await loadData();
      setSelectedSale(null);
      setCorrectionReason('');
    } catch (err: any) {
      console.error('Error correcting sale:', err);
      alert(err.response?.data?.message || 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSales = sales.filter(s => 
    s.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.items.some(item => item.product.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col">
          <h2 className="text-2xl font-bold text-brand-dark tracking-tight">Retours & Corrections</h2>
          <p className="text-sm text-slate-500 mt-1">Gestion des erreurs et retours produits (Admin uniquement)</p>
        </div>

        <div className="relative flex-1 md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            className="input-field pl-12 py-3 w-full"
            placeholder="Rechercher une facture..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="card border-none shadow-xl overflow-hidden">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-brand-blue" />
          </div>
        ) : (
          <div className="overflow-x-auto whitespace-nowrap">
            <table className="w-full min-w-max">
            <thead>
              <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-8 py-6">Facture</th>
                <th className="px-8 py-6">Articles</th>
                <th className="px-8 py-6">Boutique</th>
                <th className="px-8 py-6">Montant</th>
                <th className="px-8 py-6">Statut</th>
                <th className="px-8 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredSales.map((sale) => {
                return (
                  <tr key={sale.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-6">
                      <span className="font-mono font-bold text-brand-blue">#{sale.invoiceNumber}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1">
                        {sale.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-brand-blue group-hover:bg-white transition-colors">
                              <Package className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-brand-dark">{item.product.name}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">x{item.quantity}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm text-slate-600 font-medium">{sale.boutique.name.split(' - ')[0]}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="font-black text-brand-dark">{sale.totalPrice.toLocaleString()} FCFA</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        sale.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                        sale.status === 'RETURNED' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-red-50 text-red-600 border-red-100'
                      }`}>
                        {sale.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      {sale.status === 'COMPLETED' && (
                        <button 
                          onClick={() => setSelectedSale(sale)}
                          className="px-4 py-2 bg-brand-blue text-white text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-brand-accent transition-all shadow-md shadow-brand-blue/10"
                        >
                          Corriger
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-slate-400 italic">
                    Aucune vente trouvée
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Correction Modal */}
      <AnimatePresence>
        {selectedSale && (
          <motion.div 
            key="correction-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/60 backdrop-blur-sm"
          >
            <motion.div 
              key="correction-modal-content"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 bg-brand-blue text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <RotateCcw className="w-6 h-6" />
                  <h3 className="text-xl font-bold">Corriger la Vente</h3>
                </div>
                <button onClick={() => setSelectedSale(null)} className="p-2 hover:bg-white/10 rounded-lg">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-4">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Facture #{selectedSale.invoiceNumber}</p>
                  {selectedSale.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-brand-blue shadow-sm">
                        <Package className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-brand-dark">{item.product.name}</p>
                        <p className="text-sm font-black text-brand-blue">{item.totalPrice.toLocaleString()} FCFA (x{item.quantity})</p>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-slate-200">
                    <p className="text-right font-black text-brand-dark">Total: {selectedSale.totalPrice.toLocaleString()} FCFA</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setCorrectionType('RETURN')}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                      correctionType === 'RETURN' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-100 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <RotateCcw className="w-6 h-6" />
                    <span className="text-xs font-bold uppercase tracking-widest">Retour Produit</span>
                  </button>
                  <button 
                    onClick={() => setCorrectionType('CANCEL')}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                      correctionType === 'CANCEL' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-100 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <X className="w-6 h-6" />
                    <span className="text-xs font-bold uppercase tracking-widest">Annulation Vente</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Motif de la correction</label>
                  <textarea 
                    className="input-field min-h-[100px] resize-none"
                    placeholder="Expliquez la raison de cette correction..."
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                  ></textarea>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 font-medium leading-relaxed">
                    Cette action est irréversible. Le stock de la boutique source sera automatiquement réajusté (+{selectedSale.items.reduce((acc, i) => acc + i.quantity, 0)} unités).
                  </p>
                </div>

                <button 
                  onClick={handleCorrection}
                  disabled={!correctionReason || submitting}
                  className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-3 shadow-lg shadow-brand-blue/20 disabled:opacity-50"
                >
                  {submitting ? (
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6" />
                  )}
                  {submitting ? 'Traitement...' : 'Confirmer la Correction'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
