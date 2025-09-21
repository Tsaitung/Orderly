'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Product, 
  ProductFilters, 
  ProductCreateRequest, 
  ProductUpdateRequest,
  ProductListResponse,
  ProductStatsResponse,
  BulkProductOperation,
  ProductPriceUpdate,
  ProductPerformance,
  CategoryPerformance,
  ImageUploadRequest,
  ImageUploadResponse
} from './product-types'

interface ProductHookResult {
  products: Product[];
  pagination?: ProductListResponse['pagination'];
  summary?: ProductListResponse['summary'];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createProduct: (data: ProductCreateRequest) => Promise<Product>;
  updateProduct: (id: string, data: ProductUpdateRequest) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
  bulkOperation: (operation: BulkProductOperation) => Promise<void>;
  updatePrice: (update: ProductPriceUpdate) => Promise<void>;
  uploadImage: (productId: string, image: ImageUploadRequest) => Promise<ImageUploadResponse>;
  deleteImage: (productId: string, imageId: string) => Promise<void>;
  updateFilters: (filters: ProductFilters) => void;
  isCreating: boolean;
  isUpdating: boolean;
  isBulkOperating: boolean;
}

// Mock API functions - replace with real API calls
const mockApiDelay = (ms: number = 500) => new Promise(resolve => setTimeout(resolve, ms));

const generateMockProducts = (): Product[] => [
  {
    id: 'prod-001',
    organization_id: 'org-001',
    sku: 'VEG-TOM-001',
    name: '有機牛番茄',
    description: '新鮮有機牛番茄，來自彰化在地農場，口感甜美多汁',
    category: 'fresh_produce',
    subcategory: '蔬菜',
    status: 'active',
    unit_type: 'kg',
    base_price: 120,
    currency: 'TWD',
    price_type: 'fixed',
    min_order_quantity: 5,
    max_order_quantity: 100,
    packaging_info: {
      package_type: '紙箱',
      units_per_package: 10,
      package_weight_kg: 10.5,
      refrigeration_required: true,
      shelf_life_days: 7
    },
    images: [
      {
        id: 'img-001',
        url: '/images/products/tomato-organic.jpg',
        alt_text: '有機牛番茄',
        is_primary: true,
        sort_order: 1,
        uploaded_at: new Date().toISOString()
      }
    ],
    specifications: {
      origin: '彰化縣',
      variety: '牛番茄',
      size: '大型',
      color: '紅色'
    },
    tags: ['有機', '新鮮', '本土', '蔬菜'],
    variants: [],
    quality_info: {
      origin: '彰化縣田尾鄉',
      organic_certified: true,
      quality_grade: 'A+',
      harvest_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    },
    supplier_notes: '產量穩定，品質優良，深受客戶喜愛',
    is_featured: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'prod-002',
    organization_id: 'org-001',
    sku: 'MEAT-PORK-001',
    name: '台灣豬梅花肉',
    description: '來自台灣在地養殖場的新鮮豬梅花肉，肉質鮮嫩，口感佳',
    category: 'meat_seafood',
    subcategory: '豬肉',
    status: 'active',
    unit_type: 'kg',
    base_price: 280,
    currency: 'TWD',
    price_type: 'fixed',
    min_order_quantity: 2,
    max_order_quantity: 50,
    packaging_info: {
      package_type: '真空包裝',
      units_per_package: 2,
      package_weight_kg: 2.0,
      refrigeration_required: true,
      shelf_life_days: 3
    },
    images: [],
    specifications: {
      origin: '台灣',
      meat_type: '梅花肉',
      grade: '優選'
    },
    tags: ['台灣豬', '新鮮', '優質'],
    variants: [
      {
        id: 'var-001',
        name: '厚切',
        sku_suffix: '-THICK',
        attributes: { cut: '厚切', thickness: '2cm' },
        price_modifier: 10,
        is_active: true
      },
      {
        id: 'var-002',
        name: '薄切',
        sku_suffix: '-THIN',
        attributes: { cut: '薄切', thickness: '0.5cm' },
        price_modifier: 0,
        is_active: true
      }
    ],
    quality_info: {
      origin: '雲林縣',
      organic_certified: false,
      quality_grade: 'A',
      storage_instructions: '冷藏保存，0-4°C'
    },
    supplier_notes: '每日新鮮宰殺，保證品質',
    is_featured: false,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'prod-003',
    organization_id: 'org-001',
    sku: 'VEG-CABBAGE-001',
    name: '高麗菜',
    description: '新鮮脆嫩的高麗菜，適合各種烹調方式',
    category: 'fresh_produce',
    subcategory: '蔬菜',
    status: 'active',
    unit_type: 'kg',
    base_price: 45,
    currency: 'TWD',
    price_type: 'tiered',
    min_order_quantity: 10,
    max_order_quantity: 200,
    packaging_info: {
      package_type: '塑膠袋',
      units_per_package: 20,
      refrigeration_required: true,
      shelf_life_days: 14
    },
    images: [],
    specifications: {
      origin: '台灣',
      variety: '平地高麗菜',
      season: '冬季'
    },
    tags: ['新鮮', '本土', '冬季', '蔬菜'],
    variants: [],
    quality_info: {
      origin: '彰化縣',
      organic_certified: false,
      quality_grade: 'A',
      harvest_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    },
    supplier_notes: '冬季產品，品質穩定',
    is_featured: false,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString()
  }
];

export function useProducts(organizationId?: string, filters: ProductFilters = {}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isBulkOperating, setIsBulkOperating] = useState(false);

  // Generate mock data
  const mockProducts = generateMockProducts();

  // Mock pagination and summary
  const mockPagination = {
    page: filters.page || 1,
    page_size: filters.page_size || 12,
    total_count: mockProducts.length,
    total_pages: Math.ceil(mockProducts.length / (filters.page_size || 12)),
    has_next: (filters.page || 1) < Math.ceil(mockProducts.length / (filters.page_size || 12)),
    has_previous: (filters.page || 1) > 1
  };

  const mockSummary = {
    total_products: mockProducts.length,
    active_products: mockProducts.filter(p => p.status === 'active').length
  };

  // Apply filters
  const applyFilters = useCallback((products: Product[], filters: ProductFilters): Product[] => {
    let filteredProducts = [...products];

    if (filters.search_query) {
      const query = filters.search_query.toLowerCase();
      filteredProducts = filteredProducts.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (filters.category) {
      filteredProducts = filteredProducts.filter(p => p.category === filters.category);
    }

    if (filters.status) {
      filteredProducts = filteredProducts.filter(p => p.status === filters.status);
    }

    if (filters.is_featured !== undefined) {
      filteredProducts = filteredProducts.filter(p => p.is_featured === filters.is_featured);
    }

    // Sorting
    if (filters.sort_by) {
      filteredProducts.sort((a, b) => {
        let aVal: any, bVal: any;
        
        switch (filters.sort_by) {
          case 'name':
            aVal = a.name;
            bVal = b.name;
            break;
          case 'price':
            aVal = a.base_price;
            bVal = b.base_price;
            break;
          case 'created_at':
            aVal = new Date(a.created_at);
            bVal = new Date(b.created_at);
            break;
          case 'category':
            aVal = a.category;
            bVal = b.category;
            break;
          default:
            return 0;
        }

        if (filters.sort_order === 'desc') {
          return bVal > aVal ? 1 : -1;
        }
        return aVal > bVal ? 1 : -1;
      });
    }

    return filteredProducts;
  }, []);

  // Load products
  const loadProducts = useCallback(async () => {
    if (!organizationId) return;

    setLoading(true);
    setError(null);
    
    try {
      await mockApiDelay();
      const filteredProducts = applyFilters(mockProducts, filters);
      setProducts(filteredProducts);
    } catch (err) {
      setError('Failed to load products');
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  }, [organizationId, filters, applyFilters]);

  // Create product
  const createProduct = useCallback(async (data: ProductCreateRequest): Promise<Product> => {
    setIsCreating(true);
    try {
      await mockApiDelay();
      
      const newProduct: Product = {
        id: `prod-${Date.now()}`,
        organization_id: organizationId || 'org-001',
        ...data,
        images: [],
        variants: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setProducts(prev => [newProduct, ...prev]);
      return newProduct;
    } finally {
      setIsCreating(false);
    }
  }, [organizationId]);

  // Update product
  const updateProduct = useCallback(async (id: string, data: ProductUpdateRequest): Promise<Product> => {
    setIsUpdating(true);
    try {
      await mockApiDelay();
      
      let updatedProduct: Product | null = null;
      setProducts(prev => prev.map(product => {
        if (product.id === id) {
          updatedProduct = {
            ...product,
            ...data,
            updated_at: new Date().toISOString()
          };
          return updatedProduct;
        }
        return product;
      }));

      if (!updatedProduct) {
        throw new Error('Product not found');
      }

      return updatedProduct;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  // Delete product
  const deleteProduct = useCallback(async (id: string): Promise<void> => {
    await mockApiDelay();
    setProducts(prev => prev.filter(product => product.id !== id));
  }, []);

  // Bulk operations
  const bulkOperation = useCallback(async (operation: BulkProductOperation): Promise<void> => {
    setIsBulkOperating(true);
    try {
      await mockApiDelay();
      
      setProducts(prev => prev.map(product => {
        if (!operation.product_ids.includes(product.id)) {
          return product;
        }

        let updatedProduct = { ...product };

        switch (operation.operation) {
          case 'update_status':
            if (operation.data.status) {
              updatedProduct.status = operation.data.status;
            }
            break;
          case 'update_price':
            if (operation.data.price_modifier) {
              updatedProduct.base_price += operation.data.price_modifier;
            }
            break;
          case 'delete':
            return null; // Will be filtered out
        }

        updatedProduct.updated_at = new Date().toISOString();
        return updatedProduct;
      }).filter(Boolean) as Product[]);
    } finally {
      setIsBulkOperating(false);
    }
  }, []);

  // Update price
  const updatePrice = useCallback(async (update: ProductPriceUpdate): Promise<void> => {
    await mockApiDelay();
    setProducts(prev => prev.map(product => {
      if (product.id === update.product_id) {
        return {
          ...product,
          base_price: update.new_price,
          updated_at: new Date().toISOString()
        };
      }
      return product;
    }));
  }, []);

  // Upload image
  const uploadImage = useCallback(async (productId: string, image: ImageUploadRequest): Promise<ImageUploadResponse> => {
    await mockApiDelay();
    
    const uploadResponse: ImageUploadResponse = {
      id: `img-${Date.now()}`,
      url: `/images/products/${productId}/${image.file.name}`,
      thumbnail_url: `/images/products/${productId}/thumb_${image.file.name}`,
      alt_text: image.alt_text,
      is_primary: image.is_primary || false,
      file_size_bytes: image.file.size,
      mime_type: image.file.type,
      uploaded_at: new Date().toISOString()
    };

    // Update product with new image
    setProducts(prev => prev.map(product => {
      if (product.id === productId) {
        return {
          ...product,
          images: [...product.images, {
            id: uploadResponse.id,
            url: uploadResponse.url,
            alt_text: uploadResponse.alt_text,
            is_primary: uploadResponse.is_primary,
            sort_order: product.images.length + 1,
            uploaded_at: uploadResponse.uploaded_at
          }],
          updated_at: new Date().toISOString()
        };
      }
      return product;
    }));

    return uploadResponse;
  }, []);

  // Delete image
  const deleteImage = useCallback(async (productId: string, imageId: string): Promise<void> => {
    await mockApiDelay();
    
    setProducts(prev => prev.map(product => {
      if (product.id === productId) {
        return {
          ...product,
          images: product.images.filter(img => img.id !== imageId),
          updated_at: new Date().toISOString()
        };
      }
      return product;
    }));
  }, []);

  // Update filters
  const updateFilters = useCallback((newFilters: ProductFilters) => {
    // This will trigger useEffect to reload products
    loadProducts();
  }, [loadProducts]);

  // Load data on mount and filter changes
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return {
    products,
    pagination: mockPagination,
    summary: mockSummary,
    loading,
    error,
    refetch: loadProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    bulkOperation,
    updatePrice,
    uploadImage,
    deleteImage,
    updateFilters,
    isCreating,
    isUpdating,
    isBulkOperating
  };
}

// Hook for product statistics
export function useProductStats(organizationId?: string) {
  const [stats, setStats] = useState<ProductStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      if (!organizationId) return;

      setLoading(true);
      try {
        await mockApiDelay();
        
        const mockStats: ProductStatsResponse = {
          total_products: 150,
          active_products: 132,
          discontinued_products: 12,
          categories: [
            { category: 'fresh_produce', product_count: 45, total_revenue: 12400, average_price: 85, total_orders: 234, conversion_rate: 0.78, growth_rate: 0.12 },
            { category: 'meat_seafood', product_count: 32, total_revenue: 18200, average_price: 180, total_orders: 156, conversion_rate: 0.82, growth_rate: 0.08 },
            { category: 'dairy', product_count: 28, total_revenue: 8900, average_price: 65, total_orders: 189, conversion_rate: 0.75, growth_rate: 0.15 }
          ],
          recent_activity: {
            new_products_week: 8,
            updated_products_week: 23
          }
        };

        setStats(mockStats);
      } catch (err) {
        setError('Failed to load product statistics');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [organizationId]);

  return { stats, loading, error };
}