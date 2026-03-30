/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Package, 
  ArrowLeftRight, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  Download,
  X,
  Plus,
  Minus,
  Store,
  RefreshCw,
  Search,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Product, StockItem, Boutique, Sale } from '../../types';
import { saleService } from '../../services/saleService';
import { boutiqueService } from '../../services/boutiqueService';
import { productService } from '../../services/productService';
import { stockService } from '../../services/stockService';
import InvoiceModal from '../InvoiceModal';

interface SalesViewProps {
  user: User;
}

export default function SalesView({ user }: SalesViewProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productStock, setProductStock] = useState<StockItem[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [sourceBoutiqueId, setSourceBoutiqueId] = useState('');
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [viewMode, setViewMode] = useState<'STATS' | 'NEW_SALE'>(user.role === 'ROLE_ADMIN' ? 'STATS' : 'NEW_SALE');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Product list state for boutique view
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [allStock, setAllStock] = useState<StockItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const [showSaleForm, setShowSaleForm] = useState(false);

  const getBoutiqueId = (u: User) => u.boutique?.id || u.boutiqueId || '';
  
  const [activeBoutiqueId, setActiveBoutiqueId] = useState<string>(getBoutiqueId(user));
  const currentBoutiqueId = user.role === 'ROLE_ADMIN' ? activeBoutiqueId : getBoutiqueId(user);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [boutiquesData, salesData] = await Promise.all([
        boutiqueService.getBoutiques(),
        saleService.getAll()
      ]);
      setBoutiques(boutiquesData);
      setSales(salesData);
      setError(null);
    } catch (err) {
      console.error('Error fetching sales data:', err);
      setError('Erreur lors du chargement des données de vente.');
    } finally {
      setLoading(false);
    }
  };

  // Load products and stock for boutique direct product list
  const fetchProducts = async () => {
    try {
      setProductsLoading(true);
      const [productsData, stockData] = await Promise.all([
        productService.getAll('ACTIVE'),
        stockService.getAll()
      ]);
      setAllProducts(productsData);
      setAllStock(stockData);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchProducts();
    if (user.role === 'ROLE_BOUTIQUE') {
      setSourceBoutiqueId(getBoutiqueId(user));
    }
  }, [user]);

  // Search with debounce
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setSearchResults(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await productService.search(searchQuery, currentBoutiqueId);
        setSearchResults(results);
      } catch (err) {
        console.error('Error searching products:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, currentBoutiqueId]);

  const getBoutiqueStats = (boutiqueId: string) => {
    const allSales = sales.filter(s => s.boutique.id === boutiqueId && s.status === 'COMPLETED');
    const today = new Date().toISOString().split('T')[0];
    const todaySales = allSales.filter(s => s.timestamp.startsWith(today));
    
    const totalAmount = allSales.reduce((acc, s) => acc + s.totalPrice, 0);
    const todayAmount = todaySales.reduce((acc, s) => acc + s.totalPrice, 0);
    const count = allSales.length;
    return { totalAmount, todayAmount, count };
  };

  const getProductLocalStock = (productId: string) => {
    return allStock.find(s => s.product.id === productId && s.boutique.id === currentBoutiqueId)?.quantity || 0;
  };

  const getProductStockItems = (productId: string): StockItem[] => {
    return allStock.filter(s => s.product.id === productId);
  };

  const handleSelectProductForSale = (product: any, stockItems?: StockItem[]) => {
    const pStock = stockItems || getProductStockItems(product.id);
    setSelectedProduct(product);
    setProductStock(pStock);
    
    const localStock = pStock.find(s => s.boutique.id === currentBoutiqueId);
    const price = localStock?.effectivePrice || product.basePrice;
    
    setUnitPrice(price);
    setQuantity(1);
    
    if (localStock && localStock.quantity > 0) {
      setSourceBoutiqueId(currentBoutiqueId);
    } else {
      const otherBoutiqueWithStock = pStock.find(s => s.quantity > 0);
      if (otherBoutiqueWithStock) {
        setSourceBoutiqueId(otherBoutiqueWithStock.boutique.id);
      }
    }
    setShowSaleForm(true);
    setError(null);
  };

  // Handle selection from search results (which have different data shape)
  const handleSearchProductSelect = (product: any) => {
    const productStock: StockItem[] = (product.stockByBoutique || []).map((s: any) => ({
      id: s.id || '',
      product: { id: product.id, name: product.name, category: product.category, basePrice: product.basePrice },
      boutique: { id: s.boutiqueId, name: s.boutiqueName },
      quantity: s.quantity,
      localPrice: s.localPrice,
      effectivePrice: s.localPrice || product.basePrice,
      lowStockThreshold: 5,
      isLowStock: s.quantity <= 5,
      isOutOfStock: s.quantity === 0
    }));

    handleSelectProductForSale(product as Product, productStock);
  };

  const handleProductSelect = (product: Product, stock: StockItem[]) => {
    handleSelectProductForSale(product, stock);
  };

  const currentSourceStock = productStock.find(s => s.boutique.id === sourceBoutiqueId)?.quantity || 0;
  const isTransfer = sourceBoutiqueId && currentBoutiqueId && 
    sourceBoutiqueId.toLowerCase().trim() !== currentBoutiqueId.toLowerCase().trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    
    if (!currentBoutiqueId) {
      setError("Veuillez sélectionner une boutique pour effectuer la vente.");
      return;
    }

    if (quantity <= 0) {
      setError("La quantité doit être supérieure à 0.");
      return;
    }

    if (unitPrice <= 0) {
      setError("Le prix unitaire doit être supérieur à 0.");
      return;
    }

    if (quantity > currentSourceStock) {
      setError(`Stock insuffisant dans la boutique source (${currentSourceStock} disponibles).`);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const saleData = {
        boutiqueId: currentBoutiqueId,
        items: [{
          productId: selectedProduct.id,
          quantity: Math.floor(quantity),
          unitPrice: parseFloat(unitPrice.toString()),
          sourceBoutiqueId: isTransfer ? sourceBoutiqueId : undefined
        }]
      };

      console.log('Sending Sale Data:', JSON.stringify(saleData, null, 2));

      const sale = await saleService.create(saleData);

      setLastSale(sale);
      setShowInvoice(true);
      await Promise.all([fetchData(), fetchProducts()]);
      
      // Reset form
      setSelectedProduct(null);
      setProductStock([]);
      setQuantity(1);
      setUnitPrice(0);
      setShowSaleForm(false);
    } catch (err: any) {
      console.error('Error creating sale:', err);
      if (err.response) {
        console.error('Backend Error Response Status:', err.response.status);
        console.error('Backend Error Response Data:', JSON.stringify(err.response.data, null, 2));
      }
      const backendMessage = err.response?.data?.message;
      const detail = err.response?.data?.detail;
      const violations = err.response?.data?.violations;
      
      let errorMessage = backendMessage || detail || 'Erreur lors de la validation de la vente.';
      
      if (violations && Array.isArray(violations)) {
        errorMessage = violations.map((v: any) => `${v.propertyPath ? v.propertyPath + ': ' : ''}${v.title || v.message}`).join(' | ');
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Determine which products to show: search results or all products
  const displayProducts = searchResults !== null ? searchResults : allProducts;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-brand-dark uppercase tracking-tight">Ventes</h2>
          <p className="text-sm text-slate-500 font-medium">Suivi des performances et enregistrement des transactions</p>
        </div>
        
        {user.role === 'ROLE_ADMIN' && (
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100">
            <button 
              onClick={() => setViewMode('STATS')}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                viewMode === 'STATS' ? 'bg-brand-blue text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'
              }`}
            >
              Statistiques
            </button>
            <button 
              onClick={() => setViewMode('NEW_SALE')}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                viewMode === 'NEW_SALE' ? 'bg-brand-blue text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'
              }`}
            >
              Nouvelle Vente
            </button>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {viewMode === 'STATS' ? (
          <motion.div 
            key="stats"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Global Summary Banner */}
            {(() => {
              const globalTodayAmount = boutiques.reduce((acc, b) => acc + getBoutiqueStats(b.id).todayAmount, 0);
              const globalTotalAmount = boutiques.reduce((acc, b) => acc + getBoutiqueStats(b.id).totalAmount, 0);
              const globalCount = boutiques.reduce((acc, b) => acc + getBoutiqueStats(b.id).count, 0);
              return (
                <div className="card border-none shadow-xl p-8 bg-gradient-to-r from-brand-blue to-brand-accent text-white">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                      <ShoppingCart className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-wider">Résumé Global</h3>
                      <p className="text-xs font-bold text-white/60 uppercase tracking-widest">{boutiques.length} boutique{boutiques.length > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-2">Ventes Aujourd'hui</p>
                      <p className="text-2xl font-black">{globalTodayAmount.toLocaleString()} <span className="text-base font-bold text-white/70">FCFA</span></p>
                    </div>
                    <div className="p-5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-2">Total Cumulé (Toutes Boutiques)</p>
                      <p className="text-2xl font-black">{globalTotalAmount.toLocaleString()} <span className="text-base font-bold text-white/70">FCFA</span></p>
                    </div>
                    <div className="p-5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-2">Total Transactions</p>
                      <p className="text-2xl font-black">{globalCount}</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Per-Boutique Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {boutiques.map(b => {
                const { totalAmount, todayAmount, count } = getBoutiqueStats(b.id);
                return (
                  <div key={b.id} className="card border-none shadow-xl p-8 hover:shadow-2xl transition-all group">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue group-hover:bg-brand-blue group-hover:text-white transition-colors">
                        <Store className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
                        {b.location}
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-brand-dark mb-1">{b.name.split(' - ')[0]}</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-6">{b.name.split(' - ')[1] || 'Boutique'}</p>
                    
                    <div className="space-y-4 pt-6 border-t border-slate-100">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Ventes Aujourd'hui</span>
                        <span className="text-lg font-black text-emerald-600">{todayAmount.toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Cumulé</span>
                        <span className="text-lg font-black text-brand-blue">{totalAmount.toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Transactions</span>
                        <span className="text-lg font-black text-brand-dark">{count}</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        if (user.role === 'ROLE_ADMIN' || user.boutiqueId === b.id) {
                          setActiveBoutiqueId(b.id);
                          setSourceBoutiqueId(b.id);
                          setViewMode('NEW_SALE');
                        }
                      }}
                      className="w-full mt-8 py-3 bg-slate-50 hover:bg-brand-blue hover:text-white rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 transition-all"
                    >
                      Enregistrer une vente
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : user.role === 'ROLE_BOUTIQUE' ? (
          /* ═══════════════════════════════════════════════
             BOUTIQUE VIEW: Product List + Search + Sale Form
             ═══════════════════════════════════════════════ */
          <motion.div 
            key="boutique_sale"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Search Bar */}
            <div className="card border-none shadow-lg p-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  className="input-field pl-12 py-4 text-lg"
                  placeholder="Rechercher un article (ex: Chemise, Veste...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchLoading && (
                  <RefreshCw className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-blue animate-spin" />
                )}
                {searchQuery && (
                  <button 
                    onClick={() => { setSearchQuery(''); setSearchResults(null); }}
                    className="absolute right-12 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-lg"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                )}
              </div>
              {searchResults !== null && (
                <p className="text-xs text-slate-400 font-bold mt-2 uppercase tracking-widest">
                  {searchResults.length} résultat{searchResults.length > 1 ? 's' : ''} trouvé{searchResults.length > 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* Sale Form Modal (slides in from top when a product is selected) */}
            <AnimatePresence>
              {showSaleForm && selectedProduct && (
                <motion.div
                  key="sale-form-panel"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="card border-2 border-brand-blue/20 shadow-xl p-8 bg-gradient-to-br from-white to-blue-50/30">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-brand-blue rounded-xl flex items-center justify-center text-white">
                          <ShoppingCart className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-brand-dark">Enregistrer une vente</h3>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{selectedProduct.name}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => { setShowSaleForm(false); setSelectedProduct(null); }}
                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                      >
                        <X className="w-5 h-5 text-slate-400" />
                      </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Left Column: Product Info */}
                        <div className="space-y-6">
                          <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                            <div className="flex items-center gap-4 mb-4">
                              <div className="w-12 h-12 bg-brand-blue rounded-xl flex items-center justify-center text-white">
                                <Package className="w-6 h-6" />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-brand-dark">{selectedProduct.name}</h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{selectedProduct.category}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                              <div className="text-center">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Stock Local</p>
                                <p className={`text-lg font-bold ${
                                  (productStock.find(s => s.boutique.id === currentBoutiqueId)?.quantity || 0) > 0 
                                    ? 'text-emerald-600' : 'text-red-600'
                                }`}>
                                  {productStock.find(s => s.boutique.id === currentBoutiqueId)?.quantity || 0}
                                </p>
                              </div>
                              <div className="w-px h-8 bg-slate-200"></div>
                              <div className="text-center">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Prix Catalogue</p>
                                <p className="text-lg font-bold text-brand-blue">{selectedProduct.basePrice.toLocaleString()} FCFA</p>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Boutique Source</label>
                            <div className="grid grid-cols-1 gap-3">
                              {boutiques.map((b) => {
                                const stock = productStock.find(s => s.boutique.id === b.id)?.quantity || 0;
                                const isSelected = sourceBoutiqueId === b.id;
                                return (
                                  <button
                                    key={b.id}
                                    type="button"
                                    disabled={stock <= 0}
                                    onClick={() => setSourceBoutiqueId(b.id)}
                                    className={`p-4 rounded-xl border-2 text-left transition-all duration-200 flex items-center justify-between ${
                                      isSelected 
                                        ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' 
                                        : stock > 0 ? 'border-slate-100 hover:border-slate-200 text-slate-600' : 'border-slate-50 opacity-50 cursor-not-allowed grayscale'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <Store className="w-5 h-5" />
                                      <span className="font-bold">{b.name.split(' - ')[0]}</span>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                      stock > 5 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                    }`}>
                                      Stock: {stock}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                            {isTransfer && (
                              <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-3 text-indigo-700">
                                <ArrowLeftRight className="w-5 h-5" />
                                <p className="text-xs font-bold uppercase tracking-wider">Transfert Inter-Boutique Activé</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right Column: Sale Details */}
                        <div className="space-y-6">
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Quantité</label>
                            <div className="flex items-center gap-4">
                              <button 
                                type="button"
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                              >
                                <Minus className="w-5 h-5" />
                              </button>
                              <input 
                                type="number" 
                                min="1" 
                                max={currentSourceStock}
                                className="input-field text-center text-2xl font-bold py-3"
                                value={quantity || ''}
                                onChange={(e) => setQuantity(Math.min(currentSourceStock, Math.max(1, parseInt(e.target.value) || 1)))}
                              />
                              <button 
                                type="button"
                                onClick={() => setQuantity(Math.min(currentSourceStock, quantity + 1))}
                                className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                              >
                                <Plus className="w-5 h-5" />
                              </button>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 text-center">
                              Max disponible: {currentSourceStock}
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Prix Unitaire (FCFA)</label>
                            <input 
                              type="number" 
                              step="0.01"
                              className="input-field text-2xl font-bold py-3"
                              value={unitPrice || ''}
                              onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                            />
                          </div>

                          <div className="pt-6 border-t border-slate-100">
                            <div className="flex items-center justify-between mb-6">
                              <span className="text-slate-500 font-bold uppercase tracking-widest">Total à payer</span>
                              <span className="text-3xl font-black text-brand-dark">{(quantity * unitPrice).toLocaleString()} FCFA</span>
                            </div>
                            <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-3 shadow-lg shadow-brand-blue/20 disabled:opacity-50">
                              {loading ? (
                                <RefreshCw className="w-6 h-6 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-6 h-6" />
                              )}
                              Valider la Vente
                            </button>
                          </div>
                        </div>
                      </div>
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Product List */}
            <div className="card border-none shadow-lg overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-brand-blue" />
                  <h3 className="text-lg font-bold text-brand-dark">
                    {searchResults !== null ? 'Résultats de recherche' : 'Catalogue des Produits'}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-200">
                    {displayProducts.length} article{displayProducts.length > 1 ? 's' : ''}
                  </span>
                  <button 
                    onClick={() => { fetchProducts(); setSearchQuery(''); setSearchResults(null); }}
                    className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-brand-blue"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {productsLoading ? (
                <div className="py-20 flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-brand-blue" />
                </div>
              ) : displayProducts.length === 0 ? (
                <div className="py-20 text-center text-slate-400">
                  <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">
                    {searchResults !== null ? 'Aucun produit trouvé pour cette recherche' : 'Aucun produit disponible'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {displayProducts.map((product: any, index: number) => {
                    // Determine stock based on data source (search vs full list)
                    let localStock = 0;
                    let totalStock = 0;

                    if (searchResults !== null) {
                      // Search results have stockByBoutique
                      localStock = product.localStock || 0;
                      totalStock = (product.stockByBoutique || []).reduce((acc: number, s: any) => acc + s.quantity, 0);
                    } else {
                      // Full product list — use allStock
                      const stockItem = allStock.find(s => s.product.id === product.id && s.boutique.id === currentBoutiqueId);
                      localStock = stockItem?.quantity || 0;
                      totalStock = allStock.filter(s => s.product.id === product.id).reduce((acc, s) => acc + s.quantity, 0);
                    }

                    const isActive = selectedProduct?.id === product.id && showSaleForm;

                    return (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(index * 0.03, 0.5) }}
                        className={`flex items-center justify-between p-5 hover:bg-slate-50 transition-all ${
                          isActive ? 'bg-blue-50/50 border-l-4 border-brand-blue' : ''
                        }`}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            localStock > 0 ? 'bg-brand-blue/10 text-brand-blue' : 'bg-red-50 text-red-400'
                          }`}>
                            <Package className="w-6 h-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-brand-dark truncate">{product.name}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{product.category || '—'}</span>
                              <span className="text-xs font-bold text-brand-blue">{product.basePrice.toLocaleString()} FCFA</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="hidden sm:flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                              localStock > 5 ? 'bg-emerald-50 text-emerald-600' :
                              localStock > 0 ? 'bg-amber-50 text-amber-600' :
                              'bg-red-50 text-red-600'
                            }`}>
                              Stock: {localStock}
                            </span>
                            {totalStock > localStock && (
                              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-blue-50 text-blue-600">
                                Réseau: {totalStock - localStock}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              if (searchResults !== null) {
                                handleSearchProductSelect(product);
                              } else {
                                handleSelectProductForSale(product);
                              }
                            }}
                            disabled={totalStock <= 0}
                            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                              totalStock > 0
                                ? 'bg-brand-blue text-white hover:bg-brand-accent shadow-md shadow-brand-blue/20 hover:shadow-lg'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            <ShoppingCart className="w-4 h-4" />
                            <span className="hidden md:inline">Vendre</span>
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          /* ═══════════════════════════════════════════════
             ADMIN NEW SALE VIEW (unchanged from original)
             ═══════════════════════════════════════════════ */
          <motion.div 
            key="new_sale"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-4xl mx-auto space-y-8"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-brand-dark tracking-tight">Nouvelle Vente</h2>
              <p className="text-slate-500 mt-2">Recherchez un article et validez la transaction</p>
            </div>

            <div className="card border-none shadow-xl p-8">
              {user.role === 'ROLE_ADMIN' && (
                <div className="mb-8 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                  <label className="block text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">Boutique de vente (Admin)</label>
                  <select 
                    value={activeBoutiqueId}
                    onChange={(e) => {
                      setActiveBoutiqueId(e.target.value);
                      setSourceBoutiqueId(e.target.value);
                      setSelectedProduct(null);
                    }}
                    className="w-full bg-transparent font-bold text-brand-dark focus:outline-none"
                  >
                    <option value="">Sélectionner une boutique...</option>
                    {boutiques.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="mb-8">
                <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Recherche d'article</label>
                <AdminSmartSearch onSelect={handleProductSelect} currentBoutiqueId={currentBoutiqueId} />
              </div>

              <AnimatePresence mode="wait">
                {selectedProduct ? (
                  <motion.form 
                    key="sale-form"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    onSubmit={handleSubmit} 
                    className="space-y-8 pt-8 border-t border-slate-100"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Left Column: Product Info */}
                      <div className="space-y-6">
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-brand-blue rounded-xl flex items-center justify-center text-white">
                              <Package className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-brand-dark">{selectedProduct.name}</h3>
                              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{selectedProduct.category}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                            <div className="text-center">
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Stock Local</p>
                              <p className={`text-lg font-bold ${
                                (productStock.find(s => s.boutique.id === currentBoutiqueId)?.quantity || 0) > 0 
                                  ? 'text-emerald-600' : 'text-red-600'
                              }`}>
                                {productStock.find(s => s.boutique.id === currentBoutiqueId)?.quantity || 0}
                              </p>
                            </div>
                            <div className="w-px h-8 bg-slate-200"></div>
                            <div className="text-center">
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Prix Catalogue</p>
                              <p className="text-lg font-bold text-brand-blue">{selectedProduct.basePrice.toLocaleString()} FCFA</p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Boutique Source</label>
                          <div className="grid grid-cols-1 gap-3">
                            {boutiques.map((b) => {
                              const stock = productStock.find(s => s.boutique.id === b.id)?.quantity || 0;
                              const isSelected = sourceBoutiqueId === b.id;
                              return (
                                <button
                                  key={b.id}
                                  type="button"
                                  disabled={stock <= 0}
                                  onClick={() => setSourceBoutiqueId(b.id)}
                                  className={`p-4 rounded-xl border-2 text-left transition-all duration-200 flex items-center justify-between ${
                                    isSelected 
                                      ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' 
                                      : stock > 0 ? 'border-slate-100 hover:border-slate-200 text-slate-600' : 'border-slate-50 opacity-50 cursor-not-allowed grayscale'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <Store className="w-5 h-5" />
                                    <span className="font-bold">{b.name.split(' - ')[0]}</span>
                                  </div>
                                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                    stock > 5 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                  }`}>
                                    Stock: {stock}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          {isTransfer && (
                            <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-3 text-indigo-700">
                              <ArrowLeftRight className="w-5 h-5" />
                              <p className="text-xs font-bold uppercase tracking-wider">Transfert Inter-Boutique Activé</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Column: Sale Details */}
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Quantité</label>
                          <div className="flex items-center gap-4">
                            <button 
                              type="button"
                              onClick={() => setQuantity(Math.max(1, quantity - 1))}
                              className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                            >
                              <Minus className="w-5 h-5" />
                            </button>
                            <input 
                              type="number" 
                              min="1" 
                              max={currentSourceStock}
                              className="input-field text-center text-2xl font-bold py-3"
                              value={quantity || ''}
                              onChange={(e) => setQuantity(Math.min(currentSourceStock, Math.max(1, parseInt(e.target.value) || 1)))}
                            />
                            <button 
                              type="button"
                              onClick={() => setQuantity(Math.min(currentSourceStock, quantity + 1))}
                              className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                            >
                              <Plus className="w-5 h-5" />
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 text-center">
                            Max disponible: {currentSourceStock}
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Prix Unitaire (FCFA)</label>
                          <input 
                            type="number" 
                            step="0.01"
                            className="input-field text-2xl font-bold py-3"
                            value={unitPrice || ''}
                            onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                          />
                        </div>

                        <div className="pt-6 border-t border-slate-100">
                          <div className="flex items-center justify-between mb-6">
                            <span className="text-slate-500 font-bold uppercase tracking-widest">Total à payer</span>
                            <span className="text-3xl font-black text-brand-dark">{(quantity * unitPrice).toLocaleString()} FCFA</span>
                          </div>
                          <button type="submit" className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-3 shadow-lg shadow-brand-blue/20">
                            <CheckCircle2 className="w-6 h-6" />
                            Valider la Vente
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.form>
                ) : (
                  <motion.div 
                    key="search-placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-20 text-center text-slate-400"
                  >
                    <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium">Sélectionnez un article pour commencer la vente</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invoice Modal */}
      <InvoiceModal 
        sale={lastSale} 
        isOpen={showInvoice} 
        onClose={() => setShowInvoice(false)} 
      />
    </div>
  );
}

// ─── Admin SmartSearch (embedded, identical to SmartSearch component) ───────
import { useRef } from 'react';

function AdminSmartSearch({ onSelect, currentBoutiqueId }: { onSelect: (product: Product, stock: StockItem[]) => void; currentBoutiqueId: string }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchProducts = async () => {
      if (query.trim().length > 0 && currentBoutiqueId) {
        setLoading(true);
        try {
          const filtered = await productService.search(query, currentBoutiqueId);
          setResults(filtered.slice(0, 10));
          setIsOpen(true);
        } catch (err) {
          console.error('Error searching products:', err);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
        setIsOpen(false);
      }
    };

    const timeoutId = setTimeout(searchProducts, 300);
    return () => clearTimeout(timeoutId);
  }, [query, currentBoutiqueId]);

  const handleSelect = (product: any) => {
    const productStock: StockItem[] = (product.stockByBoutique || []).map((s: any) => ({
      id: s.id || '',
      product: { id: product.id, name: product.name, category: product.category, basePrice: product.basePrice },
      boutique: { id: s.boutiqueId, name: s.boutiqueName },
      quantity: s.quantity,
      localPrice: s.localPrice,
      effectivePrice: s.localPrice || product.basePrice,
      lowStockThreshold: 5,
      isLowStock: s.quantity <= 5,
      isOutOfStock: s.quantity === 0
    }));

    onSelect(product as Product, productStock);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          className="input-field pl-12 py-4 text-lg"
          placeholder="Rechercher un article (ex: Chemise, Veste...)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length > 0 && setIsOpen(true)}
        />
        {loading && (
          <RefreshCw className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-blue animate-spin" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-[400px] overflow-y-auto">
          {results.map((product: any) => {
            const localStock = product.localStock || 0;
            const totalStock = (product.stockByBoutique || []).reduce((acc: number, s: any) => acc + s.quantity, 0);
            const otherStock = totalStock - localStock;

            return (
              <button
                key={product.id}
                onClick={() => handleSelect(product)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-none"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-brand-blue">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-brand-dark">{product.name}</p>
                    <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">{product.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-brand-blue">{product.basePrice.toLocaleString()} FCFA</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      localStock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                    }`}>
                      Local: {localStock}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-blue-50 text-blue-600">
                      Réseau: {otherStock}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
