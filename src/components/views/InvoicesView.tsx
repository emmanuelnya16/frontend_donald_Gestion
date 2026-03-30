/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Calendar, 
  Download, 
  Eye,
  Filter,
  X,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Sale, Product, Boutique } from '../../types';
import { saleService } from '../../services/saleService';
import { productService } from '../../services/productService';
import { boutiqueService } from '../../services/boutiqueService';
import InvoiceModal from '../InvoiceModal';

interface InvoicesViewProps {
  user: User;
}

export default function InvoicesView({ user }: InvoicesViewProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allSales, allProducts, allBoutiques] = await Promise.all([
        saleService.getAll(),
        productService.getAll(),
        boutiqueService.getBoutiques()
      ]);

      const boutiqueSales = user.role === 'ROLE_ADMIN' 
        ? allSales 
        : allSales.filter(s => s.boutique?.id === user.boutiqueId);
      
      setSales(boutiqueSales.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      setProducts(allProducts);
      setBoutiques(allBoutiques);
    } catch (err) {
      console.error('Error loading invoices data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const filteredSales = sales.filter(s => {
    const matchesSearch = (s.invoiceNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (s.items || []).some(item => item.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDate = !dateFilter || s.timestamp.startsWith(dateFilter);
    return matchesSearch && matchesDate;
  });

  const handleViewInvoice = (sale: Sale) => {
    setSelectedSale(sale);
    setShowInvoice(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col">
          <h2 className="text-2xl font-bold text-brand-dark tracking-tight">Facturation</h2>
          <p className="text-sm text-slate-500 mt-1">Historique des factures et export PDF</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              className="input-field pl-12 py-3"
              placeholder="N° Facture ou Article..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="date" 
              className="input-field pl-12 py-3 w-auto"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
          {dateFilter && (
            <button 
              onClick={() => setDateFilter('')}
              className="p-3 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
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
                <th className="px-8 py-6">N° Facture</th>
                <th className="px-8 py-6">Date</th>
                <th className="px-8 py-6">Articles</th>
                <th className="px-8 py-6">Boutique</th>
                <th className="px-8 py-6">Total</th>
                <th className="px-8 py-6 text-center">Statut</th>
                <th className="px-8 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredSales.map((s) => {
                return (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-6">
                      <span className="font-black text-brand-blue">{s.invoiceNumber}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-medium text-slate-600">
                        {new Date(s.timestamp).toLocaleDateString('fr-FR')}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1">
                        {(s.items || []).map((item, idx) => (
                          <div key={idx} className="flex flex-col">
                            <span className="font-bold text-brand-dark">{item.product?.name || 'Produit inconnu'}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                              {item.quantity} x {(item.unitPrice || 0).toLocaleString()} FCFA
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-medium text-slate-600">
                        {(s.boutique?.name || '').split(' - ')[0]}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="font-black text-brand-dark">
                        {(s.totalPrice || 0).toLocaleString()} FCFA
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex justify-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          s.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : 
                          s.status === 'CANCELLED' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {s.status === 'COMPLETED' ? 'Payée' : s.status === 'CANCELLED' ? 'Annulée' : 'Retournée'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleViewInvoice(s)}
                          className="p-2 text-slate-400 hover:text-brand-blue hover:bg-white rounded-lg transition-all"
                          title="Voir la facture"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleViewInvoice(s)}
                          className="p-2 text-slate-400 hover:text-brand-blue hover:bg-white rounded-lg transition-all"
                          title="Télécharger PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center text-slate-400 italic">
                    Aucune facture trouvée
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>

      <InvoiceModal 
        sale={selectedSale}
        isOpen={showInvoice}
        onClose={() => setShowInvoice(false)}
      />
    </div>
  );
}
