/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'ROLE_ADMIN' | 'ROLE_BOUTIQUE';

export interface User {
  id: string;
  email: string;
  password?: string; // Only for initial mock, not stored in clear
  role: Role;
  boutiqueId?: string; // Assigned boutique for sellers
  boutique?: {
    id: string;
    name: string;
  };
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Boutique {
  id: string;
  name: string;
  location: string;
  address?: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Product {
  id: string;
  name: string;
  category: string | null;
  basePrice: number;
  description: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  createdAt?: string;
}

export interface StockItem {
  id: string;
  product: {
    id: string;
    name: string;
    category: string | null;
    basePrice: number;
  };
  boutique: {
    id: string;
    name: string;
  };
  quantity: number;
  localPrice: number | null;
  effectivePrice: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  updatedAt?: string;
}

export interface SaleItem {
  id: string;
  product: {
    id: string;
    name: string;
  };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isTransfer: boolean;
  sourceBoutique?: {
    id: string;
    name: string;
  };
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  boutique: {
    id: string;
    name: string;
  };
  totalPrice: number;
  status: 'COMPLETED' | 'CANCELLED' | 'RETURNED';
  timestamp: string;
  itemsCount: number;
  items?: SaleItem[];
  correction?: {
    reason: string;
    correctedBy: string;
    correctedAt: string;
  };
}

export interface StockMovement {
  id: string;
  product: {
    id: string;
    name: string;
  };
  boutique: {
    id: string;
    name: string;
  };
  type: 'IN' | 'OUT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUSTMENT';
  quantity: number;
  referenceId?: string;
  note?: string;
  timestamp: string;
}

export interface Transfer {
  id: string;
  sourceBoutique: {
    id: string;
    name: string;
  };
  destBoutique: {
    id: string;
    name: string;
  };
  product: {
    id: string;
    name: string;
  };
  quantity: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  reason?: string;
  timestamp: string;
}

export interface CreateSaleItem {
  productId: string;
  quantity: number;
  unitPrice?: number;
  sourceBoutiqueId?: string;
}

export interface CreateSaleRequest {
  boutiqueId: string;
  items: CreateSaleItem[];
}

export interface DashboardStats {
  totalSalesToday: number;
  transactionCount: number;
  lowStockCount: number;
  transferCount: number;
}
