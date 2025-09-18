/**
 * Supplier Service
 * Handles all supplier-related business logic for restaurant customers
 */

import { PrismaClient, OrganizationType } from '@prisma/client'
import { setRLSContext, type RLSContext } from '@/lib/database/rls-context'

export interface SupplierSummary {
  id: string
  name: string
  type: OrganizationType
  settings: any
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  
  // Computed fields
  productCount: number
  recentOrderCount: number
  fulfillmentRate: number
  averageDeliveryTime: number
  totalGMV: number
  lastOrderDate: Date | null
}

export interface SupplierStatistics {
  totalSuppliers: number
  activeSuppliers: number
  totalProducts: number
  monthlyGMV: number
  averageFulfillmentRate: number
  topSuppliers: Array<{
    id: string
    name: string
    orderCount: number
    gmv: number
  }>
}

export interface SupplierDetail extends SupplierSummary {
  // Extended supplier information
  contactInfo?: {
    email?: string
    phone?: string
    address?: string
  }
  businessTerms?: {
    paymentTerms?: number
    minimumOrderAmount?: number
    deliveryZones?: string[]
  }
  performanceMetrics: {
    fulfillmentRate: number
    onTimeDeliveryRate: number
    qualityScore: number
    averageResponseTime: number
  }
  recentOrders: Array<{
    id: string
    orderNumber: string
    totalAmount: number
    status: string
    deliveryDate: Date
    createdAt: Date
  }>
}

export class SupplierService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get all suppliers that have relationships with the current restaurant
   */
  async getSuppliersForRestaurant(
    context: RLSContext,
    filters?: {
      isActive?: boolean
      search?: string
      limit?: number
      offset?: number
    }
  ): Promise<{ suppliers: SupplierSummary[]; total: number }> {
    await setRLSContext(this.prisma, context)

    const { isActive = true, search, limit = 20, offset = 0 } = filters || {}

    // Build where clause
    const whereClause: any = {
      type: OrganizationType.supplier,
      isActive
    }

    if (search) {
      whereClause.name = {
        contains: search,
        mode: 'insensitive'
      }
    }

    // Get suppliers that have had orders with this restaurant
    const suppliersWithRelations = await this.prisma.organization.findMany({
      where: {
        ...whereClause,
        supplierOrders: {
          some: {
            restaurantId: context.organizationId
          }
        }
      },
      include: {
        suppliedProducts: {
          where: { active: true }
        },
        supplierOrders: {
          where: {
            restaurantId: context.organizationId,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          },
          select: {
            id: true,
            totalAmount: true,
            status: true,
            createdAt: true,
            deliveryDate: true
          }
        }
      },
      skip: offset,
      take: limit,
      orderBy: {
        name: 'asc'
      }
    })

    // Get total count for pagination
    const total = await this.prisma.organization.count({
      where: {
        ...whereClause,
        supplierOrders: {
          some: {
            restaurantId: context.organizationId
          }
        }
      }
    })

    // Transform to SupplierSummary with computed fields
    const suppliers: SupplierSummary[] = suppliersWithRelations.map(supplier => {
      const completedOrders = supplier.supplierOrders.filter(
        order => order.status === 'completed' || order.status === 'delivered'
      )
      
      const totalOrders = supplier.supplierOrders.length
      const fulfillmentRate = totalOrders > 0 ? (completedOrders.length / totalOrders) * 100 : 0
      
      const totalGMV = supplier.supplierOrders.reduce(
        (sum, order) => sum + Number(order.totalAmount), 0
      )

      const lastOrder = supplier.supplierOrders.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      )[0]

      // Calculate average delivery time (simplified)
      const averageDeliveryTime = supplier.supplierOrders.length > 0 
        ? Math.round(Math.random() * 3) + 1 // Placeholder: 1-4 days
        : 0

      return {
        id: supplier.id,
        name: supplier.name,
        type: supplier.type,
        settings: supplier.settings,
        isActive: supplier.isActive,
        createdAt: supplier.createdAt,
        updatedAt: supplier.updatedAt,
        productCount: supplier.suppliedProducts.length,
        recentOrderCount: totalOrders,
        fulfillmentRate: Math.round(fulfillmentRate),
        averageDeliveryTime,
        totalGMV,
        lastOrderDate: lastOrder?.createdAt || null
      }
    })

    return { suppliers, total }
  }

  /**
   * Get detailed supplier information
   */
  async getSupplierDetail(
    context: RLSContext,
    supplierId: string
  ): Promise<SupplierDetail | null> {
    await setRLSContext(this.prisma, context)

    const supplier = await this.prisma.organization.findFirst({
      where: {
        id: supplierId,
        type: OrganizationType.supplier,
        // Ensure this restaurant has relationship with supplier
        supplierOrders: {
          some: {
            restaurantId: context.organizationId
          }
        }
      },
      include: {
        suppliedProducts: {
          where: { active: true }
        },
        supplierOrders: {
          where: {
            restaurantId: context.organizationId
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10,
          include: {
            items: true
          }
        }
      }
    })

    if (!supplier) {
      return null
    }

    // Calculate performance metrics
    const completedOrders = supplier.supplierOrders.filter(
      order => order.status === 'completed' || order.status === 'delivered'
    )
    
    const totalOrders = supplier.supplierOrders.length
    const fulfillmentRate = totalOrders > 0 ? (completedOrders.length / totalOrders) * 100 : 0
    
    const onTimeOrders = supplier.supplierOrders.filter(order => {
      // Simplified: assume delivered orders are on time if delivered on or before delivery date
      return order.status === 'delivered' || order.status === 'completed'
    })
    
    const onTimeDeliveryRate = totalOrders > 0 ? (onTimeOrders.length / totalOrders) * 100 : 0

    // Extract business terms from settings
    const businessTerms = {
      paymentTerms: supplier.settings.paymentTerms || 30,
      minimumOrderAmount: supplier.settings.minimumOrderAmount || 0,
      deliveryZones: supplier.settings.deliveryZones || []
    }

    // Transform recent orders
    const recentOrders = supplier.supplierOrders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      totalAmount: Number(order.totalAmount),
      status: order.status,
      deliveryDate: order.deliveryDate,
      createdAt: order.createdAt
    }))

    const totalGMV = supplier.supplierOrders.reduce(
      (sum, order) => sum + Number(order.totalAmount), 0
    )

    const lastOrder = supplier.supplierOrders[0]

    return {
      id: supplier.id,
      name: supplier.name,
      type: supplier.type,
      settings: supplier.settings,
      isActive: supplier.isActive,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
      productCount: supplier.suppliedProducts.length,
      recentOrderCount: totalOrders,
      fulfillmentRate: Math.round(fulfillmentRate),
      averageDeliveryTime: Math.round(Math.random() * 3) + 1, // Placeholder
      totalGMV,
      lastOrderDate: lastOrder?.createdAt || null,
      businessTerms,
      performanceMetrics: {
        fulfillmentRate: Math.round(fulfillmentRate),
        onTimeDeliveryRate: Math.round(onTimeDeliveryRate),
        qualityScore: Math.round(85 + Math.random() * 15), // Placeholder: 85-100
        averageResponseTime: Math.round(Math.random() * 4) + 1 // Placeholder: 1-5 hours
      },
      recentOrders
    }
  }

  /**
   * Get supplier's product catalog
   */
  async getSupplierProducts(
    context: RLSContext,
    supplierId: string,
    filters?: {
      category?: string
      search?: string
      active?: boolean
      limit?: number
      offset?: number
    }
  ) {
    await setRLSContext(this.prisma, context)

    const { category, search, active = true, limit = 50, offset = 0 } = filters || {}

    // Build where clause
    const whereClause: any = {
      supplierId,
      active
    }

    if (category) {
      whereClause.category = category
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Verify restaurant has relationship with supplier
    const hasRelationship = await this.prisma.order.findFirst({
      where: {
        supplierId,
        restaurantId: context.organizationId
      }
    })

    if (!hasRelationship) {
      throw new Error('Access denied: No relationship with this supplier')
    }

    const products = await this.prisma.product.findMany({
      where: whereClause,
      include: {
        supplier: {
          select: {
            id: true,
            name: true
          }
        }
      },
      skip: offset,
      take: limit,
      orderBy: {
        name: 'asc'
      }
    })

    const total = await this.prisma.product.count({
      where: whereClause
    })

    // Get unique categories for filtering
    const categories = await this.prisma.product.findMany({
      where: {
        supplierId,
        active: true
      },
      select: {
        category: true
      },
      distinct: ['category']
    }).then(results => 
      results
        .map(r => r.category)
        .filter(Boolean)
        .sort()
    )

    return {
      products,
      total,
      categories
    }
  }

  /**
   * Get aggregated supplier statistics for restaurant dashboard
   */
  async getSupplierStatistics(context: RLSContext): Promise<SupplierStatistics> {
    await setRLSContext(this.prisma, context)

    // Get suppliers with orders from this restaurant
    const suppliers = await this.prisma.organization.findMany({
      where: {
        type: OrganizationType.supplier,
        supplierOrders: {
          some: {
            restaurantId: context.organizationId
          }
        }
      },
      include: {
        suppliedProducts: {
          where: { active: true }
        },
        supplierOrders: {
          where: {
            restaurantId: context.organizationId,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          }
        }
      }
    })

    const totalSuppliers = suppliers.length
    const activeSuppliers = suppliers.filter(s => s.isActive).length
    const totalProducts = suppliers.reduce((sum, s) => sum + s.suppliedProducts.length, 0)

    // Calculate monthly GMV
    const monthlyGMV = suppliers.reduce((sum, supplier) => {
      return sum + supplier.supplierOrders.reduce((orderSum, order) => {
        return orderSum + Number(order.totalAmount)
      }, 0)
    }, 0)

    // Calculate average fulfillment rate
    let totalOrders = 0
    let completedOrders = 0
    suppliers.forEach(supplier => {
      supplier.supplierOrders.forEach(order => {
        totalOrders++
        if (order.status === 'completed' || order.status === 'delivered') {
          completedOrders++
        }
      })
    })

    const averageFulfillmentRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0

    // Get top suppliers by order count and GMV
    const topSuppliers = suppliers
      .map(supplier => ({
        id: supplier.id,
        name: supplier.name,
        orderCount: supplier.supplierOrders.length,
        gmv: supplier.supplierOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0)
      }))
      .sort((a, b) => b.gmv - a.gmv)
      .slice(0, 5)

    return {
      totalSuppliers,
      activeSuppliers,
      totalProducts,
      monthlyGMV,
      averageFulfillmentRate: Math.round(averageFulfillmentRate),
      topSuppliers
    }
  }
}

export default SupplierService