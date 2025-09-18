export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  supplierId: string;
  
  // Pricing
  unitPrice: number;
  minOrderQuantity: number;
  maxOrderQuantity?: number;
  
  // Inventory
  stockQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  
  // Specifications
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  packageType: string;
  shelfLife?: number; // in days
  storageConditions?: string;
  
  // Status
  status: ProductStatus;
  isActive: boolean;
  
  // Metadata
  tags: string[];
  images: string[];
  certifications?: string[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCONTINUED = 'discontinued',
  OUT_OF_STOCK = 'out_of_stock',
  PENDING_APPROVAL = 'pending_approval',
}

export interface CreateProductRequest {
  sku: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  supplierId: string;
  unitPrice: number;
  minOrderQuantity: number;
  maxOrderQuantity?: number;
  stockQuantity: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  packageType: string;
  shelfLife?: number;
  storageConditions?: string;
  tags?: string[];
  images?: string[];
  certifications?: string[];
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  category?: string;
  brand?: string;
  unitPrice?: number;
  minOrderQuantity?: number;
  maxOrderQuantity?: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  packageType?: string;
  shelfLife?: number;
  storageConditions?: string;
  status?: ProductStatus;
  isActive?: boolean;
  tags?: string[];
  images?: string[];
  certifications?: string[];
}

export interface ProductFilters {
  supplierId?: string;
  category?: string[];
  brand?: string[];
  status?: ProductStatus[];
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  tags?: string[];
  search?: string;
}

export interface InventoryUpdate {
  productId: string;
  type: 'add' | 'remove' | 'set' | 'reserve' | 'release';
  quantity: number;
  reason?: string;
  orderId?: string;
}

export interface ProductSummary {
  totalProducts: number;
  activeProducts: number;
  inStockProducts: number;
  outOfStockProducts: number;
  totalValue: number;
  categoryBreakdown: Record<string, number>;
  statusBreakdown: Record<ProductStatus, number>;
  lowStockProducts: Product[];
}