/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Search, Package, RefreshCw } from 'lucide-react';
import { Product, StockItem } from '../types';
import { productService } from '../services/productService';
import { stockService } from '../services/stockService';

interface SmartSearchProps {
  onSelect: (product: Product, stock: StockItem[]) => void;
  currentBoutiqueId: string;
}

export default function SmartSearch({ onSelect, currentBoutiqueId }: SmartSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [allStock, setAllStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchInitialStock = async () => {
      try {
        const stockData = await stockService.getAll();
        setAllStock(stockData);
      } catch (err) {
        console.error('Error fetching initial stock for search:', err);
      }
    };
    fetchInitialStock();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchProducts = async () => {
      if (query.trim().length > 0 && currentBoutiqueId) {
        setLoading(true);
        try {
          const filtered = await productService.search(query, currentBoutiqueId);
          setResults(filtered.slice(0, 10));
          setIsOpen(true);
        } catch (err) {
          console.error('Error searching products:', err);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
        setIsOpen(false);
      }
    };

    const timeoutId = setTimeout(searchProducts, 300);
    return () => clearTimeout(timeoutId);
  }, [query, currentBoutiqueId]);

  const handleSelect = (product: any) => {
    // Map the backend stockByBoutique to the frontend StockItem type if needed
    const productStock: StockItem[] = (product.stockByBoutique || []).map((s: any) => ({
      id: s.id || '', // Backend search might not return stockItem ID directly, but we can mock it or use boutiqueId
      product: { id: product.id, name: product.name, category: product.category, basePrice: product.basePrice },
      boutique: { id: s.boutiqueId, name: s.boutiqueName },
      quantity: s.quantity,
      localPrice: s.localPrice,
      effectivePrice: s.localPrice || product.basePrice,
      lowStockThreshold: 5, // Default
      isLowStock: s.quantity <= 5,
      isOutOfStock: s.quantity === 0
    }));

    onSelect(product as Product, productStock);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          className="input-field pl-12 py-4 text-lg"
          placeholder="Rechercher un article (ex: Chemise, Veste...)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length > 0 && setIsOpen(true)}
        />
        {loading && (
          <RefreshCw className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-blue animate-spin" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-[400px] overflow-y-auto">
          {results.map((product: any) => {
            const localStock = product.localStock || 0;
            const totalStock = (product.stockByBoutique || []).reduce((acc: number, s: any) => acc + s.quantity, 0);
            const otherStock = totalStock - localStock;

            return (
              <button
                key={product.id}
                onClick={() => handleSelect(product)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-none"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-brand-blue">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-brand-dark">{product.name}</p>
                    <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">{product.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-brand-blue">{product.basePrice.toLocaleString()} FCFA</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      localStock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                    }`}>
                      Local: {localStock}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-blue-50 text-blue-600">
                      Réseau: {otherStock}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
