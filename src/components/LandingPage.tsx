/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import logo from '../assets/logo.jpg'
import { 
  Store, 
  ArrowRight, 
  ShieldCheck, 
  TrendingUp, 
  Package, 
  ArrowLeftRight,
  BarChart3, 
  Users,
  CheckCircle2
} from 'lucide-react';

interface LandingPageProps {
  onGoToLogin: () => void;
}

export default function LandingPage({ onGoToLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white text-brand-dark overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-blue rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-blue/20">
              <Store className="w-6 h-6" />
            </div>
            <span className="font-black text-2xl tracking-tighter text-brand-dark">Donald Gros</span>
          </div>
          <button 
            onClick={onGoToLogin}
            className="px-6 py-2.5 bg-brand-dark text-white text-sm font-bold rounded-full hover:bg-brand-blue transition-all shadow-xl shadow-brand-dark/10"
          >
            Se Connecter
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-brand-blue rounded-full text-xs font-black uppercase tracking-widest mb-8">
              <ShieldCheck className="w-4 h-4" />
              Solution de Gestion Multi-Boutiques
            </div>
            <h1 className="text-6xl lg:text-8xl font-black leading-[0.9] tracking-tighter mb-8">
              Gérez votre <span className="text-brand-blue">réseau</span> de vente avec précision.
            </h1>
            <p className="text-xl text-slate-500 mb-10 max-w-lg leading-relaxed">
              Donald Gros centralise vos stocks, vos ventes et vos transferts inter-boutiques en une seule interface élégante et performante.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={onGoToLogin}
                className="px-10 py-5 bg-brand-blue text-white text-lg font-black rounded-2xl hover:bg-brand-accent transition-all shadow-2xl shadow-brand-blue/30 flex items-center justify-center gap-3 group"
              >
                Accéder au Formulaire
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-10 py-5 bg-slate-100 text-brand-dark text-lg font-bold rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center gap-3">
                Découvrir les fonctionnalités
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative"
          >
            <div className="aspect-square  rounded-[4rem] overflow-hidden relative z-10">
              <img 
                src={logo} 
                alt="Retail Management" 
                className="w-full h-full object-cover mix-blend-overlay opacity-60"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/80 to-transparent flex flex-col justify-end p-12">
                <div className="p-6 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Ventes du Jour</p>
                      <p className="text-white text-2xl font-black">+1,240,000 FCFA</p>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '75%' }}
                      transition={{ duration: 2, delay: 1 }}
                      className="h-full bg-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-accent/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-brand-blue/20 rounded-full blur-3xl" />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-black tracking-tighter mb-6">Pourquoi choisir Donald Gros ?</h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Une suite d'outils puissants conçus pour simplifier la gestion complexe des réseaux de boutiques.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                title: "Gestion de Stock", 
                desc: "Suivez vos articles en temps réel sur l'ensemble de votre réseau.", 
                icon: Package,
                color: "bg-blue-500"
              },
              { 
                title: "Transferts Fluides", 
                desc: "Déplacez vos produits entre boutiques en un clic avec traçabilité complète.", 
                icon: ArrowLeftRight,
                color: "bg-indigo-500"
              },
              { 
                title: "Analyses Précises", 
                desc: "Rapports détaillés journaliers et hebdomadaires pour piloter votre activité.", 
                icon: BarChart3,
                color: "bg-emerald-500"
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -10 }}
                className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100"
              >
                <div className={`w-16 h-16 ${feature.color} rounded-2xl flex items-center justify-center text-white mb-8 shadow-lg`}>
                  <feature.icon className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                <p className="text-slate-500 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-32">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tighter mb-8">
              Une sécurité de niveau <span className="text-brand-blue">entreprise</span>.
            </h2>
            <div className="space-y-6">
              {[
                "Contrôle d'accès basé sur les rôles (RBAC)",
                "Traçabilité complète de chaque transaction",
                "Sauvegarde automatique des données locales",
                "Interface optimisée pour la rapidité"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="h-64 bg-slate-100 rounded-[3rem] overflow-hidden">
                <img src={logo} alt="Shop" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" referrerPolicy="no-referrer" />
              </div>
              <div className="h-40 bg-brand-blue rounded-[2.5rem] flex items-center justify-center text-white p-8 text-center">
                <p className="text-2xl font-black">100% Fiable</p>
              </div>
            </div>
            <div className="space-y-6 pt-12">
              <div className="h-40 bg-brand-dark rounded-[2.5rem] flex items-center justify-center text-white p-8 text-center">
                <p className="text-2xl font-black">+500 Articles</p>
              </div>
              <div className="h-64 bg-slate-100 rounded-[3rem] overflow-hidden">
                <img src={logo} alt="Shop" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" referrerPolicy="no-referrer" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-brand-dark text-white py-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="flex items-center gap-3">
            <Store className="w-8 h-8 text-brand-blue" />
            <span className="font-black text-2xl tracking-tighter">Donald Gros</span>
          </div>
          <p className="text-white/40 text-sm font-medium">
            © 2026 Donald Gros Management System. Tous droits réservés.
          </p>
          <div className="flex gap-8">
            <a href="#" className="text-white/60 hover:text-white transition-colors font-bold text-sm">Confidentialité</a>
            <a href="#" className="text-white/60 hover:text-white transition-colors font-bold text-sm">Conditions</a>
            <a href="#" className="text-white/60 hover:text-white transition-colors font-bold text-sm">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
