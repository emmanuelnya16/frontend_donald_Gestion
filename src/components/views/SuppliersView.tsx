import React, { useState, useEffect, useRef } from 'react';
import { Truck, Plus, Edit2, Power, Search, XCircle, RefreshCw, ChevronLeft, Package, TrendingUp, TrendingDown, BarChart3, Trash2, DollarSign, ShoppingBag, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Supplier, SupplierDetail, SupplierProduct, Product, Boutique } from '../../types';
import { supplierService } from '../../services/supplierService';
import { productService } from '../../services/productService';
import { boutiqueService } from '../../services/boutiqueService';
import { User } from '../../types';

interface Props { user: User; }

const fmt = (n: number) => n.toLocaleString('fr-FR');

export default function SuppliersView({ user }: Props) {
  const isAdmin = user.role === 'ROLE_ADMIN';
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [addProdId, setAddProdId] = useState('');
  const [addPurchasePrice, setAddPurchasePrice] = useState('');
  const [addProdLoading, setAddProdLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '', description: '', boutiqueId: '' });
  const [formLoading, setFormLoading] = useState(false);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const data = await supplierService.getAll();
      setSuppliers(data);
      setError(null);
    } catch {
      setError('Erreur lors du chargement des fournisseurs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
    if (isAdmin) boutiqueService.getBoutiques().then(setBoutiques).catch(() => {});
    productService.getAll().then(setProducts).catch(() => {});

    // Auto-refresh toutes les 30 secondes pour afficher les nouveaux fournisseurs automatiquement
    autoRefreshRef.current = setInterval(() => {
      fetchSuppliers();
    }, 30000);

    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, []);

  const openDetail = async (s: Supplier) => {
    setDetailLoading(true);
    try {
      const detail = await supplierService.getById(s.id);
      setSelectedSupplier(detail);
    } catch {
      setError('Erreur lors du chargement du détail fournisseur.');
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshDetail = async () => {
    if (!selectedSupplier) return;
    const detail = await supplierService.getById(selectedSupplier.id);
    setSelectedSupplier(detail);
  };

  const openModal = (s?: Supplier) => {
    if (s) {
      setEditingSupplier(s);
      setFormData({ name: s.name, phone: s.phone || '', email: s.email || '', address: s.address || '', description: s.description || '', boutiqueId: s.boutique.id });
    } else {
      setEditingSupplier(null);
      setFormData({ name: '', phone: '', email: '', address: '', description: '', boutiqueId: isAdmin ? '' : (user.boutiqueId || '') });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (editingSupplier) {
        await supplierService.update(editingSupplier.id, formData);
      } else {
        await supplierService.create({ ...formData, boutiqueId: isAdmin ? formData.boutiqueId : undefined });
      }
      await fetchSuppliers();
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement.');
    } finally {
      setFormLoading(false);
    }
  };

  const toggleStatus = async (s: Supplier) => {
    try {
      await supplierService.toggleStatus(s.id);
      await fetchSuppliers();
      if (selectedSupplier?.id === s.id) await refreshDetail();
    } catch {
      setError('Erreur lors du changement de statut.');
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || !addProdId) return;
    setAddProdLoading(true);
    try {
      await supplierService.addProduct(selectedSupplier.id, addProdId, addPurchasePrice ? parseFloat(addPurchasePrice) : undefined);
      setIsAddProductOpen(false);
      setAddProdId('');
      setAddPurchasePrice('');
      await refreshDetail();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de l\'association du produit.');
    } finally {
      setAddProdLoading(false);
    }
  };

  const handleRemoveProduct = async (productId: string) => {
    if (!selectedSupplier) return;
    if (!window.confirm('Retirer ce produit du fournisseur ?')) return;
    try {
      await supplierService.removeProduct(selectedSupplier.id, productId);
      await refreshDetail();
    } catch {
      setError('Erreur lors de la suppression.');
    }
  };

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const linkedProductIds = new Set(selectedSupplier?.products?.map(p => p.id) || []);
  const availableProducts = products.filter(p => !linkedProductIds.has(p.id));

  // ── DETAIL VIEW ──────────────────────────────────────────────────────────
  if (selectedSupplier) {
    const stats = selectedSupplier.stats ?? { totalProducts: 0, totalStock: 0, totalRevenue: 0, totalCost: 0, totalMargin: 0 };
    const products2 = selectedSupplier.products ?? [];
    const marginPct = stats.totalRevenue > 0 ? ((stats.totalMargin / stats.totalRevenue) * 100).toFixed(1) : '0';
    // Calcul : Valeur totale du stock fournisseur = Σ (prix_achat × quantité_en_stock)
    const totalStockValue = products2.reduce((acc, p) => acc + (p.purchasePrice * p.stockQuantity), 0);
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedSupplier(null)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h2 className="text-2xl font-black text-brand-dark">{selectedSupplier.name}</h2>
            <p className="text-sm text-slate-400">{selectedSupplier.boutique.name} · {selectedSupplier.email || selectedSupplier.phone || 'Aucun contact'}</p>
          </div>
          <button onClick={() => openModal(selectedSupplier)} className="btn-primary flex items-center gap-2">
            <Edit2 className="w-4 h-4" /> Modifier
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" />
            <p className="font-medium text-sm">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto"><XCircle className="w-4 h-4" /></button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Produits liés', value: stats.totalProducts, icon: Package, color: 'text-blue-600 bg-blue-50' },
            { label: 'Stock global', value: `${fmt(stats.totalStock)} u.`, icon: BarChart3, color: 'text-indigo-600 bg-indigo-50' },
            { label: 'CA Total (vente)', value: `${fmt(stats.totalRevenue)} FCFA`, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Coût d\'achat', value: `${fmt(stats.totalCost)} FCFA`, icon: DollarSign, color: 'text-orange-600 bg-orange-50' },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${c.color}`}>
                <c.icon className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{c.label}</p>
              <p className="text-xl font-black text-brand-dark">{c.value}</p>
            </div>
          ))}
        </div>

        {/* Valeur totale du stock au prix d'achat */}
        <div className="rounded-2xl p-5 border border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center flex-shrink-0 shadow-md">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-violet-500 uppercase tracking-widest mb-0.5">Valeur Stock (Prix d'achat)</p>
            <p className="text-xs text-violet-400 font-medium">
              Σ (prix achat × quantité en stock) pour les {products2.length} produit{products2.length > 1 ? 's' : ''} lié{products2.length > 1 ? 's' : ''}
            </p>
          </div>
          <p className="text-2xl font-black text-violet-700 flex-shrink-0">{fmt(totalStockValue)} <span className="text-base font-bold">FCFA</span></p>
        </div>

        {/* Marge */}
        <div className={`rounded-2xl p-5 border ${stats.totalMargin >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
          <div className="flex items-center gap-3">
            {stats.totalMargin >= 0 ? <TrendingUp className="w-6 h-6 text-emerald-600" /> : <TrendingDown className="w-6 h-6 text-red-600" />}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Marge bénéficiaire</p>
              <p className={`text-2xl font-black ${stats.totalMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {fmt(stats.totalMargin)} FCFA <span className="text-base font-bold">({marginPct}%)</span>
              </p>
            </div>
          </div>
        </div>

        {/* Produits liés */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
            <h3 className="font-black text-brand-dark">Produits liés</h3>
            <button onClick={() => setIsAddProductOpen(true)} className="btn-primary flex items-center gap-2 text-sm py-2">
              <Plus className="w-4 h-4" /> Associer un produit
            </button>
          </div>
          {products2.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Aucun produit associé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-max">
                <thead>
                  <tr className="bg-slate-50 text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-left">
                    <th className="px-6 py-4">Produit</th>
                    <th className="px-6 py-4">Prix Achat</th>
                    <th className="px-6 py-4">Prix Vente</th>
                    <th className="px-6 py-4">Stock</th>
                    <th className="px-6 py-4">Qté Vendue</th>
                    <th className="px-6 py-4">CA</th>
                    <th className="px-6 py-4">Marge</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {products2.map((p: SupplierProduct) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-brand-dark text-sm">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.category || '—'}</p>
                      </td>
                      <td className="px-6 py-4"><span className="font-bold text-orange-600">{fmt(p.purchasePrice)} FCFA</span></td>
                      <td className="px-6 py-4"><span className="font-bold text-blue-600">{fmt(p.salePrice)} FCFA</span></td>
                      <td className="px-6 py-4"><span className={`font-black ${p.stockQuantity === 0 ? 'text-red-500' : 'text-slate-700'}`}>{p.stockQuantity}</span></td>
                      <td className="px-6 py-4"><span className="font-bold text-slate-600">{p.qtySold}</span></td>
                      <td className="px-6 py-4"><span className="font-bold text-emerald-600">{fmt(p.revenue)} FCFA</span></td>
                      <td className="px-6 py-4">
                        <span className={`font-black ${p.margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(p.margin)} FCFA</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleRemoveProduct(p.id)} className="p-2 hover:bg-red-50 rounded-lg text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Product Modal */}
        <AnimatePresence>
          {isAddProductOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/60 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-6 bg-brand-blue text-white flex items-center justify-between">
                  <h3 className="text-xl font-bold">Associer un Produit</h3>
                  <button onClick={() => setIsAddProductOpen(false)} className="p-2 hover:bg-white/10 rounded-lg"><XCircle className="w-6 h-6" /></button>
                </div>
                <form onSubmit={handleAddProduct} className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Produit</label>
                    <select required className="input-field" value={addProdId} onChange={e => setAddProdId(e.target.value)}>
                      <option value="">Sélectionner un produit...</option>
                      {availableProducts.map(p => (
                        <option key={p.id} value={p.id}>{p.name} {p.category ? `(${p.category})` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Prix d'achat (FCFA)</label>
                    <input type="number" min="0" className="input-field" placeholder="Optionnel" value={addPurchasePrice} onChange={e => setAddPurchasePrice(e.target.value)} />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setIsAddProductOpen(false)} className="flex-1 py-3 border-2 border-slate-100 rounded-xl font-bold text-slate-400 hover:bg-slate-50 transition-all">Annuler</button>
                    <button type="submit" disabled={addProdLoading} className="flex-1 btn-primary py-3">{addProdLoading ? 'Ajout...' : 'Associer'}</button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Modal inside detail */}
        <AnimatePresence>
          {isModalOpen && (
            <SupplierFormModal
              editingSupplier={editingSupplier}
              formData={formData}
              setFormData={setFormData}
              formLoading={formLoading}
              isAdmin={isAdmin}
              boutiques={boutiques}
              onClose={() => setIsModalOpen(false)}
              onSubmit={handleSubmit}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 px-6 py-4 rounded-2xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          <p className="font-medium">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto"><XCircle className="w-4 h-4" /></button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight">Fournisseurs</h2>
          <p className="text-sm text-slate-500 font-medium">Gérez vos fournisseurs et leurs produits liés</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Rechercher..." className="input-field pl-10 py-2 w-64"
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <button onClick={() => openModal()} className="btn-primary flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" /> Nouveau Fournisseur
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <RefreshCw className="w-12 h-12 text-brand-blue animate-spin" />
          <p className="text-slate-500 font-medium">Chargement des fournisseurs...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 py-20 text-center">
          <Truck className="w-16 h-16 mx-auto mb-4 text-slate-200" />
          <p className="text-lg font-black text-slate-300 uppercase tracking-widest">Aucun fournisseur</p>
          <p className="text-sm text-slate-400 mt-1">Ajoutez votre premier fournisseur</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(s => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all cursor-pointer ${s.status === 'INACTIVE' ? 'opacity-60 border-slate-100' : 'border-slate-100 hover:border-blue-200'}`}
              onClick={() => openDetail(s)}>
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 flex items-center justify-center">
                    <Truck className="w-6 h-6 text-brand-blue" />
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${s.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                    {s.status === 'ACTIVE' ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <h3 className="font-black text-brand-dark text-lg mb-1">{s.name}</h3>
                {s.phone && <p className="text-sm text-slate-400 font-medium">{s.phone}</p>}
                {s.email && <p className="text-sm text-slate-400 font-medium">{s.email}</p>}
                {isAdmin && <p className="text-xs text-blue-400 font-bold mt-1">{s.boutique.name}</p>}
              </div>
              <div className="px-5 pb-4 flex gap-2" onClick={e => e.stopPropagation()}>
                <button onClick={() => { openModal(s); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-brand-blue transition-colors"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => toggleStatus(s)} className={`p-2 rounded-lg transition-colors ${s.status === 'ACTIVE' ? 'hover:bg-red-50 text-slate-400 hover:text-red-500' : 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-500'}`}><Power className="w-4 h-4" /></button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/40 backdrop-blur-sm">
          <RefreshCw className="w-12 h-12 text-white animate-spin" />
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <SupplierFormModal
            editingSupplier={editingSupplier}
            formData={formData}
            setFormData={setFormData}
            formLoading={formLoading}
            isAdmin={isAdmin}
            boutiques={boutiques}
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleSubmit}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Reusable Form Modal ───────────────────────────────────────────────────────
interface FormModalProps {
  editingSupplier: Supplier | null;
  formData: { name: string; phone: string; email: string; address: string; description: string; boutiqueId: string };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  formLoading: boolean;
  isAdmin: boolean;
  boutiques: Boutique[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

function SupplierFormModal({ editingSupplier, formData, setFormData, formLoading, isAdmin, boutiques, onClose, onSubmit }: FormModalProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/60 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="p-6 bg-brand-blue text-white flex items-center justify-between">
          <h3 className="text-xl font-bold">{editingSupplier ? 'Modifier le Fournisseur' : 'Nouveau Fournisseur'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg"><XCircle className="w-6 h-6" /></button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nom *</label>
            <input type="text" required className="input-field" value={formData.name} onChange={e => setFormData((f: any) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Téléphone</label>
              <input type="text" className="input-field" value={formData.phone} onChange={e => setFormData((f: any) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Email</label>
              <input type="email" className="input-field" value={formData.email} onChange={e => setFormData((f: any) => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Adresse</label>
            <input type="text" className="input-field" value={formData.address} onChange={e => setFormData((f: any) => ({ ...f, address: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Description</label>
            <textarea className="input-field min-h-[80px]" value={formData.description} onChange={e => setFormData((f: any) => ({ ...f, description: e.target.value }))} />
          </div>
          {isAdmin && !editingSupplier && (
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Boutique *</label>
              <select required className="input-field" value={formData.boutiqueId} onChange={e => setFormData((f: any) => ({ ...f, boutiqueId: e.target.value }))}>
                <option value="">Sélectionner une boutique...</option>
                {boutiques.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex gap-4 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 border-2 border-slate-100 rounded-xl font-bold text-slate-400 hover:bg-slate-50 transition-all">Annuler</button>
            <button type="submit" disabled={formLoading} className="flex-1 btn-primary py-3">{formLoading ? 'Enregistrement...' : 'Enregistrer'}</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
