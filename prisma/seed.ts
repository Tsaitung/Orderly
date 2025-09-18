import { PrismaClient, OrganizationType, UserRole, OrderStatus } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 開始初始化數據...')

  // 檢查並創建供應商組織
  let supplier = await prisma.organization.findFirst({
    where: { name: '新鮮食材供應商', type: OrganizationType.supplier }
  })
  
  if (!supplier) {
    supplier = await prisma.organization.create({
      data: {
        name: '新鮮食材供應商',
        type: OrganizationType.supplier,
        settings: {
          deliveryDays: ['monday', 'wednesday', 'friday'],
          minOrderAmount: 1000,
          paymentTerms: 30
        }
      }
    })
  }

  // 檢查並創建餐廳組織
  let restaurant = await prisma.organization.findFirst({
    where: { name: '美味餐廳', type: OrganizationType.restaurant }
  })
  
  if (!restaurant) {
    restaurant = await prisma.organization.create({
      data: {
        name: '美味餐廳',
        type: OrganizationType.restaurant,
        settings: {
          operatingHours: '08:00-22:00',
          deliveryAddress: '台北市信義區信義路五段7號',
          maxCreditAmount: 50000
        }
      }
    })
  }

  // 創建供應商管理員用戶
  const supplierAdmin = await prisma.user.upsert({
    where: { email: 'admin@supplier.com' },
    update: {},
    create: {
      email: 'admin@supplier.com',
      passwordHash: await hash('password123', 12),
      organizationId: supplier.id,
      role: UserRole.supplier_admin,
      metadata: {
        firstName: '張',
        lastName: '供應商',
        phone: '+886-2-2345-6789'
      }
    }
  })

  // 創建餐廳管理員用戶
  const restaurantAdmin = await prisma.user.upsert({
    where: { email: 'admin@restaurant.com' },
    update: {},
    create: {
      email: 'admin@restaurant.com',
      passwordHash: await hash('password123', 12),
      organizationId: restaurant.id,
      role: UserRole.restaurant_admin,
      metadata: {
        firstName: '李',
        lastName: '餐廳主',
        phone: '+886-2-1234-5678'
      }
    }
  })

  // 創建產品 - 使用 upsert 避免重複創建
  const [product1, product2, product3] = await Promise.all([
    prisma.product.upsert({
      where: { 
        supplierId_code_version: { 
          supplierId: supplier.id, 
          code: 'BEEF-001', 
          version: 1 
        } 
      },
      update: {},
      create: {
        supplierId: supplier.id,
        code: 'BEEF-001',
        name: '新鮮牛肉片 500g',
        category: '肉類',
        pricing: {
          basePrice: 180,
          unit: 'pack',
          currency: 'TWD',
          bulkDiscounts: [
            { minQuantity: 10, discount: 0.05 },
            { minQuantity: 20, discount: 0.10 }
          ]
        },
        specifications: {
          weight: '500g',
          origin: '台灣',
          storage: '冷藏',
          shelfLife: '3天'
        }
      }
    }),
    prisma.product.upsert({
      where: { 
        supplierId_code_version: { 
          supplierId: supplier.id, 
          code: 'VEG-001', 
          version: 1 
        } 
      },
      update: {},
      create: {
        supplierId: supplier.id,
        code: 'VEG-001',
        name: '有機蔬菜包',
        category: '蔬菜',
        pricing: {
          basePrice: 120,
          unit: 'pack',
          currency: 'TWD'
        },
        specifications: {
          contents: '青江菜、高麗菜、胡蘿蔔',
          weight: '1kg',
          organic: true
        }
      }
    }),
    prisma.product.upsert({
      where: { 
        supplierId_code_version: { 
          supplierId: supplier.id, 
          code: 'SEA-001', 
          version: 1 
        } 
      },
      update: {},
      create: {
        supplierId: supplier.id,
        code: 'SEA-001',
        name: '海鮮拼盤',
        category: '海鮮',
        pricing: {
          basePrice: 350,
          unit: 'pack',
          currency: 'TWD'
        },
        specifications: {
          contents: '蝦子、花枝、魚片',
          weight: '800g',
          freshness: '當日現撈'
        }
      }
    })
  ])
  
  const products = [product1, product2, product3]

  // 檢查並創建訂單
  let order = await prisma.order.findUnique({
    where: { orderNumber: 'ORD-2025-001' }
  })
  
  if (!order) {
    order = await prisma.order.create({
      data: {
        orderNumber: 'ORD-2025-001',
        restaurantId: restaurant.id,
        supplierId: supplier.id,
        status: OrderStatus.delivered,
        subtotal: 1800,
        taxAmount: 90,
        totalAmount: 1890,
        deliveryDate: new Date('2025-01-15'),
        deliveryAddress: {
          street: '台北市信義區信義路五段7號',
          contactPerson: '李餐廳主',
          phone: '+886-2-1234-5678'
        },
        notes: '請於上午送達',
        createdBy: restaurantAdmin.id
      }
    })
    
    // 創建訂單項目
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: products[0].id,
        productCode: products[0].code,
        productName: products[0].name,
        quantity: 10,
        unitPrice: 180,
        lineTotal: 1800
      }
    })
  }

  // 檢查並創建對帳記錄
  let reconciliation = await prisma.reconciliation.findUnique({
    where: { reconciliationNumber: 'REC-2025-001' }
  })
  
  if (!reconciliation) {
    reconciliation = await prisma.reconciliation.create({
      data: {
        reconciliationNumber: 'REC-2025-001',
        periodStart: new Date('2025-01-01'),
        periodEnd: new Date('2025-01-31'),
        restaurantId: restaurant.id,
        supplierId: supplier.id,
        summary: {
          totalOrders: 1,
          totalAmount: 1890,
          matchedItems: 1,
          disputedItems: 0,
          processingTime: 30
        },
        confidenceScore: 0.98,
        autoApproved: true,
        createdBy: restaurantAdmin.id
      }
    })
    
    // 創建對帳項目
    await prisma.reconciliationItem.create({
      data: {
        reconciliationId: reconciliation.id,
        orderId: order.id,
        productCode: products[0].code,
        orderedQuantity: 10,
        deliveredQuantity: 10,
        acceptedQuantity: 10,
        unitPrice: 180,
        lineTotal: 1800,
        discrepancyType: null,
        resolutionAction: 'auto_approved'
      }
    })
  }

  // 創建系統配置
  await Promise.all([
    prisma.systemConfig.upsert({
      where: { key: 'reconciliation.auto_approval_threshold' },
      update: {},
      create: {
        key: 'reconciliation.auto_approval_threshold',
        value: 0.95,
        category: 'reconciliation',
        updatedBy: supplierAdmin.id
      }
    }),
    prisma.systemConfig.upsert({
      where: { key: 'reconciliation.confidence_calculation' },
      update: {},
      create: {
        key: 'reconciliation.confidence_calculation',
        value: {
          factors: ['quantity_match', 'price_match', 'delivery_date', 'product_code'],
          weights: [0.4, 0.3, 0.2, 0.1]
        },
        category: 'reconciliation'
      }
    }),
    prisma.systemConfig.upsert({
      where: { key: 'notification.channels' },
      update: {},
      create: {
        key: 'notification.channels',
        value: ['email', 'sms', 'push'],
        category: 'notification'
      }
    })
  ])

  console.log('✅ 初始化數據完成!')
  console.log(`📊 創建了:`)
  console.log(`   - 2 個組織 (1 供應商, 1 餐廳)`)
  console.log(`   - 2 個用戶 (管理員)`)
  console.log(`   - ${products.length} 個產品`)
  console.log(`   - 1 個訂單`)
  console.log(`   - 1 個對帳記錄`)
  console.log(`   - 3 個系統配置`)
}

main()
  .catch((e) => {
    console.error('❌ 初始化失敗:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })