/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  AlertTriangle, 
  Search, 
  Filter, 
  ArrowUpDown, 
  ChevronRight,
  Plus,
  Minus,
  Store,
  X,
  Edit2,
  Check,
  XCircle,
  History,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  RefreshCw
} from 'lucide-react';
import { User, Product, StockItem, Boutique, StockMovement } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { stockService } from '../../services/stockService';
import { productService } from '../../services/productService';
import { boutiqueService } from '../../services/boutiqueService';
import SmartSearch from '../SmartSearch';

interface StockViewProps {
  user: User;
}

export default function StockView({ user }: StockViewProps) {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');
  const [activeTab, setActiveTab] = useState<'STOCK' | 'MOVEMENTS'>('STOCK');
  const [selectedBoutique, setSelectedBoutique] = useState(user.role === 'ROLE_ADMIN' ? 'ALL' : user.boutiqueId);
  const [editingStock, setEditingStock] = useState<{ productId: string, boutiqueId: string, quantity: number, localPrice?: number } | null>(null);
  const [isProposeModalOpen, setIsProposeModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [selectedProductForStock, setSelectedProductForStock] = useState<Product | null>(null);
  const [stockFormData, setStockFormData] = useState({
    quantity: 0,
    localPrice: 0,
    lowStockThreshold: 5
  });
  const [proposalData, setProposalData] = useState({ name: '', category: '', basePrice: 0, description: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Catalog Modal State
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  useEffect(() => {
    if (isCatalogModalOpen) {
      const fetchCatalog = async () => {
        setCatalogLoading(true);
        try {
          const productsData = await productService.getAll();
          setCatalogProducts(productsData);
        } catch (err) {
          console.error('Error fetching catalog products:', err);
        } finally {
          setCatalogLoading(false);
        }
      };
      fetchCatalog();
    }
  }, [isCatalogModalOpen]);

  const filteredCatalogProducts = catalogProducts.filter(p => 
    p.name.toLowerCase().includes(catalogSearchQuery.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(catalogSearchQuery.toLowerCase())
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      const [stockData, productsData, boutiquesData, movementsData] = await Promise.all([
        user.role === 'ROLE_ADMIN' && selectedBoutique !== 'ALL' 
          ? stockService.getByBoutique(selectedBoutique!) 
          : stockService.getAll(),
        productService.getAll(),
        boutiqueService.getBoutiques(),
        stockService.getMovements(user.role === 'ROLE_BOUTIQUE' ? user.boutiqueId : (selectedBoutique === 'ALL' ? undefined : selectedBoutique))
      ]);
      setStock(stockData);
      setProducts(productsData);
      setBoutiques(boutiquesData);
      setMovements(movementsData);
      setError(null);
    } catch (err) {
      console.error('Error fetching stock data:', err);
      setError('Erreur lors du chargement des stocks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedBoutique, activeTab]);

  const handleAddToBoutique = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForStock) return;

    try {
      setLoading(true);
      await stockService.add({
        productId: selectedProductForStock.id,
        quantity: stockFormData.quantity,
        localPrice: stockFormData.localPrice,
        lowStockThreshold: stockFormData.lowStockThreshold,
        boutiqueId: user.role === 'ROLE_ADMIN' ? (selectedBoutique === 'ALL' ? undefined : selectedBoutique) : undefined
      });
      await fetchData();
      setIsCatalogModalOpen(false);
      setSelectedProductForStock(null);
      setStockFormData({ quantity: 0, localPrice: 0, lowStockThreshold: 5 });
    } catch (err: any) {
      console.error('Error adding to stock:', err);
      const message = err.response?.data?.message || err.response?.data?.detail || 'Erreur lors de l\'ajout au stock.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async (stockId: string, newQuantity: number, localPrice?: number) => {
    try {
      setLoading(true);
      const stockItem = stock.find(s => s.id === stockId);
      if (!stockItem) return;

      const promises = [];
      if (newQuantity !== stockItem.quantity) {
        // For adjustment, we need a note. Let's use a default one or prompt.
        const note = prompt('Raison de l\'ajustement :', 'Correction manuelle');
        if (note === null) {
          setLoading(false);
          return;
        }
        promises.push(stockService.adjust(stockId, newQuantity, note));
      }
      if (localPrice !== undefined && localPrice !== stockItem.localPrice) {
        promises.push(stockService.updatePrice(stockId, localPrice));
      }

      await Promise.all(promises);
      await fetchData();
      setEditingStock(null);
    } catch (err) {
      console.error('Error updating stock:', err);
      setError('Erreur lors de la mise à jour du stock.');
    } finally {
      setLoading(false);
    }
  };

  const handlePropose = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await productService.create(proposalData);
      await fetchData();
      setIsProposeModalOpen(false);
      setProposalData({ name: '', category: '', basePrice: 0, description: '' });
      alert('Votre proposition d\'article a été envoyée à l\'administrateur pour validation.');
    } catch (err: any) {
      console.error('Error proposing product:', err);
      const message = err.response?.data?.message || err.response?.data?.detail || 'Erreur lors de la proposition du produit.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const filteredStock = stock.filter(s => {
    const matchesSearch = s.product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (s.product.category?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    
    const matchesBoutique = selectedBoutique === 'ALL' || s.boutique.id === selectedBoutique;
    
    const matchesFilter = filter === 'ALL' || 
                         (filter === 'LOW' && s.isLowStock && !s.isOutOfStock) ||
                         (filter === 'OUT' && s.isOutOfStock);

    return matchesSearch && matchesBoutique && matchesFilter;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col">
          <h2 className="text-2xl font-bold text-brand-dark tracking-tight">Gestion du Stock</h2>
          <p className="text-sm text-slate-500 mt-1">Suivi en temps réel et alertes critiques</p>
        </div>

        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
          <button 
            onClick={() => setActiveTab('STOCK')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${
              activeTab === 'STOCK' ? 'bg-brand-blue text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Package className="w-4 h-4" /> Stock Actuel
          </button>
          <button 
            onClick={() => setActiveTab('MOVEMENTS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${
              activeTab === 'MOVEMENTS' ? 'bg-brand-blue text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <History className="w-4 h-4" /> Mouvements
          </button>
        </div>
      </div>

      {activeTab === 'STOCK' ? (
        <>
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text" 
                  className="input-field pl-12 py-3"
                  placeholder="Rechercher un article..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
          {user.role === 'ROLE_ADMIN' && (
            <select 
              className="input-field py-3 w-auto font-semibold"
              value={selectedBoutique}
              onChange={(e) => setSelectedBoutique(e.target.value)}
            >
              <option value="ALL">Toutes les boutiques</option>
              {boutiques.map(b => (
                <option key={b.id} value={b.id}>{b.name.split(' - ')[0]}</option>
              ))}
            </select>
          )}
          <div className="flex gap-2">
            <button 
              onClick={() => setIsCatalogModalOpen(true)}
              className="btn-primary bg-slate-800 hover:bg-slate-900 flex items-center gap-2"
            >
              <Package className="w-5 h-5" /> Ajouter du catalogue
            </button>
            {user.role === 'ROLE_BOUTIQUE' && (
              <button 
                onClick={() => setIsProposeModalOpen(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-5 h-5" /> Proposer un article
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 overflow-x-auto pb-2">
        <button 
          onClick={() => setFilter('ALL')}
          className={`px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all duration-200 ${
            filter === 'ALL' ? 'bg-brand-blue text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-50'
          }`}
        >
          Tous les articles
        </button>
        <button 
          onClick={() => setFilter('LOW')}
          className={`px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all duration-200 flex items-center gap-2 ${
            filter === 'LOW' ? 'bg-amber-500 text-white shadow-lg' : 'bg-white text-amber-600 hover:bg-amber-50'
          }`}
        >
          <AlertTriangle className="w-4 h-4" /> Stock Faible
        </button>
        <button 
          onClick={() => setFilter('OUT')}
          className={`px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all duration-200 flex items-center gap-2 ${
            filter === 'OUT' ? 'bg-red-500 text-white shadow-lg' : 'bg-white text-red-600 hover:bg-red-50'
          }`}
        >
          <X className="w-4 h-4" /> Rupture
        </button>
      </div>

      {/* Stock Table */}
      <div className="card border-none shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-8 py-6">Article</th>
                <th className="px-8 py-6">Catégorie</th>
                {selectedBoutique === 'ALL' && <th className="px-8 py-6">Boutique</th>}
                <th className="px-8 py-6">Prix Local</th>
                <th className="px-8 py-6">Quantité</th>
                <th className="px-8 py-6 text-center">Statut</th>
                <th className="px-8 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredStock.map((s) => {
                return (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-brand-blue group-hover:bg-white transition-colors">
                          <Package className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-brand-dark">{s.product.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{s.product.category}</span>
                    </td>
                    {selectedBoutique === 'ALL' && (
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-slate-600 font-medium">
                          <Store className="w-4 h-4" />
                          {s.boutique.name.split(' - ')[0]}
                        </div>
                      </td>
                    )}
                    <td className="px-8 py-6">
                      {editingStock?.productId === s.product.id && editingStock?.boutiqueId === s.boutique.id ? (
                        <input 
                          type="number" 
                          className="w-24 px-2 py-1 border-2 border-brand-blue rounded-lg font-black text-brand-blue outline-none"
                          value={editingStock.localPrice || ''}
                          onChange={(e) => setEditingStock({ ...editingStock, localPrice: parseInt(e.target.value) || 0 })}
                        />
                      ) : (
                        <span className="font-bold text-slate-600">
                          {s.effectivePrice.toLocaleString()} FCFA
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      {editingStock?.productId === s.product.id && editingStock?.boutiqueId === s.boutique.id ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            className="w-20 px-2 py-1 border-2 border-brand-blue rounded-lg font-black text-brand-blue outline-none"
                            value={editingStock.quantity || ''}
                            onChange={(e) => setEditingStock({ ...editingStock, quantity: parseInt(e.target.value) || 0 })}
                            autoFocus
                          />
                          <button 
                            onClick={() => handleUpdateStock(s.id, editingStock.quantity, editingStock.localPrice)}
                            className="p-1.5 bg-brand-blue text-white rounded-lg hover:bg-brand-dark transition-colors"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setEditingStock(null)}
                            className="p-1.5 bg-slate-100 text-slate-400 rounded-lg hover:bg-slate-200 transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className={`text-lg font-black ${s.isOutOfStock ? 'text-red-600' : s.isLowStock ? 'text-amber-600' : 'text-brand-blue'}`}>
                          {s.quantity}
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex justify-center">
                        {s.isOutOfStock ? (
                          <span className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-red-100">Rupture</span>
                        ) : s.isLowStock ? (
                          <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-100">Stock Faible</span>
                        ) : (
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100">Optimal</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      {user.role === 'ROLE_ADMIN' && (
                        <button 
                          onClick={() => setEditingStock({ productId: s.product.id, boutiqueId: s.boutique.id, quantity: s.quantity, localPrice: s.localPrice || undefined })}
                          className="p-2 text-slate-400 hover:text-brand-blue hover:bg-white rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      <button className="p-2 text-slate-400 hover:text-brand-blue hover:bg-white rounded-lg transition-all ml-2">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredStock.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-slate-400 italic">
                    Aucun article ne correspond à votre recherche
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      ) : (
        <div className="card border-none shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="px-8 py-6">Date</th>
                  <th className="px-8 py-6">Article</th>
                  <th className="px-8 py-6">Boutique</th>
                  <th className="px-8 py-6">Type</th>
                  <th className="px-8 py-6">Quantité</th>
                  <th className="px-8 py-6">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {movements
                  .filter(m => user.role === 'ROLE_ADMIN' || m.boutique.id === user.boutiqueId)
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((m) => {
                    return (
                      <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-6">
                          <span className="text-sm font-medium text-slate-600">
                            {new Date(m.timestamp).toLocaleString('fr-FR')}
                          </span>
                        </td>
                        <td className="px-8 py-6 font-bold text-brand-dark">{m.product.name}</td>
                        <td className="px-8 py-6 text-slate-600">{m.boutique.name.split(' - ')[0]}</td>
                        <td className="px-8 py-6">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 w-fit ${
                            m.type === 'IN' || m.type === 'TRANSFER_IN' ? 'bg-emerald-50 text-emerald-600' : 
                            m.type === 'OUT' || m.type === 'TRANSFER_OUT' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-600'
                          }`}>
                            {m.type === 'IN' || m.type === 'TRANSFER_IN' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {m.type}
                          </span>
                        </td>
                        <td className="px-8 py-6 font-black text-brand-dark">{m.quantity}</td>
                        <td className="px-8 py-6 text-sm text-slate-500">{m.note}</td>
                      </tr>
                    );
                  })}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center text-slate-400 italic">
                      Aucun mouvement de stock enregistré
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Catalog Modal */}
      <AnimatePresence>
        {isCatalogModalOpen && (
          <motion.div 
            key="catalog-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/60 backdrop-blur-sm"
          >
            <motion.div 
              key="catalog-modal-content"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 bg-slate-800 text-white flex items-center justify-between">
                <h3 className="text-xl font-bold">Ajouter un Article au Stock</h3>
                <button 
                  onClick={() => {
                    setIsCatalogModalOpen(false);
                    setSelectedProductForStock(null);
                  }} 
                  className="p-2 hover:bg-white/10 rounded-lg"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6">
                {user.role === 'ROLE_ADMIN' && selectedBoutique === 'ALL' ? (
                  <div className="p-8 text-center space-y-4">
                    <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                      <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h4 className="text-lg font-bold text-brand-dark">Sélectionnez une boutique</h4>
                    <p className="text-slate-500">
                      Veuillez sélectionner une boutique spécifique dans le menu déroulant avant d'ajouter un article au stock.
                    </p>
                    <button 
                      onClick={() => setIsCatalogModalOpen(false)}
                      className="btn-primary px-8"
                    >
                      Compris
                    </button>
                  </div>
                ) : !selectedProductForStock ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3">
                      <Package className="w-5 h-5 text-blue-600 mt-0.5" />
                      <p className="text-sm text-blue-800">
                        Sélectionnez un article du catalogue pour l'ajouter à votre stock.
                      </p>
                    </div>
                    {/* Search filter for loaded products */}
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="text"
                        className="input-field pl-12 py-3"
                        placeholder="Filtrer les articles..."
                        value={catalogSearchQuery}
                        onChange={(e) => setCatalogSearchQuery(e.target.value)}
                      />
                    </div>
                    {/* Product list */}
                    <div className="max-h-[350px] overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                      {catalogLoading ? (
                        <div className="p-8 text-center">
                          <RefreshCw className="w-6 h-6 text-brand-blue animate-spin mx-auto mb-2" />
                          <p className="text-sm text-slate-500">Chargement des produits...</p>
                        </div>
                      ) : filteredCatalogProducts.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 italic">
                          Aucun produit trouvé
                        </div>
                      ) : (
                        filteredCatalogProducts.map((product) => (
                          <button
                            key={product.id}
                            onClick={() => {
                              setSelectedProductForStock(product);
                              setStockFormData({
                                ...stockFormData,
                                localPrice: product.basePrice
                              });
                            }}
                            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-brand-blue">
                                <Package className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-bold text-brand-dark">{product.name}</p>
                                <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">{product.category}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-brand-blue">{product.basePrice.toLocaleString()} FCFA</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleAddToBoutique} className="space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-brand-blue shadow-sm">
                        <Package className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-black text-brand-dark">{selectedProductForStock.name}</h4>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedProductForStock.category}</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setSelectedProductForStock(null)}
                        className="ml-auto text-xs font-bold text-brand-blue hover:underline"
                      >
                        Changer d'article
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Quantité Initiale</label>
                        <input 
                          type="number" 
                          required
                          min="0"
                          className="input-field"
                          value={stockFormData.quantity || ''}
                          onChange={(e) => setStockFormData({...stockFormData, quantity: parseInt(e.target.value) || 0})}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Prix Local (FCFA)</label>
                        <input 
                          type="number" 
                          required
                          min="0"
                          className="input-field"
                          value={stockFormData.localPrice || ''}
                          onChange={(e) => setStockFormData({...stockFormData, localPrice: parseInt(e.target.value) || 0})}
                        />
                        <p className="text-[10px] text-slate-400 mt-1 italic">Prix de base: {selectedProductForStock.basePrice.toLocaleString()} FCFA</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Seuil d'Alerte (Stock Faible)</label>
                        <input 
                          type="number" 
                          required
                          min="1"
                          className="input-field"
                          value={stockFormData.lowStockThreshold || ''}
                          onChange={(e) => setStockFormData({...stockFormData, lowStockThreshold: parseInt(e.target.value) || 0})}
                        />
                      </div>
                    </div>

                    <div className="pt-4 flex gap-4">
                      <button 
                        type="button"
                        onClick={() => setSelectedProductForStock(null)}
                        className="flex-1 py-3 px-4 border-2 border-slate-100 rounded-xl font-bold text-slate-400 hover:bg-slate-50 transition-all"
                      >
                        Retour
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 btn-primary py-3"
                      >
                        Ajouter au Stock
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Proposal Modal */}
      <AnimatePresence>
        {isProposeModalOpen && (
          <motion.div 
            key="proposal-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/60 backdrop-blur-sm"
          >
            <motion.div 
              key="proposal-modal-content"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 bg-brand-blue text-white flex items-center justify-between">
                <h3 className="text-xl font-bold">Proposer un Article</h3>
                <button onClick={() => setIsProposeModalOpen(false)} className="p-2 hover:bg-white/10 rounded-lg">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handlePropose} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nom de l'Article</label>
                  <input 
                    type="text" 
                    required
                    className="input-field"
                    value={proposalData.name}
                    onChange={(e) => setProposalData({...proposalData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Catégorie</label>
                  <input 
                    type="text" 
                    required
                    className="input-field"
                    value={proposalData.category}
                    onChange={(e) => setProposalData({...proposalData, category: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Prix de Référence (FCFA)</label>
                  <input 
                    type="number" 
                    required
                    className="input-field"
                    value={proposalData.basePrice || ''}
                    onChange={(e) => setProposalData({...proposalData, basePrice: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Description</label>
                  <textarea 
                    className="input-field min-h-[80px]"
                    value={proposalData.description}
                    onChange={(e) => setProposalData({...proposalData, description: e.target.value})}
                  />
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsProposeModalOpen(false)}
                    className="flex-1 py-3 px-4 border-2 border-slate-100 rounded-xl font-bold text-slate-400 hover:bg-slate-50 transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 btn-primary py-3"
                  >
                    Envoyer
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
