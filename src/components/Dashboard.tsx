/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  ArrowLeftRight, 
  FileText, 
  History, 
  LogOut, 
  Menu, 
  X,
  User as UserIcon,
  Store
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Boutique } from '../types';
import { boutiqueService } from '../services/boutiqueService';
import AlertDropdown from './AlertDropdown';
import HomeView from './views/HomeView';
import SalesView from './views/SalesView';
import StockView from './views/StockView';
import TransfersView from './views/TransfersView';
import ReportsView from './views/ReportsView';
import CorrectionsView from './views/CorrectionsView';
import BoutiquesView from './views/BoutiquesView';
import AccountsView from './views/AccountsView';
import CatalogView from './views/CatalogView';
import InvoicesView from './views/InvoicesView';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [currentBoutique, setCurrentBoutique] = useState<Boutique | null>(null);

  useEffect(() => {
    const fetchBoutiques = async () => {
      try {
        const bts = await boutiqueService.getBoutiques();
        setBoutiques(bts);
        if (user.role === 'ROLE_BOUTIQUE') {
          setCurrentBoutique(bts.find(b => b.id === user.boutiqueId) || null);
        }
      } catch (err) {
        console.error('Error fetching boutiques in dashboard:', err);
      }
    };
    fetchBoutiques();
  }, [user]);

  const menuItems = [
    { id: 'home', label: 'Tableau de bord', icon: LayoutDashboard, roles: ['ROLE_ADMIN', 'ROLE_BOUTIQUE'] },
    { id: 'boutiques', label: 'Boutiques', icon: Store, roles: ['ROLE_ADMIN'] },
    { id: 'accounts', label: 'Comptes', icon: UserIcon, roles: ['ROLE_ADMIN'] },
    { id: 'catalog', label: 'Catalogue', icon: Package, roles: ['ROLE_ADMIN'] },
    { id: 'sales', label: 'Ventes', icon: ShoppingCart, roles: ['ROLE_ADMIN', 'ROLE_BOUTIQUE'] },
    { id: 'stock', label: 'Stock', icon: Package, roles: ['ROLE_ADMIN', 'ROLE_BOUTIQUE'] },
    { id: 'invoices', label: 'Factures', icon: FileText, roles: ['ROLE_ADMIN', 'ROLE_BOUTIQUE'] },
    { id: 'transfers', label: 'Navettes', icon: ArrowLeftRight, roles: ['ROLE_ADMIN', 'ROLE_BOUTIQUE'] },
    { id: 'reports', label: 'Rapports', icon: FileText, roles: ['ROLE_ADMIN', 'ROLE_BOUTIQUE'] },
    { id: 'corrections', label: 'Corrections', icon: History, roles: ['ROLE_ADMIN'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user.role));

  const renderView = () => {
    switch (activeTab) {
      case 'home': return <HomeView user={user} onNavigate={setActiveTab} />;
      case 'boutiques': return <BoutiquesView user={user} />;
      case 'accounts': return <AccountsView />;
      case 'catalog': return <CatalogView />;
      case 'sales': return <SalesView user={user} />;
      case 'stock': return <StockView user={user} />;
      case 'invoices': return <InvoicesView user={user} />;
      case 'transfers': return <TransfersView user={user} />;
      case 'reports': return <ReportsView user={user} />;
      case 'corrections': return <CorrectionsView user={user} />;
      default: return <HomeView user={user} onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-brand-light">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className={`bg-brand-blue text-white flex flex-col transition-all duration-300 z-50 fixed inset-y-0 left-0 md:relative ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3"
            >
              <Store className="w-8 h-8 text-white" />
              <span className="font-bold text-xl tracking-tight">Donald Gros</span>
            </motion.div>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {filteredMenu.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === item.id 
                  ? 'bg-white text-brand-blue shadow-lg font-semibold' 
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {isSidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-white/70 hover:bg-red-500/20 hover:text-red-400 transition-all duration-200"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {(isSidebarOpen || window.innerWidth < 768) && <span>Déconnexion</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col w-full md:w-auto overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 md:hidden text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex flex-col">
              <h2 className="text-lg sm:text-xl font-bold text-brand-dark">
                {menuItems.find(i => i.id === activeTab)?.label}
              </h2>
              <p className="text-sm text-slate-500">
                {user.role === 'ROLE_ADMIN' ? 'Administration Globale' : currentBoutique?.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <AlertDropdown user={user} />
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-brand-dark">{user.email}</p>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                  {user.role === 'ROLE_ADMIN' ? 'Administrateur' : 'Vendeur'}
                </p>
              </div>
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-brand-blue">
                <UserIcon className="w-6 h-6" />
              </div>
            </div>
          </div>
        </header>

        {/* View Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
