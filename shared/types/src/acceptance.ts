import { AcceptanceStatus } from './common';

export interface Acceptance {
  id: string;
  orderId: string;
  restaurantId: string;
  supplierId: string;
  status: AcceptanceStatus;
  acceptedBy: string;
  acceptedAt?: Date;
  notes?: string;
  photos: string[];
  createdAt: Date;
  updatedAt: Date;
  items: AcceptanceItem[];
}

export interface AcceptanceItem {
  id: string;
  acceptanceId: string;
  orderItemId: string;
  productId: string;
  orderedQuantity: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  rejectionReason?: string;
  photos: string[];
  notes?: string;
}

export interface AcceptanceDiscrepancy {
  id: string;
  acceptanceItemId: string;
  type: 'quantity' | 'quality' | 'damage' | 'expiry';
  description: string;
  photos: string[];
  resolution?: 'refund' | 'replacement' | 'credit';
  resolutionNotes?: string;
  resolvedAt?: Date;
  createdAt: Date;
}

export interface CreateAcceptanceRequest {
  orderId: string;
  notes?: string;
  photos: string[];
  items: CreateAcceptanceItemRequest[];
}

export interface CreateAcceptanceItemRequest {
  orderItemId: string;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  rejectionReason?: string;
  photos?: string[];
  notes?: string;
}

export interface CreateDiscrepancyRequest {
  acceptanceItemId: string;
  type: 'quantity' | 'quality' | 'damage' | 'expiry';
  description: string;
  photos: string[];
}