export interface Product {
  id: string;
  name: string;
  description?: string;
  sku: string;
  categoryId: string;
  supplierId: string;
  price: number;
  unit: string;
  minOrderQuantity: number;
  stockQuantity: number;
  images: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  level: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductFavorite {
  id: string;
  userId: string;
  productId: string;
  createdAt: Date;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  sku: string;
  categoryId: string;
  price: number;
  unit: string;
  minOrderQuantity: number;
  stockQuantity: number;
  images?: string[];
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  price?: number;
  stockQuantity?: number;
  minOrderQuantity?: number;
  isActive?: boolean;
}

export interface ProductSearchQuery {
  keyword?: string;
  categoryId?: string;
  supplierId?: string;
  minPrice?: number;
  maxPrice?: number;
  isActive?: boolean;
}