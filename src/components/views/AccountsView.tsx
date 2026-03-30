/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Edit2, 
  Power, 
  Mail, 
  Shield,
  Store,
  Search,
  XCircle,
  Key,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { User, Boutique, Role } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { userService } from '../../services/userService';
import { boutiqueService } from '../../services/boutiqueService';

export default function AccountsView() {
  const [users, setUsers] = useState<User[]>([]);
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'ROLE_BOUTIQUE' as Role,
    boutiqueId: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedUsers, fetchedBoutiques] = await Promise.all([
        userService.getUsers(),
        boutiqueService.getBoutiques()
      ]);
      setUsers(fetchedUsers);
      setBoutiques(fetchedBoutiques);
    } catch (err) {
      console.error('Error loading accounts data:', err);
      setError('Erreur lors du chargement des données.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (user?: User) => {
    setError('');
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        password: '', // Don't show password
        role: user.role as Role,
        boutiqueId: user.boutique?.id || user.boutiqueId || ''
      });
    } else {
      setEditingUser(null);
      setFormData({ email: '', password: '', role: 'ROLE_BOUTIQUE', boutiqueId: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    
    try {
      if (editingUser) {
        const updateData: any = { email: formData.email };
        if (formData.password) updateData.password = formData.password;
        // Note: Backend update might not support role/boutique change in PUT /api/users/{id} based on controller
        await userService.updateUser(editingUser.id, updateData);
      } else {
        await userService.createUser({
          email: formData.email,
          password: formData.password,
          role: formData.role,
          boutiqueId: formData.role === 'ROLE_BOUTIQUE' ? formData.boutiqueId : undefined
        });
      }
      await loadData();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Error saving user:', err);
      if (err.response?.status === 409) {
        setError('Cet email est déjà utilisé par un autre compte.');
      } else {
        setError(err.response?.data?.message || err.response?.data?.detail || 'Une erreur est survenue lors de l\'enregistrement.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (id: string) => {
    try {
      await userService.toggleUserStatus(id);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors du changement de statut.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce compte ?')) return;
    try {
      await userService.deleteUser(id);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de la suppression.');
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight">Gestion des Comptes</h2>
          <p className="text-sm text-slate-500 font-medium">Gérez les accès administrateurs et vendeurs</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Rechercher un compte..."
              className="input-field pl-10 py-2 w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Nouveau Compte
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
        <div className="h-64 flex items-center justify-center" key="accounts-loader">
          <RefreshCw className="w-8 h-8 animate-spin text-brand-blue" />
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden" key="accounts-table-container">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 text-left text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="px-8 py-6">Utilisateur</th>
                <th className="px-8 py-6">Rôle</th>
                <th className="px-8 py-6">Boutique</th>
                <th className="px-8 py-6">Statut</th>
                <th className="px-8 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map((u) => (
                <tr key={u.id} className={`hover:bg-slate-50/50 transition-colors ${u.status === 'INACTIVE' ? 'opacity-50' : ''}`}>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${u.role === 'ROLE_ADMIN' ? 'bg-brand-blue/10 text-brand-blue' : 'bg-indigo-50 text-indigo-600'}`}>
                        {u.role === 'ROLE_ADMIN' ? <Shield className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-bold text-brand-dark">{u.email}</p>
                        <p className="text-xs text-slate-400 font-medium truncate max-w-[150px]">ID: {u.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      u.role === 'ROLE_ADMIN' ? 'bg-brand-blue text-white' : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {u.role === 'ROLE_ADMIN' ? 'Admin' : 'Boutique'}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    {u.role === 'ROLE_BOUTIQUE' ? (
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                        <Store className="w-4 h-4 text-slate-400" />
                        {u.boutique?.name || 'Non assignée'}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Accès Global</span>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      u.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                    }`}>
                      {u.status === 'ACTIVE' ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleOpenModal(u)}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-brand-blue transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => toggleStatus(u.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          u.status === 'ACTIVE' 
                            ? 'hover:bg-red-50 text-slate-400 hover:text-red-500' 
                            : 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-500'
                        }`}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(u.id)}
                        className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}


      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            key="accounts-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/60 backdrop-blur-sm"
          >
            <motion.div 
              key="accounts-modal-content"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 bg-brand-blue text-white flex items-center justify-between">
                <h3 className="text-xl font-bold">
                  {editingUser ? 'Modifier le Compte' : 'Nouveau Compte'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-lg">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="email" 
                      required
                      className="input-field pl-10"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                    {editingUser ? 'Nouveau Mot de passe (optionnel)' : 'Mot de passe'}
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="password" 
                      required={!editingUser}
                      className="input-field pl-10"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Rôle</label>
                  <select 
                    className="input-field"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value as Role})}
                  >
                    <option value="ROLE_BOUTIQUE">Vendeur (Boutique)</option>
                    <option value="ROLE_ADMIN">Administrateur Global</option>
                  </select>
                </div>

                {formData.role === 'ROLE_BOUTIQUE' && (
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Boutique Associée</label>
                    <select 
                      required
                      className="input-field"
                      value={formData.boutiqueId}
                      onChange={(e) => setFormData({...formData, boutiqueId: e.target.value})}
                    >
                      <option value="">Sélectionner une boutique</option>
                      {boutiques.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}

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
