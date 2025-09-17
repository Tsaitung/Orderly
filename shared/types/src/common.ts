export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export enum UserRole {
  ADMIN = 'admin',
  RESTAURANT_OWNER = 'restaurant_owner',
  RESTAURANT_STAFF = 'restaurant_staff', 
  SUPPLIER_OWNER = 'supplier_owner',
  SUPPLIER_STAFF = 'supplier_staff',
  PLATFORM_ADMIN = 'platform_admin'
}

export enum OrderStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  ACCEPTED = 'accepted',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum AcceptanceStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  COMPLETED = 'completed',
  REJECTED = 'rejected'
}

export enum BillingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  DISPUTED = 'disputed',
  PAID = 'paid'
}