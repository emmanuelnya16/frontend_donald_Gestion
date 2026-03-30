/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Printer, Download, X, RefreshCw, Store } from 'lucide-react';
import { Sale, Boutique, Product } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface InvoiceModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function InvoiceModal({ sale, isOpen, onClose }: InvoiceModalProps) {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;
    
    try {
      setIsGenerating(true);
      console.log('Starting PDF generation...');
      
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const elements = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < elements.length; i++) {
            const el = elements[i] as HTMLElement;
            const style = clonedDoc.defaultView?.getComputedStyle(el);
            if (style) {
              // Check common properties for oklch
              const props = [
                { name: 'color', fallback: '#000000' },
                { name: 'backgroundColor', fallback: '#ffffff' },
                { name: 'borderColor', fallback: '#e2e8f0' },
                { name: 'outlineColor', fallback: '#000000' }
              ];
              
              props.forEach(prop => {
                const value = el.style.getPropertyValue(prop.name) || style.getPropertyValue(prop.name);
                if (value && value.includes('oklch')) {
                  el.style.setProperty(prop.name, prop.fallback, 'important');
                }
              });
            }
          }
        }
      });
      
      console.log('Canvas generated, size:', canvas.width, 'x', canvas.height);
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`facture-${sale.invoiceNumber}.pdf`);
      console.log('PDF saved successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Une erreur est survenue lors de la génération du PDF. Veuillez réessayer.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="invoice-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-dark/60 backdrop-blur-sm print:p-0 print:bg-white print:static print:z-auto"
        >
          <motion.div 
            key="invoice-modal-content"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden print:shadow-none print:rounded-none print:max-w-none"
          >
            <div className="p-6 bg-brand-blue text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-3">
                <Printer className="w-6 h-6" />
                <h3 className="text-xl font-bold">Facture Numérique</h3>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-12 space-y-10 bg-white" id="invoice-content" ref={invoiceRef} style={{ width: '500px', margin: '0 auto' }}>
              <div className="text-center border-b-2 border-slate-100 pb-8">
                <div className="inline-block p-3 bg-brand-blue rounded-2xl mb-4">
                  <Store className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-4xl font-black text-brand-blue tracking-tighter leading-none">Donald Gros</h4>
                <div className="mt-4 space-y-1">
                  <p className="text-sm text-slate-600 font-bold uppercase tracking-[0.2em]">
                    {sale.boutique.name}
                  </p>
                  <p className="text-xs text-slate-400 font-medium">
                    {new Date(sale.timestamp).toLocaleDateString('fr-FR', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-xs text-slate-400 font-black uppercase tracking-widest">N° Facture</span>
                  <span className="font-mono font-bold text-brand-dark bg-slate-100 px-3 py-1 rounded-md text-sm">#{sale.invoiceNumber}</span>
                </div>
                
                <div className="space-y-4 pt-2">
                  <div className="border-b border-slate-100 pb-2 mb-2">
                    <div className="grid grid-cols-12 gap-2 text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">
                      <div className="col-span-6">Désignation</div>
                      <div className="col-span-2 text-center">Qté</div>
                      <div className="col-span-4 text-right">Prix</div>
                    </div>
                  </div>

                  {sale.items?.map((item, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-6 flex flex-col">
                          <span className="text-sm font-bold text-brand-dark leading-tight">
                            {item.product.name}
                          </span>
                        </div>
                        <div className="col-span-2 text-center">
                          <p className="text-sm font-black text-brand-dark">x{item.quantity}</p>
                        </div>
                        <div className="col-span-4 text-right">
                          <span className="text-sm font-bold text-slate-600">{item.unitPrice.toLocaleString()} FCFA</span>
                        </div>
                      </div>

                      {item.isTransfer && item.sourceBoutique && (
                        <div className="p-2 bg-indigo-50/50 rounded-xl border border-indigo-100/50 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                          <p className="text-[8px] text-indigo-700 font-bold uppercase tracking-widest">
                            Provenance: {item.sourceBoutique.name.split(' - ')[0]}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-8 border-t-4 border-double border-slate-200">
                <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-400 font-black uppercase tracking-widest mb-1">Net à Payer</span>
                    <span className="text-4xl font-black text-brand-blue tracking-tighter">
                      {sale.totalPrice.toLocaleString()} <span className="text-xl">FCFA</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-center pt-10 border-t border-slate-50">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mb-2">Donald Gros Management System</p>
                <p className="text-xs text-slate-500 italic">Merci de votre confiance et à très bientôt !</p>
              </div>
            </div>

            <div className="p-6 bg-slate-50 flex gap-4 print:hidden">
              <button 
                onClick={handlePrint}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                <Printer className="w-5 h-5" /> Imprimer
              </button>
              <button 
                onClick={handleDownloadPDF}
                disabled={isGenerating}
                className="flex-1 px-4 py-2 border-2 border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
                PDF
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
