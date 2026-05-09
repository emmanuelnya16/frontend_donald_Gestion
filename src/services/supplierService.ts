/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import api from '../lib/api';
import { Supplier, SupplierDetail } from '../types';

export const supplierService = {
  // GET /api/suppliers — Liste des fournisseurs
  getAll: async (): Promise<Supplier[]> => {
    const response = await api.get<Supplier[]>('/api/suppliers');
    return Array.isArray(response.data) ? response.data : [];
  },

  // GET /api/suppliers/{id} — Détail avec produits et stats
  getById: async (id: string): Promise<SupplierDetail> => {
    const response = await api.get<SupplierDetail>(`/api/suppliers/${id}`);
    return response.data;
  },

  // POST /api/suppliers — Créer un fournisseur
  create: async (data: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    description?: string;
    boutiqueId?: string;
  }): Promise<Supplier> => {
    const response = await api.post<Supplier>('/api/suppliers', data);
    return response.data;
  },

  // PUT /api/suppliers/{id} — Modifier un fournisseur
  update: async (id: string, data: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    description?: string;
  }): Promise<Supplier> => {
    const response = await api.put<Supplier>(`/api/suppliers/${id}`, data);
    return response.data;
  },

  // PATCH /api/suppliers/{id}/status — Activer/Désactiver
  toggleStatus: async (id: string): Promise<{ message: string; status: string }> => {
    const response = await api.patch<{ message: string; status: string }>(
      `/api/suppliers/${id}/status`
    );
    return response.data;
  },

  // POST /api/suppliers/{id}/products — Associer un produit
  addProduct: async (
    supplierId: string,
    productId: string,
    purchasePrice?: number
  ): Promise<any> => {
    const response = await api.post(`/api/suppliers/${supplierId}/products`, {
      productId,
      purchasePrice,
    });
    return response.data;
  },

  // DELETE /api/suppliers/{id}/products/{productId} — Retirer un produit
  removeProduct: async (supplierId: string, productId: string): Promise<void> => {
    await api.delete(`/api/suppliers/${supplierId}/products/${productId}`);
  },
};
