/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Download,
  Printer,
  TrendingUp,
  ShoppingCart,
  ArrowLeftRight,
  Package,
  BarChart3,
  PieChart,
  RefreshCw,
  Store,
  Trophy,
  Clock,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Boutique } from '../../types';
import { boutiqueService } from '../../services/boutiqueService';
import {
  reportService,
  BoutiqueSalesReport,
  ComparisonReport,
} from '../../services/reportService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ReportsViewProps {
  user: User;
}

type ReportTab = 'sales' | 'comparison';

export default function ReportsView({ user }: ReportsViewProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>('sales');
  const [selectedBoutique, setSelectedBoutique] = useState<string>(
    user.role === 'ROLE_ADMIN' ? '' : (user.boutique?.id || user.boutiqueId || '')
  );
  const [period, setPeriod] = useState<'all' | 'day' | 'week' | 'month'>('all');
  const [boutiques, setBoutiques] = useState<Boutique[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Report data states
  const [salesReport, setSalesReport] = useState<BoutiqueSalesReport | null>(null);
  const [comparisonReport, setComparisonReport] = useState<ComparisonReport | null>(null);

  const reportRef = useRef<HTMLDivElement>(null);

  const isAdmin = user.role === 'ROLE_ADMIN';

  // Load boutiques
  useEffect(() => {
    const loadBoutiques = async () => {
      try {
        const bts = await boutiqueService.getBoutiques();
        setBoutiques(bts);
        if (isAdmin && !selectedBoutique && bts.length > 0) {
          setSelectedBoutique(bts[0].id);
        }
        // For boutique users: ensure selectedBoutique is set
        if (!isAdmin && !selectedBoutique && bts.length > 0) {
          const boutiqueId = user.boutique?.id || user.boutiqueId;
          const match = bts.find(b => b.id === boutiqueId);
          setSelectedBoutique(match?.id || bts[0].id);
        }
      } catch (err) {
        console.error('Error loading boutiques:', err);
      }
    };
    loadBoutiques();
  }, []);

  // Generate report when filters change
  useEffect(() => {
    generateReport();
  }, [activeTab, selectedBoutique, period]);

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'sales' && selectedBoutique) {
        const data = await reportService.getBoutiqueSales(selectedBoutique, period);
        setSalesReport(data);
      } else if (activeTab === 'comparison' && isAdmin) {
        const data = await reportService.getComparison();
        setComparisonReport(data);
      }
    } catch (err: any) {
      console.error('Error generating report:', err);
      const message = err?.response?.data?.message || err?.message || 'Erreur inconnue';
      setError(`Erreur: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    try {
      setIsGenerating(true);
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#f8fafc',
        onclone: (clonedDoc) => {
          const elements = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < elements.length; i++) {
            const el = elements[i] as HTMLElement;
            const style = clonedDoc.defaultView?.getComputedStyle(el);
            if (style) {
              const props = [
                { name: 'color', fallback: '#000000' },
                { name: 'backgroundColor', fallback: '#ffffff' },
                { name: 'borderColor', fallback: '#e2e8f0' },
                { name: 'outlineColor', fallback: '#000000' },
              ];
              props.forEach((prop) => {
                const value = el.style.getPropertyValue(prop.name) || style.getPropertyValue(prop.name);
                if (value && value.includes('oklch')) {
                  el.style.setProperty(prop.name, prop.fallback, 'important');
                }
              });
            }
          }
        },
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2],
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`rapport-${activeTab}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erreur lors de la génération du PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ─── Tab definitions ────────────────────────
  const tabs: { id: ReportTab; label: string; icon: any; adminOnly?: boolean }[] = [
    { id: 'sales', label: 'Ventes Boutique', icon: ShoppingCart },
  ];
  if (isAdmin) {
    tabs.push({ id: 'comparison', label: 'Comparaison', icon: Trophy, adminOnly: true });
  }

  // ─── SALES REPORT RENDER ─────────────────────
  const renderSalesReport = () => {
    if (!salesReport) return <EmptyState />;
    const { totalRevenue, totalTransactions, articlesSold, recentSales, transferItems, stockSummary, lowStockCount, outOfStockCount } = salesReport;

    return (
      <div className="space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <SummaryCard
            icon={TrendingUp}
            label="Chiffre d'Affaires Total"
            value={`${totalRevenue.toLocaleString()} FCFA`}
            variant="primary"
          />
          <SummaryCard
            icon={ShoppingCart}
            label="Transactions"
            value={totalTransactions.toString()}
          />
          <SummaryCard
            icon={ArrowLeftRight}
            label="Navettes"
            value={transferItems.length.toString()}
            variant="indigo"
          />
          <SummaryCard
            icon={AlertTriangle}
            label="Alertes Stock"
            value={(lowStockCount + outOfStockCount).toString()}
            variant="warning"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Products */}
          <div className="card border-none shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-brand-dark flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-brand-blue" />
                Articles Vendus
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {articlesSold.length} article{articlesSold.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {articlesSold.map((p, i) => {
                const maxQty = Math.max(...articlesSold.map((a) => a.quantity), 1);
                return (
                  <div key={i} className="group p-4 bg-slate-50 rounded-xl hover:bg-white hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 flex items-center justify-center bg-brand-blue text-white text-[10px] font-black rounded-full">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-brand-dark">{p.productName}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            {p.quantity} unité{p.quantity > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <p className="font-black text-brand-blue text-sm">{p.revenue.toLocaleString()} FCFA</p>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(p.quantity / maxQty) * 100}%` }}
                        transition={{ duration: 0.6, delay: i * 0.08 }}
                        className="h-full rounded-full bg-gradient-to-r from-brand-blue to-brand-accent"
                      />
                    </div>
                  </div>
                );
              })}
              {articlesSold.length === 0 && (
                <p className="text-center py-10 text-slate-400 italic">Aucune vente enregistrée</p>
              )}
            </div>
          </div>

          {/* Recent Sales */}
          <div className="card border-none shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-brand-dark flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-blue" />
                Dernières Ventes
              </h3>
            </div>
            <div className="overflow-x-auto whitespace-nowrap">
              <table className="w-full min-w-max">
                <thead>
                  <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <th className="pb-4">Date</th>
                    <th className="pb-4">N° Facture</th>
                    <th className="pb-4 text-center">Articles</th>
                    <th className="pb-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentSales.map((t, i) => (
                    <motion.tr
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="text-sm hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-4">
                        <div className="flex items-center gap-2 text-slate-500 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {t.timestamp ? new Date(t.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                        </div>
                      </td>
                      <td className="py-4 font-mono font-bold text-brand-blue text-xs">{t.invoiceNumber}</td>
                      <td className="py-4 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 bg-slate-100 text-slate-600 text-xs font-black rounded-full">
                          {t.itemsCount}
                        </span>
                      </td>
                      <td className="py-4 text-right font-black text-brand-dark">
                        {Number(t.totalPrice).toLocaleString()} FCFA
                      </td>
                    </motion.tr>
                  ))}
                  {recentSales.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-slate-400 italic">
                        Aucune transaction
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Transfer Items & Stock Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Transfer Items */}
          {transferItems.length > 0 && (
            <div className="card border-none shadow-lg">
              <h3 className="text-lg font-bold text-brand-dark flex items-center gap-2 mb-6">
                <ArrowLeftRight className="w-5 h-5 text-indigo-500" />
                Articles Transférés
              </h3>
              <div className="space-y-3">
                {transferItems.map((t, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <Package className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-brand-dark">{t.productName}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          Provenance: {t.sourceBoutique}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-black text-indigo-600">x{t.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stock Summary */}
          <div className="card border-none shadow-lg">
            <h3 className="text-lg font-bold text-brand-dark flex items-center gap-2 mb-6">
              <Package className="w-5 h-5 text-brand-blue" />
              État du Stock
            </h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {stockSummary.map((s, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                    s.isOutOfStock
                      ? 'bg-red-50 border border-red-100'
                      : s.isLowStock
                      ? 'bg-amber-50 border border-amber-100'
                      : 'bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        s.isOutOfStock ? 'bg-red-500 animate-pulse' : s.isLowStock ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                    />
                    <p className="text-sm font-bold text-brand-dark">{s.productName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-black px-2 py-0.5 rounded-md ${
                        s.isOutOfStock
                          ? 'bg-red-100 text-red-700'
                          : s.isLowStock
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {s.quantity}
                    </span>
                    {s.isOutOfStock && (
                      <span className="text-[9px] font-black text-red-600 uppercase tracking-widest">Rupture</span>
                    )}
                    {s.isLowStock && !s.isOutOfStock && (
                      <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Bas</span>
                    )}
                  </div>
                </div>
              ))}
              {stockSummary.length === 0 && (
                <p className="text-center py-10 text-slate-400 italic">Aucune donnée de stock</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ─── COMPARISON REPORT RENDER ────────────────
  const renderComparisonReport = () => {
    if (!comparisonReport) return <EmptyState />;
    const { boutiques: compBoutiques, topBoutique } = comparisonReport;
    const maxRevenue = Math.max(...compBoutiques.map((b) => b.totalRevenue), 1);

    return (
      <div className="space-y-8">
        {/* Winner */}
        {topBoutique && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card border-none shadow-lg bg-gradient-to-r from-brand-blue to-brand-accent text-white"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Trophy className="w-7 h-7 text-amber-300" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest opacity-70">Meilleure boutique (toutes ventes)</p>
                <p className="text-2xl font-black">{topBoutique.split(' - ')[0]}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Ranking Table */}
        <div className="card border-none shadow-lg overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-brand-dark flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-brand-blue" />
              Classement des Boutiques
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {compBoutiques.length} boutique{compBoutiques.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="overflow-x-auto whitespace-nowrap">
            <table className="w-full min-w-max">
              <thead>
                <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="pb-4 pl-2">#</th>
                  <th className="pb-4">Boutique</th>
                  <th className="pb-4 text-right">Chiffre d'Affaires</th>
                  <th className="pb-4 text-center">Ventes</th>
                  <th className="pb-4 text-center">Stock</th>
                  <th className="pb-4 text-center">Ruptures</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {compBoutiques.map((b, i) => (
                  <motion.tr
                    key={b.boutique.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-4 pl-2">
                      {i === 0 ? (
                        <span className="w-7 h-7 flex items-center justify-center bg-amber-100 text-amber-700 text-xs font-black rounded-full">
                          🥇
                        </span>
                      ) : i === 1 ? (
                        <span className="w-7 h-7 flex items-center justify-center bg-slate-100 text-slate-600 text-xs font-black rounded-full">
                          🥈
                        </span>
                      ) : i === 2 ? (
                        <span className="w-7 h-7 flex items-center justify-center bg-orange-50 text-orange-700 text-xs font-black rounded-full">
                          🥉
                        </span>
                      ) : (
                        <span className="w-7 h-7 flex items-center justify-center bg-slate-50 text-slate-400 text-xs font-black rounded-full">
                          {i + 1}
                        </span>
                      )}
                    </td>
                    <td className="py-4">
                      <div>
                        <p className="font-bold text-brand-dark">{b.boutique.name.split(' - ')[0]}</p>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden max-w-[200px]">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(b.totalRevenue / maxRevenue) * 100}%` }}
                            transition={{ duration: 0.7, delay: i * 0.1 }}
                            className="h-full rounded-full bg-gradient-to-r from-brand-blue to-brand-accent"
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-right font-black text-brand-blue">
                      {b.totalRevenue.toLocaleString()} FCFA
                    </td>
                    <td className="py-4 text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-black rounded-lg">
                        {b.completedSales}
                      </span>
                    </td>
                    <td className="py-4 text-center font-bold text-slate-600">{b.totalStock}</td>
                    <td className="py-4 text-center">
                      {b.outOfStockCount > 0 ? (
                        <span className="inline-flex items-center justify-center px-2.5 py-1 bg-red-50 text-red-700 text-xs font-black rounded-lg">
                          {b.outOfStockCount}
                        </span>
                      ) : (
                        <span className="text-emerald-500 text-xs font-bold">✓ OK</span>
                      )}
                    </td>
                  </motion.tr>
                ))}
                {compBoutiques.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400 italic">
                      Aucune donnée de comparaison
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8" ref={reportRef}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-brand-blue rounded-lg">
              <Store className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-brand-dark tracking-tight">Rapports</h2>
          </div>
          <p className="text-sm text-slate-500 ml-12">
            {activeTab === 'sales'
              ? `Rapport des ventes — ${boutiques.find(b => b.id === selectedBoutique)?.name || 'Sélectionnez une boutique'}` + 
                (period === 'day' ? ' (Aujourd\'hui)' : period === 'week' ? ' (Cette semaine)' : period === 'month' ? ' (Ce mois)' : ' (Global)')
              : 'Comparaison globale de toutes les boutiques'}
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Tab Selector */}
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                  activeTab === tab.id
                    ? 'bg-brand-blue text-white shadow-md'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Boutique Selector (only for sales tab) */}
          {activeTab === 'sales' && (
            <>
              {isAdmin && (
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                  <Store className="w-4 h-4 text-slate-400" />
                  <select
                    className="bg-transparent text-sm font-bold text-slate-600 outline-none w-full"
                    value={selectedBoutique}
                    onChange={(e) => setSelectedBoutique(e.target.value)}
                  >
                    {boutiques.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name.split(' - ')[0]}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Period Selector */}
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                <Clock className="w-4 h-4 text-slate-400" />
                <select
                  className="bg-transparent text-sm font-bold text-slate-600 outline-none w-full"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as any)}
                >
                  <option value="all">Global (Tout)</option>
                  <option value="day">Aujourd'hui</option>
                  <option value="week">Cette semaine</option>
                  <option value="month">Ce mois</option>
                </select>
              </div>
            </>
          )}

          {/* Refresh */}
          <button
            onClick={generateReport}
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 transition-colors shadow-sm"
            title="Actualiser"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* PDF & Print */}
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={() => window.print()}
              className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 transition-colors shadow-sm"
              title="Imprimer"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="p-2.5 bg-brand-blue hover:bg-brand-accent text-white rounded-xl transition-colors shadow-sm disabled:opacity-50"
              title="Télécharger PDF"
            >
              {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-brand-blue" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'sales' && renderSalesReport()}
            {activeTab === 'comparison' && renderComparisonReport()}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Footer */}
      <div className="text-center pt-10 border-t border-slate-200">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mb-2">
          Donald Gros Management System • Rapport Officiel
        </p>
        <p className="text-xs text-slate-500 italic">
          Généré le {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

// ─── Reusable Components ───────────────────────

function SummaryCard({
  icon: Icon,
  label,
  value,
  variant = 'default',
}: {
  icon: any;
  label: string;
  value: string;
  variant?: 'primary' | 'indigo' | 'warning' | 'default';
}) {
  const styles = {
    primary: 'bg-brand-blue text-white',
    indigo: 'bg-indigo-50 border border-indigo-100',
    warning: 'bg-amber-50 border border-amber-100',
    default: 'bg-white border border-slate-100',
  };

  const iconStyles = {
    primary: 'bg-white/10 text-white',
    indigo: 'bg-indigo-100 text-indigo-600',
    warning: 'bg-amber-100 text-amber-600',
    default: 'bg-blue-50 text-blue-600',
  };

  const labelStyles = {
    primary: 'opacity-70 text-white',
    indigo: 'text-slate-400',
    warning: 'text-slate-400',
    default: 'text-slate-400',
  };

  const valueStyles = {
    primary: 'text-white',
    indigo: 'text-indigo-700',
    warning: 'text-amber-700',
    default: 'text-brand-dark',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl shadow-md p-5 ${styles[variant]}`}
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${iconStyles[variant]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${labelStyles[variant]}`}>{label}</p>
          <p className={`text-xl font-black ${valueStyles[variant]}`}>{value}</p>
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
        <FileText className="w-8 h-8 text-slate-300" />
      </div>
      <p className="text-lg font-bold text-slate-600">Aucune donnée disponible</p>
      <p className="text-sm text-slate-400 mt-1">Sélectionnez une boutique pour voir le rapport</p>
    </div>
  );
}
