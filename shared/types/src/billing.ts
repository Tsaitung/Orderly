import { BillingStatus } from './common';

export interface Bill {
  id: string;
  billNumber: string;
  restaurantId: string;
  supplierId: string;
  period: 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  totalAmount: number;
  paidAmount: number;
  status: BillingStatus;
  dueDate: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  items: BillItem[];
}

export interface BillItem {
  id: string;
  billId: string;
  orderId: string;
  orderNumber: string;
  orderDate: Date;
  totalAmount: number;
  acceptedAmount: number;
  adjustmentAmount: number;
  finalAmount: number;
  notes?: string;
}

export interface BillDispute {
  id: string;
  billId: string;
  billItemId?: string;
  disputedBy: string;
  reason: string;
  description: string;
  disputedAmount: number;
  status: 'pending' | 'resolved' | 'rejected';
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  billId: string;
  amount: number;
  method: 'bank_transfer' | 'credit_card' | 'cash' | 'check';
  reference?: string;
  paidBy: string;
  paidAt: Date;
  notes?: string;
  createdAt: Date;
}

export interface CreateBillRequest {
  restaurantId: string;
  supplierId: string;
  period: 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
}

export interface CreateDisputeRequest {
  billItemId?: string;
  reason: string;
  description: string;
  disputedAmount: number;
}

export interface CreatePaymentRequest {
  amount: number;
  method: 'bank_transfer' | 'credit_card' | 'cash' | 'check';
  reference?: string;
  notes?: string;
}