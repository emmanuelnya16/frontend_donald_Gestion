/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, 
  Plus, 
  Edit2, 
  Power, 
  Search, 
  XCircle,
  Tag,
  BarChart3,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Trash2
} from 'lucide-react';
import { Product, StockItem, Boutique, Supplier } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { productService } from '../../services/productService';
import { stockService } from '../../services/stockService';
import { boutiqueService } from '../../services/boutiqueService';
import { supplierService } from '../../services/supplierService';

export default function CatalogView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [deleteCategoryLoading, setDeleteCategoryLoading] = useState(false);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    basePrice: 0,
    purchasePrice: 0,
    description: '',
    supplierId: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const isAdmin = user?.role === 'ROLE_ADMIN';

      const [rawProducts, rawStock, rawBoutiques] = await Promise.all([
        productService.getAll(isAdmin ? 'ACTIVE' : 'ACTIVE'), // Default to ACTIVE for now, but Admin can see more
        stockService.getAll(),
        boutiqueService.getBoutiques()
      ]);

      const productsData = Array.isArray(rawProducts) ? rawProducts : [];
      const stockData = Array.isArray(rawStock) ? rawStock : [];
      const boutiquesData = Array.isArray(rawBoutiques) ? rawBoutiques : [];

      let allProducts = [...productsData];
      if (isAdmin) {
        const rawPending = await productService.getPending();
        const pendingProducts = Array.isArray(rawPending) ? rawPending : [];
        // Avoid duplicates if any
        const existingIds = new Set(allProducts.map(p => p.id));
        allProducts = [...allProducts, ...pendingProducts.filter(p => !existingIds.has(p.id))];
        
        // Also fetch INACTIVE if needed, but for now let's stick to ACTIVE + PENDING
        const rawInactive = await productService.getAll('INACTIVE');
        const inactiveProducts = Array.isArray(rawInactive) ? rawInactive : [];
        const existingIds2 = new Set(allProducts.map(p => p.id));
        allProducts = [...allProducts, ...inactiveProducts.filter(p => !existingIds2.has(p.id))];
      }

      setProducts(allProducts);
      setStock(stockData);
      setBoutiques(boutiquesData);
      setError(null);
    } catch (err) {
      console.error('Error fetching catalog data:', err);
      setError('Erreur lors du chargement des données. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Charger les fournisseurs pour le formulaire de création
    supplierService.getAll().then(setSuppliers).catch(() => {});

    // Auto-refresh toutes les 30 secondes pour garder les données à jour
    autoRefreshRef.current = setInterval(() => {
      fetchData();
    }, 30000);

    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, []);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        category: product.category || '',
        basePrice: product.basePrice,
        purchasePrice: product.purchasePrice ? Number(product.purchasePrice) : 0,
        description: product.description || '',
        supplierId: ''
      });
    } else {
      setEditingProduct(null);
      setFormData({ name: '', category: '', basePrice: 0, purchasePrice: 0, description: '', supplierId: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setFormLoading(true);
      if (editingProduct) {
        await productService.update(editingProduct.id, formData);
        // Associer au fournisseur si sélectionné lors de la modification
        if (formData.supplierId) {
          try {
            await supplierService.addProduct(
              formData.supplierId,
              editingProduct.id,
              formData.purchasePrice || undefined
            );
          } catch {
            // 409 = déjà associé — on ignore silencieusement
          }
        }
      } else {
        const created = await productService.create(formData);
        // Associer au fournisseur si sélectionné
        if (formData.supplierId && created?.id) {
          try {
            await supplierService.addProduct(
              formData.supplierId,
              created.id,
              formData.purchasePrice || undefined
            );
          } catch {
            // L'association a échoué mais le produit est créé — on continue
            setError('Produit créé mais l\'association au fournisseur a échoué.');
          }
        }
      }
      await fetchData();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Error saving product:', err);
      const message = err.response?.data?.message || err.response?.data?.detail || 'Erreur lors de l\'enregistrement du produit.';
      setError(message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;
    const count = filteredProducts.length;
    const confirmed = window.confirm(
      `⚠️ Supprimer TOUS les articles de la catégorie "${selectedCategory}" ?\n\n${count} article(s) seront définitivement supprimés, ainsi que leurs stocks associés.\n\nCette action est irréversible.`
    );
    if (!confirmed) return;
    setDeleteCategoryLoading(true);
    try {
      const result = await productService.deleteByCategory(selectedCategory);
      setSelectedCategory('');
      await fetchData();
      setError(null);
      alert(`✅ ${result.message} (${result.deletedCount} article(s) supprimés)`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression de la catégorie.');
    } finally {
      setDeleteCategoryLoading(false);
    }
  };

  const toggleStatus = async (product: Product) => {
    try {
      setLoading(true);
      const newStatus = product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await productService.toggleStatus(product.id, newStatus);
      await fetchData();
    } catch (err) {
      console.error('Error toggling product status:', err);
      setError('Erreur lors du changement de statut du produit.');
    } finally {
      setLoading(false);
    }
  };

  const getStockForProduct = (productId: string) => {
    return stock.filter(s => s.product.id === productId);
  };

  const getTotalStock = (productId: string) => {
    return getStockForProduct(productId).reduce((acc, s) => acc + s.quantity, 0);
  };

  // Catégories uniques extraites des produits chargés
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading && products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <RefreshCw className="w-12 h-12 text-brand-blue animate-spin" />
        <p className="text-slate-500 font-medium">Chargement du catalogue...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 px-6 py-4 rounded-2xl flex items-center gap-3">
          <RefreshCw className="w-5 h-5" />
          <p className="font-medium">{error}</p>
          <button onClick={fetchData} className="ml-auto underline font-bold">Réessayer</button>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight">Catalogue Global</h2>
          <p className="text-sm text-slate-500 font-medium">Gérez le référentiel des articles et suivez les stocks globaux</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Rechercher un article..."
              className="input-field pl-10 py-2 w-full sm:w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {/* Filtre par catégorie + bouton suppression catégorie */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              className="input-field py-2 font-semibold flex-1 sm:w-auto"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Toutes les catégories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {selectedCategory && (
              <button
                onClick={handleDeleteCategory}
                disabled={deleteCategoryLoading}
                title={`Supprimer toute la catégorie "${selectedCategory}"`}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-bold text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {deleteCategoryLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Suppr. catégorie</span>
              </button>
            )}
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="btn-primary flex justify-center items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Nouvel Article
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto whitespace-nowrap">
          <table className="w-full min-w-max">
          <thead>
            <tr className="bg-slate-50/50 text-left text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <th className="px-8 py-6">Article</th>
              <th className="px-8 py-6">Catégorie</th>
              <th className="px-8 py-6">Prix Achat</th>
              <th className="px-8 py-6">Prix Vente</th>
              <th className="px-8 py-6">Stock Total</th>
              <th className="px-8 py-6">Statut</th>
              <th className="px-8 py-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredProducts.map((p) => (
              <tr key={p.id} className={`hover:bg-slate-50/50 transition-colors ${p.status === 'INACTIVE' ? 'opacity-50' : ''}`}>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${p.status === 'ACTIVE' ? 'bg-brand-blue/10 text-brand-blue' : 'bg-slate-100 text-slate-400'}`}>
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-brand-dark">{p.name}</p>
                      <p className="text-xs text-slate-400 font-medium">ID: {p.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-600">
                    <Tag className="w-4 h-4 text-slate-300" />
                    {p.category}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <p className="font-black text-orange-500">{p.purchasePrice ? Number(p.purchasePrice).toLocaleString() : '—'} {p.purchasePrice ? 'FCFA' : ''}</p>
                </td>
                <td className="px-8 py-6">
                  <p className="font-black text-brand-blue">{p.basePrice.toLocaleString()} FCFA</p>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-slate-400" />
                    <span className="font-black text-brand-dark">{getTotalStock(p.id)}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">unités</span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    p.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 
                    p.status === 'PENDING' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                  }`}>
                    {p.status === 'ACTIVE' ? 'Actif' : p.status === 'PENDING' ? 'En attente' : 'Inactif'}
                  </span>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-2">
                    {p.status === 'PENDING' && (
                      <button 
                        onClick={() => toggleStatus(p)}
                        className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-600 transition-colors"
                        title="Valider l'article"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => handleOpenModal(p)}
                      className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-brand-blue transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => toggleStatus(p)}
                      className={`p-2 rounded-lg transition-colors ${
                        p.status === 'ACTIVE' 
                          ? 'hover:bg-red-50 text-slate-400 hover:text-red-500' 
                          : 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-500'
                      }`}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
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
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 bg-brand-blue text-white flex items-center justify-between">
                <h3 className="text-xl font-bold">
                  {editingProduct ? 'Modifier l\'Article' : 'Nouvel Article'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-lg">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nom de l'Article</label>
                  <input 
                    type="text" 
                    required
                    className="input-field"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Catégorie</label>
                  <input 
                    type="text" 
                    required
                    className="input-field"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Prix d'Achat (FCFA)</label>
                    <input 
                      type="number" 
                      min="0"
                      className="input-field"
                      placeholder="Optionnel"
                      value={formData.purchasePrice || ''}
                      onChange={(e) => setFormData({...formData, purchasePrice: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Prix de Vente (FCFA)</label>
                    <input 
                      type="number" 
                      required
                      min="0"
                      className="input-field"
                      value={formData.basePrice || ''}
                      onChange={(e) => setFormData({...formData, basePrice: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Description</label>
                  <textarea 
                    className="input-field min-h-[80px]"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                {/* Fournisseur — création ET modification */}
                {suppliers.length > 0 && (
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                      {editingProduct ? 'Associer à un Fournisseur' : 'Associer à un Fournisseur'}
                      <span className="ml-1 normal-case font-medium text-slate-300">(optionnel)</span>
                    </label>
                    <select
                      className="input-field"
                      value={formData.supplierId}
                      onChange={(e) => setFormData({...formData, supplierId: e.target.value})}
                    >
                      <option value="">Aucun fournisseur</option>
                      {suppliers.filter(s => s.status === 'ACTIVE').map(s => (
                        <option key={s.id} value={s.id}>{s.name} — {s.boutique.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="pt-4 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 px-4 border-2 border-slate-100 rounded-xl font-bold text-slate-400 hover:bg-slate-50 transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    disabled={formLoading}
                    className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {formLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...</>
                    ) : (
                      'Enregistrer'
                    )}
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
