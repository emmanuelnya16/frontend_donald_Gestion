/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import {
  Bell,
  AlertTriangle,
  PackageX,
  TrendingDown,
  ArrowLeftRight,
  X,
  RefreshCw,
  ChevronRight,
  Package,
  Store,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../types';
import { alertService, AlertsResponse, AlertItem, DependencyAlert } from '../services/alertService';

interface AlertDropdownProps {
  user: User;
}

type AlertTab = 'all' | 'outOfStock' | 'lowStock' | 'dependency';

export default function AlertDropdown({ user }: AlertDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState<AlertsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<AlertTab>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await alertService.getAll();
      setAlerts(data);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch alerts on mount and every 60s
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalAlerts = alerts?.totalAlerts || 0;
  const outOfStockCount = alerts?.outOfStock?.length || 0;
  const lowStockCount = alerts?.lowStock?.length || 0;
  const dependencyCount = alerts?.dependency?.length || 0;

  const isAdmin = user.role === 'ROLE_ADMIN';

  // Build tabs
  const tabs: { id: AlertTab; label: string; count: number; color: string; icon: any }[] = [
    { id: 'all', label: 'Toutes', count: totalAlerts, color: 'brand-blue', icon: Bell },
    { id: 'outOfStock', label: 'Ruptures', count: outOfStockCount, color: 'red-500', icon: PackageX },
    { id: 'lowStock', label: 'Stock Bas', count: lowStockCount, color: 'amber-500', icon: TrendingDown },
  ];

  if (isAdmin) {
    tabs.push({ id: 'dependency', label: 'Dépendances', count: dependencyCount, color: 'violet-500', icon: ArrowLeftRight });
  }

  const getVisibleAlerts = (): (AlertItem | DependencyAlert)[] => {
    if (!alerts) return [];
    switch (activeTab) {
      case 'outOfStock': return alerts.outOfStock || [];
      case 'lowStock': return alerts.lowStock || [];
      case 'dependency': return isAdmin ? (alerts.dependency || []) : [];
      case 'all':
      default:
        return [
          ...(alerts.outOfStock || []).map(a => ({ ...a, _type: 'outOfStock' as const })),
          ...(alerts.lowStock || []).map(a => ({ ...a, _type: 'lowStock' as const })),
          ...(isAdmin ? (alerts.dependency || []).map(a => ({ ...a, _type: 'dependency' as const })) : []),
        ];
    }
  };

  const renderAlertItem = (item: any, index: number) => {
    const isDependency = 'transfersThisWeek' in item;
    const isOutOfStock = !isDependency && (item.quantity === 0 || item._type === 'outOfStock');

    if (isDependency) {
      return (
        <motion.div
          key={`dep-${item.boutiqueId}-${index}`}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.03 }}
          className="group flex items-start gap-3.5 p-3.5 rounded-xl hover:bg-violet-50/60 transition-all duration-200 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-100 to-violet-50 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:shadow-md transition-shadow">
            <ArrowLeftRight className="w-4 h-4 text-violet-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-slate-800 truncate">{item.boutiqueName?.split(' - ')[0]}</p>
              <span className="flex-shrink-0 px-1.5 py-0.5 bg-violet-100 text-violet-700 text-[9px] font-black uppercase tracking-widest rounded-md">
                Dépendance
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              <span className="font-bold text-violet-600">{item.transfersThisWeek}</span> transferts cette semaine
              <span className="text-slate-300 mx-1">·</span>
              seuil <span className="font-bold">{item.threshold}</span>
            </p>
            <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(parseInt(item.dependencyLevel) || 0, 100)}%`,
                  background: parseInt(item.dependencyLevel) > 100
                    ? 'linear-gradient(90deg, #8b5cf6, #ef4444)'
                    : 'linear-gradient(90deg, #8b5cf6, #a78bfa)',
                }}
              />
            </div>
          </div>
          <span className="text-[10px] font-black text-violet-600 mt-1">{item.dependencyLevel}</span>
        </motion.div>
      );
    }

    // outOfStock or lowStock
    return (
      <motion.div
        key={`stock-${item.stockItemId || item.productId}-${index}`}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.03 }}
        className={`group flex items-start gap-3.5 p-3.5 rounded-xl transition-all duration-200 cursor-pointer ${
          isOutOfStock ? 'hover:bg-red-50/60' : 'hover:bg-amber-50/60'
        }`}
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:shadow-md transition-shadow ${
          isOutOfStock
            ? 'bg-gradient-to-br from-red-100 to-red-50'
            : 'bg-gradient-to-br from-amber-100 to-amber-50'
        }`}>
          {isOutOfStock
            ? <PackageX className="w-4 h-4 text-red-600" />
            : <TrendingDown className="w-4 h-4 text-amber-600" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-800 truncate">{item.productName}</p>
            <span className={`flex-shrink-0 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md ${
              isOutOfStock
                ? 'bg-red-100 text-red-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {isOutOfStock ? 'Rupture' : 'Bas'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Store className="w-3 h-3 text-slate-400" />
            <p className="text-xs text-slate-500 truncate">{item.boutiqueName?.split(' - ')[0]}</p>
          </div>
          {!isOutOfStock && item.threshold && (
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                  style={{ width: `${Math.min((item.quantity / item.threshold) * 100, 100)}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-amber-600">
                {item.quantity}/{item.threshold}
              </span>
            </div>
          )}
        </div>
        {isOutOfStock && (
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mt-2 flex-shrink-0" />
        )}
      </motion.div>
    );
  };

  const visibleAlerts = getVisibleAlerts();

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchAlerts();
        }}
        className="relative p-2.5 text-slate-400 hover:text-brand-blue hover:bg-slate-50 rounded-xl transition-all duration-200"
      >
        <Bell className="w-6 h-6" />
        <AnimatePresence>
          {totalAlerts > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 bg-gradient-to-r from-red-500 to-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg shadow-red-200"
            >
              {totalAlerts > 99 ? '99+' : totalAlerts}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-3 w-[420px] bg-white rounded-2xl shadow-2xl shadow-slate-200/80 border border-slate-100 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-brand-blue to-brand-accent flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/15 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <Bell className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">Notifications</h3>
                  <p className="text-white/60 text-xs">
                    {totalAlerts === 0
                      ? 'Aucune alerte active'
                      : `${totalAlerts} alerte${totalAlerts > 1 ? 's' : ''} active${totalAlerts > 1 ? 's' : ''}`
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); fetchAlerts(); }}
                  className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Rafraîchir"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100">
              <div className={`grid gap-2 ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <button
                  onClick={() => setActiveTab('outOfStock')}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-all duration-200 ${
                    activeTab === 'outOfStock'
                      ? 'bg-white shadow-sm ring-1 ring-red-100'
                      : 'hover:bg-white/80'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                    <PackageX className="w-3.5 h-3.5 text-red-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-black text-red-600 leading-none">{outOfStockCount}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Ruptures</p>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('lowStock')}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-all duration-200 ${
                    activeTab === 'lowStock'
                      ? 'bg-white shadow-sm ring-1 ring-amber-100'
                      : 'hover:bg-white/80'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <TrendingDown className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-lg font-black text-amber-600 leading-none">{lowStockCount}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Stock Bas</p>
                  </div>
                </button>

                {isAdmin && (
                  <button
                    onClick={() => setActiveTab('dependency')}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-all duration-200 ${
                      activeTab === 'dependency'
                        ? 'bg-white shadow-sm ring-1 ring-violet-100'
                        : 'hover:bg-white/80'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                      <ArrowLeftRight className="w-3.5 h-3.5 text-violet-500" />
                    </div>
                    <div className="text-left">
                      <p className="text-lg font-black text-violet-600 leading-none">{dependencyCount}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Dépend.</p>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Tab Filter Bar */}
            <div className="px-4 pt-3 pb-1 flex items-center gap-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-brand-blue text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <tab.icon className="w-3 h-3" />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                      activeTab === tab.id
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Alert List */}
            <div className="max-h-[360px] overflow-y-auto px-3 py-2 custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 animate-spin text-brand-blue" />
                </div>
              ) : visibleAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                    <Package className="w-7 h-7 text-emerald-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-600">Tout est en ordre !</p>
                  <p className="text-xs text-slate-400 mt-1">Aucune alerte pour cette catégorie</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {visibleAlerts.map((item, index) => renderAlertItem(item, index))}
                </div>
              )}
            </div>

            {/* Footer */}
            {totalAlerts > 0 && (
              <div className="px-4 py-3 bg-slate-50/60 border-t border-slate-100">
                <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Mise à jour automatique toutes les 60 secondes
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
