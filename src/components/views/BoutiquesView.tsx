/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Plus, 
  Edit2, 
  Power, 
  MapPin, 
  Info,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { Boutique, User } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { boutiqueService } from '../../services/boutiqueService';

interface BoutiquesViewProps {
  user: User;
}

export default function BoutiquesView({ user }: BoutiquesViewProps) {
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBoutique, setEditingBoutique] = useState<Boutique | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    address: '',
    description: ''
  });

  const loadBoutiques = async () => {
    setLoading(true);
    try {
      const data = await boutiqueService.getBoutiques();
      setBoutiques(data);
    } catch (err) {
      console.error('Error loading boutiques:', err);
      setError('Erreur lors du chargement des boutiques.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoutiques();
  }, []);

  const handleOpenModal = (boutique?: Boutique) => {
    setError('');
    if (boutique) {
      setEditingBoutique(boutique);
      setFormData({
        name: boutique.name,
        location: boutique.location,
        address: boutique.address || '',
        description: boutique.description || ''
      });
    } else {
      setEditingBoutique(null);
      setFormData({ name: '', location: '', address: '', description: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (editingBoutique) {
        await boutiqueService.updateBoutique(editingBoutique.id, formData);
      } else {
        await boutiqueService.createBoutique(formData);
      }
      await loadBoutiques();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Error saving boutique:', err);
      const message = err.response?.data?.message || err.response?.data?.detail || 'Une erreur est survenue lors de l\'enregistrement.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (id: string) => {
    try {
      await boutiqueService.toggleBoutiqueStatus(id);
      await loadBoutiques();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors du changement de statut.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette boutique ?')) return;
    try {
      await boutiqueService.deleteBoutique(id);
      await loadBoutiques();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de la suppression.');
    }
  };

  const filteredBoutiques = boutiques.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight">Gestion des Boutiques</h2>
          <p className="text-sm text-slate-500 font-medium">Configurez et gérez vos points de vente</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Rechercher une boutique..."
              className="input-field pl-10 py-2 w-full sm:w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="btn-primary flex justify-center items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Nouvelle Boutique
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium flex items-center gap-2">
          <XCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-64 flex items-center justify-center" key="boutiques-loader">
          <RefreshCw className="w-8 h-8 animate-spin text-brand-blue" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" key="boutiques-grid">
          {filteredBoutiques.map((boutique) => (
            <motion.div 
              layout
              key={boutique.id}
              className={`card border-none shadow-md hover:shadow-lg transition-all ${boutique.status === 'INACTIVE' ? 'opacity-60 grayscale' : ''}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${boutique.status === 'ACTIVE' ? 'bg-brand-blue/10 text-brand-blue' : 'bg-slate-100 text-slate-400'}`}>
                  <Store className="w-6 h-6" />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleOpenModal(boutique)}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-brand-blue transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => toggleStatus(boutique.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      boutique.status === 'ACTIVE' 
                        ? 'hover:bg-red-50 text-slate-400 hover:text-red-500' 
                        : 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-500'
                    }`}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(boutique.id)}
                    className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>


              <h3 className="text-lg font-bold text-brand-dark mb-1">{boutique.name}</h3>
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-4">
                <MapPin className="w-4 h-4" />
                {boutique.location}
              </div>

              {boutique.description && (
                <p className="text-xs text-slate-400 line-clamp-2 mb-4 italic">
                  {boutique.description}
                </p>
              )}

              <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  boutique.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                }`}>
                  {boutique.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                </span>
                <div className="flex items-center gap-1 text-xs font-bold text-brand-blue">
                  <div className="flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Résumé
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            key="boutiques-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/60 backdrop-blur-sm"
          >
            <motion.div 
              key="boutiques-modal-content"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 bg-brand-blue text-white flex items-center justify-between">
                <h3 className="text-xl font-bold">
                  {editingBoutique ? 'Modifier la Boutique' : 'Nouvelle Boutique'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-lg">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nom de la Boutique</label>
                  <input 
                    type="text" 
                    required
                    className="input-field"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Quartier / Zone</label>
                  <input 
                    type="text" 
                    required
                    className="input-field"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Adresse Complète</label>
                  <textarea 
                    className="input-field min-h-[80px]"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Description</label>
                  <textarea 
                    className="input-field min-h-[80px]"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    type="button"
                    disabled={submitting}
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 px-4 border-2 border-slate-100 rounded-xl font-bold text-slate-400 hover:bg-slate-50 transition-all disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
                  >
                    {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                    {submitting ? 'Enregistrement...' : 'Enregistrer'}
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
