/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, ShieldCheck, Store, RefreshCw } from 'lucide-react';
import { authService } from '../services/authService';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User, token: string) => void;
  onBack: () => void;
}

export default function Login({ onLogin, onBack }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Login to get JWT token
      const { token } = await authService.login(email, password);
      
      // 2. Store token in localStorage (api.ts will use it)
      localStorage.setItem('nexus_jwt_token', token);
      
      // 3. Fetch user info from /api/me
      const user = await authService.getCurrentUser();
      
      // 4. Map Symfony roles to frontend roles if needed
      const mappedUser: User = {
        ...user,
        role: authService.mapRole(user.role),
        boutiqueId: user.boutique?.id || user.boutiqueId
      };

      onLogin(mappedUser, token);
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.response && err.response.status === 401) {
        setError('Identifiants incorrects. Veuillez réessayer.');
      } else {
        setError('Une erreur est survenue lors de la connexion au serveur.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-light p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-blue rounded-2xl mb-4 shadow-lg">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-brand-dark tracking-tight">Donald Gros</h1>
          <p className="text-slate-500 mt-2">Système de Gestion des Ventes</p>
        </div>

        <div className="card shadow-xl border-none">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
              <input
                type="email"
                required
                className="input-field"
                placeholder="vendeur@gestioncom.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Mot de passe</label>
              <input
                type="password"
                required
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg"
              >
                {error}
              </motion.div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>

            <button 
              type="button" 
              onClick={onBack}
              className="w-full text-slate-400 hover:text-brand-blue text-sm font-bold transition-colors"
            >
              Retour à l'accueil
            </button>
          </form>
        </div>

        <div className="mt-8 flex items-center justify-center gap-6 text-slate-400">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest font-semibold">4 Boutiques</span>
          </div>
          <div className="w-px h-4 bg-slate-200"></div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest font-semibold">Sécurisé</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
