/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Printer, Download, X, RefreshCw } from 'lucide-react';
import { Sale } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import logoImg from '../assets/logo.jpg';

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
    const content = document.getElementById('invoice-content');
    if (!content) return;

    // Open a clean popup window — no modal overlay interference
    const printWindow = window.open(
      '',
      'ticket-impression',
      'width=400,height=700,scrollbars=yes'
    );
    if (!printWindow) {
      alert("Le navigateur a bloqué la popup. Autorisez les popups pour ce site.");
      return;
    }

    // Inline CSS for the ticket — fully self-contained, no external deps
    const ticketCSS = `
      @page { size: 80mm auto; margin: 0; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 80mm;
        margin: 0 auto;
        padding: 4mm 4mm 20mm 4mm;
        font-family: "Courier New", Courier, monospace;
        font-size: 11px;
        line-height: 1.5;
        color: #000;
        background: #fff;
      }
      div { font-family: inherit; }
      span { font-family: inherit; }
      img { display: block; margin: 0 auto; }
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="utf-8">
          <title>Ticket #${sale.invoiceNumber}</title>
          <style>${ticketCSS}</style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    // Wait for fonts/layout, then print and close
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;

    try {
      setIsGenerating(true);

      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
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

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width / 2, canvas.height / 2]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`facture-${sale.invoiceNumber}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Une erreur est survenue lors de la génération du PDF. Veuillez réessayer.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Star separator
  const starSeparator = '********************************';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="invoice-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-dark/60 backdrop-blur-sm"
          id="invoice-modal-overlay"
        >
          <motion.div
            key="invoice-modal-content"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            style={{ width: '340px' }}
          >
            {/* Header bar — hidden during print */}
            <div className="p-4 bg-brand-blue text-white flex items-center justify-between print-hide">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5" />
                <h3 className="text-base font-bold">Ticket de Caisse</h3>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable ticket content */}
            <div className="overflow-y-auto flex-1">
              <div
                id="invoice-content"
                ref={invoiceRef}
                style={{
                  width: '80mm',
                  margin: '0 auto',
                  padding: '6mm 4mm',
                  fontFamily: '"Courier New", Courier, monospace',
                  fontSize: '11px',
                  lineHeight: '1.5',
                  color: '#000',
                  backgroundColor: '#fff',
                }}
              >
                {/* ===== 1. HEADER ENTREPRISE ===== */}
                <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                  {/* Logo */}
                  <img
                    src={logoImg}
                    alt="Logo"
                    style={{
                      width: '60px',
                      height: 'auto',
                      display: 'block',
                      margin: '0 auto 4px auto',
                    }}
                  />
                  {/* Nom entreprise */}
                  <div style={{ fontSize: '14px', fontWeight: 'bold', letterSpacing: '1px' }}>
                    DONALD GROS SARL
                  </div>
                  {/* Description activité */}
                  <div style={{ fontSize: '9px', marginTop: '2px' }}>
                    VENTES DES VETEMENTS HOMME FEMME
                  </div>
                  <div style={{ fontSize: '9px' }}>
                    ET ACCESSOIRE
                  </div>
                  {/* Téléphone */}
                  <div style={{ fontSize: '9px', marginTop: '2px' }}>
                    Tel: 680449195 / 678556373
                  </div>
                  {/* RCCM & NIU */}
                  <div style={{ fontSize: '9px' }}>
                    RCCM: RC/YAO/2023/B/22
                  </div>
                  <div style={{ fontSize: '9px' }}>
                    NIU: M11 316290003M
                  </div>
                </div>

                {/* ===== 2. Séparateur étoile ===== */}
                <div style={{ textAlign: 'center', fontSize: '10px', marginBottom: '2px' }}>
                  {starSeparator}
                </div>

                {/* ===== 3. Informations facture ===== */}
                <div style={{ marginBottom: '2px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Date & heure:</span>
                    <span>
                      {new Date(sale.timestamp).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}{' '}
                      {new Date(sale.timestamp).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Ticket N°:</span>
                    <span style={{ fontWeight: 'bold' }}>{sale.invoiceNumber}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Boutique:</span>
                    <span style={{ fontWeight: 'bold', maxWidth: '55%', textAlign: 'right' }}>
                      {(sale.boutique?.name || '').split(' - ')[0]}
                    </span>
                  </div>
                </div>

                {/* ===== 4. Séparateur étoile ===== */}
                <div style={{ textAlign: 'center', fontSize: '10px' }}>
                  {starSeparator}
                </div>

                {/* ===== 5. En-tête tableau produits ===== */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 'bold',
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  padding: '2px 0',
                }}>
                  <span style={{ flex: 1 }}>Designation</span>
                  <span style={{ width: '30px', textAlign: 'center' }}>Qte</span>
                  <span style={{ width: '55px', textAlign: 'right' }}>P.U</span>
                  <span style={{ width: '65px', textAlign: 'right' }}>P.T</span>
                </div>

                <div style={{ textAlign: 'center', fontSize: '10px' }}>
                  --------------------------------
                </div>

                {/* ===== Items ===== */}
                <div style={{ marginBottom: '2px' }}>
                  {(sale.items || []).map((item, idx) => {
                    const itemTotal = (item.unitPrice || 0) * (item.quantity || 0);
                    return (
                      <div key={idx} style={{ marginBottom: '3px' }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                        }}>
                          <span style={{
                            flex: 1,
                            wordBreak: 'break-word',
                            paddingRight: '4px',
                            fontSize: '10px',
                          }}>
                            {item.product?.name || 'Produit'}
                          </span>
                          <span style={{ width: '30px', textAlign: 'center', fontSize: '10px' }}>
                            {item.quantity}
                          </span>
                          <span style={{ width: '55px', textAlign: 'right', fontSize: '10px' }}>
                            {(item.unitPrice || 0).toLocaleString()}
                          </span>
                          <span style={{ width: '65px', textAlign: 'right', fontSize: '10px', fontWeight: 'bold' }}>
                            {itemTotal.toLocaleString()}
                          </span>
                        </div>
                        {item.isTransfer && item.sourceBoutique && (
                          <div style={{ fontSize: '8px', paddingLeft: '4px' }}>
                            &gt; De: {item.sourceBoutique.name.split(' - ')[0]}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* ===== 6. Séparateur étoile ===== */}
                <div style={{ textAlign: 'center', fontSize: '10px' }}>
                  {starSeparator}
                </div>

                {/* ===== 7. TOTAL ===== */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  padding: '4px 0',
                }}>
                  <span>Total en FCFA</span>
                  <span>{(sale.totalPrice || 0).toLocaleString()}</span>
                </div>

                {/* ===== 8. Séparateur étoile ===== */}
                <div style={{ textAlign: 'center', fontSize: '10px' }}>
                  {starSeparator}
                </div>

                {/* ===== 9. Message de fin ===== */}
                <div style={{
                  textAlign: 'center',
                  marginTop: '6px',
                  marginBottom: '4px',
                }}>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    CHERS CLIENTS VOTRE SATISFACTION
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    RESTE NOTRE PRIORITE
                  </div>
                </div>

                {/* ===== 10. Espace bas pour coupe papier ===== */}
                <div style={{ height: '20mm' }}></div>
              </div>
            </div>

            {/* Action buttons — hidden during print */}
            <div className="p-4 bg-slate-50 flex gap-3 border-t border-slate-200 print-hide">
              <button
                onClick={handlePrint}
                className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm"
              >
                <Printer className="w-4 h-4" /> Imprimer
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={isGenerating}
                className="flex-1 px-3 py-2 border-2 border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
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
